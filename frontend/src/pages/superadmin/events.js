import React, { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_EVENTS } from '@/features/events/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Table, Typography, Card, ConfigProvider, Tag, Input, Select, Space } from 'antd';
import { GlobalOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import LoadingScreen from '@/components/LoadingScreen';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function SuperAdminEvents() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'SUPER_ADMIN')) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const { data, loading } = useQuery(GET_EVENTS, {
    skip: !user || user.role !== 'SUPER_ADMIN',
    fetchPolicy: 'network-only'
  });

  if (authLoading || (loading && !data)) return <LoadingScreen message="Scanning global event network..." />;
  if (!user || user.role !== 'SUPER_ADMIN') return null;

  const events = (data?.events || []).filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchText.toLowerCase()) ||
      e.organizer?.name?.toLowerCase().includes(searchText.toLowerCase());
    const matchesType = typeFilter === 'ALL' || e.eventType === typeFilter;
    return matchesSearch && matchesType;
  });

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
              <GlobalOutlined style={{ color: 'white', fontSize: '32px' }} />
            </div>
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontWeight: 900, fontSize: '2rem', color: 'white', letterSpacing: '-0.5px' }}>Event Registry</h2>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '1rem', fontWeight: 500 }}>System-wide event monitoring and control</p>
            </div>
          </div>
          <Space size="middle" style={{ flexWrap: 'wrap' }}>
            <Input
              placeholder="Search events or organizers..."
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
              onChange={setTypeFilter}
              options={[
                { value: 'ALL', label: 'All Types' },
                { value: 'WEDDING', label: '💍 Wedding' },
                { value: 'CORPORATE', label: '🏢 Corporate' },
                { value: 'BIRTHDAY', label: '🎂 Birthday' },
                { value: 'SEMINAR', label: '🎓 Seminar / Tech' },
                { value: 'OTHER', label: '🌟 Other' },
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
