import { useState } from 'react';
import { useRouter } from 'next/router';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { Form, Input, Button, Typography, ConfigProvider, theme } from 'antd';
import { MailOutlined, LockOutlined, ArrowLeftOutlined, ThunderboltOutlined } from '@ant-design/icons';

const { Title, Text: AntText } = Typography;

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) { token }
  }
`;

export default function Login() {
  const { login } = useAuth();
  const [loginM, { loading }] = useMutation(LOGIN_MUTATION);
  const router = useRouter();
  const { returnUrl } = router.query;

  const onFinish = async (values) => {
    try {
      const { data } = await loginM({ variables: values });
      toast.success('Welcome back! ✨');
      login(data.login.token, returnUrl || '/dashboard');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#7c5cfc',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          borderRadius: 16,
          colorBgContainer: 'var(--bg-secondary)',
          colorBorder: 'var(--border-color)',
          controlHeight: 40,
        }
      }}
    >
      <Head><title>Sign In | EventHub Console</title></Head>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        background: 'radial-gradient(circle at 100% 0%, rgba(124, 92, 252, 0.25) 0%, transparent 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Left Pane: Branding */}
        <div style={{
          flex: 1,
          padding: '4rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }} className="hide-mobile">
          {/* Background Effects */}
          <div style={{
            position: 'absolute', top: '10%', left: '-10%', width: '100%', height: '100%',
            filter: 'blur(80px)', animation: 'floatGradient 12s infinite ease-in-out'
          }} />
          <div style={{
            position: 'absolute', bottom: '-10%', right: '-10%', width: '100%', height: '100%',
            background: 'radial-gradient(circle at 0% 100%, rgba(0, 212, 170, 0.15) 0%, transparent 60%)',
            filter: 'blur(80px)', animation: 'floatGradient 15s infinite ease-in-out reverse'
          }} />

          <div style={{ position: 'relative', zIndex: 2, animation: 'fadeInScale 1s var(--ease-out)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '70px', height: '70px', borderRadius: '20px',
                background: 'var(--gradient-main)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem', boxShadow: 'var(--shadow-glow)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>🎭</div>

              <h1 style={{ fontSize: '4.5rem', fontWeight: '950', color: 'white', lineHeight: 0.95, letterSpacing: '-3px' }}>
                <span style={{ background: 'var(--gradient-cool)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Welcome back </span>
              </h1>
            </div>

            <p style={{ fontSize: '1.3rem', color: 'var(--text-secondary)', maxWidth: '500px', lineHeight: 1.5, marginBottom: '3rem', fontWeight: 300 }}>
              Access your events dashboard and monitor your global impact in real-time.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
              {[
                { icon: '🎫', text: 'Smart Sync', desc: 'Real-time booking' },
                { icon: '📊', text: 'Insight AI', desc: 'Growth analytics' },
                { icon: '🌐', text: 'Global Reach', desc: 'Connect with audiences worldwide' },
                { icon: '�', text: '24/7 Support', desc: 'Dedicated assistance whenever you need help' },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', gap: '12px', alignItems: 'center',
                  background: 'var(--glass-bg)', padding: '1rem',
                  borderRadius: '16px', border: '1px solid var(--glass-border)',
                  backdropFilter: 'blur(30px)'
                }}>
                  <div style={{ fontSize: '1.2rem' }}>{item.icon}</div>
                  <div>
                    <h4 style={{ color: 'white', margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>{item.text}</h4>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.75rem' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Pane: Login Form */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          padding: '2rem'
        }} className="full-mobile">
          {/* Subtle Form Mesh Background */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.4,
          }} />

          <div className="auth-card" style={{
            width: '100%', maxWidth: '440px', position: 'relative', zIndex: 2,
            background: 'var(--card-bg)', backdropFilter: 'blur(40px)',
            border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-lg)',
            animation: 'fadeInScale 0.8s var(--ease-out)'
          }}>
            <div style={{ marginBottom: '1.2rem', textAlign: 'center' }}>
              <div style={{
                width: '50px', height: '50px', borderRadius: '15px',
                background: 'var(--gradient-main)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', margin: '0 auto 1.2rem', boxShadow: 'var(--shadow-glow)'
              }}>🎭</div>
              <h2 style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', letterSpacing: '-1.5px', marginBottom: '0.2rem' }}>Welcome Back</h2>
              <AntText style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 300 }}>Authorize to access your ecosystem.</AntText>
            </div>

            <Form
              layout="vertical"
              onFinish={onFinish}
              requiredMark={false}
              size="large"
              className="premium-form"
            >
              <Form.Item
                label="Email Address"
                name="email"
                rules={[{ required: true, message: 'Email required' }, { type: 'email' }]}
              >
                <Input placeholder="alex@hub.com" />
              </Form.Item>
              <Form.Item
                label="Password"
                name="password"
                rules={[{ required: true, message: 'Password required' }]}
              >
                <Input placeholder="••••••••" type="password" />
              </Form.Item>

              <Form.Item style={{ marginBottom: '1.5rem' }}>
                <Button type="primary" htmlType="submit" loading={loading} block className="submit-btn" style={{ background: 'var(--gradient-cool) !important' }}>
                  Acknowledge & Sign In
                </Button>
              </Form.Item>
            </Form>

            <div style={{ textAlign: 'center' }}>
              <AntText style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>New to the mission? </AntText>
              <Link href="/signup" style={{ color: 'var(--secondary-color)', fontWeight: 700, fontSize: '0.85rem' }}>Create Account</Link>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .premium-form .ant-form-item-label {
          padding-bottom: 4px !important;
        }
        .premium-form .ant-form-item-label label {
          color: var(--text-secondary) !important;
          font-size: 0.7rem !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 1px !important;
          width: 100%;
        }
        .premium-form .ant-input, .premium-form .ant-input-password {
          background: rgba(255, 255, 255, 0.03) !important;
          border-color: var(--border-color) !important;
          color: white !important;
          border-radius: 12px !important;
          height: 48px !important;
        }
        .premium-form .ant-input:focus, .premium-form .ant-input-focused {
          border-color: var(--primary-color) !important;
          background: rgba(124, 92, 252, 0.05) !important;
          box-shadow: 0 0 0 4px var(--primary-glow) !important;
        }
        .premium-form .submit-btn {
          height: 54px !important;
          border-radius: 14px !important;
          background: var(--gradient-cool) !important;
          border: none !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 1.5px !important;
          box-shadow: var(--shadow-glow) !important;
        }
        
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes floatGradient {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -40px) scale(1.1); }
        }

        @media (max-width: 1024px) {
          .hide-mobile { display: none !important; }
          .full-mobile { flex: 1 !important; }
        }
      `}</style>
    </ConfigProvider>
  );
}
