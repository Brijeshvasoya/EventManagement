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
  let confirmedBookingsCount = 0;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyStats = months.reduce((acc, m) => {
    acc[m] = { n: m, c: 0, p: 0 };
    return acc;
  }, {});

  bookings.forEach(b => {
    const qty = b.quantity || 1;
    const date = new Date(parseInt(b.createdAt) || b.createdAt);
    const monthName = months[date.getMonth()];

    if ((b.status === 'CONFIRMED' || b.status === 'CHECKED_IN') && b.paymentStatus === 'PAID') {
      ticketsSold += qty;
      const revenue = b.amountPaid || 0;
      totalRevenue += revenue;
      confirmedBookingsCount += 1;

      // Update monthly breakdown
      if (monthlyStats[monthName]) {
        monthlyStats[monthName].c += revenue;
        monthlyStats[monthName].p += (revenue * 0.8); // 20% Profit margin as requested
      }
    } else if (b.status === 'CANCELLED') {
      cancelledTickets += qty;
    }
  });

  const monthlyData = months.map(m => monthlyStats[m]);

  return { totalRevenue, ticketsSold, cancelledTickets, confirmedBookingsCount, monthlyData };
};
