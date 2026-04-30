import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_EVENT_DETAILS, GET_MY_BOOKINGS, CANCEL_BOOKING, CREATE_CHECKOUT_SESSION, JOIN_WAITLIST, VALIDATE_PROMO_CODE, DELETE_EVENT } from '@/features/events/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import Head from 'next/head';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import {
  Card, Tag, Button, Spin, Descriptions, Divider,
  Table, Row, Col, Statistic, Empty, Typography, Space, Tooltip,
  Select, InputNumber, Popconfirm, Rate, List, Avatar, Input,
  Tabs, Badge, Progress,
  Dropdown
} from 'antd';
import {
  CalendarOutlined, EnvironmentOutlined, TeamOutlined, ShopOutlined, UserOutlined,
  MailOutlined, CheckCircleOutlined, CheckCircleFilled,
  CloseCircleOutlined, DownloadOutlined, StarFilled, SearchOutlined, FilterOutlined,
  ShareAltOutlined, WhatsAppOutlined, TwitterOutlined, LinkedinOutlined, LinkOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  EditOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  GlobalOutlined,
  FireOutlined,
  FacebookOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { IndianRupeeIcon, MapPin, Calendar, Users, Briefcase, Star, Info, CreditCard, Ticket } from 'lucide-react';

const { Title: AntTitle, Text: AntText, Paragraph } = Typography;

export default function EventDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading } = useAuth();

  const { data, loading, error, refetch: refetchEvent } = useQuery(GET_EVENT_DETAILS, {
    variables: { id },
    skip: !id || authLoading
  });

  const { data: bookingData, refetch: refetchBookings } = useQuery(GET_MY_BOOKINGS, {
    fetchPolicy: 'network-only',
    skip: !user
  });

  const [bookingOptions, setBookingOptions] = useState({ ticketType: '', quantity: 1 });
  const [attendeeSearchText, setAttendeeSearchText] = useState('');
  const [attendeeStatusFilter, setAttendeeStatusFilter] = useState('ALL');
  const [vendorSearchText, setVendorSearchText] = useState('');
  const [createCheckout, { loading: sessionLoading }] = useMutation(CREATE_CHECKOUT_SESSION);
  const [cancelBooking] = useMutation(CANCEL_BOOKING);
  const [joinWaitlist, { loading: waitlistLoading }] = useMutation(JOIN_WAITLIST);
  const [deleteEvent] = useMutation(DELETE_EVENT);

  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  const { refetch: validatePromoQuery } = useQuery(VALIDATE_PROMO_CODE, {
    variables: { code: promoCodeInput, eventId: id },
    skip: true
  });

  if (authLoading || loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '20px' }}>
      <div style={{
        width: '64px', height: '64px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
        animation: 'pulse-glow 2s ease-in-out infinite',
        boxShadow: '0 0 30px rgba(99, 102, 241, 0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <ThunderboltOutlined style={{ fontSize: '32px', color: 'white' }} />
      </div>
      <span style={{ color: '#6366f1', fontWeight: 600, fontSize: '1.1rem', letterSpacing: '0.5px' }}>Crafting Event Experience...</span>
      <style jsx>{`
        @keyframes pulse-glow {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
  if (error) return <div style={{ padding: '2rem' }}><Empty description="Error loading event details" /></div>;

  const event = data?.event;
  if (!event) return <div style={{ padding: '2rem' }}><Empty description="Event not found" /></div>;

  const isOwner = user?.id === event.organizer?.id || user?.role === 'ADMIN';
  const myBookings = bookingData?.myBookings || [];
  const myBookedEventIds = myBookings.map(b => b.event.id);
  const isBooked = myBookedEventIds.includes(event.id);

  const handleCheckout = async () => {
    const remaining = event?.capacity - (event?.bookedCount || 0);
    if (bookingOptions.quantity > remaining) {
      return toast.error(`Sorry, only ${remaining} tickets are left!`);
    }
    try {
      const ticketTypeToUse = bookingOptions.ticketType || event.ticketTypes?.[0]?.name;
      const { data } = await createCheckout({
        variables: {
          eventId: event.id,
          ticketType: ticketTypeToUse,
          quantity: bookingOptions.quantity,
          promoCode: appliedPromo?.code
        }
      });
      window.location.href = data.createCheckoutSession;
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleCancel = async () => {
    const booking = myBookings.find(b => b.event.id === event.id);
    if (!booking) return;
    try {
      await cancelBooking({ variables: { id: booking.id } });
      toast.success('Reservation cancelled successfully');
      refetchBookings();
      refetchEvent();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleAddToCalendar = () => {
    const title = event.title;
    const desc = event.description;
    const loc = event.location;
    const startDate = dayjs(isNaN(Number(event.date)) ? event.date : Number(event.date)).format('YYYYMMDDTHHmmss');
    const endDate = dayjs(isNaN(Number(event.date)) ? event.date : Number(event.date)).add(2, 'hour').format('YYYYMMDDTHHmmss');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${desc}`,
      `LOCATION:${loc}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    saveAs(blob, `${title.replace(/\s+/g, '_')}.ics`);
    toast.success('Event saved to Calendar! 📅');
  };

  const handleJoinWaitlist = async () => {
    try {
      await joinWaitlist({ variables: { eventId: event.id } });
      toast.success("You've been added to the waitlist! We'll notify you if a spot opens up.");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCodeInput) return;
    try {
      setIsValidatingPromo(true);
      const { data: promoData } = await validatePromoQuery({
        code: promoCodeInput,
        eventId: event.id
      });

      if (promoData?.validatePromoCode) {
        setAppliedPromo(promoData.validatePromoCode);
        toast.success(`Promo code "${promoCodeInput.toUpperCase()}" applied!`);
      }
    } catch (e) {
      toast.error(e.message);
      setAppliedPromo(null);
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleDeleteEvent = async () => {
    try {
      await deleteEvent({ variables: { id: event.id } });
      toast.success('Event cancelled and deleted successfully');
      router.push('/my-events');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleEditEvent = () => {
    router.push(`/events/create?id=${event.id}`);
  };

  const handleShare = () => {
    // Shared via dropdown menu
  };

  const shareMenuItems = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: <WhatsAppOutlined style={{ color: '#25D366' }} />,
      onClick: () => window.open(`https://wa.me/?text=${encodeURIComponent(`${event.title} - Check it out at: ${window.location.href}`)}`, 'whatsapp-share-dialog', 'width=600,height=600')
    },
    {
      key: 'facebook',
      label: 'Facebook',
      icon: <FacebookOutlined style={{ color: '#1877F2' }} />,
      onClick: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, 'facebook-share-dialog', 'width=626,height=436')
    },
    {
      key: 'linkedin',
      label: 'LinkedIn',
      icon: <LinkedinOutlined style={{ color: '#0A66C2' }} />,
      onClick: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, 'linkedin-share-dialog', 'width=600,height=600')
    },
    {
      key: 'twitter',
      label: 'Twitter (X)',
      icon: <TwitterOutlined style={{ color: '#1DA1F2' }} />,
      onClick: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(event.title)}&url=${encodeURIComponent(window.location.href)}`, 'twitter-share-dialog', 'width=600,height=600')
    },
    { type: 'divider' },
    {
      key: 'copy',
      label: 'Copy Link',
      icon: <LinkOutlined />,
      onClick: () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard! 📋');
      }
    }
  ];

  const handleEmailOrganizer = () => {
    window.location.href = `mailto:${event.organizer?.email}?subject=Inquiry about ${event.title}`;
  };

  const totalRevenue = event.attendees?.reduce((acc, curr) => acc + (curr.status === 'CONFIRMED' || curr.status === 'CHECKED_IN' ? curr.amountPaid : 0), 0) || 0;
  const ticketsSold = event.bookedCount || 0;
  const occupancyRate = Math.min(100, Math.round((ticketsSold / (event.capacity || 100)) * 100));

  const attendeeColumns = [
    {
      title: 'Attendee',
      key: 'user',
      render: (_, record) => (
        <Space size={12}>
          <Avatar size={40} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${record.user.name}`} style={{ border: '2px solid #eef2ff' }} />
          <div>
            <AntText strong style={{ color: '#1e293b', display: 'block' }}>{record.user.name}</AntText>
            <AntText style={{ fontSize: '12px', color: '#64748b' }}>{record.user.email}</AntText>
          </div>
        </Space>
      )
    },
    {
      title: 'Tier',
      dataIndex: 'ticketType',
      key: 'ticketType',
      render: (type) => <Tag color="blue" style={{ borderRadius: '6px', fontWeight: 600 }}>{type}</Tag>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge status={status === 'CONFIRMED' ? 'success' : status === 'CHECKED_IN' ? 'processing' : 'error'} text={status} style={{ fontWeight: 600, color: status === 'CONFIRMED' ? '#10b981' : '#6366f1' }} />
      )
    },
    {
      title: 'Revenue',
      dataIndex: 'amountPaid',
      key: 'amountPaid',
      render: (amt) => <AntText strong style={{ color: '#0f172a' }}>₹{Number(amt).toLocaleString()}</AntText>
    }
  ];

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendees');
    worksheet.columns = [
      { header: 'Pass ID', key: 'id', width: 25 },
      { header: 'Guest Name', key: 'name', width: 25 },
      { header: 'Email Address', key: 'email', width: 30 },
      { header: 'Ticket Type', key: 'ticket', width: 15 },
      { header: 'Status', key: 'status', width: 15 }
    ];
    event.attendees?.forEach(a => {
      worksheet.addRow({ id: a.id.toUpperCase(), name: a.user.name, email: a.user.email, ticket: a.ticketType, status: a.status });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${event.title.replace(/\s+/g, '_')}_Attendees.xlsx`);
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#f8fafc', paddingBottom: '80px' }}>
      <Head><title>{event.title} | Premium Event Experience</title></Head>

      {/* STUNNING HERO SECTION */}
      <div style={{ position: 'relative', width: '100%', height: '70vh', minHeight: '600px', overflow: 'hidden', borderRadius: '24px', boxShadow: '0 20px 40px rgba(49, 46, 129, 0.2)' }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `url(${event.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87'}) center/cover no-repeat`,
          transform: 'scale(1.05)',
          filter: 'brightness(0.5) blur(2px)',
          transition: 'all 0.5s ease'
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, transparent 0%, rgba(15, 23, 42, 0.9) 100%)',
          zIndex: 10
        }} />

        {/* FLOATING NAVIGATION & ACTIONS */}
        <div style={{ position: 'absolute', top: '40px', left: '40px', right: '40px', display: 'flex', justifyContent: 'end', alignItems: 'center', zIndex: 50 }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Tooltip title="Add to Calendar">
              <Button
                shape="circle"
                size="large"
                icon={<CalendarOutlined style={{ color: "white" }} />}
                onClick={handleAddToCalendar}
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              />
            </Tooltip>
            <Dropdown menu={{ items: shareMenuItems }} placement="bottomRight" arrow>
              <Tooltip title="Share Event">
                <Button
                  shape="circle"
                  size="large"
                  icon={<ShareAltOutlined style={{ color: "white" }} />}
                  style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                />
              </Tooltip>
            </Dropdown>
            <Tooltip title="Email Organizer">
              <Button
                shape="circle"
                size="large"
                icon={<MailOutlined style={{ color: "white" }} />}
                onClick={handleEmailOrganizer}
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              />
            </Tooltip>
          </div>
        </div>

        <div style={{
          position: 'relative',
          maxWidth: '1200px',
          height: '100%',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          paddingBottom: '80px'
        }}>
          <Space direction="vertical" size={24} style={{ maxWidth: '800px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <Tag color="blue" style={{ borderRadius: '100px', padding: '6px 20px', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', border: 'none', background: 'rgba(99, 102, 241, 0.3)', backdropFilter: 'blur(10px)', color: '#fff' }}>
                {event.eventType}
              </Tag>
              {isBooked && (
                <Tag color="success" style={{ borderRadius: '100px', padding: '6px 20px', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', border: 'none', background: 'rgba(34, 197, 94, 0.3)', backdropFilter: 'blur(10px)', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircleFilled /> Registered
                </Tag>
              )}
              {isOwner && <Tag color="gold" style={{ borderRadius: '100px', padding: '6px 20px', fontSize: '0.85rem', fontWeight: 800, border: 'none', background: 'rgba(245, 158, 11, 0.2)', backdropFilter: 'blur(10px)', color: '#fff' }}>Organizer View</Tag>}
            </div>

            <h1 style={{
              color: '#fff',
              fontSize: 'clamp(3rem, 8vw, 5rem)',
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-2px',
              margin: 0,
              textShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}>
              {event.title}
            </h1>

            <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#fff' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                  <Calendar size={24} />
                </div>
                <div>
                  <AntText style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Date & Time</AntText>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{dayjs(isNaN(Number(event.date)) ? event.date : Number(event.date)).format('ddd, MMM D • h:mm A')}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#fff' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                  <MapPin size={24} />
                </div>
                <div>
                  <AntText style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Location</AntText>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{event.location}</div>
                </div>
              </div>
            </div>
          </Space>
        </div>
      </div>

      {/* CONTENT GRID */}
      <div style={{ maxWidth: '1200px', margin: '-60px auto 0', padding: '0 24px', position: 'relative', zIndex: 10 }}>
        <Row gutter={[32, 32]}>
          <Col xs={24} lg={16}>
            <Card style={{ borderRadius: '24px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', padding: '12px' }}>
              <Tabs
                defaultActiveKey="1"
                className="modern-tabs"
                items={[
                  {
                    key: '1',
                    label: <Space><Info size={18} /> Details</Space>,
                    children: (
                      <div style={{ padding: '24px 0' }}>
                        <AntTitle level={4} style={{ color: '#0f172a', fontWeight: 800, marginBottom: '20px' }}>About this event</AntTitle>
                        <Paragraph style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#475569' }}>
                          {event.description}
                        </Paragraph>

                        <Divider />

                        <AntTitle level={4} style={{ color: '#0f172a', fontWeight: 800, marginBottom: '20px' }}>Event Features</AntTitle>
                        <Row gutter={[16, 16]}>
                          {(event.features && event.features.length > 0 ? event.features.map(f => {
                            const featureMap = {
                              'VIP_ACCESS': { icon: <FireOutlined />, label: 'VIP Access Available', color: '#f43f5e' },
                              'NETWORKING': { icon: <GlobalOutlined />, label: 'Networking Sessions', color: '#6366f1' },
                              'LIVE_QA': { icon: <ThunderboltOutlined />, label: 'Live Q&A', color: '#f59e0b' },
                              'DIGITAL_COLLECTIBLES': { icon: <Ticket size={20} />, label: 'Digital Collectibles', color: '#10b981' }
                            };
                            return featureMap[f] || { icon: <Info size={18} />, label: f.replace(/_/g, ' '), color: '#64748b' };
                          }) : [
                            { icon: <FireOutlined />, label: 'VIP Access Available', color: '#f43f5e' },
                            { icon: <GlobalOutlined />, label: 'Networking Sessions', color: '#6366f1' },
                            { icon: <ThunderboltOutlined />, label: 'Live Q&A', color: '#f59e0b' },
                            { icon: <Ticket size={20} />, label: 'Digital Collectibles', color: '#10b981' }
                          ]).map((feature, i) => (
                            <Col xs={24} sm={12} key={i}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                                <div style={{ color: feature.color, fontSize: '20px' }}>{feature.icon}</div>
                                <AntText strong style={{ color: '#334155' }}>{feature.label}</AntText>
                              </div>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    )
                  },
                  {
                    key: '2',
                    label: <Space><Star size={18} /> Reviews</Space>,
                    children: (
                      <div style={{ padding: '24px 0' }}>
                        <List
                          dataSource={event.feedbacks || []}
                          renderItem={(item) => (
                            <div style={{ padding: '20px', background: '#fff', borderRadius: '16px', border: '1px solid #f1f5f9', marginBottom: '16px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <Space size={12}>
                                  <Avatar src={`https://api.dicebear.com/7.x/initials/svg?seed=${item.user?.name}`} />
                                  <AntText strong>{item.user?.name}</AntText>
                                </Space>
                                <Rate disabled defaultValue={item.rating} style={{ fontSize: '12px' }} />
                              </div>
                              <AntText style={{ color: '#475569' }}>{item.comment}</AntText>
                            </div>
                          )}
                          locale={{ emptyText: <Empty description="Be the first to review!" /> }}
                        />
                      </div>
                    )
                  },
                  ...(isOwner ? [
                    {
                      key: '3',
                      label: <Space><Users size={18} /> Attendees ({event.attendees?.length || 0})</Space>,
                      children: (
                        <div style={{ padding: '24px 0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <Input
                              placeholder="Search by name or email..."
                              prefix={<SearchOutlined />}
                              style={{ maxWidth: '300px', borderRadius: '10px' }}
                              onChange={e => setAttendeeSearchText(e.target.value)}
                            />
                            <Button icon={<DownloadOutlined />} onClick={exportToExcel} style={{ borderRadius: '10px', fontWeight: 600 }}>Download Roster</Button>
                          </div>
                          <Table
                            dataSource={event.attendees || []}
                            columns={attendeeColumns}
                            rowKey="id"
                            pagination={{ pageSize: 5 }}
                          />
                        </div>
                      )
                    },
                    {
                      key: '4',
                      label: <Space><Briefcase size={18} /> Vendors ({event.vendors?.length || 0})</Space>,
                      children: (
                        <div style={{ padding: '24px 0' }}>
                          <Table
                            dataSource={event.vendors || []}
                            rowKey="id"
                            pagination={false}
                            columns={[
                              { title: 'Vendor', dataIndex: 'name', key: 'name', render: (t) => <AntText strong>{t}</AntText> },
                              { title: 'Category', dataIndex: 'category', key: 'category', render: (c) => <Tag color="blue">{c}</Tag> },
                              { title: 'Cost', dataIndex: 'cost', key: 'cost', render: (v) => <AntText strong>₹{v.toLocaleString()}</AntText> },
                              { title: 'Contact', dataIndex: 'contactInfo', key: 'contactInfo' }
                            ]}
                          />
                        </div>
                      )
                    }
                  ] : [])
                ]}
              />
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <div style={{ position: 'sticky', top: '24px' }}>
              {/* ACTION CARD */}
              {!isOwner && (
                <Card style={{
                  borderRadius: '32px',
                  border: 'none',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.06)',
                  overflow: 'hidden',
                  background: 'white'
                }} styles={{ body: { padding: 0 } }}>
                  <div style={{ padding: '32px' }}>
                    <AntTitle level={4} style={{ margin: 0, fontWeight: 800 }}>Tickets</AntTitle>
                    {!isBooked && <p style={{ color: '#64748b', marginBottom: '24px' }}>Choose your tier and join the experience</p>}

                    <Space direction="vertical" size={24} style={{ width: '100%' }}>
                      {!isBooked && (
                        <>
                          <div className="booking-control">
                            <AntText strong style={{ display: 'block', marginBottom: '8px', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase' }}>Select Category</AntText>
                            <Select
                              className="premium-select"
                              style={{ width: '100%', height: '56px' }}
                              value={bookingOptions.ticketType || event.ticketTypes?.[0]?.name}
                              onChange={(val) => setBookingOptions({ ...bookingOptions, ticketType: val })}
                              options={event.ticketTypes?.map(t => ({ label: `${t.name} - ₹${t.price}`, value: t.name }))}
                            />
                          </div>

                          <div className="booking-control">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <AntText strong style={{ color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase' }}>Quantity</AntText>
                              <AntText style={{ fontSize: '0.75rem', color: (event.capacity - (event.bookedCount || 0)) <= 3 ? '#ef4444' : '#64748b', fontWeight: 700 }}>
                                {event.capacity - (event.bookedCount || 0)} left
                              </AntText>
                            </div>
                            <InputNumber
                              min={1}
                              max={10}
                              status={bookingOptions.quantity > (event.capacity - (event.bookedCount || 0)) ? 'error' : ''}
                              style={{ width: '100%', height: '56px', borderRadius: '12px', display: 'flex', alignItems: 'center' }}
                              value={bookingOptions.quantity}
                              onChange={(val) => setBookingOptions({ ...bookingOptions, quantity: val })}
                            />
                          </div>

                          <div className="promo-section">
                            <AntText strong style={{ display: 'block', marginBottom: '8px', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase' }}>Promo Code</AntText>
                            <Space.Compact style={{ width: '100%' }}>
                              <Input
                                placeholder="Enter code"
                                value={promoCodeInput}
                                onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                                style={{ height: '44px', borderRadius: '12px 0 0 12px', marginRight: '10px' }}
                                disabled={!!appliedPromo}
                              />
                              <Button
                                type="primary"
                                onClick={appliedPromo ? () => { setAppliedPromo(null); setPromoCodeInput(''); } : handleApplyPromo}
                                loading={isValidatingPromo}
                                style={{ height: '44px', borderRadius: '0 12px 12px 0', background: appliedPromo ? '#ef4444' : '#6366f1' }}
                              >
                                {appliedPromo ? 'Remove' : 'Apply'}
                              </Button>
                            </Space.Compact>
                            {appliedPromo && (
                              <div style={{ marginTop: '8px' }}>
                                <Tag color="success" closable onClose={() => { setAppliedPromo(null); setPromoCodeInput(''); }} style={{ borderRadius: '6px' }}>
                                  {appliedPromo.code}: {appliedPromo.discountType === 'PERCENTAGE' ? `${appliedPromo.discountValue}% OFF` : `₹${appliedPromo.discountValue} OFF`}
                                </Tag>
                              </div>
                            )}
                          </div>

                          <div style={{ padding: '20px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <AntText strong style={{ color: '#64748b' }}>Total Investment</AntText>
                              <div style={{ textAlign: 'right' }}>
                                {appliedPromo && (
                                  <AntText delete style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem' }}>
                                    ₹{((event.ticketTypes?.find(t => t.name === (bookingOptions.ticketType || event.ticketTypes?.[0]?.name))?.price || 0) * bookingOptions.quantity).toLocaleString()}
                                  </AntText>
                                )}
                                <AntText style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>
                                  ₹{(() => {
                                    const basePrice = (event.ticketTypes?.find(t => t.name === (bookingOptions.ticketType || event.ticketTypes?.[0]?.name))?.price || 0) * bookingOptions.quantity;
                                    if (!appliedPromo) return basePrice.toLocaleString();
                                    const discount = appliedPromo.discountType === 'PERCENTAGE'
                                      ? basePrice * (appliedPromo.discountValue / 100)
                                      : appliedPromo.discountValue;
                                    return Math.max(0, basePrice - discount).toLocaleString();
                                  })()}
                                </AntText>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {isBooked ? (
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <div style={{
                            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                            border: '1px solid #22c55e',
                            borderRadius: '20px',
                            padding: '24px 16px',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 10px 15px -3px rgba(34, 197, 94, 0.1)'
                          }}>
                            <div style={{
                              width: '48px',
                              height: '48px',
                              background: '#22c55e',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '24px',
                              marginBottom: '4px',
                              boxShadow: '0 4px 10px rgba(34, 197, 94, 0.3)'
                            }}>
                              <CheckCircleFilled />
                            </div>
                            <AntText style={{ color: '#166534', fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.3px' }}>BOOKING CONFIRMED</AntText>
                            <AntText style={{ color: '#15803d', fontSize: '0.9rem', fontWeight: 500 }}>You're all set! We've sent your tickets to your email.</AntText>
                          </div>
                          <Popconfirm
                            title="Cancel your reservation?"
                            description="This action cannot be undone. Refund policy may apply."
                            onConfirm={handleCancel}
                            okText="Yes, Cancel"
                            cancelText="No, Keep it"
                          >
                            <Button
                              block
                              type="text"
                              danger
                              style={{
                                marginTop: '8px',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                opacity: 0.7
                              }}
                            >
                              Cancel Reservation
                            </Button>
                          </Popconfirm>
                        </Space>
                      ) : (event.capacity - (event.bookedCount || 0)) <= 0 ? (
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Button
                            block
                            disabled
                            style={{
                              height: '60px',
                              borderRadius: '16px',
                              background: '#F1F5F9',
                              color: '#94A3B8',
                              border: '1px solid #E2E8F0',
                              fontWeight: 800
                            }}
                          >
                            <CloseCircleOutlined /> SOLD OUT
                          </Button>
                          <Button
                            block
                            loading={waitlistLoading}
                            onClick={handleJoinWaitlist}
                            disabled={event.isOnWaitlist}
                            style={{
                              height: '50px',
                              borderRadius: '12px',
                              background: event.isOnWaitlist ? '#f8fafc' : 'rgba(99, 102, 241, 0.1)',
                              color: event.isOnWaitlist ? '#94a3b8' : '#6366f1',
                              border: event.isOnWaitlist ? '1px solid #e2e8f0' : '1px dashed #6366f1',
                              fontWeight: 700
                            }}
                          >
                            {event.isOnWaitlist ? (
                              <Space><CheckCircleOutlined /> ON WAITLIST</Space>
                            ) : (
                              <Space><Users size={18} /> JOIN THE WAITLIST</Space>
                            )}
                          </Button>
                        </Space>
                      ) : (
                        <Button
                          block
                          type="primary"
                          loading={sessionLoading}
                          onClick={handleCheckout}
                          style={{
                            height: '60px',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            border: 'none',
                            fontWeight: 800,
                            fontSize: '1rem',
                            boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3)'
                          }}
                        >
                          RESERVE PASS NOW
                        </Button>
                      )}
                    </Space>
                  </div>

                </Card>
              )}
              {/* STATS CARD FOR ORGANIZER */}
              {isOwner && (
                <Card style={{ borderRadius: '32px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.04)', background: '#fff' }}>
                  <AntTitle level={5} style={{ marginBottom: '20px', fontWeight: 800 }}>Event Analytics</AntTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <AntText type="secondary" strong>Occupancy</AntText>
                        <AntText strong>{occupancyRate}%</AntText>
                      </div>
                      <Progress percent={occupancyRate} strokeColor={{ '0%': '#6366f1', '100%': '#a855f7' }} showInfo={false} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px', textAlign: 'center' }}>
                        <AntText type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Tickets Sold</AntText>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>{ticketsSold}</div>
                      </div>
                      <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px', textAlign: 'center' }}>
                        <AntText type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Waitlist</AntText>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f59e0b' }}>{event.waitlistCount || 0}</div>
                      </div>
                      <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px', textAlign: 'center' }}>
                        <AntText type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Revenue</AntText>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#10b981' }}>₹{totalRevenue >= 1000 ? (totalRevenue / 1000).toFixed(1) + 'k' : totalRevenue}</div>
                      </div>
                    </div>
                    <Button block icon={<EditOutlined />} onClick={handleEditEvent} style={{ borderRadius: '12px', height: '44px', fontWeight: 600 }}>Update Event</Button>
                    <Popconfirm title="Archive this event?" onConfirm={handleDeleteEvent}>
                      <Button block danger type="text" icon={<DeleteOutlined />}>Cancel & Delete</Button>
                    </Popconfirm>
                  </div>
                </Card>
              )}

              {/* MAP CARD */}
              <Card style={{ borderRadius: '32px', marginTop: '24px', border: 'none', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.04)' }} styles={{ body: { padding: 0 } }}>
                <div style={{ height: '240px' }}>
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(event.location)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                  ></iframe>
                </div>
                <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AntText strong style={{ maxWidth: '180px' }}>{event.location}</AntText>
                  <Button type="link" icon={<GlobalOutlined />} onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`, '_blank')}>Open Maps</Button>
                </div>
              </Card>
            </div>
          </Col>
        </Row>
      </div>

      <style jsx global>{`
        .modern-tabs .ant-tabs-nav {
          margin-bottom: 0 !important;
        }
        .modern-tabs .ant-tabs-tab {
          padding: 12px 20px !important;
          font-weight: 700 !important;
          font-size: 1rem !important;
          color: #64748b !important;
        }
        .modern-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #6366f1 !important;
        }
        .modern-tabs .ant-tabs-ink-bar {
          background: #6366f1 !important;
          height: 4px !important;
          border-radius: 4px 4px 0 0;
        }
        .premium-select .ant-select-selector {
          border-radius: 12px !important;
          border: 1px solid #e2e8f0 !important;
          height: 56px !important;
          display: flex !important;
          align-items: center !important;
          padding: 0 16px !important;
        }
        .booking-control .ant-input-number {
          padding: 8px 12px !important;
        }
      `}</style>
    </div>
  );
}
