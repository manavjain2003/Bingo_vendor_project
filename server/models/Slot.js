const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    offering: { type: mongoose.Schema.Types.ObjectId, ref: 'Offering', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    capacity: { type: Number, required: true },
    bookedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

slotSchema.index({ service: 1, offering: 1, startTime: 1 }, { unique: true });

module.exports = mongoose.model('Slot', slotSchema);
