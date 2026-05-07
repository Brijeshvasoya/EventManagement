import { gql } from '@apollo/client';

export const GET_ME = gql`
  query GetMe {
    me {
      id name email role createdAt loyaltyPoints averageRating redeemedRewards isPlanPurchased planId totalWithdrawn availablePayout
      bankDetails { accountHolderName accountNumber bankName ifscCode }
    }
  }
`;

export const GET_EVENTS = gql`
  query GetEvents($limit: Int, $offset: Int) {
    events(limit: $limit, offset: $offset) {
      id title description date location capacity imageUrl eventType bookedCount
      ticketTypes { name price capacity }
      organizer { id name email totalWithdrawn }
      isBooked
      attendees { id user { id name email } quantity checkedInCount amountPaid ticketType status createdAt }
      vendors { id name category cost contactInfo }
      features
    }
  }
`;

export const GET_MY_ANALYTICS = gql`
  query GetMyAnalytics {
    myAnalytics { totalRevenue ticketsSold cancelledTickets confirmedBookingsCount monthlyData { n c p t } }
  }
`;

export const GET_MY_BOOKINGS = gql`
  query GetMyBookings {
    myBookings {
      id status qrCode ticketType amountPaid quantity createdAt paymentUrl
      event { 
        id title date location capacity imageUrl description eventType status bookedCount
        organizer { id name email }
        ticketTypes { name price capacity }
      }
    }
  }
`;

export const GET_BOOKING = gql`
  query GetBooking($id: ID!) {
    booking(id: $id) {
      id status quantity checkedInCount ticketType createdAt
      event { id title date location capacity }
      user { id name email }
    }
  }
`;

export const GET_EVENT_DETAILS = gql`
  query GetEventDetails($id: ID!) {
    event(id: $id) {
      id title description date location capacity imageUrl eventType status bookedCount isOnWaitlist waitlistCount
      organizer { id name email averageRating }
      ticketTypes { name price capacity }
      attendees { id user { id name email } quantity checkedInCount amountPaid ticketType status createdAt }
      vendors { id name category cost contactInfo }
      feedbacks { id rating comment user { name } createdAt }
      features
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
        checkedInCount
        amountPaid 
        ticketType 
        status 
        createdAt 
      }
    }
  }
`;

export const GET_MY_NOTIFICATIONS = gql`
  query GetMyNotifications {
    myNotifications {
      id message type read createdAt
      booking { id ticketType quantity }
      event { id title capacity bookedCount }
    }
  }
`;

export const UNREAD_NOTIFICATION_COUNT = gql`
  query GetUnreadNotificationCount {
    unreadNotificationCount
  }
`;

export const NOTIFICATION_SUBSCRIPTION = gql`
  subscription OnNotificationAdded {
    notificationAdded {
      id message type read createdAt
      booking { id ticketType quantity }
      event { id title }
    }
  }
`;

export const GET_MY_PAYOUTS = gql`
  query GetMyPayouts {
    myPayouts {
      id amount status createdAt
    }
  }
`;

export const GET_ALL_PAYOUTS = gql`
  query GetAllPayouts {
    allPayouts {
      id amount status createdAt
      organizer { 
        id name email 
        bankDetails { accountHolderName accountNumber bankName ifscCode }
      }
    }
  }
`;

export const VALIDATE_PROMO_CODE = gql`
  query ValidatePromoCode($code: String!, $eventId: ID!) {
    validatePromoCode(code: $code, eventId: $eventId) {
      id code discountType discountValue
    }
  }
`;

export const GET_MY_PROMO_CODES = gql`
  query GetMyPromoCodes {
    myPromoCodes {
      id code discountType discountValue expiresAt usageLimit usageCount isActive
      event { id title }
    }
  }
`;

export const GET_MY_SUPPORT_TICKETS = gql`
  query GetMySupportTickets($status: String, $type: String, $eventId: ID, $limit: Int, $offset: Int) {
    mySupportTickets(status: $status, type: $type, eventId: $eventId, limit: $limit, offset: $offset) {
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

export const GET_MY_BILLING = gql`
  query GetMyBilling {
    myBilling {
      currentPlan
      planExpiresAt
      isPlanActive
      scheduledPlanId
      scheduledDowngradeAt
      proratedUpgradeAmount
      invoices {
        id planId amount currency status stripeSessionId
        planStartDate planEndDate createdAt
      }
    }
  }
`;
