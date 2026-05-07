import { gql } from '@apollo/client';

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

export const CANCEL_BOOKING = gql`
  mutation CancelBooking($id: ID!) {
    cancelBooking(bookingId: $id)
  }
`;

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($name: String, $email: String, $currentPassword: String, $newPassword: String) {
    updateProfile(name: $name, email: $email, currentPassword: $currentPassword, newPassword: $newPassword) {
      id name email role createdAt loyaltyPoints averageRating
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
  mutation VerifyTicket($bookingId: ID!, $count: Int) {
    verifyTicket(bookingId: $bookingId, count: $count) {
      id
      status
      quantity
      checkedInCount
      user { name }
      event { title }
    }
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

export const JOIN_WAITLIST = gql`
  mutation JoinWaitlist($eventId: ID!) {
    joinWaitlist(eventId: $eventId)
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

export const CONFIRM_PAYMENT = gql`
  mutation ConfirmPayment($bookingId: ID!) {
    confirmPayment(bookingId: $bookingId) {
      id
      status
      paymentStatus
    }
  }
`;

export const CONFIRM_PLAN_PURCHASE = gql`
  mutation ConfirmPlanPurchase($sessionId: String!, $planId: String!, $proratedCredit: Int) {
    confirmPlanPurchase(sessionId: $sessionId, planId: $planId, proratedCredit: $proratedCredit) { token }
  }
`;

export const CREATE_PLAN_CHECKOUT_SESSION = gql`
  mutation CreatePlanCheckoutSession($planId: String!) {
    createPlanCheckoutSession(planId: $planId)
  }
`;

export const SCHEDULE_DOWNGRADE = gql`
  mutation ScheduleDowngrade($targetPlanId: String!) {
    scheduleDowngrade(targetPlanId: $targetPlanId) { token }
  }
`;

export const CANCEL_SCHEDULED_DOWNGRADE = gql`
  mutation CancelScheduledDowngrade {
    cancelScheduledDowngrade { token }
  }
`;

export const CREATE_SUPPORT_TICKET = gql`
  mutation CreateSupportTicket($eventId: ID, $type: String!, $subject: String!, $description: String!) {
    createSupportTicket(eventId: $eventId, type: $type, subject: $subject, description: $description) {
      id
    }
  }
`;

export const REPLY_TO_TICKET = gql`
  mutation ReplyToSupportTicket($ticketId: ID!, $message: String!) {
    replyToSupportTicket(ticketId: $ticketId, message: $message) {
      id subject status type createdAt
      event { id title }
      user { id name }
      organizer { id name }
      messages { id message createdAt sender { id name role } }
    }
  }
`;

export const RESOLVE_TICKET = gql`
  mutation ResolveSupportTicket($ticketId: ID!) {
    resolveSupportTicket(ticketId: $ticketId) {
      id subject status type createdAt
      event { id title }
      user { id name }
      organizer { id name }
      messages { id message createdAt sender { id name role } }
    }
  }
`;
export const REOPEN_TICKET = gql`
  mutation ReopenSupportTicket($ticketId: ID!) {
    reopenSupportTicket(ticketId: $ticketId) {
      id subject status type createdAt
      event { id title }
      user { id name }
      organizer { id name }
      messages { id message createdAt sender { id name role } }
    }
  }
`;
