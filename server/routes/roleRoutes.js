const express = require('express');
const roleController = require('../controllers/roleController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('role.view'), roleController.listRoles);
router.post('/', requirePermission('role.create'), roleController.createRole);
router.patch('/:id', requirePermission('role.update'), roleController.updateRole);
router.post('/assign', requirePermission('role.assign'), roleController.assignRole);

module.exports = router;