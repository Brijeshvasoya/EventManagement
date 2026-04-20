const Booking = require('../../models/Booking');
const Event = require('../../models/Event');
const { requireAuth, requireRole } = require('../../utils/authGuard');

exports.getOrganizerAnalytics = async (user) => {
  requireRole(user, ['ORGANIZER', 'ADMIN']);
  const events = await Event.find({ organizer: user.id });
  const eventIds = events.map(e => e.id);
  const bookings = await Booking.find({ event: { $in: eventIds } });

  let totalRevenue = 0;
  let ticketsSold = 0;
  let cancelledTickets = 0;

  bookings.forEach(b => {
    if (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN') {
      ticketsSold += 1;
      totalRevenue += (b.amountPaid || 0);
    } else if (b.status === 'CANCELLED') {
      cancelledTickets += 1;
    }
  });

  return { totalRevenue, ticketsSold, cancelledTickets };
};
