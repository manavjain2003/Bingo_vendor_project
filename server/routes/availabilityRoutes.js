const express = require('express');
const availabilityController = require('../controllers/availabilityController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

const router = express.Router();

router.get('/:serviceId/slots', availabilityController.getSlots);

router.get('/:serviceId/rules', authenticate, availabilityController.listRules);
router.post(
  '/:serviceId/rules',
  authenticate,
  requirePermission('availability.update'),
  availabilityController.createRule
);
router.delete('/rules/:id', authenticate, requirePermission('availability.update'), availabilityController.deleteRule);

router.get('/:serviceId/exceptions', authenticate, availabilityController.listExceptions);
router.put(
  '/:serviceId/exceptions',
  authenticate,
  requirePermission('availability.update'),
  availabilityController.upsertException
);
router.delete(
  '/exceptions/:id',
  authenticate,
  requirePermission('availability.update'),
  availabilityController.removeException
);

module.exports = router;
