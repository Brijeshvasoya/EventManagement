import React, { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { CREATE_EVENT, GET_MY_VENDORS } from '@/features/events/graphql/queries';
import { Select, ConfigProvider, theme } from 'antd';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

export default function CreateEvent() {
  const { user } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    title: '', description: '', date: '', location: '', capacity: 100, eventType: 'OTHER', imageUrl: ''
  });

  const [ticketTypes, setTicketTypes] = useState([
    { name: 'REGULAR', price: 50, capacity: 100 }
  ]);

  const [createEvent, { loading }] = useMutation(CREATE_EVENT);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiImageLoading, setAiImageLoading] = useState(false);
  const [vendorIds, setVendorIds] = useState([]);

  const { data: vendorData, loading: vendorLoading } = useQuery(GET_MY_VENDORS, {
    fetchPolicy: 'cache-and-network',
    skip: !user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')
  });

  if (!user || user.role === 'USER') {
    return (
      <div style={{
        padding: '80px 20px', textAlign: 'center', color: '#6b6b80'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
        <p style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Access Denied. You must be an Event Organizer.</p>
        <Link href="/" style={{ color: '#7c5cfc', fontWeight: 600, textDecoration: 'none' }}>← Go Back</Link>
      </div>
    );
  }

  const handleAIGenerate = async () => {
    if (!form.title) return toast.error("Please enter an event title first!");
    setAiLoading(true);
    try {
      // For now, assuming a helper or proxy on backend for internal AI tool
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ title: form.title, eventType: form.eventType })
      });
      const data = await res.json();
      if (data.description) {
        setForm({ ...form, description: data.description });
        toast.success("AI Content Generated! ✨");
      }
    } catch (err) {
      toast.error("AI service is currently unavailable.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIImageGenerate = async () => {
    if (!form.title) return toast.error("Please enter an event title first!");
    setAiImageLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ai/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ title: form.title, eventType: form.eventType })
      });
      const data = await res.json();
      if (data.imageUrl) {
        setForm({ ...form, imageUrl: data.imageUrl });
        toast.success("AI Poster Generated! 🎨");
      }
    } catch (err) {
      toast.error("AI image service is currently unavailable.");
    } finally {
      setAiImageLoading(false);
    }
  };

  // --- Multi-Cloud Image Logic (Cloudinary) ---
  const handleImageUpload = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const formData = new FormData();
      formData.append('image', file);

      toast.loading('Uploading to Secure Cloud...', { id: 'upload' });
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        const data = await res.json();
        if (data.url) {
          setForm({ ...form, imageUrl: data.url });
          toast.success('Media secured on Cloudinary! 🌐', { id: 'upload' });
        }
      } catch (err) {
        toast.error('Cloud upload failed. Using local preview.', { id: 'upload' });
        // Fallback to base64 for UX if server upload fails
        const reader = new FileReader();
        reader.onloadend = () => setForm({ ...form, imageUrl: reader.result });
        reader.readAsDataURL(file);
      }
    }
  };

  const handleTicketChange = (index, field, value) => {
    const newTickets = [...ticketTypes];
    newTickets[index][field] = field === 'name' ? value : Number(value);
    setTicketTypes(newTickets);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const totalCapacity = ticketTypes.reduce((acc, curr) => acc + curr.capacity, 0);
      await createEvent({
        variables: {
          input: {
            ...form,
            capacity: totalCapacity,
            ticketTypes,
            vendorIds
          }
        }
      });
      toast.success('Event Published Successfully!');
      router.push('/');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#7c5cfc',
          borderRadius: 16,
          colorBgContainer: 'rgba(22, 22, 35, 0.8)',
          colorBorder: 'rgba(255, 255, 255, 0.08)',
        }
      }}
    >
      <Head><title>Post New Event | EventHub</title></Head>
      <div className="form-card" style={{
        maxWidth: '800px',
        margin: '2rem auto',
        background: 'rgba(22, 22, 35, 0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.3)'
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-block',
            padding: '5px 12px',
            background: 'rgba(0, 212, 170, 0.08)',
            border: '1px solid rgba(0, 212, 170, 0.15)',
            borderRadius: '100px',
            color: '#00d4aa',
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            marginBottom: '16px'
          }}>
            📝 New Event
          </div>
          <h2 style={{ margin: '0 0 0.5rem 0', color: '#f0f0f5', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.5px' }}>Create a New Event</h2>
          <p style={{ color: '#6b6b80', margin: 0, fontSize: '0.95rem' }}>Publish your rich media event to the platform.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="grid-2">
            <div>
              <label>Event Title *</label>
              <input placeholder="e.g. Next.js Developer Conference 2024" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label>Event Type *</label>
              <Select
                mode="tags"
                value={Array.isArray(form.eventType) ? form.eventType : [form.eventType]}
                onChange={val => setForm({ ...form, eventType: Array.isArray(val) ? val[val.length - 1] : val })}
                style={{ width: '100%', padding: "7px" }}
                className="premium-select-compact"
                styles={{ popup: { root: { background: '#1a1a2e', border: '1px solid #312e81' } } }}
              >
                <Select.Option value="WEDDING">Wedding</Select.Option>
                <Select.Option value="CORPORATE">Corporate</Select.Option>
                <Select.Option value="BIRTHDAY">Birthday</Select.Option>
                <Select.Option value="SEMINAR">Seminar / Tech</Select.Option>
                <Select.Option value="OTHER">Other</Select.Option>
              </Select>
            </div>
          </div>

          {/* Drag and Drop Box */}
          <div>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span>Event Cover Image *</span>
              <button
                type="button"
                onClick={handleAIImageGenerate}
                disabled={aiImageLoading}
                className="ai-btn"
              >
                {aiImageLoading ? '✨ Generating...' : '✨ Generate with AI'}
              </button>
            </label>
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleImageUpload}
              className="drop-zone"
              style={{
                borderColor: form.imageUrl ? 'rgba(0, 212, 170, 0.3)' : undefined,
                background: form.imageUrl ? 'rgba(0, 212, 170, 0.03)' : undefined
              }}
            >
              {form.imageUrl ? (
                <img
                  src={form.imageUrl}
                  alt="Preview"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '12px' }}
                />
              ) : (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#6b6b80' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '12px', opacity: 0.5 }}>📸</div>
                  <p style={{ margin: '0 0 8px 0' }}>Drag and drop an image here</p>
                  <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#4a4a5a' }}>or</p>
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{
                    display: 'block', width: '100%',
                    color: '#a0a0b8',
                    fontSize: '0.9rem'
                  }} />
                </div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span>Description *</span>
              <button
                type="button"
                onClick={handleAIGenerate}
                disabled={aiLoading}
                className="ai-btn"
              >
                {aiLoading ? '✨ Generating...' : '✨ Generate with AI'}
              </button>
            </label>
            <textarea placeholder="Describe what attendees can expect..." required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={6} />
          </div>

          <div className="grid-2">
            <div>
              <label>Date & Time *</label>
              <input type="datetime-local" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label>Location / Venue *</label>
              <input placeholder="e.g. Moscone Center" required value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>

          {/* Dynamic Ticket Types */}
          <div style={{
            marginTop: '1.5rem',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <div>
                <h3 style={{ margin: 0, color: '#f0f0f5', fontWeight: 700, fontSize: '1.1rem' }}>Ticket Tiers</h3>
                <p style={{ margin: '4px 0 0 0', color: '#6b6b80', fontSize: '0.8rem' }}>Configure pricing for different ticket levels</p>
              </div>
              <button
                type="button"
                onClick={() => setTicketTypes([...ticketTypes, { name: '', price: 0, capacity: 50 }])}
                className="btn-outline"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <PlusOutlined /> Add Tier
              </button>
            </div>

            {ticketTypes.map((ticket, idx) => (
              <div key={idx} className="ticket-tier-row" style={{
                background: 'rgba(255,255,255,0.02)',
                padding: '16px',
                borderRadius: '14px',
                marginBottom: '12px',
                border: '1px solid rgba(255,255,255,0.04)',
                alignItems: 'end'
              }}>
                <div>
                  <label style={{ fontSize: '0.8rem' }}>Ticket Name</label>
                  <input placeholder="e.g. VIP, Early Bird" value={ticket.name} onChange={e => handleTicketChange(idx, 'name', e.target.value)} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem' }}>Price ($)</label>
                  <input type="number" min="0" step="0.01" value={ticket.price} onChange={e => handleTicketChange(idx, 'price', e.target.value)} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem' }}>Capacity</label>
                  <input type="number" min="1" value={ticket.capacity} onChange={e => handleTicketChange(idx, 'capacity', e.target.value)} required />
                </div>
                {ticketTypes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setTicketTypes(ticketTypes.filter((_, i) => i !== idx))}
                    style={{
                      background: 'rgba(255, 77, 106, 0.08)',
                      border: '1px solid rgba(255, 77, 106, 0.15)',
                      color: '#ff4d6a',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      marginBottom: '2px',
                      fontFamily: 'inherit'
                    }}
                  >
                    <DeleteOutlined />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '10px', color: '#f0f0f5', fontWeight: 700, fontSize: '1.1rem' }}>Assign My Vendors</label>
            <p style={{ margin: '-5px 0 15px 0', color: '#6b6b80', fontSize: '0.8rem' }}>Choose from vendors you have created to support this event.</p>
            <Select
              mode="multiple"
              allowClear
              style={{ width: '100%' }}
              placeholder="Select vendors..."
              value={vendorIds}
              onChange={setVendorIds}
              loading={vendorLoading}
              dropdownStyle={{ background: '#1a1a2e', border: '1px solid #312e81' }}
              className="premium-select"
            >
              {vendorData?.myVendors?.map(v => (
                <Select.Option key={v.id} value={v.id}>
                  <span style={{ color: '#f0f0f5' }}>{v.name}</span> <span style={{ color: '#6b6b80', fontSize: '0.8rem' }}>— {v.category}</span>
                </Select.Option>
              ))}
            </Select>
          </div>

          <button type="submit" disabled={loading} className="btn-primary mt-2" style={{
            padding: '1rem', fontSize: '1.05rem', width: '100%', height: '54px'
          }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{
                  width: '16px', height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                  display: 'inline-block'
                }} />
                Publishing...
              </span>
            ) : '🚀 Publish Event'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .ticket-tier-row {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr auto;
          gap: 12px;
        }
        @media (max-width: 600px) {
          .ticket-tier-row {
             grid-template-columns: 1fr 1fr;
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .ai-btn {
          background: rgba(124, 92, 252, 0.1);
          border: 1px solid rgba(124, 92, 252, 0.3);
          color: #7c5cfc;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
          display: flex;
          align-items: center;
          gap: 6px;
          backdrop-filter: blur(10px);
        }
        .ai-btn:hover {
          background: #7c5cfc;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(124, 92, 252, 0.4);
        }
        .ai-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .premium-select :global(.ant-select-selector),
        .premium-select-compact :global(.ant-select-selector) {
          background: rgba(255, 255, 255, 0.03) !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
          border-radius: 12px !important;
          color: #f0f0f5 !important;
          display: flex !important;
          align-items: center !important;
        }
        .premium-select :global(.ant-select-selector) {
          min-height: 52px !important;
        }
        .premium-select-compact :global(.ant-select-selector) {
          height: 52px !important; /* Match standard input height exactly */
        }
        .premium-select :global(.ant-select-selection-item),
        .premium-select-compact :global(.ant-select-selection-item) {
          color: #f0f0f5 !important;
          font-weight: 500 !important;
          line-height: 50px !important; /* Center text vertically in single select */
        }
        /* Multiple selection tags */
        .premium-select.ant-select-multiple :global(.ant-select-selection-item) {
          background: rgba(124, 92, 252, 0.15) !important;
          border: 1px solid rgba(124, 92, 252, 0.3) !important;
          color: #a78bfa !important;
          border-radius: 6px !important;
          line-height: 24px !important;
          margin-top: 4px !important;
        }
        .premium-select :global(.ant-select-selection-placeholder),
        .premium-select-compact :global(.ant-select-selection-placeholder) {
          color: #4a4a5a !important;
          line-height: 50px !important;
        }
        .premium-select :global(.ant-select-arrow),
        .premium-select-compact :global(.ant-select-arrow) {
          color: #6b6b80 !important;
        }
      `}</style>
    </ConfigProvider>
  );
}
