const mongoose = require('mongoose');

const windowSchema = new mongoose.Schema(
  {
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    capacity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const dateExceptionSchema = new mongoose.Schema(
  {
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    date: { type: String, required: true },
    closed: { type: Boolean, default: true },
    windows: [windowSchema],
  },
  { timestamps: true }
);

dateExceptionSchema.index({ service: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DateException', dateExceptionSchema);