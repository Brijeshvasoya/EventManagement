import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { UPDATE_PROFILE, GET_MY_EVENTS, GET_MY_BOOKINGS, GET_ME } from '@/features/events/graphql/queries';
import Link from 'next/link';
import { Form, Input, Button, Typography, ConfigProvider, Space, Divider, Avatar, Skeleton } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, SafetyOutlined, CheckCircleOutlined, ThunderboltOutlined, CalendarOutlined, StarOutlined, GiftOutlined } from '@ant-design/icons';
import { useMutation, useQuery } from '@apollo/client/react';

const { Title, Text: AntText } = Typography;

export default function Profile() {
  const { user, setUser } = useAuth();
  const [updateProfile, { loading: updating }] = useMutation(UPDATE_PROFILE);
  const [form] = Form.useForm();

  // Fetch Latest User Data (Rating/Points)
  const { data: meData, loading: meLoading } = useQuery(GET_ME, {
    skip: !user,
    onCompleted: (data) => {
      if (data.me && user) setUser({ ...user, ...data.me });
    }
  });

  // Fetch Stats Dynamically (Events Count)
  const { data: eventsData, loading: eventsLoading } = useQuery(user?.role === 'ORGANIZER' ? GET_MY_EVENTS : GET_MY_BOOKINGS, {
    skip: !user
  });

  const statsCount = user?.role === 'ORGANIZER'
    ? eventsData?.myEvents?.length || 0
    : eventsData?.myBookings?.length || 0;

  const points = meData?.me?.loyaltyPoints || 0;
  const rating = meData?.me?.rating || 5.0;

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        name: user.name,
        email: user.email
      });
    }
  }, [user, form]);

  if (!user) return (
    <div style={{ textAlign: 'center', padding: '100px', background: 'white', borderRadius: '24px' }}>
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
        token: {
          colorPrimary: 'rgb(67, 56, 202)',
          fontFamily: "'Inter', sans-serif",
          borderRadius: 20,
        }
      }}
    >
      <Head><title>Profile Settings | EventHub</title></Head>

      <div style={{ padding: '20px 0' }}>
        {/* Top Header Card */}
        <div className="header-responsive" style={{
          background: 'white',
          borderRadius: '32px',
          marginBottom: '32px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px',
          border: '1px solid rgba(67, 56, 202, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ position: 'relative' }}>
              <Avatar size={100} icon={<UserOutlined />} style={{
                background: 'linear-gradient(135deg, #1B2A4E 0%, #312E81 100%)',
                fontSize: '40px',
                boxShadow: '0 10px 20px rgba(27, 42, 78, 0.2)'
              }} />
              <div style={{
                position: 'absolute', bottom: 5, right: 5,
                width: '24px', height: '24px', background: '#10B981',
                borderRadius: '50%', border: '4px solid white'
              }}></div>
            </div>
            <div>
              <Title level={2} style={{ margin: 0, fontWeight: 900, color: '#1B2A4E', letterSpacing: '-1px' }}>{user.name}</Title>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                  <ThunderboltOutlined style={{ color: 'rgb(67, 56, 202)' }} /> {user.role}
                </span>
                <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                  <CalendarOutlined style={{ color: 'rgb(67, 56, 202)' }} /> Member since {user.createdAt?.slice(0, 4) || '2024'}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ textAlign: 'center', padding: '12px 24px', background: 'rgba(67, 56, 202, 0.05)', borderRadius: '16px', minWidth: '100px' }}>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#312E81' }}>
                {eventsLoading ? '...' : statsCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                {user.role === 'ORGANIZER' ? 'EVENTS' : 'BOOKINGS'}
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px 24px', background: 'rgba(67, 56, 202, 0.05)', borderRadius: '16px', minWidth: '100px' }}>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#312E81' }}>
                {meLoading ? '...' : (user.role === 'ORGANIZER' ? rating.toFixed(1) : points)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                {user.role === 'ORGANIZER' ? 'RATING' : 'POINTS'}
              </div>
            </div>
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          size="large"
        >
          <div className="grid-cols-auto-400" style={{ gap: '32px' }}>

            {/* Account Information */}
            <div style={{
              background: 'white',
              borderRadius: '32px',
              padding: '40px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              border: '1px solid rgba(67, 56, 202, 0.08)'
            }}>
              <Divider orientation="left" style={{ marginTop: 0 }}>
                <span style={{ color: '#1B2A4E', fontWeight: 800, fontSize: '1rem', letterSpacing: '0.5px' }}>BASIC INFO</span>
              </Divider>

              <Form.Item label="FULL NAME" name="name" rules={[{ required: true }]}>
                <Input prefix={<UserOutlined style={{ color: '#94A3B8', marginRight: '8px' }} />} placeholder="Update your name" style={{ borderRadius: '12px' }} />
              </Form.Item>

              <Form.Item label="EMAIL ADDRESS" name="email" rules={[{ required: true, type: 'email' }]}>
                <Input prefix={<MailOutlined style={{ color: '#94A3B8', marginRight: '8px' }} />} placeholder="Update your email" style={{ borderRadius: '12px' }} />
              </Form.Item>
            </div>

            {/* Security Settings */}
            <div style={{
              background: 'white',
              borderRadius: '32px',
              padding: '40px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              border: '1px solid rgba(67, 56, 202, 0.08)'
            }}>
              <Divider orientation="left" style={{ marginTop: 0 }}>
                <span style={{ color: '#1B2A4E', fontWeight: 800, fontSize: '1rem', letterSpacing: '0.5px' }}>SECURITY</span>
              </Divider>

              <Form.Item label="CURRENT PASSWORD" name="currentPassword">
                <Input.Password prefix={<LockOutlined style={{ color: '#94A3B8', marginRight: '8px' }} />} placeholder="Required to save changes" style={{ borderRadius: '12px' }} />
              </Form.Item>

              <Form.Item label="NEW PASSWORD" name="newPassword">
                <Input.Password prefix={<LockOutlined style={{ color: '#94A3B8', marginRight: '8px' }} />} placeholder="Leave blank to keep same" style={{ borderRadius: '12px' }} />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                loading={updating}
                block
                icon={<CheckCircleOutlined />}
                style={{
                  height: '54px',
                  borderRadius: '16px',
                  fontWeight: 800,
                  marginTop: '12px',
                  background: 'linear-gradient(90deg, #1B2A4E 0%, #312E81 100%)',
                  border: 'none',
                  boxShadow: '0 10px 20px rgba(27, 42, 78, 0.15)'
                }}
              >
                SAVE ALL SETTINGS
              </Button>
            </div>

          </div>
        </Form>
      </div>

      <style jsx global>{`
        .ant-form-item-label label {
          font-weight: 800 !important;
          font-size: 0.75rem !important;
          color: #94A3B8 !important;
          letter-spacing: 0.5px !important;
        }
        .ant-input:focus, .ant-input-focused {
          border-color: rgb(67, 56, 202) !important;
          box-shadow: 0 0 0 4px rgba(67, 56, 202, 0.08) !important;
        }
      `}</style>
    </ConfigProvider>
  );
}
