import { gql } from '@apollo/client';

export const NOTIFICATION_ADDED_SUBSCRIPTION = gql`
  subscription OnNotificationAdded {
    notificationAdded {
      id
      title
      message
      type
      createdAt
    }
  }
`;

export const TICKET_UPDATED_SUBSCRIPTION = gql`
  subscription OnTicketUpdated($ticketId: ID!) {
    ticketUpdated(ticketId: $ticketId) {
      id
      subject
      status
      type
      createdAt
      user { id name }
      event { id title }
      organizer { id name }
      messages {
        id
        message
        createdAt
        sender { id name role }
      }
    }
  }
`;
