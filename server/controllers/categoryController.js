const Category = require('../models/Category');

async function listCategories(req, res) {
  try {
    const categories = await Category.find().populate('parent', 'name');
    res.json({ items: categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function createCategory(req, res) {
  try {
    const { name, parent } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'name is required' });
    }

    if (parent) {
      const parentDoc = await Category.findById(parent);
      if (!parentDoc) {
        return res.status(404).json({ message: 'Parent category not found' });
      }
      if (parentDoc.parent) {
        return res.status(422).json({ message: 'Only two levels of nesting are allowed' });
      }
    }

    const category = await Category.create({ name, parent: parent || null });
    res.status(201).json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function updateCategory(req, res) {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    if (req.body.name) category.name = req.body.name;
    await category.save();
    res.json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function deleteCategory(req, res) {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    await category.deleteOne();
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
