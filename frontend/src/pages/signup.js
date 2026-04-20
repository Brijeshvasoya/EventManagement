import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { Form, Input, Button, Typography, ConfigProvider, theme, Radio, Space } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, ArrowLeftOutlined, RocketOutlined, CheckCircleFilled } from '@ant-design/icons';

const { Title, Text: AntText } = Typography;

const REGISTER_MUTATION = gql`
  mutation Register($name: String!, $email: String!, $password: String!, $role: String) {
    register(name: $name, email: $email, password: $password, role: $role) { token }
  }
`;

export default function Signup() {
  const { login } = useAuth();
  const [registerM, { loading }] = useMutation(REGISTER_MUTATION);

  const onFinish = async (values) => {
    try {
      const { data } = await registerM({ variables: values });
      toast.success('Account created successfully! 🚀');
      login(data.register.token);
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
      <Head><title>Create Account | EventHub</title></Head>
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
            position: 'absolute', top: '10%', right: '-10%', width: '100%', height: '100%',
            filter: 'blur(80px)', animation: 'floatGradientRight 10s infinite ease-in-out'
          }} />
          <div style={{
            position: 'absolute', bottom: '-10%', left: '-10%', width: '100%', height: '100%',
            background: 'radial-gradient(circle at 0% 100%, rgba(0, 212, 170, 0.15) 0%, transparent 60%)',
            filter: 'blur(80px)', animation: 'floatGradientLeft 12s infinite ease-in-out reverse'
          }} />

          <div style={{ position: 'relative', zIndex: 2, animation: 'fadeInScale 1s var(--ease-out)' }}>
            <div style={{
              width: '70px', height: '70px', borderRadius: '20px',
              background: 'var(--gradient-main)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', marginBottom: '2.5rem', boxShadow: 'var(--shadow-glow)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>🚀</div>

            <h1 style={{ fontSize: '4.5rem', fontWeight: '950', color: 'white', lineHeight: 0.95, letterSpacing: '-3px', marginBottom: '1.5rem' }}>
              Built for <span style={{ background: 'var(--gradient-pink)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Creators.</span>
            </h1>

            <p style={{ fontSize: '1.3rem', color: 'var(--text-secondary)', maxWidth: '500px', lineHeight: 1.5, marginBottom: '3rem', fontWeight: 300 }}>
              Join the elite circle of event professional organizers and scale your experiences globally.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
              {[
                { icon: '🎯', text: 'Professional Suite', desc: 'All-in-one management tools', color: '#7c5cfc' },
                { icon: '⚡', text: 'Instant Scale', desc: 'Global server infrastructure', color: '#00d4aa' }
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', gap: '15px', alignItems: 'center',
                  background: 'var(--glass-bg)', padding: '1.2rem 1.5rem',
                  borderRadius: '16px', border: '1px solid var(--glass-border)',
                  backdropFilter: 'blur(30px)', maxWidth: '440px'
                }}>
                  <div style={{
                    fontSize: '1.5rem', background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}33 100%)`,
                    width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>{item.icon}</div>
                  <div>
                    <h4 style={{ color: 'white', margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{item.text}</h4>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Pane: Signup Form */}
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

          <div style={{
            width: '100%', maxWidth: '520px', position: 'relative', zIndex: 2,
            background: 'var(--card-bg)', backdropFilter: 'blur(40px)',
            padding: '2.5rem', borderRadius: 'var(--radius-2xl)',
            border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-lg)',
            animation: 'fadeInScale 0.8s var(--ease-out)'
          }}>
            <div style={{ marginBottom: '1.2rem', textAlign: 'center' }}>
              <h2 style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', letterSpacing: '-1.5px', marginBottom: '0.2rem' }}>Create Account</h2>
              <AntText style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 300 }}>Join the ecosystem and start creating.</AntText>
            </div>

            <Form
              layout="vertical"
              onFinish={onFinish}
              requiredMark={false}
              size="large"
              initialValues={{ role: 'USER' }}
              className="premium-form"
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Form.Item
                  label="Full Name"
                  name="name"
                  rules={[{ required: true, message: 'Name required' }]}
                >
                  <Input placeholder="Alex Thorne" />
                </Form.Item>

                <Form.Item
                  label="Email Channel"
                  name="email"
                  rules={[{ required: true, message: 'Email required' }, { type: 'email' }]}
                >
                  <Input placeholder="alex@hub.com" />
                </Form.Item>
              </div>

              <Form.Item
                label="Password"
                name="password"
                rules={[{ required: true, message: 'Password required' }]}
              >
                <Input placeholder="••••••••" type="password" />
              </Form.Item>
              <Form.Item
                label="Confirm Password"
                name="confirmPassword"
                rules={[{ required: true, message: 'Password required' }]}
              >
                <Input placeholder="••••••••" type="password" />
              </Form.Item>

              <Form.Item
                label="Operative Role"
                name="role"
                style={{ marginBottom: '1.5rem' }}
              >
                <Radio.Group style={{ width: '100%' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <Form.Item noStyle dependencies={['role']}>
                      {({ getFieldValue }) => (
                        <>
                          <Radio.Button value="USER" className={getFieldValue('role') === 'USER' ? 'active' : ''}>
                            <div style={{ fontSize: '1.2rem' }}>
                              <div className="role-text">🎫 Attendee</div></div>
                          </Radio.Button>
                          <Radio.Button value="ORGANIZER" className={getFieldValue('role') === 'ORGANIZER' ? 'active' : ''}>
                            <div style={{ fontSize: '1.2rem' }}>
                              <div className="role-text">🎯 Organizer</div></div>
                          </Radio.Button>
                        </>
                      )}
                    </Form.Item>
                  </div>
                </Radio.Group>
              </Form.Item>

              <Form.Item style={{ marginBottom: '1rem' }}>
                <Button type="primary" htmlType="submit" loading={loading} block className="submit-btn">
                  Establish Identity
                </Button>
              </Form.Item>
            </Form>

            <div style={{ textAlign: 'center' }}>
              <AntText style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Already an operative? </AntText>
              <Link href="/login" style={{ color: 'var(--secondary-color)', fontWeight: 700, fontSize: '0.85rem' }}>Login</Link>
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
        }
        .premium-form .ant-input, .premium-form .ant-input-password {
          background: rgba(255, 255, 255, 0.03) !important;
          border-color: var(--border-color) !important;
          color: white !important;
          border-radius: 12px !important;
          height: 44px !important;
        }
        .premium-form .ant-input:focus, .premium-form .ant-input-focused {
          border-color: var(--primary-color) !important;
          background: rgba(124, 92, 252, 0.05) !important;
          box-shadow: 0 0 0 4px var(--primary-glow) !important;
        }
        .premium-form .ant-radio-button-wrapper {
          height: 40px !important;
          background: rgba(255, 255, 255, 0.02) !important;
          border-color: var(--border-color) !important;
          border-radius: 14px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 8px !important;
          transition: all 0.4s var(--ease-out) !important;
        }
        .premium-form .ant-radio-button-wrapper-checked {
          background: var(--success-bg) !important;
          border-color: var(--secondary-color) !important;
          box-shadow: 0 0 15px var(--success-bg) !important;
        }
        .premium-form .role-text {
          font-weight: 800;
          font-size: 0.75rem;
          color: var(--text-primary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .premium-form .submit-btn {
          height: 50px !important;
          border-radius: 14px !important;
          background: var(--gradient-main) !important;
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
        
        @keyframes floatGradientRight {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, 40px) scale(1.1); }
        }
        
        @keyframes floatGradientLeft {
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
