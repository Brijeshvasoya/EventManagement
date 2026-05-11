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
  let totalCheckedIn = 0;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyStats = months.reduce((acc, m) => {
    acc[m] = { n: m, c: 0, p: 0, t: 0 };
    return acc;
  }, {});

  bookings.forEach(b => {
    const qty = b.quantity || 1;
    const date = new Date(parseInt(b.createdAt) || b.createdAt);
    const monthName = months[date.getMonth()];

    if ((b.status === 'CONFIRMED' || b.status === 'CHECKED_IN') && b.paymentStatus === 'PAID') {
      ticketsSold += qty;
      totalCheckedIn += (b.checkedInCount || 0);
      const revenue = b.amountPaid || 0;
      totalRevenue += revenue;
      confirmedBookingsCount += 1;
      
      // Update monthly breakdown
      if (monthlyStats[monthName]) {
        monthlyStats[monthName].c += revenue;
        monthlyStats[monthName].p += (revenue * 0.8); // 20% Profit margin
        monthlyStats[monthName].t += qty;
      }
    } else if (b.status === 'CANCELLED') {
      cancelledTickets += qty;
    }
  });

  const monthlyData = months.map(m => monthlyStats[m]);

  return { totalRevenue, ticketsSold, cancelledTickets, confirmedBookingsCount, totalCheckedIn, monthlyData };
};

exports.getPromoterAnalytics = async (user, days = 30) => {
  if (!user) throw new Error('Unauthorized');
  const AffiliatePartnership = require('../../models/AffiliatePartnership');
  
  // 1. Get all partnerships for this promoter
  const partnerships = await AffiliatePartnership.find({ promoterId: user.id });
  const partnershipIds = partnerships.map(p => p._id);
  
  // Map partnership ID to commission percent for quick lookup
  const commissionMap = partnerships.reduce((acc, p) => {
    acc[p._id.toString()] = p.commissionPercent || 5;
    return acc;
  }, {});

  // 2. Get all bookings for these partnerships
  const bookings = await Booking.find({ 
    affiliatePartnershipId: { $in: partnershipIds },
    status: { $in: ['CONFIRMED', 'CHECKED_IN'] }
  }).sort({ createdAt: 1 });

  let totalEarnings = 0;
  let totalSales = bookings.length;
  const dailyMap = {};

  // Initialize last X days with 0
  const today = new Date();
  if (days === 1) {
    // Hourly data for 24H
    for (let i = 23; i >= 0; i--) {
      const d = new Date(today);
      d.setHours(today.getHours() - i, 0, 0, 0);
      const hourStr = d.toISOString().substring(0, 13); // YYYY-MM-DDTHH
      dailyMap[hourStr] = { date: hourStr, earnings: 0, sales: 0 };
    }
  } else {
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
      dailyMap[dateStr] = { date: dateStr, earnings: 0, sales: 0 };
    }
  }

  bookings.forEach(booking => {
    const commissionPercent = commissionMap[booking.affiliatePartnershipId.toString()] || 0;
    const earnings = (booking.amountPaid || 0) * (commissionPercent / 100);
    totalEarnings += earnings;

    const bDate = new Date(parseInt(booking.createdAt) || booking.createdAt);
    let dateStr;
    if (days === 1) {
      dateStr = bDate.toISOString().substring(0, 13); // YYYY-MM-DDTHH
    } else {
      dateStr = bDate.toISOString().split('T')[0];
    }
    
    if (dailyMap[dateStr]) {
      dailyMap[dateStr].earnings += parseFloat(earnings.toFixed(2));
      dailyMap[dateStr].sales += 1;
    }
  });

  return {
    totalEarnings: parseFloat(totalEarnings.toFixed(2)),
    totalSales,
    dailyData: Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date))
  };
};
