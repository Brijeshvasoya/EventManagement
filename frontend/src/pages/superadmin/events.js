import React, { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_EVENTS } from '@/features/events/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Table, Typography, Card, ConfigProvider, Tag } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function SuperAdminEvents() {
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

  const columns = [
    {
      title: 'Event Title',
      dataIndex: 'title',
      key: 'title',
      render: (text) => <span style={{ fontWeight: 700, color: '#1B2A4E' }}>{text}</span>
    },
    {
      title: 'Organizer',
      key: 'organizer',
      render: (_, record) => record.organizer?.name || 'Unknown'
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date) => {
        const num = Number(date);
        const validDate = isNaN(num) ? date : num;
        return dayjs(validDate).format('MMM D, YYYY h:mm A');
      }
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Type',
      dataIndex: 'eventType',
      key: 'eventType',
      render: (type) => <Tag color="blue">{type || 'GENERAL'}</Tag>
    },
    {
      title: 'Capacity',
      dataIndex: 'capacity',
      key: 'capacity',
      render: (cap, record) => `${record.bookedCount || 0} / ${cap || '∞'}`
    }
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: 'rgb(67, 56, 202)' } }}>
      <Head><title>All Events | EventHub Super Admin</title></Head>
      <div style={{ padding: 'max(16px, 2vw)', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, rgb(67, 56, 202) 0%, rgb(139, 92, 246) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(67, 56, 202, 0.2)' }}>
            <GlobalOutlined style={{ color: 'white', fontSize: '24px' }} />
          </div>
          <Title level={2} style={{ margin: 0, fontWeight: 800 }}>All Events</Title>
        </div>

        <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }} bodyStyle={{ padding: 0 }}>
          <Table
            columns={columns}
            dataSource={events}
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
