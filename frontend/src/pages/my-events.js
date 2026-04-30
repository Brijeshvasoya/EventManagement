import { useQuery, useMutation } from '@apollo/client/react';
import { GET_MY_EVENTS, DELETE_EVENT } from '@/features/events/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import Head from 'next/head';
import { Button, Row, Col, Badge, Popconfirm, Tooltip, Space } from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

export default function MyEvents() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const { data, loading, refetch } = useQuery(GET_MY_EVENTS, {
    fetchPolicy: 'cache-and-network',
    skip: !user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')
  });

  const [deleteEvent] = useMutation(DELETE_EVENT);

  if (authLoading || loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px',
        background: 'var(--gradient-main)', animation: 'pulse-glow 2s ease-in-out infinite',
      }} />
    </div>
  );

  const events = data?.myEvents || [];

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

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <Head><title>My Events | EventHub</title></Head>

      <div className="header-responsive" style={{ background: 'linear-gradient(135deg, #1B2A4E 0%, #312E81 50%, #4338CA 100%)', borderRadius: '24px', boxShadow: '0 20px 40px rgba(49, 46, 129, 0.2)', color: 'white' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', fontWeight: 900, fontSize: '2.5rem', letterSpacing: '-0.5px' }}>Event Portfolio</h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem' }}>Manage all the experiences you are bringing to life.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Button type="primary" onClick={() => router.push('/events/create')} icon={<PlusOutlined />} style={{ background: 'linear-gradient(135deg, rgb(27, 42, 78) 0%, rgb(49, 46, 129) 50%, rgb(67, 56, 202) 100%)', border: 'none', height: '48px', borderRadius: '100px', fontWeight: 700, padding: '0 32px', boxShadow: '0 4px 12px rgba(27, 42, 78, 0.3)' }}>
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
          <Button type="primary" onClick={() => router.push('/events/create')} style={{ background: 'linear-gradient(135deg, rgb(49, 46, 129) 0%, rgb(67, 56, 202) 100%)', borderRadius: '100px', padding: '0 32px', fontWeight: 700, height: '48px', border: 'none' }}>Start Creating</Button>
        </div>
      ) : (
        <Row gutter={[24, 24]}>
          {events.map(event => (
            <Col xs={24} xl={12} key={event.id}>
              <div className="hover-bounce premium-event-card" onClick={() => router.push(`/events/${event.id}`)} style={{ cursor: 'pointer', display: 'flex', background: '#FFF', borderRadius: '24px', border: '1px solid #F3F4F6', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', overflow: 'hidden', height: '100%', position: 'relative' }}>
                <div style={{ width: '180px', flexShrink: 0, background: `url(${event.imageUrl || '/event-placeholder.jpg'}) center/cover`, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 12, left: 12 }}>
                    <Badge count={event.status === 'DRAFT' ? 'Draft' : 'Live'} color={event.status === 'DRAFT' ? '#9CA3AF' : '#10B981'} style={{ fontWeight: 800 }} />
                  </div>
                </div>
                <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, color: '#1B2A4E', fontWeight: 800, fontSize: '1.2rem', lineHeight: 1.3 }}>{event.title}</h3>
                    <div style={{
                      borderRadius: '6px',
                      fontWeight: '900',
                      padding: '5px 12px',
                      background: 'rgba(67, 56, 202, 0.95)',
                      color: 'white',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      lineHeight: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 10px rgba(67, 56, 202, 0.15)'
                    }}>
                      {event.eventType}
                    </div>
                  </div>
                  <p style={{ color: '#6B7280', margin: '0 0 16px 0', fontSize: '0.9rem', flex: 1 }}>{dayjs(isNaN(Number(event.date)) ? event.date : Number(event.date)).format('MMM D, YYYY')}</p>

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
                        <Button icon={<EditOutlined />} shape="circle" onClick={(e) => { router.push(`/events/create?id=${event.id}`); }} style={{ background: 'rgba(67, 56, 202, 0.05)', border: '1px solid rgb(67, 56, 202)', color: 'rgb(67, 56, 202)' }} />
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
    </div>
  );
}
