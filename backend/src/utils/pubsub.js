const { PubSub } = require('graphql-subscriptions');
const pubsub = new PubSub();

// Event names
const NOTIFICATION_ADDED = 'NOTIFICATION_ADDED';

module.exports = {
  pubsub,
  EVENTS: {
    NOTIFICATION_ADDED,
  },
};
