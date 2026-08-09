const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    amountMinorUnits: { type: Number, required: true },
    currency: { type: String, required: true },
    providerRef: { type: String, required: true },
    status: {
      type: String,
      enum: ['INITIATED', 'SUCCESS', 'FAILED', 'REFUNDED'],
      default: 'INITIATED',
    },
    idempotencyKey: { type: String, default: null },
  },
  { timestamps: true }
);

paymentSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

module.exports = mongoose.model('Payment', paymentSchema);
