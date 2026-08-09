const express = require('express');
const vendorController = require('../controllers/vendorController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

const router = express.Router();

router.use(authenticate);

router.get('/me', vendorController.myVendorProfile);
router.get('/', requirePermission('vendor.view'), vendorController.listVendors);
router.patch('/:id/approve', requirePermission('vendor.approve'), vendorController.approveVendor);
router.patch('/:id/reject', requirePermission('vendor.reject'), vendorController.rejectVendor);

module.exports = router;
