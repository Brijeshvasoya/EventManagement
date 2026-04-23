import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_MY_EVENTS, GET_MY_VENDORS, DELETE_EVENT, UPDATE_EVENT } from '@/features/events/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import Head from 'next/head';
import { Tag, Button, Empty, Row, Col, Space, Badge, Popconfirm, Modal, Form, Input, Select, DatePicker, Upload, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined, ProjectOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

export default function MyEvents() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [previewImage, setPreviewImage] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [editVendorIds, setEditVendorIds] = useState([]);
  const [aiImageLoading, setAiImageLoading] = useState(false);
  const [editForm] = Form.useForm();

  const { data, loading, refetch } = useQuery(GET_MY_EVENTS, {
    fetchPolicy: 'cache-and-network',
    skip: !user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')
  });

  const { data: vendorData, loading: vendorLoading } = useQuery(GET_MY_VENDORS, {
    skip: !user || user.role === 'USER'
  });

  const [deleteEvent] = useMutation(DELETE_EVENT);
  const [updateEvent, { loading: updating }] = useMutation(UPDATE_EVENT);

  if (authLoading || loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px',
        background: 'var(--gradient-main)', animation: 'pulse-glow 2s ease-in-out infinite',
      }} />
    </div>
  );

  const events = data?.myEvents || [];

  const handleEditOpen = (event, e) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setPreviewImage(event.imageUrl);
    setEditVendorIds(event.vendors?.map(v => v.id) || []);
    editForm.setFieldsValue({
        title: event.title,
        description: event.description,
        location: event.location,
        date: dayjs(parseInt(event.date) || event.date),
        eventType: event.eventType
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
        await deleteEvent({ variables: { id } });
        toast.success('Event deleted successfully');
        refetch();
    } catch (err) {
        toast.error(err.message);
    }
  };

  const handleAIImageGenerate = async () => {
      const title = editForm.getFieldValue('title');
      const eventType = editForm.getFieldValue('eventType');

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
          toast.error("AI image service is currently unavailable.");
      } finally {
          setAiImageLoading(false);
      }
  };

  const handleFileChange = (info) => {
      const file = info.file.originFileObj || info.file;
      if (file) {
          setImageFile(file);
          const reader = new FileReader();
          reader.onloadend = () => setPreviewImage(reader.result);
          reader.readAsDataURL(file);
      }
  };

  const handleUpdateSubmit = async (values) => {
      let finalImageUrl = previewImage;

      if (imageFile) {
          const formData = new FormData();
          formData.append('image', imageFile);
          toast.loading('Uploading media to Cloudinary...', { id: 'update' });
          try {
              const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/upload`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                  body: formData
              });
              const data = await res.json();
              if (data.url) {
                  finalImageUrl = data.url;
                  toast.success('Media secured!', { id: 'update' });
              } else {
                  throw new Error("Missing URL from upload handler.");
              }
          } catch (err) {
              toast.error('Image upload failed. Cannot publish updates.', { id: 'update' });
              return;
          }
      } else {
          toast.loading('Updating Event...', { id: 'update' });
      }

      try {
          const eventId = typeof selectedEvent.id === 'object' ? selectedEvent.id._id : selectedEvent.id;
          await updateEvent({
              variables: {
                  id: eventId,
                  input: {
                      ...values,
                      date: values.date.toISOString(),
                      imageUrl: finalImageUrl,
                      capacity: selectedEvent.capacity,
                      vendorIds: editVendorIds
                  }
              }
          });
          toast.success('Event Updated Successfully!', { id: 'update' });
          setIsEditModalOpen(false);
          setImageFile(null);
          refetch();
      } catch (e) {
          toast.error(e.message, { id: 'update' });
      }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <Head><title>My Events | EventHub</title></Head>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '40px', background: 'linear-gradient(135deg, #1B2A4E 0%, #312E81 50%, #4338CA 100%)', borderRadius: '24px', boxShadow: '0 20px 40px rgba(49, 46, 129, 0.2)', color: 'white' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', fontWeight: 900, fontSize: '2.5rem', letterSpacing: '-0.5px' }}>Event Portfolio</h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem' }}>Manage all the experiences you are bringing to life.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Button type="primary" onClick={() => router.push('/events/create')} icon={<PlusOutlined />} style={{ background: '#F047E7', border: 'none', height: '48px', borderRadius: '100px', fontWeight: 700, padding: '0 32px', boxShadow: '0 4px 12px rgba(240, 71, 231, 0.3)' }}>
            Create New Event
          </Button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#1B2A4E', fontWeight: 800, fontSize: '1.4rem' }}>{events.length} Events Total</h3>
      </div>

      {events.length === 0 ? (
        <div style={{ padding: '60px 40px', textAlign: 'center', background: '#FFF', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px dashed #E5E7EB' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px', opacity: 0.5 }}>🎪</div>
          <h3 style={{ color: '#1B2A4E', fontWeight: 800, fontSize: '1.5rem', marginBottom: '8px' }}>No events hosted yet</h3>
          <p style={{ color: '#6B7280', fontWeight: 600, fontSize: '1rem', marginBottom: '24px' }}>Ready to create your first unforgettable experience?</p>
          <Button type="primary" onClick={() => router.push('/events/create')} style={{ background: '#F047E7', borderRadius: '100px', padding: '0 32px', fontWeight: 700, height: '48px', border: 'none' }}>Start Creating</Button>
        </div>
      ) : (
        <Row gutter={[24, 24]}>
          {events.map(event => (
            <Col xs={24} lg={12} key={event.id}>
              <div className="hover-bounce premium-event-card" onClick={() => router.push(`/events/${event.id}`)} style={{ cursor: 'pointer', display: 'flex', background: '#FFF', borderRadius: '24px', border: '1px solid #F3F4F6', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', overflow: 'hidden', height: '100%', position: 'relative' }}>
                <div style={{ width: '180px', flexShrink: 0, background: `url(${event.imageUrl || '/event-placeholder.jpg'}) center/cover`, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 12, left: 12 }}>
                    <Badge count={event.status === 'DRAFT' ? 'Draft' : 'Live'} color={event.status === 'DRAFT' ? '#9CA3AF' : '#10B981'} style={{ fontWeight: 800 }} />
                  </div>
                </div>
                <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, color: '#1B2A4E', fontWeight: 800, fontSize: '1.2rem', lineHeight: 1.3 }}>{event.title}</h3>
                    <Tag color="cyan" style={{ border: 'none', borderRadius: '8px', fontWeight: 700, margin: 0 }}>{event.eventType}</Tag>
                  </div>
                  <p style={{ color: '#6B7280', margin: '0 0 16px 0', fontSize: '0.9rem', flex: 1 }}>{dayjs(parseInt(event.date) || event.date).format('MMM D, YYYY')}</p>
                  
                  <div style={{ display: 'flex', gap: '20px', borderTop: '1px solid #F3F4F6', paddingTop: '16px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>Attendees</div>
                      <div style={{ fontWeight: 800, color: '#1B2A4E', fontSize: '1.1rem' }}>{event.bookedCount || 0} <span style={{ color: '#9CA3AF', fontSize: '0.9rem', fontWeight: 500 }}>/ {event.capacity}</span></div>
                    </div>
                    <Space size="small" onClick={e => e.stopPropagation()}>
                      <Tooltip title="View Details">
                        <Button icon={<EyeOutlined />} shape="circle" onClick={() => router.push(`/events/${event.id}`)} style={{ background: '#F8F9FB', border: '1px solid #E5E7EB', color: '#6B7280' }} />
                      </Tooltip>
                      <Tooltip title="Edit Event">
                        <Button icon={<EditOutlined />} shape="circle" onClick={(e) => handleEditOpen(event, e)} style={{ background: '#Fdf2fe', border: '1px solid #F047E7', color: '#F047E7' }} />
                      </Tooltip>
                      <Popconfirm title="Are you sure you want to delete this event?" onConfirm={(e) => handleDelete(event.id, e)} onCancel={e => e.stopPropagation()}>
                        <Button icon={<DeleteOutlined />} shape="circle" onClick={e => e.stopPropagation()} danger style={{ background: '#FEF2F2', border: '1px solid #EF4444' }} />
                      </Popconfirm>
                    </Space>
                  </div>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      )}

      {/* EDIT EVENT MODAL */}
      <Modal
          title={<h3 style={{ margin: '0 0 5px 0', fontSize: '1.5rem', fontWeight: '800', color: '#1B2A4E' }}>Edit Your Event</h3>}
          open={isEditModalOpen}
          onCancel={() => setIsEditModalOpen(false)}
          footer={null}
          centered
          width={720}
          styles={{ body: { padding: '12px 24px 24px' } }}
      >
          <p style={{ margin: '0 0 1.5rem 0', color: '#6B7280', fontSize: '1rem' }}>Update your exclusive event details below.</p>

          <Form form={editForm} layout="vertical" onFinish={handleUpdateSubmit} requiredMark={false}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <Form.Item name="title" label={<label style={{ fontWeight: '700', color: '#4B5563', fontSize: '0.9rem' }}>Event Title *</label>} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                      <Input size="large" placeholder="e.g. Dream Music Festival" style={{ borderRadius: '12px' }} />
                  </Form.Item>

                  <Form.Item name="eventType" label={<label style={{ fontWeight: '700', color: '#4B5563', fontSize: '0.9rem' }}>Event Type *</label>} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                      <Select size="large" style={{ borderRadius: '12px' }}>
                          <Select.Option value="WEDDING">Wedding</Select.Option>
                          <Select.Option value="CORPORATE">Corporate</Select.Option>
                          <Select.Option value="BIRTHDAY">Birthday</Select.Option>
                          <Select.Option value="SEMINAR">Seminar / Tech</Select.Option>
                          <Select.Option value="OTHER">Other</Select.Option>
                      </Select>
                  </Form.Item>
              </div>

              <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontWeight: '700', color: '#4B5563', fontSize: '0.9rem' }}>Event Cover Image *</label>
                      <Button type="text" size="small" onClick={handleAIImageGenerate} loading={aiImageLoading} style={{ color: '#F047E7', fontSize: '0.85rem', fontWeight: 800 }}>
                          {aiImageLoading ? '✨ Generating...' : '✨ Auto-Generate via AI'}
                      </Button>
                  </div>
                  <div style={{ border: '2px dashed #E5E7EB', borderRadius: '16px', padding: '16px', textAlign: 'center', background: '#F9FAFB', transition: 'all 0.3s ease' }}>
                      {previewImage ? (
                          <div style={{ position: 'relative' }}>
                              <img src={previewImage} crossOrigin="anonymous" referrerPolicy="no-referrer" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '12px', marginBottom: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} alt="Preview" />
                              <div
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setPreviewImage('');
                                      if (typeof setImageFile !== 'undefined') setImageFile(null);
                                  }}
                                  style={{
                                      position: 'absolute',
                                      top: '10px',
                                      right: '10px',
                                      width: '32px',
                                      height: '32px',
                                      background: 'rgba(255, 0, 110, 0.9)',
                                      color: 'white',
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      boxShadow: '0 4px 12px rgba(255,0,110,0.4)',
                                      transition: 'all 0.2s',
                                  }}
                                  title="Remove Image"
                                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                              >
                                  ✕
                              </div>
                          </div>
                      ) : (
                          <div style={{ padding: '30px', color: '#9CA3AF' }}>📸 No image uploaded yet</div>
                      )}
                      <Upload beforeUpload={() => false} onChange={handleFileChange} showUploadList={false}>
                          <Button icon={<UploadOutlined />} style={{ borderRadius: '100px', fontWeight: 600 }}>Upload New Artwork</Button>
                      </Upload>
                  </div>
              </div>

              <Form.Item name="description" label={<label style={{ fontWeight: '700', color: '#4B5563', fontSize: '0.9rem' }}>Description *</label>} rules={[{ required: true }]} style={{ marginBottom: '16px' }}>
                  <Input.TextArea rows={4} placeholder="What makes this event special?" style={{ borderRadius: '12px' }} />
              </Form.Item>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  <Form.Item name="date" label={<label style={{ fontWeight: '700', color: '#4B5563', fontSize: '0.9rem' }}>Date & Time *</label>} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                      <DatePicker size="large" showTime style={{ width: '100%', borderRadius: '12px' }} />
                  </Form.Item>
                  <Form.Item name="location" label={<label style={{ fontWeight: '700', color: '#4B5563', fontSize: '0.9rem' }}>Location / Venue *</label>} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                      <Input size="large" placeholder="Venue Address or Zoom Link" style={{ borderRadius: '12px' }} />
                  </Form.Item>
              </div>

              <div style={{ marginBottom: '32px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', color: '#4B5563', fontSize: '0.9rem' }}>Assigned Vendors</label>
                  <Select
                      mode="multiple"
                      allowClear
                      size="large"
                      style={{ width: '100%' }}
                      placeholder="Attach vendors to this event..."
                      value={editVendorIds}
                      onChange={setEditVendorIds}
                      loading={vendorLoading}
                  >
                      {vendorData?.myVendors?.map(v => (
                          <Select.Option key={v.id} value={v.id}>
                              <span style={{ fontWeight: 600 }}>{v.name}</span> <span style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>— {v.category}</span>
                          </Select.Option>
                      ))}
                  </Select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #F3F4F6', paddingTop: '24px' }}>
                  <Button size="large" onClick={() => setIsEditModalOpen(false)} style={{ borderRadius: '12px', fontWeight: 700 }}>Discard</Button>
                  <Button type="primary" htmlType="submit" size="large" loading={updating} style={{ background: '#F047E7', borderRadius: '12px', fontWeight: 700, border: 'none', boxShadow: '0 4px 12px rgba(240, 71, 231, 0.3)' }}>
                      Save Changes
                  </Button>
              </div>
          </Form>
      </Modal>

    </div>
  );
}
