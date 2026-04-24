import { useContext, useState } from 'react';
import { GlobalActionsContext } from '../components/GlobalActions';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_MY_BOOKINGS, CANCEL_BOOKING, GET_MY_ANALYTICS, GET_MY_EVENTS, GET_EVENTS, REDEEM_REWARD } from '@/features/events/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Spin, Card, Empty, Button, Tag, Divider, Modal, Form, Input, Typography, Avatar, Drawer, Badge, List, Progress } from 'antd';
import { EnvironmentOutlined, CalendarOutlined, DownloadOutlined, QrcodeOutlined, CrownOutlined, CheckCircleFilled, UserOutlined, MailOutlined, SettingOutlined, AppstoreOutlined, ArrowRightOutlined, EyeOutlined, BellOutlined, CheckOutlined, RocketOutlined } from '@ant-design/icons';

const { Title, Text: AntText } = Typography;

export default function Dashboard() {
  const { user, loading: authLoading, setUser } = useAuth();
  const router = useRouter();

  const [activeBooking, setActiveBooking] = useState(null);
  const [isQRModalVisible, setIsQRModalVisible] = useState(false);
  const [isRewardsModalVisible, setIsRewardsModalVisible] = useState(false);

  const { refetchGlobalNotifications } = useContext(GlobalActionsContext);

  const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';

  const { data: bookingData, loading: bookingLoading, refetch } = useQuery(GET_MY_BOOKINGS, {
    fetchPolicy: 'cache-and-network'
  });

  const { data: analyticsData } = useQuery(GET_MY_ANALYTICS, {
    skip: !user || user.role === 'USER', fetchPolicy: 'cache-and-network'
  });

  const { data: myEventsData, loading: eventsLoading } = useQuery(GET_MY_EVENTS, {
    skip: !isOrganizer, fetchPolicy: 'cache-and-network'
  });

  const { data: allEventsData } = useQuery(GET_EVENTS, {
    variables: { limit: 5 },
    skip: isOrganizer,
    fetchPolicy: 'cache-and-network'
  });

  const [cancel] = useMutation(CANCEL_BOOKING);
  const [redeemReward, { loading: redeeming }] = useMutation(REDEEM_REWARD);

  const handleRedeem = async (reward) => {
    try {
      const { data } = await redeemReward({
        variables: { rewardId: reward.title, points: reward.pts }
      });
      setUser({ ...user, loyaltyPoints: data.redeemReward.loyaltyPoints, redeemedRewards: data.redeemReward.redeemedRewards });
      toast.success(`Succesfully redeemed ${reward.title}! 🎁`);
      refetchGlobalNotifications();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (authLoading || bookingLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '20px' }}>
      <div style={{
        width: '56px', height: '56px',
        borderRadius: '14px',
        background: 'var(--gradient-main)',
        animation: 'pulse-glow 2s ease-in-out infinite',
        boxShadow: 'var(--shadow-glow)'
      }} />
      <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.95rem' }}>Entering Dashboard...</span>
    </div>
  );
  if (!user) { router.push('/login'); return null; }

  const handleCancel = async (id) => {
    if (confirm('Are you sure you want to cancel this ticket?')) {
      try {
        await cancel({ variables: { id } });
        toast.success('Ticket cancelled successfully');
        refetch();
      } catch (e) { toast.error(e.message); }
    }
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
      pdf.save(`VIP_Ticket_${booking.event.title.replace(/\s+/g, '_')}.pdf`);
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
      link.download = `QR_${eventTitle.replace(/\s+/g, '_')}.png`;
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



  return (
    <>
      <Head><title>Dashboard | EventHub</title></Head>
      <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>



        {/* QR SCAN PREVIEW MODAL */}
        <Modal
          open={isQRModalVisible}
          onCancel={() => setIsQRModalVisible(false)}
          footer={null}
          centered
          width={480}
          styles={{ body: { padding: '40px', textAlign: 'center' } }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'var(--gradient-main)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              boxShadow: 'var(--shadow-glow)'
            }}>
              <RocketOutlined style={{ fontSize: '1.6rem', color: 'white' }} />
            </div>
            <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', fontWeight: '800', marginBottom: '8px' }}>Fast-Pass Gate Entry</h2>
            {activeBooking?.qrCode && (
              <div style={{
                padding: '24px',
                background: 'var(--glass-bg)',
                borderRadius: '28px',
                display: 'inline-block',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 16px 32px rgba(0,0,0,0.2)'
              }}>
                <img src={activeBooking.qrCode} style={{ width: '260px', height: '260px', borderRadius: '16px' }} alt="QR" />
              </div>
            )}
            <div style={{
              marginTop: '28px',
              padding: '16px 24px',
              background: 'rgba(131, 56, 236, 0.06)',
              borderRadius: '16px',
              border: '1px solid rgba(131, 56, 236, 0.12)'
            }}>
              <p style={{ margin: 0, fontWeight: '700', color: 'var(--primary-color)', fontSize: '1rem' }}>{activeBooking?.event.title}</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>TICKET ID: #{activeBooking?.id.slice(-8).toUpperCase()}</p>
            </div>
          </div>
        </Modal>

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
            <div style={{ color: '#1B2A4E', fontSize: '3rem', fontWeight: 900, lineHeight: 1 }}>{user.loyaltyPoints || 0} <span style={{ fontSize: '1rem', color: '#6B7280' }}>Pts</span></div>
            <div style={{ marginTop: '16px' }}>
              <Progress
                percent={Math.min(100, Math.round(((user.loyaltyPoints || 0) / 5000) * 100))}
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
              const isUnlocked = (user.loyaltyPoints || 0) >= reward.pts;
              const isRedeemed = user.redeemedRewards?.includes(reward.title);
              return (
                <div key={i} style={{
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
                }}>
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
                </div>
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
        <div className="header-responsive" style={{ marginBottom: '32px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 800, color: '#1B2A4E', letterSpacing: '-0.5px' }}>Dashboard</h1>
            <p style={{ color: '#6B7280', margin: '4px 0 0 0', fontSize: '1rem' }}>Hello {user?.name}, welcome back!</p>
          </div>
        </div>

        {isOrganizer ? (() => {
          // Dynamic calculations from DB
          const totalCapacity = myEventsData?.myEvents?.reduce((acc, ev) => acc + (ev.capacity || 0), 0) || 0;
          const ticketsSold = analyticsData?.myAnalytics?.ticketsSold || 0;
          const totalRevenue = analyticsData?.myAnalytics?.totalRevenue || 0;
          const percentSold = totalCapacity > 0 ? Math.min(100, Math.round((ticketsSold / totalCapacity) * 100)) : 0;
          const remaining = Math.max(0, totalCapacity - ticketsSold);
          const percentRemaining = totalCapacity > 0 ? (100 - percentSold) : 0;

          // Calculate dynamic popular event categories
          const catCount = {};
          const totalEvents = myEventsData?.myEvents?.length || 1;
          myEventsData?.myEvents?.forEach(e => {
            const cat = e.category || 'General';
            catCount[cat] = (catCount[cat] || 0) + 1;
          });
          const sortedCats = Object.entries(catCount).sort((a, b) => b[1] - a[1]);
          const topCat1 = sortedCats[0] || ['Music', 0];
          const topCat2 = sortedCats[1] || ['Sports', 0];

          return (
            <div className="grid-cols-main" style={{ gap: '24px' }}>
              {/* LEFT COLUMN: Main Dashboard Content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* TOP KPI CARDS ROW */}
                <div className="grid-cols-auto-320" style={{ gap: '24px' }}>
                  <Card styles={{ body: { padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' } }} style={{ borderRadius: '20px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(67, 56, 202, 0.1)', color: 'rgb(67, 56, 202)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📅</div>
                    <div>
                      <div style={{ color: '#6B7280', fontSize: '0.9rem', fontWeight: 600, marginBottom: '4px' }}>Upcoming Events</div>
                      <div style={{ color: '#1B2A4E', fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>{myEventsData?.myEvents.length || 0}</div>
                    </div>
                  </Card>

                  <Card styles={{ body: { padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' } }} style={{ borderRadius: '20px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(67, 56, 202, 0.1)', color: 'rgb(67, 56, 202)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>☑️</div>
                    <div>
                      <div style={{ color: '#6B7280', fontSize: '0.9rem', fontWeight: 600, marginBottom: '4px' }}>Total Bookings</div>
                      <div style={{ color: '#1B2A4E', fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>{analyticsData?.myAnalytics?.confirmedBookingsCount || 0}</div>
                    </div>
                  </Card>

                  <Card styles={{ body: { padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' } }} style={{ borderRadius: '20px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(67, 56, 202, 0.1)', color: 'rgb(67, 56, 202)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🎟️</div>
                    <div>
                      <div style={{ color: '#6B7280', fontSize: '0.9rem', fontWeight: 600, marginBottom: '4px' }}>Tickets Sold</div>
                      <div style={{ color: '#1B2A4E', fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>{ticketsSold}</div>
                    </div>
                  </Card>
                </div>

                {/* GRAPHS ROW: Ticket Sales (Doughnut) & Sales Revenue (Bar) */}
                <div className="grid-cols-reverse" style={{ gap: '24px' }}>
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

                  <Card styles={{ body: { padding: '24px' } }} style={{ borderRadius: '24px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ margin: 0, color: '#1B2A4E', fontWeight: 800, fontSize: '1.1rem' }}>Sales Revenue</h3>
                    </div>
                    <div style={{ marginBottom: '24px' }}>
                      <div style={{ color: '#6B7280', fontSize: '0.85rem', fontWeight: 600 }}>Total Revenue</div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
                        <div style={{ color: '#1B2A4E', fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>${Number(totalRevenue).toLocaleString()}</div>
                        <div style={{ color: '#10B981', background: '#D1FAE5', padding: '2px 8px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>Active</div>
                      </div>
                    </div>
                    <div style={{ height: '220px', minWidth: 0 }}>
                      <ResponsiveContainer width="100%" height="100%" debounce={100}>
                        {/* Injecting real data for current month, filling historical conservatively */}
                        <BarChart data={analyticsData?.myAnalytics?.monthlyData || []}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                          <XAxis dataKey="n" stroke="#9CA3AF" axisLine={false} tickLine={false} fontSize={12} dy={10} />
                          <YAxis stroke="#9CA3AF" axisLine={false} tickLine={false} fontSize={12} tickFormatter={(v) => `${(v / 1000)}k`} />
                          <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="c" fill="rgb(67, 56, 202)" radius={[6, 6, 6, 6]} barSize={12} name="Total Rev ($)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>

                {/* POPULAR EVENTS PROGRESS BARS */}
                <Card styles={{ body: { padding: '24px' } }} style={{ borderRadius: '24px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ margin: 0, color: '#1B2A4E', fontWeight: 800, fontSize: '1.1rem' }}>Event Category Breakdown</h3>
                    <Tag style={{ borderRadius: '100px', border: 'none', background: '#F3F4F6', color: '#4B5563', padding: '4px 12px', fontWeight: 600 }}>Hosted ▼</Tag>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#1B2A4E' }}>
                        <span style={{ textTransform: 'capitalize' }}>{topCat1[0]}</span>
                        <span><span style={{ color: 'rgb(67, 56, 202)', marginRight: '32px' }}>{Math.round((topCat1[1] / totalEvents) * 100)}%</span> {topCat1[1]} Events</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: '#F3F4F6', borderRadius: '100px' }}>
                        <div style={{ width: `${Math.round((topCat1[1] / totalEvents) * 100)}%`, height: '100%', background: 'linear-gradient(135deg, rgb(49, 46, 129) 0%, rgb(67, 56, 202) 100%)', borderRadius: '100px' }} />
                      </div>
                    </div>
                    {topCat2[1] > 0 && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#1B2A4E' }}>
                          <span style={{ textTransform: 'capitalize' }}>{topCat2[0]}</span>
                          <span><span style={{ color: 'rgb(67, 56, 202)', marginRight: '32px' }}>{Math.round((topCat2[1] / totalEvents) * 100)}%</span> {topCat2[1]} Events</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#F3F4F6', borderRadius: '100px' }}>
                          <div style={{ width: `${Math.round((topCat2[1] / totalEvents) * 100)}%`, height: '100%', background: 'linear-gradient(135deg, rgb(49, 46, 129) 0%, rgb(67, 56, 202) 100%)', borderRadius: '100px' }} />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* ALL EVENTS ROW */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                  <h3 style={{ margin: 0, color: '#1B2A4E', fontWeight: 800, fontSize: '1.2rem' }}>All Events</h3>
                  <div style={{ color: '#6B7280', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }} onClick={() => router.push('/browse')}>View All Event</div>
                </div>
                <div className="grid-cols-auto-320" style={{ gap: '20px' }}>
                  {myEventsData?.myEvents.slice(0, 3).map(e => (
                    <div key={e.id} className="hover-bounce" style={{ background: '#FFF', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', padding: '16px' }}>
                      <div style={{ position: 'relative', height: '140px', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px', background: `url(${e.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87'}) center/cover` }}>
                        <Tag style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(255,255,255,0.9)', color: '#1B2A4E', border: 'none', borderRadius: '100px', fontWeight: 700, padding: '4px 12px', textTransform: 'capitalize' }}>{e.category || 'Event'}</Tag>
                      </div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800, color: '#1B2A4E' }}>{e.title}</h4>
                      <div style={{ color: '#6B7280', fontSize: '0.85rem', marginBottom: '16px' }}>{e.location}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CalendarOutlined /> {new Date(parseInt(e.date) || e.date).toLocaleDateString()}</div>
                        <div style={{ color: 'rgb(67, 56, 202)', fontWeight: 800, fontSize: '1rem' }}>$ {Number(e.ticketTypes?.[0]?.price || 30).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                  {(!myEventsData || myEventsData?.myEvents.length === 0) && (
                    <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', background: '#FFF', borderRadius: '24px', color: '#6B7280' }}>
                      No hosted events to display yet.
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Upcoming Event & Activity */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, color: '#1B2A4E', fontWeight: 800, fontSize: '1.2rem' }}>Upcoming Event</h3>
                </div>

                {myEventsData?.myEvents?.[0] ? (
                  <>
                    <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: '24px', border: 'none', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                      <div style={{ height: '200px', background: `url(${myEventsData?.myEvents[0].imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87'}) center/cover`, position: 'relative' }}>
                        <Tag style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(255,255,255,0.9)', color: '#1B2A4E', border: 'none', borderRadius: '100px', fontWeight: 700, padding: '6px 16px' }}>Most Anticipated</Tag>
                      </div>
                      <div style={{ padding: '24px' }}>
                        <h3 style={{ margin: '0 0 8px 0', color: '#1B2A4E', fontSize: '1.4rem', fontWeight: 800 }}>{myEventsData?.myEvents[0].title}</h3>
                        <div style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '20px' }}>{myEventsData?.myEvents[0].location}</div>
                        <p style={{ color: '#6B7280', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '24px' }}>{myEventsData?.myEvents[0].description ? myEventsData?.myEvents[0].description.substring(0, 80) + '...' : 'Immerse yourself in electrifying performances by top artists and enjoy the festival.'}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1B2A4E', fontWeight: 600, fontSize: '0.9rem', background: '#F3F4F6', padding: '8px 16px', borderRadius: '12px' }}>
                            <CalendarOutlined />
                            <span>{new Date(parseInt(myEventsData?.myEvents[0].date) || myEventsData?.myEvents[0].date).toLocaleDateString()}</span>
                          </div>
                          <Button type="primary" onClick={() => router.push(`/events/${myEventsData?.myEvents[0].id}`)} style={{ background: 'linear-gradient(135deg, rgb(49, 46, 129) 0%, rgb(67, 56, 202) 100%)', borderRadius: '100px', padding: '0 24px', fontWeight: 700, height: '40px', border: 'none', boxShadow: '0 4px 12px rgba(49, 46, 129, 0.3)' }}>View Details</Button>
                        </div>
                      </div>
                    </Card>
                    {myEventsData?.myEvents?.[1] && (
                      <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: '24px', border: 'none', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                        <div style={{ height: '200px', background: `url(${myEventsData?.myEvents[1]?.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87'}) center/cover`, position: 'relative' }}>
                          <Tag style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(255,255,255,0.9)', color: '#1B2A4E', border: 'none', borderRadius: '100px', fontWeight: 700, padding: '6px 16px' }}>Most Anticipated</Tag>
                        </div>
                        <div style={{ padding: '24px' }}>
                          <h3 style={{ margin: '0 0 8px 0', color: '#1B2A4E', fontSize: '1.4rem', fontWeight: 800 }}>{myEventsData?.myEvents[1]?.title}</h3>
                          <div style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '20px' }}>{myEventsData?.myEvents[1]?.location}</div>
                          <p style={{ color: '#6B7280', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '24px' }}>{myEventsData?.myEvents[1]?.description ? myEventsData?.myEvents[1]?.description.substring(0, 80) + '...' : 'Immerse yourself in electrifying performances by top artists and enjoy the festival.'}</p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1B2A4E', fontWeight: 600, fontSize: '0.9rem', background: '#F3F4F6', padding: '8px 16px', borderRadius: '12px' }}>
                              <CalendarOutlined />
                              <span>{new Date(parseInt(myEventsData?.myEvents[1]?.date) || myEventsData?.myEvents[1]?.date).toLocaleDateString()}</span>
                            </div>
                            <Button type="primary" onClick={() => router.push(`/events/${myEventsData?.myEvents[1]?.id}`)} style={{ background: 'linear-gradient(135deg, rgb(49, 46, 129) 0%, rgb(67, 56, 202) 100%)', borderRadius: '100px', padding: '0 24px', fontWeight: 700, height: '40px', border: 'none', boxShadow: '0 4px 12px rgba(49, 46, 129, 0.3)' }}>View Details</Button>
                          </div>
                        </div>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card styles={{ body: { padding: '24px', textAlign: 'center' } }} style={{ borderRadius: '24px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <div style={{ color: '#9CA3AF', marginBottom: '16px', fontSize: '2rem' }}>🎉</div>
                    <div style={{ color: '#6B7280', fontWeight: 600 }}>Create an event to see it featured here.</div>
                  </Card>
                )}
              </div>
            </div>
          );
        })() : (() => {
          const now = new Date();
          const upcomingBookings = bookings.filter(b => b.event && new Date(parseInt(b.event.date) || b.event.date) >= now);
          const featuredBooking = upcomingBookings[0];
          const totalSpent = bookings.reduce((acc, b) => acc + (b.amountPaid || 0), 0);

          // Calculate category preference for doughnut chart
          const catCount = {};
          bookings.forEach(b => {
            const cat = b.event?.eventType || 'General';
            catCount[cat] = (catCount[cat] || 0) + 1;
          });
          const totalBookingsCount = bookings.length;
          const sortedCats = Object.entries(catCount).sort((a, b) => b[1] - a[1]);
          const topCat = sortedCats[0] || ['Start Exploring', 0];
          const topCatPercent = totalBookingsCount > 0 ? Math.round((topCat[1] / totalBookingsCount) * 100) : 0;

          // DYNAMIC BOOKING TRENDS (Last 6 months)
          const last6Months = [];
          for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthName = d.toLocaleString('default', { month: 'short' });
            const count = bookings.filter(b => {
              const bDate = new Date(parseInt(b.event?.date) || b.event?.date);
              return bDate.getMonth() === d.getMonth() && bDate.getFullYear() === d.getFullYear();
            }).length;
            last6Months.push({ name: monthName, count });
          }

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
                      <div style={{ color: '#1B2A4E', fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>{bookings.length}</div>
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
                  <Card styles={{ body: { padding: '24px' } }} style={{ borderRadius: '24px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ margin: '0 0 20px 0', color: '#1B2A4E', fontWeight: 800, fontSize: '1.1rem' }}>Interest Split</h3>
                    <div style={{ position: 'relative', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                      <div style={{ width: '180px', height: '180px', borderRadius: '50%', background: `conic-gradient(rgb(67, 56, 202) 0% ${topCatPercent}%, #F1F5F9 ${topCatPercent}% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '136px', height: '136px', borderRadius: '50%', background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '12px' }}>
                          <div style={{ color: '#94A3B8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '2px' }}>Favorite</div>
                          <div style={{ color: '#1B2A4E', fontSize: topCat[0].length > 12 ? '0.9rem' : '1.1rem', fontWeight: 800, lineHeight: 1.1, textTransform: 'capitalize', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topCat[0]}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: '#6B7280', fontWeight: 600 }}>{topCat[0]}</span>
                        <span style={{ color: '#1B2A4E', fontWeight: 800 }}>{topCatPercent}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: '#F3F4F6', borderRadius: '10px' }}>
                        <div style={{ width: `${topCatPercent}%`, height: '100%', background: 'rgb(67, 56, 202)', borderRadius: '10px' }} />
                      </div>
                    </div>
                  </Card>

                  <Card styles={{ body: { padding: '24px' } }} style={{ borderRadius: '24px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ margin: '0 0 20px 0', color: '#1B2A4E', fontWeight: 800, fontSize: '1.1rem' }}>Booking Trends</h3>
                    <div style={{ height: '220px', minWidth: 0 }}>
                      <ResponsiveContainer width="100%" height="100%" debounce={100}>
                        <BarChart data={last6Months}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
                          <YAxis hide domain={[0, 'dataMax + 2']} />
                          <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="count" fill="rgb(67, 56, 202)" radius={[4, 4, 0, 0]} barSize={24} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>

                {/* RECENT BOOKINGS LIST */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, color: '#1B2A4E', fontWeight: 800, fontSize: '1.3rem' }}>Your Event Passes</h3>
                    <Button type="text" onClick={() => router.push('/browse')} style={{ color: 'rgb(67, 56, 202)', fontWeight: 700 }}>Browse More</Button>
                  </div>

                  {bookings.length === 0 ? (
                    <Empty description="No bookings found" />
                  ) : (
                    <div className="grid-cols-auto-320" style={{ gap: '20px' }}>
                      {bookings.slice(0, 6).map(b => (
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
                            <img
                              src={b.event.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87'}
                              style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover' }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h4 style={{ margin: '0 0 2px 0', fontSize: '1rem', fontWeight: 800, color: '#1B2A4E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.event.title}</h4>
                              <Tag style={{ borderRadius: '100px', border: 'none', background: b.status === 'CANCELLED' ? '#FEF2F2' : '#F0FDF4', color: b.status === 'CANCELLED' ? '#EF4444' : '#10B981', fontWeight: 700, margin: 0, fontSize: '0.7rem' }}>{b.status || 'Confirmed'}</Tag>
                            </div>
                          </div>

                          <div style={{ background: '#F8FAFB', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div style={{ textAlign: 'center', background: 'white', padding: '6px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                              <img src={b.qrCode} style={{ width: '100px', height: '100px', cursor: 'pointer' }} onClick={() => showBigQR(b)} alt="QR" />
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ color: '#6B7280', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Ticket Info</div>
                              <div style={{ fontWeight: 800, color: b.status === 'CANCELLED' ? '#EF4444' : '#1B2A4E', fontSize: '1.2rem' }}>${Number(b.amountPaid).toLocaleString()}</div>
                              <div style={{ color: '#94A3B8', fontSize: '0.75rem' }}>{b.ticketType} x {b.quantity}</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '10px' }}>
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
                                      <p style={{ fontSize: '1.4rem', fontWeight: '700', color: '#334155', margin: 0 }}>{new Date(parseInt(b.event.date) || b.event.date).toLocaleDateString()}</p>
                                      <p style={{ fontSize: '1.2rem', fontWeight: '600', color: '#64748B', marginTop: '4px' }}>{new Date(parseInt(b.event.date) || b.event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '09:00 AM'}</p>
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
                                      <p style={{ fontSize: '1.6rem', fontWeight: '800', color: b.status === 'CANCELLED' ? '#EF4444' : '#1E293B', margin: 0 }}>${Number(b.amountPaid || 0).toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: '600', color: '#64748B' }}>USD</span></p>
                                    </div>
                                    <div>
                                      <p style={{ color: '#6366F1', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px', marginBottom: '8px' }}>Quantity</p>
                                      <p style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1E293B', margin: 0 }}>{b.quantity || 1}</p>
                                    </div>
                                  </div>
                                </div>
                                <div style={{ background: '#F8FAFC', borderRadius: '40px', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid #F1F5F9' }}>
                                  <div style={{ background: 'white', padding: '25px', borderRadius: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                                    <img src={b.qrCode} style={{ width: '280px', height: '280px' }} alt="QR" />
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
              </div>

              {/* RIGHT COLUMN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h3 style={{ margin: 0, color: '#1B2A4E', fontWeight: 800, fontSize: '1.2rem' }}>Upcoming Event</h3>
                {(() => {
                  const displayEvent = featuredBooking?.event || allEventsData?.events?.[0];
                  if (!displayEvent) return (
                    <Card style={{ borderRadius: '24px', textAlign: 'center', padding: '40px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                      <Empty description="No upcoming events" />
                    </Card>
                  );

                  return (
                    <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: '24px', border: 'none', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
                      <div style={{ height: '200px', background: `url(${displayEvent.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87'}) center/cover`, position: 'relative' }}>
                        <Tag style={{ position: 'absolute', top: '20px', left: '20px', background: 'white', color: '#1B2A4E', border: 'none', borderRadius: '100px', fontWeight: 800, padding: '6px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>Most Anticipated</Tag>
                      </div>
                      <div style={{ padding: '24px' }}>
                        <h3 style={{ margin: '0 0 4px 0', color: '#1B2A4E', fontSize: '1.5rem', fontWeight: 800 }}>{displayEvent.title}</h3>
                        <div style={{ color: '#94A3B8', fontSize: '0.9rem', marginBottom: '16px', fontWeight: 500 }}>{displayEvent.location}</div>

                        <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '24px', height: '44px', overflow: 'hidden' }}>
                          {displayEvent.description || `Join us for a unique experience at "${displayEvent.title}", an immersive event you won't forget.`}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1B2A4E', fontWeight: 600, fontSize: '0.9rem', background: '#F8F9FA', padding: '10px 18px', borderRadius: '14px' }}>
                            <CalendarOutlined style={{ color: '#1B2A4E' }} />
                            <span>{new Date(parseInt(displayEvent.date) || displayEvent.date).toLocaleDateString()}</span>
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
                      </div>
                    </Card>
                  );
                })()}

                <Card styles={{ body: { padding: '24px' } }} style={{ borderRadius: '24px', border: 'none', background: '#F8FAFB', marginTop: '12px' }}>
                  <h4 style={{ margin: '0 0 16px 0', color: '#1B2A4E', fontWeight: 800 }}>Reward Summary</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: '#6B7280' }}>Total Spend</span>
                    <span style={{ fontWeight: 800, color: '#1B2A4E' }}>${Number(totalSpent).toLocaleString()}</span>
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

      </div>
    </>
  );
}
