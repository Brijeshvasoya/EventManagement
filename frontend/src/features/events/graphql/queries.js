import { gql } from '@apollo/client';

export const GET_EVENTS = gql`
  query GetEvents($limit: Int, $offset: Int) {
    events(limit: $limit, offset: $offset) {
      id title description date location capacity imageUrl eventType bookedCount
      ticketTypes { name price capacity }
      organizer { id name }
      isBooked
      attendees { id user { id name email } quantity amountPaid ticketType status createdAt }
      vendors { id name category cost contactInfo }
    }
  }
`;

export const UPDATE_EVENT = gql`
  mutation UpdateEvent($id: ID!, $input: CreateEventInput!) {
    updateEvent(id: $id, input: $input) { id title }
  }
`;
export const CREATE_EVENT = gql`
  mutation CreateEvent($input: CreateEventInput!) {
    createEvent(input: $input) { id title imageUrl }
  }
`;

export const DELETE_EVENT = gql`
  mutation DeleteEvent($id: ID!) {
    deleteEvent(id: $id)
  }
`;
export const BOOK_EVENT = gql`
  mutation BookEvent($id: ID!, $ticketType: String, $amountPaid: Float, $stripePaymentId: String, $quantity: Int) {
    bookEvent(eventId: $id, ticketType: $ticketType, amountPaid: $amountPaid, stripePaymentId: $stripePaymentId, quantity: $quantity) { 
      id 
      status 
      quantity
    }
  }
`;
export const CREATE_CHECKOUT_SESSION = gql`
  mutation CreateCheckoutSession($eventId: ID!, $ticketType: String!, $quantity: Int!) {
    createCheckoutSession(eventId: $eventId, ticketType: $ticketType, quantity: $quantity)
  }
`;
export const GET_MY_ANALYTICS = gql`
  query GetMyAnalytics {
    myAnalytics { totalRevenue ticketsSold cancelledTickets }
  }
`;
export const CANCEL_BOOKING = gql`
  mutation CancelBooking($id: ID!) {
    cancelBooking(bookingId: $id)
  }
`;
export const GET_MY_BOOKINGS = gql`
  query GetMyBookings {
    myBookings {
      id status qrCode ticketType amountPaid quantity createdAt
      event { id title date location capacity imageUrl description organizer { name } }
    }
  }
`;

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($name: String, $email: String, $currentPassword: String, $newPassword: String) {
    updateProfile(name: $name, email: $email, currentPassword: $currentPassword, newPassword: $newPassword) {
      id name email role
    }
  }
`;

export const GET_EVENT_DETAILS = gql`
  query GetEventDetails($id: ID!) {
    event(id: $id) {
      id title description date location capacity imageUrl eventType status bookedCount
      organizer { id name email }
      ticketTypes { name price capacity }
      attendees { id user { id name email } quantity amountPaid ticketType status createdAt }
      vendors { id name category cost contactInfo }
    }
  }
`;

export const GET_MY_VENDORS = gql`
  query GetMyVendors {
    myVendors {
      id name category cost contactInfo availableDates
      events { id title }
    }
  }
`;

export const GET_MY_EVENTS = gql`
  query GetMyEvents {
    myEvents {
      id title date location capacity imageUrl description eventType status bookedCount
      ticketTypes { name price capacity }
      attendees { 
        id 
        user { name email } 
        quantity 
        amountPaid 
        ticketType 
        status 
        createdAt 
      }
    }
  }
`;

export const CREATE_VENDOR = gql`
  mutation CreateVendor($input: VendorInput!) {
    createVendor(input: $input) {
      id name category cost
      events { id title }
    }
  }
`;

export const UPDATE_VENDOR = gql`
  mutation UpdateVendor($id: ID!, $input: VendorInput!) {
    updateVendor(id: $id, input: $input) {
      id name category cost
      events { id title }
    }
  }
`;

export const DELETE_VENDOR = gql`
  mutation DeleteVendor($id: ID!) {
    deleteVendor(id: $id)
  }
`;

export const VERIFY_TICKET = gql`
  mutation VerifyTicket($bookingId: ID!) {
    verifyTicket(bookingId: $bookingId) {
      id
      status
      user { name }
      event { title }
    }
  }
`;

export const GET_MY_NOTIFICATIONS = gql`
  query GetMyNotifications {
    myNotifications {
      id message type read createdAt
      booking { id ticketType quantity }
      event { id title }
    }
  }
`;

export const UNREAD_NOTIFICATION_COUNT = gql`
  query GetUnreadNotificationCount {
    unreadNotificationCount
  }
`;

export const MARK_NOTIFICATION_AS_READ = gql`
  mutation MarkNotificationAsRead($id: ID!) {
    markNotificationAsRead(id: $id) { id read }
  }
`;

export const MARK_ALL_NOTIFICATIONS_AS_READ = gql`
  mutation MarkAllNotificationsAsRead {
    markAllNotificationsAsRead
  }
`;
