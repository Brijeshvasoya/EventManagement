const typeDefs = `#graphql
  type BankDetails { accountHolderName: String accountNumber: String bankName: String ifscCode: String }
  type User { id: ID! name: String! email: String! role: String! createdAt: String loyaltyPoints: Int averageRating: Float numReviews: Int redeemedRewards: [String] isPlanPurchased: Boolean planId: String totalWithdrawn: Float availablePayout: Float bankDetails: BankDetails }
  type TicketType { name: String! price: Float! capacity: Int! }
  type Feedback { id: ID! booking: Booking! event: Event! organizer: User! user: User! rating: Int! comment: String createdAt: String! }
  type Event { id: ID! title: String! description: String! date: String! location: String! capacity: Int! imageUrl: String organizer: User! isBooked: Boolean isOnWaitlist: Boolean waitlistCount: Int eventType: String status: String ticketTypes: [TicketType] bookedCount: Int attendees: [Booking!] vendors: [Vendor!] feedbacks: [Feedback!] features: [String] }
  type Booking { id: ID! event: Event! user: User! status: String! createdAt: String! qrCode: String ticketType: String amountPaid: Float quantity: Int paymentStatus: String }
  type Vendor { id: ID! name: String! category: String! rating: Float cost: Float contactInfo: String availableDates: [String] organizer: User! events: [Event!] }
  type Notification { id: ID! recipient: User! title: String message: String! type: String! read: Boolean! booking: Booking event: Event createdAt: String! }
  type AuthPayload { token: String! user: User! }
  type MonthlyData { n: String! c: Float! p: Float! }
  type AnalyticsStats { totalRevenue: Float! ticketsSold: Int! cancelledTickets: Int! confirmedBookingsCount: Int! monthlyData: [MonthlyData!]! }
  type PublicBookingFeedback { id: ID! eventTitle: String! organizerName: String! status: String! existingRating: Int existingComment: String }
  type Payout { id: ID! organizer: User! amount: Float! status: String! createdAt: String! }
  type PlanInvoice { id: ID! planId: String! amount: Float! currency: String! status: String! stripeSessionId: String planStartDate: String! planEndDate: String! createdAt: String! }
  type BillingInfo { currentPlan: String planExpiresAt: String isPlanActive: Boolean invoices: [PlanInvoice!]! }
  type PromoCode { id: ID! code: String! discountType: String! discountValue: Float! expiresAt: String! usageLimit: Int usageCount: Int isActive: Boolean event: Event }
  
  input TicketTypeInput { name: String! price: Float! capacity: Int! }
  input CreateEventInput { title: String! description: String! date: String! location: String! capacity: Int imageUrl: String eventType: String ticketTypes: [TicketTypeInput] vendorIds: [ID] features: [String] }
  input VendorInput { name: String! category: String! cost: Float! contactInfo: String availableDates: [String] eventIds: [ID] }
  input PromoCodeInput { code: String! discountType: String! discountValue: Float! expiresAt: String! usageLimit: Int eventId: ID }
  
  type Query {
    me: User
    events(limit: Int, offset: Int): [Event!]!
    event(id: ID!): Event
    myEvents: [Event!]!
    myBookings: [Booking!]!
    vendors: [Vendor!]!
    vendor(id: ID!): Vendor
    myVendors: [Vendor!]!
    myAnalytics: AnalyticsStats!
    myNotifications: [Notification!]!
    unreadNotificationCount: Int!
    feedbackInfo(bookingId: ID!): PublicBookingFeedback!
    allUsers: [User!]!
    myPayouts: [Payout!]!
    allPayouts: [Payout!]!
    myBilling: BillingInfo!
    validatePromoCode(code: String!, eventId: ID!): PromoCode
    myPromoCodes: [PromoCode!]!
  }
  
  type Mutation {
    register(name: String!, email: String!, password: String!, role: String): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    createEvent(input: CreateEventInput!): Event!
    bookEvent(eventId: ID!, ticketType: String, amountPaid: Float, stripePaymentId: String, quantity: Int): Booking!
    cancelBooking(bookingId: ID!): Boolean!
    createCheckoutSession(eventId: ID!, ticketType: String!, quantity: Int!, promoCode: String): String!
    createPlanCheckoutSession(planId: String!): String!
    confirmPlanPurchase(sessionId: String!, planId: String!): AuthPayload!
    updateEvent(id: ID!, input: CreateEventInput!): Event!
    deleteEvent(id: ID!): Boolean!
    updateProfile(name: String, email: String, currentPassword: String, newPassword: String): User!
    createVendor(input: VendorInput!): Vendor!
    updateVendor(id: ID!, input: VendorInput!): Vendor!
    deleteVendor(id: ID!): Boolean!
    verifyTicket(bookingId: ID!): Booking!
    markNotificationAsRead(id: ID!): Notification!
    markAllNotificationsAsRead: Boolean!
    redeemReward(rewardId: String!, points: Int!): User!
    forgotPassword(email: String!): Boolean!
    resetPassword(token: String!, password: String!): Boolean!
    submitFeedback(bookingId: ID!, rating: Int!, comment: String): Feedback!
    logout: Boolean!
    requestPayout(amount: Float!): Payout!
    approvePayout(payoutId: ID!): Payout!
    updateBankDetails(accountHolderName: String!, accountNumber: String!, bankName: String!, ifscCode: String!): User!
    joinWaitlist(eventId: ID!): Boolean!
    createPromoCode(input: PromoCodeInput!): PromoCode!
    updatePromoCode(id: ID!, input: PromoCodeInput!): PromoCode!
    deletePromoCode(id: ID!): Boolean!
  }

  type Subscription {
    notificationAdded: Notification!
  }
`;
module.exports = typeDefs;
