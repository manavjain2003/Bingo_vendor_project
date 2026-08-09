const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null }, // if null mean it is a parent category
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);