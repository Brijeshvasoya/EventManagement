import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_MY_SUPPORT_TICKETS, GET_MY_EVENTS, GET_MY_BOOKINGS } from '@/features/events/graphql/queries';
import { CREATE_SUPPORT_TICKET, REPLY_TO_TICKET, RESOLVE_TICKET, REOPEN_TICKET } from '@/features/events/graphql/mutations';
import { TICKET_UPDATED_SUBSCRIPTION } from '@/features/events/graphql/subscriptions';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import toast from 'react-hot-toast';
import {
  Card, Button, Tag, Typography, Modal, Form, Input, Select, List, Avatar, Space, Badge, Divider, Empty, Spin, Tooltip, Segmented
} from 'antd';
import {
  PlusOutlined, MessageOutlined, CheckCircleOutlined, ClockCircleOutlined, UserOutlined, SendOutlined,
  LeftOutlined, InfoCircleOutlined, RobotOutlined, CustomerServiceOutlined, UndoOutlined, SearchOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// --- Animations ---

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.4 }
};

export default function SupportPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [form] = Form.useForm();
  const [replyForm] = Form.useForm();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [eventFilter, setEventFilter] = useState('ALL');
  const [orgFilter, setOrgFilter] = useState('INCOMING'); // INCOMING or OUTGOING
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const messageValue = Form.useWatch('message', replyForm);

  const { data: ticketsData, loading: ticketsLoading, refetch: refetchTickets, subscribeToMore } = useQuery(GET_MY_SUPPORT_TICKETS, {
    variables: {
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      eventId: eventFilter === 'ALL' ? undefined : eventFilter,
      limit: 50
    },
    fetchPolicy: 'cache-and-network',
    onError: (err) => {
      console.error('Support query error:', err);
    }
  });
  const { data: eventsData } = useQuery(GET_MY_EVENTS, { skip: !user });
  const { data: bookingsData } = useQuery(GET_MY_BOOKINGS, { skip: user?.role !== 'USER' });

  const [createTicket, { loading: creating }] = useMutation(CREATE_SUPPORT_TICKET);
  const [replyToTicket, { loading: replying }] = useMutation(REPLY_TO_TICKET);
  const [resolveTicket, { loading: resolving }] = useMutation(RESOLVE_TICKET);
  const [reopenTicket, { loading: reopening }] = useMutation(REOPEN_TICKET);
  
  const tickets = (ticketsData?.mySupportTickets || []).filter(t => {
    const matchesSearch = t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.user.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesEvent = eventFilter === 'ALL' || t.event?.id === eventFilter;

    if (user.role === 'ORGANIZER') {
      if (orgFilter === 'INCOMING') {
        return matchesSearch && matchesStatus && matchesEvent && t.type === 'USER_TO_ORGANIZER';
      } else {
        return matchesSearch && matchesStatus && t.type === 'ORGANIZER_TO_ADMIN';
      }
    }

    return matchesSearch && matchesStatus && matchesEvent;
  });

  useEffect(() => {
    if (selectedTicket && tickets.length > 0) {
      const updated = tickets.find(t => t.id === selectedTicket.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedTicket)) {
        setSelectedTicket(updated);
      }
    }
  }, [tickets, selectedTicket]);

  useEffect(() => {
    if (selectedTicket) {
      const unsubscribe = subscribeToMore({
        document: TICKET_UPDATED_SUBSCRIPTION,
        variables: { ticketId: selectedTicket.id },
        updateQuery: (prev, { subscriptionData }) => {
          if (!subscriptionData.data) return prev;
          const updatedTicket = subscriptionData.data.ticketUpdated;
          
          // Sync selected ticket immediately
          setSelectedTicket(updatedTicket);

          return {
            ...prev,
            mySupportTickets: prev.mySupportTickets.map(t => 
              t.id === updatedTicket.id ? updatedTicket : t
            )
          };
        }
      });
      return () => unsubscribe();
    }
  }, [selectedTicket, subscribeToMore]);

  if (!user) {
    if (typeof window !== 'undefined') router.push('/login');
    return null;
  }

  const handleCreateTicket = async (values) => {
    try {
      const type = user.role === 'USER' ? 'USER_TO_ORGANIZER' : 'ORGANIZER_TO_ADMIN';
      await createTicket({
        variables: { ...values, type }
      });
      toast.success('Support ticket created successfully! 🎫');
      setIsModalOpen(false);
      form.resetFields();
      refetchTickets();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleReply = async (values) => {
    try {
      const { data } = await replyToTicket({
        variables: { ticketId: selectedTicket.id, message: values.message }
      });
      replyForm.resetFields();
      if (data?.replyToSupportTicket) {
        setSelectedTicket(data.replyToSupportTicket);
      }
      toast.success('Reply sent!');
      refetchTickets();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleResolve = async (ticketId) => {
    try {
      const { data } = await resolveTicket({ variables: { ticketId } });
      if (data?.resolveSupportTicket) {
        setSelectedTicket(data.resolveSupportTicket);
        toast.success('Ticket marked as resolved');
        refetchTickets();
      }
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleReopen = async (ticketId) => {
    try {
      const { data } = await reopenTicket({ variables: { ticketId } });
      if (data?.reopenSupportTicket) {
        setSelectedTicket(data.reopenSupportTicket);
        toast.success('Ticket re-opened');
        refetchTickets();
      }
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px', background: '#F8FAFC' }}>
      <Head><title>Support Center | EventHub</title></Head>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <motion.div 
          initial="initial" 
          animate="animate" 
          variants={fadeInUp} 
          style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 900, color: '#1E293B', letterSpacing: '-0.5px' }}>Support Center</Title>
            <Text type="secondary" style={{ fontSize: '16px' }}>Manage your inquiries and support requests</Text>
          </div>
          {user.role !== 'SUPER_ADMIN' && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={() => setIsModalOpen(true)}
              style={{ 
                borderRadius: '14px', 
                height: '52px', 
                padding: '0 24px',
                fontWeight: 700, 
                background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)', 
                border: 'none', 
                boxShadow: '0 10px 20px rgba(79, 70, 229, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              New Ticket
            </Button>
          )}
        </motion.div>

        {!selectedTicket && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            style={{ marginBottom: '32px' }}
          >
            {/* Integrated Filter & Tab Bar */}
            <div style={{ 
              background: 'white', 
              padding: '8px', 
              borderRadius: '24px', 
              boxShadow: '0 4px 30px rgba(0,0,0,0.03)', 
              display: 'flex', 
              flexDirection: 'column',
              gap: '12px'
            }}>
              {/* Top Row: Navigation Tabs for Organizer */}
              {user.role === 'ORGANIZER' && (
                <div style={{ borderBottom: '1px solid #F1F5F9', padding: '8px 16px' }}>
                  <Segmented
                    block
                    size="large"
                    options={[
                      { label: 'Customer Inquiries', value: 'INCOMING', icon: <MessageOutlined /> },
                      { label: 'My Support Requests', value: 'OUTGOING', icon: <SendOutlined /> }
                    ]}
                    value={orgFilter}
                    onChange={setOrgFilter}
                    style={{ background: '#F8FAFC', borderRadius: '14px', padding: '4px' }}
                  />
                </div>
              )}

              {/* Bottom Row: Search & Filters */}
              <div style={{ padding: '8px 16px 16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Input
                  placeholder="Search by subject or name..."
                  prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: 2, minWidth: '250px', height: '48px', borderRadius: '14px', background: '#F8FAFC', border: '1px solid #F1F5F9' }}
                />
                
                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  style={{ flex: 1, minWidth: '150px', height: '48px' }}
                  suffixIcon={<ClockCircleOutlined />}
                  dropdownStyle={{ borderRadius: '12px' }}
                >
                  <Option value="ALL">All Status</Option>
                  <Option value="OPEN">Open</Option>
                  <Option value="RESOLVED">Resolved</Option>
                </Select>

                {user.role !== 'SUPER_ADMIN' && (
                  <Select
                    value={eventFilter}
                    onChange={setEventFilter}
                    style={{ flex: 1, minWidth: '150px', height: '48px' }}
                    dropdownStyle={{ borderRadius: '12px' }}
                  >
                    <Option value="ALL">All Events</Option>
                    {(eventsData?.myEvents || []).map(e => <Option key={e.id} value={e.id}>{e.title}</Option>)}
                    {(bookingsData?.myBookings || []).map(b => <Option key={b.event.id} value={b.event.id}>{b.event.title}</Option>)}
                  </Select>
                )}
                
                <div style={{ color: '#64748B', fontWeight: 600, padding: '0 8px' }}>
                  {tickets.length} Results
                </div>
              </div>
            </div>
          </motion.div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: selectedTicket ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          <AnimatePresence mode="sync">
            {!selectedTicket ? (
              tickets.length > 0 ? (
                tickets.map((ticket, index) => (
                  <motion.div
                    key={ticket.id}
                    variants={fadeInUp}
                    initial="initial"
                    animate="animate"
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -8, transition: { duration: 0.2 } }}
                  >
                    <Card
                      onClick={() => setSelectedTicket(ticket)}
                      style={{ 
                        borderRadius: '28px', 
                        cursor: 'pointer', 
                        border: '1px solid #F1F5F9', 
                        boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
                        overflow: 'hidden',
                        height: '100%'
                      }}
                      styles={{ body: { padding: '28px' } }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <Tag color={ticket.status === 'OPEN' ? 'blue' : 'green'} style={{ borderRadius: '10px', fontWeight: 800, padding: '4px 14px', fontSize: '11px', textTransform: 'uppercase', border: 'none' }}>
                          {ticket.status}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: '12px', fontWeight: 500 }}>{dayjs(ticket.createdAt).fromNow()}</Text>
                      </div>

                      <Title level={4} style={{ margin: '0 0 12px 0', fontWeight: 800, color: '#1E293B', fontSize: '18px', lineHeight: 1.4 }}>{ticket.subject}</Title>
                      
                      <div style={{ marginBottom: '20px', padding: '12px', background: '#F8FAFC', borderRadius: '14px' }}>
                        <Text type="secondary" style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ClockCircleOutlined style={{ fontSize: '12px' }} />
                          {ticket.event ? ticket.event.title : (ticket.type === 'ORGANIZER_TO_ADMIN' ? 'Platform Support' : 'General Support')}
                        </Text>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Avatar size="medium" style={{ background: '#4F46E5', fontWeight: 700 }}>{ticket.user?.name?.[0]}</Avatar>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <Text strong style={{ fontSize: '14px', color: '#1E293B' }}>{ticket.user?.name}</Text>
                            <Text type="secondary" style={{ fontSize: '11px' }}>{ticket.user?.role}</Text>
                          </div>
                        </div>
                        <Badge count={ticket.messages.length} color="#4F46E5" offset={[5, 0]}>
                          <div style={{ background: '#F1F5F9', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', color: '#64748B' }}>
                            <MessageOutlined style={{ fontSize: '16px' }} />
                          </div>
                        </Badge>
                      </div>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <div style={{ gridColumn: '1/-1', padding: '80px 0', textAlign: 'center' }}>
                  <Empty 
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={<Text type="secondary" style={{ fontSize: '16px' }}>No support tickets found</Text>}
                  />
                </div>
              )
            ) : (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Card
                  style={{ borderRadius: '32px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', overflow: 'hidden' }}
                  styles={{ body: { padding: 0 } }}
                >
                  <div style={{ padding: '32px 40px', background: 'white', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <Button
                        icon={<LeftOutlined />}
                        onClick={() => setSelectedTicket(null)}
                        style={{ border: 'none', background: '#F1F5F9', borderRadius: '12px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <Title level={3} style={{ margin: 0, fontWeight: 900, color: '#1E293B' }}>{selectedTicket.subject}</Title>
                          <Tag color={selectedTicket.status === 'OPEN' ? 'processing' : 'success'} style={{ borderRadius: '6px', fontWeight: 700, textTransform: 'uppercase', fontSize: '10px', padding: '0 8px' }}>
                            {selectedTicket.status}
                          </Tag>
                        </div>
                        <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>{selectedTicket.event?.title || 'General Platform Support'}</Text>
                      </div>
                    </div>
                    {(() => {
                      const canResolve = selectedTicket.status === 'OPEN' && (
                        (selectedTicket.type === 'USER_TO_ORGANIZER' && user.id === selectedTicket.organizer?.id) ||
                        (selectedTicket.type === 'ORGANIZER_TO_ADMIN' && user.role === 'SUPER_ADMIN')
                      );
                      
                      return canResolve && (
                        <Button
                          type="primary"
                          danger
                          icon={<CheckCircleOutlined />}
                          onClick={() => handleResolve(selectedTicket.id)}
                          loading={resolving}
                          style={{ borderRadius: '12px', fontWeight: 600 }}
                        >
                          Resolve Ticket
                        </Button>
                      );
                    })()}
                    {selectedTicket.status === 'RESOLVED' && (
                      <Button
                        type="primary"
                        icon={<UndoOutlined />}
                        onClick={() => handleReopen(selectedTicket.id)}
                        loading={reopening}
                        style={{ borderRadius: '12px', fontWeight: 600, background: '#10B981', border: 'none' }}
                      >
                        Re-open Ticket
                      </Button>
                    )}
                  </div>

                  <div style={{ height: 'auto', overflowY: 'auto', padding: '40px', background: '#FAFBFF', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {selectedTicket?.messages?.map((msg, i) => {
                      const isMe = msg.sender.id === user.id;
                      return (
                        <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <Text strong style={{ fontSize: '12px', color: '#64748B' }}>{msg.sender.name} ({msg.sender.role})</Text>
                            <Avatar size={24} style={{ background: isMe ? '#4F46E5' : '#E2E8F0' }} icon={<UserOutlined />} />
                          </div>
                          <div style={{
                            padding: '16px 24px',
                            borderRadius: isMe ? '24px 24px 4px 24px' : '24px 24px 24px 4px',
                            background: isMe ? 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)' : 'white',
                            color: isMe ? 'white' : '#1E293B',
                            boxShadow: isMe ? '0 10px 20px rgba(79, 70, 229, 0.15)' : '0 4px 12px rgba(0,0,0,0.03)',
                            border: isMe ? 'none' : '1px solid #F1F5F9',
                            fontSize: '15px',
                            lineHeight: 1.6
                          }}>
                            {msg.message}
                          </div>
                          <Text style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px', fontWeight: 600 }}>
                            {dayjs(isNaN(msg.createdAt) ? msg.createdAt : parseInt(msg.createdAt)).format('MMM D, h:mm A')}
                          </Text>
                        </div>
                      );
                    })}
                  </div>

                  {selectedTicket.status === 'RESOLVED' && (
                    <div style={{ padding: '24px 32px', background: '#F8FAFC', borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
                      <Text type="secondary" style={{ display: 'block', marginBottom: '12px' }}>This ticket is marked as resolved. To continue the conversation, please re-open it.</Text>
                      <Button
                        type="primary"
                        icon={<UndoOutlined />}
                        onClick={() => handleReopen(selectedTicket.id)}
                        loading={reopening}
                        style={{ borderRadius: '12px', fontWeight: 600, background: '#10B981', border: 'none' }}
                      >
                        Re-open to Reply
                      </Button>
                    </div>
                  )}

                  {selectedTicket.status === 'OPEN' && (
                    <div style={{ padding: '24px 32px', background: 'white', borderTop: '1px solid #F1F5F9' }}>
                      <Form form={replyForm} onFinish={handleReply} layout="vertical">
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                          <Form.Item name="message" rules={[{ required: true, message: '' }]} style={{ flex: 1, marginBottom: 0 }}>
                            <TextArea
                              placeholder="Type your message here..."
                              autoSize={{ minRows: 1, maxRows: 6 }}
                              style={{
                                borderRadius: '20px',
                                padding: '12px 20px',
                                border: '2px solid #F1F5F9',
                                background: '#FAFBFF',
                                fontSize: '15px'
                              }}
                            />
                          </Form.Item>
                          <Button
                            type="primary"
                            htmlType="submit"
                            icon={<SendOutlined style={{ color: '#ffff' }} />}
                            size="large"
                            loading={replying}
                            disabled={!messageValue?.trim()}
                            style={{
                              borderRadius: '20px',
                              height: '48px',
                              width: '48px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: !messageValue?.trim() ? '#E2E8F0' : 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)',
                              border: 'none',
                              boxShadow: !messageValue?.trim() ? 'none' : '0 4px 12px rgba(79, 70, 229, 0.3)',
                              transition: 'all 0.3s ease'
                            }}
                          />
                        </div>
                      </Form>
                    </div>
                  )}
                  </Card>
                </motion.div>
              )}
          </AnimatePresence>
        </div>
      </div>

      {/* Create Ticket Modal */}
      <Modal
        title={<Title level={3} style={{ margin: 0, fontWeight: 900 }}>New Support Ticket</Title>}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        centered
        width={600}
        styles={{ body: { padding: '24px' } }}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateTicket}>
          {user.role === 'USER' && (
            <Form.Item name="eventId" label="Related Event" rules={[{ required: true, message: 'Please select an event' }]}>
              <Select placeholder="Select an event you have booked" size="large" style={{ borderRadius: '12px' }}>
                {bookingsData?.myBookings.map(b => (
                  <Option key={b.event.id} value={b.event.id}>{b.event.title}</Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item name="subject" label="Subject" rules={[{ required: true, message: 'Please enter a subject' }]}>
            <Input placeholder="e.g., Query regarding ticket refund" size="large" style={{ borderRadius: '12px' }} />
          </Form.Item>

          <Form.Item name="description" label="Detailed Description" rules={[{ required: true, message: 'Please describe your query' }]}>
            <TextArea placeholder="Describe your problem or question in detail..." rows={5} style={{ borderRadius: '12px' }} />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: '32px' }}>
            <Space size="middle">
              <Button onClick={() => setIsModalOpen(false)} size="large" style={{ borderRadius: '12px', fontWeight: 600 }}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={creating}
                style={{ borderRadius: '12px', fontWeight: 700, background: '#4F46E5', padding: '0 40px' }}
              >
                Create Ticket
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      <style jsx global>{`
        .ant-modal-content {
          border-radius: 32px !important;
          overflow: hidden;
        }
        .ant-modal-header {
          padding: 24px 24px 0 24px !important;
          border-bottom: none !important;
        }
        .ant-form-item-label label {
          font-weight: 700 !important;
          color: #475569 !important;
        }
        @keyframes pulse-glow {
          0% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(79, 70, 229, 0); }
          100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
        }
      `}</style>
    </div>
  );
}
