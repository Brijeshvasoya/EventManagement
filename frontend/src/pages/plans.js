import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useMutation, useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useAuth } from '@/context/AuthContext';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { Button, ConfigProvider, theme, Modal } from 'antd';
import { RocketOutlined, CheckCircleFilled, CrownOutlined, ThunderboltOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const CREATE_PLAN_CHECKOUT_SESSION = gql`
  mutation CreatePlanCheckoutSession($planId: String!) {
    createPlanCheckoutSession(planId: $planId)
  }
`;

const SCHEDULE_DOWNGRADE = gql`
  mutation ScheduleDowngrade($targetPlanId: String!) {
    scheduleDowngrade(targetPlanId: $targetPlanId) { token }
  }
`;

const CANCEL_SCHEDULED_DOWNGRADE = gql`
  mutation CancelScheduledDowngrade {
    cancelScheduledDowngrade { token }
  }
`;

const GET_MY_BILLING = gql`
  query GetMyBillingForPlans {
    myBilling {
      currentPlan isPlanActive planExpiresAt
      scheduledPlanId scheduledDowngradeAt
      proratedUpgradeAmount
    }
  }
`;

export default function PlansPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [createSession, { loading: creating }] = useMutation(CREATE_PLAN_CHECKOUT_SESSION);
  const [scheduleDowngrade, { loading: scheduling }] = useMutation(SCHEDULE_DOWNGRADE);
  const [cancelDowngrade, { loading: cancelling }] = useMutation(CANCEL_SCHEDULED_DOWNGRADE);
  const [confirmModal, setConfirmModal] = useState(null); // { type: 'downgrade' | 'cancel' }

  const { data: billingData, refetch: refetchBilling } = useQuery(GET_MY_BILLING, {
    skip: !user || user.role !== 'ORGANIZER',
    fetchPolicy: 'cache-and-network',
  });

  const billing = billingData?.myBilling;
  const isPlanExpired = user?.isPlanPurchased &&
    user?.planExpiresAt &&
    new Date(user.planExpiresAt) < new Date();

  const isActivePlan = user?.isPlanPurchased && !isPlanExpired;
  const currentPlanId = user?.planId;
  const scheduledPlanId = billing?.scheduledPlanId;
  const scheduledDowngradeAt = billing?.scheduledDowngradeAt;
  const proratedUpgradeAmount = billing?.proratedUpgradeAmount ?? 2499;

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    if (user.role === 'SUPER_ADMIN') { router.replace('/superadmin'); return; }
    if (user.role !== 'ORGANIZER' && user.role !== 'SUPER_ADMIN') { router.replace('/dashboard'); return; }
  }, [user, router]);

  const handleSubscribe = async (planId) => {
    try {
      const { data } = await createSession({ variables: { planId } });
      if (data?.createPlanCheckoutSession) window.location.href = data.createPlanCheckoutSession;
    } catch (err) { toast.error(err.message); }
  };

  const handleScheduleDowngrade = async () => {
    try {
      const { data } = await scheduleDowngrade({ variables: { targetPlanId: 'BASIC' } });
      login(data.scheduleDowngrade.token);
      await refetchBilling();
      toast.success('Downgrade scheduled! Basic plan will activate after your Pro cycle ends.');
    } catch (err) { toast.error(err.message); }
    setConfirmModal(null);
  };

  const handleCancelDowngrade = async () => {
    try {
      const { data } = await cancelDowngrade();
      login(data.cancelScheduledDowngrade.token);
      await refetchBilling();
      toast.success('Scheduled downgrade cancelled. You will stay on Pro plan.');
    } catch (err) { toast.error(err.message); }
    setConfirmModal(null);
  };

  if (!user || user.role !== 'ORGANIZER') return null;


  const basicFeatures = [
    'Create up to 5 events/month',
    'Basic analytics dashboard',
    'Standard email support',
    'Access to community vendors',
  ];

  const proFeatures = [
    'Unlimited event creation',
    'Advanced analytics & reporting',
    'Priority 24/7 dedicated support',
    'Premium vendor access network',
    'Custom branding & white-labeling',
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: 'rgb(67, 56, 202)', fontFamily: "'Inter', sans-serif" } }}>
      <Head><title>Subscription Plans | EventHub</title></Head>
      <div className="plans-page">

        {/* Confirm Modal */}
        <Modal
          open={!!confirmModal}
          onCancel={() => setConfirmModal(null)}
          footer={null}
          centered
          width={420}
        >
          {confirmModal?.type === 'downgrade' && (
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <ExclamationCircleOutlined style={{ fontSize: '2.5rem', color: '#f59e0b', marginBottom: 16 }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8 }}>Switch to Basic Plan?</div>
              <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: 24 }}>
                Your Pro plan stays active until <strong>{new Date(user?.planExpiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>. After that, Basic plan (5 events limit) will activate automatically. No refund is issued.
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <Button onClick={() => setConfirmModal(null)}>Keep Pro</Button>
                <Button type="primary" danger loading={scheduling} onClick={handleScheduleDowngrade}>Yes, Schedule Downgrade</Button>
              </div>
            </div>
          )}
          {confirmModal?.type === 'cancel' && (
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <ExclamationCircleOutlined style={{ fontSize: '2.5rem', color: 'rgb(67,56,202)', marginBottom: 16 }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8 }}>Cancel Scheduled Downgrade?</div>
              <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: 24 }}>
                Your Pro plan will continue to renew at full price after the current cycle.
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <Button onClick={() => setConfirmModal(null)}>Close</Button>
                <Button type="primary" loading={cancelling} onClick={handleCancelDowngrade}>Yes, Stay on Pro</Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Background orbs */}
        <div className="orb orb-1" />
        <div className="orb orb-2" />

        <div className="plans-inner">

          {/* Plan Expired Notice */}
          {isPlanExpired && (
            <div style={{
              background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
              border: '1px solid rgba(234,88,12,0.25)',
              borderRadius: '16px',
              padding: '16px 24px',
              marginBottom: '32px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <span style={{ fontSize: '1.8rem' }}>⏰</span>
              <div>
                <div style={{ fontWeight: 700, color: '#c2410c', fontSize: '1rem', marginBottom: '2px' }}>
                  Your {user?.planId === 'PRO' ? 'Pro' : 'Basic'} Plan has expired
                </div>
                <div style={{ fontSize: '0.85rem', color: '#78350f' }}>
                  Your existing events and all purchased tickets remain intact. Renew your plan to create new events.
                </div>
              </div>
            </div>
          )}

          {/* Scheduled Downgrade Banner */}
          {scheduledPlanId === 'BASIC' && scheduledDowngradeAt && (
            <div style={{
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: '16px',
              padding: '14px 22px',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.4rem' }}>📅</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.95rem' }}>Downgrade Scheduled</div>
                  <div style={{ fontSize: '0.82rem', color: '#78350f' }}>
                    Your plan will switch to <strong>Basic</strong> on {new Date(scheduledDowngradeAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}. Pro features remain active until then.
                  </div>
                </div>
              </div>
              <Button size="small" onClick={() => setConfirmModal({ type: 'cancel' })} style={{ borderRadius: 8, fontWeight: 700 }}>
                Cancel Downgrade
              </Button>
            </div>
          )}

          {/* Header */}
          <div className="plans-header">
          {/* Active Pro plan — locked notice (no upgrade needed) */}
          {isActivePlan && currentPlanId === 'PRO' && !scheduledPlanId && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(67,56,202,0.06), rgba(67,56,202,0.12))',
              border: '1px solid rgba(67,56,202,0.2)',
              borderRadius: '16px',
              padding: '14px 22px',
              marginBottom: '32px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '0.9rem',
              color: 'rgb(67,56,202)',
              fontWeight: 600,
            }}>
              <span style={{ fontSize: '1.3rem' }}>👑</span>
              <span>You are on the <strong>Pro Plan</strong>. Switch to Basic anytime — it activates at the end of your current cycle.</span>
            </div>
          )}

          <div className="plans-eyebrow">
            <ThunderboltOutlined style={{ marginRight: 6 }} />
            Organizer Plans
          </div>
          <h1 className="plans-title">Choose Your Plan</h1>
          <p className="plans-subtitle">
            Unlock powerful tools to create and manage unforgettable events.
          </p>
        </div>

          {/* Cards */}
          <div className="plans-grid">

            {/* Basic */}
            <div className={`plan-card ${isActivePlan && currentPlanId === 'BASIC' ? 'plan-card-current' : ''}`}>
              <div className="card-top-bar basic-bar" />
              {isActivePlan && currentPlanId === 'BASIC' && (
                <div className="current-badge">✓ Current Plan</div>
              )}
              <div className="plan-label">Basic</div>
              <div className="plan-price-row">
                <span className="currency">₹</span>
                <span className="price-amount">799</span>
                <span className="price-period">/month</span>
              </div>
              <p className="plan-desc">Perfect for getting started with event management.</p>
              <div className="divider" />
              <ul className="feature-list">
                {basicFeatures.map((f, i) => (
                  <li key={i} className="feature-item">
                    <CheckCircleFilled className="check-icon basic-check" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {/* Basic card CTA logic */}
              {!isActivePlan && (
                <Button size="large" block loading={creating} onClick={() => handleSubscribe('BASIC')} className="btn-basic-action">Get Started</Button>
              )}
              {isActivePlan && currentPlanId === 'BASIC' && (
                <Button size="large" block disabled className="btn-basic-action">✓ Current Plan</Button>
              )}
              {isActivePlan && currentPlanId === 'PRO' && !scheduledPlanId && (
                <Button size="large" block onClick={() => setConfirmModal({ type: 'downgrade' })} className="btn-basic-action" style={{ borderColor: '#f59e0b', color: '#92400e' }}>
                  ⬇ Switch to Basic (Next Cycle)
                </Button>
              )}
              {isActivePlan && currentPlanId === 'PRO' && scheduledPlanId === 'BASIC' && (
                <Button size="large" block disabled className="btn-basic-action">📅 Scheduled for Next Cycle</Button>
              )}
            </div>

            {/* Pro */}
            <div className={`plan-card plan-card-pro ${isActivePlan && currentPlanId === 'PRO' ? 'plan-card-current' : ''}`}>
              <div className="card-top-bar pro-bar" />
              {isActivePlan && currentPlanId === 'PRO' ? (
                <div className="current-badge current-badge-pro">✓ Current Plan</div>
              ) : (
                <div className="pro-badge">
                  <CrownOutlined style={{ marginRight: 5 }} /> Most Popular
                </div>
              )}
              <div className="plan-label pro-label">Pro</div>
              <div className="plan-price-row">
                <span className="currency">₹</span>
                <span className="price-amount">{isActivePlan && currentPlanId === 'BASIC' ? proratedUpgradeAmount.toLocaleString('en-IN') : '2,499'}</span>
                <span className="price-period">/month</span>
              </div>
              {/* Prorated notice for BASIC → PRO upgrade */}
              {isActivePlan && currentPlanId === 'BASIC' && proratedUpgradeAmount < 2499 && (
                <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>✂️</span>
                  <span>₹{(2499 - proratedUpgradeAmount).toLocaleString('en-IN')} credit applied (unused Basic days)</span>
                </div>
              )}
              <p className="plan-desc">Everything you need to run events like a professional.</p>
              <div className="divider pro-divider" />
              <ul className="feature-list">
                {proFeatures.map((f, i) => (
                  <li key={i} className="feature-item">
                    <CheckCircleFilled className="check-icon pro-check" />
                    <span style={{ fontWeight: i >= 3 ? 600 : 400 }}>{f}</span>
                  </li>
                ))}
              </ul>

              {/* Pro card CTA logic */}
              {!isActivePlan && (
                <Button type="primary" size="large" block loading={creating} onClick={() => handleSubscribe('PRO')} icon={<RocketOutlined />} className="btn-pro-action">Upgrade to Pro</Button>
              )}
              {isActivePlan && currentPlanId === 'PRO' && (
                <Button type="primary" size="large" block disabled className="btn-pro-action">✓ Active Plan</Button>
              )}
              {isActivePlan && currentPlanId === 'BASIC' && (
                <Button type="primary" size="large" block loading={creating} onClick={() => handleSubscribe('PRO')} icon={<RocketOutlined />} className="btn-pro-action">
                  Upgrade Now — ₹{proratedUpgradeAmount.toLocaleString('en-IN')}
                </Button>
              )}
            </div>

          </div>
        </div>
      </div>

      <style jsx>{`
        .plans-page {
          min-height: 100vh;
          background: var(--bg-color);
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          font-family: 'Inter', sans-serif;
        }

        /* Ambient orbs */
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          z-index: 0;
        }
        .orb-1 {
          width: 480px; height: 480px;
          top: -120px; left: -120px;
          background: radial-gradient(circle, rgba(67,56,202,0.12) 0%, transparent 70%);
          animation: driftOrb 18s ease-in-out infinite alternate;
        }
        .orb-2 {
          width: 560px; height: 560px;
          bottom: -150px; right: -150px;
          background: radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 70%);
          animation: driftOrb 22s ease-in-out infinite alternate-reverse;
        }
        @keyframes driftOrb {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(40px, 30px) scale(1.08); }
        }

        .plans-inner {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 960px;
        }

        /* Header */
        .plans-header {
          text-align: center;
          margin-bottom: 52px;
        }
        .plans-eyebrow {
          display: inline-flex;
          align-items: center;
          background: rgba(67,56,202,0.08);
          color: rgb(67,56,202);
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 6px 16px;
          border-radius: 20px;
          border: 1px solid rgba(67,56,202,0.15);
          margin-bottom: 20px;
        }
        .plans-title {
          font-size: 3rem;
          font-weight: 900;
          color: var(--text-primary);
          margin: 0 0 14px;
          letter-spacing: -1px;
          background: var(--gradient-main);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .plans-subtitle {
          font-size: 1.15rem;
          color: var(--text-secondary);
          max-width: 500px;
          margin: 0 auto;
          line-height: 1.65;
        }

        /* Grid */
        .plans-grid {
          display: flex;
          gap: 28px;
          justify-content: center;
          align-items: stretch;
          flex-wrap: wrap;
        }

        /* Card base */
        .plan-card {
          background: var(--card-bg);
          border: 1px solid var(--glass-border);
          border-radius: 24px;
          padding: 36px 32px 32px;
          flex: 1;
          min-width: 300px;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          box-shadow: var(--shadow-card);
          transition: transform 0.35s cubic-bezier(0.22,1,0.36,1),
                      box-shadow 0.35s cubic-bezier(0.22,1,0.36,1),
                      border-color 0.3s ease;
        }
        .plan-card:hover {
          transform: translateY(-8px);
          box-shadow: var(--shadow-hover);
          border-color: rgba(67,56,202,0.18);
        }

        /* Pro card highlight */
        .plan-card-pro {
          border-color: rgba(67,56,202,0.25);
          box-shadow: var(--shadow-glow);
        }
        .plan-card-pro:hover {
          box-shadow: 0 20px 40px rgba(67,56,202,0.22);
          border-color: rgba(67,56,202,0.4);
        }
        .plan-card-pro::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 24px;
          background: linear-gradient(135deg, rgba(67,56,202,0.03) 0%, rgba(67,56,202,0.06) 100%);
          pointer-events: none;
        }

        /* Top accent bar */
        .card-top-bar {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 5px;
          border-radius: 24px 24px 0 0;
        }
        .basic-bar { background: #e5e7eb; }
        .pro-bar   { background: var(--gradient-main); }

        /* Pro badge */
        .pro-badge {
          position: absolute;
          top: 20px; right: 20px;
          display: inline-flex;
          align-items: center;
          background: linear-gradient(135deg, rgba(67,56,202,0.1), rgba(67,56,202,0.18));
          color: rgb(67,56,202);
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 4px 12px;
          border-radius: 20px;
          border: 1px solid rgba(67,56,202,0.2);
          z-index: 2;
        }

        .current-badge {
          position: absolute;
          top: 20px; right: 20px;
          display: inline-flex;
          align-items: center;
          background: linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.2));
          color: #059669;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 4px 12px;
          border-radius: 20px;
          border: 1px solid rgba(16,185,129,0.25);
          z-index: 2;
        }

        .current-badge-pro {
          background: linear-gradient(135deg, rgba(67,56,202,0.1), rgba(67,56,202,0.18));
          color: rgb(67,56,202);
          border: 1px solid rgba(67,56,202,0.2);
        }

        .plan-card-current {
          border-color: rgba(16,185,129,0.3) !important;
          box-shadow: 0 0 0 2px rgba(16,185,129,0.12), 0 20px 60px rgba(16,185,129,0.08) !important;
        }

        .locked-note {
          margin: 8px 0 0;
          text-align: center;
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        /* Plan label */
        .plan-label {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          margin-bottom: 12px;
          margin-top: 4px;
        }
        .pro-label { color: rgb(67,56,202); }

        /* Price */
        .plan-price-row {
          display: flex;
          align-items: flex-start;
          margin-bottom: 8px;
          line-height: 1;
        }
        .currency {
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--text-secondary);
          margin-top: 10px;
          margin-right: 2px;
        }
        .price-amount {
          font-size: 4.2rem;
          font-weight: 900;
          color: var(--text-primary);
          line-height: 1;
        }
        .price-cents {
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--text-primary);
          align-self: flex-end;
          margin-bottom: 8px;
        }
        .price-period {
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text-muted);
          align-self: flex-end;
          margin-bottom: 10px;
          margin-left: 6px;
        }

        .plan-desc {
          font-size: 0.92rem;
          color: var(--text-secondary);
          line-height: 1.55;
          margin: 0 0 20px;
        }

        /* Divider */
        .divider {
          height: 1px;
          background: var(--border-color);
          margin-bottom: 20px;
        }
        .pro-divider {
          background: linear-gradient(90deg, rgba(67,56,202,0.3), rgba(67,56,202,0.05));
        }

        /* Features */
        .feature-list {
          list-style: none;
          padding: 0;
          margin: 0 0 28px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 0.95rem;
          color: var(--text-primary);
          line-height: 1.4;
        }
        .check-icon {
          font-size: 1rem;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .basic-check { color: #10b981; }
        .pro-check   { color: rgb(67,56,202); }

        /* Buttons */
        :global(.btn-basic-action) {
          height: 52px !important;
          border-radius: 14px !important;
          font-weight: 700 !important;
          font-size: 1rem !important;
          border: 1.5px solid var(--border-color) !important;
          color: var(--text-primary) !important;
          background: transparent !important;
          transition: all 0.25s ease !important;
        }
        :global(.btn-basic-action:hover) {
          border-color: rgba(67,56,202,0.35) !important;
          background: rgba(67,56,202,0.04) !important;
          color: rgb(67,56,202) !important;
          transform: translateY(-1px);
        }
        :global(.btn-pro-action) {
          height: 52px !important;
          border-radius: 14px !important;
          font-weight: 700 !important;
          font-size: 1rem !important;
          background: var(--gradient-main) !important;
          border: none !important;
          box-shadow: 0 8px 24px rgba(67,56,202,0.35) !important;
          transition: all 0.25s ease !important;
        }
        :global(.btn-pro-action:hover) {
          box-shadow: 0 12px 32px rgba(67,56,202,0.45) !important;
          transform: translateY(-2px);
          opacity: 0.92;
        }

        /* Footer note */
        .plans-footer-note {
          text-align: center;
          margin-top: 32px;
          font-size: 0.88rem;
          color: var(--text-muted);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .plans-title { font-size: 2.2rem; }
          .plans-grid  { flex-direction: column; align-items: center; }
          .plan-card   { max-width: 100%; }
        }
      `}</style>
    </ConfigProvider>
  );
}
