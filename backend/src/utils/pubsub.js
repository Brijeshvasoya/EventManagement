const { PubSub } = require('graphql-subscriptions');
const pubsub = new PubSub();

// Event names
const NOTIFICATION_ADDED = 'NOTIFICATION_ADDED';
const TICKET_UPDATED = 'TICKET_UPDATED';

module.exports = {
  pubsub,
  EVENTS: {
    NOTIFICATION_ADDED,
    TICKET_UPDATED,
  },
};
