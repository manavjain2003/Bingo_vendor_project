# Services Marketplace

A three-sided services marketplace: customers book services, vendors sell and fulfil them, admins govern the whole thing. Built with Node/Express/MongoDB on the backend and React/Vite on the frontend.

This submission covers all **MUST**-tagged modules only: accounts & auth, roles & permissions, service catalogue, availability & slots, the booking lifecycle, and mocked payments. SHOULD and STRETCH items (vendor onboarding UI polish, full admin dashboard, forgot-password, staff capacity, audit log, suspend-with-survivor-bookings) were intentionally left out to focus on getting the MUST modules fully correct and due to lack of time. See DECISIONS.md for the complete list of what was cut.

## Live URLs

Frontend: https://bingo-vendor-project.vercel.app/
API: https://bingo-vendor-project.onrender.com/

## Seeded accounts

All passwords: `Password123!`

| Role | Email | Notes |
|---|---|---|
| Super admin | admin@marketplace.test | bypasses every permission check |
| Sub-admin | subadmin@marketplace.test | holds a "Catalogue Moderator" role (category.*, service.suspend, vendor.view only) |
| Approved vendor | vendor.approved@marketplace.test | has a published service with offerings and availability |
| Pending vendor | vendor.pending@marketplace.test | cannot publish anything yet |
| Customer 1 | customer1@marketplace.test | has a pending and a completed booking |
| Customer 2 | customer2@marketplace.test | has a confirmed, paid booking |

## Running locally from a cold clone

### Prerequisites

- Node.js 18+
- A MongoDB instance (local `mongod`, or a free-tier Atlas cluster)

### Backend

```
cd backend
cp .env.example .env
```

Edit `.env` and set `MONGO_URI` to your MongoDB connection string, and pick real values for `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`.

```
npm install
npm run seed
npm run dev
```

The API starts on `http://localhost:5000` by default. `npm run seed` clears and repopulates the database — run it any time you want a clean slate.

### Frontend

```
cd frontend
cp .env.example .env
```

Set `VITE_API_URL` in `.env` to point at your running backend.

```
npm install
npm run dev
```

The frontend starts on `http://localhost:5173`.


Covers the booking state machine, the permission guard, and the slot-capacity race condition (the last one uses `mongodb-memory-server`, which downloads a MongoDB binary the first time it runs — it needs outbound internet access once).

### Concurrency test

With the backend running and seeded:

```
cd backend
npm run seed
npm run concurrencyTest
```

This fires 20 simultaneous booking requests at a freshly-generated slot and prints how many succeeded vs. got a clean `409`. Sample output is in `backend/scripts/concurrency-test-output.txt`.

## Project structure

```
backend/
    models/        mongoose schemas
    controllers/    route handlers, plain async/await + try/catch
    routes/         express routers
    middleware/     auth, permission guard, validation, error handling
    utils/          jwt, permissions catalogue, slot generator, state machine
    seed.js
    app.js
    server.js
  scripts/
    concurrencyTest.js
  tests/

frontend/
    api/            axios client with refresh-token handling
    context/         auth context
    components/     navbar, booking card, protected route
    pages/          one file per screen
```

## API reference

See `api/marketplace.postman_collection.json` for a Postman collection covering every endpoint, or `api/openapi.yaml` for the equivalent OpenAPI spec. Update the `baseUrl` variable to your deployed API before running it.
