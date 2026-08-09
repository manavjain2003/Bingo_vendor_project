const mongoose = require('mongoose');

const offeringSchema = new mongoose.Schema(
  {
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    name: { type: String, required: true },
    durationMinutes: { type: Number, required: true, min: 5 },
    priceMinorUnits: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'INR' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Offering', offeringSchema);
