import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { Button, Tag } from 'antd';
import {
  CreditCardOutlined, CheckCircleFilled, ClockCircleOutlined,
  RocketOutlined, CrownOutlined, WarningOutlined, FileTextOutlined
} from '@ant-design/icons';

const GET_MY_BILLING = gql`
  query GetMyBilling {
    myBilling {
      currentPlan
      planExpiresAt
      isPlanActive
      invoices {
        id
        planId
        amount
        currency
        status
        stripeSessionId
        planStartDate
        planEndDate
        createdAt
      }
    }
  }
`;

const CONFIRM_PLAN_PURCHASE = gql`
  mutation ConfirmPlanPurchase($sessionId: String!, $planId: String!) {
    confirmPlanPurchase(sessionId: $sessionId, planId: $planId) {
      token
    }
  }
`;

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysLeft(iso) {
  if (!iso) return 0;
  const diff = new Date(iso) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function BillingPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const confirmCalledRef = useRef(false);
  const [confirmPurchase] = useMutation(CONFIRM_PLAN_PURCHASE);
  const { data, loading, refetch } = useQuery(GET_MY_BILLING, { fetchPolicy: 'cache-and-network', skip: !user || user.role !== 'ORGANIZER' });

  // Confirm plan purchase when redirected from Stripe
  useEffect(() => {
    const confirm = async () => {
      const { success, sessionId, planId } = router.query;
      if (success === 'true' && sessionId && planId) {
        if (confirmCalledRef.current) return;
        confirmCalledRef.current = true;
        try {
          const { data: d } = await confirmPurchase({ variables: { sessionId, planId } });
          toast.success('Plan purchased successfully! 🚀');
          login(d.confirmPlanPurchase.token);
          // Remove query params and refetch billing
          router.replace('/billing', undefined, { shallow: true });
          refetch();
        } catch (err) {
          toast.error(err.message || 'Failed to confirm purchase');
        }
      }
    };
    if (router.isReady) confirm();
  }, [router.isReady, router.query]);

  if (!user || user.role !== 'ORGANIZER') return null;

  const billing = data?.myBilling;
  const invoices = billing?.invoices || [];
  const remaining = daysLeft(billing?.planExpiresAt);

  return (
    <>
      <Head><title>Billing | EventHub</title></Head>

      {/* Page Header */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '24px',
        padding: '28px 32px',
        marginBottom: '24px',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '16px',
            background: 'var(--gradient-main)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(67,56,202,0.25)'
          }}>
            <CreditCardOutlined style={{ fontSize: '1.6rem', color: 'white' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Billing & Invoices
            </h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Manage your subscription and view payment history
            </p>
          </div>
        </div>
        <Button
          type="primary"
          icon={<RocketOutlined />}
          onClick={() => router.push('/plans')}
          style={{
            height: 44, borderRadius: 12, fontWeight: 700,
            background: 'var(--gradient-main)', border: 'none',
            boxShadow: '0 6px 16px rgba(67,56,202,0.3)'
          }}
        >
          {billing?.isPlanActive ? 'Renew / Upgrade' : 'Choose Plan'}
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>

        {/* Current Plan Card */}
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '24px',
          padding: '28px',
          border: billing?.isPlanActive
            ? '1px solid rgba(67,56,202,0.2)'
            : '1px solid rgba(239,68,68,0.2)',
          boxShadow: billing?.isPlanActive ? 'var(--shadow-glow)' : '0 4px 16px rgba(239,68,68,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            {billing?.isPlanActive
              ? <CheckCircleFilled style={{ color: '#10b981', fontSize: '1.1rem' }} />
              : <WarningOutlined style={{ color: '#ef4444', fontSize: '1.1rem' }} />}
            <span style={{
              fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: billing?.isPlanActive ? '#10b981' : '#ef4444'
            }}>
              {loading ? 'Loading...' : billing?.isPlanActive ? 'Active Subscription' : 'No Active Plan'}
            </span>
          </div>

          {billing?.currentPlan ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                {billing.currentPlan === 'PRO'
                  ? <CrownOutlined style={{ color: 'rgb(67,56,202)', fontSize: '1.4rem' }} />
                  : <FileTextOutlined style={{ color: '#64748b', fontSize: '1.4rem' }} />}
                <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                  {billing.currentPlan === 'PRO' ? 'Pro Plan' : 'Basic Plan'}
                </span>
              </div>

              <div style={{
                background: billing?.isPlanActive ? 'rgba(67,56,202,0.04)' : 'rgba(239,68,68,0.04)',
                borderRadius: '12px', padding: '14px 16px', marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Valid until</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatDate(billing.planExpiresAt)}
                  </span>
                </div>
                {billing?.isPlanActive && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Days remaining</span>
                    <span style={{
                      fontSize: '0.85rem', fontWeight: 700,
                      color: remaining <= 5 ? '#ef4444' : remaining <= 10 ? '#f59e0b' : '#10b981'
                    }}>
                      {remaining} day{remaining !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>

              {remaining <= 7 && billing?.isPlanActive && (
                <div style={{
                  background: 'linear-gradient(135deg, #fff7ed, #ffedd5)',
                  border: '1px solid rgba(234,88,12,0.2)',
                  borderRadius: '10px', padding: '10px 14px',
                  fontSize: '0.82rem', color: '#c2410c', fontWeight: 600, marginBottom: '16px'
                }}>
                  ⚠️ Renew soon to avoid service interruption
                </div>
              )}

              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
                {(billing.currentPlan === 'BASIC'
                  ? ['✓ Up to 5 events/month', '✓ Basic analytics', '✓ Standard support']
                  : ['✓ Unlimited events', '✓ Advanced analytics', '✓ Priority support']
                ).map((l, i) => <div key={i}>{l}</div>)}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📋</div>
              <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>No active plan</div>
              <div style={{ fontSize: '0.85rem' }}>Choose a plan to start creating events</div>
            </div>
          )}
        </div>

        {/* Invoice History */}
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '24px',
          padding: '28px',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Invoice History
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🧾</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>No invoices yet</div>
              <div style={{ fontSize: '0.85rem' }}>Your billing history will appear here after your first purchase</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Header row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 120px 100px 80px',
                gap: '12px',
                padding: '8px 16px',
                background: 'var(--bg-color)',
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <span>Plan</span>
                <span>Period</span>
                <span>Amount</span>
                <span>Status</span>
                <span>Date</span>
              </div>

              {invoices.map((inv) => (
                <div key={inv.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 120px 100px 80px',
                  gap: '12px',
                  padding: '14px 16px',
                  background: 'var(--bg-color)',
                  borderRadius: '14px',
                  border: '1px solid var(--glass-border)',
                  alignItems: 'center',
                  transition: 'box-shadow 0.2s ease',
                  cursor: 'default'
                }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                >
                  {/* Plan name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {inv.planId === 'PRO'
                      ? <CrownOutlined style={{ color: 'rgb(67,56,202)' }} />
                      : <FileTextOutlined style={{ color: '#64748b' }} />}
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      {inv.planId === 'PRO' ? 'Pro Plan' : 'Basic Plan'}
                    </span>
                  </div>

                  {/* Period */}
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <div>{formatDate(inv.planStartDate)}</div>
                    <div style={{ color: 'var(--text-muted)' }}>→ {formatDate(inv.planEndDate)}</div>
                  </div>

                  {/* Amount */}
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    ₹{inv.amount.toLocaleString('en-IN')}
                  </div>

                  {/* Status */}
                  <div>
                    <Tag color={inv.status === 'PAID' ? 'success' : 'error'} style={{ borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem' }}>
                      {inv.status}
                    </Tag>
                  </div>

                  {/* Invoice date */}
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {formatDate(inv.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 2fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}
