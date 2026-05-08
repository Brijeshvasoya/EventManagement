import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_BOOKING } from '@/features/events/graphql/queries';
import { VERIFY_TICKET } from '@/features/events/graphql/mutations';
import { useAuth } from '@/context/AuthContext';
import { Layout, Result, Button, Spin, Typography, Card, Space, Tag, InputNumber, Divider, Statistic, Row, Col } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined, LoginOutlined, DashboardOutlined, UserOutlined, TeamOutlined, CheckOutlined } from '@ant-design/icons';
import Head from 'next/head';
import toast from 'react-hot-toast';
import LoadingScreen from '@/components/LoadingScreen';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function AutoVerify() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading } = useAuth();

  const [checkInCount, setCheckInCount] = useState(1);
  const [isVerifying, setIsVerifying] = useState(false);
  const [justVerified, setJustVerified] = useState(false);

  const { data, loading: queryLoading, error: queryError, refetch } = useQuery(GET_BOOKING, {
    variables: { id },
    skip: !id || !user || user.role === 'USER',
    fetchPolicy: 'network-only'
  });

  const [verifyTicket] = useMutation(VERIFY_TICKET, {
    onCompleted: (data) => {
      setIsVerifying(false);
      setJustVerified(true);
      toast.success(`Successfully checked in ${checkInCount} ticket(s)!`);
      refetch();
    },
    onError: (err) => {
      setIsVerifying(false);
      toast.error(err.message);
    }
  });

  const booking = data?.booking;
  const remaining = booking ? (booking.quantity - (booking.checkedInCount || 0)) : 0;

  useEffect(() => {
    if (remaining > 0) {
      setCheckInCount(remaining);
    }
  }, [remaining]);

  const handleVerify = () => {
    if (checkInCount < 1 || checkInCount > remaining) {
      toast.error(`Please enter a valid count (1 to ${remaining})`);
      return;
    }
    setIsVerifying(true);
    verifyTicket({ variables: { bookingId: id, count: checkInCount } });
  };

  const renderContent = () => {
    if (authLoading || (queryLoading && !booking)) {
      return <LoadingScreen message="Loading Ticket Details..." />;
    }

    if (!user) {
      return (
        <Result
          icon={<LoginOutlined style={{ color: '#4338CA' }} />}
          title={<span style={{ color: '#1B2A4E', fontSize: '2rem', fontWeight: '900' }}>Organizer Login Required</span>}
          subTitle={<div style={{ color: '#64748B', fontSize: '1.1rem', marginTop: '10px', fontWeight: 500 }}>Please sign in to your organizer account to verify this ticket.</div>}
          extra={[
            <Button
              type="primary"
              key="login"
              size="large"
              onClick={() => router.push(`/login?returnUrl=/v/${id}`)}
              style={{ height: '56px', borderRadius: '14px', background: '#6366f1', minWidth: '200px' }}
            >
              Sign In to Verify
            </Button>
          ]}
        />
      );
    }

    if (user.role === 'USER') {
      return (
        <Result
          status="error"
          title={<span style={{ color: '#1B2A4E', fontSize: '2rem', fontWeight: '900' }}>ACCESS DENIED</span>}
          subTitle={<div style={{ color: '#EF4444', fontSize: '1.2rem', marginTop: '10px', fontWeight: 600 }}>Only organizers can verify tickets.</div>}
          extra={[
            <Button
              type="primary"
              key="dash"
              size="large"
              onClick={() => router.push('/dashboard')}
              style={{ height: '56px', borderRadius: '14px', background: '#334155' }}
            >
              Go to Dashboard
            </Button>
          ]}
        />
      );
    }

    if (queryError) {
      return (
        <Result
          status="error"
          title={<span style={{ color: '#1B2A4E', fontSize: '2rem', fontWeight: '900' }}>INVALID TICKET</span>}
          subTitle={<div style={{ color: '#EF4444', fontSize: '1.2rem', marginTop: '10px', fontWeight: 600 }}>{queryError.message}</div>}
          extra={[
            <Button
              type="primary"
              key="retry"
              size="large"
              onClick={() => router.push('/verify')}
              style={{ height: '56px', borderRadius: '14px', background: '#334155' }}
            >
              Open Scanner
            </Button>
          ]}
        />
      );
    }

    if (!booking) return null;

    if (remaining === 0) {
      const isDuplicateScan = !justVerified && booking.checkedInCount > 0;
      
      return (
        <Result
          status={isDuplicateScan ? "warning" : "success"}
          title={<span style={{ color: '#1B2A4E', fontSize: '1.5rem', fontWeight: '900' }}>{isDuplicateScan ? "ALREADY CHECKED IN" : "FULLY CHECKED IN ✨"}</span>}
          subTitle={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginTop: '8px' }}>
              <div style={{ color: '#64748B', fontSize: '0.95rem', fontWeight: 500 }}>
                {isDuplicateScan 
                  ? "This ticket has already been used."
                  : "All tickets scanned successfully:"}
              </div>
              <div style={{ color: '#1B2A4E', fontSize: '1.4rem', fontWeight: '900', lineHeight: 1.2 }}>{booking.user.name}</div>
              <div style={{ color: '#4338CA', fontSize: '1.1rem', fontWeight: 700 }}>{booking.event.title}</div>
              <div style={{ background: isDuplicateScan ? '#FFFBEB' : '#ECFDF5', padding: '16px', borderRadius: '20px', marginTop: '12px', border: isDuplicateScan ? '1px solid #FEF3C7' : '1px solid #D1FAE5' }}>
                <Statistic
                  title={<span style={{ color: isDuplicateScan ? '#92400E' : '#065F46', fontWeight: 700, fontSize: '0.8rem' }}>{isDuplicateScan ? 'PREVIOUS RECORD' : 'TOTAL VERIFIED'}</span>}
                  value={booking.quantity}
                  prefix={isDuplicateScan ? <CloseCircleOutlined style={{ color: '#D97706', fontSize: '1.2rem' }} /> : <CheckCircleOutlined style={{ color: '#059669', fontSize: '1.2rem' }} />}
                  styles={{ content: { color: isDuplicateScan ? '#92400E' : '#065F46', fontWeight: 900, fontSize: '1.8rem' } }}
                />
              </div>
            </div>
          }
          style={{ padding: '24px 0' }}
          extra={[
            <Button
              key="scan"
              type="primary"
              size="large"
              icon={<DashboardOutlined />}
              onClick={() => router.push('/verify')}
              style={{ 
                height: '48px', 
                borderRadius: '12px', 
                background: isDuplicateScan ? '#F59E0B' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                minWidth: '180px', 
                border: 'none',
                fontWeight: 700
              }}
            >
              Scan Next
            </Button>,
            <Button
              key="dash"
              size="large"
              onClick={() => router.push('/dashboard')}
              style={{ height: '48px', borderRadius: '12px', background: '#F1F5F9', color: '#475569', border: 'none', minWidth: '120px', fontWeight: 700 }}
            >
              Dashboard
            </Button>
          ]}
        />
      );
    }

    return (
      <div className="gate-entry-container" style={{ padding: '0px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Tag color="#4338CA" style={{ borderRadius: '100px', padding: '2px 16px', fontSize: '0.75rem', fontWeight: 800, marginBottom: '16px', border: 'none', background: '#EEF2FF', color: '#4338CA' }}>GATE ENTRY</Tag>
          <Title level={2} style={{
            color: '#1B2A4E',
            margin: '0 0 12px 0',
            fontWeight: 900,
            fontSize: '2rem',
            letterSpacing: '-0.8px'
          }}>{booking.event.title}</Title>
          <div style={{ color: '#64748B', fontSize: '1.1rem', fontWeight: 500 }}>
            Ticket Holder: <span style={{ color: '#1B2A4E', fontWeight: 800 }}>{booking.user?.name}</span>
          </div>
        </div>

        <Row gutter={[16, 16]} style={{ marginBottom: '32px' }}>
          <Col xs={12} sm={12}>
            <Card style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: '20px', textAlign: 'center' }} styles={{ body: { padding: '16px 8px' } }}>
              <Statistic
                title={<span style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</span>}
                value={booking.quantity}
                prefix={<TeamOutlined style={{ color: '#4338CA', fontSize: '1.2rem' }} />}
                styles={{ content: { color: '#1B2A4E', fontSize: '1.4rem', fontWeight: 900 } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12}>
            <Card style={{ background: '#FFF7ED', border: '1px solid #FFEDD5', borderRadius: '20px', textAlign: 'center' }} styles={{ body: { padding: '16px 8px' } }}>
              <Statistic
                title={<span style={{ color: '#9A3412', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Left</span>}
                value={remaining - (checkInCount || 0)}
                prefix={<UserOutlined style={{ color: '#EA580C', fontSize: '1.2rem' }} />}
                styles={{ content: { color: '#9A3412', fontSize: '1.4rem', fontWeight: 900 } }}
              />
            </Card>
          </Col>
        </Row>

        <Divider style={{ borderColor: '#F1F5F9', margin: '24px 0' }} />

        <div style={{ textAlign: 'center' }}>
          <Text style={{ color: '#64748B', display: 'block', marginBottom: '16px', fontSize: '1rem', fontWeight: 600 }}>
            Select Check-in count:
          </Text>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center', marginBottom: '24px' }}>
            <Button
              size="large"
              shape="circle"
              onClick={() => setCheckInCount(Math.max(1, checkInCount - 1))}
              style={{ background: '#F1F5F9', color: '#1B2A4E', border: 'none', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800 }}
            >-</Button>
            <InputNumber
              min={1}
              max={remaining}
              value={checkInCount}
              onChange={setCheckInCount}
              className="premium-input-number"
              style={{
                width: 'clamp(70px, 20vw, 90px)',
                height: '48px',
                borderRadius: '12px',
                background: '#F8FAFC',
                border: '2px solid #EEF2FF',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              controls={false}
            />
            <Button
              size="large"
              shape="circle"
              onClick={() => setCheckInCount(Math.min(remaining, checkInCount + 1))}
              style={{ background: '#F1F5F9', color: '#1B2A4E', border: 'none', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800 }}
            >+</Button>
          </div>

          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Button
              type="primary"
              size="large"
              block
              loading={isVerifying}
              icon={<CheckOutlined />}
              onClick={handleVerify}
              disabled={checkInCount < 1 || checkInCount > (remaining || 0)}
              style={{
                height: '56px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #4338CA 0%, #6366F1 100%)',
                border: 'none',
                fontSize: '1.1rem',
                fontWeight: 800,
                boxShadow: '0 8px 16px rgba(67, 56, 202, 0.15)'
              }}
            >
              CONFIRM ENTRY
            </Button>

            <Button
              size="large"
              block
              icon={<DashboardOutlined />}
              onClick={() => router.push('/verify')}
              style={{
                height: '56px',
                borderRadius: '16px',
                background: 'white',
                border: '1px solid #E2E8F0',
                color: '#475569',
                fontSize: '1rem',
                fontWeight: 700
              }}
            >
              SCAN NEXT TICKET
            </Button>
          </Space>

          <Button
            type="link"
            onClick={() => router.push('/dashboard')}
            style={{ color: '#94A3B8', marginTop: '24px', fontSize: '1rem', fontWeight: 600 }}
          >
            Cancel and Return
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Layout style={{ background: '#F8FAFC', position: 'relative', overflow: 'hidden' }}>
      <Head><title>Gate Entry Verification | EventHub</title></Head>

      <style jsx global>{`
        @media (max-width: 767px) {
          .hidden-mobile {
            display: none !important;
          }
        }
        .premium-input-number .ant-input-number-input {
          text-align: center !important;
          font-weight: 800 !important;
          color: #1B2A4E !important;
        }
      `}</style>

      <Content style={{
        padding: '24px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
        position: 'relative'
      }}>
        <div style={{ width: '100%', maxWidth: '900px' }}>
          <Card style={{
            borderRadius: '32px',
            background: 'white',
            border: '1px solid rgba(67, 56, 202, 0.08)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.05)',
            overflow: 'hidden'
          }} styles={{ body: { padding: 0 } }}>
            <Row>
              {/* Left Side: Event Context (Hidden on Mobile) */}
              <Col xs={0} md={10} className="hidden-mobile" style={{
                background: '#F5F7FF',
                borderRight: '1px solid #EEF2FF',
                padding: '48px 40px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <Tag color="indigo" style={{ width: 'fit-content', borderRadius: '100px', padding: '4px 16px', marginBottom: '24px', fontWeight: 700 }}>EVENT INFO</Tag>
                <Title level={2} style={{ color: '#1B2A4E', marginBottom: '24px', fontWeight: 900, fontSize: '1.8rem', letterSpacing: '-0.5px' }}>{booking?.event.title}</Title>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <Text style={{ color: '#64748B', display: 'block', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' }}>Location</Text>
                    <Text style={{ color: '#1E293B', fontSize: '1.1rem', fontWeight: 600 }}>{booking?.event.location}</Text>
                  </div>
                  <div>
                    <Text style={{ color: '#64748B', display: 'block', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px', marginBottom: '8px' }}>Ticket Type</Text>
                    <Tag color="blue" style={{ borderRadius: '8px', padding: '4px 12px', fontWeight: 700 }}>{booking?.ticketType}</Tag>
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: '32px', borderTop: '1px solid #E2E8F0' }}>
                    <div style={{ color: '#059669', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircleOutlined style={{ fontSize: '1.2rem' }} />
                      Verified by EventHub
                    </div>
                  </div>
                </div>
              </Col>

              {/* Right Side: Check-in Actions */}
              <Col xs={24} md={14} style={{ padding: '0px' }}>
                <div style={{ padding: '40px 32px' }}>
                  {renderContent()}
                </div>
              </Col>
            </Row>
          </Card>
        </div>
      </Content>
    </Layout>
  );
}
