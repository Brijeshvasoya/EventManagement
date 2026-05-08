import { useMemo, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_MY_BOOKINGS } from '@/features/events/graphql/queries';
import { CANCEL_BOOKING } from '@/features/events/graphql/mutations';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import Head from 'next/head';
import { Table, Tag, Button, Space, Card, Typography, Spin, Empty, Popconfirm } from 'antd';
import { EyeOutlined, CalendarOutlined, AuditOutlined, DeleteOutlined, EnvironmentOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import DigitalTicketModal from '@/features/events/components/DigitalTicketModal';
import LoadingScreen from '@/components/LoadingScreen';

const { Text } = Typography;

export default function MyTickets() {
  const { user } = useAuth();
  const { data, loading } = useQuery(GET_MY_BOOKINGS, {
    fetchPolicy: 'network-only',
    skip: !user
  });

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pageSize, setPageSize] = useState(5);
  const [cancelBooking] = useMutation(CANCEL_BOOKING);

  const bookings = useMemo(() =>
    (data?.myBookings || []).filter(b => b?.status === 'CONFIRMED' || b?.status === 'PENDING' || b?.status === 'CHECKED_IN'),
    [data]
  );

  const stats = useMemo(() => ({
    confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
    pending: bookings.filter(b => b.status === 'PENDING').length,
    checkedIn: bookings.filter(b => b.status === 'CHECKED_IN').length,
    total: bookings.length
  }), [bookings]);

  const handleCancel = async (id) => {
    try {
      await cancelBooking({
        variables: { id },
        onCompleted: () => {
          toast.success('Ticket cancelled successfully');
          setIsModalOpen(false);
        },
        onError: (err) => toast.error(err.message)
      });
    } catch (err) {
      toast.error('Failed to cancel ticket');
    }
  };

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Empty description="Please login to view your tickets" />
      </div>
    );
  }

  if (loading) return <LoadingScreen message="Fetching your digital tickets..." />;

  const handleViewTicket = (booking) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  const columns = [
    {
      title: 'Event',
      dataIndex: ['event', 'title'],
      key: 'eventTitle',
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '4px 0' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '12px',
            overflow: 'hidden',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            position: 'relative'
          }}>
            <Image
              src={record?.event?.imageUrl || '/event-placeholder.jpg'}
              alt={text || 'Event'}
              fill
              unoptimized
              style={{ objectFit: 'cover' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <Text strong style={{ fontSize: '1rem', lineHeight: 1.2, display: 'block' }}>{text}</Text>
            <Space size={4} style={{ color: '#64748B', fontSize: '0.8rem' }}>
              <EnvironmentOutlined style={{ color: 'var(--primary-color)', fontSize: '0.85rem' }} />
              {record?.event?.location || 'Venue TBD'}
            </Space>
            {record?.event?.organizer?.name && (
              <div style={{ color: '#94A3B8', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <UserOutlined style={{ fontSize: '0.7rem' }} />
                  <span>By <span style={{ color: '#64748B', fontWeight: 500 }}>{record?.event?.organizer?.name}</span></span>
                </div>
                {record?.event?.eventType && (
                  <>
                    <span style={{ color: '#E2E8F0' }}>•</span>
                    <span style={{
                      background: 'rgba(99, 102, 241, 0.1)',
                      color: 'var(--primary-color)',
                      padding: '0px 6px',
                      borderRadius: '4px',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}>
                      {record?.event?.eventType}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'Date',
      dataIndex: ['event', 'date'],
      key: 'eventDate',
      render: (date) => (
        <Space>
          <CalendarOutlined style={{ color: 'var(--primary-color)' }} />
          {dayjs(isNaN(Number(date)) ? date : Number(date)).format('MMM D, YYYY • h:mm A')}
        </Space>
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
      render: (qty) => <Text strong>{qty}</Text>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'CONFIRMED' ? 'green' : status === 'PENDING' ? 'orange' : 'red'} style={{ borderRadius: '100px', padding: '2px 12px' }}>
          {status === 'PENDING' ? 'PAYMENT PENDING' : status?.replaceAll('_', ' ')}
        </Tag>
      )
    },
    {
      title: 'Action',
      key: 'action',
      align: 'center',
      render: (_, record) => (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', minWidth: '100px' }}>
          {/* View Button Slot */}
          <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
            {record.status === 'PENDING' ? (
              <Button
                type="primary"
                onClick={() => record.paymentUrl && (window.location.href = record.paymentUrl)}
                style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', border: 'none', borderRadius: '8px', fontWeight: 600, width: '80px', position: 'relative', left: '-20px' }}
              >
                Pay
              </Button>
            ) : (
              <Button
                type="primary"
                shape="circle"
                icon={<EyeOutlined />}
                onClick={() => handleViewTicket(record)}
                style={{ background: 'var(--primary-color)', boxShadow: '0 4px 10px rgba(79, 70, 229, 0.2)' }}
                title="View Ticket"
              />
            )}
          </div>

          {/* Cancel Button Slot */}
          <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
            {record.status !== 'CANCELLED' && record.status !== 'CHECKED_IN' && (
              <Popconfirm
                title="Cancel Ticket"
                description={() => {
                  const eventDate = dayjs(isNaN(Number(record.event?.date)) ? record.event?.date : Number(record.event?.date));
                  const hoursRemaining = eventDate.diff(dayjs(), 'hour');
                  let refundMsg = "";
                  const amount = record.amountPaid || 0;

                  if (hoursRemaining > 72) refundMsg = `Estimated Refund: 90% ($${(amount * 0.9).toFixed(2)})`;
                  else if (hoursRemaining > 48) refundMsg = `Estimated Refund: 75% ($${(amount * 0.75).toFixed(2)})`;
                  else if (hoursRemaining > 24) refundMsg = `Estimated Refund: 50% ($${(amount * 0.5).toFixed(2)})`;
                  else refundMsg = "No refund (less than 24h remaining)";

                  return (
                    <div>
                      <p style={{ margin: 0 }}>Are you sure you want to cancel?</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: hoursRemaining > 12 ? '#10B981' : '#EF4444', fontWeight: 600 }}>{refundMsg}</p>
                    </div>
                  );
                }}
                onConfirm={() => handleCancel(record.id)}
                okText="Yes"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <Button
                  danger
                  shape="circle"
                  icon={<DeleteOutlined />}
                  style={{ boxShadow: '0 4px 10px rgba(255, 77, 79, 0.2)' }}
                  title="Cancel Ticket"
                />
              </Popconfirm>
            )}
          </div>
        </div>
      )
    }
  ];

  return (
    <>
      <Head><title>My Digital Tickets | EventHub</title></Head>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', minHeight: '100vh', padding: '40px 20px', background: '#F8FAFC' }}
      >
        <div className="header-responsive" style={{
          background: 'linear-gradient(135deg, #1B2A4E 0%, #312E81 50%, #4338CA 100%)',
          borderRadius: '24px',
          boxShadow: '0 20px 40px rgba(49, 46, 129, 0.2)',
          color: 'white',
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '32px 40px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{
              width: '64px', height: '64px',
              background: 'linear-gradient(135deg, #6366F1 0%, #4338CA 100%)',
              borderRadius: '18px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px',
              border: '1.5px solid rgba(255,255,255,0.2)',
              boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
            }}>
              🎟️
            </div>
            <div>
              <h2 style={{ margin: 0, fontWeight: 900, color: 'white', fontSize: '2.2rem', letterSpacing: '-0.8px' }}>My Tickets</h2>
              <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem' }}>Manage your event bookings and access your digital passes</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Pending</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#F59E0B' }}>{stats.pending}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Confirmed</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#10B981' }}>{stats.confirmed}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Checked In</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#6366F1' }}>{stats.checkedIn}</div>
            </div>
            <div className="stats-divider" style={{ width: '1px', background: 'rgba(255,255,255,0.1)', height: '40px', margin: '0 8px' }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Total Active</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>{stats.total}</div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <Card variant="borderless" style={{ borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <Table
            columns={columns}
            dataSource={bookings}
            rowKey="id"
            pagination={{
              pageSize: pageSize,
              showSizeChanger: true,
              pageSizeOptions: ['5', '10', '20', '50'],
              onShowSizeChange: (current, size) => setPageSize(size),
              hideOnSinglePage: false,
              style: { marginTop: '24px', marginRight: '16px' }
            }}
            locale={{
              emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="You haven't booked any tickets yet." />
            }}
          />
        </Card>

        {/* Digital Ticket Modal (Common Component) */}
        <DigitalTicketModal
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          booking={selectedBooking}
          onCancelTicket={handleCancel}
        />
        <style jsx global>{`
          @media (max-width: 768px) {
            .stats-divider {
              display: none !important;
            }
          }
        `}</style>
      </motion.div>
    </>
  );
}
