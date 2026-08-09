const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: 'Missing access token' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired access token' });
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    const role = await Role.findById(user.role);
    req.user = {
      id: String(user._id),
      email: user.email,
      name: user.name,
      baseRole: user.baseRole,
      isSuperAdmin: user.isSuperAdmin,
      permissions: role ? role.permissions : [],
      roleName: role ? role.name : null,
    };
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

module.exports = { authenticate };