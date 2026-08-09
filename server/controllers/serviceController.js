const Service = require('../models/Service');
const Offering = require('../models/Offering');
const VendorProfile = require('../models/VendorProfile');

async function listPublicServices(req, res) {
  try {
    const { q, category, page = 1, limit = 20 } = req.query;

    const approvedVendorIds = await VendorProfile.find({ status: 'APPROVED' }).distinct('user');
    const filter = { status: 'PUBLISHED', vendor: { $in: approvedVendorIds } };
    if (category) filter.category = category;
    if (q) filter.$text = { $search: q };

    const skip = (Number(page) - 1) * Number(limit);
    const items = await Service.find(filter)
      .populate('category', 'name')
      .skip(skip)
      .limit(Number(limit))
      .sort('-createdAt');
    const total = await Service.countDocuments(filter);

    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function getPublicService(req, res) {
  try {
    const service = await Service.findById(req.params.id).populate('category', 'name');
    if (!service || service.status !== 'PUBLISHED') {
      return res.status(404).json({ message: 'Service not found' });
    }

    const vendorProfile = await VendorProfile.findOne({ user: service.vendor, status: 'APPROVED' });
    if (!vendorProfile) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const offerings = await Offering.find({ service: service._id, active: true });
    res.json({ service, offerings, vendorTimezoneOffsetMinutes: vendorProfile.timezoneOffsetMinutes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function listMyServices(req, res) {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = { vendor: req.user.id };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const items = await Service.find(filter).skip(skip).limit(Number(limit)).sort('-createdAt');
    const total = await Service.countDocuments(filter);

    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function createService(req, res) {
  try {
    const { title, description, category, images } = req.body;

    if (!title || !category) {
      return res.status(400).json({ message: 'title and category are required' });
    }

    const vendorProfile = await VendorProfile.findOne({ user: req.user.id });
    if (!vendorProfile || vendorProfile.status !== 'APPROVED') {
      return res.status(403).json({ message: 'Vendor is not approved' });
    }

    const service = await Service.create({
      vendor: req.user.id,
      title,
      description,
      category,
      images: images || [],
      status: 'DRAFT',
    });
    res.status(201).json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function updateService(req, res) {
  try {
    const { title, description, category, images } = req.body;

    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    if (!req.user.isSuperAdmin && String(service.vendor) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not your service' });
    }

    if (title !== undefined) service.title = title;
    if (description !== undefined) service.description = description;
    if (category !== undefined) service.category = category;
    if (images !== undefined) service.images = images;

    await service.save();
    res.json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function publishService(req, res) {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    if (!req.user.isSuperAdmin && String(service.vendor) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not your service' });
    }

    if (!req.user.isSuperAdmin) {
      const vendorProfile = await VendorProfile.findOne({ user: req.user.id });
      if (!vendorProfile || vendorProfile.status !== 'APPROVED') {
        return res.status(403).json({ message: 'Vendor is not approved' });
      }
    }

    const offeringsCount = await Offering.countDocuments({ service: service._id, active: true });
    if (offeringsCount === 0) {
      return res.status(422).json({ message: 'Service needs at least one active offering to publish' });
    }

    service.status = 'PUBLISHED';
    await service.save();
    res.json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function suspendService(req, res) {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    service.status = 'SUSPENDED';
    await service.save();
    res.json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function deleteService(req, res) {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    if (!req.user.isSuperAdmin && String(service.vendor) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not your service' });
    }

    await service.deleteOne();
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function createOffering(req, res) {
  try {
    const { name, durationMinutes, priceMinorUnits, currency } = req.body;

    if (!name || !durationMinutes || priceMinorUnits === undefined) {
      return res.status(400).json({ message: 'name, durationMinutes and priceMinorUnits are required' });
    }

    const service = await Service.findById(req.params.serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    if (!req.user.isSuperAdmin && String(service.vendor) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not your service' });
    }

    const offering = await Offering.create({
      service: service._id,
      name,
      durationMinutes,
      priceMinorUnits,
      currency: currency || 'INR',
    });
    res.status(201).json(offering);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function updateOffering(req, res) {
  try {
    const { name, durationMinutes, priceMinorUnits, currency, active } = req.body;

    const offering = await Offering.findById(req.params.id);
    if (!offering) {
      return res.status(404).json({ message: 'Offering not found' });
    }

    const service = await Service.findById(offering.service);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    if (!req.user.isSuperAdmin && String(service.vendor) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not your service' });
    }

    if (name !== undefined) offering.name = name;
    if (durationMinutes !== undefined) offering.durationMinutes = durationMinutes;
    if (priceMinorUnits !== undefined) offering.priceMinorUnits = priceMinorUnits;
    if (currency !== undefined) offering.currency = currency;
    if (active !== undefined) offering.active = active;

    await offering.save();
    res.json(offering);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function deleteOffering(req, res) {
  try {
    const offering = await Offering.findById(req.params.id);
    if (!offering) {
      return res.status(404).json({ message: 'Offering not found' });
    }

    const service = await Service.findById(offering.service);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    if (!req.user.isSuperAdmin && String(service.vendor) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not your service' });
    }

    await offering.deleteOne();
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function listOfferingsForService(req, res) {
  try {
    const offerings = await Offering.find({ service: req.params.serviceId });
    res.json({ items: offerings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

module.exports = {
  listPublicServices,
  getPublicService,
  listMyServices,
  createService,
  updateService,
  publishService,
  suspendService,
  deleteService,
  createOffering,
  updateOffering,
  deleteOffering,
  listOfferingsForService,
};
