import { useState } from 'react';
import { useRouter } from 'next/router';
import { useMutation, useQuery } from '@apollo/client/react';
import { CREATE_PROMO_CODE, GET_MY_EVENTS, GET_MY_PROMO_CODES } from '@/features/events/graphql/queries';
import Head from 'next/head';
import { Card, Form, Input, Button, Select, DatePicker, InputNumber, Typography, Space, Divider, Row, Col, ConfigProvider, Avatar } from 'antd';
import { RocketOutlined, ArrowLeftOutlined, PercentageOutlined, DollarOutlined, ThunderboltOutlined, InfoCircleOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';

const { Title, Text: AntText } = Typography;

export default function CreatePromoPage() {
  const router = useRouter();
  const [form] = Form.useForm();

  const { data: eventsData } = useQuery(GET_MY_EVENTS);
  const [createPromo, { loading }] = useMutation(CREATE_PROMO_CODE, {
    refetchQueries: [{ query: GET_MY_PROMO_CODES }]
  });

  const onFinish = async (values) => {
    try {
      await createPromo({
        variables: {
          input: {
            code: values.code.toUpperCase(),
            discountType: values.discountType,
            discountValue: parseFloat(values.discountValue),
            expiresAt: values.expiresAt.toISOString(),
            usageLimit: parseInt(values.usageLimit) || 100,
            eventId: values.eventId === 'ALL' ? null : values.eventId
          }
        }
      });
      toast.success('Promo code created successfully! 🚀');
      router.push('/dashboard');
    } catch (e) {
      toast.error(e.message);
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
      <Head><title>Launch Campaign | EventHub</title></Head>

      <div style={{ padding: '0 0 40px 0' }}>
        {/* Top Header Card (Matching Events Create Style) */}
        <div className="header-responsive" style={{
          background: 'white',
          borderRadius: '24px',
          marginBottom: '32px',
          padding: '24px 32px',
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
              <Title level={3} style={{ margin: 0, fontWeight: 900, color: '#1B2A4E', letterSpacing: '-0.5px' }}>Campaign Designer</Title>
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                  <ThunderboltOutlined style={{ color: 'rgb(67, 56, 202)' }} /> Growth Tools
                </span>
              </div>
            </div>
          </div>
          <Space>
            <Button
              size="large"
              onClick={() => router.push('/promos')}
              style={{ borderRadius: '12px', fontWeight: 700 }}
            >
              Discard
            </Button>
            <Button
              type="primary"
              onClick={() => form.submit()}
              loading={loading}
              icon={<RocketOutlined />}
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
              LAUNCH CAMPAIGN
            </Button>
          </Space>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          size="large"
          initialValues={{
            discountType: 'PERCENTAGE',
            usageLimit: 100,
            eventId: 'ALL'
          }}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
            gap: '24px'
          }}>
            {/* Left Column: Details */}
            <div style={{
              background: 'white',
              borderRadius: '24px',
              padding: '32px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
              border: '1px solid rgba(67, 56, 202, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                <span style={{ color: '#1B2A4E', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.5px' }}>CAMPAIGN BASICS</span>
                <div style={{ flex: 1, height: '1px', background: '#F1F5F9' }}></div>
              </div>

              <Form.Item
                label="PROMO CODE"
                name="code"
                rules={[{ required: true, message: 'Code is required' }]}
                style={{ marginBottom: '24px' }}
              >
                <Input
                  placeholder="e.g. SUMMERFEST50"
                  style={{ borderRadius: '12px', height: '56px', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px' }}
                />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="DISCOUNT TYPE" name="discountType" rules={[{ required: true }]}>
                    <Select style={{ borderRadius: '12px', height: '56px' }}>
                      <Select.Option value="PERCENTAGE">Percentage (%)</Select.Option>
                      <Select.Option value="FIXED">Fixed Amount (₹)</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="VALUE" name="discountValue" rules={[{ required: true }]}>
                    <InputNumber min={1} style={{ width: '100%', borderRadius: '12px', height: '56px', paddingTop: '10px' }} />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            {/* Right Column: Rules */}
            <div style={{
              background: 'white',
              borderRadius: '24px',
              padding: '32px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
              border: '1px solid rgba(67, 56, 202, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                <span style={{ color: '#1B2A4E', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.5px' }}>STRATEGY RULES</span>
                <div style={{ flex: 1, height: '1px', background: '#F1F5F9' }}></div>
              </div>

              <Form.Item label="APPLICABLE EVENT" name="eventId" style={{ marginBottom: '24px' }}>
                <Select style={{ borderRadius: '12px', height: '56px' }}>
                  <Select.Option value="ALL">All Active Events</Select.Option>
                  {eventsData?.myEvents?.map(e => (
                    <Select.Option key={e.id} value={e.id}>{e.title}</Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="EXPIRY DATE" name="expiresAt" rules={[{ required: true }]}>
                    <DatePicker showTime style={{ width: '100%', borderRadius: '12px', height: '56px' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="USAGE LIMIT" name="usageLimit">
                    <InputNumber min={1} style={{ width: '100%', borderRadius: '12px', height: '56px', paddingTop: '10px' }} />
                  </Form.Item>
                </Col>
              </Row>

              <div style={{ marginTop: '12px', padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
                <AntText type="secondary" style={{ fontSize: '0.85rem' }}>
                  <InfoCircleOutlined style={{ color: '#4338CA', marginRight: '8px' }} />
                  This code will automatically deactivate once the usage limit is reached or the expiry date passes.
                </AntText>
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
        .ant-input, .ant-input-number, .ant-select-selector, .ant-picker {
          border-radius: 12px !important;
          border-color: #E2E8F0 !important;
          background: #F8FAFC !important;
        }
        .ant-input:focus, .ant-input-focused, .ant-select-selector:focus, .ant-picker-focused {
          border-color: rgb(67, 56, 202) !important;
          box-shadow: 0 0 0 4px rgba(67, 56, 202, 0.08) !important;
          background: white !important;
        }
      `}</style>
    </ConfigProvider>
  );
}
