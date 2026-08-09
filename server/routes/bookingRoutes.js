const express = require('express');
const bookingController = require('../controllers/bookingController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

const router = express.Router();

router.use(authenticate);

router.post('/', requirePermission('booking.create'), bookingController.createBooking);
router.get('/', bookingController.listMyBookings);
router.get('/:id', bookingController.getBooking);

router.patch('/:id/confirm', requirePermission('booking.confirm'), bookingController.confirmBooking);
router.patch('/:id/reject', requirePermission('booking.reject'), bookingController.rejectBooking);
router.patch('/:id/complete', requirePermission('booking.complete'), bookingController.completeBooking);
router.patch('/:id/no-show', requirePermission('booking.noshow'), bookingController.noShowBooking);
router.patch('/:id/cancel', requirePermission('booking.cancel'), bookingController.cancelBooking);
router.patch('/:id/reschedule', requirePermission('booking.reschedule'), bookingController.rescheduleBooking);
router.patch(
  '/:id/payment-collected',
  requirePermission('payment.markCollected'),
  bookingController.markPaymentCollected
);

module.exports = router;
