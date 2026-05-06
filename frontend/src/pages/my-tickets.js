import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_MY_BOOKINGS } from '@/features/events/graphql/queries';
import { CANCEL_BOOKING } from '@/features/events/graphql/mutations';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import Head from 'next/head';
import { Table, Tag, Button, Space, Card, Typography, Spin, Empty, Popconfirm } from 'antd';
import { EyeOutlined, CalendarOutlined, AuditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import DigitalTicketModal from '@/features/events/components/DigitalTicketModal';

const { Text } = Typography;

export default function MyTickets() {
  const { user } = useAuth();
  const { data, loading } = useQuery(GET_MY_BOOKINGS, {
    fetchPolicy: 'network-only',
    skip: !user
  });

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [cancelBooking] = useMutation(CANCEL_BOOKING);

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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
        <Spin size="large" />
        <Text>Fetching your digital tickets...</Text>
      </div>
    );
  }

  const bookings = (data?.myBookings || []).filter(b => b?.status === 'CONFIRMED' || b?.status === 'PENDING');

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            <img src={record?.event?.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <Text strong>{text}</Text>
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
          {status === 'PENDING' ? 'PAYMENT PENDING' : status}
        </Tag>
      )
    },
    {
      title: 'Action',
      key: 'action',
      align: 'center',
      render: (_, record) => (
        <Space>
          {record.status === 'PENDING' ? (
            <Button
              type="primary"
              onClick={() => record.paymentUrl && (window.location.href = record.paymentUrl)}
              style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', border: 'none', borderRadius: '8px', fontWeight: 600 }}
            >
              Pay Now
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
          {record.status !== 'CANCELLED' && (
            <Popconfirm
              title="Cancel Ticket"
              description="Sure you want to cancel?"
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
        </Space>
      )
    }
  ];

  return (
    <>
      <Head><title>My Digital Tickets | EventHub</title></Head>
      <div style={{ width: '100%', minHeight: '100vh', padding: '40px' }}>
        <div style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
          <Card variant="borderless" style={{ borderRadius: '20px', background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AuditOutlined style={{ fontSize: '24px' }} />
              </div>
              <div>
                <div style={{ opacity: 0.8, fontSize: '0.85rem' }}>Total Active Tickets</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{bookings.length}</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Content Section */}
        <Card variant="borderless" style={{ borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <Table
            columns={columns}
            dataSource={bookings}
            rowKey="id"
            pagination={{ pageSize: 10 }}
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
      </div>
    </>
  );
}
