import React from 'react';
import { Modal, Typography, Tag, Button, Popconfirm } from 'antd';
import { AuditOutlined, ScanOutlined } from '@ant-design/icons';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

const { Title, Text } = Typography;

export default function DigitalTicketModal({ open, onCancel, booking, onCancelTicket }) {
  const { user } = useAuth();
  if (!booking) return null;

  const handleDownloadQR = async () => {
    const qrUrl = booking.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${booking.id}`;
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QR_${booking.event?.title.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("QR Download failed:", err);
    }
  };

  const handleDownloadPass = async () => {
    const ticketId = `ticket-rich-template-${booking.id}`;
    const element = document.getElementById(ticketId);
    if (!element) return;

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

  return (
    <>
      <Modal
        open={open}
        onCancel={onCancel}
        footer={null}
        centered
        width={400}
        styles={{ body: { padding: 0 } }}
        closeIcon={null}
      >
        <div style={{
          background: 'white',
          borderRadius: '32px',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
        }}>
          {/* Ticket Header */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <img src={booking.event?.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, color: '#1B2A4E', fontWeight: 800 }}>{booking.event?.title}</Title>
              <Tag color="success" style={{ borderRadius: '100px', border: 'none', background: '#DCFCE7', color: '#166534', fontWeight: 700, marginTop: '4px' }}>
                {booking.status}
              </Tag>
            </div>
          </div>

          {/* QR and Info Box */}
          <div style={{
            background: '#F8FAFC',
            borderRadius: '24px',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '24px'
          }}>
            <div style={{
              background: 'white',
              padding: '12px',
              borderRadius: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
              <img src={booking.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${booking.id}`} style={{ width: '100px', height: '100px' }} />
            </div>
            <div style={{ flex: 1 }}>
              <Text type="secondary" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ticket Info</Text>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1B2A4E', margin: '4px 0' }}>
                ₹{Number(booking.amountPaid).toLocaleString()}
              </div>
              <Text type="secondary" style={{ fontSize: '0.85rem' }}>{booking.ticketType} x {booking.quantity}</Text>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                block
                size="large"
                icon={<AuditOutlined />}
                onClick={handleDownloadPass}
                style={{
                  height: '54px',
                  borderRadius: '16px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  color: '#1B2A4E'
                }}
              >
                Pass
              </Button>
              <Button
                block
                size="large"
                icon={<ScanOutlined />}
                onClick={handleDownloadQR}
                style={{
                  height: '54px',
                  borderRadius: '16px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  color: '#1B2A4E'
                }}
              >
                QR
              </Button>
            </div>

            {booking.status !== 'CANCELLED' && (
              <Popconfirm
                title="Cancel Ticket"
                description="Are you sure you want to cancel this ticket? This action cannot be undone."
                onConfirm={() => onCancelTicket(booking.id)}
                okText="Yes, Cancel"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <Button
                  block
                  danger
                  size="large"
                  style={{
                    height: '54px',
                    borderRadius: '16px',
                    fontWeight: 700,
                    border: '1px solid #FEE2E2',
                    background: '#FEF2F2',
                    marginTop: '4px'
                  }}
                >
                  Cancel Ticket
                </Button>
              </Popconfirm>
            )}
          </div>
        </div>
      </Modal>
      {/* PDF template inside the map for each booking */}
      <div id={`ticket-rich-template-${booking.id}`} style={{ position: 'fixed', top: '-10000px', left: '-10000px', width: '800px', background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ margin: '40px', border: '1px solid #E2E8F0', borderRadius: '60px', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.05)', minHeight: '1000px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)', padding: '60px 40px', color: 'white', textAlign: 'center', position: 'relative' }}>
            <p style={{ textTransform: 'uppercase', letterSpacing: '6px', fontSize: '1.1rem', opacity: 0.8, marginBottom: '20px', fontWeight: '700' }}>Official Pass</p>
            <h1 style={{ color: 'white', fontSize: '5rem', fontWeight: '950', margin: '0 0 20px 0', letterSpacing: '-3px', lineHeight: 1 }}>{booking?.event?.title}</h1>
            <div style={{ display: 'inline-block', padding: '12px 30px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: '600', opacity: 0.9 }}>Digital Ticket #{booking.id.slice(-8).toUpperCase()}</p>
            </div>
            <div style={{ width: '8px', height: '8px', background: '#EF4444', borderRadius: '50%', margin: '15px auto 0' }}></div>
          </div>
          <div className="grid-cols-modal-info" style={{ padding: '60px 50px', flex: 1, gap: '40px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
              <div>
                <p style={{ color: '#6366F1', fontWeight: '700', textTransform: 'uppercase', fontSize: '1rem', letterSpacing: '1px', marginBottom: '12px' }}>Guest Holder</p>
                <h2 style={{ fontSize: '3rem', fontWeight: '800', color: '#1E293B', margin: 0, lineHeight: 1.1 }}>{user.name || 'SaaS User'}</h2>
              </div>
              <div className="grid-cols-2" style={{ gap: '30px' }}>
                <div>
                  <p style={{ color: '#6366F1', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px', marginBottom: '8px' }}>Date & Time</p>
                  <p style={{ fontSize: '1.4rem', fontWeight: '700', color: '#334155', margin: 0 }}>{new Date(isNaN(Number(booking.event.date)) ? booking.event.date : Number(booking.event.date)).toLocaleDateString()}</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: '600', color: '#64748B', marginTop: '4px' }}>{new Date(isNaN(Number(booking.event.date)) ? booking.event.date : Number(booking.event.date)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '09:00 AM'}</p>
                </div>
                <div>
                  <p style={{ color: '#6366F1', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px', marginBottom: '8px' }}>Location</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: '600', color: '#334155', margin: 0, lineHeight: 1.4 }}>{booking.event.location}</p>
                </div>
              </div>
              <div className="grid-cols-2" style={{ gap: '30px', marginTop: 'auto' }}>
                <div>
                  <p style={{ color: '#6366F1', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px', marginBottom: '8px' }}>Ticket Tier</p>
                  <p style={{ fontSize: '1.6rem', fontWeight: '800', color: '#4F46E5', margin: 0 }}>{booking.ticketType || 'Silver'}</p>
                </div>
                <div>
                  <p style={{ color: '#6366F1', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px', marginBottom: '8px' }}>Order Total</p>
                  <p style={{ fontSize: '1.6rem', fontWeight: '800', color: booking.status === 'CANCELLED' ? '#EF4444' : '#1E293B', margin: 0 }}>₹{Number(booking.amountPaid || 0).toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: '600', color: '#64748B' }}>INR</span></p>
                </div>
                <div>
                  <p style={{ color: '#6366F1', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px', marginBottom: '8px' }}>Quantity</p>
                  <p style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1E293B', margin: 0 }}>{booking.quantity || 1}</p>
                </div>
              </div>
            </div>
            <div style={{ background: '#F8FAFC', borderRadius: '40px', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid #F1F5F9' }}>
              <div style={{ background: 'white', padding: '25px', borderRadius: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                <img src={booking.qrCode} style={{ width: '280px', height: '280px' }} alt="QR" />
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
    </>
  );
}
