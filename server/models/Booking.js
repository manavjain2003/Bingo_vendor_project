const mongoose = require('mongoose');

const STATES = ['PENDING', 'CONFIRMED', 'COMPLETED', 'REJECTED', 'CANCELLED', 'NO_SHOW'];

const historyEntrySchema = new mongoose.Schema(
  {
    from: { type: String, enum: STATES, default: null },
    to: { type: String, enum: STATES, required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actorRole: { type: String, required: true },
    reason: { type: String, default: null },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    offering: { type: mongoose.Schema.Types.ObjectId, ref: 'Offering', required: true },
    slot: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
    priceMinorUnits: { type: Number, required: true },
    currency: { type: String, required: true },
    paymentMode: { type: String, enum: ['PAY_NOW', 'PAY_AFTER'], required: true },
    paymentCollected: { type: Boolean, default: false },
    status: { type: String, enum: STATES, default: 'PENDING' },
    history: [historyEntrySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);
module.exports.STATES = STATES;
