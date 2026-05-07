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

const { Content } = Layout;
const { Title, Text } = Typography;

export default function AutoVerify() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading } = useAuth();

  const [checkInCount, setCheckInCount] = useState(1);
  const [isVerifying, setIsVerifying] = useState(false);

  const { data, loading: queryLoading, error: queryError, refetch } = useQuery(GET_BOOKING, {
    variables: { id },
    skip: !id || !user || user.role === 'USER',
    fetchPolicy: 'network-only'
  });

  const [verifyTicket] = useMutation(VERIFY_TICKET, {
    onCompleted: (data) => {
      setIsVerifying(false);
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
      return (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 64, color: '#6366f1' }} spin />} />
          <Title level={3} style={{ color: 'white', marginTop: '30px' }}>Loading Ticket Details...</Title>
        </div>
      );
    }

    if (!user) {
      return (
        <Result
          icon={<LoginOutlined style={{ color: '#6366f1' }} />}
          title={<span style={{ color: 'white', fontSize: '2rem', fontWeight: '800' }}>Organizer Login Required</span>}
          subTitle={<div style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '10px' }}>Please sign in to your organizer account to verify this ticket.</div>}
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
          title={<span style={{ color: 'white', fontSize: '2rem', fontWeight: '800' }}>ACCESS DENIED</span>}
          subTitle={<div style={{ color: '#f87171', fontSize: '1.2rem', marginTop: '10px' }}>Only organizers can verify tickets.</div>}
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
          title={<span style={{ color: 'white', fontSize: '2rem', fontWeight: '800' }}>INVALID TICKET</span>}
          subTitle={<div style={{ color: '#f87171', fontSize: '1.2rem', marginTop: '10px' }}>{queryError.message}</div>}
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
      return (
        <Result
          status="success"
          title={<span style={{ color: 'white', fontSize: '2rem', fontWeight: '800' }}>FULLY CHECKED IN</span>}
          subTitle={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', marginTop: '20px' }}>
              <div style={{ color: '#94a3b8', fontSize: '1.1rem' }}>All tickets for this booking have been scanned:</div>
              <div style={{ color: 'white', fontSize: '1.5rem', fontWeight: '700' }}>{booking.user.name}</div>
              <div style={{ color: '#6366f1', fontSize: '1.2rem' }}>{booking.event.title}</div>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '16px', marginTop: '20px' }}>
                <Statistic
                  title={<span style={{ color: '#10b981' }}>Total Tickets</span>}
                  value={booking.quantity}
                  prefix={<CheckCircleOutlined />}
                  styles={{ content: { color: 'white', fontWeight: 800 } }}
                />
              </div>
            </div>
          }
          extra={[
            <Button
              key="scan"
              type="primary"
              size="large"
              icon={<DashboardOutlined />}
              onClick={() => router.push('/verify')}
              style={{ height: '56px', borderRadius: '14px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', minWidth: '200px', border: 'none' }}
            >
              Scan Next Ticket
            </Button>,
            <Button
              key="dash"
              size="large"
              icon={<LoginOutlined />}
              onClick={() => router.push('/dashboard')}
              style={{ height: '56px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', minWidth: '150px' }}
            >
              Dashboard
            </Button>
          ]}
        />
      );
    }

    return (
      <div className="gate-entry-container" style={{ padding: '0px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Tag color="#6366f1" style={{ borderRadius: '100px', padding: '2px 12px', fontSize: '0.8rem', marginBottom: '12px' }}>GATE ENTRY</Tag>
          <Title level={2} style={{
            color: 'white',
            margin: '0 0 8px 0',
            fontWeight: 800,
            fontSize: 'clamp(1.2rem, 5vw, 1.75rem)',
            lineHeight: 1.2
          }}>{booking.event.title}</Title>
          <div style={{ color: '#94a3b8', fontSize: '1rem' }}>
            Ticket Holder: <span style={{ color: 'white', fontWeight: 700 }}>{booking.user?.name}</span>
          </div>
        </div>

        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={12} sm={12}>
            <Card style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '16px', textAlign: 'center' }} styles={{ body: { padding: '16px 8px' } }}>
              <Statistic
                title={<span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Total</span>}
                value={booking.quantity}
                prefix={<TeamOutlined style={{ color: '#6366f1' }} />}
                styles={{ content: { color: 'white', fontSize: '1.4rem', fontWeight: 700 } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12}>
            <Card style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '16px', textAlign: 'center' }} styles={{ body: { padding: '16px 8px' } }}>
              <Statistic
                title={<span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Remaining</span>}
                value={remaining - (checkInCount || 0)}
                prefix={<UserOutlined style={{ color: '#f59e0b' }} />}
                styles={{ content: { color: 'white', fontSize: '1.4rem', fontWeight: 700 } }}
              />
            </Card>
          </Col>
        </Row>

        <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '16px 0' }} />

        <div style={{ textAlign: 'center' }}>
          <Text style={{ color: '#94a3b8', display: 'block', marginBottom: '12px', fontSize: '1rem' }}>
            Check-in count:
          </Text>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center', marginBottom: '24px' }}>
            <Button
              size="large"
              shape="circle"
              onClick={() => setCheckInCount(Math.max(1, checkInCount - 1))}
              style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', width: '40px', height: '40px' }}
            >-</Button>
            <InputNumber
              min={1}
              max={remaining}
              value={checkInCount}
              onChange={setCheckInCount}
              style={{
                width: '70px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: '1.2rem',
                textAlign: 'center'
              }}
              controls={false}
            />
            <Button
              size="large"
              shape="circle"
              onClick={() => setCheckInCount(Math.min(remaining, checkInCount + 1))}
              style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', width: '40px', height: '40px' }}
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
                background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
                border: 'none',
                fontSize: '1.1rem',
                fontWeight: 600,
                boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)'
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
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: '1rem'
              }}
            >
              SCAN NEXT TICKET
            </Button>
          </Space>

          <Button
            type="link"
            onClick={() => router.push('/dashboard')}
            style={{ color: '#94a3b8', marginTop: '12px', fontSize: '0.9rem', width: '100%' }}
          >
            Cancel and Return
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Layout style={{ background: '#0f172a', position: 'relative', overflow: 'hidden' }}>
      <Head><title>Gate Entry Verification | EventHub</title></Head>

      {/* CSS to ensure mobile responsiveness works perfectly */}
      <style jsx global>{`
        @media (max-width: 767px) {
          .hidden-mobile {
            display: none !important;
          }
        }
      `}</style>

      {/* Premium Background Effects Removed */}

      <Content style={{
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
        position: 'relative'
      }}>
        <div style={{ width: '100%', maxWidth: '900px' }}>
          <Card style={{
            borderRadius: '24px',
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(24px)',
            overflow: 'hidden'
          }} styles={{ body: { padding: 0 } }}>
            <Row>
              {/* Left Side: Event Context (Hidden on Mobile) */}
              <Col xs={0} md={10} className="hidden-mobile" style={{
                background: 'rgba(99, 102, 241, 0.05)',
                borderRight: '1px solid rgba(255,255,255,0.05)',
                padding: '40px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <Tag color="#6366f1" style={{ width: 'fit-content', borderRadius: '100px', padding: '4px 16px', marginBottom: '24px' }}>EVENT INFO</Tag>
                <Title level={2} style={{ color: 'white', marginBottom: '16px', fontWeight: 800 }}>{booking?.event.title}</Title>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <Text style={{ color: '#94a3b8', display: 'block' }}>Location</Text>
                    <Text style={{ color: 'white', fontSize: '1.1rem' }}>{booking?.event.location}</Text>
                  </div>
                  <div>
                    <Text style={{ color: '#94a3b8', display: 'block' }}>Ticket Type</Text>
                    <Tag color="blue" style={{ marginTop: '4px' }}>{booking?.ticketType}</Tag>
                  </div>
                  <Divider style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                  <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                    <CheckCircleOutlined style={{ marginRight: '8px', color: '#10b981' }} />
                    Securely verified by EventHub Gatekeeper
                  </div>
                </div>
              </Col>

              {/* Right Side: Check-in Actions */}
              <Col xs={24} md={14} style={{ padding: '0px' }}>
                <div style={{ padding: '24px 16px' }}>
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
