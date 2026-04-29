import { useQuery } from '@apollo/client/react';
import { GET_MY_EVENTS, GET_MY_ANALYTICS, GET_EVENTS } from '@/features/events/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import Head from 'next/head';
import { Table, Tag, Card, Row, Col, Statistic, Empty, Button } from 'antd';
import { TagOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { IndianRupee } from 'lucide-react';

export default function Transactions() {
  const { user, loading: authLoading } = useAuth();

  const { data: allEventsData, loading: loadingAllEvents } = useQuery(GET_EVENTS, {
    fetchPolicy: 'cache-and-network',
    skip: !user || user.role !== 'SUPER_ADMIN'
  });

  const { data: analyticsData } = useQuery(GET_MY_ANALYTICS, {
    skip: !user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')
  });

  const { data: eventsData, loading } = useQuery(GET_MY_EVENTS, {
    fetchPolicy: 'cache-and-network',
    skip: !user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')
  });

  if (authLoading || loading || loadingAllEvents) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px',
        background: 'var(--gradient-main)', animation: 'pulse-glow 2s ease-in-out infinite',
      }} />
    </div>
  );

  let stats = analyticsData?.myAnalytics || { totalRevenue: 0, ticketsSold: 0 };

  const targetEvents = user?.role === 'SUPER_ADMIN' ? allEventsData?.events : eventsData?.myEvents;

  // Flatten attendees across all events into a single transactions array
  const allTransactions = targetEvents?.flatMap(event =>
    event.attendees?.map(attendee => ({
      ...attendee,
      eventTitle: event.title,
      eventId: event.id
    })) || []
  ).sort((a, b) => (isNaN(Number()) ? new Date().getTime() : Number()) - (isNaN(Number()) ? new Date().getTime() : Number())) || [];

  if (user?.role === 'SUPER_ADMIN') {
    const totalRevenue = allTransactions.reduce((sum, t) => sum + (t.status !== 'CANCELLED' ? (t.amountPaid || 0) : 0), 0);
    const ticketsSold = allTransactions.reduce((sum, t) => sum + (t.status !== 'CANCELLED' ? (t.quantity || 1) : 0), 0);
    stats = { totalRevenue, ticketsSold };
  }

  const columns = [
    {
      title: 'Pass ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id) => <span style={{ fontFamily: 'monospace', color: '#6B7280' }}>#{id.slice(-8).toUpperCase()}</span>
    },
    {
      title: 'Event',
      dataIndex: 'eventTitle',
      key: 'eventTitle',
      width: 140,
      render: (text) => <span style={{ fontWeight: 700, color: '#1B2A4E' }}>{text}</span>
    },
    {
      title: 'Guest Info',
      key: 'user',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1B2A4E' }}>{record.user?.name}</div>
          <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>{record.user?.email}</div>
        </div>
      )
    },
    {
      title: 'Ticket / Qty',
      key: 'ticket',
      width: 140,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Tag color="purple">{record.ticketType}</Tag>
          <span style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 600 }}>x{record.quantity}</span>
        </div>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'amountPaid',
      key: 'amountPaid',
      width: 110,
      render: (amt, record) => (
        <span style={{
          fontWeight: 800,
          color: record.status === 'CANCELLED' ? '#EF4444' : '#10B981'
        }}>
          ${Number(amt).toLocaleString()}
        </span>
      )
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date) => {
        const num = Number(date);
        const validDate = isNaN(num) ? date : num;
        return <span style={{ color: '#6B7280', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{dayjs(validDate).format('MMM D, YYYY h:mm A')}</span>;
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={status === 'CONFIRMED' || status === 'CHECKED_IN' ? 'success' : 'error'} style={{ fontWeight: 700, borderRadius: '8px' }}>
          {status}
        </Tag>
      )
    }
  ];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <Head><title>Transactions | EventHub</title></Head>

      <div className="header-responsive" style={{ background: 'linear-gradient(135deg, #1B2A4E 0%, #312E81 50%, #4338CA 100%)', borderRadius: '32px', color: 'white', boxShadow: '0 20px 40px rgba(49, 46, 129, 0.2)' }}>
        <h2 style={{ margin: '0 0 8px 0', fontWeight: 900, fontSize: '2.5rem', letterSpacing: '-0.5px' }}>Sales & Transactions</h2>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem' }}>Track your revenue, ticket sales, and detailed order history in real-time.</p>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={12}>
          <Card variant="borderless" style={{ borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <Statistic title={<span style={{ fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '1px' }}>Lifetime Revenue</span>} value={stats.totalRevenue} precision={2} prefix={<IndianRupee />} styles={{ content: { color: '#10B981', fontWeight: 900, fontSize: '2.5rem' } }} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card variant="borderless" style={{ borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <Statistic title={<span style={{ fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Pases Sold</span>} value={stats.ticketsSold} prefix={<TagOutlined />} styles={{ content: { color: 'rgb(67, 56, 202)', fontWeight: 900, fontSize: '2.5rem' } }} />
          </Card>
        </Col>
      </Row>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#1B2A4E', fontWeight: 800, fontSize: '1.4rem' }}>Recent Orders</h3>
        <Button icon={<DownloadOutlined />} style={{ borderRadius: '100px', fontWeight: 600 }}>Export CSV</Button>
      </div>

      <div className="table-responsive" style={{ background: '#FFF', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', padding: '24px' }}>
        <Table
          columns={columns}
          dataSource={allTransactions}
          rowKey="id"
          scroll={{ x: 800 }}
          pagination={{ pageSize: 15, placement: 'bottomCenter' }}
          locale={{ emptyText: <Empty description="No transactions found." /> }}
        />
      </div>

      <style jsx global>{`
        .ant-table-thead > tr > th {
          background: #F8F9FB !important;
          color: #6B7280 !important;
          font-weight: 700 !important;
          border-bottom: 2px solid #E5E7EB !important;
        }
        .ant-table-tbody > tr > td {
          border-bottom: 1px solid #F3F4F6 !important;
        }
        .ant-table-tbody > tr:hover > td {
          background: #F9FAFB !important;
        }
      `}</style>
    </div>
  );
}
