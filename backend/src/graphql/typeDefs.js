const typeDefs = `#graphql
  type User { id: ID! name: String! email: String! role: String! createdAt: String loyaltyPoints: Int averageRating: Float numReviews: Int redeemedRewards: [String] isPlanPurchased: Boolean planId: String totalWithdrawn: Float }
  type TicketType { name: String! price: Float! capacity: Int! }
  type Feedback { id: ID! booking: Booking! event: Event! organizer: User! user: User! rating: Int! comment: String createdAt: String! }
  type Event { id: ID! title: String! description: String! date: String! location: String! capacity: Int! imageUrl: String organizer: User! isBooked: Boolean eventType: String status: String ticketTypes: [TicketType] bookedCount: Int attendees: [Booking!] vendors: [Vendor!] }
  type Booking { id: ID! event: Event! user: User! status: String! createdAt: String! qrCode: String ticketType: String amountPaid: Float quantity: Int paymentStatus: String }
  type Vendor { id: ID! name: String! category: String! rating: Float cost: Float contactInfo: String availableDates: [String] organizer: User! events: [Event!] }
  type Notification { id: ID! recipient: User! title: String message: String! type: String! read: Boolean! booking: Booking event: Event createdAt: String! }
  type AuthPayload { token: String! user: User! }
  type MonthlyData { n: String! c: Float! p: Float! }
  type AnalyticsStats { totalRevenue: Float! ticketsSold: Int! cancelledTickets: Int! confirmedBookingsCount: Int! monthlyData: [MonthlyData!]! }
  type PublicBookingFeedback { id: ID! eventTitle: String! organizerName: String! status: String! existingRating: Int existingComment: String }
  type Payout { id: ID! organizer: User! amount: Float! status: String! createdAt: String! }
  
  input TicketTypeInput { name: String! price: Float! capacity: Int! }
  input CreateEventInput { title: String! description: String! date: String! location: String! capacity: Int imageUrl: String eventType: String ticketTypes: [TicketTypeInput] vendorIds: [ID] }
  input VendorInput { name: String! category: String! cost: Float! contactInfo: String availableDates: [String] eventIds: [ID] }
  
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
  }
  
  type Mutation {
    register(name: String!, email: String!, password: String!, role: String): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    createEvent(input: CreateEventInput!): Event!
    bookEvent(eventId: ID!, ticketType: String, amountPaid: Float, stripePaymentId: String, quantity: Int): Booking!
    cancelBooking(bookingId: ID!): Boolean!
    createCheckoutSession(eventId: ID!, ticketType: String!, quantity: Int!): String!
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
  }

  type Subscription {
    notificationAdded: Notification!
  }
`;
module.exports = typeDefs;
