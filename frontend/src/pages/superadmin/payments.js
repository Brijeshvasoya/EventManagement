import React, { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_EVENTS } from '@/features/events/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Table, Typography, Card, ConfigProvider } from 'antd';
import { DollarCircleOutlined } from '@ant-design/icons';

const { Title } = Typography;

export default function SuperAdminPayments() {
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

  const paymentData = Object.values(organizerMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
  console.log("🚀 ~ SuperAdminPayments ~ paymentData:", paymentData)

  const columns = [
    {
      title: 'Organizer Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span style={{ fontWeight: 700, color: '#1B2A4E' }}>{text}</span>
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Total Events',
      dataIndex: 'totalEvents',
      key: 'totalEvents',
    },
    {
      title: 'Total Revenue',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      render: (rev) => <span style={{ fontWeight: 800, color: '#10B981' }}>₹{Number(rev).toLocaleString()}</span>
    },
    {
      title: 'Platform Fee (10%)',
      key: 'fee',
      render: (_, record) => <span style={{ fontWeight: 700, color: '#F59E0B' }}>₹{Number(record.totalRevenue * 0.1).toLocaleString()}</span>
    },
    {
      title: 'Available Payout',
      key: 'availablePayout',
      render: (_, record) => {
        const available = (record.totalRevenue * 0.9) - record.totalWithdrawn;
        return <span style={{ fontWeight: 700, color: '#6366F1' }}>₹{Number(Math.max(0, available)).toLocaleString()}</span>;
      }
    },
    {
      title: 'Actual Paid Out',
      key: 'paidOut',
      render: (_, record) => <span style={{ fontWeight: 800, color: '#8B5CF6' }}>₹{Number(record.totalWithdrawn).toLocaleString()}</span>
    }
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: 'rgb(67, 56, 202)' } }}>
      <Head><title>Payment Tracking | EventHub Super Admin</title></Head>
      <div style={{ padding: 'max(16px, 2vw)', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, rgb(67, 56, 202) 0%, rgb(139, 92, 246) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(67, 56, 202, 0.2)' }}>
            <DollarCircleOutlined style={{ color: 'white', fontSize: '24px' }} />
          </div>
          <Title level={2} style={{ margin: 0, fontWeight: 800 }}>Organizer Payment Tracking</Title>
        </div>

        <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }} bodyStyle={{ padding: 0 }}>
          <Table
            columns={columns}
            dataSource={paymentData}
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
