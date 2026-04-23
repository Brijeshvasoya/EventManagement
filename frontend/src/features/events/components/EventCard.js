import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Modal, Button, Popconfirm, Form, Input, DatePicker, Select, InputNumber, Space, Divider, Progress, Badge, Tag, Upload } from 'antd';
import { EditOutlined, DeleteOutlined, ShoppingCartOutlined, UserOutlined, PlusOutlined, DeleteFilled, InboxOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const EventCard = React.memo(({ event, onBook, onDelete, onUpdate }) => {
  const { user } = useAuth();
  const dateObj = new Date(parseInt(event.date) || event.date);
  
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isBookModalVisible, setIsBookModalVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [bookForm] = Form.useForm();
  const [isDirty, setIsDirty] = useState(false);
  const [imageUrl, setImageUrl] = useState(event.imageUrl || '');

  const fallbackImg = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop';

  const handleEditClick = () => {
    setImageUrl(event.imageUrl || '');
    editForm.setFieldsValue({
      title: event.title,
      description: event.description,
      location: event.location,
      eventType: event.eventType || 'OTHER',
      date: dayjs(dateObj),
      ticketTypes: event.ticketTypes?.map(t => ({ name: t.name, price: t.price, capacity: t.capacity })) || [{ name: 'REGULAR', price: 50, capacity: 100 }]
    });
    setIsDirty(false);
    setIsEditModalVisible(true);
  };

  const handleUpdateSubmit = async (values) => {
    const totalCapacity = values.ticketTypes.reduce((acc, curr) => acc + (curr.capacity || 0), 0);
    const input = {
      title: values.title,
      description: values.description,
      location: values.location,
      eventType: values.eventType,
      date: values.date.toISOString(),
      capacity: totalCapacity,
      imageUrl: imageUrl,
      ticketTypes: values.ticketTypes.map(t => ({ name: t.name, price: Number(t.price), capacity: Number(t.capacity) }))
    };
    await onUpdate(input);
    setIsEditModalVisible(false);
  };

  const handleImageChange = (info) => {
    const file = info.file.originFileObj;
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result);
        setIsDirty(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBookSubmit = async (values) => {
    await onBook(values.ticketType, values.quantity);
    setIsBookModalVisible(false);
  };

  const ticketTypes = event.ticketTypes || [{ name: 'REGULAR', price: 50 }];
  const selectedTicketName = Form.useWatch('ticketType', bookForm);
  const selectedQuantity = Form.useWatch('quantity', bookForm) || 1;
  const currentTicket = ticketTypes.find(t => t.name === selectedTicketName) || ticketTypes[0];

  const bookedCount = event.bookedCount || 0;
  const remainingCount = Math.max(0, event.capacity - bookedCount);
  const percentFilled = Math.min(100, Math.round((bookedCount / event.capacity) * 100));

  return (
    <>
      <Badge.Ribbon text={remainingCount > 0 ? `${remainingCount} Left` : "Sold Out"} color={remainingCount > 0 ? "#4F46E5" : "#F43F5E"}>
        <div className="event-card">
          <div style={{
            margin: '-2rem -2rem 1.5rem -2rem',
            height: '200px',
            background: `url(${event.imageUrl || fallbackImg}) center/cover no-repeat`,
            borderRadius: '20px 20px 0 0'
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h2 style={{ margin: 0 }}>{event.title}</h2>
              <Tag color="blue">{event.eventType}</Tag>
          </div>
          <div className="event-meta">
            {dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric'})} • {event.location}
          </div>
          <p className="event-desc">{event.description.length > 100 ? event.description.substring(0, 100) + '...' : event.description}</p>
          
          <div style={{ margin: '1rem 0' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#6B7280', marginBottom: '4px' }}>
                <span>Inventory Space</span>
                <span>{bookedCount} / {event.capacity} Booked</span>
             </div>
             <Progress percent={percentFilled} strokeColor="#4F46E5" showInfo={false} size="small" />
          </div>

          <div className="event-footer">
            <span className="organizer-badge"><UserOutlined /> {event.organizer.name}</span>
            
            {user?.id === event.organizer.id ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                 <Button type="default" icon={<EditOutlined />} onClick={handleEditClick} />
                 <Popconfirm 
                    title="Delete Event" 
                    description="Are you absolutely sure you want to delete this event?"
                    onConfirm={onDelete}
                    okText="Yes"
                    cancelText="No"
                 >
                   <Button danger icon={<DeleteOutlined />} />
                 </Popconfirm>
              </div>
            ) : user ? (
              <div>
                {event.isBooked ? (
                  <Button disabled type="primary" style={{ background: '#10B981', borderColor: '#10B981' }}>✓ Booked</Button>
                ) : (
                  <Button type="primary" disabled={remainingCount <= 0} icon={<ShoppingCartOutlined />} onClick={() => setIsBookModalVisible(true)}>
                    {remainingCount > 0 ? "Book Ticket" : "Sold Out"}
                  </Button>
                )}
              </div>
            ) : (
              <span className="text-muted" style={{fontSize: '0.9rem'}}>Login to book</span>
            )}
          </div>
        </div>
      </Badge.Ribbon>

      {/* Booking Modal */}
      <Modal
        title={<div><ShoppingCartOutlined style={{ marginRight: '8px' }} /> Confirm Your Reservation</div>}
        open={isBookModalVisible}
        onCancel={() => setIsBookModalVisible(false)}
        footer={null}
      >
        <p style={{ color: '#6B7280', marginBottom: '24px' }}>Choose your ticket tier and quantity for <strong>{event.title}</strong>.</p>
        
        <Form 
            form={bookForm} 
            layout="vertical" 
            onFinish={handleBookSubmit}
            initialValues={{ ticketType: ticketTypes[0]?.name, quantity: 1 }}
        >
          <Form.Item name="ticketType" label="Select Ticket Tier" rules={[{ required: true }]}>
             <Select size="large">
               {ticketTypes.map(t => (
                 <Select.Option key={t.name} value={t.name}>
                   {t.name} - ${Number(t.price).toLocaleString()}
                 </Select.Option>
               ))}
             </Select>
          </Form.Item>

          <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}>
             <InputNumber min={1} max={Math.min(10, remainingCount)} size="large" style={{ width: '100%' }} />
          </Form.Item>

          <Divider />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Total Amount:</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4F46E5' }}>
                ${((currentTicket?.price || 0) * selectedQuantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <Button type="primary" size="large" block htmlType="submit">
            Proceed to Secure Payment
          </Button>
        </Form>
      </Modal>

      {/* Edit Modal (Full Details) */}
      <Modal
        title="Edit Full Event Details"
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        width={800}
        footer={[
          <Button key="back" onClick={() => setIsEditModalVisible(false)}>Cancel</Button>,
          <Button key="submit" type="primary" disabled={!isDirty} onClick={() => editForm.submit()}>
            Save All Changes
          </Button>,
        ]}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateSubmit} onValuesChange={() => setIsDirty(true)}>
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
             <Form.Item name="title" label="Event Title" rules={[{required: true}]}>
               <Input />
             </Form.Item>
             <Form.Item name="eventType" label="Event Category">
               <Select>
                 <Select.Option value="WEDDING">Wedding</Select.Option>
                 <Select.Option value="CORPORATE">Corporate</Select.Option>
                 <Select.Option value="BIRTHDAY">Birthday</Select.Option>
                 <Select.Option value="SEMINAR">Seminar</Select.Option>
                 <Select.Option value="OTHER">Other</Select.Option>
               </Select>
             </Form.Item>
           </div>

           <Form.Item label="Event Image">
              <Upload.Dragger 
                multiple={false} 
                showUploadList={false} 
                onChange={handleImageChange}
                style={{ background: '#F9FAFB', borderRadius: '8px' }}
              >
                {imageUrl ? (
                  <img src={imageUrl} alt="Event" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px' }} />
                ) : (
                  <div>
                    <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                    <p className="ant-upload-text">Click or drag image to this area to upload</p>
                  </div>
                )}
              </Upload.Dragger>
           </Form.Item>

           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
             <Form.Item name="date" label="Date & Time" rules={[{required: true}]}>
               <DatePicker showTime style={{width: '100%'}} />
             </Form.Item>
             <Form.Item name="location" label="Location" rules={[{required: true}]}>
               <Input />
             </Form.Item>
           </div>

           <Form.Item name="description" label="Description" rules={[{required: true}]}>
             <Input.TextArea rows={3} />
           </Form.Item>

           <Divider titlePlacement="left" style={{ margin: '8px 0' }}>Ticket Tiers & Pricing</Divider>
           
           <Form.List name="ticketTypes">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'name']}
                      rules={[{ required: true, message: 'Missing tier/ticket name' }]}
                    >
                      <Input placeholder="Tier Name (e.g. VIP)" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'price']}
                      rules={[{ required: true, message: 'Missing price' }]}
                    >
                      <InputNumber placeholder="Price" prefix="$" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'capacity']}
                      rules={[{ required: true, message: 'Missing capacity' }]}
                    >
                      <InputNumber placeholder="Capacity" style={{ width: '100%' }} />
                    </Form.Item>
                    <DeleteFilled 
                        style={{ color: '#F43F5E', cursor: 'pointer' }} 
                        onClick={() => {
                            if(fields.length > 1) remove(name);
                            setIsDirty(true);
                        }} 
                    />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => { add(); setIsDirty(true); }} block icon={<PlusOutlined />}>
                    Add Ticket Tier
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </>
  );
});

EventCard.displayName = 'EventCard';
export default EventCard;
