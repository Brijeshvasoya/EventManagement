const DataLoader = require('dataloader');
const User = require('../models/User');

const batchUsers = async (userIds) => {
  // Find all users whose IDs are in the array
  const users = await User.find({ _id: { $in: userIds } });
  
  // Map users to their corresponding IDs
  const userMap = users.reduce((acc, user) => {
    acc[user.id] = user;
    return acc;
  }, {});

  // Return them in the exact order requested by DataLoader
  return userIds.map((id) => userMap[id] || null);
};

// We return a factory function so each request gets its own instance 
// caching data only per-request
const createUserLoader = () => new DataLoader(batchUsers);

module.exports = {
  createUserLoader,
};
