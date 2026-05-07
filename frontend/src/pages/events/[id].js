import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useSubscription } from '@apollo/client/react';
import { GET_EVENT_DETAILS, GET_MY_BOOKINGS, VALIDATE_PROMO_CODE, CHECK_IN_SUBSCRIPTION } from '@/features/events/graphql/queries';
import { CANCEL_BOOKING, CREATE_CHECKOUT_SESSION, JOIN_WAITLIST, DELETE_EVENT, CONFIRM_PAYMENT } from '@/features/events/graphql/mutations';
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
  FacebookOutlined,
  PlusOutlined,
  MinusOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { IndianRupeeIcon, MapPin, Calendar, Users, Briefcase, Star, Info, CreditCard, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';

const { Title: AntTitle, Text: AntText, Paragraph } = Typography;

// Animation Variants
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const heroContentVariants = {
  initial: { opacity: 0, y: 50 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }
  }
};

export default function EventDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading } = useAuth();

  const { data, loading, error, refetch: refetchEvent } = useQuery(GET_EVENT_DETAILS, {
    variables: { id },
    skip: !id || authLoading
  });

  const isOwner = user?.id === data?.event?.organizer?.id || user?.role === 'ADMIN';

  // Real-time Check-in Updates
  useSubscription(CHECK_IN_SUBSCRIPTION, {
    variables: { eventId: id },
    skip: !id || authLoading || loading || !isOwner,
    onData: ({ data: subData }) => {
      if (subData.data?.checkInUpdated) {
        refetchEvent();
        toast.success(`Live Update: ${subData.data.checkInUpdated.user.name} checked in! ⚡`, {
          icon: '🎫',
          duration: 3000
        });
      }
    }
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

  const [confirmPayment] = useMutation(CONFIRM_PAYMENT, {
    refetchQueries: [{ query: GET_EVENT_DETAILS, variables: { id: router.query.id } }],
    onCompleted: () => toast.success('Payment confirmed successfully! ✅'),
    onError: (err) => toast.error(err.message)
  });

  const handleConfirmPayment = async (bookingId) => {
    await confirmPayment({ variables: { bookingId } });
  };

  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  const { refetch: validatePromoQuery } = useQuery(VALIDATE_PROMO_CODE, {
    variables: { code: promoCodeInput, eventId: id },
    skip: true
  });

  if (authLoading || loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '20px' }}>
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.8, 1, 0.8]
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: '64px', height: '64px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          boxShadow: '0 0 30px rgba(99, 102, 241, 0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        <ThunderboltOutlined style={{ fontSize: '32px', color: 'white' }} />
      </motion.div>
      <span style={{ color: '#6366f1', fontWeight: 600, fontSize: '1.1rem', letterSpacing: '0.5px' }}>Crafting Event Experience...</span>
    </div>
  );
  if (error) return <div style={{ padding: '2rem' }}><Empty description="Error loading event details" /></div>;

  const event = data?.event;
  if (!event) return <div style={{ padding: '2rem' }}><Empty description="Event not found" /></div>;

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
        eventId: id
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

  const shareMenuItems = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: <WhatsAppOutlined style={{ color: '#25D366' }} />,
      onClick: () => window.open(`https://wa.me/?text=${encodeURIComponent(`${event.title}\n\n${window.location.href}`)}`, 'whatsapp-share-dialog', 'width=600,height=600')
    },
    {
      key: 'facebook',
      label: 'Facebook',
      icon: <FacebookOutlined style={{ color: '#1877F2' }} />,
      onClick: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${event.title}\n\n${window.location.href}`)}`, 'facebook-share-dialog', 'width=626,height=436')
    },
    {
      key: 'linkedin',
      label: 'LinkedIn',
      icon: <LinkedinOutlined style={{ color: '#0A66C2' }} />,
      onClick: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${event.title}\n\n${window.location.href}`)}`, 'linkedin-share-dialog', 'width=600,height=600')
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
      width: '45%',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar size={40} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${record.user.name}`} style={{ border: '2px solid #eef2ff', flexShrink: 0 }} />
          <div style={{ overflow: 'hidden' }}>
            <AntText strong style={{ color: '#0f172a', display: 'block', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{record.user.name}</AntText>
            <AntText style={{ fontSize: '11px', color: '#64748b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{record.user.email}</AntText>
          </div>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: '25%',
      align: 'center',
      render: (status, record) => {
        const statusConfigs = {
          'CONFIRMED': { bg: '#f0fdf4', dot: '#10b981', text: '#166534' },
          'PENDING': { bg: '#fffbeb', dot: '#f59e0b', text: '#92400e' },
          'CHECKED_IN': { bg: '#eef2ff', dot: '#6366f1', text: '#3730a3' },
          'CANCELLED': { bg: '#fef2f2', dot: '#ef4444', text: '#991b1b' },
          'default': { bg: '#f8fafc', dot: '#64748b', text: '#1e1b4b' }
        };
        const config = statusConfigs[status] || statusConfigs.default;
        
        // Dynamic label for group check-ins
        let label = status;
        if (status === 'CHECKED_IN' && record.quantity > 1) {
          label = `IN (${record.checkedInCount}/${record.quantity})`;
        } else if (status === 'CONFIRMED' && record.quantity > 1 && record.checkedInCount > 0) {
          label = `PARTIAL (${record.checkedInCount}/${record.quantity})`;
        }

        return (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '100px', background: config.bg }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: config.dot, flexShrink: 0 }} />
            <AntText style={{ fontWeight: 800, color: config.text, textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px' }}>
              {label}
            </AntText>
          </div>
        );
      }
    },
    {
      title: 'Action',
      key: 'action',
      width: '30%',
      align: 'right',
      render: (_, record) => {
        if (record.status === 'PENDING') {
          return (
            <Popconfirm
              title="Confirm Payment"
              onConfirm={() => handleConfirmPayment(record.id)}
              okText="Confirm"
              cancelText="No"
              okButtonProps={{ style: { background: '#10b981', border: 'none' } }}
            >
              <div
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)',
                  minWidth: '130px',
                  whiteSpace: 'nowrap'
                }}
              >
                Confirm Payment
              </div>
            </Popconfirm>
          );
        }
        if (record.status === 'CANCELLED') {
          return <AntText style={{ color: '#ef4444', fontSize: '10px', fontWeight: 800, paddingRight: '12px' }}>CANCELLED</AntText>;
        }
        if (record.status === 'CHECKED_IN') {
          const countText = record.quantity > 1 ? ` (${record.checkedInCount}/${record.quantity})` : '';
          return <AntText style={{ color: '#6366f1', fontSize: '10px', fontWeight: 800, paddingRight: '12px' }}>CHECKED IN{countText}</AntText>;
        }
        
        // Partial check-in but status still CONFIRMED
        if (record.status === 'CONFIRMED' && record.checkedInCount > 0 && record.quantity > 1) {
          return <AntText style={{ color: '#f59e0b', fontSize: '10px', fontWeight: 800, paddingRight: '12px' }}>PARTIAL IN ({record.checkedInCount}/{record.quantity})</AntText>;
        }

        return <AntText style={{ color: '#10b981', fontSize: '10px', fontWeight: 800, paddingRight: '12px' }}>PAID</AntText>;
      }
    }
  ];

  const attendanceStats = isOwner ? (
    <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
      <Card style={{ flex: '1 1 250px', borderRadius: '20px', background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)', border: 'none', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.1)' }}>
        <Statistic
          title={<span style={{ color: '#4338ca', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live Attendance</span>}
          value={event.checkedInCount || 0}
          suffix={<span style={{ fontSize: '0.9rem', color: '#6366f1', opacity: 0.8 }}>/ {event.bookedCount || 0}</span>}
          prefix={<TeamOutlined style={{ color: '#6366f1' }} />}
          valueStyle={{ color: '#1e1b4b', fontWeight: 800, fontSize: '1.8rem' }}
        />
        <Progress 
          percent={Math.round(((event.checkedInCount || 0) / (event.bookedCount || 1)) * 100)} 
          size="small" 
          status="active" 
          strokeColor="#6366f1"
          style={{ marginTop: '8px' }}
        />
      </Card>
      <Card style={{ flex: '1 1 250px', borderRadius: '20px', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: 'none', boxShadow: '0 4px 15px rgba(34, 197, 94, 0.1)' }}>
        <Statistic
          title={<span style={{ color: '#166534', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Revenue Realized</span>}
          value={totalRevenue}
          prefix={<IndianRupeeIcon size={20} style={{ color: '#22c55e', marginRight: '8px' }} />}
          valueStyle={{ color: '#064e3b', fontWeight: 800, fontSize: '1.8rem' }}
          formatter={val => `₹${val.toLocaleString()}`}
        />
        <div style={{ marginTop: '12px', color: '#166534', fontSize: '0.75rem', fontWeight: 600 }}>
          From {event.bookedCount || 0} confirmed tickets
        </div>
      </Card>
    </div>
  ) : null;


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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        style={{ position: 'relative', width: '100%', height: '70vh', minHeight: '600px', overflow: 'hidden', borderRadius: '40px 40px 40px 40px', boxShadow: '0 20px 40px rgba(49, 46, 129, 0.2)' }}
      >
        <motion.div
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{
            position: 'absolute',
            inset: 0,
            background: `url(${event.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87'}) center/cover no-repeat`,
            filter: 'brightness(0.5) blur(2px)',
            transition: 'all 0.5s ease'
          }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, transparent 0%, rgba(15, 23, 42, 0.9) 100%)',
          zIndex: 10
        }} />

        {/* FLOATING NAVIGATION & ACTIONS */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{ position: 'absolute', top: '40px', left: '40px', right: '40px', display: 'flex', justifyContent: 'end', alignItems: 'center', zIndex: 50 }}
        >
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
            <Dropdown menu={{ items: shareMenuItems }} placement="bottom" arrow>
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
        </motion.div>

        <motion.div
          variants={heroContentVariants}
          style={{
            position: 'relative',
            maxWidth: '1300px',
            height: '100%',
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            paddingBottom: '80px',
            zIndex: 20
          }}
        >
          <Space orientation="vertical" size={24} style={{ maxWidth: '800px' }}>
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
        </motion.div>
      </motion.div>

      {/* CONTENT GRID */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: false, amount: 0.1 }}
        style={{ maxWidth: '1300px', margin: '-60px auto 0', padding: '0 24px', position: 'relative', zIndex: 10 }}
      >
        <Row gutter={[32, 32]}>
          <Col xs={24} lg={16}>
            <motion.div variants={fadeInUp}>
              <Card style={{ borderRadius: '24px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', padding: '12px' }}>
                <Tabs
                  defaultActiveKey="1"
                  className="modern-tabs"
                  items={[
                    {
                      key: '1',
                      label: <Space><Info size={18} /> Details</Space>,
                      children: (
                        <div style={{ padding: '24px' }}>
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
                        <div style={{ padding: '24px' }}>
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
                          <div style={{ padding: '24px' }}>
                            {attendanceStats}
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
                              className="attendee-table"
                              tableLayout="fixed"
                              style={{ width: '100%' }}
                              expandable={{
                                expandedRowRender: (record) => (
                                  <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #eef2ff', margin: '4px 0' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                                      <div style={{ flex: '1 1 200px' }}>
                                        <AntText type="secondary" style={{ fontSize: '9px', display: 'block', textTransform: 'uppercase', fontWeight: 800, marginBottom: '8px' }}>Ticket Details</AntText>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                          <div style={{ background: '#fff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <AntText strong style={{ fontSize: '11px', color: '#64748b' }}>TIER: </AntText>
                                            <Tag color="blue" style={{ margin: 0, borderRadius: '4px', fontWeight: 700, fontSize: '10px' }}>{record.ticketType}</Tag>
                                          </div>
                                          <div style={{ background: '#fff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <AntText strong style={{ fontSize: '11px', color: '#64748b' }}>PAID: </AntText>
                                            <AntText strong style={{ color: '#0f172a', fontSize: '11px' }}>₹{record.amountPaid}</AntText>
                                          </div>
                                        </div>
                                      </div>
                                      <div style={{ flex: '1 1 250px', borderLeft: '1px dashed #e2e8f0', paddingLeft: '16px' }}>
                                        <AntText type="secondary" style={{ fontSize: '9px', display: 'block', textTransform: 'uppercase', fontWeight: 800, marginBottom: '8px' }}>Booking Info</AntText>
                                        <AntText style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.5' }}>
                                          ID: <strong style={{ color: '#0f172a' }}>#{record.id.slice(-8).toUpperCase()}</strong><br />
                                          Status: <strong style={{ 
                                            color: record.status === 'CONFIRMED' ? '#10b981' : 
                                                   record.status === 'PENDING' ? '#f59e0b' : 
                                                   record.status === 'CANCELLED' ? '#ef4444' : 
                                                   record.status === 'CHECKED_IN' ? '#6366f1' : '#64748b' 
                                          }}>{record.status}</strong>. {
                                            record.status === 'PENDING' ? 'Awaiting offline payment. Please verify and confirm above.' :
                                              record.status === 'CONFIRMED' ? 'Payment verified. Guest is ready for check-in.' :
                                                record.status === 'CHECKED_IN' ? 'Check-in completed. Guest has entered the venue.' :
                                                  record.status === 'CANCELLED' ? 'This booking has been cancelled and is no longer valid.' :
                                                    'Booking status is being processed.'
                                          }
                                        </AntText>
                                      </div>
                                    </div>
                                  </div>
                                ),
                                expandIcon: ({ expanded, onExpand, record }) => (
                                  <div
                                    onClick={e => onExpand(record, e)}
                                    style={{ cursor: 'pointer', color: '#6366f1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '6px', background: expanded ? '#eff6ff' : '#f8fafc' }}
                                  >
                                    {expanded ? <MinusOutlined style={{ fontSize: '10px' }} /> : <PlusOutlined style={{ fontSize: '10px' }} />}
                                  </div>
                                )
                              }}
                            />
                          </div>
                        )
                      },
                      {
                        key: '4',
                        label: <Space><Briefcase size={18} /> Vendors ({event.vendors?.length || 0})</Space>,
                        children: (
                          <div style={{ padding: '24px' }}>
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
            </motion.div>
          </Col>

          <Col xs={24} lg={8}>
            <motion.div
              variants={{
                initial: { opacity: 0, x: 30 },
                animate: { opacity: 1, x: 0, transition: { duration: 0.6, delay: 0.3 } }
              }}
              style={{ position: 'sticky', top: '24px' }}
            >
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

                    <Space orientation="vertical" size={24} style={{ width: '100%' }}>
                      {!isBooked && event?.status !== 'COMPLETED' && event?.status !== 'CANCELLED' && (event?.capacity - (event?.bookedCount || 0)) > 0 && (
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

                      {event.status === 'COMPLETED' ? (
                        <Space orientation="vertical" style={{ width: '100%' }}>
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
                            <CheckCircleOutlined /> EVENT COMPLETED
                          </Button>
                        </Space>
                      ) : event?.status === 'CANCELLED' ? (
                        <Space orientation="vertical" style={{ width: '100%' }}>
                          <Button
                            block
                            disabled
                            style={{
                              height: '60px',
                              borderRadius: '16px',
                              background: '#FEE2E2',
                              color: '#EF4444',
                              border: '1px solid #FCA5A5',
                              fontWeight: 800
                            }}
                          >
                            <CloseCircleOutlined /> EVENT CANCELLED
                          </Button>
                        </Space>
                      ) : isBooked ? (() => {
                        const booking = myBookings.find(b => b.event.id === event.id);
                        const isPending = booking?.status === 'PENDING';

                        return (
                          <Space orientation="vertical" style={{ width: '100%' }}>
                            {isPending ? (
                              <div style={{
                                background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                                border: '1px solid #f97316',
                                borderRadius: '24px',
                                padding: '32px 24px',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '16px',
                                boxShadow: '0 10px 15px -3px rgba(249, 115, 22, 0.1)'
                              }}>
                                <div style={{
                                  width: '56px',
                                  height: '56px',
                                  background: '#f97316',
                                  borderRadius: '18px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontSize: '28px',
                                  boxShadow: '0 8px 16px rgba(249, 115, 22, 0.3)'
                                }}>
                                  <ClockCircleOutlined />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <AntText style={{ color: '#9a3412', fontWeight: 950, fontSize: '1.4rem', letterSpacing: '-0.5px', textTransform: 'uppercase' }}>Payment Pending</AntText>
                                  <AntText style={{ color: '#c2410c', fontSize: '0.95rem', fontWeight: 500, lineHeight: 1.4 }}>Your spot is reserved! Please complete payment to secure your ticket.</AntText>
                                </div>
                                <Button
                                  type="primary"
                                  block
                                  size="large"
                                  icon={<CreditCard size={18} />}
                                  onClick={() => {
                                    if (booking.paymentUrl) window.location.href = booking.paymentUrl;
                                    else toast.error('Payment link not found. Please try again or contact support.');
                                  }}
                                  style={{
                                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                                    border: 'none',
                                    borderRadius: '14px',
                                    height: '54px',
                                    fontWeight: 800,
                                    fontSize: '1rem',
                                    boxShadow: '0 10px 15px -3px rgba(249, 115, 22, 0.4)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                  }}
                                >
                                  Complete Payment
                                </Button>
                              </div>
                            ) : (
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
                                <AntText style={{ color: '#15803d', fontSize: '0.9rem', fontWeight: 500 }}>You&apos;re all set! We&apos;ve sent your tickets to your email.</AntText>
                              </div>
                            )}
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
                        );
                      })()
                        : (event?.capacity - (event?.bookedCount || 0)) <= 0 ? (
                          <Space orientation="vertical" style={{ width: '100%' }}>
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
            </motion.div>
          </Col>
        </Row>
      </motion.div>

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
        .attendee-table .ant-table-thead > tr > th {
          background: #f8fafc !important;
          color: #64748b !important;
          font-size: 10px !important;
          text-transform: uppercase !important;
          letter-spacing: 1px !important;
          font-weight: 900 !important;
          padding: 16px 24px !important;
          border-bottom: 2px solid #f1f5f9 !important;
          text-align: center !important;
          white-space: nowrap !important;
        }
        .attendee-table .ant-table-thead > tr > th:first-child {
          text-align: left !important;
        }
        .attendee-table .ant-table-tbody > tr > td {
          padding: 24px 24px !important;
          border-bottom: 1px solid #f1f5f9 !important;
          text-align: center !important;
        }
        .attendee-table .ant-table-tbody > tr > td:first-child {
          text-align: left !important;
        }
        .attendee-table .ant-table-tbody > tr:hover > td {
          background: #fcfdfe !important;
        }
        .attendee-table .ant-table-row-expand-icon-cell {
          padding-left: 24px !important;
        }
        .attendee-table .ant-table-thead > tr > th:last-child,
        .attendee-table .ant-table-tbody > tr > td:last-child {
          text-align: right !important;
          padding-right: 24px !important;
        }
        .attendee-table .ant-table-row-expand-icon-cell {
          width: 50px !important;
          text-align: center !important;
        }
      `}</style>
    </div>
  );
}
