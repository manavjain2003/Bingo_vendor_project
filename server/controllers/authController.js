const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Role = require('../models/Role');
const VendorProfile = require('../models/VendorProfile');
const RefreshToken = require('../models/RefreshToken');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function issueTokens(user) {
  const accessToken = jwt.sign({ sub: String(user._id) }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_TTL || '15m',
  });

  const tokenId = uuidv4();
  const refreshToken = jwt.sign({ sub: String(user._id), jti: tokenId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_TTL || '7d',
  });

  return { accessToken, refreshToken, tokenId };
}

async function signup(req, res) {
  try {
    const { name, email, password, baseRole, vendorProfile } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }
    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ message: 'a valid email is required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'password must be at least 8 characters' });
    }
    if (baseRole !== 'CUSTOMER' && baseRole !== 'VENDOR') {
      return res.status(400).json({ message: 'baseRole must be CUSTOMER or VENDOR' });
    }
    if (baseRole === 'VENDOR' && (!vendorProfile || !vendorProfile.businessName || !vendorProfile.contact || !vendorProfile.address)) {
      return res.status(400).json({ message: 'vendorProfile with businessName, contact and address is required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const roleName = baseRole === 'VENDOR' ? 'VENDOR' : 'CUSTOMER';
    const role = await Role.findOne({ name: roleName });
    if (!role) {
      return res.status(500).json({ message: 'Default role not seeded, run the seed script' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      baseRole: roleName,
      role: role._id,
    });

    if (roleName === 'VENDOR') {
      await VendorProfile.create({
        user: user._id,
        businessName: vendorProfile.businessName,
        contact: vendorProfile.contact,
        address: vendorProfile.address,
        documents: Array.isArray(vendorProfile.documents) ? vendorProfile.documents : [],
      });
    }

    const { accessToken, refreshToken, tokenId } = issueTokens(user);

    await RefreshToken.create({
      user: user._id,
      tokenId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email, baseRole: user.baseRole },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const { accessToken, refreshToken, tokenId } = issueTokens(user);

    await RefreshToken.create({
      user: user._id,
      tokenId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.json({
      user: { id: user._id, name: user.name, email: user.email, baseRole: user.baseRole },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'refreshToken is required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    const stored = await RefreshToken.findOne({ tokenId: decoded.jti });
    if (!stored || stored.revoked) {
      return res.status(401).json({ message: 'Refresh token has been revoked' });
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    stored.revoked = true;
    await stored.save();

    const { accessToken, refreshToken: newRefreshToken, tokenId } = issueTokens(user);

    await RefreshToken.create({
      user: user._id,
      tokenId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function logout(req, res) {
  const { refreshToken } = req.body;
  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      await RefreshToken.updateOne({ tokenId: decoded.jti }, { revoked: true });
    } catch (err) {
      return res.status(204).send();
    }
  }
  res.status(204).send();
}

async function me(req, res) {
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    baseRole: req.user.baseRole,
    roleName: req.user.roleName,
    isSuperAdmin: req.user.isSuperAdmin,
    permissions: req.user.isSuperAdmin ? ['*'] : req.user.permissions,
  });
}

module.exports = { signup, login, refresh, logout, me };