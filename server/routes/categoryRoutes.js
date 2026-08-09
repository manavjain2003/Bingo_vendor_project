const express = require('express');
const categoryController = require('../controllers/categoryController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

const router = express.Router();

router.get('/', categoryController.listCategories);
router.post('/', authenticate, requirePermission('category.create'), categoryController.createCategory);
router.patch('/:id', authenticate, requirePermission('category.update'), categoryController.updateCategory);
router.delete('/:id', authenticate, requirePermission('category.delete'), categoryController.deleteCategory);

module.exports = router;