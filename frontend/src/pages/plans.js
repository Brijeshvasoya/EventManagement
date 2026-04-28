import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useAuth } from '@/context/AuthContext';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { Button, Typography, ConfigProvider } from 'antd';
import { RocketOutlined, StarOutlined, CheckCircleFilled } from '@ant-design/icons';
import Layout from '@/components/Layout';

const { Title, Text } = Typography;

const CREATE_PLAN_CHECKOUT_SESSION = gql`
  mutation CreatePlanCheckoutSession($planId: String!) {
    createPlanCheckoutSession(planId: $planId)
  }
`;

const CONFIRM_PLAN_PURCHASE = gql`
  mutation ConfirmPlanPurchase($sessionId: String!, $planId: String!) {
    confirmPlanPurchase(sessionId: $sessionId, planId: $planId) {
      token
    }
  }
`;

export default function PlansPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [createSession, { loading: creating }] = useMutation(CREATE_PLAN_CHECKOUT_SESSION);
  const [confirmPurchase] = useMutation(CONFIRM_PLAN_PURCHASE);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role === 'SUPER_ADMIN') {
      router.replace('/superadmin');
      return;
    }
    if (user.role !== 'ORGANIZER' && user.role !== 'SUPER_ADMIN') {
      router.replace('/dashboard');
      return;
    }
    if (user.isPlanPurchased) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    const confirm = async () => {
      const { success, sessionId, planId } = router.query;
      if (success === 'true' && sessionId && planId) {
        try {
          const { data } = await confirmPurchase({ variables: { sessionId, planId } });
          toast.success('Plan purchased successfully! 🚀');
          login(data.confirmPlanPurchase.token, '/dashboard');
        } catch (err) {
          toast.error(err.message || 'Failed to confirm purchase');
        }
      } else if (router.query.canceled === 'true') {
        toast.error('Payment canceled. You must purchase a plan to continue.');
      }
    };
    if (router.isReady) {
      confirm();
    }
  }, [router.isReady, router.query, confirmPurchase, login]);

  const handleSubscribe = async (planId) => {
    try {
      const { data } = await createSession({ variables: { planId } });
      if (data && data.createPlanCheckoutSession) {
        window.location.href = data.createPlanCheckoutSession;
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (!user || user.role !== 'ORGANIZER' || user.isPlanPurchased) return null;

  return (
    <ConfigProvider
      theme={{
        token: { colorPrimary: 'rgb(67, 56, 202)', fontFamily: "'Inter', sans-serif" }
      }}
    >
      <Head><title>Subscription Plans | EventHub</title></Head>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '1000px', width: '100%' }}>
          <div style={{ marginBottom: '40px' }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 900, color: '#1e293b', marginBottom: '16px' }}>Choose Your Organizer Plan</h1>
            <p style={{ fontSize: '1.2rem', color: '#64748b' }}>Select a plan to activate your organizer account and start creating events.</p>
          </div>

          <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {/* Basic Plan */}
            <div style={{
              background: 'white', borderRadius: '24px', padding: '40px', flex: '1', minWidth: '300px', maxWidth: '400px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: '#94a3b8' }}></div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#475569', marginBottom: '10px' }}>Basic Plan</div>
              <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#1e293b', marginBottom: '20px' }}>$9<span style={{ fontSize: '1.5rem', fontWeight: 600 }}>.99</span><span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 500 }}>/mo</span></div>
              <div style={{ flex: 1, textAlign: 'left', marginBottom: '30px' }}>
                {['Create up to 5 events/month', 'Basic analytics', 'Standard email support', 'Access to community vendors'].map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: '#475569' }}>
                    <CheckCircleFilled style={{ color: '#10b981' }} /> {f}
                  </div>
                ))}
              </div>
              <Button type="default" size="large" onClick={() => handleSubscribe('BASIC')} loading={creating} style={{ height: '50px', borderRadius: '12px', fontWeight: 600, fontSize: '1rem' }} block>
                Get Started
              </Button>
            </div>

            {/* Pro Plan */}
            <div style={{
              background: 'white', borderRadius: '24px', padding: '40px', flex: '1', minWidth: '300px', maxWidth: '400px',
              boxShadow: '0 25px 50px rgba(67, 56, 202, 0.15)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', transform: 'scale(1.05)'
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: 'linear-gradient(90deg, #4338ca, #8b5cf6)' }}></div>
              <div style={{ position: 'absolute', top: '20px', right: '20px', background: '#fef3c7', color: '#d97706', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>MOST POPULAR</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4338ca', marginBottom: '10px' }}>Pro Plan</div>
              <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#1e293b', marginBottom: '20px' }}>$29<span style={{ fontSize: '1.5rem', fontWeight: 600 }}>.99</span><span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 500 }}>/mo</span></div>
              <div style={{ flex: 1, textAlign: 'left', marginBottom: '30px' }}>
                {['Unlimited events', 'Advanced analytics & reports', 'Priority 24/7 support', 'Premium vendor access', 'Custom branding options'].map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: '#475569' }}>
                    <CheckCircleFilled style={{ color: '#4338ca' }} /> <span style={{ fontWeight: i > 2 ? 600 : 400 }}>{f}</span>
                  </div>
                ))}
              </div>
              <Button type="primary" size="large" onClick={() => handleSubscribe('PRO')} loading={creating} style={{ height: '50px', borderRadius: '12px', fontWeight: 600, fontSize: '1rem', background: 'linear-gradient(90deg, #4338ca, #6366f1)', border: 'none' }} block icon={<RocketOutlined />}>
                Upgrade to Pro
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
}
