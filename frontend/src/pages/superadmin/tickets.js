import React, { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_EVENTS } from '@/features/events/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Table, Typography, Card, ConfigProvider, Tag } from 'antd';
import { ScanOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function SuperAdminTickets() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'SUPER_ADMIN')) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const { data, loading } = useQuery(GET_EVENTS, {
    skip: !user || user.role !== 'SUPER_ADMIN',
    fetchPolicy: 'network-only'
  });

  if (authLoading) return null;
  if (!user || user.role !== 'SUPER_ADMIN') return null;

  const events = data?.events || [];

  const allTickets = events.flatMap(event =>
    (event.attendees || []).map(attendee => ({
      ...attendee,
      eventTitle: event.title,
      organizerName: event.organizer?.name || 'Unknown'
    }))
  ).sort((a, b) => {
    const bDate = new Date(isNaN(Number(b.createdAt)) ? b.createdAt : Number(b.createdAt)).getTime();
    const aDate = new Date(isNaN(Number(a.createdAt)) ? a.createdAt : Number(a.createdAt)).getTime();
    return bDate - aDate;
  });

  const columns = [
    {
      title: 'Pass ID',
      dataIndex: 'id',
      key: 'id',
      render: (id) => <span style={{ fontFamily: 'monospace', color: '#6B7280' }}>#{id.slice(-8).toUpperCase()}</span>
    },
    {
      title: 'Event',
      dataIndex: 'eventTitle',
      key: 'eventTitle',
      render: (text) => <span style={{ fontWeight: 700, color: '#1B2A4E' }}>{text}</span>
    },
    {
      title: 'Organizer',
      dataIndex: 'organizerName',
      key: 'organizerName',
    },
    {
      title: 'User (Buyer)',
      key: 'user',
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
      render: (amt, record) => (
        <span style={{ fontWeight: 800, color: record.status === 'CANCELLED' ? '#EF4444' : '#10B981' }}>
          ${Number(amt).toLocaleString()}
        </span>
      )
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
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
      render: (status) => (
        <Tag color={status === 'CONFIRMED' || status === 'CHECKED_IN' ? 'success' : 'error'} style={{ fontWeight: 700, borderRadius: '8px' }}>
          {status}
        </Tag>
      )
    }
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: 'rgb(67, 56, 202)' } }}>
      <Head><title>All Tickets | EventHub Super Admin</title></Head>
      <div style={{ padding: 'max(16px, 2vw)', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, rgb(67, 56, 202) 0%, rgb(139, 92, 246) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(67, 56, 202, 0.2)' }}>
            <ScanOutlined style={{ color: 'white', fontSize: '24px' }} />
          </div>
          <Title level={2} style={{ margin: 0, fontWeight: 800 }}>All Purchased Tickets</Title>
        </div>

        <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }} bodyStyle={{ padding: 0 }}>
          <Table
            columns={columns}
            dataSource={allTickets}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 15 }}
            style={{ padding: '24px' }}
            scroll={{ x: 800 }}
          />
        </Card>
      </div>
    </ConfigProvider>
  );
}
