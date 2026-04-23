import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_MY_BOOKINGS, CANCEL_BOOKING, GET_MY_ANALYTICS, UPDATE_PROFILE, GET_MY_EVENTS, GET_MY_NOTIFICATIONS, UNREAD_NOTIFICATION_COUNT, MARK_NOTIFICATION_AS_READ, MARK_ALL_NOTIFICATIONS_AS_READ } from '@/features/events/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Spin, Card, Empty, Button, Tag, Divider, Modal, Form, Input, Typography, Avatar, Drawer, Badge, List } from 'antd';
import { EnvironmentOutlined, CalendarOutlined, DownloadOutlined, RocketOutlined, CrownOutlined, CheckCircleFilled, UserOutlined, MailOutlined, SettingOutlined, AppstoreOutlined, ArrowRightOutlined, EyeOutlined, BellOutlined, CheckOutlined } from '@ant-design/icons';

const { Title, Text: AntText } = Typography;

export default function Dashboard() {
  const { user, loading: authLoading, setUser } = useAuth();
  const router = useRouter();

  const [activeBooking, setActiveBooking] = useState(null);
  const [isQRModalVisible, setIsQRModalVisible] = useState(false);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [profileForm] = Form.useForm();

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

  const { data: notificationData, refetch: refetchNotifications } = useQuery(GET_MY_NOTIFICATIONS, {
    skip: !user, fetchPolicy: 'cache-and-network'
  });

  const { data: unreadCountData, refetch: refetchUnreadCount } = useQuery(UNREAD_NOTIFICATION_COUNT, {
    skip: !user, fetchPolicy: 'cache-and-network', pollInterval: 30000 // Poll every 30s
  });

  const [updateProfile, { loading: updating }] = useMutation(UPDATE_PROFILE);
  const [cancel] = useMutation(CANCEL_BOOKING);
  const [markRead] = useMutation(MARK_NOTIFICATION_AS_READ);
  const [markAllRead] = useMutation(MARK_ALL_NOTIFICATIONS_AS_READ);

  const handleMarkRead = async (id) => {
    try {
      await markRead({ variables: { id } });
      refetchNotifications();
      refetchUnreadCount();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      toast.success('All notifications marked as read');
      refetchNotifications();
      refetchUnreadCount();
    } catch (e) {
      toast.error(e.message);
    }
  };

  useEffect(() => {
    if (user && isProfileModalVisible) {
      profileForm.setFieldsValue({ name: user.name, email: user.email });
    }
  }, [user, isProfileModalVisible]);

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

  const handleProfileSubmit = async (values) => {
    try {
      const { data } = await updateProfile({ variables: values });
      setUser({ ...user, name: data.updateProfile.name, email: data.updateProfile.email });
      toast.success('Profile updated successfully! ✨');
      setIsProfileModalVisible(false);
    } catch (e) {
      toast.error(e.message);
    }
  };

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

  const showBigQR = (booking) => {
    setActiveBooking(booking);
    setIsQRModalVisible(true);
  };

  const bookings = bookingData?.myBookings || [];

  const handleOpenDrawer = () => {
    setIsDrawerVisible(true);
    refetchNotifications();
  };

  return (
    <>
      <Head><title>Dashboard | EventHub</title></Head>
      <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* PROFILE UPDATE MODAL */}
        <Modal
          title={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><SettingOutlined /> Update Your Profile</div>}
          open={isProfileModalVisible}
          onCancel={() => setIsProfileModalVisible(false)}
          footer={null}
          centered
        >
          <Form form={profileForm} layout="vertical" onFinish={handleProfileSubmit} style={{ marginTop: '20px' }}>
            <Form.Item name="name" label="Full Name" rules={[{ required: true, message: 'Please enter your name' }]}>
              <Input prefix={<UserOutlined />} size="large" placeholder="Your Name" />
            </Form.Item>
            <Form.Item name="email" label="Email Address" rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}>
              <Input prefix={<MailOutlined />} size="large" placeholder="Email Address" />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={updating} style={{ height: '50px', borderRadius: '12px' }}>
              Save Changes
            </Button>
          </Form>
        </Modal>

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

        {/* NOTIFICATIONS DRAWER */}
        <Drawer
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>Notifications</span>
              <Button type="text" onClick={handleMarkAllRead} style={{ color: 'var(--primary-color)', fontWeight: 700 }}>Mark all as read</Button>
            </div>
          }
          placement="right"
          onClose={() => setIsDrawerVisible(false)}
          open={isDrawerVisible}
          styles={{ header: { borderBottom: '1px solid var(--glass-border)' }, body: { padding: '16px', background: '#F9FAFB' }, wrapper: { width: 400 } }}
        >
          <List
            dataSource={notificationData?.myNotifications || []}
            locale={{ emptyText: <Empty description="No notifications found" /> }}
            renderItem={(item) => (
              <div
                key={item.id}
                style={{
                  background: item.read ? '#FFFFFF' : 'rgba(67, 56, 202, 0.08)',
                  borderRadius: '16px',
                  padding: '16px',
                  marginBottom: '12px',
                  border: '1px solid',
                  borderColor: item.read ? '#E5E7EB' : 'rgba(67, 56, 202, 0.2)',
                  boxShadow: item.read ? 'none' : '0 4px 12px rgba(67, 56, 202, 0.05)',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: item.read ? '#F3F4F6' : 'linear-gradient(135deg, rgb(49, 46, 129) 0%, rgb(67, 56, 202) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: item.read ? '#9CA3AF' : 'white',
                    flexShrink: 0
                  }}>
                    {item.type === 'BOOKING_CONFIRMED' ? <CrownOutlined /> : <BellOutlined />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.4, marginBottom: '4px' }}>
                      {item.message}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>
                      {new Date(parseInt(item.createdAt) || item.createdAt).toLocaleString()}
                    </div>
                    {!item.read && (
                      <Button
                        size="small"
                        icon={<CheckOutlined />}
                        onClick={() => handleMarkRead(item.id)}
                        style={{ borderRadius: '100px', fontWeight: 600, fontSize: '0.75rem', background: 'white', color: 'var(--primary-color)', border: '1px solid var(--primary-color)' }}
                      >
                        Mark as read
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          />
        </Drawer>

        {/* EVENTHUB HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 800, color: '#1B2A4E', letterSpacing: '-0.5px' }}>Dashboard</h1>
            <p style={{ color: '#6B7280', margin: '4px 0 0 0', fontSize: '1rem' }}>Hello {user?.name}, welcome back!</p>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Badge count={unreadCountData?.unreadNotificationCount || 0} offset={[-2, 6]}>
                <div
                  className="hover-bounce"
                  onClick={handleOpenDrawer}
                  style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, rgb(27, 42, 78) 0%, rgb(49, 46, 129) 50%, rgb(67, 56, 202) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(27, 42, 78, 0.3)' }}
                >
                  <BellOutlined style={{ fontSize: '20px' }} />
                </div>
              </Badge>
              <div className="hover-bounce" style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#1B2A4E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(27, 42, 78, 0.2)' }} onClick={() => setIsProfileModalVisible(true)}>
                <SettingOutlined />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '12px' }}>
              <Avatar size={44} style={{ background: '#E5E7EB', color: '#1B2A4E' }} icon={<UserOutlined />} />
              <div>
                <div style={{ fontWeight: 700, color: '#1B2A4E', fontSize: '0.95rem' }}>{user?.name || 'Orlando Laurentius'}</div>
                <div style={{ color: '#6B7280', fontSize: '0.8rem', textTransform: 'capitalize' }}>{user?.role?.toLowerCase() || 'User'}</div>
              </div>
            </div>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '24px' }}>
              {/* LEFT COLUMN: Main Dashboard Content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* TOP KPI CARDS ROW */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.8fr)', gap: '24px' }}>
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
                        <div style={{ color: '#1B2A4E', fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>${totalRevenue.toLocaleString()}</div>
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
                          <Bar dataKey="p" fill="rgba(67, 56, 202, 0.15)" radius={[6, 6, 6, 6]} barSize={12} name="Profit Est ($)" />
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                  {myEventsData?.myEvents.slice(0, 3).map(e => (
                    <div key={e.id} className="hover-bounce" style={{ background: '#FFF', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', padding: '16px' }}>
                      <div style={{ position: 'relative', height: '140px', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px', background: `url(${e.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87'}) center/cover` }}>
                        <Tag style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(255,255,255,0.9)', color: '#1B2A4E', border: 'none', borderRadius: '100px', fontWeight: 700, padding: '4px 12px', textTransform: 'capitalize' }}>{e.category || 'Event'}</Tag>
                      </div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800, color: '#1B2A4E' }}>{e.title}</h4>
                      <div style={{ color: '#6B7280', fontSize: '0.85rem', marginBottom: '16px' }}>{e.location}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CalendarOutlined /> {new Date(parseInt(e.date) || e.date).toLocaleDateString()}</div>
                        <div style={{ color: 'rgb(67, 56, 202)', fontWeight: 800, fontSize: '1rem' }}>$ {e.ticketTypes?.[0]?.price || 30}</div>
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
        })() : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '40px', background: 'linear-gradient(135deg, #1B2A4E 0%, #312E81 50%, #4338CA 100%)', borderRadius: '24px', boxShadow: '0 20px 40px rgba(49, 46, 129, 0.2)', color: 'white' }}>
              <div>
                <h2 style={{ margin: '0 0 8px 0', fontWeight: 900, fontSize: '2.5rem', letterSpacing: '-0.5px' }}>Digital Pass Wallet</h2>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem' }}>Master access to all your booked experiences & passes seamlessly.</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1 }}>{bookings.length}</div>
                <div style={{ color: 'rgb(67, 56, 202)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '2px', marginTop: '4px' }}>Active Passes</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#1B2A4E', fontWeight: 800, fontSize: '1.4rem' }}>Recent Bookings</h3>
              <Button type="text" onClick={() => router.push('/browse')} style={{ color: 'rgb(67, 56, 202)', fontWeight: 700 }}>Browse Events</Button>
            </div>

            {bookings.length === 0 ? (
              <div style={{ padding: '60px 40px', textAlign: 'center', background: '#FFF', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px dashed #E5E7EB' }}>
                <div style={{ fontSize: '4rem', marginBottom: '16px', opacity: 0.5 }}>🎫</div>
                <h3 style={{ color: '#1B2A4E', fontWeight: 800, fontSize: '1.5rem', marginBottom: '8px' }}>No passes found</h3>
                <p style={{ color: '#6B7280', fontWeight: 600, fontSize: '1rem', marginBottom: '24px' }}>You have not booked any event passes yet. Ready to experience something new?</p>
                <Button type="primary" onClick={() => router.push('/browse')} style={{ background: 'linear-gradient(135deg, rgb(49, 46, 129) 0%, rgb(67, 56, 202) 100%)', borderRadius: '100px', padding: '0 32px', fontWeight: 700, height: '48px', border: 'none', boxShadow: '0 4px 12px rgba(49, 46, 129, 0.3)' }}>Explore Trending Events</Button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '24px' }}>
                {bookings.map(b => (
                  <div key={b.id} style={{ background: '#FFFFFF', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ background: '#1B2A4E', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 800, color: '#9CA3AF', letterSpacing: '1px', fontSize: '0.75rem', textTransform: 'uppercase' }}>VIP Pass</p>
                        <h3 style={{ margin: '4px 0 0 0', color: 'white', fontSize: '1.3rem', fontWeight: 900 }}>{b.event.title}</h3>
                      </div>
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(49, 46, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgb(67, 56, 202)', fontSize: '1.2rem' }}>
                        <CrownOutlined />
                      </div>
                    </div>

                    <div style={{ padding: '24px', display: 'flex', gap: '20px', flex: 1 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <CalendarOutlined style={{ color: '#9CA3AF' }} />
                          <span style={{ color: '#4B5563', fontWeight: 600, fontSize: '0.9rem' }}>{new Date(parseInt(b.event.date) || b.event.date).toLocaleDateString()}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '20px' }}>
                          <EnvironmentOutlined style={{ color: '#9CA3AF', marginTop: '2px' }} />
                          <span style={{ color: '#4B5563', fontWeight: 600, fontSize: '0.9rem' }}>{b.event.location}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <Tag style={{ borderRadius: '100px', border: 'none', background: 'rgba(67, 56, 202, 0.08)', color: 'rgb(67, 56, 202)', fontWeight: 700, margin: 0, padding: '4px 12px' }}>{b.ticketType}</Tag>
                          <Tag style={{ borderRadius: '100px', border: 'none', background: '#F3F4F6', color: '#4B5563', fontWeight: 700, padding: '4px 12px' }}>Qty: {b.quantity}</Tag>
                        </div>
                      </div>

                      <div style={{ width: '80px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{ padding: '8px', background: '#F8F9FB', borderRadius: '12px', border: '1px solid #E5E7EB', cursor: 'pointer' }}
                          onClick={() => showBigQR(b)}
                          title="Click to Enlarge QR"
                        >
                          <img src={b.qrCode} style={{ width: '64px', height: '64px', display: 'block', borderRadius: '8px' }} alt="QR" />
                        </div>
                      </div>
                    </div>

                    <div align="center" style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', background: '#F9FAFB', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                      <Button icon={<DownloadOutlined />} onClick={() => downloadTicket(b)} style={{ borderRadius: '100px', background: '#FFFFFF', color: '#1B2A4E', fontWeight: 600, padding: '0 24px', height: '40px', border: '1px solid #E5E7EB' }}>
                        Download PDF
                      </Button>
                      <Button danger type="text" onClick={() => handleCancel(b.id)} style={{ borderRadius: '100px', fontWeight: 600, padding: '0 24px', height: '40px' }}>
                        Cancel
                      </Button>
                      {/* HIDDEN PDF TEMPLATE STAYS OUTSIDE THE NORMAL FLOW */}
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
                          <div style={{ padding: '60px 50px', flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
                              <div>
                                <p style={{ color: '#6366F1', fontWeight: '700', textTransform: 'uppercase', fontSize: '1rem', letterSpacing: '1px', marginBottom: '12px' }}>Guest Holder</p>
                                <h2 style={{ fontSize: '3rem', fontWeight: '800', color: '#1E293B', margin: 0, lineHeight: 1.1 }}>{user.name || 'SaaS User'}</h2>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
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
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: 'auto' }}>
                                <div>
                                  <p style={{ color: '#6366F1', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px', marginBottom: '8px' }}>Ticket Tier</p>
                                  <p style={{ fontSize: '1.6rem', fontWeight: '800', color: '#4F46E5', margin: 0 }}>{b.ticketType || 'Silver'}</p>
                                </div>
                                <div>
                                  <p style={{ color: '#6366F1', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px', marginBottom: '8px' }}>Order Total</p>
                                  <p style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1E293B', margin: 0 }}>${b.amountPaid || 0} <span style={{ fontSize: '1rem', fontWeight: '600', color: '#64748B' }}>USD</span></p>
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
}
