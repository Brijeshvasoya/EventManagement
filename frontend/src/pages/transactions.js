import { useQuery, useMutation } from '@apollo/client/react';
import { GET_MY_EVENTS, GET_MY_ANALYTICS, GET_EVENTS, GET_ME, REQUEST_PAYOUT, GET_MY_PAYOUTS, UPDATE_BANK_DETAILS } from '@/features/events/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import Head from 'next/head';
import { Table, Tag, Card, Row, Col, Statistic, Empty, Button, Modal, InputNumber, Form, message, Alert, Input, Space, Typography, Tooltip as AntTooltip, Select } from 'antd';
import { TagOutlined, DownloadOutlined, WalletOutlined, HistoryOutlined, BankOutlined, CheckCircleFilled, InfoCircleOutlined, SearchOutlined, FilterOutlined, ArrowUpOutlined, CreditCardOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { IndianRupee } from 'lucide-react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function Transactions() {
  const { user, loading: authLoading } = useAuth();
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('ALL');
  const [payoutForm] = Form.useForm();
  const [bankForm] = Form.useForm();

  const { data: userData, refetch: refetchUser } = useQuery(GET_ME, {
    skip: !user || user.role !== 'ORGANIZER'
  });

  const { data: payoutData, refetch: refetchPayouts } = useQuery(GET_MY_PAYOUTS, {
    skip: !user || user.role !== 'ORGANIZER'
  });

  const [requestPayout, { loading: requestingPayout }] = useMutation(REQUEST_PAYOUT, {
    onCompleted: () => {
      message.success('Payout request submitted successfully!');
      setIsPayoutModalOpen(false);
      payoutForm.resetFields();
      refetchUser();
      refetchPayouts();
    },
    onError: (error) => message.error(error.message)
  });

  const [updateBankDetails, { loading: updatingBank }] = useMutation(UPDATE_BANK_DETAILS, {
    onCompleted: () => {
      message.success('Bank details updated successfully!');
      setIsBankModalOpen(false);
      refetchUser();
    },
    onError: (error) => message.error(error.message)
  });

  const { data: allEventsData, loading: loadingAllEvents } = useQuery(GET_EVENTS, {
    fetchPolicy: 'cache-and-network',
    skip: !user || user.role !== 'SUPER_ADMIN'
  });

  const { data: analyticsData } = useQuery(GET_MY_ANALYTICS, {
    skip: !user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')
  });

  const { data: eventsData, loading } = useQuery(GET_MY_EVENTS, {
    fetchPolicy: 'cache-and-network',
    skip: !user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')
  });

  const router = useRouter();

  useEffect(() => {
    if (userData?.me?.bankDetails) {
      bankForm.setFieldsValue(userData.me.bankDetails);
    }
  }, [userData, bankForm]);

  if (authLoading || loading || loadingAllEvents) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px',
        background: 'var(--gradient-main)', animation: 'pulse-glow 2s ease-in-out infinite',
      }} />
    </div>
  );

  let stats = analyticsData?.myAnalytics || { totalRevenue: 0, ticketsSold: 0 };
  const availablePayout = userData?.me?.availablePayout || 0;
  const hasBankDetails = !!userData?.me?.bankDetails?.accountNumber;

  const targetEvents = user?.role === 'SUPER_ADMIN' ? allEventsData?.events : eventsData?.myEvents;

  const allTransactions = (targetEvents?.flatMap(event =>
    event.attendees?.map(attendee => ({
      ...attendee,
      eventTitle: event.title,
      eventId: event.id
    })) || []
  ) || [])
    .filter(t => {
      const matchesSearch = t.eventTitle.toLowerCase().includes(searchText.toLowerCase()) ||
        t.user?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        t.user?.email?.toLowerCase().includes(searchText.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));

  const filteredPayouts = (payoutData?.myPayouts || []).filter(p => 
    payoutStatusFilter === 'ALL' || p.status === payoutStatusFilter
  );

  const handlePayoutSubmit = (values) => {
    if (!hasBankDetails) {
      message.warning('Please add your bank details before requesting a payout.');
      return;
    }
    requestPayout({ variables: { amount: values.amount } });
  };

  const columns = [
    {
      title: 'Pass ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id) => <span style={{ fontFamily: 'monospace', color: '#6B7280' }}>#{id.slice(-8).toUpperCase()}</span>
    },
    {
      title: 'Event',
      dataIndex: 'eventTitle',
      key: 'eventTitle',
      width: 140,
      render: (text) => <span style={{ fontWeight: 700, color: '#1B2A4E' }}>{text}</span>
    },
    {
      title: 'Guest Info',
      key: 'user',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1B2A4E' }}>{record.user?.name}</div>
          <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>{record.user?.email}</div>
        </div>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'amountPaid',
      key: 'amountPaid',
      width: 110,
      render: (amt, record) => (
        <span style={{ fontWeight: 800, color: record.status === 'CANCELLED' ? '#EF4444' : '#10B981' }}>
          ₹{Number(amt).toLocaleString()}
        </span>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={status === 'CONFIRMED' || status === 'CHECKED_IN' ? 'success' : 'error'} style={{ fontWeight: 700, borderRadius: '8px' }}>
          {status}
        </Tag>
      )
    }
  ];

  const payoutColumns = [
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (val) => <span style={{ fontWeight: 700 }}>₹{val.toLocaleString()}</span> },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={status === 'COMPLETED' ? 'success' : status === 'PENDING' ? 'warning' : 'error'}>{status}</Tag>
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(isNaN(Number(date)) ? date : Number(date)).format('MMM D')
    }
  ];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <Head><title>Transactions | EventHub</title></Head>

      <div className="header-responsive" style={{ 
        background: 'linear-gradient(135deg, #1B2A4E 0%, #312E81 50%, #4338CA 100%)', 
        borderRadius: '32px', 
        color: 'white', 
        boxShadow: '0 20px 40px rgba(49, 46, 129, 0.2)',
        padding: '40px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ margin: '0 0 8px 0', fontWeight: 900, fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', letterSpacing: '-0.5px', color: 'white' }}>Sales & Payouts</h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem', maxWidth: '600px' }}>Monitor your event revenue, track ticket sales, and manage automated RazorpayX payouts from a single dashboard.</p>
        </div>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '40%', height: '140%', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', transform: 'rotate(-15deg)' }} />
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={8}>
          <Card bordered={false} className="glass-card" style={{ borderRadius: '24px', height: '100%', transition: 'all 0.3s ease' }}>
            <Statistic
              title={<span style={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem' }}>Lifetime Revenue</span>}
              value={stats.totalRevenue}
              precision={2}
              prefix={<IndianRupee size={20} style={{ marginRight: 8, color: '#4338CA' }} />}
              valueStyle={{ color: '#1E293B', fontWeight: 900, fontSize: '1.8rem' }}
            />
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: '#10B981', fontWeight: 600, fontSize: '0.85rem' }}>
              <ArrowUpOutlined /> <span>Total earnings across all events</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card
            bordered={false}
            className="glass-card"
            style={{
              borderRadius: '24px',
              height: '100%',
              background: 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)',
              border: '1px solid rgba(16, 185, 129, 0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Statistic
                title={<span style={{ fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem' }}>Available Balance</span>}
                value={availablePayout}
                precision={2}
                prefix={<WalletOutlined style={{ marginRight: 8 }} />}
                valueStyle={{ color: '#059669', fontWeight: 900, fontSize: '1.8rem' }}
              />
              <Button
                type="primary"
                shape="round"
                size="large"
                disabled={availablePayout <= 0 || !hasBankDetails}
                onClick={() => setIsPayoutModalOpen(true)}
                style={{ 
                  background: '#10B981', 
                  borderColor: '#10B981', 
                  fontWeight: 700, 
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                }}
              >
                Withdraw
              </Button>
            </div>
            {!hasBankDetails && (
              <div style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: 8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <InfoCircleOutlined /> Add bank details to enable withdrawals
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card bordered={false} className="glass-card" style={{ borderRadius: '24px', height: '100%', border: '1px solid rgba(67, 56, 202, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem' }}>Settlement Account</span>
              <AntTooltip title="Update Bank Details">
                <Button icon={<CreditCardOutlined />} onClick={() => setIsBankModalOpen(true)} type="text" style={{ color: '#4338CA' }} />
              </AntTooltip>
            </div>
            {hasBankDetails ? (
              <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '16px', border: '1px solid #F1F5F9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
                    <BankOutlined style={{ color: '#4338CA', fontSize: '1.2rem' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '0.95rem' }}>{userData.me.bankDetails.bankName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>•••• {userData.me.bankDetails.accountNumber.slice(-4)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <Button 
                type="dashed" 
                block
                icon={<PlusCircleOutlined />} 
                onClick={() => setIsBankModalOpen(true)}
                style={{ height: '54px', borderRadius: '16px', color: '#4338CA', borderColor: '#4338CA' }}
              >
                Link Bank Account
              </Button>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} xl={16}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <h3 style={{ margin: 0, color: '#1B2A4E', fontWeight: 800, fontSize: '1.4rem' }}>Transaction History</h3>
              <div style={{ display: 'flex', gap: '12px', flex: 1, justifyContent: 'flex-end', minWidth: '300px', flexWrap: 'wrap' }}>
                <Input
                  placeholder="Search events, guests..."
                  prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
                  onChange={e => setSearchText(e.target.value)}
                  style={{ width: '220px', borderRadius: '12px', height: '40px' }}
                  allowClear
                />
                <Select 
                  defaultValue="ALL" 
                  style={{ width: '150px', height: '40px' }} 
                  onChange={setStatusFilter}
                  options={[
                    { value: 'ALL', label: 'All Status' },
                    { value: 'CONFIRMED', label: 'Confirmed' },
                    { value: 'CHECKED_IN', label: 'Checked In' },
                    { value: 'CANCELLED', label: 'Cancelled' },
                  ]}
                  className="premium-select"
                />
              </div>
            </div>
            <Table 
              columns={columns} 
              dataSource={allTransactions} 
              rowKey="id" 
              scroll={{ x: 800 }} 
              pagination={{ pageSize: 10, showSizeChanger: true }}
              className="premium-table"
            />
          </div>
        </Col>
        <Col xs={24} xl={8}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, color: '#1B2A4E', fontWeight: 800, fontSize: '1.4rem' }}>Payout Ledger</h3>
              <Select 
                defaultValue="ALL" 
                size="small"
                style={{ width: '120px' }} 
                onChange={setPayoutStatusFilter}
                options={[
                  { value: 'ALL', label: 'All' },
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'ERROR', label: 'Error' },
                ]}
              />
            </div>
            <Table 
              columns={payoutColumns} 
              dataSource={filteredPayouts} 
              rowKey="id" 
              pagination={{ pageSize: 8 }} 
              size="small" 
              className="premium-table"
            />
          </div>
        </Col>
      </Row>

      <Modal
        title={<div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1B2A4E' }}>Request Payout</div>}
        open={isPayoutModalOpen}
        onCancel={() => setIsPayoutModalOpen(false)}
        footer={null}
        centered
      >
        <Form form={payoutForm} layout="vertical" onFinish={handlePayoutSubmit}>
          <Form.Item label="Amount" name="amount" rules={[{ required: true, message: 'Please enter amount' }, { type: 'number', min: 100 }]}>
            <InputNumber prefix="₹" style={{ width: '100%', borderRadius: '12px' }} size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={requestingPayout} style={{ height: '56px', borderRadius: '16px', background: 'var(--gradient-main)', fontWeight: 800 }}>
            Confirm Withdrawal
          </Button>
        </Form>
      </Modal>

      <Modal
        title={<div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1B2A4E' }}>Bank Account Details</div>}
        open={isBankModalOpen}
        onCancel={() => setIsBankModalOpen(false)}
        footer={null}
        centered
      >
        <Alert message="Automated Payouts" description="We use RazorpayX to securely process your payouts to this bank account." type="info" showIcon style={{ marginBottom: 16 }} />
        <Form form={bankForm} layout="vertical" onFinish={(v) => updateBankDetails({ variables: v })}>
          <Form.Item label="Account Holder Name" name="accountHolderName" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Account Number" name="accountNumber" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Bank Name" name="bankName" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="IFSC Code" name="ifscCode" rules={[{ required: true }]}><Input /></Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={updatingBank} style={{ borderRadius: '12px', fontWeight: 700 }}>
            Save Bank Details
          </Button>
        </Form>
      </Modal>

      <style jsx global>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.8) !important;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.05) !important;
        }
        .premium-table .ant-table-thead > tr > th { 
          background: #F8FAFC !important; 
          color: #64748B !important; 
          font-weight: 800 !important; 
          border-bottom: 2px solid #F1F5F9 !important;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.5px;
        }
        .premium-table .ant-table-tbody > tr > td { 
          border-bottom: 1px solid #F8FAFC !important;
          padding: 16px !important;
        }
        .premium-table .ant-table-row:hover > td {
          background-color: #FBFBFF !important;
        }
        .premium-select .ant-select-selector {
          border-radius: 12px !important;
          border: 1px solid #E2E8F0 !important;
        }
      `}</style>
    </div>
  );
}
