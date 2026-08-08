const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    baseRole: { type: String, enum: ['CUSTOMER', 'VENDOR', 'ADMIN'], required: true },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
    isSuperAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
