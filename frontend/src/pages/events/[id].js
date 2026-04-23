import { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_EVENT_DETAILS, GET_MY_BOOKINGS, CANCEL_BOOKING, CREATE_CHECKOUT_SESSION } from '@/features/events/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import Head from 'next/head';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import {
  Card, Tag, Button, Spin, Descriptions, Divider,
  Table, Row, Col, Statistic, Empty, Typography, Space, Tooltip,
  Select, InputNumber, Popconfirm
} from 'antd';
import {
  CalendarOutlined, EnvironmentOutlined, TeamOutlined,
  DollarCircleOutlined, ShopOutlined, UserOutlined,
  MailOutlined, ArrowLeftOutlined, CheckCircleOutlined,
  CloseCircleOutlined, InfoCircleOutlined, DownloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title: AntTitle, Text: AntText } = Typography;

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
  const [createCheckout, { loading: sessionLoading }] = useMutation(CREATE_CHECKOUT_SESSION);
  const [cancelBooking] = useMutation(CANCEL_BOOKING);

  if (authLoading || loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
      <div style={{
        width: '48px', height: '48px',
        borderRadius: '12px',
        background: 'var(--gradient-main)',
        animation: 'pulse-glow 2s ease-in-out infinite',
        boxShadow: 'var(--shadow-glow)'
      }} />
      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading Event Details...</span>
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
    try {
      const ticketTypeToUse = bookingOptions.ticketType || event.ticketTypes?.[0]?.name;
      const { data } = await createCheckout({
        variables: {
          eventId: event.id,
          ticketType: ticketTypeToUse,
          quantity: bookingOptions.quantity
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

  const totalRevenue = event.attendees?.reduce((acc, curr) => acc + (curr.status === 'CONFIRMED' || curr.status === 'CHECKED_IN' ? curr.amountPaid : 0), 0) || 0;
  const totalTickets = event.attendees?.reduce((acc, curr) => acc + (curr.status === 'CONFIRMED' || curr.status === 'CHECKED_IN' ? curr.quantity : 0), 0) || 0;

  const attendeeColumns = [
    {
      title: 'User',
      key: 'user',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <AntText strong style={{ color: 'var(--text-primary)' }}><UserOutlined /> {record.user.name}</AntText>
          <AntText style={{ fontSize: '12px', color: 'var(--text-muted)' }}><MailOutlined /> {record.user.email}</AntText>
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'CONFIRMED' ? 'green' : status === 'CHECKED_IN' ? 'yellow' : 'red'} icon={status === 'CONFIRMED' || status === 'CHECKED_IN' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Tier',
      dataIndex: 'ticketType',
      key: 'ticketType',
      render: (type) => <Tag color="purple">{type}</Tag>
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center',
      render: (qty) => <AntText strong style={{ color: 'var(--text-primary)' }}>{qty}</AntText>
    },
    {
      title: 'Paid',
      dataIndex: 'amountPaid',
      key: 'amountPaid',
      render: (amt) => <AntText strong style={{ color: 'var(--secondary-color)' }}>${Number(amt).toLocaleString()}</AntText>
    },
    {
      title: 'Booked On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => <span style={{ color: 'var(--text-secondary)' }}>{dayjs(parseInt(date) || date).format('MMM D, YYYY')}</span>
    }
  ];

  const vendorColumns = [
    {
      title: 'Vendor Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <AntText strong style={{ color: 'var(--text-primary)' }}>{text}</AntText>
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat) => <Tag color="blue">{cat}</Tag>
    },
    {
      title: 'Cost',
      dataIndex: 'cost',
      key: 'cost',
      render: (amt) => <AntText strong style={{ color: 'var(--primary-color)' }}>${Number(amt).toLocaleString()}</AntText>
    },
    {
      title: 'Contact',
      dataIndex: 'contactInfo',
      key: 'contactInfo',
      render: (info) => <span style={{ color: 'var(--text-secondary)' }}>{info}</span>
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
      { header: 'Quantity', key: 'qty', width: 10 },
      { header: 'Amount Paid', key: 'paid', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Booking Date', key: 'date', width: 20 }
    ];

    event.attendees?.forEach(a => {
      worksheet.addRow({
        id: a.id.toUpperCase(),
        name: a.user.name,
        email: a.user.email,
        ticket: a.ticketType,
        qty: a.quantity,
        paid: `$${Number(a.amountPaid).toLocaleString()}`,
        status: a.status,
        date: dayjs(parseInt(a.createdAt) || a.createdAt).format('YYYY-MM-DD HH:mm')
      });
    });

    // Styling the header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7c5cfc' } };
    worksheet.getRow(1).font = { color: { argb: 'ffffff' }, bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${event.title.replace(/\s+/g, '_')}_Attendees.xlsx`);
  };

  return (
    <div className="mobile-pad-reduce" style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Head><title>{event.title} | Organizer Dashboard</title></Head>
      <Row gutter={[32, 32]}>
        {/* Left Side: Event Info */}
        <Col xs={24} lg={8}>
          <Card
            cover={
              <div style={{ position: 'relative', overflow: 'hidden' }}>
                <img className="modal-banner-img" alt={event.title} src={event.imageUrl || '/event-placeholder.jpg'} style={{ height: '300px', objectFit: 'cover', width: '100%' }} />
                <div style={{
                  position: 'absolute',
                  bottom: 0, left: 0, right: 0,
                  height: '50%',
                  background: 'linear-gradient(to top, var(--card-bg) 0%, transparent 100%)'
                }} />
              </div>
            }
            className="hover-bounce"
            style={{
              borderRadius: '24px',
              overflow: 'hidden',
              background: 'var(--card-bg)',
              border: '1px solid var(--glass-border)',
              backdropFilter: 'blur(20px)',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            <AntTitle level={2} style={{ marginBottom: '8px', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{event.title}</AntTitle>
            <Tag color="blue" style={{ marginBottom: '20px' }}>{event.eventType}</Tag>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              {[
                { icon: <CalendarOutlined style={{ color: 'var(--primary-color)' }} />, label: 'Date & Time', value: dayjs(parseInt(event.date) || event.date).format('MMMM D, YYYY h:mm A') },
                { icon: <EnvironmentOutlined style={{ color: 'var(--secondary-color)' }} />, label: 'Venue', value: event.location },
                { icon: <TeamOutlined style={{ color: '#ff8b3d' }} />, label: 'Capacity', value: `${event.bookedCount} / ${event.capacity} Guests` }
              ].map((item, i) => (
                <div className="hover-bounce" key={i} style={{
                  padding: '14px',
                  background: 'var(--glass-bg)',
                  borderRadius: '12px',
                  border: '1px solid var(--glass-border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {item.icon} {item.label}
                  </div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>{item.value}</div>
                </div>
              ))}
            </div>

            <Divider titlePlacement="left" style={{ color: 'var(--text-muted)' }}>Description</Divider>
            <AntText style={{ lineHeight: '1.7', color: 'var(--text-secondary)' }}>{event.description}</AntText>
          </Card>
        </Col>

        {/* Right Side: Stats & Lists / Booking UI */}
        <Col xs={24} lg={16}>
          {!isOwner ? (
            <Card
              className="hover-bounce"
              title={<span style={{ color: 'var(--text-primary)' }}>🎫 Get Your Tickets</span>}
              style={{
                borderRadius: '24px',
                background: 'var(--card-bg)',
                border: '1px solid var(--glass-border)',
                backdropFilter: 'blur(20px)',
                boxShadow: 'var(--shadow-md)'
              }}
            >
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Choose Ticket Tier</label>
                <Select
                  style={{ width: '100%', height: '45px' }}
                  value={bookingOptions.ticketType || event.ticketTypes?.[0]?.name}
                  onChange={(val) => setBookingOptions({ ...bookingOptions, ticketType: val })}
                  options={event.ticketTypes?.map(t => ({ label: `${t.name} - $${Number(t.price).toLocaleString()}`, value: t.name }))}
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quantity</label>
                <InputNumber
                  min={1} max={10}
                  style={{ width: '100%', height: '45px', lineHeight: '45px' }}
                  value={bookingOptions.quantity}
                  onChange={(val) => setBookingOptions({ ...bookingOptions, quantity: val })}
                />
              </div>
              <Divider style={{ borderColor: 'var(--glass-border)' }} />
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 20px',
                background: 'rgba(131, 56, 236, 0.06)',
                borderRadius: '14px',
                border: '1px solid rgba(131, 56, 236, 0.1)',
                marginBottom: '24px'
              }}>
                <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Estimated Total:</span>
                <span style={{ fontSize: '1.8rem', fontWeight: '900', background: 'var(--gradient-main)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  ${((event.ticketTypes?.find(t => t.name === (bookingOptions.ticketType || event.ticketTypes?.[0]?.name))?.price || 0) * bookingOptions.quantity).toLocaleString()}
                </span>
              </div>

              {isBooked ? (
                <>
                  <Tag color="green" style={{ fontSize: '1rem', padding: '12px 20px', borderRadius: '12px', display: 'block', textAlign: 'center', marginBottom: '16px' }}>
                    <CheckCircleOutlined /> You have booked a ticket for this event
                  </Tag>
                  {new Date(parseInt(event.date) || event.date) >= new Date() && (
                    <Popconfirm title="Are you sure you want to cancel?" onConfirm={handleCancel}>
                      <Button danger icon={<CloseCircleOutlined />} size="large" block style={{ borderRadius: '12px', height: '50px' }}>Cancel Reservation</Button>
                    </Popconfirm>
                  )}
                </>
              ) : (
                new Date(parseInt(event.date) || event.date) >= new Date() ? (
                  <Button
                    type="primary"
                    size="large"
                    loading={sessionLoading}
                    onClick={handleCheckout}
                    block
                    style={{ borderRadius: '12px', height: '54px', fontWeight: 'bold' }}
                  >
                    Proceed to Secure Payment
                  </Button>
                ) : (
                  <Button disabled block size="large" style={{ borderRadius: '12px', height: '54px' }}>Event has passed</Button>
                )
              )}
            </Card>
          ) : (
            <>
              <Row gutter={[16, 16]} style={{ marginBottom: '2rem' }}>
                {[
                  { title: 'Total Revenue', value: totalRevenue, precision: 2, prefix: <DollarCircleOutlined style={{ color: 'var(--secondary-color)' }} />, color: 'var(--secondary-color)' },
                  { title: 'Tickets Sold', value: totalTickets, prefix: <TeamOutlined style={{ color: 'var(--primary-color)' }} />, color: 'var(--primary-color)' },
                  { title: 'Vendors', value: event.vendors?.length || 0, prefix: <ShopOutlined style={{ color: '#ff8b3d' }} />, color: '#ff8b3d' }
                ].map((stat, i) => (
                  <Col xs={24} sm={12} md={8} key={i}>
                    <Card className="hover-bounce" style={{
                      borderRadius: '20px',
                      textAlign: 'center',
                      background: 'var(--card-bg)',
                      border: '1px solid var(--glass-border)',
                      backdropFilter: 'blur(20px)'
                    }}>
                      <Statistic
                        title={stat.title}
                        value={stat.value}
                        precision={stat.precision}
                        prefix={stat.prefix}
                        styles={{ content: { color: stat.color, fontWeight: 800 } }}
                      />
                    </Card>
                  </Col>
                ))}
              </Row>

              <Card
                className="hover-bounce"
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <span style={{ color: 'var(--text-primary)' }}><TeamOutlined /> Attendees & Bookings</span>
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={exportToExcel}
                      style={{ borderRadius: '8px', background: 'rgba(0, 212, 170, 0.1)', color: '#ffff', border: '1px solid rgba(0, 212, 170, 0.2)' }}
                    >
                      Export Guest List
                    </Button>
                  </div>
                }
                style={{
                  borderRadius: '24px',
                  marginBottom: '2rem',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--glass-border)',
                  backdropFilter: 'blur(20px)'
                }}
              >
                <Table
                  dataSource={event.attendees}
                  columns={attendeeColumns}
                  rowKey="id"
                  scroll={{ x: 600 }}
                  pagination={{ pageSize: 5 }}
                  locale={{ emptyText: <Empty description="No bookings yet" /> }}
                />
              </Card>

              <Card
                className="hover-bounce"
                title={<AntTitle level={4} style={{ margin: 0, color: 'var(--text-primary)' }}><ShopOutlined /> Event Vendors</AntTitle>}
                style={{
                  borderRadius: '24px',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--glass-border)',
                  backdropFilter: 'blur(20px)'
                }}
              >
                <Table
                  dataSource={event.vendors}
                  columns={vendorColumns}
                  rowKey="id"
                  scroll={{ x: 600 }}
                  pagination={false}
                  locale={{ emptyText: <Empty description="No vendors assigned to this event" /> }}
                />
              </Card>
            </>
          )}
        </Col>
      </Row>
    </div>
  );
}
