const DataLoader = require('dataloader');
const User = require('../models/User');
const Event = require('../models/Event');

module.exports = () => ({
  userLoader: new DataLoader(async (userIds) => {
    const users = await User.find({ _id: { $in: userIds } });
    const userMap = users.reduce((acc, user) => ({ ...acc, [user.id]: user }), {});
    return userIds.map(id => userMap[id] || null); // Eliminates User N+1 queries!
  }),
  eventLoader: new DataLoader(async (eventIds) => {
    const events = await Event.find({ _id: { $in: eventIds } });
    const eventMap = events.reduce((acc, event) => ({ ...acc, [event.id]: event }), {});
    return eventIds.map(id => eventMap[id] || null);
  }),
  bookingLoader: new DataLoader(async (bookingIds) => {
    const Booking = require('../models/Booking');
    const bookings = await Booking.find({ _id: { $in: bookingIds } });
    const bookingMap = bookings.reduce((acc, booking) => ({ ...acc, [booking.id]: booking }), {});
    return bookingIds.map(id => bookingMap[id] || null);
  })
});
