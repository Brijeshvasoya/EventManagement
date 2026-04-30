import React, { useState } from 'react';
import { Calendar, Card, Typography, Spin, Drawer, List, Tag, Alert, Modal, Button } from 'antd';
import { useQuery } from '@apollo/client/react';
import { GET_MY_EVENTS, GET_MY_BOOKINGS, GET_EVENTS } from '@/features/events/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import { EnvironmentOutlined, ClockCircleOutlined, UserOutlined, QrcodeOutlined, CalendarOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';

const { Title, Text } = Typography;

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';

  const { data: eventsData, loading: eventsLoading } = useQuery(GET_MY_EVENTS, {
    skip: !user || !isOrganizer,
  });

  const { data: bookingsData, loading: bookingsLoading } = useQuery(GET_MY_BOOKINGS, {
    skip: !user || isOrganizer,
  });

  const { data: allEventsData, loading: allEventsLoading } = useQuery(GET_EVENTS, {
    skip: !user || isOrganizer,
  });

  const [selectedDate, setSelectedDate] = useState(() => dayjs());
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedEventModal, setSelectedEventModal] = useState(null);
  const [dayItems, setDayItems] = useState([]);

  if (authLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!user) {
    if (typeof window !== 'undefined') router.push('/login');
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  }

  const isLoading = isOrganizer ? eventsLoading : (bookingsLoading || allEventsLoading);

  const downloadTicket = async (booking) => {
    const ticketId = `ticket-rich-template-${booking.id}`;
    const element = document.getElementById(ticketId);
    if (!element) {
      toast.error('Ticket template not found.');
      return;
    }

    try {
      toast.loading('Crafting your premium PDF ticket...', { id: 'pdf-gen' });
      const canvas = await html2canvas(element, { scale: 3, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`VIP_Ticket_${booking.event.title.replace(/\s+/g, '_')}.pdf`);
      toast.success('Official Ticket Saved! 🎉', { id: 'pdf-gen' });
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate PDF ticket.', { id: 'pdf-gen' });
    }
  };

  const eventsByDate = {};

  if (isOrganizer && eventsData?.myEvents) {
    eventsData.myEvents.forEach(event => {
      const parsedDate = isNaN(Number(event.date)) ? event.date : Number(event.date);
      const dateStr = dayjs(parsedDate).format('YYYY-MM-DD');
      if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
      eventsByDate[dateStr].push({ type: 'event', data: event });
    });
  }

  if (!isOrganizer) {
    const bookedEventIds = new Set();
    if (bookingsData?.myBookings) {
      bookingsData.myBookings.forEach(booking => {
        if (booking.status !== 'CANCELLED') {
          const parsedDate = isNaN(Number(booking.event.date)) ? booking.event.date : Number(booking.event.date);
          const dateStr = dayjs(parsedDate).format('YYYY-MM-DD');
          if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
          eventsByDate[dateStr].push({ type: 'booking', data: booking });
          bookedEventIds.add(booking.event.id);
        }
      });
    }
    if (allEventsData?.events) {
      allEventsData.events.forEach(ev => {
        if (!bookedEventIds.has(ev.id)) {
          const parsedDate = isNaN(Number(ev.date)) ? ev.date : Number(ev.date);
          const dateStr = dayjs(parsedDate).format('YYYY-MM-DD');
          if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
          eventsByDate[dateStr].push({ type: 'available_event', data: ev });
        }
      });
    }
  }

  const dateCellRender = (value) => {
    const dateStr = value.format('YYYY-MM-DD');
    const listData = eventsByDate[dateStr] || [];
    return (
      <ul className="events-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {listData.map((item, index) => (
          <li key={index} style={{ marginBottom: '6px' }}>
            <div
              style={{
                fontSize: '0.75rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                padding: '4px 8px',
                borderRadius: '8px',
                background: item.type === 'event' ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                  : item.type === 'booking' ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
                    : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: '#ffffff',
                fontWeight: 700,
                boxShadow: `0 2px 8px ${item.type === 'event' ? 'rgba(16, 185, 129, 0.3)'
                  : item.type === 'booking' ? 'rgba(59, 130, 246, 0.3)'
                    : 'rgba(245, 158, 11, 0.3)'}`,
                transition: 'all 0.2s',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              className="event-pill"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEventModal(item);
              }}
            >
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'white', opacity: 0.9, flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                {item.type === 'event' || item.type === 'available_event' ? item.data.title : item.data.event.title}
              </span>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  const cellRender = (current, info) => {
    if (info.type === 'date') return dateCellRender(current);
    return info.originNode;
  };

  const onSelect = (newValue, info) => {
    setSelectedDate(newValue);
    if (info.source === 'date') {
      const dateStr = newValue.format('YYYY-MM-DD');
      const items = eventsByDate[dateStr] || [];
      if (items.length > 0) {
        setDayItems(items);
        setDrawerVisible(true);
      }
    }
  };

  return (
    <>
      <div style={{ padding: '0px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="header-responsive" style={{ padding: 0 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 800, color: '#1B2A4E', letterSpacing: '-0.5px' }}>My Calendar</h1>
            <p style={{ color: '#6B7280', margin: '4px 0 0 0', fontSize: '1rem' }}>{isOrganizer ? "Manage and track your upcoming events." : "Keep track of your booked events and tickets."}</p>
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <Spin size="large" />
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            {/* Animated Blob Background for Glassmorphism */}
            <div style={{ position: 'absolute', top: '10%', left: '5%', width: '400px', height: '400px', background: 'rgba(99, 102, 241, 0.15)', filter: 'blur(100px)', borderRadius: '50%', animation: 'float 10s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: '400px', height: '400px', background: 'rgba(16, 185, 129, 0.1)', filter: 'blur(100px)', borderRadius: '50%', animation: 'float 12s ease-in-out infinite reverse' }} />

            <Card
              className="glassmorphic-calendar"
              style={{
                borderRadius: '32px',
                boxShadow: '0 24px 50px -12px rgba(0,0,0,0.08)',
                border: '1px solid rgba(255,255,255,0.8)',
                background: 'rgba(255, 255, 255, 0.65)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                position: 'relative',
                zIndex: 2,
                overflow: 'hidden'
              }}
            >
              <Calendar
                cellRender={cellRender}
                onSelect={onSelect}
                value={selectedDate}
                className="custom-calendar"
              />
            </Card>
          </div>
        )}

        <Drawer
          title={<span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1E1B4B' }}>{selectedDate.format('MMMM D, YYYY')}</span>}
          placement="right"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          width={420}
          styles={{ header: { borderBottom: '1px solid #E2E8F0', padding: '20px 24px' }, body: { padding: '24px', background: '#F8FAFC' } }}
        >
          {dayItems.length > 0 ? (
            <List
              itemLayout="vertical"
              dataSource={dayItems}
              renderItem={(item) => {
                const isBooking = item.type === 'booking';
                const isAvailable = item.type === 'available_event';
                const isEvent = item.type === 'event';
                const data = item.data;
                const ev = isBooking ? data.event : data;

                return (
                  <List.Item style={{ padding: 0, border: 'none' }}>
                    <Card size="small" style={{
                      borderRadius: '20px',
                      border: 'none',
                      background: 'white',
                      boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      overflow: 'hidden',
                      marginBottom: '16px'
                    }} className="drawer-card">
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '6px', height: '100%', background: isEvent ? 'linear-gradient(180deg, #10B981 0%, #059669 100%)' : isBooking ? 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)' : 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px 12px 12px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Tag color={isEvent ? 'success' : isBooking ? 'processing' : 'warning'} style={{
                            borderRadius: '100px', fontWeight: 700, border: 'none', padding: '2px 10px',
                            background: isEvent ? 'rgba(16, 185, 129, 0.1)' : isBooking ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: isEvent ? '#059669' : isBooking ? '#2563EB' : '#D97706'
                          }}>
                            {isEvent ? 'Hosted Event' : isBooking ? 'Booked Ticket' : 'Available Event'}
                          </Tag>
                          {isBooking && <Tag style={{ borderRadius: '100px', fontWeight: 700, border: '1px solid #E2E8F0', background: 'white', color: '#475569' }}>x{data.quantity}</Tag>}
                        </div>
                        <Title level={4} style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#1E1B4B' }}>{ev.title}</Title>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', background: '#F8FAFC', padding: '8px', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                            <ClockCircleOutlined style={{ color: isEvent ? '#10B981' : isBooking ? '#3B82F6' : '#F59E0B' }} />
                            <Text style={{ color: '#334155', fontWeight: 600, fontSize: '0.85rem' }}>{dayjs(isNaN(Number(ev.date)) ? ev.date : Number(ev.date)).format('h:mm A')}</Text>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', background: '#F8FAFC', padding: '8px', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                            {isBooking ? <QrcodeOutlined style={{ color: '#3B82F6' }} /> : <UserOutlined style={{ color: isEvent ? '#10B981' : '#F59E0B' }} />}
                            <Text style={{ color: '#334155', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {isBooking ? data.ticketType : `${ev.bookedCount || 0} / ${ev.capacity}`}
                            </Text>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B' }}>
                          <EnvironmentOutlined style={{ color: isEvent ? '#10B981' : isBooking ? '#3B82F6' : '#F59E0B' }} />
                          <Text style={{ color: '#475569', fontWeight: 500 }} ellipsis={{ tooltip: ev.location }}>{ev.location}</Text>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px', paddingTop: '16px', borderTop: '1px dashed #E2E8F0' }}>
                          {isBooking ? (
                            <>
                              <a href={`/events/${ev.id}`} style={{ flex: 1, color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1F5F9', padding: '10px', borderRadius: '12px', transition: 'all 0.2s', textDecoration: 'none' }} className="action-btn-gray">
                                Details
                              </a>
                              <a style={{ flex: 2, color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', padding: '10px', borderRadius: '12px', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(59,130,246,0.3)', textDecoration: 'none' }} onClick={() => downloadTicket(data)} className="action-btn-blue">
                                Download Ticket &rarr;
                              </a>
                            </>
                          ) : isAvailable ? (
                            <a href={`/events/${ev.id}`} style={{ width: '100%', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', padding: '10px', borderRadius: '12px', transition: 'all 0.2s', textDecoration: 'none', boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }} className="action-btn-orange">
                              Book Ticket Now &rarr;
                            </a>
                          ) : (
                            <a href={`/events/${ev.id}`} style={{ width: '100%', color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.05)', padding: '10px', borderRadius: '12px', transition: 'all 0.2s', textDecoration: 'none' }} className="action-btn-green">
                              View Event Details &rarr;
                            </a>
                          )}
                        </div>
                      </div>
                    </Card>
                  </List.Item>
                );
              }}
            />
          ) : (
            <Alert message="No events or bookings on this date." type="info" showIcon />
          )}
        </Drawer>

        <Modal
          title={null}
          footer={null}
          open={!!selectedEventModal}
          onCancel={() => setSelectedEventModal(null)}
          centered
          width={500}
          styles={{ body: { padding: 0, overflow: 'hidden', borderRadius: '24px' } }}
          closeIcon={<div style={{ background: 'white', borderRadius: '50%', height: '30px', width: '30px', alignItems: 'center', justifyContent: 'center', display: 'flex', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>✕</div>}
        >
          {selectedEventModal && (
            <div style={{ padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <Tag color={
                  selectedEventModal.type === 'event' ? 'success' :
                    selectedEventModal.type === 'booking' ? 'blue' : 'warning'
                } style={{ borderRadius: '100px', fontWeight: 800, padding: '4px 12px' }}>
                  {selectedEventModal.type === 'event' ? 'Hosted Event' :
                    selectedEventModal.type === 'booking' ? 'Booked Ticket' : 'Available Event'}
                </Tag>
              </div>
              <Title level={3} style={{ margin: 0, fontWeight: 900, color: '#1E1B4B' }}>
                {selectedEventModal.type === 'event' || selectedEventModal.type === 'available_event' ? selectedEventModal.data.title : selectedEventModal.data.event.title}
              </Title>
              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748B' }}>
                  <ClockCircleOutlined style={{ fontSize: '18px', color: '#6366F1' }} />
                  <Text style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    {dayjs(isNaN(Number(selectedEventModal.type === 'booking' ? selectedEventModal.data.event.date : selectedEventModal.data.date)) ? (selectedEventModal.type === 'booking' ? selectedEventModal.data.event.date : selectedEventModal.data.date) : Number(selectedEventModal.type === 'booking' ? selectedEventModal.data.event.event ? selectedEventModal.data.event.date : selectedEventModal.data.event.date : selectedEventModal.data.date)).format('MMMM D, YYYY • h:mm A')}
                  </Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748B' }}>
                  <EnvironmentOutlined style={{ fontSize: '18px', color: '#6366F1' }} />
                  <Text style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    {selectedEventModal.type === 'booking' ? selectedEventModal.data.event.location : selectedEventModal.data.location}
                  </Text>
                </div>
              </div>

              <div style={{ marginTop: '32px' }}>
                {selectedEventModal.type === 'booking' && (
                  <Button type="primary" block size="large" style={{ borderRadius: '12px', height: '50px', fontWeight: 700 }} onClick={() => downloadTicket(selectedEventModal.data)}>
                    Download Ticket PDF
                  </Button>
                )}
                {selectedEventModal.type === 'available_event' && (
                  <Button type="primary" block size="large" style={{ borderRadius: '12px', height: '50px', fontWeight: 700, background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', border: 'none' }} onClick={() => router.push(`/events/${selectedEventModal.data.id}`)}>
                    Book Ticket Now
                  </Button>
                )}
                {selectedEventModal.type === 'event' && (
                  <Button type="primary" block size="large" style={{ borderRadius: '12px', height: '50px', fontWeight: 700, background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', border: 'none' }} onClick={() => router.push(`/events/${selectedEventModal.data.id}`)}>
                    Manage Event
                  </Button>
                )}
              </div>
            </div>
          )}
        </Modal>

        {/* HIDDEN TICKET TEMPLATES FOR PDF */}
        {!isOrganizer && bookingsData?.myBookings?.map(b => (
          <div key={`pdf-${b.id}`} id={`ticket-rich-template-${b.id}`} style={{ position: 'fixed', top: '-10000px', left: '-10000px', width: '800px', background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ margin: '40px', border: '1px solid #E2E8F0', borderRadius: '60px', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.05)', minHeight: '1000px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)', padding: '60px 40px', color: 'white', textAlign: 'center', position: 'relative' }}>
                <p style={{ textTransform: 'uppercase', letterSpacing: '6px', fontSize: '1.1rem', opacity: 0.8, marginBottom: '20px', fontWeight: '700' }}>Official Pass</p>
                <h1 style={{ color: 'white', fontSize: '5rem', fontWeight: '950', margin: '0 0 20px 0', letterSpacing: '-3px', lineHeight: 1 }}>{b.event.title}</h1>
                <div style={{ display: 'inline-block', padding: '12px 30px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: '600', opacity: 0.9 }}>Digital Ticket #{b.id.slice(-8).toUpperCase()}</p>
                </div>
                <div style={{ width: '8px', height: '8px', background: '#EF4444', borderRadius: '50%', margin: '15px auto 0' }}></div>
              </div>
              <div style={{ padding: '60px 50px', flex: 1, gap: '40px', display: 'flex' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '45px', flex: 1 }}>
                  <div>
                    <p style={{ color: '#6366F1', fontWeight: '700', textTransform: 'uppercase', fontSize: '1rem', letterSpacing: '1px', marginBottom: '12px' }}>Guest Holder</p>
                    <h2 style={{ fontSize: '3rem', fontWeight: '800', color: '#1E293B', margin: 0, lineHeight: 1.1 }}>{user?.name || 'User'}</h2>
                  </div>
                  <div style={{ display: 'flex', gap: '30px' }}>
                    <div>
                      <p style={{ color: '#6366F1', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px', marginBottom: '8px' }}>Date & Time</p>
                      <p style={{ fontSize: '1.4rem', fontWeight: '700', color: '#334155', margin: 0 }}>{new Date(isNaN(Number(b.event.date)) ? b.event.date : Number(b.event.date)).toLocaleDateString()}</p>
                      <p style={{ fontSize: '1.2rem', fontWeight: '600', color: '#64748B', marginTop: '4px' }}>{new Date(isNaN(Number(b.event.date)) ? b.event.date : Number(b.event.date)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '09:00 AM'}</p>
                    </div>
                    <div>
                      <p style={{ color: '#6366F1', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px', marginBottom: '8px' }}>Location</p>
                      <p style={{ fontSize: '1.2rem', fontWeight: '600', color: '#334155', margin: 0, lineHeight: 1.4 }}>{b.event.location}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '30px', marginTop: 'auto' }}>
                    <div>
                      <p style={{ color: '#6366F1', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px', marginBottom: '8px' }}>Ticket Tier</p>
                      <p style={{ fontSize: '1.6rem', fontWeight: '800', color: '#4F46E5', margin: 0 }}>{b.ticketType || 'Silver'}</p>
                    </div>
                    <div>
                      <p style={{ color: '#6366F1', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px', marginBottom: '8px' }}>Order Total</p>
                      <p style={{ fontSize: '1.6rem', fontWeight: '800', color: b.status === 'CANCELLED' ? '#EF4444' : '#1E293B', margin: 0 }}>₹{Number(b.amountPaid || 0).toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: '600', color: '#64748B' }}>INR</span></p>
                    </div>
                    <div>
                      <p style={{ color: '#6366F1', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px', marginBottom: '8px' }}>Quantity</p>
                      <p style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1E293B', margin: 0 }}>{b.quantity || 1}</p>
                    </div>
                  </div>
                </div>
                <div style={{ background: '#F8FAFC', borderRadius: '40px', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid #F1F5F9' }}>
                  <div style={{ background: 'white', padding: '25px', borderRadius: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                    {b.qrCode && <img src={b.qrCode} style={{ width: '280px', height: '280px' }} alt="QR" />}
                  </div>
                  <p style={{ marginTop: '30px', textTransform: 'uppercase', letterSpacing: '3px', fontWeight: '900', color: '#1e1b4b', fontSize: '1rem' }}>Validate Access</p>
                </div>
              </div>
              <div style={{ padding: '40px 50px', borderTop: '1px dashed #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94A3B8' }}>
                  <span style={{ fontSize: '1.4rem' }}>🌐</span>
                  <p style={{ margin: 0, fontWeight: '600', fontSize: '1.1rem' }}>Verified by EventHub SaaS</p>
                </div>
                <div style={{ background: '#1e1b4b', color: 'white', padding: '12px 25px', borderRadius: '100px', fontWeight: '900', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Entry Pass
                </div>
              </div>
            </div>
          </div>
        ))}

        <style jsx global>{`
          /* Custom Calendar Overrides */
          .custom-calendar .ant-picker-calendar-header {
            padding-bottom: 24px;
            padding-top: 8px;
          }
          .custom-calendar .ant-picker-calendar-header .ant-select-selector {
            border-radius: 12px !important;
            font-weight: 600;
            border: 1px solid #E2E8F0;
            padding: 0 16px;
            height: 38px;
            display: flex;
            align-items: center;
          }
          .custom-calendar .ant-picker-calendar-header .ant-radio-button-wrapper {
            border-radius: 10px;
            margin: 0 4px;
            border: 1px solid #E2E8F0;
            font-weight: 600;
          }
          .custom-calendar .ant-picker-calendar-header .ant-radio-button-wrapper-checked {
            background: #4338CA !important;
            color: white !important;
            border-color: #4338CA !important;
          }
          .custom-calendar .ant-picker-calendar-date {
            border-radius: 16px;
            transition: all 0.3s ease;
            margin: 4px;
            border: 1px solid transparent;
            background: rgba(255, 255, 255, 0.4);
          }
          .custom-calendar .ant-picker-calendar-date:hover {
            background: rgba(255, 255, 255, 0.9) !important;
            border: 1px solid rgba(67, 56, 202, 0.2);
            box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          }
          .custom-calendar .ant-picker-calendar-date-today {
            border: 2px dashed #4CAF50 !important;
            background: rgba(127, 236, 72, 0.05) !important;
          }
          .custom-calendar .ant-picker-cell-today .ant-picker-calendar-date-value {
            color: #4CAF50 !important;
          }
          .custom-calendar .ant-picker-calendar-mode-switch {
            display: none !important;
          }
          .custom-calendar .ant-picker-cell-selected .ant-picker-calendar-date {
            border: 2px solid #4338CA !important;
            box-shadow: 0 8px 24px rgba(67, 56, 202, 0.25) !important;
            transform: scale(1.02);
            z-index: 10;
          }
          .custom-calendar .ant-picker-cell-selected .ant-picker-cell-inner {
            background-color: #fff !important;
          }
          .custom-calendar .ant-picker-calendar-date-value {
            font-weight: 700;
            color: #1E293B;
            padding-top: 8px;
            font-size: 1.1rem;
          }
          .custom-calendar .ant-picker-calendar-date-today {
            background-color: #ebf0e2ff !important;
          }
          
          /* Event Pills Styles */
          .event-pill:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
            filter: brightness(1.05);
          }
          
          .ant-picker-calendar-date-content {
            height: 100px !important;
            overflow-y: auto !important;
            padding: 8px 4px !important;
          }
          
          /* Custom scrollbar for calendar cells */
          .ant-picker-calendar-date-content::-webkit-scrollbar {
            width: 4px;
          }
          .ant-picker-calendar-date-content::-webkit-scrollbar-track {
            background: transparent;
          }
          .ant-picker-calendar-date-content::-webkit-scrollbar-thumb {
            background-color: rgba(0,0,0,0.15);
            border-radius: 4px;
          }
          .ant-picker-calendar-date-content:hover::-webkit-scrollbar-thumb {
            background-color: rgba(0,0,0,0.3);
          }
          
          /* Animations & Buttons */
          @keyframes float {
            0% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
            100% { transform: translateY(0px) rotate(0deg); }
          }
          
          .action-btn-green:hover { background: rgba(16, 185, 129, 0.15) !important; color: #059669 !important; }
          .action-btn-gray:hover { background: #E2E8F0 !important; color: #334155 !important; }
          .action-btn-blue:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(59,130,246,0.3) !important; filter: brightness(1.05); }
          
          /* Drawer Cards */
          .drawer-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 32px rgba(0,0,0,0.08) !important;
          }
        `}</style>
      </div>
    </>
  );
}
