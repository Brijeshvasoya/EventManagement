import { useContext, useState, useEffect } from 'react';
import Image from 'next/image';
import { GlobalActionsContext } from '../components/GlobalActions';
import { useQuery, useMutation, useSubscription } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { motion } from 'framer-motion';
import { GET_MY_BOOKINGS, GET_MY_ANALYTICS, GET_MY_EVENTS, GET_EVENTS, GET_MY_PROMO_CODES, CHECK_IN_SUBSCRIPTION } from '@/features/events/graphql/queries';
import { CANCEL_BOOKING, REDEEM_REWARD } from '@/features/events/graphql/mutations';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Spin, Card, Empty, Button, Tag, Divider, Modal, Popconfirm, Form, Input, Typography, Avatar, Drawer, Badge, List, Progress, Space, Select, DatePicker } from 'antd';
import { EnvironmentOutlined, CalendarOutlined, DownloadOutlined, QrcodeOutlined, CrownOutlined, CheckCircleFilled, UserOutlined, MailOutlined, SettingOutlined, AppstoreOutlined, ArrowRightOutlined, EyeOutlined, BellOutlined, CheckOutlined, RocketOutlined, PlusCircleOutlined, CloseCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import DigitalTicketModal from '@/features/events/components/DigitalTicketModal';
import dayjs from 'dayjs';
import { CreditCard, Sparkles } from 'lucide-react';
import LoadingScreen from '@/components/LoadingScreen';

const { Title, Text: AntText } = Typography;

// Animation Variants
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const hoverScale = {
  whileHover: { scale: 1.02, translateY: -5 },
  transition: { type: "spring", stiffness: 300 }
};

const GET_ALL_USERS = gql`
  query GetAllUsers {
    allUsers { id role isPlanPurchased planId }
  }
`;

export default function Dashboard() {
  const { user, loading: authLoading, setUser } = useAuth();
  const router = useRouter();

  const [activeBooking, setActiveBooking] = useState(null);
  const [isQRModalVisible, setIsQRModalVisible] = useState(false);
  const [isRewardsModalVisible, setIsRewardsModalVisible] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('Hosted');
  const [chartVersion, setChartVersion] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const { refetchGlobalNotifications } = useContext(GlobalActionsContext);

  const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const { data: bookingData, loading: bookingLoading, refetch } = useQuery(GET_MY_BOOKINGS, {
    fetchPolicy: 'cache-and-network'
  });

  const { data: myEventsData, loading: eventsLoading, refetch: refetchMyEvents } = useQuery(GET_MY_EVENTS, {
    skip: !isOrganizer, fetchPolicy: 'cache-and-network'
  });

  // Real-time Dashboard Updates
  useSubscription(CHECK_IN_SUBSCRIPTION, {
    variables: { eventId: "" }, // We can use a dummy or a specific logic, but better to refetch all on any check-in for organizer
    skip: !isOrganizer,
    onData: () => {
      refetchAnalytics();
      refetchMyEvents();
      toast.success('Live Update: Someone just checked in! ⚡', { icon: '🎫', duration: 2000 });
    }
  });

  const { data: analyticsData, refetch: refetchAnalytics } = useQuery(GET_MY_ANALYTICS, {
    skip: !user || user.role === 'USER' || isSuperAdmin, fetchPolicy: 'cache-and-network'
  });

  const { data: allEventsData } = useQuery(GET_EVENTS, {
    variables: { limit: 5 },
    skip: isOrganizer || isSuperAdmin,
    fetchPolicy: 'cache-and-network'
  });

  const { data: allUsersData } = useQuery(GET_ALL_USERS, {
    skip: !isSuperAdmin, fetchPolicy: 'network-only'
  });

  const { data: allEventsDashboardData } = useQuery(GET_EVENTS, {
    skip: !isSuperAdmin, fetchPolicy: 'network-only'
  });

  const [cancel] = useMutation(CANCEL_BOOKING);
  const [redeemReward, { loading: redeeming }] = useMutation(REDEEM_REWARD);

  const handleRedeem = async (reward) => {
    try {
      const { data } = await redeemReward({
        variables: { rewardId: reward.title, points: reward.pts }
      });
      setUser({ ...user, loyaltyPoints: data?.redeemReward?.loyaltyPoints, redeemedRewards: data?.redeemReward?.redeemedRewards });
      toast.success(`Succesfully redeemed ${reward?.title}! 🎁`);
      refetchGlobalNotifications();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (authLoading || bookingLoading) return <LoadingScreen message="Entering Dashboard..." />;
  if (!user) { router.push('/login'); return null; }

  const handleCancel = async (id) => {
    try {
      await cancel({ variables: { id } });
      toast.success('Ticket cancelled successfully');
      refetch();
      refetchGlobalNotifications?.();
    } catch (e) { toast.error(e.message); }
  };

  const downloadTicket = async (booking) => {
    const ticketId = `ticket-rich-template-${booking.id}`;
    const element = document.getElementById(ticketId);
    if (!element) return;

    try {
      toast.loading('Crafting your premium PDF ticket...', { id: 'pdf-gen' });
      const canvas = await html2canvas(element, { scale: 3, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`VIP_Ticket_${booking?.event?.title?.replace(/\s+/g, '_')}.pdf`);
      toast.success('Official Ticket Saved! 🎉', { id: 'pdf-gen' });
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate PDF ticket.', { id: 'pdf-gen' });
    }
  };
  const downloadQRCode = async (qrCodeUrl, eventTitle) => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QR_${eventTitle?.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('QR Code downloaded! 📲');
    } catch (e) {
      toast.error('Failed to download QR code');
    }
  };

  const showBigQR = (booking) => {
    setActiveBooking(booking);
    setIsQRModalVisible(true);
  };

  const bookings = bookingData?.myBookings || [];
  const now = new Date();

  if (isSuperAdmin) {
    const events = allEventsDashboardData?.events || [];
    const users = allUsersData?.allUsers || [];

    let organizerRevenue = 0;
    let totalTicketsSold = 0;

    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyMap = {};
    monthOrder.forEach(m => { monthlyMap[m] = 0; });

    const eventsWithRev = events.map(e => {
      let eventRev = 0;
      let eventTickets = 0;
      e.attendees?.forEach(att => {
        if (att.status !== 'CANCELLED') {
          const date = new Date(isNaN(Number(att.createdAt)) ? att.createdAt : Number(att.createdAt));
          if (date.getFullYear() === selectedYear) {
            const amt = (att.amountPaid || 0);
            eventRev += amt;
            eventTickets += (att.quantity || 1);

            const monthKey = date.toLocaleString('default', { month: 'short' });
            monthlyMap[monthKey] += amt;
          }
        }
      });
      return { title: e.title, revenue: eventRev, tickets: eventTickets };
    });

    organizerRevenue = eventsWithRev.reduce((acc, curr) => acc + curr.revenue, 0);
    totalTicketsSold = eventsWithRev.reduce((acc, curr) => acc + curr.tickets, 0);

    let platformPlanRevenue = 0;
    users.forEach(u => {
      if (u.role === 'ORGANIZER' && u.isPlanPurchased) {
        if (u.planId === 'BASIC') platformPlanRevenue += 799;
        if (u.planId === 'PRO') platformPlanRevenue += 2499;
      }
    });

    const monthlyDataArray = monthOrder.map(m => ({ name: m, Revenue: monthlyMap[m] }));
    const topEvents = (eventsWithRev || []).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    const totalUsers = (users || []).filter(u => u.role === 'USER').length;
    const totalOrganizers = (users || []).filter(u => u.role === 'ORGANIZER').length;

    return (
      <>
        <Head><title>Super Admin Dashboard | EventHub</title></Head>
        <motion.div
          initial="initial"
          animate="animate"
          variants={staggerContainer}
          style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '32px' }}
        >
          <motion.div
            variants={fadeInUp}
            className="header-responsive"
            style={{ marginBottom: '32px', background: 'linear-gradient(135deg, #1B2A4E 0%, #312E81 50%, #4338CA 100%)', borderRadius: '32px', color: 'white', padding: '32px', boxShadow: '0 20px 40px rgba(49, 46, 129, 0.2)' }}
          >
            <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>Platform Dashboard</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', margin: '4px 0 0 0', fontSize: '1rem' }}>Welcome back, Super Admin. Here is the platform overview.</p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}
          >
            {[
              { label: 'Platform Revenue', val: `₹${Number(platformPlanRevenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: '💳', bg: 'rgba(99, 102, 241, 0.1)' },
              { label: 'Organizer Revenue', val: `₹${Number(organizerRevenue).toLocaleString()}`, icon: '💰', bg: 'rgba(16, 185, 129, 0.1)' },
              { label: 'Tickets Sold', val: totalTicketsSold.toLocaleString(), icon: '🎟️', bg: 'rgba(59, 130, 246, 0.1)' },
              { label: 'Total Users', val: totalUsers.toLocaleString(), icon: '👥', bg: 'rgba(139, 92, 246, 0.1)' },
              { label: 'Organizers', val: totalOrganizers.toLocaleString(), icon: '🏢', bg: 'rgba(245, 158, 11, 0.1)' }
            ].map((stat, i) => (
              <motion.div key={i} variants={fadeInUp} whileHover={hoverScale.whileHover}>
                <Card variant="borderless" style={{ borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', height: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '24px' }}>{stat.icon}</span>
                    </div>
                    <div>
                      <div style={{ color: '#6B7280', fontSize: '0.85rem', fontWeight: 600 }}>{stat.label}</div>
                      <div style={{ color: '#1B2A4E', fontSize: '1.6rem', fontWeight: 800 }}>{stat.val}</div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            variants={fadeInUp}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}
          >
            <Card
              title={<span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1B2A4E' }}>Revenue Growth</span>}
              extra={
                <DatePicker
                  picker="year"
                  value={dayjs().year(selectedYear)}
                  onChange={(date) => date && setSelectedYear(date.year())}
                  allowClear={false}
                  style={{
                    width: 100,
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    fontWeight: 700,
                    color: '#1B2A4E',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}
                  size="small"
                  suffixIcon={<CalendarOutlined style={{ color: '#4338CA' }} />}
                />
              }
              bordered={false}
              style={{ borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
            >
              <div style={{ width: '100%', height: 300, minWidth: 0, overflow: 'hidden', position: 'relative' }}>
                {monthlyDataArray.length > 0 && isMounted ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyDataArray}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dx={-10} tickFormatter={(val) => `₹${val}`} />
                      <Tooltip cursor={{ fill: '#F8FAFB' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="Revenue" fill="#4338CA" radius={[6, 6, 0, 0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="No revenue data available" style={{ marginTop: '50px' }} />
                )}
              </div>
            </Card>

            <Card title={<span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1B2A4E' }}>Top Performing Events</span>} bordered={false} style={{ borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }} styles={{ body: { padding: '0 24px 24px 24px' } }}>
              <List
                dataSource={topEvents}
                renderItem={(item, i) => (
                  <List.Item style={{ padding: '16px 0', borderBottom: i === topEvents.length - 1 ? 'none' : '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#F8FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#4338CA' }}>
                          #{i + 1}
                        </div>
                        <div style={{ fontWeight: 700, color: '#1B2A4E', fontSize: '1.05rem' }}>{item.title}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, color: '#10B981', fontSize: '1.1rem' }}>₹{item.revenue.toLocaleString()}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6B7280', fontWeight: 600 }}>{item.tickets} tickets</div>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            </Card>
          </motion.div>
        </motion.div>
      </>
    );
  }

  return (
    <>
      <Head><title>Dashboard | EventHub</title></Head>
      <motion.div
        initial="initial"
        animate="animate"
        variants={staggerContainer}
        style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '32px' }}
      >
        {/* Digital Ticket Modal */}
        <DigitalTicketModal
          open={isQRModalVisible}
          onCancel={() => setIsQRModalVisible(false)}
          booking={activeBooking}
          onCancelTicket={handleCancel}
        />

        {/* EXPLORE REWARDS MODAL */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '10px', color: '#F59E0B', display: 'flex' }}>
                <CrownOutlined />
              </div>
              <span style={{ fontWeight: 800 }}>Explore Your Rewards</span>
            </div>
          }
          open={isRewardsModalVisible}
          onCancel={() => setIsRewardsModalVisible(false)}
          footer={null}
          centered
          width={540}
          styles={{ body: { padding: '24px' } }}
        >
          <div style={{ textAlign: 'center', marginBottom: '32px', background: 'linear-gradient(135deg, #FFF 0%, #F8FAFB 100%)', padding: '24px', borderRadius: '24px', border: '1px solid #F1F5F9' }}>
            <div style={{ color: '#6B7280', fontSize: '0.9rem', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Current Balance</div>
            <div style={{ color: '#1B2A4E', fontSize: '3rem', fontWeight: 900, lineHeight: 1 }}>{user?.loyaltyPoints || 0} <span style={{ fontSize: '1rem', color: '#6B7280' }}>Pts</span></div>
            <div style={{ marginTop: '16px' }}>
              <Progress
                percent={Math.min(100, Math.round(((user?.loyaltyPoints || 0) / 5000) * 100))}
                strokeColor={{ '0%': '#F59E0B', '100%': '#D97706' }}
                showInfo={false}
                strokeWidth={10}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', color: '#6B7280', fontSize: '0.8rem', fontWeight: 600 }}>
                <span>Bronze</span>
                <span>Elite (5,000 Pts)</span>
              </div>
            </div>
          </div>

          <h4 style={{ color: '#1B2A4E', fontWeight: 800, marginBottom: '16px', fontSize: '1.1rem' }}>Available Perks</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { pts: 500, title: 'Event Discount', desc: 'Get 5% off on any ticket booking', icon: '🎫' },
              { pts: 1000, title: 'Early Access', desc: 'Book tickets 24h before public sale', icon: '⏰' },
              { pts: 2500, title: 'VIP Lounge', desc: 'Complementary access to event lounges', icon: '🍸' },
              { pts: 5000, title: 'Platinum Pass', desc: 'One free ticket to any premium event', icon: '✨' }
            ].map((reward, i) => {
              const isUnlocked = (user?.loyaltyPoints || 0) >= (reward?.pts || 0);
              const isRedeemed = user?.redeemedRewards?.includes(reward?.title);
              return (
                <motion.div
                  key={i}
                  variants={fadeInUp}
                  whileHover={isUnlocked ? hoverScale.whileHover : {}}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    borderRadius: '16px',
                    background: isUnlocked ? 'white' : '#F9FAFB',
                    border: '1px solid',
                    borderColor: isUnlocked ? (isRedeemed ? '#10B981' : '#E5E7EB') : '#F1F5F9',
                    opacity: isUnlocked ? 1 : 0.7,
                    transition: 'all 0.3s ease',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '12px',
                    background: isRedeemed ? 'rgba(16, 185, 129, 0.1)' : (isUnlocked ? 'rgba(131, 56, 236, 0.1)' : '#F3F4F6'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
                  }}>
                    {isRedeemed ? '✅' : reward.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: '#1B2A4E' }}>{reward.title}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isRedeemed ? '#10B981' : (isUnlocked ? '#8338EC' : '#94A3B8') }}>
                        {isRedeemed ? 'REDEEMED' : (isUnlocked ? 'READY TO CLAIM' : `${reward.pts} PTS`)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>{reward.desc}</div>
                  </div>
                  {isUnlocked && !isRedeemed && (
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => handleRedeem(reward)}
                      loading={redeeming}
                      style={{ borderRadius: '8px', background: '#8338EC', border: 'none', fontWeight: 600 }}
                    >
                      Redeem
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>

          <Button
            type="primary"
            block
            size="large"
            style={{ marginTop: '24px', height: '50px', borderRadius: '12px', background: '#1B2A4E', fontWeight: 700 }}
            onClick={() => setIsRewardsModalVisible(false)}
          >
            Got it, thanks!
          </Button>
        </Modal>


        {/* EVENTHUB HEADER */}
        <div className="header-responsive" style={{ background: 'linear-gradient(135deg, #1B2A4E 0%, #312E81 50%, #4338CA 100%)', borderRadius: '24px', boxShadow: '0 20px 40px rgba(49, 46, 129, 0.2)', color: 'white' }}>
          <div>
            <h2 style={{ margin: '0 0 8px 0', fontWeight: 900, fontSize: '2.5rem', letterSpacing: '-0.5px' }}>Dashboard</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem' }}>Hello {user?.name}, welcome back!</p>
          </div>
        </div>

        {isOrganizer ? (() => {
          const upcomingEvents = (myEventsData?.myEvents?.filter(e => new Date(isNaN(Number(e.date)) ? e.date : Number(e.date)) >= now) || [])
            .sort((a, b) => new Date(isNaN(Number(a.date)) ? a.date : Number(a.date)) - new Date(isNaN(Number(b.date)) ? b.date : Number(b.date)));
          // Dynamic calculations from DB
          const totalCapacity = myEventsData?.myEvents?.reduce((acc, ev) => acc + (ev.capacity || 0), 0) || 0;
          const ticketsSold = analyticsData?.myAnalytics?.ticketsSold || 0;
          const totalRevenue = analyticsData?.myAnalytics?.totalRevenue || 0;
          const percentSold = totalCapacity > 0 ? Math.min(100, Math.round((ticketsSold / totalCapacity) * 100)) : 0;
          const remaining = Math.max(0, totalCapacity - ticketsSold);
          const percentRemaining = totalCapacity > 0 ? (100 - percentSold) : 0;

          // Calculate dynamic popular event categories
          const catCount = {};
          const targetEvents = categoryFilter === 'Hosted'
            ? (myEventsData?.myEvents || [])
            : (bookingData?.myBookings?.map(b => b.event) || []);
          const totalEvents = targetEvents.length || 1;
          targetEvents.forEach(e => {
            const cat = e?.eventType || 'General';
            catCount[cat] = (catCount[cat] || 0) + 1;
          });
          const sortedCats = Object.entries(catCount).sort((a, b) => b[1] - a[1]);
          const topCat1 = sortedCats[0] || ['N/A', 0];
          const topCat2 = sortedCats[1] || ['N/A', 0];

          return (
            <div className="grid-cols-main" style={{ gap: '24px' }}>
              {/* LEFT COLUMN: Main Dashboard Content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* TOP KPI CARDS ROW */}
                <motion.div
                  variants={staggerContainer}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '24px'
                  }}
                >
                  {[
                    { label: 'Upcoming Events', val: upcomingEvents.length, icon: '📅', color: 'rgb(67, 56, 202)', bg: 'rgba(67, 56, 202, 0.1)' },
                    {
                      label: 'Total Checked In',
                      val: analyticsData?.myAnalytics?.totalCheckedIn || 0,
                      suffix: `/ ${ticketsSold}`,
                      icon: '⚡',
                      color: '#10B981',
                      bg: 'rgba(16, 185, 129, 0.1)',
                      extra: (
                        <Progress
                          percent={Math.round(((analyticsData?.myAnalytics?.totalCheckedIn || 0) / (ticketsSold || 1)) * 100)}
                          size="small"
                          showInfo={false}
                          strokeColor="#10B981"
                          style={{ marginTop: '8px', width: '100%' }}
                        />
                      )
                    },
                    { label: 'Tickets Sold', val: ticketsSold, icon: '🎟️', color: 'rgb(67, 56, 202)', bg: 'rgba(67, 56, 202, 0.1)' },
                    { label: 'Global Rating', val: user?.averageRating?.toFixed(1) || '0.0', icon: '⭐', color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.1)' }
                  ].map((kpi, i) => (
                    <motion.div key={i} variants={fadeInUp} whileHover={hoverScale.whileHover}>
                      <Card styles={{ body: { padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' } }} style={{ borderRadius: '20px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', height: '100%' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: kpi.bg, color: kpi.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>{kpi.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#6B7280', fontSize: '0.9rem', fontWeight: 600, marginBottom: '4px' }}>{kpi.label}</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                            <div style={{ color: '#1B2A4E', fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>{kpi.val}</div>
                            {kpi.suffix && <div style={{ color: '#9CA3AF', fontSize: '1rem', fontWeight: 600 }}>{kpi.suffix}</div>}
                          </div>
                          {kpi.extra}
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>

                {/* GRAPHS ROW: Ticket Sales (Doughnut) & Sales Revenue (Bar) */}
                <motion.div
                  variants={fadeInUp}
                  className="grid-cols-reverse"
                  style={{ gap: '24px' }}
                  onViewportEnter={() => setChartVersion(v => v + 1)}
                  viewport={{ once: false, amount: 0.3 }}
                >
                  <Card styles={{ body: { padding: '24px' } }} style={{ borderRadius: '24px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ margin: 0, color: '#1B2A4E', fontWeight: 800, fontSize: '1.1rem' }}>Ticket Sales</h3>
                      <Tag style={{ borderRadius: '100px', border: 'none', background: '#F3F4F6', color: '#4B5563', padding: '4px 12px', fontWeight: 600 }}>All Time</Tag>
                    </div>
                    <div style={{ position: 'relative', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                      <div style={{ width: '200px', height: '200px', borderRadius: '50%', background: `conic-gradient(#1B2A4E 0% ${percentSold}%, #E5E7EB ${percentSold}% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '160px', height: '160px', borderRadius: '50%', background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ color: '#6B7280', fontSize: '0.8rem', fontWeight: 600 }}>Total Capacity</div>
                          <div style={{ color: '#1B2A4E', fontSize: '1.6rem', fontWeight: 800 }}>{totalCapacity}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#1B2A4E' }} />
                          <span style={{ color: '#1B2A4E', fontWeight: 600 }}>Sold</span>
                        </div>
                        <div><span style={{ fontWeight: 800, marginRight: '16px', color: '#1B2A4E' }}>{ticketsSold}</span> <span style={{ color: '#6B7280' }}>{percentSold}%</span></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#E5E7EB' }} />
                          <span style={{ color: '#1B2A4E', fontWeight: 600 }}>Available</span>
                        </div>
                        <div><span style={{ fontWeight: 800, marginRight: '16px', color: '#1B2A4E' }}>{remaining}</span> <span style={{ color: '#6B7280' }}>{percentRemaining}%</span></div>
                      </div>
                    </div>
                  </Card>

                  <Card
                    styles={{ body: { padding: '24px' } }}
                    style={{ borderRadius: '24px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}
                    title={<h3 style={{ margin: 0, color: '#1B2A4E', fontWeight: 800, fontSize: '1.1rem' }}>Sales Revenue</h3>}
                    extra={
                      <DatePicker
                        picker="year"
                        value={dayjs().year(selectedYear)}
                        onChange={(date) => date && setSelectedYear(date.year())}
                        allowClear={false}
                        style={{
                          width: 100,
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '10px',
                          fontWeight: 700,
                          color: '#1B2A4E',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                        size="small"
                        suffixIcon={<CalendarOutlined style={{ color: '#4338CA' }} />}
                      />
                    }
                  >
                    <div style={{ marginBottom: '24px' }}>
                      <div style={{ color: '#6B7280', fontSize: '0.85rem', fontWeight: 600 }}>Total Revenue</div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
                        <div style={{ color: '#1B2A4E', fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>₹{Number(totalRevenue).toLocaleString()}</div>
                        <div style={{ color: '#10B981', background: '#D1FAE5', padding: '2px 8px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>Active</div>
                      </div>
                    </div>
                    <div style={{ width: '100%', height: 220, minWidth: 0, overflow: 'hidden', position: 'relative' }}>
                      {isMounted && (
                        <ResponsiveContainer width="100%" height={220} debounce={100}>
                          <BarChart key={`${chartVersion}-${selectedYear}`} data={
                            (() => {
                              const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                              const yearlyMap = {};
                              monthOrder.forEach(m => yearlyMap[m] = 0);

                              myEventsData?.myEvents?.forEach(ev => {
                                ev.attendees?.forEach(att => {
                                  if (att.status !== 'CANCELLED') {
                                    const date = new Date(isNaN(Number(att.createdAt)) ? att.createdAt : Number(att.createdAt));
                                    if (date.getFullYear() === selectedYear) {
                                      const monthKey = date.toLocaleString('default', { month: 'short' });
                                      yearlyMap[monthKey] += (att.amountPaid || 0);
                                    }
                                  }
                                });
                              });

                              return monthOrder.map(m => ({ n: m, c: yearlyMap[m] }));
                            })()
                          }>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="n" stroke="#9CA3AF" axisLine={false} tickLine={false} fontSize={12} dy={10} />
                            <YAxis stroke="#9CA3AF" axisLine={false} tickLine={false} fontSize={12} tickFormatter={(v) => `${(v / 1000)}k`} />
                            <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                            <Bar
                              dataKey="c"
                              fill="rgb(67, 56, 202)"
                              radius={[6, 6, 6, 6]}
                              barSize={12}
                              name="Total Revenue (₹)"
                              animationDuration={1500}
                              animationEasing="ease-out"
                            />
                            <Bar
                              dataKey="t"
                              fill="rgb(67, 56, 202)"
                              radius={[6, 6, 6, 6]}
                              barSize={12}
                              name="Tickets Sold"
                              animationBegin={300}
                              animationDuration={1500}
                              animationEasing="ease-out"
                            />


                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </Card>

                  {/* TICKET TYPE DISTRIBUTION PIE CHART */}
                  <Card styles={{ body: { padding: '24px' } }} style={{ borderRadius: '24px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ margin: 0, color: '#1B2A4E', fontWeight: 800, fontSize: '1.1rem' }}>Ticket Type Distribution</h3>
                    </div>
                    <div style={{ height: '220px', width: '100%' }}>
                      {(() => {
                        const distribution = {};
                        myEventsData?.myEvents?.forEach(ev => {
                          ev.attendees?.forEach(att => {
                            if (att.status !== 'CANCELLED') {
                              distribution[att.ticketType] = (distribution[att.ticketType] || 0) + att.quantity;
                            }
                          });
                        });
                        const pieData = Object.entries(distribution).map(([name, value]) => ({ name, value }));
                        const COLORS = ['#8338EC', '#3A86FF', '#FB5607', '#FF006E', '#FFBE0B'];

                        return pieData.length > 0 && isMounted ? (
                          <div style={{ width: '100%', height: 220, minWidth: 0, overflow: 'hidden', position: 'relative' }}>
                            <ResponsiveContainer width="100%" height={220}>
                              <PieChart key={chartVersion}>
                                <Pie
                                  data={pieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={40}
                                  outerRadius={60}
                                  fill="#8884d8"
                                  paddingAngle={5}
                                  dataKey="value"
                                >
                                  {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <Empty description="No ticket sales data" style={{ marginTop: '20px' }} />
                        );
                      })()}
                    </div>
                  </Card>
                </motion.div>

                {/* POPULAR EVENTS PROGRESS BARS */}
                <motion.div variants={fadeInUp}>
                  <Card styles={{ body: { padding: '24px' } }} style={{ borderRadius: '24px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                      <h3 style={{ margin: 0, color: '#1B2A4E', fontWeight: 800, fontSize: '1.1rem' }}>Event Category Breakdown</h3>
                      <Select
                        value={categoryFilter}
                        onChange={setCategoryFilter}
                        variant="borderless"
                        style={{ background: '#F3F4F6', borderRadius: '100px', fontWeight: 600, minWidth: '100px' }}
                        styles={{ popup: { root: { borderRadius: '12px' } } }}
                        options={[
                          { value: 'Hosted', label: 'Hosted' },
                          { value: 'Attended', label: 'Attended' }
                        ]}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#1B2A4E' }}>
                          <span style={{ textTransform: 'capitalize' }}>{topCat1[0]}</span>
                          <span><span style={{ color: 'rgb(67, 56, 202)', marginRight: '32px' }}>{Math.round((topCat1[1] / totalEvents) * 100)}%</span> {topCat1[1]} Events</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#F3F4F6', borderRadius: '100px' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${Math.round((topCat1[1] / totalEvents) * 100)}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            style={{ height: '100%', background: 'linear-gradient(135deg, rgb(49, 46, 129) 0%, rgb(67, 56, 202) 100%)', borderRadius: '100px' }}
                          />
                        </div>
                      </div>
                      {topCat2[1] > 0 && (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#1B2A4E' }}>
                            <span style={{ textTransform: 'capitalize' }}>{topCat2[0]}</span>
                            <span><span style={{ color: 'rgb(67, 56, 202)', marginRight: '32px' }}>{Math.round((topCat2[1] / totalEvents) * 100)}%</span> {topCat2[1]} Events</span>
                          </div>
                          <div style={{ width: '100%', height: '8px', background: '#F3F4F6', borderRadius: '100px' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              whileInView={{ width: `${Math.round((topCat2[1] / totalEvents) * 100)}%` }}
                              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                              style={{ height: '100%', background: 'linear-gradient(135deg, rgb(49, 46, 129) 0%, rgb(67, 56, 202) 100%)', borderRadius: '100px' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>

                {/* ALL EVENTS ROW */}
                <motion.div variants={fadeInUp} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                  <h3 style={{ margin: 0, color: '#1B2A4E', fontWeight: 800, fontSize: '1.2rem' }}>My Events</h3>
                  <div style={{ color: '#6B7280', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }} onClick={() => router.push('/my-events')}>View All Event</div>
                </motion.div>
                <motion.div
                  variants={staggerContainer}
                  className="grid-cols-auto-320"
                  style={{ gap: '20px' }}
                >
                  {myEventsData?.myEvents?.slice(0, 3).map(e => (
                    <motion.div
                      key={e.id}
                      variants={fadeInUp}
                      whileHover={hoverScale.whileHover}
                      className="hover-bounce"
                      style={{ background: '#FFF', cursor: 'pointer', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', padding: '16px' }}
                      onClick={() => { router.push(`/events/${e.id}`) }}
                    >
                      <div style={{ position: 'relative', height: '140px', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px', background: `url(${e.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87'}) center/cover` }}>
                        <Tag style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(255,255,255,0.9)', color: '#1B2A4E', border: 'none', borderRadius: '100px', fontWeight: 700, padding: '4px 12px', textTransform: 'capitalize' }}>{e.category || 'Event'}</Tag>
                        {e.status === 'COMPLETED' && (
                          <Tag style={{ position: 'absolute', top: '12px', right: '12px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: '100px', fontWeight: 700, padding: '4px 12px' }}>Completed</Tag>
                        )}
                        {e.status === 'CANCELLED' && (
                          <Tag style={{ position: 'absolute', top: '12px', right: '12px', background: '#EF4444', color: 'white', border: 'none', borderRadius: '100px', fontWeight: 700, padding: '4px 12px' }}>Cancelled</Tag>
                        )}
                      </div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800, color: '#1B2A4E' }}>{e.title}</h4>
                      <div style={{ color: '#6B7280', fontSize: '0.85rem', marginBottom: '16px' }}>{e.location}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CalendarOutlined /> {new Date(isNaN(Number(e.date)) ? e.date : Number(e.date)).toLocaleDateString()}</div>
                        <div style={{ color: 'rgb(67, 56, 202)', fontWeight: 800, fontSize: '1rem' }}>₹{Number(e.ticketTypes?.[0]?.price || 30).toLocaleString()}</div>
                      </div>
                    </motion.div>
                  ))}
                  {(!myEventsData || myEventsData?.myEvents.length === 0) && (
                    <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', background: '#FFF', borderRadius: '24px', color: '#6B7280' }}>
                      No hosted events to display yet.
                    </div>
                  )}
                </motion.div>

              </div>

              {/* RIGHT COLUMN: Upcoming Event & Activity */}
              <motion.div variants={staggerContainer} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <motion.div variants={fadeInUp} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, color: '#1B2A4E', fontWeight: 800, fontSize: '1.2rem' }}>Upcoming Event</h3>
                </motion.div>

                {upcomingEvents[0] ? (
                  <>
                    <motion.div variants={fadeInUp} whileHover={hoverScale.whileHover}>
                      <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: '24px', border: 'none', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                        <div style={{ height: '200px', background: `url(${upcomingEvents[0].imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87'}) center/cover`, position: 'relative' }}>
                          <Tag style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(255,255,255,0.9)', color: '#1B2A4E', border: 'none', borderRadius: '100px', fontWeight: 700, padding: '6px 16px' }}>Most Anticipated</Tag>
                        </div>
                        <div style={{ padding: '24px' }}>
                          <h3 style={{ margin: '0 0 8px 0', color: '#1B2A4E', fontSize: '1.4rem', fontWeight: 800 }}>{upcomingEvents[0].title}</h3>
                          <div style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '20px' }}>{upcomingEvents[0].location}</div>
                          <p style={{ color: '#6B7280', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '24px' }}>{upcomingEvents[0].description ? upcomingEvents[0].description.substring(0, 80) + '...' : 'Immerse yourself in electrifying performances by top artists and enjoy the festival.'}</p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1B2A4E', fontWeight: 600, fontSize: '0.9rem', background: '#F3F4F6', padding: '8px 16px', borderRadius: '12px' }}>
                              <CalendarOutlined />
                              <span>{new Date(isNaN(Number(upcomingEvents[0].date)) ? upcomingEvents[0].date : Number(upcomingEvents[0].date)).toLocaleDateString()}</span>
                            </div>
                            <Button type="primary" onClick={() => router.push(`/events/${upcomingEvents[0].id}`)} style={{ background: 'linear-gradient(135deg, rgb(49, 46, 129) 0%, rgb(67, 56, 202) 100%)', borderRadius: '100px', padding: '0 24px', fontWeight: 700, height: '40px', border: 'none', boxShadow: '0 4px 12px rgba(49, 46, 129, 0.3)' }}>View Details</Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                    {upcomingEvents[1] && (
                      <motion.div variants={fadeInUp} whileHover={hoverScale.whileHover}>
                        <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: '24px', border: 'none', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                          <div style={{ height: '200px', background: `url(${upcomingEvents[1]?.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87'}) center/cover`, position: 'relative' }}>
                            <Tag style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(255,255,255,0.9)', color: '#1B2A4E', border: 'none', borderRadius: '100px', fontWeight: 700, padding: '6px 16px' }}>Most Anticipated</Tag>
                          </div>
                          <div style={{ padding: '24px' }}>
                            <h3 style={{ margin: '0 0 8px 0', color: '#1B2A4E', fontSize: '1.4rem', fontWeight: 800 }}>{upcomingEvents[1]?.title}</h3>
                            <div style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '20px' }}>{upcomingEvents[1]?.location}</div>
                            <p style={{ color: '#6B7280', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '24px' }}>{upcomingEvents[1]?.description ? upcomingEvents[1]?.description.substring(0, 80) + '...' : 'Immerse yourself in electrifying performances by top artists and enjoy the festival.'}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1B2A4E', fontWeight: 600, fontSize: '0.9rem', background: '#F3F4F6', padding: '8px 16px', borderRadius: '12px' }}>
                                <CalendarOutlined />
                                <span>{new Date(isNaN(Number(upcomingEvents[1]?.date)) ? upcomingEvents[1]?.date : Number(upcomingEvents[1]?.date)).toLocaleDateString()}</span>
                              </div>
                              <Button type="primary" onClick={() => router.push(`/events/${upcomingEvents[1]?.id}`)} style={{ background: 'linear-gradient(135deg, rgb(49, 46, 129) 0%, rgb(67, 56, 202) 100%)', borderRadius: '100px', padding: '0 24px', fontWeight: 700, height: '40px', border: 'none', boxShadow: '0 4px 12px rgba(49, 46, 129, 0.3)' }}>View Details</Button>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    )}
                  </>
                ) : (
                  <motion.div variants={fadeInUp}>
                    <Card
                      styles={{ body: { padding: '48px 24px', textAlign: 'center' } }}
                      style={{
                        borderRadius: '32px',
                        border: '1px dashed #E2E8F0',
                        background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                        boxShadow: 'none'
                      }}
                    >
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '20px',
                        background: 'white',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        marginBottom: '24px',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)'
                      }}>
                        ✨
                      </div>
                      <Title level={4} style={{ color: '#1B2A4E', fontWeight: 800, marginBottom: '8px' }}>Launch Your Next Event</Title>
                      <AntText style={{ color: '#64748B', display: 'block', marginBottom: '32px', fontSize: '1rem' }}>
                        You don&apos;t have any upcoming events scheduled. Create one now to start selling tickets!
                      </AntText>
                      <Button
                        type="primary"
                        size="large"
                        icon={<PlusCircleOutlined />}
                        onClick={() => router.push('/events/create')}
                        style={{
                          background: 'linear-gradient(135deg, rgb(49, 46, 129) 0%, rgb(67, 56, 202) 100%)',
                          borderRadius: '14px',
                          height: '54px',
                          padding: '0 32px',
                          fontWeight: 700,
                          border: 'none',
                          boxShadow: '0 10px 15px -3px rgba(49, 46, 129, 0.3)'
                        }}
                      >
                        Create Event Now
                      </Button>
                    </Card>
                  </motion.div>
                )}
              </motion.div>
            </div>
          );
        })() : (() => {
          const activeBookings = bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING' || b.status === 'CHECKED_IN');
          const upcomingBookings = activeBookings
            .filter(b => b.event && new Date(isNaN(Number(b.event.date)) ? b.event.date : Number(b.event.date)) >= now)
            .sort((a, b) => new Date(isNaN(Number(a.event.date)) ? a.event.date : Number(a.event.date)) - new Date(isNaN(Number(b.event.date)) ? b.event.date : Number(b.event.date)));
          const featuredBooking = upcomingBookings[0];
          const totalSpent = activeBookings.filter(b => b.status === 'CONFIRMED' || b.status === 'CHECKED_IN').reduce((acc, b) => acc + (b.amountPaid || 0), 0);

          // Calculate category preference for doughnut chart
          const catCount = {};
          activeBookings.forEach(b => {
            const cat = b.event?.eventType || 'General';
            catCount[cat] = (catCount[cat] || 0) + 1;
          });
          const totalBookingsCount = activeBookings.length;
          const sortedCats = Object.entries(catCount).sort((a, b) => b[1] - a[1]);
          const topCat = sortedCats[0] || ['Start Exploring', 0];
          const topCatPercent = totalBookingsCount > 0 ? Math.round((topCat[1] / totalBookingsCount) * 100) : 0;

          // DYNAMIC BOOKING TRENDS (Full Year)
          const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const yearlyBookings = monthOrder.map(m => {
            const count = activeBookings.filter(b => {
              const bDate = new Date(isNaN(Number(b.createdAt)) ? b.createdAt : Number(b.createdAt));
              return bDate.toLocaleString('default', { month: 'short' }) === m && bDate.getFullYear() === selectedYear;
            }).length;
            return { name: m, "Total Tickets": count };
          });

          return (
            <div className="grid-cols-main" style={{ gap: '24px' }}>

              {/* LEFT COLUMN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* KPI CARDS */}
                <div className="grid-cols-3" style={{ gap: '24px' }}>
                  <Card styles={{ body: { padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' } }} style={{ borderRadius: '20px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(67, 56, 202, 0.1)', color: 'rgb(67, 56, 202)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🗓️</div>
                    <div>
                      <div style={{ color: '#6B7280', fontSize: '0.9rem', fontWeight: 600, marginBottom: '4px' }}>Upcoming</div>
                      <div style={{ color: '#1B2A4E', fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>{upcomingBookings.length}</div>
                    </div>
                  </Card>

                  <Card styles={{ body: { padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' } }} style={{ borderRadius: '20px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🎟️</div>
                    <div>
                      <div style={{ color: '#6B7280', fontSize: '0.9rem', fontWeight: 600, marginBottom: '4px' }}>Total Passes</div>
                      <div style={{ color: '#1B2A4E', fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>{activeBookings.length}</div>
                    </div>
                  </Card>

                  <Card styles={{ body: { padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' } }} style={{ borderRadius: '20px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>💎</div>
                    <div>
                      <div style={{ color: '#6B7280', fontSize: '0.9rem', fontWeight: 600, marginBottom: '4px' }}>Loyalty Pts</div>
                      <div style={{ color: '#1B2A4E', fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>{user?.loyaltyPoints || 0}</div>
                    </div>
                  </Card>
                </div>

                {/* CHARTS ROW */}
                <div className="grid-cols-reverse" style={{ gap: '24px' }}>
                  <Card styles={{ body: { padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' } }} style={{ borderRadius: '24px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ margin: '0 0 20px 0', color: '#1B2A4E', fontWeight: 800, fontSize: '1.1rem' }}>Interest Split</h3>
                    <div style={{ position: 'relative', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', flexShrink: 0 }}>
                      {(() => {
                        const COLORS = ['rgb(67, 56, 202)', '#3A86FF', '#FB5607', '#FF006E', '#FFBE0B', '#10B981'];
                        let gradientStr = `conic-gradient(#F1F5F9 0% 100%)`;
                        if (totalBookingsCount > 0) {
                          let currentPercent = 0;
                          const gradientParts = sortedCats.map(([cat, count], i) => {
                            const p = (count / totalBookingsCount) * 100;
                            const part = `${COLORS[i % COLORS.length]} ${currentPercent}% ${currentPercent + p}%`;
                            currentPercent += p;
                            return part;
                          });
                          gradientStr = `conic-gradient(${gradientParts.join(', ')})`;
                        }

                        return (
                          <div style={{ width: '180px', height: '180px', borderRadius: '50%', background: gradientStr, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '136px', height: '136px', borderRadius: '50%', background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '12px' }}>
                              <div style={{ color: '#94A3B8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '2px' }}>Favorite</div>
                              <div style={{ color: '#1B2A4E', fontSize: topCat[0].length > 12 ? '0.9rem' : '1.1rem', fontWeight: 800, lineHeight: 1.1, textTransform: 'capitalize', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topCat[0]}</div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '4px' }}>
                      {sortedCats.map(([cat, count], i) => {
                        const COLORS = ['rgb(67, 56, 202)', '#3A86FF', '#FB5607', '#FF006E', '#FFBE0B', '#10B981'];
                        const color = COLORS[i % COLORS.length];
                        const percent = totalBookingsCount > 0 ? Math.round((count / totalBookingsCount) * 100) : 0;

                        return (
                          <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                              <span style={{ color: '#6B7280', fontWeight: 600, textTransform: 'capitalize' }}>{cat}</span>
                              <span style={{ color: '#1B2A4E', fontWeight: 800 }}>{percent}%</span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: '#F3F4F6', borderRadius: '10px' }}>
                              <div style={{ width: `${percent}%`, height: '100%', background: color, borderRadius: '10px' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  <Card
                    styles={{ body: { padding: '24px' } }}
                    style={{ borderRadius: '24px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}
                    title={<h3 style={{ margin: 0, color: '#1B2A4E', fontWeight: 800, fontSize: '1.1rem' }}>Booking Trends</h3>}
                    extra={
                      <DatePicker
                        picker="year"
                        value={dayjs().year(selectedYear)}
                        onChange={(date) => date && setSelectedYear(date.year())}
                        allowClear={false}
                        style={{
                          width: 100,
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '10px',
                          fontWeight: 700,
                          color: '#1B2A4E',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                        size="small"
                        suffixIcon={<CalendarOutlined style={{ color: '#4338CA' }} />}
                      />
                    }
                  >
                    <div style={{ width: '100%', height: 220, minWidth: 0, overflow: 'hidden', position: 'relative' }}>
                      {isMounted && (
                        <ResponsiveContainer width="100%" height={220} debounce={100}>
                          <BarChart data={yearlyBookings}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
                            <YAxis hide domain={[0, 'dataMax + 2']} />
                            <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey="Total Tickets" fill="rgb(67, 56, 202)" radius={[4, 4, 0, 0]} barSize={100} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </Card>
                </div>

                {/* RECENT BOOKINGS LIST */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, color: '#1B2A4E', fontWeight: 800, fontSize: '1.3rem' }}>Your Event Passes</h3>
                    <Button type="text" onClick={() => router.push('/my-tickets')} style={{ color: 'rgb(67, 56, 202)', fontWeight: 700 }}>View All</Button>
                  </div>

                  {upcomingBookings.length === 0 ? (
                    <Empty description="No upcoming event passes found" />
                  ) : (
                    <div className="grid-cols-auto-320" style={{ gap: '20px' }}>
                      {upcomingBookings.slice(0, 6).map(b => (
                        <Card
                          key={b.id}
                          className="hover-bounce"
                          styles={{ body: { padding: '20px' } }}
                          style={{
                            background: 'white',
                            borderRadius: '24px',
                            border: '1px solid #F1F5F9',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                            overflow: 'hidden'
                          }}
                        >
                          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'center' }}>
                            <div style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '12px', overflow: 'hidden' }}>
                              <Image
                                src={b.event.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87'}
                                alt={b.event.title || 'Event'}
                                fill
                                unoptimized
                                style={{ objectFit: 'cover' }}
                              />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h4 style={{ margin: '0 0 2px 0', fontSize: '1rem', fontWeight: 800, color: '#1B2A4E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.event.title}</h4>
                              <Tag style={{
                                borderRadius: '100px',
                                border: 'none',
                                background: b.status === 'CANCELLED' ? '#FEF2F2' : b.status === 'PENDING' ? '#FFF7ED' : (b.status === 'CHECKED_IN' ? '#E0E7FF' : '#F0FDF4'),
                                color: b.status === 'CANCELLED' ? '#EF4444' : b.status === 'PENDING' ? '#F97316' : (b.status === 'CHECKED_IN' ? '#4338CA' : '#10B981'),
                                fontWeight: 700,
                                margin: 0,
                                fontSize: '0.7rem'
                              }}>
                                {b.status === 'PENDING' ? 'PAYMENT PENDING' : (b.status === 'CHECKED_IN' ? 'CHECKED IN' : (b.status || 'Confirmed'))}
                              </Tag>
                            </div>
                          </div>

                          <div style={{ background: '#F8FAFB', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div style={{ textAlign: 'center', background: 'white', padding: '6px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', opacity: b.status === 'PENDING' ? 0.3 : 1, position: 'relative', width: '112px', height: '112px' }}>
                              <Image
                                src={b.qrCode || '/qr-placeholder.png'}
                                width={100}
                                height={100}
                                style={{ cursor: b.status === 'PENDING' ? 'not-allowed' : 'pointer' }}
                                onClick={() => b.status !== 'PENDING' && showBigQR(b)}
                                alt="QR"
                                unoptimized
                              />
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ color: '#6B7280', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Ticket Info</div>
                              <div style={{ fontWeight: 800, color: b.status === 'CANCELLED' ? '#EF4444' : b.status === 'PENDING' ? '#F97316' : '#1B2A4E', fontSize: '1.2rem' }}>₹{Number(b.amountPaid).toLocaleString()}</div>
                              <div style={{ color: '#94A3B8', fontSize: '0.75rem' }}>{b.ticketType} x {b.quantity}</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '10px' }}>
                            {b.status === 'PENDING' ? (
                              <Button
                                block
                                type="primary"
                                icon={<CreditCard size={14} />}
                                onClick={() => b.paymentUrl && (window.location.href = b.paymentUrl)}
                                style={{
                                  borderRadius: '12px',
                                  fontWeight: 800,
                                  height: '44px',
                                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                                  border: 'none',
                                  color: 'white',
                                  flex: 1,
                                  boxShadow: '0 4px 12px rgba(249, 115, 22, 0.2)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px'
                                }}
                              >
                                Complete Payment
                              </Button>
                            ) : (
                              <>
                                <Button
                                  block
                                  icon={<DownloadOutlined />}
                                  onClick={() => downloadTicket(b)}
                                  style={{ borderRadius: '12px', fontWeight: 600, height: '44px', background: '#F8FAFB', border: 'none', color: '#1B2A4E', flex: 1 }}
                                >
                                  Pass
                                </Button>
                                <Button
                                  icon={<QrcodeOutlined />}
                                  onClick={() => downloadQRCode(b.qrCode, b.event.title)}
                                  style={{ borderRadius: '12px', flex: 1, height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gradient-main)', color: 'white', border: 'none', fontWeight: 600 }}
                                  title="Download QR Code Only"
                                >
                                  QR
                                </Button>
                              </>
                            )}
                            {b.status !== 'CANCELLED' && (
                              <Popconfirm
                                title="Cancel Ticket"
                                description="Are you sure you want to cancel this ticket?"
                                onConfirm={() => handleCancel(b.id)}
                                okText="Yes"
                                cancelText="No"
                                okButtonProps={{ danger: true }}
                              >
                                <Button
                                  danger
                                  icon={<DeleteOutlined />}
                                  style={{ borderRadius: '12px', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FEF2F2', border: '1px solid #FEE2E2' }}
                                  title="Cancel Ticket"
                                />
                              </Popconfirm>
                            )}
                          </div>
                          {/* PDF template inside the map for each booking */}
                          <div id={`ticket-rich-template-${b.id}`} style={{ position: 'fixed', top: '-10000px', left: '-10000px', width: '800px', background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
                            <div style={{ margin: '40px', border: '1px solid #E2E8F0', borderRadius: '60px', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.05)', minHeight: '1000px', display: 'flex', flexDirection: 'column' }}>
                              <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)', padding: '60px 40px', color: 'white', textAlign: 'center', position: 'relative' }}>
                                <p style={{ textTransform: 'uppercase', letterSpacing: '6px', fontSize: '1.1rem', opacity: 0.8, marginBottom: '20px', fontWeight: '700' }}>Official Pass</p>
                                <h1 style={{ color: 'white', fontSize: '5rem', fontWeight: '950', margin: '0 0 20px 0', letterSpacing: '-3px', lineHeight: 1 }}>{b.event.title}</h1>
                                <div style={{ display: 'inline-block', padding: '12px 30px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                                  <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: '600', opacity: 0.9 }}>Digital Ticket #{b.id.slice(-8).toUpperCase()}</p>
                                </div>
                                <div style={{ width: '8px', height: '8px', background: '#EF4444', borderRadius: '50%', margin: '15px auto 0' }}></div>
                              </div>
                              <div className="grid-cols-modal-info" style={{ padding: '60px 50px', flex: 1, gap: '40px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
                                  <div>
                                    <p style={{ color: '#6366F1', fontWeight: '700', textTransform: 'uppercase', fontSize: '1rem', letterSpacing: '1px', marginBottom: '12px' }}>Guest Holder</p>
                                    <h2 style={{ fontSize: '3rem', fontWeight: '800', color: '#1E293B', margin: 0, lineHeight: 1.1 }}>{user.name || 'SaaS User'}</h2>
                                  </div>
                                  <div className="grid-cols-2" style={{ gap: '30px' }}>
                                    <div>
                                      <p style={{ color: '#6366F1', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px', marginBottom: '8px' }}>Date & Time</p>
                                      <p style={{ fontSize: '1.4rem', fontWeight: '700', color: '#334155', margin: 0 }}>{new Date(isNaN(Number(b.event.date)) ? b.event.date : Number(b.event.date)).toLocaleDateString()}</p>
                                      <p style={{ fontSize: '1.2rem', fontWeight: '600', color: '#64748B', marginTop: '4px' }}>{new Date(isNaN(Number(b.event.date)) ? b.event.date : Number(b.event.date)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '09:00 AM'}</p>
                                    </div>
                                    <div>
                                      <p style={{ color: '#6366F1', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px', marginBottom: '8px' }}>Location</p>
                                      <p style={{ fontSize: '1.2rem', fontWeight: '600', color: '#334155', margin: 0, lineHeight: 1.4 }}>{b.event.location}</p>
                                    </div>
                                  </div>
                                  <div className="grid-cols-2" style={{ gap: '30px', marginTop: 'auto' }}>
                                    <div>
                                      <p style={{ color: '#6366F1', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px', marginBottom: '8px' }}>Ticket Tier</p>
                                      <p style={{ fontSize: '1.6rem', fontWeight: '800', color: '#4F46E5', margin: 0 }}>{b.ticketType || 'Silver'}</p>
                                    </div>
                                    <div>
                                      <p style={{ color: '#6366F1', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px', marginBottom: '8px' }}>Order Total</p>
                                      <p style={{ fontSize: '1.6rem', fontWeight: '800', color: b.status === 'CANCELLED' ? '#EF4444' : '#1E293B', margin: 0 }}>₹{Number(b.amountPaid || 0).toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: '600', color: '#64748B' }}>INR</span></p>
                                    </div>
                                    <div>
                                      <p style={{ color: '#6366F1', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px', marginBottom: '8px' }}>Quantity</p>
                                      <p style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1E293B', margin: 0 }}>{b.quantity || 1}</p>
                                    </div>
                                  </div>
                                </div>
                                <div style={{ background: '#F8FAFC', borderRadius: '40px', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid #F1F5F9' }}>
                                  <div style={{ background: 'white', padding: '25px', borderRadius: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', position: 'relative', width: '330px', height: '330px' }}>
                                    <Image src={b.qrCode || '/qr-placeholder.png'} width={280} height={280} alt="QR" unoptimized />
                                  </div>
                                  <p style={{ marginTop: '30px', textTransform: 'uppercase', letterSpacing: '3px', fontWeight: '900', color: '#1e1b4b', fontSize: '1rem' }}>Validate Access</p>
                                </div>
                              </div>
                              <div style={{ padding: '40px 50px', borderTop: '1px dashed #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94A3B8' }}>
                                  <span style={{ fontSize: '1.4rem' }}>🌐</span>
                                  <p style={{ margin: 0, fontWeight: '600', fontSize: '1.1rem' }}>Verified by EventHub SaaS</p>
                                </div>
                                <div style={{ background: '#1e1b4b', color: 'white', padding: '12px 25px', borderRadius: '100px', fontWeight: '900', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                  Entry Pass
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* FEATURED / UPCOMING EVENTS ON PLATFORM */}
                {!isOrganizer && !isSuperAdmin && allEventsData?.events?.length > 0 && (
                  <div style={{ marginTop: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ margin: 0, color: '#1B2A4E', fontWeight: 800, fontSize: '1.3rem' }}>Upcoming on EventHub</h3>
                      <Button type="text" onClick={() => router.push('/browse')} style={{ color: 'rgb(67, 56, 202)', fontWeight: 700 }}>View All</Button>
                    </div>
                    <div className="grid-cols-auto-320" style={{ gap: '20px' }}>
                      {allEventsData.events.filter(e => new Date(isNaN(Number(e.date)) ? e.date : Number(e.date)) >= now).slice(0, 3).map(e => (
                        <div key={e.id} className="hover-bounce" style={{ background: '#FFF', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', padding: '16px', border: '1px solid #F1F5F9' }}>
                          <div style={{ position: 'relative', height: '140px', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px', background: `url(${e.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87'}) center/cover` }}>
                            <Tag style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(255,255,255,0.9)', color: '#1B2A4E', border: 'none', borderRadius: '100px', fontWeight: 700, padding: '4px 12px' }}>{e.eventType || 'Event'}</Tag>
                          </div>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800, color: '#1B2A4E' }}>{e.title}</h4>
                          <div style={{ color: '#6B7280', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}><EnvironmentOutlined /> {e.location}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ color: '#9CA3AF', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}><CalendarOutlined /> {new Date(isNaN(Number(e.date)) ? e.date : Number(e.date)).toLocaleDateString()}</div>
                            <Button type="primary" size="small" onClick={() => router.push(`/events/${e.id}`)} style={{ borderRadius: '8px', background: 'var(--gradient-main)', border: 'none', fontWeight: 600 }}>Book Now</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h3 style={{ margin: 0, color: '#1B2A4E', fontWeight: 800, fontSize: '1.2rem' }}>Upcoming Event</h3>
                {(() => {
                  const displayEvent = featuredBooking?.event || allEventsData?.events?.filter(e => e.status !== 'COMPLETED' && new Date(isNaN(Number(e.date)) ? e.date : Number(e.date)) >= now).sort((a, b) => new Date(isNaN(Number(a.date)) ? a.date : Number(a.date)) - new Date(isNaN(Number(b.date)) ? b.date : Number(b.date)))[0];

                  if (!displayEvent) return (
                    <Card style={{ borderRadius: '24px', textAlign: 'center', padding: '40px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                      <Empty description="No upcoming events found" />
                    </Card>
                  );

                  const b = featuredBooking;
                  const isBooked = !!b;

                  return (
                    <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: '24px', border: 'none', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
                      <div style={{ height: '200px', background: `url(${displayEvent.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87'}) center/cover`, position: 'relative' }}>
                        <Tag style={{ position: 'absolute', top: '20px', left: '20px', background: 'white', color: '#1B2A4E', border: 'none', borderRadius: '100px', fontWeight: 800, padding: '6px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                          {isBooked ? 'Your Next Entry' : 'Most Anticipated'}
                        </Tag>
                      </div>
                      <div style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', gap: '16px', marginBottom: isBooked ? '20px' : '8px', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 4px 0', color: '#1B2A4E', fontSize: '1.4rem', fontWeight: 800 }}>{displayEvent.title}</h3>
                            <div style={{ color: '#94A3B8', fontSize: '0.9rem', fontWeight: 500 }}>{displayEvent.location}</div>
                          </div>
                          {isBooked && (
                            <Tag style={{
                              borderRadius: '100px',
                              border: 'none',
                              background: b.status === 'PENDING' ? '#FFF7ED' : (b.status === 'CHECKED_IN' ? '#E0E7FF' : '#F0FDF4'),
                              color: b.status === 'PENDING' ? '#F97316' : (b.status === 'CHECKED_IN' ? '#4338CA' : '#10B981'),
                              fontWeight: 700,
                              margin: 0
                            }}>
                              {b.status === 'PENDING' ? 'PAYMENT PENDING' : (b.status === 'CHECKED_IN' ? 'CHECKED IN' : (b.status || 'Confirmed'))}
                            </Tag>
                          )}
                        </div>

                        {isBooked ? (
                          <>
                            <div style={{ background: '#F8FAFB', borderRadius: '20px', padding: '20px', display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                              <div style={{ background: 'white', padding: '8px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', position: 'relative', width: '96px', height: '96px' }}>
                                <Image src={b.qrCode || '/qr-placeholder.png'} width={80} height={80} style={{ cursor: 'pointer' }} onClick={() => showBigQR(b)} alt="QR" unoptimized />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ color: '#94A3B8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pass Details</div>
                                <div style={{ fontWeight: 800, color: '#1B2A4E', fontSize: '1.3rem', margin: '2px 0' }}>₹{Number(b.amountPaid).toLocaleString()}</div>
                                <div style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600 }}>{b.ticketType} x {b.quantity}</div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                              <Button
                                block
                                size="large"
                                icon={<DownloadOutlined />}
                                onClick={() => downloadTicket(b)}
                                style={{ height: '50px', borderRadius: '14px', fontWeight: 700, background: '#F8FAFB', border: '1px solid #E2E8F0', color: '#1B2A4E' }}
                              >
                                Pass
                              </Button>
                              <Button
                                block
                                size="large"
                                icon={<QrcodeOutlined />}
                                onClick={() => downloadQRCode(b.qrCode, displayEvent.title)}
                                style={{ height: '50px', borderRadius: '14px', fontWeight: 700, background: 'var(--gradient-main)', border: 'none', color: 'white', boxShadow: '0 4px 12px rgba(131, 56, 236, 0.2)' }}
                              >
                                QR
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '24px' }}>
                              {displayEvent.description ? displayEvent.description.substring(0, 100) + '...' : `Don't miss out on "${displayEvent.title}". Join us for an unforgettable experience.`}
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1B2A4E', fontWeight: 600, fontSize: '0.9rem', background: '#F8F9FA', padding: '10px 18px', borderRadius: '14px' }}>
                                <CalendarOutlined style={{ color: '#1B2A4E' }} />
                                <span>{new Date(isNaN(Number(displayEvent.date)) ? displayEvent.date : Number(displayEvent.date)).toLocaleDateString()}</span>
                              </div>
                              <Button
                                type="primary"
                                onClick={() => router.push(`/events/${displayEvent.id}`)}
                                style={{
                                  background: 'linear-gradient(135deg, rgb(49, 46, 129) 0%, rgb(67, 56, 202) 100%)',
                                  borderRadius: '12px',
                                  fontWeight: 700,
                                  height: '42px',
                                  padding: '0 24px',
                                  border: 'none',
                                  boxShadow: '0 4px 12px rgba(49, 46, 129, 0.2)'
                                }}
                              >
                                View Details
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </Card>
                  );
                })()}

                <Card styles={{ body: { padding: '24px' } }} style={{ borderRadius: '24px', border: 'none', background: '#F8FAFB', marginTop: '12px' }}>
                  <h4 style={{ margin: '0 0 16px 0', color: '#1B2A4E', fontWeight: 800 }}>Reward Summary</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: '#6B7280' }}>Total Spend</span>
                    <span style={{ fontWeight: 800, color: '#1B2A4E' }}>₹{Number(totalSpent).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <span style={{ color: '#6B7280' }}>Level</span>
                    {(() => {
                      const amount = totalSpent || 0;
                      if (amount >= 1500) return <Tag color="purple" style={{ margin: 0, borderRadius: '4px' }}>Elite Member</Tag>;
                      if (amount >= 500) return <Tag color="gold" style={{ margin: 0, borderRadius: '4px' }}>Gold Member</Tag>;
                      if (amount >= 100) return <Tag color="blue" style={{ margin: 0, borderRadius: '4px' }}>Silver Member</Tag>;
                      return <Tag color="default" style={{ margin: 0, borderRadius: '4px' }}>Bronze Member</Tag>;
                    })()}
                  </div>
                  <Divider style={{ margin: '16px 0' }} />
                  <Button type="dashed" block onClick={() => setIsRewardsModalVisible(true)} style={{ borderRadius: '12px', fontWeight: 600 }}>Explore Rewards</Button>
                </Card>
              </div>
            </div>
          );
        })()}
      </motion.div>
    </>
  );
}
