import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_EVENTS, GET_ALL_PAYOUTS, APPROVE_PAYOUT } from '@/features/events/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Table, Typography, Card, ConfigProvider, Button, Tag, App, Space, Divider, Empty, Popover, Input, Tabs, Badge, Select } from 'antd';
import { DollarCircleOutlined, CheckCircleOutlined, ClockCircleOutlined, BankOutlined, InfoCircleOutlined, CreditCardOutlined, SearchOutlined, WalletOutlined, HourglassOutlined, HistoryOutlined, FilterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function SuperAdminPayments() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('ALL');
  const [revenueFilter, setRevenueFilter] = useState('ALL');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'SUPER_ADMIN')) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const { data, loading, refetch: refetchEvents } = useQuery(GET_EVENTS, {
    skip: !user || user.role !== 'SUPER_ADMIN',
    fetchPolicy: 'network-only'
  });

  const { data: payoutData, loading: loadingPayouts, refetch: refetchPayouts } = useQuery(GET_ALL_PAYOUTS, {
    skip: !user || user.role !== 'SUPER_ADMIN'
  });

  const { message } = App.useApp();
  const [approvePayout, { loading: approving }] = useMutation(APPROVE_PAYOUT, {
    onCompleted: () => {
      message.success('Payout approved successfully!');
      refetchPayouts();
      refetchEvents();
    },
    onError: (error) => message.error(error.message)
  });

  if (authLoading) return null;
  if (!user || user.role !== 'SUPER_ADMIN') return null;

  const events = data?.events || [];
  // Group by organizer
  const organizerMap = {};
  events.forEach(event => {
    if (!event.organizer) return;
    const orgId = event.organizer.id;
    if (!organizerMap[orgId]) {
      organizerMap[orgId] = {
        id: orgId,
        name: event.organizer.name,
        email: event.organizer.email,
        totalWithdrawn: event.organizer.totalWithdrawn || 0,
        totalRevenue: 0,
        totalEvents: 0
      };
    }
    organizerMap[orgId].totalEvents += 1;

    // Sum revenue from attendees
    if (event.attendees) {
      event.attendees.forEach(attendee => {
        if (attendee.status !== 'CANCELLED') {
          organizerMap[orgId].totalRevenue += (attendee.amountPaid || 0);
        }
      });
    }
  });

  const paymentData = Object.values(organizerMap)
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchText.toLowerCase()) || 
        item.email.toLowerCase().includes(searchText.toLowerCase());
      const matchesRevenue = revenueFilter === 'ALL' || 
        (revenueFilter === 'HAS_REVENUE' ? item.totalRevenue > 0 : item.totalRevenue === 0);
      return matchesSearch && matchesRevenue;
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  const pendingPayouts = (payoutData?.allPayouts?.filter(p => p.status === 'PENDING') || [])
    .filter(p => 
      p.organizer?.name?.toLowerCase().includes(searchText.toLowerCase()) || 
      p.organizer?.email?.toLowerCase().includes(searchText.toLowerCase())
    );

  const completedPayouts = (payoutData?.allPayouts?.filter(p => p.status === 'COMPLETED') || [])
    .filter(p => 
      p.organizer?.name?.toLowerCase().includes(searchText.toLowerCase()) || 
      p.organizer?.email?.toLowerCase().includes(searchText.toLowerCase())
    );

  const columns = [
    {
      title: 'Organizer',
      key: 'organizer',
      fixed: 'left',
      width: 250,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: '#1B2A4E' }}>{record.name}</Text>
          <Text type="secondary" style={{ fontSize: '0.8rem' }} ellipsis={{ tooltip: record.email }}>
            {record.email}
          </Text>
        </Space>
      )
    },
    {
      title: 'Total Events',
      dataIndex: 'totalEvents',
      key: 'totalEvents',
      width: 120,
      align: 'center',
    },
    {
      title: 'Total Revenue',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      width: 150,
      render: (rev) => <span style={{ fontWeight: 800, color: '#10B981' }}>₹{Number(rev).toLocaleString()}</span>
    },
    {
      title: 'Fee (10%)',
      key: 'fee',
      width: 150,
      render: (_, record) => <span style={{ fontWeight: 700, color: '#F59E0B' }}>₹{Number(record.totalRevenue * 0.1).toLocaleString()}</span>
    },
    {
      title: 'Available Payout',
      key: 'availablePayout',
      width: 160,
      render: (_, record) => {
        const available = (record.totalRevenue * 0.9) - record.totalWithdrawn;
        return <span style={{ fontWeight: 700, color: '#6366F1' }}>₹{Number(Math.max(0, available)).toLocaleString()}</span>;
      }
    },
    {
      title: 'Paid Out',
      key: 'paidOut',
      width: 150,
      render: (_, record) => <span style={{ fontWeight: 800, color: '#8B5CF6' }}>₹{Number(record.totalWithdrawn).toLocaleString()}</span>
    }
  ];

  const payoutRequestsColumns = [
    {
      title: 'Organizer',
      dataIndex: ['organizer', 'name'],
      key: 'orgName',
      fixed: 'left',
      width: 220,
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: '0.8rem' }} ellipsis={{ tooltip: record.organizer.email }}>
            {record.organizer.email}
          </Text>
        </Space>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      render: (amt) => <span style={{ fontWeight: 800, color: '#10B981' }}>₹{Number(amt).toLocaleString()}</span>
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 130,
      render: (date) => dayjs(isNaN(Number(date)) ? date : Number(date)).format('MMM D, YYYY')
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={status === 'COMPLETED' ? 'success' : 'warning'} icon={status === 'COMPLETED' ? <CheckCircleOutlined /> : <ClockCircleOutlined />}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        record.status === 'PENDING' && (
          <Button
            type="primary"
            size="small"
            onClick={() => approvePayout({ variables: { payoutId: record.id } })}
            loading={approving}
            style={{ borderRadius: '6px' }}
          >
            Approve
          </Button>
        )
      )
    }
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: 'rgb(67, 56, 202)' } }}>
      <App>
        <Head><title>Payment Tracking | EventHub Super Admin</title></Head>
        <div style={{ padding: 'max(16px, 2vw)', margin: '0 auto', width: '100%' }}>
          <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, rgb(67, 56, 202) 0%, rgb(139, 92, 246) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(67, 56, 202, 0.2)' }}>
              <DollarCircleOutlined style={{ color: 'white', fontSize: '24px' }} />
            </div>
            <div style={{ flex: 1 }}>
              <Title level={2} style={{ margin: 0, fontWeight: 800 }}>Organizer Financial Oversight</Title>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Input
                placeholder="Search organizers..."
                prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
                onChange={e => setSearchText(e.target.value)}
                style={{ width: '280px', borderRadius: '12px', height: '45px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
                allowClear
              />
            </div>
          </div>

          <div style={{ background: 'white', padding: '24px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <Tabs
              defaultActiveKey="1"
              type="card"
              items={[
                {
                  key: '1',
                  label: (
                    <Space>
                      <WalletOutlined />
                      <span>Revenue Breakdown</span>
                    </Space>
                  ),
                  children: (
                    <>
                      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                        <Select
                          defaultValue="ALL"
                          style={{ width: 200 }}
                          onChange={setRevenueFilter}
                          options={[
                            { value: 'ALL', label: 'All Organizers' },
                            { value: 'HAS_REVENUE', label: 'With Revenue' },
                            { value: 'NO_REVENUE', label: 'No Revenue' },
                          ]}
                        />
                      </div>
                      <Table
                        columns={columns}
                        dataSource={paymentData}
                        rowKey="id"
                        loading={loading}
                        pagination={{ pageSize: 10, showSizeChanger: true }}
                        scroll={{ x: 1000 }}
                      />
                    </>
                  ),
                },
                {
                  key: '2',
                  label: (
                    <Space>
                      <HourglassOutlined />
                      <span>Pending Requests</span>
                      {pendingPayouts.length > 0 && (
                        <Badge count={pendingPayouts.length} style={{ backgroundColor: '#F59E0B' }} size="small" />
                      )}
                    </Space>
                  ),
                  children: (
                    <Table
                      columns={payoutRequestsColumns}
                      dataSource={pendingPayouts}
                      rowKey="id"
                      loading={loadingPayouts}
                      pagination={{ pageSize: 10, showSizeChanger: true }}
                      scroll={{ x: 700 }}
                      locale={{ emptyText: <Empty description={searchText ? "No matching pending requests found." : "No pending requests."} /> }}
                      style={{ marginTop: '16px' }}
                    />
                  ),
                },
                {
                  key: '3',
                  label: (
                    <Space>
                      <HistoryOutlined />
                      <span>Completed Payouts</span>
                    </Space>
                  ),
                  children: (
                    <Table
                      columns={payoutRequestsColumns.filter(c => c.key !== 'action')}
                      dataSource={completedPayouts}
                      rowKey="id"
                      loading={loadingPayouts}
                      pagination={{ pageSize: 10, showSizeChanger: true }}
                      scroll={{ x: 600 }}
                      locale={{ emptyText: <Empty description={searchText ? "No matching completed payouts found." : "No completed payouts."} /> }}
                      style={{ marginTop: '16px' }}
                    />
                  ),
                },
              ]}
              style={{ fontWeight: 600 }}
            />
          </div>
        </div>
      </App>
    </ConfigProvider>
  );
}

