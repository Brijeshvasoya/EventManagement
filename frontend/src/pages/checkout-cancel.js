import Link from 'next/link';
import { Button, Result } from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons';
import Head from 'next/head';

export default function CheckoutCancel() {
  return (
    <>
      <Head><title>Payment Cancelled | EventHub</title></Head>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        position: 'relative'
      }}>
        {/* Background orbs */}
        <div style={{
          position: 'absolute',
          top: '25%', left: '15%',
          width: '250px', height: '250px',
          background: 'radial-gradient(circle, rgba(255, 77, 106, 0.06) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'floatOrb 10s ease-in-out infinite'
        }} />

        <div style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          animation: 'scaleIn 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
          maxWidth: '480px',
          padding: '0 24px'
        }}>
          {/* Error Icon */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '20px',
            background: 'rgba(255, 77, 106, 0.1)',
            border: '1px solid rgba(255, 77, 106, 0.2)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '2rem',
            fontSize: '2rem'
          }}>
            <CloseCircleOutlined style={{ color: '#ff4d6a', fontSize: '2rem' }} />
          </div>

          <h1 style={{ 
            color: '#f0f0f5', 
            fontWeight: 800, 
            fontSize: '2rem',
            letterSpacing: '-0.5px',
            marginBottom: '12px'
          }}>Payment Cancelled</h1>
          <p style={{ color: '#6b6b80', lineHeight: 1.6, fontSize: '0.95rem', marginBottom: '2rem' }}>
            Your payment request was not completed and no charges were made. If this was a mistake, you can try booking again.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/dashboard">
              <Button type="primary" size="large" style={{ borderRadius: '12px', height: '48px', padding: '0 28px' }}>
                Return to Dashboard
              </Button>
            </Link>
            <Link href="/browse">
              <Button size="large" style={{ borderRadius: '12px', height: '48px', padding: '0 28px' }}>
                Browse Events
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
