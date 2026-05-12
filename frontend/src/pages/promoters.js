import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Typography, Card, Table, Tag, Button, Modal, Form, Select, InputNumber, notification, Spin, Tabs, Badge, Row, Col } from 'antd';
import { CheckOutlined, CloseOutlined, TeamOutlined, DollarCircleOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { GET_MY_PROMOTER_REQUESTS, GET_MY_PROMOTER_PAYOUT_REQUESTS } from '../features/events/graphql/queries';
import {
  APPROVE_AFFILIATE_PARTNERSHIP,
  REJECT_AFFILIATE_PARTNERSHIP,
  APPROVE_COMMISSION_PAYOUT,
  REJECT_COMMISSION_PAYOUT
} from '../features/events/graphql/mutations';

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

export default function PromotersManagementPage() {
  const { data: requestsData, loading: requestsLoading } = useQuery(GET_MY_PROMOTER_REQUESTS);
  const { data: payoutsData, loading: payoutsLoading } = useQuery(GET_MY_PROMOTER_PAYOUT_REQUESTS);

  const [approvePartnership] = useMutation(APPROVE_AFFILIATE_PARTNERSHIP, {
    refetchQueries: [{ query: GET_MY_PROMOTER_REQUESTS }]
  });
  const [rejectPartnership] = useMutation(REJECT_AFFILIATE_PARTNERSHIP, {
    refetchQueries: [{ query: GET_MY_PROMOTER_REQUESTS }]
  });
  const [approvePayout] = useMutation(APPROVE_COMMISSION_PAYOUT, {
    refetchQueries: [{ query: GET_MY_PROMOTER_PAYOUT_REQUESTS }, { query: GET_MY_PROMOTER_REQUESTS }]
  });
  const [rejectPayout] = useMutation(REJECT_COMMISSION_PAYOUT, {
    refetchQueries: [{ query: GET_MY_PROMOTER_PAYOUT_REQUESTS }]
  });

  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [selectedPartnership, setSelectedPartnership] = useState(null);
  const [form] = Form.useForm();

  if (requestsLoading || payoutsLoading) return <div style={{ textAlign: 'center', padding: '100px' }}><Spin size="large" tip="Loading Promoter Data..." /></div>;

  const partnerships = requestsData?.getMyPromoterRequests || [];
  const payouts = payoutsData?.getMyPromoterPayoutRequests || [];

  const handleApprovePartnership = async (values) => {
    try {
      await approvePartnership({
        variables: {
          partnershipId: selectedPartnership.id,
          commissionPercent: values.commissionPercent,
          customerDiscount: values.customerDiscount || 0
        }
      });
      notification.success({ message: 'Promoter approved successfully!' });
      setApprovalModalVisible(false);
      form.resetFields();
    } catch (err) {
      notification.error({ message: err.message || 'Failed to approve promoter' });
    }
  };

  const handleRejectPartnership = async (id) => {
    Modal.confirm({
      title: 'Reject Promoter Application?',
      content: 'Are you sure you want to reject this promoter?',
      onOk: async () => {
        try {
          await rejectPartnership({ variables: { partnershipId: id } });
          notification.success({ message: 'Promoter rejected' });
        } catch (err) {
          notification.error({ message: err.message });
        }
      }
    });
  };

  const handleApprovePayout = async (id) => {
    Modal.confirm({
      title: 'Approve Payout?',
      content: 'This will transfer funds to the promoter via Stripe Connect. Proceed?',
      onOk: async () => {
        try {
          await approvePayout({ variables: { payoutId: id } });
          notification.success({ message: 'Payout completed successfully' });
        } catch (err) {
          notification.error({ message: err.message });
        }
      }
    });
  };

  const handleRejectPayout = async (id) => {
    Modal.confirm({
      title: 'Reject Payout?',
      content: 'Are you sure you want to reject this payout request?',
      onOk: async () => {
        try {
          await rejectPayout({ variables: { payoutId: id } });
          notification.success({ message: 'Payout rejected' });
        } catch (err) {
          notification.error({ message: err.message });
        }
      }
    });
  };

  const partnershipColumns = [
    { title: 'Promoter', dataIndex: ['promoter', 'name'], key: 'promoter' },
    { title: 'Event', dataIndex: ['event', 'title'], key: 'event' },
    {
      title: 'Status', dataIndex: 'status', key: 'status', render: status => (
        <Tag color={status === 'APPROVED' ? 'green' : status === 'PENDING' ? 'orange' : 'red'}>{status}</Tag>
      )
    },
    { title: 'Sales', key: 'sales', render: (_, r) => `${r.usageCount} (₹${r.totalCommissionEarned.toFixed(2)})` },
    {
      title: 'Actions', key: 'actions', render: (_, record) => (
        record.status === 'PENDING' ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="small" type="primary" onClick={() => {
              setSelectedPartnership(record);
              form.setFieldsValue({ commissionPercent: 10, customerDiscount: 5 });
              setApprovalModalVisible(true);
            }}>Approve</Button>
            <Button size="small" danger icon={<CloseOutlined />} onClick={() => handleRejectPartnership(record.id)}>Reject</Button>
          </div>
        ) : <Text type="secondary">Processed</Text>
      )
    }
  ];

  const payoutColumns = [
    { title: 'Promoter', dataIndex: ['promoter', 'name'], key: 'promoter' },
    { title: 'Event', dataIndex: ['event', 'title'], key: 'event' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: val => `₹${val.toFixed(2)}` },
    {
      title: 'Status', dataIndex: 'status', key: 'status', render: status => (
        <Tag color={status === 'COMPLETED' ? 'green' : status === 'PENDING' ? 'orange' : 'red'}>{status}</Tag>
      )
    },
    {
      title: 'Actions', key: 'actions', render: (_, record) => (
        record.status === 'PENDING' ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleApprovePayout(record.id)}>Approve</Button>
            <Button size="small" danger icon={<CloseOutlined />} onClick={() => handleRejectPayout(record.id)}>Reject</Button>
          </div>
        ) : <Text type="secondary">Processed</Text>
      )
    }
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
          <Title level={1} style={{ color: 'white', margin: 0, fontWeight: 900, fontSize: '2.5rem' }}>Promoter Network</Title>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem', display: 'block', marginTop: '8px', marginBottom: '24px' }}>
            Manage your affiliate partners, review applications, and process commission payouts.
          </Text>
          
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '16px 24px', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Paid Out</Text>
              <Title level={2} style={{ color: '#10B981', margin: 0 }}>₹{partnerships.reduce((acc, p) => acc + (p.totalCommissionPaidOut || 0), 0).toFixed(2)}</Title>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '16px 24px', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Pending Payouts</Text>
              <Title level={2} style={{ color: '#F59E0B', margin: 0 }}>₹{partnerships.reduce((acc, p) => acc + ((p.totalCommissionEarned || 0) - (p.totalCommissionPaidOut || 0)), 0).toFixed(2)}</Title>
            </div>
          </div>
        </div>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Tabs
          defaultActiveKey="1"
          type="card"
          items={[
            {
              key: '1',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                  <TeamOutlined /> Applications
                  <Badge count={partnerships.filter(p => p.status === 'PENDING').length} style={{ backgroundColor: '#4338CA' }} size="small" />
                </span>
              ),
              children: (
                <Card style={{ borderRadius: '0 0 20px 20px', borderTop: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                  <Table dataSource={partnerships} columns={partnershipColumns} rowKey="id" pagination={{ pageSize: 10 }} />
                </Card>
              )
            },
            {
              key: '2',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                  <DollarCircleOutlined /> Payout Requests
                  <Badge count={payouts.filter(p => p.status === 'PENDING').length} style={{ backgroundColor: '#10B981' }} size="small" />
                </span>
              ),
              children: (
                <Card style={{ borderRadius: '0 0 20px 20px', borderTop: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                  <Table dataSource={payouts} columns={payoutColumns} rowKey="id" pagination={{ pageSize: 10 }} />
                </Card>
              )
            }
          ]}
        />
      </motion.div>

      <Modal
        title={
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>Approve Promoter</span>
            <Text type="secondary">Reviewing application for: {selectedPartnership?.event.title}</Text>
          </div>
        }
        open={approvalModalVisible}
        onCancel={() => {
          setApprovalModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        centered
      >
        <Form form={form} layout="vertical" onFinish={handleApprovePartnership} style={{ marginTop: '20px' }}>
          <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '16px', marginBottom: '24px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>Event Pricing Tiers</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(selectedPartnership?.event.ticketTypes || []).map((tier, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'white', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                  <Text strong style={{ color: '#475569' }}>{tier.name}</Text>
                  <Text style={{ fontWeight: 800, color: '#1B2A4E' }}>₹{tier.price}</Text>
                </div>
              ))}
            </div>
          </div>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Commission (%)" name="commissionPercent" extra="Promoter earnings" rules={[{ required: true }]}>
                <InputNumber size="large" style={{ width: '100%', borderRadius: '12px' }} min={0} max={50} addonAfter="%" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Customer Discount (%)" name="customerDiscount" extra="Incentive for buyers" rules={[{ required: true }]}>
                <InputNumber size="large" style={{ width: '100%', borderRadius: '12px' }} min={0} max={20} addonAfter="%" />
              </Form.Item>
            </Col>
          </Row>

          <Button type="primary" htmlType="submit" block size="large" style={{ marginTop: '20px', height: '50px', fontWeight: 700, borderRadius: '12px', background: 'linear-gradient(135deg, #1B2A4E 0%, #4338CA 100%)', border: 'none' }}>
            Approve & Onboard
          </Button>
        </Form>
      </Modal>
    </motion.div>
  );
}
