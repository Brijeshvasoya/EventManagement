import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_MY_VENDORS, CREATE_VENDOR, UPDATE_VENDOR, DELETE_VENDOR, GET_MY_EVENTS } from '@/features/events/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import Head from 'next/head';
import { Table, Button, Modal, Form, Input, InputNumber, Select, Space, Tag, Spin, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ShopOutlined, PhoneOutlined, DollarOutlined, CalendarOutlined, SearchOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';

export default function VendorManagement() {
  const { user, loading: authLoading } = useAuth();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [form] = Form.useForm();

  const { data, loading, refetch } = useQuery(GET_MY_VENDORS, {
    fetchPolicy: 'cache-and-network',
    skip: !user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')
  });

  const { data: eventData } = useQuery(GET_MY_EVENTS, {
    fetchPolicy: 'cache-and-network',
    skip: !user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')
  });

  const [createVendor] = useMutation(CREATE_VENDOR);
  const [updateVendor] = useMutation(UPDATE_VENDOR);
  const [deleteVendor] = useMutation(DELETE_VENDOR);

  if (authLoading || loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
      <div style={{
        width: '48px', height: '48px',
        borderRadius: '12px',
        background: 'var(--gradient-main)',
        animation: 'pulse-glow 2s ease-in-out infinite',
        boxShadow: 'var(--shadow-glow)'
      }} />
      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading...</span>
    </div>
  );
  if (!user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')) return (
    <div style={{ textAlign: 'center', marginTop: '100px', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
      Unauthorized Access
    </div>
  );

  const vendors = (data?.myVendors || []).filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchText.toLowerCase()) || 
      v.contactInfo?.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || v.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleAdd = () => {
    setEditingVendor(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    form.setFieldsValue({
      ...vendor,
      eventIds: vendor.events?.map(e => e.id)
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteVendor({ variables: { id } });
      toast.success('Vendor deleted successfully');
      refetch();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingVendor) {
        await updateVendor({ variables: { id: editingVendor.id, input: values } });
        toast.success('Vendor updated successfully');
      } else {
        await createVendor({ variables: { input: values } });
        toast.success('Vendor created successfully');
      }
      setIsModalVisible(false);
      refetch();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const columns = [
    {
      title: 'Vendor Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{text}</span>,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category) => <Tag color="blue">{category}</Tag>,
    },
    {
      title: 'Assigned Events',
      dataIndex: 'events',
      key: 'events',
      render: (events) => (
        <Space size={[0, 4]} wrap>
          {events && events.length > 0 ? (
            events.map(e => <Tag key={e.id} color="purple"><CalendarOutlined /> {e.title}</Tag>)
          ) : (
            <Tag color="default">Unassigned</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Cost (INR)',
      dataIndex: 'cost',
      key: 'cost',
      render: (cost) => <span style={{ color: 'var(--secondary-color)', fontWeight: 'bold' }}>₹{cost}</span>,
    },
    {
      title: 'Contact Info',
      dataIndex: 'contactInfo',
      key: 'contactInfo',
      render: (info) => <span style={{ color: 'var(--text-secondary)' }}>{info}</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} style={{ borderRadius: '8px' }}>Edit</Button>
          <Popconfirm title="Delete this vendor?" onConfirm={() => handleDelete(record.id)}>
            <Button danger icon={<DeleteOutlined />} style={{ borderRadius: '8px' }}>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="mobile-pad-reduce" style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Head><title>Vendor Management | EventHub</title></Head>

      <div className="header-responsive" style={{ marginBottom: '2rem' }}>
        <div>
          <div style={{
            display: 'inline-block',
            padding: '5px 12px',
            background: 'rgba(255, 139, 61, 0.08)',
            border: '1px solid rgba(255, 139, 61, 0.15)',
            borderRadius: '100px',
            color: '#ff8b3d',
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            marginBottom: '12px'
          }}>
            🏪 Vendor Hub
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.5px' }}>
            Vendor Management
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
            Manage your event vendors and service providers
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Input
            placeholder="Search vendors..."
            prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: '220px', borderRadius: '12px', height: '44px' }}
            allowClear
          />
          <Select
            defaultValue="ALL"
            style={{ width: '160px', height: '44px' }}
            onChange={setCategoryFilter}
            options={[
              { value: 'ALL', label: 'All Categories' },
              { value: 'CATERING', label: 'Catering' },
              { value: 'DECORATION', label: 'Decoration' },
              { value: 'DJ', label: 'DJ' },
              { value: 'PHOTOGRAPHER', label: 'Photographer' },
              { value: 'OTHER', label: 'Other' },
            ]}
          />
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            style={{ borderRadius: '12px', height: '44px' }}
          >
            Add New Vendor
          </Button>
        </div>
      </div>

      <div className="table-responsive hover-bounce" style={{
        background: 'var(--card-bg)',
        borderRadius: '24px',
        overflow: 'hidden',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(20px)',
        boxShadow: 'var(--shadow-md)'
      }}>
        <Table
          dataSource={vendors}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
          style={{ background: 'transparent' }}
        />
      </div>

      <Modal
        title={
          <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            {editingVendor ? '✏️ Edit Vendor' : '➕ Add New Vendor'}
          </span>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        centered
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: '20px' }}>
          <Form.Item name="name" label="Vendor Name" rules={[{ required: true }]}>
            <Input prefix={<ShopOutlined />} placeholder="Vendor Name" style={{ borderRadius: '10px' }} />
          </Form.Item>

          <Form.Item name="category" label="Category" rules={[{ required: true }]}>
            <Select placeholder="Select Category">
              <Select.Option value="CATERING">Catering</Select.Option>
              <Select.Option value="DECORATION">Decoration</Select.Option>
              <Select.Option value="DJ">DJ</Select.Option>
              <Select.Option value="PHOTOGRAPHER">Photographer</Select.Option>
              <Select.Option value="OTHER">Other</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="eventIds" label="Assign to Events">
            <Select mode="multiple" placeholder="Select Events (Optional)" allowClear style={{ width: '100%' }}>
              {eventData?.myEvents.map(e => (
                <Select.Option key={e.id} value={e.id}>{e.title}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="cost" label="Standard Cost" rules={[{ required: true }]}>
            <InputNumber
              prefix={<DollarOutlined />}
              style={{ width: '100%' }}
              placeholder="Price in USD"
              formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item name="contactInfo" label="Contact Details">
            <Input.TextArea prefix={<PhoneOutlined />} placeholder="Phone, Email, or Address" rows={3} style={{ borderRadius: '10px' }} />
          </Form.Item>

          <Button type="primary" htmlType="submit" size="large" block style={{ marginTop: '10px', height: '48px', borderRadius: '12px' }}>
            {editingVendor ? 'Update Vendor' : 'Create Vendor'}
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
