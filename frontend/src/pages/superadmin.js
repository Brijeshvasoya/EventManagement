import React, { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Table, Tag, Card, Row, Col, Statistic, ConfigProvider, Input, Select, Space, Typography } from 'antd';
import { UserOutlined, CrownOutlined, SafetyCertificateOutlined, CheckCircleOutlined, CloseCircleOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import LoadingScreen from '@/components/LoadingScreen';

const { Title } = Typography;

const GET_ALL_USERS = gql`
  query GetAllUsers {
    allUsers {
      id
      name
      email
      role
      createdAt
      isPlanPurchased
      planId
    }
  }
`;

export default function SuperAdmin() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const { data, loading, error } = useQuery(GET_ALL_USERS, {
    skip: !user || user.role !== 'SUPER_ADMIN'
  });

  if (authLoading || (loading && !data)) return <LoadingScreen message="Accessing global systems..." />;

  if (!user || user.role !== 'SUPER_ADMIN') return null;

  const users = (data?.allUsers || []).filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchText.toLowerCase()) ||
      u.email.toLowerCase().includes(searchText.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });
  console.log("🚀 ~ SuperAdmin ~ users:", users)

  const columns = [
    {
      title: 'User',
      key: 'user',
      fixed: 'left',
      width: 250,
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 700, color: '#1E293B' }}>{record.name}</span>
          <Typography.Text type="secondary" style={{ fontSize: '0.8rem' }} ellipsis={{ tooltip: record.email }}>
            {record.email}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 150,
      render: role => {
        let color = 'blue';
        let icon = <UserOutlined />;
        if (role === 'SUPER_ADMIN') { color = 'magenta'; icon = <CrownOutlined />; }
        if (role === 'ADMIN') { color = 'purple'; icon = <SafetyCertificateOutlined />; }
        if (role === 'ORGANIZER') { color = 'cyan'; }
        return <Tag color={color} icon={icon}>{role}</Tag>;
      }
    },
    {
      title: 'Plan Status',
      key: 'plan',
      width: 150,
      render: (_, record) => {
        if (record.role !== 'ORGANIZER') return '-';
        if (record.isPlanPurchased) {
          return <Tag color="success" icon={<CheckCircleOutlined />}>{record.planId || 'ACTIVE'}</Tag>;
        }
        return <Tag color="error" icon={<CloseCircleOutlined />}>UNPAID</Tag>;
      }
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: text => {
        if (!text) return '-';
        const num = Number(text);
        const date = new Date(isNaN(num) ? text : num);
        return date.toLocaleDateString();
      }
    }
  ];

  const totalUsers = users.filter(u => u.role === 'USER').length;
  const totalOrganizers = users.filter(u => u.role === 'ORGANIZER').length;
  const paidOrganizers = users.filter(u => u.role === 'ORGANIZER' && u.isPlanPurchased).length;

  return (
    <ConfigProvider
      theme={{
        token: { colorPrimary: 'rgb(67, 56, 202)' }
      }}
    >
      <Head><title>Super Admin Dashboard | EventHub</title></Head>
      <div style={{ padding: 'max(16px, 2vw)', margin: '0 auto', boxSizing: 'border-box', width: '100%' }}>
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
              <CrownOutlined style={{ color: 'white', fontSize: '32px' }} />
            </div>
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontWeight: 900, fontSize: '2rem', color: 'white', letterSpacing: '-0.5px' }}>Global Monitor</h2>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '1rem', fontWeight: 500 }}>System-wide user management & analytics</p>
            </div>
          </div>
        </div>

        <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
          <Col xs={24} sm={8}>
            <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <Statistic title={<span style={{ fontWeight: 600, color: '#64748B' }}>Total Users</span>} value={totalUsers} prefix={<UserOutlined style={{ color: '#3B82F6' }} />} valueStyle={{ fontWeight: 800, fontSize: '2rem' }} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <Statistic title={<span style={{ fontWeight: 600, color: '#64748B' }}>Total Organizers</span>} value={totalOrganizers} prefix={<SafetyCertificateOutlined style={{ color: '#8B5CF6' }} />} valueStyle={{ fontWeight: 800, fontSize: '2rem' }} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <Statistic title={<span style={{ fontWeight: 600, color: '#64748B' }}>Paid Organizers</span>} value={paidOrganizers} prefix={<CheckCircleOutlined style={{ color: '#10B981' }} />} suffix={`/ ${totalOrganizers}`} valueStyle={{ fontWeight: 800, fontSize: '2rem' }} />
            </Card>
          </Col>
        </Row>

        <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }} styles={{ body: { padding: 0 } }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <Title level={4} style={{ margin: 0, fontWeight: 700 }}>System Users</Title>
            <Space size="middle" style={{ flexWrap: 'wrap' }}>
              <Input
                placeholder="Search users..."
                prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
                onChange={e => setSearchText(e.target.value)}
                style={{ width: '250px', borderRadius: '10px' }}
                allowClear
              />
              <Select
                defaultValue="ALL"
                style={{ width: 150 }}
                onChange={setRoleFilter}
                options={[
                  { value: 'ALL', label: 'All Roles' },
                  { value: 'USER', label: 'Users' },
                  { value: 'ORGANIZER', label: 'Organizers' },
                  { value: 'ADMIN', label: 'Admins' },
                  { value: 'SUPER_ADMIN', label: 'Super Admins' },
                ]}
              />
            </Space>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <Table
              columns={columns}
              dataSource={users}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              style={{ padding: '0 24px 24px' }}
              scroll={{ x: 800 }}
            />
          </div>
        </Card>
      </div>
    </ConfigProvider>
  );
}
