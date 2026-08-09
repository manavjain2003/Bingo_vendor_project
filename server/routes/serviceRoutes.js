const express = require('express');
const serviceController = require('../controllers/serviceController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

const router = express.Router();

router.get('/', serviceController.listPublicServices);
router.get('/mine/list', authenticate, serviceController.listMyServices);
router.get('/:id', serviceController.getPublicService);
router.get('/:serviceId/offerings', serviceController.listOfferingsForService);

router.post('/', authenticate, requirePermission('service.create'), serviceController.createService);
router.patch('/:id', authenticate, requirePermission('service.update'), serviceController.updateService);
router.patch('/:id/publish', authenticate, requirePermission('service.publish'), serviceController.publishService);
router.patch('/:id/suspend', authenticate, requirePermission('service.suspend'), serviceController.suspendService);
router.delete('/:id', authenticate, requirePermission('service.delete'), serviceController.deleteService);

router.post(
  '/:serviceId/offerings',
  authenticate,
  requirePermission('offering.create'),
  serviceController.createOffering
);
router.patch('/offerings/:id', authenticate, requirePermission('offering.update'), serviceController.updateOffering);
router.delete('/offerings/:id', authenticate, requirePermission('offering.delete'), serviceController.deleteOffering);

module.exports = router;