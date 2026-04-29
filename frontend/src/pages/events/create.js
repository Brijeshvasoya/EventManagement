import React, { useState } from 'react';
import { useMutation, useQuery, gql } from '@apollo/client';
import { CREATE_EVENT, GET_MY_VENDORS } from '@/features/events/graphql/queries';
import { Select, ConfigProvider, theme, Form, Input, InputNumber, Button, Divider, Typography, Space, Avatar } from 'antd';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import {
  PlusOutlined, DeleteOutlined, CalendarOutlined, EnvironmentOutlined,
  FileTextOutlined, PictureOutlined, RocketOutlined, DollarOutlined,
  TeamOutlined, ThunderboltOutlined, CheckCircleOutlined, InfoCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const BASIC_PLAN_LIMIT = 5;

const GET_MY_EVENTS_COUNT = gql`
  query GetMyEventsCount {
    myEvents { id }
  }
`;

export default function CreateEvent() {
  const { user } = useAuth();
  const router = useRouter();
  const [form] = Form.useForm();

  const [createEvent, { loading }] = useMutation(CREATE_EVENT);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiImageLoading, setAiImageLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState('');

  const isBasicPlan = user?.role === 'ORGANIZER' && user?.planId === 'BASIC';

  const { data: myEventsData } = useQuery(GET_MY_EVENTS_COUNT, {
    fetchPolicy: 'cache-and-network',
    skip: !isBasicPlan
  });

  const { data: vendorData, loading: vendorLoading } = useQuery(GET_MY_VENDORS, {
    fetchPolicy: 'cache-and-network',
    skip: !user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')
  });

  const eventCount = myEventsData?.myEvents?.length ?? 0;
  const isLimitReached = isBasicPlan && eventCount >= BASIC_PLAN_LIMIT;

  if (!user || user.role === 'USER') {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', color: '#6b6b80' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
        <p style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Access Denied. You must be an Event Organizer.</p>
        <Link href="/" style={{ color: '#7c5cfc', fontWeight: 600, textDecoration: 'none' }}>← Go Back</Link>
      </div>
    );
  }

  const handleAIGenerate = async () => {
    const title = form.getFieldValue('title');
    const eventType = form.getFieldValue('eventType');
    if (!title) return toast.error("Please enter an event title first!");
    setAiLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ title, eventType })
      });
      const data = await res.json();
      if (data.description) {
        form.setFieldsValue({ description: data.description });
        toast.success("AI Content Generated! ✨");
      }
    } catch (err) {
      toast.error("AI service error.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIImageGenerate = async () => {
    const title = form.getFieldValue('title');
    const eventType = form.getFieldValue('eventType');
    if (!title) return toast.error("Please enter an event title first!");
    setAiImageLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ai/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ title, eventType })
      });
      const data = await res.json();
      if (data.imageUrl) {
        setPreviewImage(data.imageUrl);
        toast.success("AI Poster Generated! 🎨");
      }
    } catch (err) {
      toast.error("AI image service error.");
    } finally {
      setAiImageLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const onFinish = async (values) => {
    let finalImageUrl = previewImage;

    if (imageFile) {
      const formData = new FormData();
      formData.append('image', imageFile);
      toast.loading('Uploading media...', { id: 'publish' });
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        const data = await res.json();
        if (data.url) finalImageUrl = data.url;
      } catch (err) {
        toast.error('Upload failed.', { id: 'publish' });
        return;
      }
    }

    try {
      toast.loading('Publishing Event...', { id: 'publish' });
      const totalCapacity = values.ticketTypes.reduce((acc, curr) => acc + (curr.capacity || 0), 0);
      await createEvent({
        variables: {
          input: {
            ...values,
            imageUrl: finalImageUrl,
            capacity: totalCapacity
          }
        }
      });
      toast.success('Event Published! 🚀', { id: 'publish' });
      router.push('/my-events');
    } catch (err) {
      toast.error(err.message, { id: 'publish' });
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: 'rgb(67, 56, 202)',
          borderRadius: 16,
          fontFamily: "'Inter', sans-serif",
        }
      }}
    >
      <Head><title>Create Event | EventHub</title></Head>

      {/* Basic Plan Limit Banner */}
      {isBasicPlan && (
        <div style={{
          background: isLimitReached
            ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
            : 'linear-gradient(135deg, rgba(67,56,202,0.05) 0%, rgba(67,56,202,0.1) 100%)',
          border: `1px solid ${isLimitReached ? 'rgba(239,68,68,0.3)' : 'rgba(67,56,202,0.2)'}`,
          borderRadius: '16px',
          padding: '16px 24px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.5rem' }}>{isLimitReached ? '🚫' : '📊'}</span>
            <div>
              <div style={{
                fontWeight: 700,
                fontSize: '0.95rem',
                color: isLimitReached ? '#dc2626' : 'rgb(67,56,202)',
                marginBottom: '2px'
              }}>
                {isLimitReached
                  ? 'Basic Plan Limit Reached'
                  : `Basic Plan: ${eventCount} / ${BASIC_PLAN_LIMIT} Events Used`}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                {isLimitReached
                  ? 'You have used all 5 event slots. Upgrade to Pro for unlimited events.'
                  : `You can create ${BASIC_PLAN_LIMIT - eventCount} more event${BASIC_PLAN_LIMIT - eventCount !== 1 ? 's' : ''} on the Basic plan.`}
              </div>
            </div>
          </div>
          {isLimitReached && (
            <Button
              type="primary"
              onClick={() => router.push('/plans')}
              style={{
                background: 'linear-gradient(135deg, #1B2A4E 0%, #312E81 100%)',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                height: '40px',
                paddingInline: '20px'
              }}
            >
              🚀 Upgrade to Pro
            </Button>
          )}
        </div>
      )}

      <div style={{ opacity: isLimitReached ? 0.5 : 1, pointerEvents: isLimitReached ? 'none' : 'auto' }}>

        {/* Top Header Card (Matching Profile - Compact) */}
        <div className="header-responsive" style={{
          background: 'white',
          borderRadius: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          border: '1px solid rgba(67, 56, 202, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ position: 'relative' }}>
              <Avatar size={70} icon={<RocketOutlined />} style={{
                background: 'linear-gradient(135deg, #1B2A4E 0%, #312E81 100%)',
                fontSize: '28px',
                boxShadow: '0 8px 16px rgba(27, 42, 78, 0.15)'
              }} />
              <div style={{
                position: 'absolute', bottom: 2, right: 2,
                width: '18px', height: '18px', background: '#10B981',
                borderRadius: '50%', border: '3px solid white'
              }}></div>
            </div>
            <div>
              <Title level={3} style={{ margin: 0, fontWeight: 900, color: '#1B2A4E', letterSpacing: '-0.5px' }}>Design Your Event</Title>
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <ThunderboltOutlined style={{ color: 'rgb(67, 56, 202)' }} /> Organizer Tools
                </span>
              </div>
            </div>
          </div>
          <Button
            type="primary"
            onClick={() => form.submit()}
            loading={loading}
            icon={<CheckCircleOutlined />}
            style={{
              height: '48px',
              borderRadius: '12px',
              fontWeight: 800,
              padding: '0 24px',
              background: 'linear-gradient(90deg, #1B2A4E 0%, #312E81 100%)',
              border: 'none',
              boxShadow: '0 8px 16px rgba(27, 42, 78, 0.12)'
            }}
          >
            PUBLISH EVENT
          </Button>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          size="middle"
          initialValues={{
            eventType: 'OTHER',
            ticketTypes: [{ name: 'REGULAR', price: 50, capacity: 100 }]
          }}
        >
          <div className="grid-cols-auto-380" style={{ gap: '20px', alignItems: 'stretch' }}>

            {/* Left Column: Details (Compact) */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{
                background: 'white',
                borderRadius: '24px',
                padding: '24px 32px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                border: '1px solid rgba(67, 56, 202, 0.08)',
                flex: 1
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <span style={{ color: '#1B2A4E', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.5px' }}>EVENT OVERVIEW</span>
                  <div style={{ flex: 1, height: '1px', background: '#F1F5F9' }}></div>
                </div>

                <Form.Item label="EVENT TITLE" name="title" rules={[{ required: true }]} style={{ marginBottom: '16px' }}>
                  <Input prefix={<FileTextOutlined style={{ color: '#94A3B8', marginRight: '4px' }} />} placeholder="e.g. Next.js Conf 2024" style={{ borderRadius: '10px' }} />
                </Form.Item>

                <Form.Item label="EVENT CATEGORY" name="eventType" rules={[{ required: true }]} style={{ marginBottom: '16px' }}>
                  <Select style={{ borderRadius: '10px' }}>
                    <Select.Option value="WEDDING">💍 Wedding</Select.Option>
                    <Select.Option value="CORPORATE">🏢 Corporate</Select.Option>
                    <Select.Option value="BIRTHDAY">🎂 Birthday</Select.Option>
                    <Select.Option value="SEMINAR">🎓 Seminar / Tech</Select.Option>
                    <Select.Option value="OTHER">🌟 Other</Select.Option>
                  </Select>
                </Form.Item>

                <div style={{ position: 'relative' }}>
                  <Form.Item label="DESCRIPTION" name="description" rules={[{ required: true }]} style={{ marginBottom: '16px' }}>
                    <Input.TextArea placeholder="Experience details..." rows={3} style={{ borderRadius: '10px' }} />
                  </Form.Item>
                  <Button
                    type="text"
                    onClick={handleAIGenerate}
                    loading={aiLoading}
                    style={{ position: 'absolute', top: 0, right: 0, fontWeight: 800, color: 'rgb(67, 56, 202)', fontSize: '0.65rem' }}
                  >
                    ✨ AI ASSIST
                  </Button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', marginBottom: '24px' }}>
                  <span style={{ color: '#1B2A4E', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.5px' }}>LOGISTICS</span>
                  <div style={{ flex: 1, height: '1px', background: '#F1F5F9' }}></div>
                </div>

                <div className="grid-cols-2" style={{ gap: '16px' }}>
                  <Form.Item label="DATE & TIME" name="date" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                    <Input type="datetime-local" style={{ borderRadius: '10px' }} />
                  </Form.Item>
                  <Form.Item label="LOCATION" name="location" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                    <Input prefix={<EnvironmentOutlined style={{ color: '#94A3B8', marginRight: '4px' }} />} placeholder="Venue" style={{ borderRadius: '10px' }} />
                  </Form.Item>
                </div>
              </div>
            </div>

            {/* Right Column: Media & Tickets (Compact) */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{
                background: 'white',
                borderRadius: '24px',
                padding: '24px 32px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                border: '1px solid rgba(67, 56, 202, 0.08)',
                flex: 1
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <span style={{ color: '#1B2A4E', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.5px' }}>MEDIA</span>
                  <div style={{ flex: 1, height: '1px', background: '#F1F5F9' }}></div>
                  <Button type="text" onClick={handleAIImageGenerate} loading={aiImageLoading} style={{ fontWeight: 800, color: 'rgb(67, 56, 202)', fontSize: '0.65rem' }}>
                    🎨 AI POSTER
                  </Button>
                </div>

                <div style={{
                  border: '2px dashed #E2E8F0', borderRadius: '16px', padding: '16px', textAlign: 'center', background: '#F8FAFC',
                  minHeight: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden'
                }}>
                  {previewImage ? (
                    <div style={{ position: 'relative' }}>
                      <img src={previewImage} style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', borderRadius: '12px' }} />
                      <Button
                        type="primary" danger size="small"
                        style={{ position: 'absolute', top: 8, right: 8, borderRadius: '6px', fontWeight: 800, fontSize: '0.7rem' }}
                        onClick={() => { setPreviewImage(''); setImageFile(null); }}
                      >
                        CHANGE
                      </Button>
                    </div>
                  ) : (
                    <>
                      <PictureOutlined style={{ fontSize: '1.8rem', color: '#CBD5E1', marginBottom: '8px' }} />
                      <input type="file" accept="image/*" onChange={handleImageUpload} id="media-upload" style={{ display: 'none' }} />
                      <label htmlFor="media-upload">
                        <Button type="default" size="small" style={{ borderRadius: '8px', fontWeight: 800, color: '#1B2A4E', fontSize: '0.75rem' }}>UPLOAD IMAGE</Button>
                      </label>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', marginTop: '20px' }}>
                  <span style={{ color: '#1B2A4E', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.5px' }}>TICKETING & NETWORK</span>
                  <div style={{ flex: 1, height: '1px', background: '#F1F5F9' }}></div>
                </div>

                <Form.List name="ticketTypes">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...restField }) => (
                        <div key={key} className="grid-cols-ticket-split" style={{ gap: '8px', marginBottom: '12px', alignItems: 'end', background: '#F8FAFC', padding: '12px', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
                          <Form.Item {...restField} name={[name, 'name']} label="TIER" style={{ marginBottom: 0 }}>
                            <Input placeholder="VIP" style={{ borderRadius: '8px', fontSize: '0.85rem' }} />
                          </Form.Item>
                          <Form.Item {...restField} name={[name, 'price']} label="PRICE" style={{ marginBottom: 0 }}>
                            <InputNumber min={0} style={{ width: '100%', borderRadius: '8px', fontSize: '0.85rem' }} />
                          </Form.Item>
                          <Form.Item {...restField} name={[name, 'capacity']} label="QTY" style={{ marginBottom: 0 }}>
                            <InputNumber min={1} style={{ width: '100%', borderRadius: '8px', fontSize: '0.85rem' }} />
                          </Form.Item>
                          {fields.length > 1 && (
                            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} style={{ marginBottom: '2px' }} />
                          )}
                        </div>
                      ))}
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} style={{ borderRadius: '10px', height: '40px', marginTop: '4px', fontWeight: 700, color: '#64748B', fontSize: '0.8rem' }}>
                        ADD NEW TIER
                      </Button>
                    </>
                  )}
                </Form.List>

                <Form.Item label="ASSIGN VENDORS" name="vendorIds" style={{ marginTop: '20px', marginBottom: 0 }}>
                  <Select mode="multiple" placeholder="Link partners" loading={vendorLoading} style={{ borderRadius: '10px' }}>
                    {vendorData?.myVendors?.map(v => (
                      <Select.Option key={v.id} value={v.id}>{v.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>
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
          text-transform: uppercase !important;
        }
        .ant-input, .ant-input-number, .ant-select-selector, .ant-input-password {
          border-radius: 12px !important;
          border-color: #E2E8F0 !important;
          background: #F8FAFC !important;
          transition: all 0.2s ease !important;
        }
        .ant-input:focus, .ant-input-focused, .ant-select-selector:focus, .ant-input-number:focus {
          border-color: rgb(67, 56, 202) !important;
          box-shadow: 0 0 0 4px rgba(67, 56, 202, 0.08) !important;
          background: white !important;
        }
        .ant-divider-inner-text {
           background: white !important;
        }
      `}</style>
    </ConfigProvider>
  );
}
