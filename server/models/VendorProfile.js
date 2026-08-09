const mongoose = require('mongoose');

const vendorProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessName: { type: String, required: true },
    contact: { type: String, required: true },
    address: { type: String, required: true },
    documents: [{ type: String }],
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    rejectionReason: { type: String },
    timezoneOffsetMinutes: { type: Number, default: 0 },
    cancellationWindowHours: { type: Number, default: 24 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VendorProfile', vendorProfileSchema);