import { useQuery, useMutation } from '@apollo/client/react';
import { GET_MY_EVENTS, GET_MY_ANALYTICS, GET_EVENTS, GET_ME, GET_MY_PAYOUTS } from '@/features/events/graphql/queries';
import { REQUEST_PAYOUT, UPDATE_BANK_DETAILS } from '@/features/events/graphql/mutations';
import { useAuth } from '@/context/AuthContext';
import Head from 'next/head';
import { Table, Tag, Card, Row, Col, Statistic, Empty, Button, Modal, InputNumber, Form, message, Alert, Input, Space, Typography, Tooltip as AntTooltip, Select, App } from 'antd';
import { HistoryOutlined, BankOutlined, InfoCircleOutlined, SearchOutlined, CreditCardOutlined, PlusCircleOutlined, DollarCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { IndianRupee } from 'lucide-react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function Transactions() {
  return (
    <App>
      <TransactionsContent />
    </App>
  );
}

function TransactionsContent() {
  const { message: msg } = App.useApp();
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
      msg.success('Payout request submitted successfully!');
      setIsPayoutModalOpen(false);
      payoutForm.resetFields();
      refetchUser();
      refetchPayouts();
    },
    onError: (error) => msg.error(error.message)
  });

  const [updateBankDetails, { loading: updatingBank }] = useMutation(UPDATE_BANK_DETAILS, {
    onCompleted: () => {
      msg.success('Bank details updated successfully!');
      setIsBankModalOpen(false);
      refetchUser();
    },
    onError: (error) => msg.error(error.message)
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
      msg.warning('Please add your bank details before requesting a payout.');
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
      render: (status) => {
        let color = '#10B981';
        let bg = '#ECFDF5';
        if (status === 'CANCELLED') { color = '#EF4444'; bg = '#FEF2F2'; }
        if (status === 'CHECKED_IN') { color = '#6366F1'; bg = '#EEF2FF'; }

        return (
          <span style={{
            color,
            background: bg,
            padding: '6px 12px',
            borderRadius: '10px',
            fontSize: '0.75rem',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            border: `1px solid ${color}20`
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
            {status}
          </span>
        );
      }
    }
  ];

  const payoutColumns = [
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (val) => <span style={{ fontWeight: 700 }}>₹{val.toLocaleString()}</span> },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = '#F59E0B';
        let bg = '#FFFBEB';
        if (status === 'COMPLETED') { color = '#10B981'; bg = '#ECFDF5'; }
        if (status === 'ERROR') { color = '#EF4444'; bg = '#FEF2F2'; }
        return (
          <span style={{ color, background: bg, padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700, border: `1px solid ${color}20` }}>
            {status}
          </span>
        );
      }
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
        borderRadius: '24px',
        boxShadow: '0 20px 40px rgba(49, 46, 129, 0.2)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        padding: '32px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{
            width: '64px', height: '64px',
            background: 'linear-gradient(135deg, #6366F1 0%, #4338CA 100%)',
            borderRadius: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px',
            border: '1.5px solid rgba(255,255,255,0.2)',
            boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
          }}>
            💰
          </div>
          <div>
            <h1 style={{ margin: 0, fontWeight: 900, color: 'white', fontSize: '2.2rem', letterSpacing: '-0.8px' }}>Sales & Payouts</h1>
            <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem' }}>Monitor your event revenue, track ticket sales, and manage payouts.</p>
          </div>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={8}>
          <Card variant="borderless" className="glass-card premium-hover" style={{ borderRadius: '24px', height: '100%', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, padding: '20px', opacity: 0.1 }}>
              <DollarCircleOutlined style={{ fontSize: '48px', color: '#4338CA' }} />
            </div>
            <Statistic
              title={<span style={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.7rem' }}>Lifetime Revenue</span>}
              value={stats.totalRevenue}
              precision={2}
              prefix={<IndianRupee size={20} style={{ marginRight: 4, color: '#4338CA' }} />}
              styles={{ content: { color: '#1E293B', fontWeight: 900, fontSize: '2rem' } }}
            />
            <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#64748B', fontWeight: 500 }}>
              Total earnings across all events
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card variant="borderless" className="glass-card premium-hover" style={{ borderRadius: '24px', height: '100%', background: 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, padding: '20px', opacity: 0.1 }}>
              <HistoryOutlined style={{ fontSize: '48px', color: '#64748B' }} />
            </div>
            <Statistic
              title={<span style={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.7rem' }}>Total Processed</span>}
              value={stats.totalRevenue - availablePayout}
              precision={2}
              prefix={<IndianRupee size={20} style={{ marginRight: 4, color: '#64748B' }} />}
              styles={{ content: { color: '#64748B', fontWeight: 900, fontSize: '2rem' } }}
            />
            <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#64748B', fontWeight: 500 }}>
              Withdrawals + Platform Fees
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            variant="borderless"
            className="glass-card premium-hover"
            style={{
              borderRadius: '24px',
              height: '100%',
              background: 'linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 100%)',
              border: '1px solid rgba(16, 185, 129, 0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Statistic
                  title={<span style={{ fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.7rem' }}>Available Balance</span>}
                  value={availablePayout}
                  precision={2}
                  prefix={<IndianRupee size={20} style={{ marginRight: 4, color: '#10B981' }} />}
                  styles={{ content: { color: '#059669', fontWeight: 900, fontSize: '2.2rem' } }}
                />
                <div style={{ marginTop: '4px', fontSize: '0.8rem', color: '#059669', fontWeight: 600, opacity: 0.8 }}>
                  Ready to withdraw
                </div>
              </div>
              <Button
                type="primary"
                shape="round"
                size="large"
                disabled={availablePayout <= 0 || !hasBankDetails}
                onClick={() => setIsPayoutModalOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  border: 'none',
                  fontWeight: 800,
                  height: '50px',
                  padding: '0 32px',
                  boxShadow: '0 10px 20px rgba(16, 185, 129, 0.2)'
                }}
              >
                Withdraw
              </Button>
            </div>
            {!hasBankDetails && (
              <div style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239, 68, 68, 0.05)', padding: '8px 12px', borderRadius: '10px' }}>
                <InfoCircleOutlined /> Add bank details to enable withdrawals
              </div>
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
        <Col xs={24} xl={8} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card variant="borderless" className="glass-card" style={{ borderRadius: '24px', overflow: 'hidden', padding: 0 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.7rem' }}>Settlement Account</span>
                <Button
                  icon={<CreditCardOutlined />}
                  onClick={() => setIsBankModalOpen(true)}
                  type="primary"
                  size="small"
                  style={{ color: '#FFFFFF', border: 'none', fontWeight: 700, borderRadius: '8px', padding: '4px 12px' }}
                >
                  Update
                </Button>
              </div>

              {hasBankDetails ? (
                <div style={{
                  background: 'linear-gradient(135deg, #1B2A4E 0%, #312E81 100%)',
                  padding: '24px',
                  borderRadius: '20px',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 10px 25px rgba(27, 42, 78, 0.2)'
                }}>
                  <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '120px', height: '120px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <BankOutlined style={{ fontSize: '24px', opacity: 0.8 }} />
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.6 }}>Primary Account</span>
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '2px', marginBottom: '8px' }}>
                    •••• •••• •••• {userData?.me?.bankDetails?.accountNumber?.slice(-4)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', opacity: 0.6, marginBottom: '2px' }}>Bank Name</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{userData?.me?.bankDetails?.bankName}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', opacity: 0.6, marginBottom: '2px' }}>IFSC</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{userData?.me?.bankDetails?.ifscCode}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <Button
                  type="dashed"
                  block
                  icon={<PlusCircleOutlined />}
                  onClick={() => setIsBankModalOpen(true)}
                  style={{ height: '80px', borderRadius: '16px', color: '#4338CA', borderColor: '#4338CA', background: '#F5F7FF', fontWeight: 700 }}
                >
                  Link Bank Account
                </Button>
              )}
            </div>
          </Card>

          <div style={{ background: 'white', padding: '32px', borderRadius: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', flex: 1 }}>
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
        <Alert title="Automated Payouts" description="We use RazorpayX to securely process your payouts to this bank account." type="info" showIcon style={{ marginBottom: 16 }} />
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
          background: rgba(255, 255, 255, 0.9) !important;
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.5) !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03) !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .premium-hover:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.06) !important;
        }
        .premium-table .ant-table {
          background: transparent !important;
        }
        .premium-table .ant-table-thead > tr > th { 
          background: #F8FAFC !important; 
          color: #64748B !important; 
          font-weight: 800 !important; 
          border-bottom: 2px solid #F1F5F9 !important;
          text-transform: uppercase;
          font-size: 0.7rem;
          letter-spacing: 1px;
          padding: 16px 20px !important;
        }
        .premium-table .ant-table-tbody > tr > td { 
          border-bottom: 1px solid #F1F5F9 !important;
          padding: 20px !important;
          transition: all 0.2s ease;
        }
        .premium-table .ant-table-row:hover > td {
          background-color: #F8FAFF !important;
        }
        .premium-select .ant-select-selector {
          border-radius: 12px !important;
          border: 1px solid #E2E8F0 !important;
          height: 40px !important;
          padding: 4px 12px !important;
        }
        @keyframes pulse-glow {
          0% { box-shadow: 0 0 0 0 rgba(67, 56, 202, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(67, 56, 202, 0); }
          100% { box-shadow: 0 0 0 0 rgba(67, 56, 202, 0); }
        }
      `}</style>
    </div>
  );
}
