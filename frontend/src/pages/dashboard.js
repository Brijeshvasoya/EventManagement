import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_MY_BOOKINGS, CANCEL_BOOKING, GET_MY_ANALYTICS, UPDATE_PROFILE, GET_MY_EVENTS } from '@/features/events/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Spin, Card, Empty, Button, Tag, Divider, Modal, Form, Input, Typography } from 'antd';
import { EnvironmentOutlined, CalendarOutlined, DownloadOutlined, RocketOutlined, CrownOutlined, CheckCircleFilled, UserOutlined, MailOutlined, SettingOutlined, AppstoreOutlined, ArrowRightOutlined, EyeOutlined } from '@ant-design/icons';

const { Title, Text: AntText } = Typography;

export default function Dashboard() {
  const { user, loading: authLoading, setUser } = useAuth();
  const router = useRouter();

  const [activeBooking, setActiveBooking] = useState(null);
  const [isQRModalVisible, setIsQRModalVisible] = useState(false);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
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

  const [updateProfile, { loading: updating }] = useMutation(UPDATE_PROFILE);
  const [cancel] = useMutation(CANCEL_BOOKING);

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
        background: 'linear-gradient(135deg, #7c5cfc 0%, #00d4aa 100%)',
        animation: 'pulse-glow 2s ease-in-out infinite',
        boxShadow: '0 12px 32px rgba(124, 92, 252, 0.3)'
      }} />
      <span style={{ color: '#a0a0b8', fontWeight: 500, fontSize: '0.95rem' }}>Entering Dashboard...</span>
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

  return (
    <>
      <Head><title>Dashboard Premium | EventHub</title></Head>
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', minHeight: '100vh' }}>

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
              background: 'linear-gradient(135deg, #7c5cfc 0%, #00d4aa 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              boxShadow: '0 8px 24px rgba(124, 92, 252, 0.3)'
            }}>
              <RocketOutlined style={{ fontSize: '1.6rem', color: 'white' }} />
            </div>
            <h2 style={{ fontSize: '1.6rem', color: '#f0f0f5', fontWeight: '800', marginBottom: '8px' }}>Fast-Pass Gate Entry</h2>
            {activeBooking?.qrCode && (
              <div style={{ 
                padding: '24px', 
                background: 'rgba(255,255,255,0.03)', 
                borderRadius: '28px', 
                display: 'inline-block', 
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 16px 32px rgba(0,0,0,0.2)'
              }}>
                <img src={activeBooking.qrCode} style={{ width: '260px', height: '260px', borderRadius: '16px' }} alt="QR" />
              </div>
            )}
            <div style={{ 
              marginTop: '28px', 
              padding: '16px 24px', 
              background: 'rgba(124, 92, 252, 0.06)', 
              borderRadius: '16px', 
              border: '1px solid rgba(124, 92, 252, 0.12)' 
            }}>
              <p style={{ margin: 0, fontWeight: '700', color: '#7c5cfc', fontSize: '1rem' }}>{activeBooking?.event.title}</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#6b6b80', fontFamily: 'monospace' }}>TICKET ID: #{activeBooking?.id.slice(-8).toUpperCase()}</p>
            </div>
          </div>
        </Modal>

        {/* HERO BANNER */}
        <div style={{
          marginBottom: '4rem',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 30%, #252545 60%, #1a1a3a 100%)',
          padding: '3.5rem 3.5rem',
          borderRadius: '32px',
          color: 'white',
          boxShadow: '0 24px 48px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          {/* Background orbs */}
          <div style={{ 
            position: 'absolute', top: '-30%', right: '-5%',
            width: '400px', height: '400px',
            background: 'radial-gradient(circle, rgba(124, 92, 252, 0.15) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />
          <div style={{ 
            position: 'absolute', bottom: '-40%', left: '10%',
            width: '300px', height: '300px',
            background: 'radial-gradient(circle, rgba(0, 212, 170, 0.1) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ position: 'absolute', top: '0', right: '0' }}>
              <Button
                shape="circle"
                size="large"
                icon={<SettingOutlined />}
                onClick={() => setIsProfileModalVisible(true)}
                style={{ 
                  background: 'rgba(255,255,255,0.06)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  color: 'white',
                  backdropFilter: 'blur(10px)'
                }}
              />
            </div>

            <div style={{
              display: 'inline-block',
              padding: '5px 14px',
              background: 'rgba(124, 92, 252, 0.15)',
              border: '1px solid rgba(124, 92, 252, 0.2)',
              borderRadius: '100px',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              marginBottom: '20px',
              color: '#a78bfa'
            }}>
              ⚡ Membership Dashboard
            </div>
            
            <h1 style={{ 
              color: 'white', 
              margin: '0 0 12px 0', 
              fontSize: '3.5rem', 
              fontWeight: '900', 
              lineHeight: 1.05, 
              letterSpacing: '-2px',
              maxWidth: '500px'
            }}>
              Hello, {user.name}!
            </h1>
            <p style={{ opacity: 0.6, fontSize: '1.15rem', marginTop: '0', fontWeight: '400', maxWidth: '400px', lineHeight: 1.5 }}>
              Manage your premium experiences and digital tickets.
            </p>
          </div>
        </div>

        {/* ANALYTICS & EVENT OVERVIEW (ORGANIZER ONLY) */}
        {isOrganizer && (
          <div style={{ marginBottom: '5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#f0f0f5', margin: 0, letterSpacing: '-0.5px' }}>Event Management</h2>
                <p style={{ color: '#6b6b80', margin: '4px 0 0 0', fontSize: '0.9rem' }}>Overview of your hosted events and revenue</p>
              </div>
              <Button type="primary" size="large" icon={<AppstoreOutlined />} onClick={() => router.push('/events/create')} style={{ borderRadius: '12px', height: '44px' }}>Create New Event</Button>
            </div>

            {analyticsData && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '3rem' }}>
                <Card style={{ 
                  borderRadius: '24px', 
                  padding: '8px',
                  background: 'rgba(22, 22, 35, 0.8)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(20px)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    position: 'absolute', top: '-20px', right: '-20px',
                    width: '120px', height: '120px',
                    background: 'radial-gradient(circle, rgba(0, 212, 170, 0.1) 0%, transparent 70%)',
                    borderRadius: '50%'
                  }} />
                  <p style={{ color: '#6b6b80', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1.5px', marginBottom: '8px' }}>Total Revenue</p>
                  <h2 style={{ 
                    fontSize: '2.8rem', fontWeight: '900', margin: '0 0 12px 0', 
                    background: 'linear-gradient(135deg, #00d4aa 0%, #00b890 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-1px'
                  }}>${analyticsData.myAnalytics.totalRevenue.toLocaleString()}</h2>
                  <Tag color="green"><CheckCircleFilled /> Net Earnings</Tag>
                </Card>

                <Card style={{ 
                  borderRadius: '24px', 
                  padding: '8px',
                  background: 'rgba(22, 22, 35, 0.8)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(20px)'
                }}>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={[{ n: 'Sold', c: analyticsData.myAnalytics.ticketsSold }, { n: 'Refund', c: analyticsData.myAnalytics.cancelledTickets }]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <Bar dataKey="c" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                      <XAxis dataKey="n" stroke="#6b6b80" fontSize={12} />
                      <YAxis stroke="#6b6b80" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          background: '#16162b', 
                          border: '1px solid rgba(255,255,255,0.08)', 
                          borderRadius: '12px',
                          color: '#f0f0f5'
                        }} 
                      />
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7c5cfc" />
                          <stop offset="100%" stopColor="#4da6ff" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            )}

            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#f0f0f5', marginBottom: '1.5rem', letterSpacing: '-0.3px' }}>My Hosted Events</h3>
            {eventsLoading ? <Spin /> : myEventsData?.myEvents.length === 0 ? (
              <div style={{ 
                padding: '4rem 2rem', 
                textAlign: 'center',
                background: 'rgba(22, 22, 35, 0.5)',
                borderRadius: '24px',
                border: '2px dashed rgba(255,255,255,0.06)'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px', opacity: 0.5 }}>📋</div>
                <p style={{ color: '#6b6b80', margin: 0 }}>You haven't hosted any events yet.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                {myEventsData.myEvents.map(e => (
                  <Card 
                    key={e.id} 
                    style={{ 
                      borderRadius: '20px', 
                      border: '1px solid rgba(255,255,255,0.06)',
                      background: 'rgba(22, 22, 35, 0.8)',
                      backdropFilter: 'blur(20px)',
                      transition: 'all 0.3s ease'
                    }}
                    actions={[
                      <Link href={`/events/${e.id}`} key="view">
                        <Button type="text" icon={<EyeOutlined />} style={{ color: '#7c5cfc', fontWeight: '600' }}>Manage & Analytics</Button>
                      </Link>
                    ]}
                  >
                    <Title level={4} style={{ margin: 0, color: '#f0f0f5' }}>{e.title}</Title>
                    <AntText style={{ color: '#6b6b80' }}><CalendarOutlined /> {new Date(parseInt(e.date) || e.date).toLocaleDateString()}</AntText>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TICKET WALLET SECTION */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#f0f0f5', margin: 0, letterSpacing: '-0.5px' }}>
                {isOrganizer ? 'My Personal Tickets' : '🎫 Ticket Wallet'}
              </h2>
              <p style={{ color: '#6b6b80', margin: '4px 0 0 0', fontSize: '0.9rem' }}>Your booked event passes</p>
            </div>
            {bookings.length > 0 && (
              <div style={{
                padding: '5px 14px',
                background: 'rgba(124, 92, 252, 0.08)',
                border: '1px solid rgba(124, 92, 252, 0.15)',
                borderRadius: '100px',
                color: '#7c5cfc',
                fontWeight: 700,
                fontSize: '0.8rem'
              }}>
                {bookings.length} active
              </div>
            )}
          </div>

          {bookings.length === 0 ? (
            <div style={{ 
              padding: '5rem 2rem', 
              textAlign: 'center',
              background: 'rgba(22, 22, 35, 0.5)',
              borderRadius: '24px',
              border: '2px dashed rgba(255,255,255,0.06)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px', opacity: 0.5 }}>🎫</div>
              <p style={{ color: '#6b6b80', margin: 0, fontSize: '1.05rem' }}>
                {isOrganizer ? "You haven't booked any external events." : "No tickets in your wallet."}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: '24px' }}>
              {bookings.map(b => (
                <div key={b.id} style={{ 
                  background: 'rgba(22, 22, 35, 0.8)', 
                  borderRadius: '24px', 
                  padding: '24px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)', 
                  display: 'flex', 
                  gap: '24px',
                  transition: 'all 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
                  animation: 'fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards'
                }}>
                
                {/* PDF TEMPLATE (Rich Designer Version) */}
                <div id={`ticket-rich-template-${b.id}`} style={{ position: 'fixed', top: '-10000px', left: '-10000px', width: '800px', background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
                  <div style={{ margin: '40px', border: '1px solid #E2E8F0', borderRadius: '60px', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.05)', minHeight: '1000px', display: 'flex', flexDirection: 'column' }}>
                    {/* Header with Gradient */}
                    <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)', padding: '60px 40px', color: 'white', textAlign: 'center', position: 'relative' }}>
                      <p style={{ textTransform: 'uppercase', letterSpacing: '6px', fontSize: '1.1rem', opacity: 0.8, marginBottom: '20px', fontWeight: '700' }}>Official Pass</p>
                      <h1 style={{ color: 'white', fontSize: '5rem', fontWeight: '950', margin: '0 0 20px 0', letterSpacing: '-3px', lineHeight: 1 }}>{b.event.title}</h1>
                      <div style={{ display: 'inline-block', padding: '12px 30px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                        <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: '600', opacity: 0.9 }}>Digital Ticket #{b.id.slice(-8).toUpperCase()}</p>
                      </div>
                      {/* Red Dot Decoration */}
                      <div style={{ width: '8px', height: '8px', background: '#EF4444', borderRadius: '50%', margin: '15px auto 0' }}></div>
                    </div>

                    {/* Content Section */}
                    <div style={{ padding: '60px 50px', flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px' }}>
                      {/* Left Column: Details */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
                        <div>
                          <p style={{ color: '#6366F1', fontWeight: '700', textTransform: 'uppercase', fontSize: '1rem', letterSpacing: '1px', marginBottom: '12px' }}>Guest Holder</p>
                          <h2 style={{ fontSize: '3rem', fontWeight: '800', color: '#1E293B', margin: 0, lineHeight: 1.1 }}>{user.name || 'Krishnam'}</h2>
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

                      {/* Right Column: QR Code */}
                      <div style={{ background: '#F8FAFC', borderRadius: '40px', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid #F1F5F9' }}>
                        <div style={{ background: 'white', padding: '25px', borderRadius: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                          <img src={b.qrCode} style={{ width: '280px', height: '280px' }} alt="QR" />
                        </div>
                        <p style={{ marginTop: '30px', textTransform: 'uppercase', letterSpacing: '3px', fontWeight: '900', color: '#1e1b4b', fontSize: '1rem' }}>Validate Access</p>
                      </div>
                    </div>

                    {/* Footer */}
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

                {/* Visible ticket card */}
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div 
                    style={{ 
                      padding: '14px', 
                      background: 'rgba(255,255,255,0.03)', 
                      borderRadius: '18px', 
                      cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.06)',
                      transition: 'all 0.3s ease'
                    }} 
                    onClick={() => showBigQR(b)}
                    onMouseOver={ev => ev.currentTarget.style.borderColor = 'rgba(124,92,252,0.2)'}
                    onMouseOut={ev => ev.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                  >
                    <img src={b.qrCode} style={{ width: '85px', borderRadius: '8px' }} />
                  </div>
                  <Tag color="purple" style={{ marginTop: '10px', borderRadius: '6px' }}>{b.ticketType}</Tag>
                </div>

                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.3rem', color: '#f0f0f5', margin: '0 0 8px 0', fontWeight: 700 }}>{b.event.title}</h3>
                  <p style={{ color: '#6b6b80', margin: 0. }}>
                    <EnvironmentOutlined style={{ color: '#00d4aa' }} /> {b.event.location}
                  </p>
                  <div style={{ marginTop: '18px', display: 'flex', gap: '10px' }}>
                    <Button 
                      type="primary" 
                      icon={<DownloadOutlined />} 
                      onClick={() => downloadTicket(b)}
                      style={{ borderRadius: '10px' }}
                    >PDF</Button>
                    <Button 
                      type="text" 
                      danger 
                      onClick={() => handleCancel(b.id)}
                      style={{ borderRadius: '10px' }}
                    >Cancel</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
