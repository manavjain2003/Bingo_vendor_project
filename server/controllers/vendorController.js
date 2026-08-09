const VendorProfile = require('../models/VendorProfile');

async function listVendors(req, res) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const items = await VendorProfile.find(filter)
      .populate('user', 'name email')
      .skip(skip)
      .limit(Number(limit));
    const total = await VendorProfile.countDocuments(filter);

    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function approveVendor(req, res) {
  try {
    const profile = await VendorProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ message: 'Vendor profile not found' });
    }
    profile.status = 'APPROVED';
    profile.rejectionReason = undefined;
    await profile.save();
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function rejectVendor(req, res) {
  try {
    const { reason } = req.body;
    const profile = await VendorProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ message: 'Vendor profile not found' });
    }
    profile.status = 'REJECTED';
    profile.rejectionReason = reason;
    await profile.save();
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function myVendorProfile(req, res) {
  try {
    const profile = await VendorProfile.findOne({ user: req.user.id });
    if (!profile) {
      return res.status(404).json({ message: 'Vendor profile not found' });
    }
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

module.exports = { listVendors, approveVendor, rejectVendor, myVendorProfile };