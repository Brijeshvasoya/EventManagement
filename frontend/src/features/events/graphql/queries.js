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
      attendees { id user { id name email } quantity amountPaid ticketType status createdAt }
      vendors { id name category cost contactInfo }
      features
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
  mutation CreateCheckoutSession($eventId: ID!, $ticketType: String!, $quantity: Int!, $promoCode: String) {
    createCheckoutSession(eventId: $eventId, ticketType: $ticketType, quantity: $quantity, promoCode: $promoCode)
  }
`;
export const GET_MY_ANALYTICS = gql`
  query GetMyAnalytics {
    myAnalytics { totalRevenue ticketsSold cancelledTickets confirmedBookingsCount monthlyData { n c p } }
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
      event { 
        id title date location capacity imageUrl description eventType status bookedCount
        organizer { id name email }
        ticketTypes { name price capacity }
      }
    }
  }
`;

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($name: String, $email: String, $currentPassword: String, $newPassword: String) {
    updateProfile(name: $name, email: $email, currentPassword: $currentPassword, newPassword: $newPassword) {
      id name email role createdAt loyaltyPoints averageRating
    }
  }
`;

export const GET_EVENT_DETAILS = gql`
  query GetEventDetails($id: ID!) {
    event(id: $id) {
      id title description date location capacity imageUrl eventType status bookedCount isOnWaitlist waitlistCount
      organizer { id name email averageRating }
      ticketTypes { name price capacity }
      attendees { id user { id name email } quantity amountPaid ticketType status createdAt }
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
      event { id title capacity bookedCount }
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
export const REDEEM_REWARD = gql`
  mutation RedeemReward($rewardId: String!, $points: Int!) {
    redeemReward(rewardId: $rewardId, points: $points) {
      id loyaltyPoints redeemedRewards
    }
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

export const LOGOUT = gql`
  mutation Logout {
    logout
  }
`;

export const REQUEST_PAYOUT = gql`
  mutation RequestPayout($amount: Float!) {
    requestPayout(amount: $amount) {
      id amount status createdAt
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

export const APPROVE_PAYOUT = gql`
  mutation ApprovePayout($payoutId: ID!) {
    approvePayout(payoutId: $payoutId) {
      id status
    }
  }
`;

export const UPDATE_BANK_DETAILS = gql`
  mutation UpdateBankDetails($accountHolderName: String!, $accountNumber: String!, $bankName: String!, $ifscCode: String!) {
    updateBankDetails(accountHolderName: $accountHolderName, accountNumber: $accountNumber, bankName: $bankName, ifscCode: $ifscCode) {
      id 
      bankDetails { accountHolderName accountNumber bankName ifscCode }
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


export const JOIN_WAITLIST = gql`
  mutation JoinWaitlist($eventId: ID!) {
    joinWaitlist(eventId: $eventId)
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

export const CREATE_PROMO_CODE = gql`
  mutation CreatePromoCode($input: PromoCodeInput!) {
    createPromoCode(input: $input) { id code }
  }
`;

export const UPDATE_PROMO_CODE = gql`
  mutation UpdatePromoCode($id: ID!, $input: PromoCodeInput!) {
    updatePromoCode(id: $id, input: $input) {
      id code discountType discountValue expiresAt usageLimit
    }
  }
`;

export const DELETE_PROMO_CODE = gql`
  mutation DeletePromoCode($id: ID!) {
    deletePromoCode(id: $id)
  }
`;

