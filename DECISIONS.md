# Decisions

## Data model

Collections and relationships (MongoDB, referenced by ObjectId):

- **User** — email, passwordHash, baseRole (CUSTOMER/VENDOR/ADMIN), role (ref Role), isSuperAdmin
- **Role** — name, permissions (array of `resource.action` strings), isSystem
- **RefreshToken** — user (ref User), tokenId, revoked, expiresAt
- **VendorProfile** — user (ref User, 1:1), businessName, contact, address, documents, status (PENDING/APPROVED/REJECTED), timezoneOffsetMinutes, cancellationWindowHours
- **Category** — name, parent (ref Category, nullable, max one level of nesting)
- **Service** — vendor (ref User), title, description, category (ref Category), images, status (DRAFT/PUBLISHED/SUSPENDED)
- **Offering** — service (ref Service), name, durationMinutes, priceMinorUnits, currency, active
- **AvailabilityRule** — service (ref Service), weekday (0-6), startTime, endTime ("HH:mm" strings), capacity
- **DateException** — service (ref Service), date ("YYYY-MM-DD"), closed, windows (override list for that date)
- **Slot** — service, offering, startTime, endTime (both UTC Date), capacity, bookedCount. Generated on demand from rules + exceptions, not hand-entered. Unique on (service, offering, startTime).
- **Booking** — customer, vendor, service, offering, slot (all refs), priceMinorUnits + currency (snapshotted at booking time, never re-read from Offering), paymentMode, paymentCollected, status, history (embedded array of {from, to, actor, actorRole, reason, at})
- **Payment** — booking (ref Booking), amountMinorUnits, currency, providerRef, status (INITIATED/SUCCESS/FAILED/REFUNDED), idempotencyKey

Relations are all one-directional references rather than embedding, except Booking's `history`, which is embedded because it's always read and written together with the booking and never queried independently.

## How the capacity race was solved

Booking creation and rescheduling both call a single MongoDB operation:

```js
Slot.findOneAndUpdate(
  { _id: slotId, $expr: { $lt: ['$bookedCount', '$capacity'] } },
  { $inc: { bookedCount: 1 } },
  { new: true }
)
```

The filter and the increment happen as one atomic document operation on MongoDB's side. If 20 requests hit the same slot at once, MongoDB serializes them internally — each one either matches (bookedCount was still below capacity, so it increments and returns the updated slot) or doesn't match (bookedCount had already reached capacity, so it returns `null`). There's no "read the count, then decide, then write" gap in application code, so no window for two requests to both think they got the last seat. A booking is only created after this call succeeds; if it returns `null`, we respond with a clean `409` and never touch the Booking collection. Cancelling, rejecting, or moving a booking off a slot uses the mirror operation (`$inc: -1`, guarded by `bookedCount > 0`) so the seat count can never go negative either.

## What was deliberately left out

Only MUST-tagged requirements were built. Everything tagged SHOULD or STRETCH in the brief was cut due to lack of time:

- Forgot-password flow (M1, STRETCH)
- Full vendor onboarding polish beyond the PENDING/APPROVED/REJECTED gate itself (M3 is SHOULD overall, though the underlying approve/reject endpoints exist because M2's permission tests need something to approve/reject against)
- "Next available slot" endpoint (M5, SHOULD)
- Admin suspending a live service while preserving existing confirmed bookings (M4, STRETCH) — the suspend endpoint exists and stops new bookings, but no special-casing was added to protect already-confirmed bookings from a suspend
- Staff assignment and staff-capacity constraints on bookings (M6, STRETCH)
- Full admin console — dashboard with counts, cross-vendor filtered booking list, dedicated force-cancel UI, audit log (M8, SHOULD/STRETCH). A bare-bones vendor-approval screen and role-management screen were built because M2's permission model needs somewhere to actually create/assign roles, but the richer M8 dashboard was not.

Within the MUST modules themselves, nothing was cut — every "Done when" bullet under M1, M2, M4, M5, M6, and M7 was targeted directly.

## What can be built next if given another week

1. The M8 admin console properly: dashboard counts, cross-vendor booking filters, a dedicated force-cancel action with a required reason, and an audit log of admin actions.
2. Vendor onboarding polish: a cleaner application form, document upload rather than filename strings, and an admin queue view with more context per applicant.
3. The "next available slot" endpoint, and a proper suspend-a-live-service flow that explicitly leaves already-confirmed bookings untouched while blocking new ones.
4. Staff members as a resource under a vendor, with staff assigned to confirmed bookings and staff-level capacity feeding into slot generation.
5. Idempotency-Key support on the booking-confirm path itself (currently the atomic slot update makes double-booking impossible, but a replayed request would still be handled as a fresh request rather than returning the cached original response).
6. Swap the mock payment provider behind its current interface for a real one (Razorpay/Stripe) — the state transitions, idempotency shape, and webhook handler are designed so this should only touch the provider adapter, not the booking or payment state machine.
