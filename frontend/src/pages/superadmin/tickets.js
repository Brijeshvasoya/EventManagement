import React, { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_EVENTS } from '@/features/events/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Table, Typography, Card, ConfigProvider, Tag, Input, Select, Space } from 'antd';
import { ScanOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import LoadingScreen from '@/components/LoadingScreen';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function SuperAdminTickets() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'SUPER_ADMIN')) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const { data, loading } = useQuery(GET_EVENTS, {
    skip: !user || user.role !== 'SUPER_ADMIN',
    fetchPolicy: 'network-only'
  });

  if (authLoading || (loading && !data)) return <LoadingScreen message="Accessing ticket database..." />;
  if (!user || user.role !== 'SUPER_ADMIN') return null;

  const events = data?.events || [];

  const allTickets = events.flatMap(event =>
    (event.attendees || []).map(attendee => ({
      ...attendee,
      eventTitle: event.title,
      organizerName: event.organizer?.name || 'Unknown'
    }))
  ).filter(t => {
    const matchesSearch = t.eventTitle.toLowerCase().includes(searchText.toLowerCase()) ||
      t.user?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      t.user?.email?.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
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
              borderRadius: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1.5px solid rgba(255,255,255,0.2)',
              boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
            }}>
              <ScanOutlined style={{ color: 'white', fontSize: '32px' }} />
            </div>
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontWeight: 900, fontSize: '2rem', color: 'white', letterSpacing: '-0.5px' }}>Ticket Archive</h2>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '1rem', fontWeight: 500 }}>Global ticket verification and sales tracking</p>
            </div>
          </div>
          <Space size="middle" style={{ flexWrap: 'wrap' }}>
            <Input
              placeholder="Search by event or buyer..."
              prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.7)' }} />}
              onChange={e => setSearchText(e.target.value)}
              style={{
                width: '280px',
                borderRadius: '14px',
                height: '44px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#ffffff'
              }}
              className="hero-input"
              allowClear
            />
            <Select
              defaultValue="ALL"
              style={{ width: '160px', height: '44px', background: 'transparent', borderColor: 'var(--glass-border)', color: 'white' }}
              className="superadmin-select"
              onChange={setStatusFilter}
              options={[
                { value: 'ALL', label: 'All Status' },
                { value: 'CONFIRMED', label: 'Confirmed' },
                { value: 'CHECKED_IN', label: 'Checked In' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
          </Space>
        </div>

        <style jsx global>{`
          .hero-input::placeholder {
            color: rgba(255, 255, 255, 0.6) !important;
          }
          .hero-input .ant-input {
            background: transparent !important;
            color: white !important;
          }
          .hero-input.ant-input-affix-wrapper:focus, 
          .hero-input.ant-input-affix-wrapper-focused {
            border-color: rgba(255, 255, 255, 0.8) !important;
            box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.1) !important;
          }
          .superadmin-select .ant-select-selector {
            background: #ffffff !important;
            border: 1px solid rgba(255, 255, 255, 0.3) !important;
            border-radius: 14px !important;
            height: 44px !important;
            display: flex !important;
            align-items: center !important;
            color: #1B2A4E !important;
          }
          .superadmin-select .ant-select-selection-item {
            color: #1B2A4E !important;
            font-weight: 700 !important;
          }
          .superadmin-select .ant-select-arrow {
            color: #1B2A4E !important;
          }
        `}</style>

        <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }} styles={{ body: { padding: 0 } }}>
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
