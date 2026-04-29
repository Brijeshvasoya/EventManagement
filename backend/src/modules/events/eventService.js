const Event = require('../../models/Event');
const Vendor = require('../../models/Vendor');
const User = require('../../models/User');
const { requireRole } = require('../../utils/authGuard');

const BASIC_PLAN_EVENT_LIMIT = 5;

exports.getEvents = async ({ limit = 50, offset = 0 }) => {
  return Event.find().sort({ date: -1 }).skip(offset).limit(limit);
};

exports.getEventById = async (id) => Event.findById(id);

exports.createEvent = async (input, user) => {
  requireRole(user, ['ORGANIZER', 'ADMIN']);

  // Enforce Basic plan event limit for organizers
  if (user.role === 'ORGANIZER') {
    const organizer = await User.findById(user.id).select('planId');
    if (organizer && organizer.planId === 'BASIC') {
      const existingCount = await Event.countDocuments({ organizer: user.id });
      if (existingCount >= BASIC_PLAN_EVENT_LIMIT) {
        throw new Error(
          `Basic plan allows a maximum of ${BASIC_PLAN_EVENT_LIMIT} events. ` +
          `Please upgrade to the Pro plan to create unlimited events.`
        );
      }
    }
  }

  const { vendorIds, ...eventData } = input;
  const event = new Event({ ...eventData, organizer: user.id });
  await event.save();

  if (vendorIds && vendorIds.length > 0) {
    await Vendor.updateMany(
      { _id: { $in: vendorIds }, organizer: user.id },
      { $addToSet: { events: event.id } }
    );
  }
  
  return event;
};

exports.updateEvent = async (id, input, user) => {
  requireRole(user, ['ORGANIZER', 'ADMIN']);
  const event = await Event.findOne({ _id: id, organizer: user.id });
  if (!event) throw new Error('Event not found or unauthorized');

  const { vendorIds, ...otherInput } = input;
  Object.assign(event, otherInput);
  await event.save();

  // Update Vendor associations if vendorIds provided
  if (vendorIds) {
    // 1. Remove this event from all vendors first (simplest way to sync)
    // Alternatively, find current vendors and diff them.
    await Vendor.updateMany(
      { events: event._id },
      { $pull: { events: event._id } }
    );

    // 2. Add this event to selected vendors
    if (vendorIds.length > 0) {
      await Vendor.updateMany(
        { _id: { $in: vendorIds }, organizer: user.id },
        { $addToSet: { events: event._id } }
      );
    }
  }

  return event;
};

exports.deleteEvent = async (id, user) => {
  requireRole(user, ['ORGANIZER', 'ADMIN']);
  const event = await Event.findById(id);
  if (!event) throw new Error('Event not found');
  if (event.organizer.toString() !== user.id && user.role !== 'ADMIN') {
    throw new Error('Not authorized to delete this event. You can only delete your own events.');
  }
  await Event.findByIdAndDelete(id);
  return true;
};
