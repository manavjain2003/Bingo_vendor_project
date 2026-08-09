const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Slot = require('../models/Slot');

async function webhook(req, res) {
  try {
    const { paymentId, result } = req.body;

    if (!paymentId) {
      return res.status(400).json({ message: 'paymentId is required' });
    }
    if (result !== 'SUCCESS' && result !== 'FAILED') {
      return res.status(400).json({ message: 'result must be SUCCESS or FAILED' });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status === 'SUCCESS' || payment.status === 'FAILED' || payment.status === 'REFUNDED') {
      return res.json(payment);
    }

    if (result === 'SUCCESS') {
      payment.status = 'SUCCESS';
      await payment.save();
    } else {
      payment.status = 'FAILED';
      await payment.save();

      const booking = await Booking.findById(payment.booking);
      if (booking && booking.status === 'PENDING') {
        booking.status = 'CANCELLED';
        booking.history.push({
          from: 'PENDING',
          to: 'CANCELLED',
          actor: booking.customer,
          actorRole: 'CUSTOMER',
          reason: 'Payment failed via webhook',
          at: new Date(),
        });
        await booking.save();
        await Slot.findOneAndUpdate({ _id: booking.slot, bookedCount: { $gt: 0 } }, { $inc: { bookedCount: -1 } });
      }
    }

    res.json(payment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function getPayment(req, res) {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.json(payment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

module.exports = { webhook, getPayment };