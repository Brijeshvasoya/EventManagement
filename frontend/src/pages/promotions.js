import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Typography, Card, Col, Row, Tag, Button, Modal, Form, InputNumber, notification, Spin, Empty, Statistic, Divider, Badge, Table } from 'antd';
import { DollarCircleOutlined, TeamOutlined, RiseOutlined, RocketOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { GET_MY_PROMOTIONS, GET_MY_COMMISSION_PAYOUTS, GET_ME } from '../features/events/graphql/queries';
import { REQUEST_COMMISSION_PAYOUT } from '../features/events/graphql/mutations';

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

export default function PromotionsPage() {
  const { data: meData } = useQuery(GET_ME);
  const { data: promoData, loading: promoLoading } = useQuery(GET_MY_PROMOTIONS);
  const { data: payoutData, loading: payoutLoading } = useQuery(GET_MY_COMMISSION_PAYOUTS);

  const [requestPayout] = useMutation(REQUEST_COMMISSION_PAYOUT, {
    refetchQueries: [{ query: GET_MY_PROMOTIONS }, { query: GET_MY_COMMISSION_PAYOUTS }, { query: GET_ME }]
  });

  const [payoutModalVisible, setPayoutModalVisible] = useState(false);
  const [selectedPartnership, setSelectedPartnership] = useState(null);
  const [form] = Form.useForm();

  const user = meData?.me;
  const partnerships = promoData?.getMyPromotions || [];
  const payouts = payoutData?.getMyCommissionPayouts || [];

  if (promoLoading || payoutLoading) return <div style={{ textAlign: 'center', padding: '100px' }}><Spin size="large" tip="Loading Your Promotions..." /></div>;

  const handleRequestPayout = async (values) => {
    try {
      await requestPayout({
        variables: {
          partnershipId: selectedPartnership.id,
          amount: values.amount
        }
      });
      notification.success({ message: 'Payout requested successfully!' });
      setPayoutModalVisible(false);
      form.resetFields();
    } catch (err) {
      notification.error({ message: err.message || 'Failed to request payout' });
    }
  };

  const openPayoutModal = (partnership) => {
    setSelectedPartnership(partnership);
    const available = partnership.totalCommissionEarned - partnership.totalCommissionPaidOut;
    form.setFieldsValue({ amount: available });
    setPayoutModalVisible(true);
  };

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
          background: 'linear-gradient(135deg, #1B2A4E 0%, #312E81 50%, #4338CA 100%)',
          borderRadius: '24px',
          padding: '40px',
          color: 'white',
          boxShadow: '0 20px 40px rgba(49, 46, 129, 0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'relative', zIndex: 2 }}>
          <Title level={1} style={{ color: 'white', margin: 0, fontWeight: 900, fontSize: '2.5rem' }}>Promoter Dashboard</Title>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem', display: 'block', marginTop: '8px' }}>
            Track your performance, manage active promotions, and withdraw your earned commissions.
          </Text>
        </div>
        <RocketOutlined style={{ position: 'absolute', right: '40px', top: '50%', transform: 'translateY(-50%)', fontSize: '8rem', color: 'rgba(255,255,255,0.05)' }} />
      </motion.div>

      {/* KPI Stats */}
      <motion.div variants={fadeInUp} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        {[
          { title: 'Withdrawable', val: user?.withdrawableCommission || 0, icon: <DollarCircleOutlined />, color: '#10B981', bg: '#ECFDF5' },
          { title: 'Pending', val: user?.pendingCommission || 0, icon: <RiseOutlined />, color: '#F59E0B', bg: '#FFFBEB' },
          { title: 'Total Earned', val: user?.totalCommissionEarned || 0, icon: <TeamOutlined />, color: '#4338CA', bg: '#EEF2FF' }
        ].map((stat, i) => (
          <Card key={i} style={{ borderRadius: '20px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: stat.bg, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                {stat.icon}
              </div>
              <div>
                <Text type="secondary" strong style={{ fontSize: '0.85rem' }}>{stat.title}</Text>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1B2A4E' }}>₹{stat.val.toLocaleString()}</div>
              </div>
            </div>
          </Card>
        ))}
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Title level={3} style={{ fontWeight: 800, marginBottom: '20px' }}>Active Promotions</Title>
        {partnerships.length === 0 ? (
          <Card style={{ borderRadius: '20px', textAlign: 'center', padding: '40px' }}>
            <Empty description="No active promotions found. Apply to events to start earning!" />
          </Card>
        ) : (
          <Row gutter={[24, 24]}>
            {partnerships.map(p => {
              const availableToWithdraw = p.totalCommissionEarned - p.totalCommissionPaidOut;
              const canWithdraw = p.isWithdrawable && availableToWithdraw > 0 && p.status === 'APPROVED';

              return (
                <Col xs={24} md={12} key={p.id}>
                  <Card
                    style={{ borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid #F1F5F9' }}
                    title={<span style={{ fontWeight: 800 }}>{p.event.title}</span>}
                    extra={<Tag color={p.status === 'APPROVED' ? 'green' : p.status === 'PENDING' ? 'orange' : 'red'}>{p.status}</Tag>}
                  >
                    <Row gutter={[16, 16]}>
                      <Col span={12}><Statistic title="Promo Code" value={p.promoCode || 'N/A'} valueStyle={{ fontSize: 18, fontWeight: 800, color: '#4338CA' }} /></Col>
                      <Col span={12}><Statistic title="Commission" value={`${p.commissionPercent || 0}%`} valueStyle={{ fontSize: 18, fontWeight: 700 }} /></Col>
                      <Col span={12}><Statistic title="Sales" value={p.usageCount} prefix={<TeamOutlined />} valueStyle={{ fontSize: 18 }} /></Col>
                      <Col span={12}><Statistic title="Earned" value={p.totalCommissionEarned} precision={2} prefix="₹" valueStyle={{ fontSize: 18, color: '#10B981', fontWeight: 800 }} /></Col>
                    </Row>
                    <Divider style={{ margin: '16px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" strong>Paid Out: ₹{p.totalCommissionPaidOut.toFixed(2)}</Text>
                      {canWithdraw ? (
                        <Button type="primary" shape="round" size="large" onClick={() => openPayoutModal(p)} style={{ background: '#10B981', border: 'none', fontWeight: 700 }}>Request Payout</Button>
                      ) : (
                        <Button disabled shape="round">Payout Locked</Button>
                      )}
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Title level={3} style={{ fontWeight: 800, marginTop: '20px', marginBottom: '20px' }}>Payout History</Title>
        <Card style={{ borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <Table
            dataSource={payouts}
            rowKey="id"
            columns={[
              { title: 'Event', dataIndex: ['event', 'title'], key: 'event', render: t => <span style={{ fontWeight: 600 }}>{t}</span> },
              { title: 'Amount', dataIndex: 'amount', key: 'amount', render: v => <span style={{ color: '#10B981', fontWeight: 700 }}>₹{v.toFixed(2)}</span> },
              { title: 'Date', dataIndex: 'createdAt', key: 'date', render: d => new Date(parseInt(d)).toLocaleDateString() },
              { title: 'Status', dataIndex: 'status', key: 'status', render: s => <Tag color={s === 'COMPLETED' ? 'green' : s === 'PENDING' ? 'orange' : 'red'}>{s}</Tag> }
            ]}
          />
        </Card>
      </motion.div>

      <Modal
        title={<span style={{ fontSize: '1.2rem', fontWeight: 800 }}>Request Payout</span>}
        open={payoutModalVisible}
        onCancel={() => { setPayoutModalVisible(false); form.resetFields(); }}
        footer={null}
        centered
      >
        <Form form={form} layout="vertical" onFinish={handleRequestPayout} style={{ marginTop: '20px' }}>
          <Form.Item label="Source Event">
            <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '12px', fontWeight: 700 }}>{selectedPartnership?.event.title}</div>
          </Form.Item>
          <Form.Item
            label="Amount to Withdraw (₹)"
            name="amount"
            rules={[
              { required: true, message: 'Please enter amount' },
              { type: 'number', min: 100, message: 'Minimum ₹100' },
              {
                type: 'number',
                max: selectedPartnership ? selectedPartnership.totalCommissionEarned - selectedPartnership.totalCommissionPaidOut : 0,
                message: 'Exceeds available balance'
              }
            ]}
          >
            <InputNumber size="large" style={{ width: '100%', borderRadius: '12px' }} prefix="₹" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" style={{ marginTop: '20px', height: '50px', fontWeight: 700, borderRadius: '12px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', border: 'none' }}>
            Confirm Withdrawal Request
          </Button>
        </Form>
      </Modal>
    </motion.div>
  );
}
