const Booking = require('../models/Booking');
const Slot = require('../models/Slot');
const Offering = require('../models/Offering');
const Service = require('../models/Service');
const Payment = require('../models/Payment');
const VendorProfile = require('../models/VendorProfile');

async function createBooking(req, res) {
  try {
    const { slotId, offeringId, paymentMode, paymentToken } = req.body;

    if (!slotId || !offeringId || (paymentMode !== 'PAY_NOW' && paymentMode !== 'PAY_AFTER')) {
      return res.status(400).json({ message: 'slotId, offeringId and a valid paymentMode are required' });
    }

    const slotBefore = await Slot.findById(slotId);
    if (!slotBefore) {
      return res.status(404).json({ message: 'Slot not found' });
    }
    if (slotBefore.startTime.getTime() <= Date.now()) {
      return res.status(422).json({ message: 'Cannot book a slot in the past' });
    }

    const offering = await Offering.findById(offeringId);
    if (!offering || String(offering.service) !== String(slotBefore.service)) {
      return res.status(422).json({ message: 'Offering does not match slot' });
    }

    const service = await Service.findById(slotBefore.service);
    if (!service || service.status !== 'PUBLISHED') {
      return res.status(422).json({ message: 'Service is not currently bookable' });
    }

    const reservedSlot = await Slot.findOneAndUpdate(
      { _id: slotId, $expr: { $lt: ['$bookedCount', '$capacity'] } },
      { $inc: { bookedCount: 1 } },
      { new: true }
    );
    if (!reservedSlot) {
      return res.status(409).json({ message: 'Slot is fully booked' });
    }

    let booking;
    try {
      booking = await Booking.create({
        customer: req.user.id,
        vendor: service.vendor,
        service: service._id,
        offering: offering._id,
        slot: slotBefore._id,
        priceMinorUnits: offering.priceMinorUnits,
        currency: offering.currency,
        paymentMode,
        status: 'PENDING',
        history: [
          { from: null, to: 'PENDING', actor: req.user.id, actorRole: req.user.baseRole, at: new Date() },
        ],
      });
    } catch (err) {
      await Slot.findOneAndUpdate({ _id: slotId, bookedCount: { $gt: 0 } }, { $inc: { bookedCount: -1 } });
      throw err;
    }

    let payment = null;
    if (paymentMode === 'PAY_NOW') {
      payment = await Payment.create({
        booking: booking._id,
        amountMinorUnits: booking.priceMinorUnits,
        currency: booking.currency,
        providerRef: `mock_${booking._id}`,
        status: 'INITIATED',
      });

      if (paymentToken === 'tok_fail') {
        payment.status = 'FAILED';
        await payment.save();

        booking.status = 'CANCELLED';
        booking.history.push({
          from: 'PENDING',
          to: 'CANCELLED',
          actor: req.user.id,
          actorRole: req.user.baseRole,
          reason: 'Payment failed',
          at: new Date(),
        });
        await booking.save();

        await Slot.findOneAndUpdate({ _id: slotId, bookedCount: { $gt: 0 } }, { $inc: { bookedCount: -1 } });
      } else if (paymentToken === 'tok_delay') {
        payment.status = 'INITIATED';
        await payment.save();
      } else {
        payment.status = 'SUCCESS';
        await payment.save();
      }
    }

    res.status(201).json({ booking, payment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function getBooking(req, res) {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (!req.user.isSuperAdmin) {
      if (req.user.baseRole === 'CUSTOMER' && String(booking.customer) !== String(req.user.id)) {
        return res.status(403).json({ message: 'Not your booking' });
      }
      if (req.user.baseRole === 'VENDOR' && String(booking.vendor) !== String(req.user.id)) {
        return res.status(403).json({ message: 'Not your booking' });
      }
    }

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function listMyBookings(req, res) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (req.user.baseRole === 'CUSTOMER') filter.customer = req.user.id;
    else if (req.user.baseRole === 'VENDOR') filter.vendor = req.user.id;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const items = await Booking.find(filter).skip(skip).limit(Number(limit)).sort('-createdAt');
    const total = await Booking.countDocuments(filter);

    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function confirmBooking(req, res) {
  try {

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (!req.user.isSuperAdmin && String(booking.vendor) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not your booking' });
    }
    if (booking.status !== 'PENDING') {
      return res.status(422).json({ message: `Cannot move booking from ${booking.status} to CONFIRMED` });
    }
    if (!req.user.isSuperAdmin && req.user.baseRole !== 'VENDOR') {
      return res.status(403).json({ message: 'Only the vendor may confirm a booking' });
    }

    booking.status = 'CONFIRMED';
    booking.history.push({
      from: 'PENDING',
      to: 'CONFIRMED',
      actor: req.user.id,
      actorRole: req.user.baseRole,
      reason: req.body.reason || null,
      at: new Date(),
    });
    await booking.save();

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function rejectBooking(req, res) {
  try {

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (!req.user.isSuperAdmin && String(booking.vendor) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not your booking' });
    }
    if (booking.status !== 'PENDING') {
      return res.status(422).json({ message: `Cannot move booking from ${booking.status} to REJECTED` });
    }
    if (!req.user.isSuperAdmin && req.user.baseRole !== 'VENDOR') {
      return res.status(403).json({ message: 'Only the vendor may reject a booking' });
    }

    booking.status = 'REJECTED';
    booking.history.push({
      from: 'PENDING',
      to: 'REJECTED',
      actor: req.user.id,
      actorRole: req.user.baseRole,
      reason: req.body.reason || null,
      at: new Date(),
    });
    await booking.save();

    await Slot.findOneAndUpdate({ _id: booking.slot, bookedCount: { $gt: 0 } }, { $inc: { bookedCount: -1 } });

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function completeBooking(req, res) {
  try {

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (!req.user.isSuperAdmin && String(booking.vendor) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not your booking' });
    }
    if (booking.status !== 'CONFIRMED') {
      return res.status(422).json({ message: `Cannot move booking from ${booking.status} to COMPLETED` });
    }
    if (!req.user.isSuperAdmin && req.user.baseRole !== 'VENDOR') {
      return res.status(403).json({ message: 'Only the vendor may complete a booking' });
    }

    booking.status = 'COMPLETED';
    booking.history.push({
      from: 'CONFIRMED',
      to: 'COMPLETED',
      actor: req.user.id,
      actorRole: req.user.baseRole,
      reason: req.body.reason || null,
      at: new Date(),
    });
    await booking.save();

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function noShowBooking(req, res) {
  try {

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (!req.user.isSuperAdmin && String(booking.vendor) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not your booking' });
    }
    if (booking.status !== 'CONFIRMED') {
      return res.status(422).json({ message: `Cannot move booking from ${booking.status} to NO_SHOW` });
    }
    if (!req.user.isSuperAdmin && req.user.baseRole !== 'VENDOR') {
      return res.status(403).json({ message: 'Only the vendor may mark a no-show' });
    }

    booking.status = 'NO_SHOW';
    booking.history.push({
      from: 'CONFIRMED',
      to: 'NO_SHOW',
      actor: req.user.id,
      actorRole: req.user.baseRole,
      reason: req.body.reason || null,
      at: new Date(),
    });
    await booking.save();

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function cancelBooking(req, res) {
  try {

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (!req.user.isSuperAdmin) {
      if (req.user.baseRole === 'CUSTOMER' && String(booking.customer) !== String(req.user.id)) {
        return res.status(403).json({ message: 'Not your booking' });
      }
      if (req.user.baseRole === 'VENDOR' && String(booking.vendor) !== String(req.user.id)) {
        return res.status(403).json({ message: 'Not your booking' });
      }
    }

    if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
      return res.status(422).json({ message: `Cannot move booking from ${booking.status} to CANCELLED` });
    }

    const isPrivileged = req.user.baseRole === 'VENDOR' || req.user.baseRole === 'ADMIN' || req.user.isSuperAdmin;
    if (!isPrivileged) {
      const slot = await Slot.findById(booking.slot);
      const service = await Service.findById(booking.service);
      const vendorProfile = await VendorProfile.findOne({ user: service.vendor });
      const windowHours = vendorProfile ? vendorProfile.cancellationWindowHours : 24;
      const hoursUntilStart = (slot.startTime.getTime() - Date.now()) / 3600000;

      if (hoursUntilStart < windowHours) {
        return res.status(422).json({ message: `Cancellations require at least ${windowHours}h notice` });
      }
    }

    const fromStatus = booking.status;
    booking.status = 'CANCELLED';
    booking.history.push({
      from: fromStatus,
      to: 'CANCELLED',
      actor: req.user.id,
      actorRole: req.user.baseRole,
      reason: req.body.reason || null,
      at: new Date(),
    });
    await booking.save();

    await Slot.findOneAndUpdate({ _id: booking.slot, bookedCount: { $gt: 0 } }, { $inc: { bookedCount: -1 } });

    const payment = await Payment.findOne({ booking: booking._id, status: 'SUCCESS' });
    if (payment) {
      payment.status = 'REFUNDED';
      await payment.save();
    }

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function rescheduleBooking(req, res) {
  try {
    const { newSlotId } = req.body;
    if (!newSlotId) {
      return res.status(400).json({ message: 'newSlotId is required' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (!req.user.isSuperAdmin && String(booking.customer) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not your booking' });
    }
    if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
      return res.status(422).json({ message: 'Only pending or confirmed bookings can be rescheduled' });
    }
    if (!req.user.isSuperAdmin && req.user.baseRole !== 'CUSTOMER') {
      return res.status(403).json({ message: 'Only the customer may reschedule' });
    }

    const newSlot = await Slot.findById(newSlotId);
    if (!newSlot) {
      return res.status(404).json({ message: 'New slot not found' });
    }
    if (String(newSlot.service) !== String(booking.service)) {
      return res.status(422).json({ message: 'New slot must belong to the same service' });
    }
    if (newSlot.startTime.getTime() <= Date.now()) {
      return res.status(422).json({ message: 'Cannot reschedule to a slot in the past' });
    }

    const reserved = await Slot.findOneAndUpdate(
      { _id: newSlotId, $expr: { $lt: ['$bookedCount', '$capacity'] } },
      { $inc: { bookedCount: 1 } },
      { new: true }
    );
    if (!reserved) {
      return res.status(409).json({ message: 'New slot is fully booked' });
    }

    const oldSlotId = booking.slot;
    booking.slot = newSlot._id;
    booking.history.push({
      from: booking.status,
      to: booking.status,
      actor: req.user.id,
      actorRole: req.user.baseRole,
      reason: 'Rescheduled',
      at: new Date(),
    });

    try {
      await booking.save();
    } catch (err) {
      await Slot.findOneAndUpdate({ _id: newSlotId, bookedCount: { $gt: 0 } }, { $inc: { bookedCount: -1 } });
      throw err;
    }

    await Slot.findOneAndUpdate({ _id: oldSlotId, bookedCount: { $gt: 0 } }, { $inc: { bookedCount: -1 } });

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function markPaymentCollected(req, res) {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (!req.user.isSuperAdmin && String(booking.vendor) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not your booking' });
    }
    if (booking.paymentMode !== 'PAY_AFTER') {
      return res.status(422).json({ message: 'Only PAY_AFTER bookings can be marked collected' });
    }

    booking.paymentCollected = true;
    await booking.save();

    await Payment.create({
      booking: booking._id,
      amountMinorUnits: booking.priceMinorUnits,
      currency: booking.currency,
      providerRef: `cash_${booking._id}`,
      status: 'SUCCESS',
    });

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

module.exports = {
  createBooking,
  getBooking,
  listMyBookings,
  confirmBooking,
  rejectBooking,
  completeBooking,
  noShowBooking,
  cancelBooking,
  rescheduleBooking,
  markPaymentCollected,
};
