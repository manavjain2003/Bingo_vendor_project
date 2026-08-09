const AvailabilityRule = require('../models/AvailabilityRule');
const DateException = require('../models/DateException');
const Offering = require('../models/Offering');
const Service = require('../models/Service');
const VendorProfile = require('../models/VendorProfile');
const Slot = require('../models/Slot');

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

async function createRule(req, res) {
  try {
    const { weekday, startTime, endTime, capacity } = req.body;

    if (weekday === undefined || !TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime) || !capacity) {
      return res.status(400).json({ message: 'weekday, startTime, endTime and capacity are required' });
    }

    const service = await Service.findById(req.params.serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    if (!req.user.isSuperAdmin && String(service.vendor) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not your service' });
    }

    const rule = await AvailabilityRule.create({ service: service._id, weekday, startTime, endTime, capacity });
    res.status(201).json(rule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function listRules(req, res) {
  try {
    const rules = await AvailabilityRule.find({ service: req.params.serviceId });
    res.json({ items: rules });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function deleteRule(req, res) {
  try {
    const rule = await AvailabilityRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ message: 'Rule not found' });
    }

    const service = await Service.findById(rule.service);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    if (!req.user.isSuperAdmin && String(service.vendor) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not your service' });
    }

    await rule.deleteOne();
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function upsertException(req, res) {
  try {
    const { date, closed, windows } = req.body;

    if (!DATE_PATTERN.test(date)) {
      return res.status(400).json({ message: 'date must be in YYYY-MM-DD format' });
    }

    const service = await Service.findById(req.params.serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    if (!req.user.isSuperAdmin && String(service.vendor) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not your service' });
    }

    const exception = await DateException.findOneAndUpdate(
      { service: service._id, date },
      { closed: !!closed, windows: closed ? [] : windows || [] },
      { upsert: true, new: true }
    );
    res.json(exception);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function removeException(req, res) {
  try {
    const exception = await DateException.findById(req.params.id);
    if (!exception) {
      return res.status(404).json({ message: 'Exception not found' });
    }

    const service = await Service.findById(exception.service);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    if (!req.user.isSuperAdmin && String(service.vendor) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not your service' });
    }

    await exception.deleteOne();
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function listExceptions(req, res) {
  try {
    const exceptions = await DateException.find({ service: req.params.serviceId });
    res.json({ items: exceptions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function getSlots(req, res) {
  try {
    const { serviceId } = req.params;
    const { offeringId, from, to } = req.query;

    if (!offeringId) {
      return res.status(400).json({ message: 'offeringId is required' });
    }
    if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) {
      return res.status(400).json({ message: 'from and to must be in YYYY-MM-DD format' });
    }

    const offering = await Offering.findById(offeringId);
    if (!offering || String(offering.service) !== String(serviceId)) {
      return res.status(404).json({ message: 'Offering not found for this service' });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const vendorProfile = await VendorProfile.findOne({ user: service.vendor });
    const timezoneOffsetMinutes = vendorProfile ? vendorProfile.timezoneOffsetMinutes : 0;
    const durationMinutes = offering.durationMinutes;

    const rules = await AvailabilityRule.find({ service: serviceId });
    const exceptions = await DateException.find({ service: serviceId });

    const now = new Date();
    const candidates = [];

    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T00:00:00.000Z`);

    for (let cursor = fromDate; cursor <= toDate; cursor = new Date(cursor.getTime() + 86400000)) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const weekday = cursor.getUTCDay();

      const exception = exceptions.find((e) => e.date === dateStr);
      let windowsForDay;
      if (exception) {
        windowsForDay = exception.closed ? [] : exception.windows;
      } else {
        windowsForDay = rules.filter((r) => r.weekday === weekday);
      }

      for (const windowDef of windowsForDay) {
        const [startHour, startMinute] = windowDef.startTime.split(':').map(Number);
        const [endHour, endMinute] = windowDef.endTime.split(':').map(Number);
        const startOfWindowMinutes = startHour * 60 + startMinute;
        const endOfWindowMinutes = endHour * 60 + endMinute;

        for (
          let minutesFromMidnight = startOfWindowMinutes;
          minutesFromMidnight + durationMinutes <= endOfWindowMinutes;
          minutesFromMidnight += durationMinutes
        ) {
          const [year, month, day] = dateStr.split('-').map(Number);
          const slotStartUtcMillis =
            Date.UTC(year, month - 1, day, 0, minutesFromMidnight, 0) - timezoneOffsetMinutes * 60000;
          const slotEndUtcMillis = slotStartUtcMillis + durationMinutes * 60000;

          const slotStart = new Date(slotStartUtcMillis);
          const slotEnd = new Date(slotEndUtcMillis);

          if (slotStart.getTime() > now.getTime()) {
            candidates.push({ startTime: slotStart, endTime: slotEnd, capacity: windowDef.capacity });
          }
        }
      }
    }

    await Slot.deleteMany({
      service: serviceId,
      offering: offeringId,
      bookedCount: 0,
      startTime: { $gte: fromDate, $lte: new Date(`${to}T23:59:59.999Z`) },
    });

    const created = [];
    for (const candidate of candidates) {
      const slot = await Slot.findOneAndUpdate(
        { service: serviceId, offering: offeringId, startTime: candidate.startTime },
        {
          $setOnInsert: {
            service: serviceId,
            offering: offeringId,
            startTime: candidate.startTime,
            endTime: candidate.endTime,
            capacity: candidate.capacity,
            bookedCount: 0,
          },
        },
        { upsert: true, new: true }
      );
      created.push(slot);
    }

    const withRemaining = created
      .filter((s) => s.bookedCount < s.capacity)
      .sort((a, b) => a.startTime - b.startTime)
      .map((s) => ({
        id: s._id,
        startTime: s.startTime,
        endTime: s.endTime,
        capacity: s.capacity,
        remaining: s.capacity - s.bookedCount,
      }));

    res.json({ items: withRemaining });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

module.exports = {
  createRule,
  listRules,
  deleteRule,
  upsertException,
  removeException,
  listExceptions,
  getSlots,
};
