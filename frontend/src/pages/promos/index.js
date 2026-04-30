import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_MY_PROMO_CODES, DELETE_PROMO_CODE, UPDATE_PROMO_CODE, GET_MY_EVENTS } from '@/features/events/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Table, Tag, Card, Row, Col, Button, Modal,
  Form, Input, InputNumber, Select, DatePicker,
  Space, Typography, Popconfirm, Empty, Badge
} from 'antd';
import {
  RocketOutlined, PlusCircleOutlined, EditOutlined,
  DeleteOutlined, ArrowLeftOutlined, SearchOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

const { Title, Text: AntText } = Typography;

export default function PromosPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  const { data: promoData, loading: promoLoading, refetch } = useQuery(GET_MY_PROMO_CODES, {
    skip: !user || user.role !== 'ORGANIZER',
    fetchPolicy: 'cache-and-network'
  });

  const { data: eventsData } = useQuery(GET_MY_EVENTS, {
    skip: !user || user.role !== 'ORGANIZER'
  });

  const [deletePromo] = useMutation(DELETE_PROMO_CODE, {
    onCompleted: () => {
      toast.success('Promo code deleted!');
      refetch();
    }
  });

  const [updatePromo, { loading: updating }] = useMutation(UPDATE_PROMO_CODE, {
    onCompleted: () => {
      toast.success('Promo code updated!');
      setIsEditModalOpen(false);
      refetch();
    }
  });

  if (authLoading || promoLoading) return null;

  const handleEdit = (record) => {
    setEditingPromo(record);
    form.setFieldsValue({
      ...record,
      expiresAt: dayjs(isNaN(Number(record.expiresAt)) ? record.expiresAt : Number(record.expiresAt)),
      eventId: record.event?.id || 'ALL'
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateFinish = async (values) => {
    try {
      await updatePromo({
        variables: {
          id: editingPromo.id,
          input: {
            code: values.code.toUpperCase(),
            discountType: values.discountType,
            discountValue: parseFloat(values.discountValue),
            expiresAt: values.expiresAt.toISOString(),
            usageLimit: parseInt(values.usageLimit),
            eventId: values.eventId === 'ALL' ? null : values.eventId
          }
        }
      });
    } catch (e) {
      toast.error(e.message);
    }
  };

  const filteredPromos = (promoData?.myPromoCodes || []).filter(p =>
    p.code.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (text) => <AntText strong style={{ color: '#4338CA', letterSpacing: '1px' }}>{text}</AntText>
    },
    {
      title: 'Type',
      dataIndex: 'discountType',
      key: 'discountType',
      render: (type) => <Tag color={type === 'PERCENTAGE' ? 'purple' : 'blue'}>{type}</Tag>
    },
    {
      title: 'Value',
      key: 'value',
      render: (_, record) => (
        <AntText>{record.discountType === 'PERCENTAGE' ? `${record.discountValue}%` : `₹${record.discountValue}`}</AntText>
      )
    },
    {
      title: 'Usage',
      key: 'usage',
      render: (_, record) => (
        <AntText style={{ fontSize: '0.85rem' }}>{record.usageCount} / {record.usageLimit}</AntText>
      )
    },
    {
      title: 'Expires',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      render: (date) => dayjs(isNaN(Number(date)) ? date : Number(date)).format('MMM D, YYYY')
    },
    {
      title: 'Event',
      key: 'event',
      render: (_, record) => <AntText type="secondary" style={{ fontSize: '0.85rem' }}>{record.event?.title || 'All Events'}</AntText>
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => <Badge status={record.isActive ? "success" : "default"} text={record.isActive ? "Active" : "Inactive"} />
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="Delete this promo code?" onConfirm={() => deletePromo({ variables: { id: record.id } })}>
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <Head><title>Promo Management | EventHub</title></Head>

      <div className="header-responsive" style={{ 
        background: 'linear-gradient(135deg, #1B2A4E 0%, #312E81 50%, #4338CA 100%)', 
        borderRadius: '24px', 
        boxShadow: '0 20px 40px rgba(49, 46, 129, 0.2)', 
        color: 'white',
        padding: '32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', fontWeight: 900, fontSize: '2.5rem', color: 'white', letterSpacing: '-0.5px' }}>Campaign Portfolio</h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem' }}>Boost your event sales with exclusive discount strategies.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Button 
            type="primary" 
            onClick={() => router.push('/promo/create')} 
            icon={<PlusCircleOutlined />} 
            style={{ 
              background: 'linear-gradient(135deg, rgb(27, 42, 78) 0%, rgb(49, 46, 129) 50%, rgb(67, 56, 202) 100%)', 
              border: 'none', 
              height: '48px', 
              borderRadius: '100px', 
              fontWeight: 700, 
              padding: '0 32px', 
              boxShadow: '0 4px 12px rgba(27, 42, 78, 0.3)' 
            }}
          >
            Create New Promo
          </Button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#1B2A4E', fontWeight: 800, fontSize: '1.4rem' }}>{filteredPromos.length} Active Strategies</h3>
      </div>

      <Card
        styles={{ body: { padding: '24px' } }}
        style={{
          borderRadius: '24px',
          border: 'none',
          background: '#FFFFFF',
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ marginBottom: '24px' }}>
          <Input
            placeholder="Search by code name..."
            prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
            style={{ 
              width: '300px', 
              height: '45px', 
              borderRadius: '12px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0'
            }}
            onChange={e => setSearchText(e.target.value)}
          />
        </div>

        <div className="table-responsive">
          <Table
            dataSource={filteredPromos}
            columns={columns}
            rowKey="id"
            pagination={{ 
              pageSize: 8, 
              showSizeChanger: true,
              responsive: true,
              position: ['bottomCenter']
            }}
            className="premium-table"
            scroll={{ x: 800 }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No promo codes found" /> }}
          />
        </div>
      </Card>

      <Modal
        title={<Title level={3} style={{ margin: 0, color: '#1B2A4E', fontWeight: 800 }}>Edit Campaign</Title>}
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        footer={null}
        centered
        width={600}
        styles={{ content: { borderRadius: '28px', padding: 'clamp(16px, 4vw, 32px)' } }}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdateFinish} style={{ marginTop: '24px' }}>
          <Form.Item label={<AntText strong>Unique Promo Code</AntText>} name="code" rules={[{ required: true }]}>
            <Input size="large" style={{ borderRadius: '14px', height: '54px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', fontSize: '1.1rem', border: '2px solid #F1F5F9' }} />
          </Form.Item>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item label={<AntText strong>Discount Logic</AntText>} name="discountType" rules={[{ required: true }]}>
                <Select size="large" style={{ height: '54px' }} className="custom-select">
                  <Select.Option value="PERCENTAGE">Percentage (%)</Select.Option>
                  <Select.Option value="FIXED">Fixed Amount (₹)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={<AntText strong>Value</AntText>} name="discountValue" rules={[{ required: true }]}>
                <InputNumber size="large" style={{ width: '100%', height: '54px', borderRadius: '14px', paddingTop: '8px' }} min={1} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label={<AntText strong>Applies To</AntText>} name="eventId">
            <Select size="large" style={{ height: '54px' }}>
              <Select.Option value="ALL">All Active Events</Select.Option>
              {eventsData?.myEvents?.map(e => (
                <Select.Option key={e.id} value={e.id}>{e.title}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item label={<AntText strong>Campaign Expiry</AntText>} name="expiresAt" rules={[{ required: true }]}>
                <DatePicker size="large" showTime style={{ width: '100%', height: '54px', borderRadius: '14px' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={<AntText strong>Total Usage Limit</AntText>} name="usageLimit" rules={[{ required: true }]}>
                <InputNumber size="large" style={{ width: '100%', height: '54px', borderRadius: '14px', paddingTop: '8px' }} min={1} />
              </Form.Item>
            </Col>
          </Row>

          <Button
            type="primary"
            htmlType="submit"
            loading={updating}
            block
            size="large"
            style={{
              marginTop: '32px',
              borderRadius: '18px',
              height: '60px',
              fontWeight: 800,
              fontSize: '1.1rem',
              background: 'linear-gradient(135deg, #1B2A4E 0%, #4338CA 100%)',
              border: 'none',
              boxShadow: '0 12px 24px rgba(67, 56, 202, 0.25)'
            }}
          >
            Update Campaign Strategy
          </Button>
        </Form>
      </Modal>

      <style jsx global>{`
        .premium-table .ant-table { background: transparent !important; }
        .premium-table .ant-table-thead > tr > th {
          background: #F8FAFC !important;
          color: #64748B !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          font-size: 0.75rem !important;
          letter-spacing: 0.05em !important;
          border-bottom: 2px solid #F1F5F9 !important;
        }
        .premium-table .ant-table-tbody > tr > td { 
          border-bottom: 1px solid #F1F5F9 !important; 
          padding: 20px 16px !important;
        }
        .premium-table .ant-table-row:hover > td { 
          background: rgba(67, 56, 202, 0.02) !important; 
        }
        .launch-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(0,0,0,0.15) !important;
        }
        @media (max-width: 576px) {
          .header-container { border-radius: 20px !important; margin-top: -10px; }
          .launch-btn { width: 100% !important; margin-top: 10px; }
          .search-input { width: 100% !important; }
        }
        .custom-select .ant-select-selector {
          border-radius: 14px !important;
          height: 54px !important;
          display: flex !important;
          align-items: center !important;
          border: 2px solid #F1F5F9 !important;
        }
      `}</style>
    </div>
  );
}
