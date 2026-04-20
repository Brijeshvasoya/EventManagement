import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { UPDATE_PROFILE } from '@/features/events/graphql/queries';
import { useMutation } from '@apollo/client/react';
import Link from 'next/link';
import { Form, Input, Button, Typography, ConfigProvider, theme, Space, Divider } from 'antd';
import { ArrowLeftOutlined, UserOutlined, MailOutlined, LockOutlined, SafetyOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text: AntText } = Typography;

export default function Profile() {
  const { user, setUser } = useAuth();
  const [updateProfile, { loading: updating }] = useMutation(UPDATE_PROFILE);
  const [form] = Form.useForm();

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        name: user.name,
        email: user.email
      });
    }
  }, [user, form]);

  if (!user) return (
    <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>
      <AntText type="secondary">Please login to manage profile.</AntText>
    </div>
  );

  const onFinish = async (values) => {
    try {
      const { data } = await updateProfile({ 
        variables: { 
          name: values.name, 
          email: values.email,
          currentPassword: values.currentPassword,
          newPassword: values.newPassword
        } 
      });
      setUser({ ...user, name: data.updateProfile.name, email: data.updateProfile.email });
      form.setFieldsValue({ currentPassword: '', newPassword: '' });
      toast.success('Security & Profile updated! ✨');
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <ConfigProvider 
      theme={{ 
        algorithm: theme.darkAlgorithm,
        token: { 
          colorPrimary: '#7c5cfc', 
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          borderRadius: 14,
          colorBgContainer: '#16162b',
          colorBgElevated: '#1a1a2e',
          colorBorder: 'rgba(255, 255, 255, 0.08)',
          colorText: '#f0f0f5',
          colorTextSecondary: '#a0a0b8',
          colorBgLayout: '#0a0a0f',
          controlHeight: 45,
        } 
      }}
    >
      <Head><title>Manage Profile | EventHub</title></Head>
      <div style={{ maxWidth: '640px', margin: '2rem auto', padding: '0 24px' }}>
        <Link href="/dashboard" style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '8px', 
          color: 'var(--primary-color)', 
          marginBottom: '2rem', 
          fontWeight: 600,
          fontSize: '0.95rem',
          transition: 'all 0.2s'
        }}>
          <ArrowLeftOutlined /> Back to Dashboard
        </Link>

        <div style={{ marginBottom: '2.5rem' }}>
          <Title level={2} style={{ margin: 0, fontWeight: 800, letterSpacing: '-1px' }}>
            Account Settings
          </Title>
          <AntText type="secondary">Manage your personal information and account security.</AntText>
        </div>

        <div className="form-card" style={{ 
          background: 'var(--card-bg)', 
          backdropFilter: 'blur(24px)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)'
        }}>
          {/* User Identity Header */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1.5rem', 
            marginBottom: '3rem',
            padding: '24px',
            background: 'var(--gradient-glass)',
            borderRadius: '20px',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '22px', 
              background: 'var(--gradient-main)', 
              color: '#fff', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '2rem', 
              fontWeight: 800,
              boxShadow: 'var(--shadow-glow)',
              flexShrink: 0
            }}>
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <Title level={3} style={{ margin: 0, fontWeight: 700 }}>{user.name}</Title>
              <Space style={{ marginTop: '8px' }}>
                <div style={{ 
                  padding: '4px 12px',
                  background: 'rgba(124, 92, 252, 0.12)',
                  border: '1px solid var(--primary-glow)',
                  borderRadius: '8px',
                  color: 'var(--primary-color)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>{user.role}</div>
                <AntText type="secondary" style={{ fontSize: '0.9rem' }}>Member since 2024</AntText>
              </Space>
            </div>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            requiredMark={false}
            size="large"
          >
            <Divider titlePlacement="left" style={{ margin: '0 0 1.5rem 0', borderColor: 'var(--border-color)' }}>
              <AntText strong style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Basic Information
              </AntText>
            </Divider>

            <Form.Item
              label="Full Name"
              name="name"
              rules={[{ required: true, message: 'Please enter your name' }]}
            >
              <Input 
                prefix={<UserOutlined style={{ color: 'var(--text-muted)' }} />} 
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
              />
            </Form.Item>

            <Form.Item
              label="Email Address"
              name="email"
              rules={[{ required: true, message: 'Please enter your email' }, { type: 'email', message: 'Please enter a valid email' }]}
            >
              <Input 
                prefix={<MailOutlined style={{ color: 'var(--text-muted)' }} />} 
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
              />
            </Form.Item>

            <Divider titlePlacement="left" style={{ margin: '2.5rem 0 1.5rem 0', borderColor: 'var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SafetyOutlined style={{ color: 'var(--primary-color)' }} />
                <AntText strong style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Security & Password
                </AntText>
              </div>
            </Divider>

            <Form.Item
              label="Current Password"
              name="currentPassword"
              extra={<AntText type="secondary" style={{ fontSize: '0.8rem' }}>Required only if changing password or email.</AntText>}
            >
              <Input.Password 
                prefix={<LockOutlined style={{ color: 'var(--text-muted)' }} />} 
                placeholder="Enter current password" 
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
              />
            </Form.Item>

            <Form.Item
              label="New Password"
              name="newPassword"
            >
              <Input.Password 
                prefix={<LockOutlined style={{ color: 'var(--text-muted)' }} />} 
                placeholder="Set a new secure password" 
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
              />
            </Form.Item>

            <Form.Item style={{ marginTop: '3rem', marginBottom: 0 }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={updating} 
                block
                icon={<CheckCircleOutlined />}
                style={{ 
                  height: '54px', 
                  fontSize: '1.05rem', 
                  fontWeight: 700,
                  background: 'var(--gradient-main)',
                  border: 'none',
                  boxShadow: '0 8px 24px var(--primary-glow)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                Update Profile Settings
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </ConfigProvider>
  );
}
