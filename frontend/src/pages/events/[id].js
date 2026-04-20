import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client/react';
import { GET_EVENT_DETAILS } from '@/features/events/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import Head from 'next/head';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  Card, Tag, Button, Spin, Descriptions, Divider,
  Table, Row, Col, Statistic, Empty, Typography, Space, Tooltip
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

  const { data, loading, error } = useQuery(GET_EVENT_DETAILS, {
    variables: { id },
    skip: !id || authLoading
  });

  if (authLoading || loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
      <div style={{
        width: '48px', height: '48px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #7c5cfc 0%, #00d4aa 100%)',
        animation: 'pulse-glow 2s ease-in-out infinite',
        boxShadow: '0 8px 24px rgba(124, 92, 252, 0.3)'
      }} />
      <span style={{ color: '#a0a0b8', fontWeight: 500 }}>Loading Event Details...</span>
    </div>
  );
  if (error) return <div style={{ padding: '2rem' }}><Empty description="Error loading event details" /></div>;

  const event = data?.event;
  if (!event) return <div style={{ padding: '2rem' }}><Empty description="Event not found" /></div>;

  const isOwner = user?.id === event.organizer?.id || user?.role === 'ADMIN';
  if (!isOwner) return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <AntTitle level={3} style={{ color: '#f0f0f5' }}>Unauthorized Access</AntTitle>
      <Button onClick={() => router.push('/browse')}>Back to Browse</Button>
    </div>
  );

  const totalRevenue = event.attendees?.reduce((acc, curr) => acc + (curr.status === 'CONFIRMED' || curr.status === 'CHECKED_IN' ? curr.amountPaid : 0), 0) || 0;
  const totalTickets = event.attendees?.reduce((acc, curr) => acc + (curr.status === 'CONFIRMED' || curr.status === 'CHECKED_IN' ? curr.quantity : 0), 0) || 0;

  const attendeeColumns = [
    {
      title: 'User',
      key: 'user',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <AntText strong style={{ color: '#f0f0f5' }}><UserOutlined /> {record.user.name}</AntText>
          <AntText style={{ fontSize: '12px', color: '#6b6b80' }}><MailOutlined /> {record.user.email}</AntText>
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
      render: (qty) => <AntText strong style={{ color: '#f0f0f5' }}>{qty}</AntText>
    },
    {
      title: 'Paid',
      dataIndex: 'amountPaid',
      key: 'amountPaid',
      render: (amt) => <AntText strong style={{ color: '#00d4aa' }}>${amt}</AntText>
    },
    {
      title: 'Booked On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => <span style={{ color: '#a0a0b8' }}>{dayjs(parseInt(date) || date).format('MMM D, YYYY')}</span>
    }
  ];

  const vendorColumns = [
    {
      title: 'Vendor Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <AntText strong style={{ color: '#f0f0f5' }}>{text}</AntText>
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
      render: (amt) => <AntText strong style={{ color: '#7c5cfc' }}>${amt}</AntText>
    },
    {
      title: 'Contact',
      dataIndex: 'contactInfo',
      key: 'contactInfo',
      render: (info) => <span style={{ color: '#a0a0b8' }}>{info}</span>
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
        paid: `$${a.amountPaid}`,
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
    <div className="mobile-pad-reduce" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <Head><title>{event.title} | Organizer Dashboard</title></Head>

      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => router.back()}
        style={{ marginBottom: '2rem', borderRadius: '10px' }}
      >
        Back to Browse
      </Button>

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
                  background: 'linear-gradient(to top, rgba(22, 22, 43, 1) 0%, transparent 100%)'
                }} />
              </div>
            }
            style={{
              borderRadius: '24px',
              overflow: 'hidden',
              background: 'rgba(22, 22, 35, 0.8)',
              border: '1px solid rgba(255,255,255,0.06)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.3)'
            }}
          >
            <AntTitle level={2} style={{ marginBottom: '8px', color: '#f0f0f5', letterSpacing: '-0.5px' }}>{event.title}</AntTitle>
            <Tag color="blue" style={{ marginBottom: '20px' }}>{event.eventType}</Tag>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              {[
                { icon: <CalendarOutlined style={{ color: '#7c5cfc' }} />, label: 'Date & Time', value: dayjs(parseInt(event.date) || event.date).format('MMMM D, YYYY h:mm A') },
                { icon: <EnvironmentOutlined style={{ color: '#00d4aa' }} />, label: 'Venue', value: event.location },
                { icon: <TeamOutlined style={{ color: '#ff8b3d' }} />, label: 'Capacity', value: `${event.bookedCount} / ${event.capacity} Guests` }
              ].map((item, i) => (
                <div key={i} style={{
                  padding: '14px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '0.75rem', color: '#6b6b80', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {item.icon} {item.label}
                  </div>
                  <div style={{ color: '#f0f0f5', fontWeight: 600, fontSize: '0.9rem' }}>{item.value}</div>
                </div>
              ))}
            </div>

            <Divider titlePlacement="left" style={{ color: '#6b6b80' }}>Description</Divider>
            <AntText style={{ lineHeight: '1.7', color: '#a0a0b8' }}>{event.description}</AntText>
          </Card>
        </Col>

        {/* Right Side: Stats & Lists */}
        <Col xs={24} lg={16}>
          <Row gutter={[16, 16]} style={{ marginBottom: '2rem' }}>
            {[
              { title: 'Total Revenue', value: totalRevenue, precision: 2, prefix: <DollarCircleOutlined style={{ color: '#00d4aa' }} />, color: '#00d4aa' },
              { title: 'Tickets Sold', value: totalTickets, prefix: <TeamOutlined style={{ color: '#7c5cfc' }} />, color: '#7c5cfc' },
              { title: 'Vendors', value: event.vendors?.length || 0, prefix: <ShopOutlined style={{ color: '#ff8b3d' }} />, color: '#ff8b3d' }
            ].map((stat, i) => (
              <Col xs={24} sm={12} md={8} key={i}>
                <Card style={{
                  borderRadius: '20px',
                  textAlign: 'center',
                  background: 'rgba(22, 22, 35, 0.8)',
                  border: '1px solid rgba(255,255,255,0.06)',
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
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <span style={{ color: '#f0f0f5' }}><TeamOutlined /> Attendees & Bookings</span>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={exportToExcel}
                  style={{ borderRadius: '8px', background: 'rgba(0, 212, 170, 0.1)', color: '#00d4aa', border: '1px solid rgba(0, 212, 170, 0.2)' }}
                >
                  Export Guest List
                </Button>
              </div>
            }
            style={{
              borderRadius: '24px',
              marginBottom: '2rem',
              background: 'rgba(22, 22, 35, 0.8)',
              border: '1px solid rgba(255,255,255,0.06)',
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
            title={<AntTitle level={4} style={{ margin: 0, color: '#f0f0f5' }}><ShopOutlined /> Event Vendors</AntTitle>}
            style={{
              borderRadius: '24px',
              background: 'rgba(22, 22, 35, 0.8)',
              border: '1px solid rgba(255,255,255,0.06)',
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
        </Col>
      </Row>
    </div>
  );
}
