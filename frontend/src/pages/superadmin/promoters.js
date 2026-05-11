import React from 'react';
import { useQuery } from '@apollo/client/react';
import { Typography, Card, Table, Spin, Tag, Avatar } from 'antd';
import { UserOutlined, GlobalOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { GET_ALL_PROMOTERS } from '../../features/events/graphql/queries';

const { Title, Text } = Typography;

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function SuperAdminPromotersPage() {
  const { data, loading, error } = useQuery(GET_ALL_PROMOTERS);

  if (loading) return <div style={{ textAlign: 'center', padding: '100px' }}><Spin size="large" tip="Loading Platform Promoters..." /></div>;
  if (error) return <div style={{ textAlign: 'center', padding: '100px' }}><Text type="danger">{error.message}</Text></div>;

  const promoters = data?.getAllPromoters || [];

  const columns = [
    { 
      title: 'Promoter', 
      key: 'promoter',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar icon={<UserOutlined />} style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)' }} />
          <div>
            <div style={{ fontWeight: 700, color: '#1B2A4E' }}>{record.name}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{record.email}</div>
          </div>
        </div>
      )
    },
    { title: 'Joined', dataIndex: 'createdAt', key: 'createdAt', render: val => new Date(parseInt(val)).toLocaleDateString() },
    { title: 'Tickets Sold', dataIndex: 'totalTicketsSold', key: 'totalTicketsSold', render: val => <Tag color="blue" style={{ fontWeight: 700, borderRadius: '6px' }}>{val}</Tag> },
    { title: 'Total Earned', dataIndex: 'totalCommissionEarned', key: 'totalCommissionEarned', render: val => <span style={{ fontWeight: 700, color: '#10B981' }}>₹{val.toFixed(2)}</span> },
    { title: 'Withdrawable', dataIndex: 'withdrawableCommission', key: 'withdrawableCommission', render: val => `₹${val.toFixed(2)}` }
  ];

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}
    >
      {/* Premium Hero Section */}
      <motion.div
        variants={fadeInUp}
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
          borderRadius: '24px',
          padding: '40px',
          color: 'white',
          boxShadow: '0 20px 40px rgba(30, 27, 75, 0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'relative', zIndex: 2 }}>
          <Title level={1} style={{ color: 'white', margin: 0, fontWeight: 900, fontSize: '2.5rem' }}>Global Promoter Network</Title>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem', display: 'block', marginTop: '8px' }}>
            Platform-wide overview of all affiliate activity, performance metrics, and commission data.
          </Text>
        </div>
        <GlobalOutlined style={{ position: 'absolute', right: '40px', top: '50%', transform: 'translateY(-50%)', fontSize: '8rem', color: 'rgba(255,255,255,0.05)' }} />
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Card style={{ borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: 'none' }} styles={{ body: { padding: '0' } }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', background: '#EEF2FF', borderRadius: '10px', color: '#4338CA', display: 'flex' }}>
              <ThunderboltOutlined />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1B2A4E' }}>Active Platform Promoters</span>
          </div>
          <Table
            dataSource={promoters}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 20 }}
            style={{ borderRadius: '0 0 24px 24px' }}
          />
        </Card>
      </motion.div>
    </motion.div>
  );
}
