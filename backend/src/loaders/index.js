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
  })
});
