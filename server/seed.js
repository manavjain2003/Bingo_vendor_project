require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB  = require('./config/db');
const { PERMISSIONS } = require('./utils/permissions');

const User = require('./models/User');
const Role = require('./models/Role');
const VendorProfile = require('./models/VendorProfile');
const Category = require('./models/Category');
const Service = require('./models/Service');
const Offering = require('./models/Offering');
const AvailabilityRule = require('./models/AvailabilityRule');
const Slot = require('./models/Slot');
const Booking = require('./models/Booking');
const Payment = require('./models/Payment');

async function clearDatabase() {
  await Promise.all([
    User.deleteMany({}),
    Role.deleteMany({}),
    VendorProfile.deleteMany({}),
    Category.deleteMany({}),
    Service.deleteMany({}),
    Offering.deleteMany({}),
    AvailabilityRule.deleteMany({}),
    Slot.deleteMany({}),
    Booking.deleteMany({}),
    Payment.deleteMany({}),
  ]);
}

async function createRoles() {
  const vendorPermissions = [
    'service.create',
    'service.update',
    'service.delete',
    'service.publish',
    'offering.create',
    'offering.update',
    'offering.delete',
    'availability.update',
    'booking.confirm',
    'booking.reject',
    'booking.complete',
    'booking.cancel',
    'booking.noshow',
    'booking.view.own',
    'payment.markCollected',
  ];

  const customerPermissions = ['booking.create', 'booking.cancel', 'booking.reschedule', 'booking.view.own'];

  const catalogueModeratorPermissions = ['category.*', 'service.suspend', 'vendor.view'];

  const vendorRole = await Role.create({ name: 'VENDOR', permissions: vendorPermissions, isSystem: true });
  const customerRole = await Role.create({ name: 'CUSTOMER', permissions: customerPermissions, isSystem: true });
  const catalogueModeratorRole = await Role.create({
    name: 'Catalogue Moderator',
    permissions: catalogueModeratorPermissions,
  });

  return { vendorRole, customerRole, catalogueModeratorRole };
}

async function hash(password) {
  return bcrypt.hash(password, 10);
}

async function run() {
  await connectDB(process.env.MONGO_URI);
  console.log('Connected, clearing existing data...');
  await clearDatabase();

  const { vendorRole, customerRole, catalogueModeratorRole } = await createRoles();

  const superAdmin = await User.create({
    name: 'Super Admin',
    email: 'admin@marketplace.test',
    passwordHash: await hash('Password123!'),
    baseRole: 'ADMIN',
    role: catalogueModeratorRole._id,
    isSuperAdmin: true,
  });

  const subAdmin = await User.create({
    name: 'Catalogue Sub Admin',
    email: 'subadmin@marketplace.test',
    passwordHash: await hash('Password123!'),
    baseRole: 'ADMIN',
    role: catalogueModeratorRole._id,
    isSuperAdmin: false,
  });

  const approvedVendorUser = await User.create({
    name: 'Priya Sharma',
    email: 'vendor.approved@marketplace.test',
    passwordHash: await hash('Password123!'),
    baseRole: 'VENDOR',
    role: vendorRole._id,
  });

  const approvedVendorProfile = await VendorProfile.create({
    user: approvedVendorUser._id,
    businessName: 'Priya Salon & Spa',
    contact: '+91-9876543210',
    address: 'MG Road, Bengaluru',
    documents: ['gst_certificate.pdf'],
    status: 'APPROVED',
    timezoneOffsetMinutes: 330,
    cancellationWindowHours: 24,
  });

  const pendingVendorUser = await User.create({
    name: 'Rahul Verma',
    email: 'vendor.pending@marketplace.test',
    passwordHash: await hash('Password123!'),
    baseRole: 'VENDOR',
    role: vendorRole._id,
  });

  await VendorProfile.create({
    user: pendingVendorUser._id,
    businessName: 'Rahul Home Cleaning',
    contact: '+91-9123456789',
    address: 'Andheri, Mumbai',
    documents: ['id_proof.pdf'],
    status: 'PENDING',
    timezoneOffsetMinutes: 330,
  });

  const customerOne = await User.create({
    name: 'Anita Desai',
    email: 'customer1@marketplace.test',
    passwordHash: await hash('Password123!'),
    baseRole: 'CUSTOMER',
    role: customerRole._id,
  });

  const customerTwo = await User.create({
    name: 'Vikram Singh',
    email: 'customer2@marketplace.test',
    passwordHash: await hash('Password123!'),
    baseRole: 'CUSTOMER',
    role: customerRole._id,
  });

  const category = await Category.create({ name: 'Salon & Wellness', parent: null });
  const subCategory = await Category.create({ name: 'Haircuts', parent: category._id });

  const service = await Service.create({
    vendor: approvedVendorUser._id,
    title: 'Haircut & Styling',
    description: 'Professional haircut and styling service.',
    category: subCategory._id,
    images: [],
    status: 'PUBLISHED',
  });

  const offering = await Offering.create({
    service: service._id,
    name: 'Haircut - 45 min',
    durationMinutes: 45,
    priceMinorUnits: 40000,
    currency: 'INR',
    active: true,
  });

  const weekdaysToOpen = [1, 2, 3, 4, 5];
  for (const weekday of weekdaysToOpen) {
    await AvailabilityRule.create({
      service: service._id,
      weekday,
      startTime: '09:00',
      endTime: '13:00',
      capacity: 3,
    });
    await AvailabilityRule.create({
      service: service._id,
      weekday,
      startTime: '16:00',
      endTime: '20:00',
      capacity: 3,
    });
  }

  const now = new Date();
  const upcomingSlotStart = new Date(now.getTime() + 2 * 86400000);
  upcomingSlotStart.setUTCHours(4, 0, 0, 0);
  const upcomingSlotEnd = new Date(upcomingSlotStart.getTime() + 45 * 60000);

  const slotOne = await Slot.create({
    service: service._id,
    offering: offering._id,
    startTime: upcomingSlotStart,
    endTime: upcomingSlotEnd,
    capacity: 3,
    bookedCount: 1,
  });

  const slotTwoStart = new Date(upcomingSlotStart.getTime() + 60 * 60000);
  const slotTwoEnd = new Date(slotTwoStart.getTime() + 45 * 60000);
  const slotTwo = await Slot.create({
    service: service._id,
    offering: offering._id,
    startTime: slotTwoStart,
    endTime: slotTwoEnd,
    capacity: 3,
    bookedCount: 1,
  });

  const pastSlotStart = new Date(now.getTime() - 5 * 86400000);
  const pastSlotEnd = new Date(pastSlotStart.getTime() + 45 * 60000);
  const pastSlot = await Slot.create({
    service: service._id,
    offering: offering._id,
    startTime: pastSlotStart,
    endTime: pastSlotEnd,
    capacity: 3,
    bookedCount: 1,
  });

  const pendingBooking = await Booking.create({
    customer: customerOne._id,
    vendor: approvedVendorUser._id,
    service: service._id,
    offering: offering._id,
    slot: slotOne._id,
    priceMinorUnits: offering.priceMinorUnits,
    currency: offering.currency,
    paymentMode: 'PAY_AFTER',
    status: 'PENDING',
    history: [{ from: null, to: 'PENDING', actor: customerOne._id, actorRole: 'CUSTOMER', at: new Date() }],
  });

  const confirmedBooking = await Booking.create({
    customer: customerTwo._id,
    vendor: approvedVendorUser._id,
    service: service._id,
    offering: offering._id,
    slot: slotTwo._id,
    priceMinorUnits: offering.priceMinorUnits,
    currency: offering.currency,
    paymentMode: 'PAY_NOW',
    status: 'CONFIRMED',
    history: [
      { from: null, to: 'PENDING', actor: customerTwo._id, actorRole: 'CUSTOMER', at: new Date(now.getTime() - 3600000) },
      { from: 'PENDING', to: 'CONFIRMED', actor: approvedVendorUser._id, actorRole: 'VENDOR', at: new Date() },
    ],
  });

  await Payment.create({
    booking: confirmedBooking._id,
    amountMinorUnits: offering.priceMinorUnits,
    currency: offering.currency,
    providerRef: `mock_${confirmedBooking._id}`,
    status: 'SUCCESS',
  });

  const completedBooking = await Booking.create({
    customer: customerOne._id,
    vendor: approvedVendorUser._id,
    service: service._id,
    offering: offering._id,
    slot: pastSlot._id,
    priceMinorUnits: offering.priceMinorUnits,
    currency: offering.currency,
    paymentMode: 'PAY_AFTER',
    paymentCollected: true,
    status: 'COMPLETED',
    history: [
      { from: null, to: 'PENDING', actor: customerOne._id, actorRole: 'CUSTOMER', at: new Date(now.getTime() - 6 * 86400000) },
      { from: 'PENDING', to: 'CONFIRMED', actor: approvedVendorUser._id, actorRole: 'VENDOR', at: new Date(now.getTime() - 5 * 86400000) },
      { from: 'CONFIRMED', to: 'COMPLETED', actor: approvedVendorUser._id, actorRole: 'VENDOR', at: pastSlotEnd },
    ],
  });

  console.log('Seed complete.');
  console.log('');
  console.log('Super admin:      admin@marketplace.test / Password123!');
  console.log('Sub admin:        subadmin@marketplace.test / Password123!');
  console.log('Approved vendor:  vendor.approved@marketplace.test / Password123!');
  console.log('Pending vendor:   vendor.pending@marketplace.test / Password123!');
  console.log('Customer 1:       customer1@marketplace.test / Password123!');
  console.log('Customer 2:       customer2@marketplace.test / Password123!');

  await mongoose.connection.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
