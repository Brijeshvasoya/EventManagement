import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { Button, Tag } from 'antd';
import {
  CreditCardOutlined, CheckCircleFilled,
  RocketOutlined, CrownOutlined, WarningOutlined, FileTextOutlined
} from '@ant-design/icons';

const GET_MY_BILLING = gql`
  query GetMyBilling {
    myBilling {
      currentPlan
      planExpiresAt
      isPlanActive
      scheduledPlanId
      scheduledDowngradeAt
      proratedUpgradeAmount
      invoices {
        id planId amount currency status stripeSessionId
        planStartDate planEndDate createdAt
      }
    }
  }
`;

const CONFIRM_PLAN_PURCHASE = gql`
  mutation ConfirmPlanPurchase($sessionId: String!, $planId: String!, $proratedCredit: Int) {
    confirmPlanPurchase(sessionId: $sessionId, planId: $planId, proratedCredit: $proratedCredit) { token }
  }
`;

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysLeft(iso) {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso) - new Date()) / (1000 * 60 * 60 * 24)));
}

export default function BillingPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const confirmCalledRef = useRef(false);
  const [confirmPurchase] = useMutation(CONFIRM_PLAN_PURCHASE);
  const { data, loading, refetch } = useQuery(GET_MY_BILLING, {
    fetchPolicy: 'cache-and-network',
    skip: !user || user.role !== 'ORGANIZER'
  });

  useEffect(() => {
    const confirm = async () => {
      const { success, sessionId, planId, proratedCredit } = router.query;
      if (success === 'true' && sessionId && planId) {
        if (confirmCalledRef.current) return;
        confirmCalledRef.current = true;
        try {
          const { data: d } = await confirmPurchase({
            variables: {
              sessionId,
              planId,
              proratedCredit: proratedCredit ? parseInt(proratedCredit, 10) : 0
            }
          });
          toast.success('Plan purchased successfully! 🚀');
          login(d.confirmPlanPurchase.token);
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
  const isActive = billing?.isPlanActive;
  const scheduledPlanId = billing?.scheduledPlanId;
  const scheduledDowngradeAt = billing?.scheduledDowngradeAt;

  return (
    <>
      <Head><title>Billing | EventHub</title></Head>

      {/* Header */}
      <div className="billing-header">
        <div className="billing-header-left">
          <div className="header-icon">
            <CreditCardOutlined style={{ fontSize: '1.5rem', color: 'white' }} />
          </div>
          <div>
            <h1 className="header-title">Billing & Invoices</h1>
            <p className="header-sub">Manage your subscription and view payment history</p>
          </div>
        </div>
        {/* Only show "Choose Plan" if no active plan */}
        {!isActive && (
          <Button
            type="primary"
            icon={<RocketOutlined />}
            onClick={() => router.push('/plans')}
            className="header-btn"
          >
            Choose Plan
          </Button>
        )}
      </div>

      {/* Body Grid */}
      <div className="billing-grid">

        {/* ── Current Plan Card ── */}
        <div className={`plan-card ${isActive ? 'plan-card--active' : 'plan-card--inactive'}`}>
          <div className="plan-status-row">
            {isActive
              ? <CheckCircleFilled style={{ color: '#10b981', fontSize: '1rem' }} />
              : <WarningOutlined style={{ color: '#ef4444', fontSize: '1rem' }} />}
            <span className={`plan-status-label ${isActive ? 'label--active' : 'label--inactive'}`}>
              {loading ? 'Loading…' : isActive ? 'Active Subscription' : 'No Active Plan'}
            </span>
          </div>

          {billing?.currentPlan ? (
            <>
              <div className="plan-name-row">
                {billing.currentPlan === 'PRO'
                  ? <CrownOutlined style={{ color: 'rgb(67,56,202)', fontSize: '1.3rem' }} />
                  : <FileTextOutlined style={{ color: '#64748b', fontSize: '1.3rem' }} />}
                <span className="plan-name">
                  {billing.currentPlan === 'PRO' ? 'Pro Plan' : 'Basic Plan'}
                </span>
              </div>

              <div className={`plan-meta ${isActive ? 'meta--active' : 'meta--inactive'}`}>
                <div className="meta-row">
                  <span className="meta-label">Valid until</span>
                  <span className="meta-value">{formatDate(billing.planExpiresAt)}</span>
                </div>
                {isActive && (
                  <div className="meta-row">
                    <span className="meta-label">Days remaining</span>
                    <span className="meta-value" style={{
                      color: remaining <= 5 ? '#ef4444' : remaining <= 10 ? '#f59e0b' : '#10b981'
                    }}>
                      {remaining} day{remaining !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>

              {remaining <= 7 && isActive && (
                <div className="renew-warning">
                  ⚠️ Renew soon to avoid service interruption
                </div>
              )}

              {/* Scheduled Downgrade Notice */}
              {scheduledPlanId === 'BASIC' && scheduledDowngradeAt && (
                <div style={{
                  background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '0.82rem',
                  color: '#92400e',
                  fontWeight: 600,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <span>📅</span>
                  <span>Downgrade to Basic scheduled on <strong>{formatDate(scheduledDowngradeAt)}</strong></span>
                </div>
              )}

              <ul className="plan-features">
                {(billing.currentPlan === 'BASIC'
                  ? ['Up to 5 events/month', 'Basic analytics', 'Standard support']
                  : ['Unlimited events', 'Advanced analytics', 'Priority 24/7 support']
                ).map((f, i) => (
                  <li key={i} className="plan-feature-item">
                    <CheckCircleFilled style={{ color: isActive ? 'rgb(67,56,202)' : '#94a3b8', fontSize: '0.85rem' }} />
                    {f}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="no-plan">
              <div className="no-plan-icon">📋</div>
              <div className="no-plan-title">No active plan</div>
              <div className="no-plan-sub">Choose a plan to start creating events</div>
            </div>
          )}
        </div>

        {/* ── Invoice History ── */}
        <div className="invoices-card">
          <div className="invoices-header">
            <div>
              <h2 className="invoices-title">Invoice History</h2>
              <p className="invoices-sub">
                {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>

          {loading ? (
            <div className="invoices-empty">Loading invoices…</div>
          ) : invoices.length === 0 ? (
            <div className="invoices-empty">
              <div className="empty-icon">🧾</div>
              <div className="empty-title">No invoices yet</div>
              <div className="empty-sub">Your billing history will appear here after your first purchase</div>
            </div>
          ) : (
            <div className="invoice-list">
              {/* Table header — hidden on mobile */}
              <div className="invoice-row invoice-row--header">
                <span>Plan</span>
                <span>Period</span>
                <span>Amount</span>
                <span>Status</span>
                <span>Date</span>
              </div>

              {invoices.map((inv) => (
                <div key={inv.id} className="invoice-row invoice-row--data">
                  {/* Plan */}
                  <div className="inv-plan">
                    {inv.planId === 'PRO'
                      ? <CrownOutlined style={{ color: 'rgb(67,56,202)' }} />
                      : <FileTextOutlined style={{ color: '#64748b' }} />}
                    <span>{inv.planId === 'PRO' ? 'Pro Plan' : 'Basic Plan'}</span>
                  </div>

                  {/* Period */}
                  <div className="inv-period">
                    <span>{formatDate(inv.planStartDate)}</span>
                    <span className="inv-period-arrow">→ {formatDate(inv.planEndDate)}</span>
                  </div>

                  {/* Amount */}
                  <div className="inv-amount">
                    ₹{inv.amount.toLocaleString('en-IN')}
                  </div>

                  {/* Status */}
                  <div>
                    <Tag
                      color={inv.status === 'PAID' ? 'success' : 'error'}
                      style={{ borderRadius: 6, fontWeight: 700, fontSize: '0.72rem' }}
                    >
                      {inv.status}
                    </Tag>
                  </div>

                  {/* Date */}
                  <div className="inv-date">{formatDate(inv.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        /* ── Layout ── */
        .billing-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          background: var(--card-bg);
          border: 1px solid var(--glass-border);
          border-radius: 24px;
          padding: 24px 28px;
          margin-bottom: 24px;
          box-shadow: var(--shadow-card);
        }
        .billing-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .header-icon {
          width: 52px; height: 52px;
          border-radius: 14px;
          background: var(--gradient-main);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 8px 20px rgba(67,56,202,0.25);
        }
        .header-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 900;
          color: var(--text-primary);
          letter-spacing: -0.5px;
        }
        .header-sub {
          margin: 2px 0 0;
          color: var(--text-secondary);
          font-size: 0.88rem;
        }
        :global(.header-btn) {
          height: 44px !important;
          border-radius: 12px !important;
          font-weight: 700 !important;
          background: var(--gradient-main) !important;
          border: none !important;
          box-shadow: 0 6px 16px rgba(67,56,202,0.3) !important;
        }

        .billing-grid {
          display: grid;
          grid-template-columns: 340px 1fr;
          gap: 24px;
          align-items: start;
        }

        /* ── Plan Card ── */
        .plan-card {
          background: var(--card-bg);
          border-radius: 24px;
          padding: 28px;
          box-shadow: var(--shadow-card);
        }
        .plan-card--active {
          border: 1px solid rgba(67,56,202,0.2);
          box-shadow: var(--shadow-glow);
        }
        .plan-card--inactive {
          border: 1px solid rgba(239,68,68,0.2);
          box-shadow: 0 4px 16px rgba(239,68,68,0.08);
        }

        .plan-status-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }
        .plan-status-label {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .label--active  { color: #10b981; }
        .label--inactive { color: #ef4444; }

        .plan-name-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }
        .plan-name {
          font-size: 1.7rem;
          font-weight: 900;
          color: var(--text-primary);
        }

        .plan-meta {
          border-radius: 12px;
          padding: 14px 16px;
          margin-bottom: 16px;
        }
        .meta--active   { background: rgba(67,56,202,0.05); }
        .meta--inactive { background: rgba(239,68,68,0.05); }

        .meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
        }
        .meta-label { font-size: 0.84rem; color: var(--text-secondary); }
        .meta-value { font-size: 0.84rem; font-weight: 700; color: var(--text-primary); }

        .renew-warning {
          background: linear-gradient(135deg, #fff7ed, #ffedd5);
          border: 1px solid rgba(234,88,12,0.2);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 0.82rem;
          color: #c2410c;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .plan-features {
          list-style: none;
          padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 10px;
        }
        .plan-feature-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .no-plan {
          text-align: center;
          padding: 24px 0;
          color: var(--text-muted);
        }
        .no-plan-icon  { font-size: 2.5rem; margin-bottom: 10px; }
        .no-plan-title { font-weight: 700; font-size: 1rem; color: var(--text-primary); margin-bottom: 6px; }
        .no-plan-sub   { font-size: 0.85rem; }

        /* ── Invoices Card ── */
        .invoices-card {
          background: var(--card-bg);
          border: 1px solid var(--glass-border);
          border-radius: 24px;
          padding: 28px;
          box-shadow: var(--shadow-card);
        }
        .invoices-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .invoices-title { margin: 0; font-size: 1.05rem; font-weight: 800; color: var(--text-primary); }
        .invoices-sub   { margin: 2px 0 0; font-size: 0.82rem; color: var(--text-muted); }

        .invoices-empty {
          text-align: center;
          padding: 48px 20px;
          color: var(--text-muted);
        }
        .empty-icon  { font-size: 2.5rem; margin-bottom: 10px; }
        .empty-title { font-weight: 700; font-size: 1rem; color: var(--text-primary); margin-bottom: 6px; }
        .empty-sub   { font-size: 0.85rem; }

        /* ── Invoice Table ── */
        .invoice-list { display: flex; flex-direction: column; gap: 10px; }

        .invoice-row {
          display: grid;
          grid-template-columns: 1.2fr 1.4fr 100px 90px 80px;
          gap: 12px;
          align-items: center;
          padding: 10px 16px;
          border-radius: 12px;
        }
        .invoice-row--header {
          background: var(--bg-color);
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
        }
        .invoice-row--data {
          background: var(--bg-color);
          border: 1px solid var(--glass-border);
          transition: box-shadow 0.2s;
        }
        .invoice-row--data:hover { box-shadow: var(--shadow-md); }

        .inv-plan {
          display: flex; align-items: center; gap: 8px;
          font-weight: 700; font-size: 0.9rem; color: var(--text-primary);
        }
        .inv-period {
          display: flex; flex-direction: column;
          font-size: 0.82rem; color: var(--text-secondary);
        }
        .inv-period-arrow { color: var(--text-muted); }
        .inv-amount {
          font-weight: 800; font-size: 0.95rem; color: var(--text-primary);
        }
        .inv-date { font-size: 0.8rem; color: var(--text-muted); }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .billing-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .billing-header { padding: 18px 20px; }
          .header-title   { font-size: 1.25rem; }
          .plan-card, .invoices-card { padding: 20px; }

          /* Stack invoice rows on mobile */
          .invoice-row--header { display: none; }
          .invoice-row--data {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: auto auto auto;
            gap: 8px;
            padding: 14px;
          }
          .inv-plan   { grid-column: 1 / -1; }
          .inv-period { grid-column: 1 / 2; }
          .inv-amount { grid-column: 2 / 3; justify-self: end; }
          .inv-date   { grid-column: 1 / 2; }
        }
      `}</style>
    </>
  );
}
