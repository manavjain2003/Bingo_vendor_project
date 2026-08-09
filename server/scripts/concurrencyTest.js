const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const CUSTOMER_EMAIL = process.env.TEST_CUSTOMER_EMAIL || 'customer1@marketplace.test';
const CUSTOMER_PASSWORD = process.env.TEST_CUSTOMER_PASSWORD || 'Password123!';
const CONCURRENT_REQUESTS = 20;

async function login(email, password) {
  const res = await axios.post(`${BASE_URL}/auth/login`, { email, password });
  return res.data.accessToken;
}

async function findSlotWithFullCapacity(token) {
  const servicesRes = await axios.get(`${BASE_URL}/services`, { params: { limit: 50 } });
  const services = servicesRes.data.items;

  for (const service of services) {
    const detailRes = await axios.get(`${BASE_URL}/services/${service._id}`);
    const offerings = detailRes.data.offerings;
    if (!offerings || offerings.length === 0) continue;

    const offering = offerings[0];
    const from = new Date().toISOString().slice(0, 10);
    const to = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

    const slotsRes = await axios.get(`${BASE_URL}/services/${service._id}/slots`, {
      params: { offeringId: offering._id, from, to },
      headers: { Authorization: `Bearer ${token}` },
    });

    const fullCapacitySlot = slotsRes.data.items.find((s) => s.remaining === s.capacity && s.capacity >= 2);
    if (fullCapacitySlot) {
      return { slot: fullCapacitySlot, offeringId: offering._id, serviceTitle: service.title };
    }
  }

  return null;
}

async function fireConcurrentBookings(token, slotId, offeringId) {
  const requests = Array.from({ length: CONCURRENT_REQUESTS }, () =>
    axios
      .post(
        `${BASE_URL}/bookings`,
        { slotId, offeringId, paymentMode: 'PAY_AFTER' },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(() => ({ status: 'fulfilled' }))
      .catch((err) => ({ status: 'rejected', code: err.response?.status, message: err.response?.data?.message }))
  );

  return Promise.all(requests);
}

async function run() {
  console.log(`Base URL: ${BASE_URL}`);
  console.log('Logging in as test customer...');
  const token = await login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);

  console.log('Looking for a slot with open capacity...');
  const found = await findSlotWithFullCapacity(token);

  if (!found) {
    console.error('Could not find a slot with available capacity. Run the seed script first, or generate slots via GET /services/:id/slots.');
    process.exit(1);
  }

  const { slot, offeringId, serviceTitle } = found;
  console.log(`Using slot ${slot.id} on service "${serviceTitle}", capacity ${slot.capacity}`);
  console.log(`Firing ${CONCURRENT_REQUESTS} concurrent booking requests...`);

  const results = await fireConcurrentBookings(token, slot.id, offeringId);

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected');
  const conflictCount = failed.filter((r) => r.code === 409).length;

  console.log('');
  console.log('--- Results ---');
  console.log(`Requests fired:       ${CONCURRENT_REQUESTS}`);
  console.log(`Slot capacity:        ${slot.capacity}`);
  console.log(`Bookings created:     ${succeeded}`);
  console.log(`Rejected (409):       ${conflictCount}`);
  console.log(`Rejected (other):     ${failed.length - conflictCount}`);
  console.log('');

  if (succeeded === slot.capacity) {
    console.log(`PASS: exactly ${slot.capacity} bookings were created, matching slot capacity.`);
  } else {
    console.log(`FAIL: expected ${slot.capacity} bookings, got ${succeeded}.`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Concurrency test errored:', err.response?.data || err.message);
  process.exit(1);
});