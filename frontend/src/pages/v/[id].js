import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useMutation } from '@apollo/client/react';
import { VERIFY_TICKET } from '@/features/events/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import { Layout, Result, Button, Spin, Typography, Card, Space, Tag } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined, LoginOutlined, DashboardOutlined } from '@ant-design/icons';
import Head from 'next/head';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function AutoVerify() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState('verifying'); // verifying, success, error, unauthorized
  const [errorMsg, setErrorMsg] = useState('');
  const [ticketData, setTicketData] = useState(null);

  const [verifyTicket] = useMutation(VERIFY_TICKET, {
    onCompleted: (data) => {
      setTicketData(data.verifyTicket);
      setStatus('success');
    },
    onError: (err) => {
      setErrorMsg(err.message);
      setStatus('error');
    }
  });

  useEffect(() => {
    if (id && !authLoading) {
      if (!user) {
        setStatus('unauthorized');
      } else if (user.role === 'USER') {
        setStatus('error');
        setErrorMsg('Only organizers can verify tickets.');
      } else {
    verifyTicket({ variables: { bookingId: id.toString() } });
      }
    }
  }, [id, user, authLoading, verifyTicket]);

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 64, color: '#6366f1' }} spin />} />
            <Title level={3} style={{ color: 'white', marginTop: '30px' }}>Validating Pass...</Title>
            <Text style={{ color: '#94a3b8' }}>Checking secure entry token #{id?.slice(-8).toUpperCase()}</Text>
          </div>
        );
      case 'success':
        return (
          <Result
            status="success"
            title={<span style={{ color: 'white', fontSize: '2rem', fontWeight: '800' }}>ACCESS GRANTED</span>}
            subTitle={
              <Space direction="vertical" style={{ width: '100%', marginTop: '20px' }}>
                <div style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Entry confirmed for:</div>
                <div style={{ color: 'white', fontSize: '1.5rem', fontWeight: '700' }}>{ticketData?.user.name}</div>
                <div style={{ color: '#6366f1', fontSize: '1.2rem' }}>{ticketData?.event.title}</div>
                <Tag color="#10b981" style={{ padding: '8px 20px', borderRadius: '100px', fontSize: '1rem', border: 'none', marginTop: '15px' }}>
                  ✓ CHECKED IN SUCCESSFULLY
                </Tag>
              </Space>
            }
            extra={[
              <Button
                type="primary"
                key="dash"
                size="large"
                icon={<DashboardOutlined />}
                onClick={() => router.push('/dashboard')}
                style={{ height: '56px', borderRadius: '14px', background: '#6366f1', minWidth: '200px' }}
              >
                Go to Dashboard
              </Button>
            ]}
          />
        );
      case 'error':
        return (
          <Result
            status="error"
            title={<span style={{ color: 'white', fontSize: '2rem', fontWeight: '800' }}>INVALID SESSION</span>}
            subTitle={<div style={{ color: '#f87171', fontSize: '1.2rem', marginTop: '10px' }}>{errorMsg}</div>}
            extra={[
              <Button
                type="primary"
                key="retry"
                size="large"
                onClick={() => router.push('/verify')}
                style={{ height: '56px', borderRadius: '14px', background: '#334155', border: 'none' }}
              >
                Open Manual Scanner
              </Button>
            ]}
          />
        );
      case 'unauthorized':
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
      default:
        return null;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Head><title>Instant Gate Entry | EventHub</title></Head>
      <Content style={{ padding: '2rem', width: '100%', maxWidth: '600px' }}>
        <Card style={{
          borderRadius: '32px',
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden'
        }}>
          {renderContent()}
        </Card>
      </Content>
    </Layout>
  );
}
