import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_EVENTS, GET_MY_BOOKINGS, DELETE_EVENT, UPDATE_EVENT, GET_MY_VENDORS } from '@/features/events/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import Head from 'next/head';
import { Tabs, Tag, Button, Modal, Spin, Empty, Popconfirm, Select, Tooltip, Form, Input, DatePicker, Upload } from 'antd';
import { CalendarOutlined, EnvironmentOutlined, CheckCircleOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined, EyeOutlined, ArrowRightOutlined, UploadOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Browse() {
    const router = useRouter();
    const { user } = useAuth();
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState('');
    const [editForm] = Form.useForm();

    const { data: eventData, loading: eventLoading, refetch: refetchEvents } = useQuery(GET_EVENTS, { fetchPolicy: 'cache-and-network' });
    const { data: bookingData, refetch: refetchBookings } = useQuery(GET_MY_BOOKINGS, {
        fetchPolicy: 'network-only',
        skip: !user
    });
    console.log("🚀 ~ Browse ~ bookingData:", bookingData)
    const { data: vendorData, loading: vendorLoading } = useQuery(GET_MY_VENDORS, {
        skip: !user || user.role === 'USER'
    });
    const [editVendorIds, setEditVendorIds] = useState([]);
    const [aiImageLoading, setAiImageLoading] = useState(false);

    const [deleteEvent] = useMutation(DELETE_EVENT);
    const [updateEvent, { loading: updating }] = useMutation(UPDATE_EVENT);

    const handleAIImageGenerate = async () => {
        const title = editForm.getFieldValue('title');
        const eventType = editForm.getFieldValue('eventType');

        if (!title) return toast.error("Please enter an event title first!");
        setAiImageLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ai/generate-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage?.getItem('token')}` },
                body: JSON.stringify({ title, eventType })
            });
            const data = await res.json();
            if (data.imageUrl) {
                setPreviewImage(data.imageUrl);
                toast.success("AI Poster Generated! 🎨");
            }
        } catch (err) {
            toast.error("AI image service is currently unavailable?.");
        } finally {
            setAiImageLoading(false);
        }
    };

    if (eventLoading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '100px', flexDirection: 'column', gap: '16px' }}>
            <div style={{
                width: '48px', height: '48px',
                borderRadius: '12px',
                background: 'var(--gradient-main)',
                animation: 'pulse-glow 2s ease-in-out infinite',
                boxShadow: 'var(--shadow-glow)'
            }} />
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Discovering Events...</span>
        </div>
    );

    const allEvents = eventData?.events || [];
    const myBookings = bookingData?.myBookings || [];

    // No longer need manual filter for 'CONFIRMED' as backend handles it
    const myBookedEventIds = myBookings.map(b => b.event.id);

    const now = new Date();

    const handleEditOpen = (event) => {
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

    const handleFileChange = (info) => {
        const file = info.file?.originFileObj || info.file;
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setPreviewImage(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleUpdateSubmit = async (values) => {
        try {
            // Ensure we only send the ID string, not the full object
            const eventId = typeof selectedEvent.id === 'object' ? selectedEvent.id._id : selectedEvent.id;

            await updateEvent({
                variables: {
                    id: eventId,
                    input: {
                        ...values,
                        date: values.date?.toISOString(),
                        imageUrl: previewImage,
                        capacity: selectedEvent.capacity,
                        vendorIds: editVendorIds
                    }
                }
            });
            toast.success('Event Updated Successfully!');
            setIsEditModalOpen(false);
            refetchEvents();
        } catch (e) {
            console?.error("Update Error:", e);
            toast.error(e?.message);
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteEvent({ variables: { id } });
            toast.success('Event deleted successfully');
            refetchEvents();
        } catch (e) {
            toast.error(e?.message);
        }
    };

    const showDetails = (event) => {
        router.push(`/events/${event.id}`);
    };

    const EventGrid = ({ events, emptyMsg }) => (
        events.length === 0 ? (
            <div style={{
                padding: '5rem 2rem',
                textAlign: 'center',
                background: 'var(--bg-secondary)',
                borderRadius: '24px',
                border: '2px dashed var(--glass-border)'
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }}>🔍</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', margin: 0 }}>{emptyMsg}</p>
            </div>
        ) : (
            <div className="event-grid grid-cols-auto-340" style={{ gap: '24px' }}>
                {events.map((e, index) => {
                    const isBooked = myBookedEventIds.includes(e?.id);
                    const isOwner = user?.id === e?.organizer?.id || user?.role === 'ADMIN';

                    return (
                        <div
                            key={e?.id}
                            className="hover-bounce premium-event-card"
                            onClick={() => showDetails(e)}
                            style={{
                                cursor: 'pointer',
                                borderRadius: '24px',
                                overflow: 'hidden',
                                border: '1px solid var(--glass-border)',
                                background: 'var(--card-bg)',
                                backdropFilter: 'blur(20px)',
                                transition: 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                                animation: `fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${index * 0.08}s forwards`,
                                opacity: 0,
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            <div style={{ height: '220px', position: 'relative', overflow: 'hidden' }}>
                                <img
                                    src={e?.imageUrl || '/event-placeholder.jpg'}
                                    style={{
                                        width: '100%', height: '100%', objectFit: 'cover',
                                        transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)'
                                    }}
                                    className="event-card-img"
                                />
                                <div style={{
                                    position: 'absolute',
                                    bottom: 0, left: 0, right: 0, height: '60%',
                                    background: 'linear-gradient(to top, var(--card-bg) 0%, transparent 100%)',
                                    pointerEvents: 'none'
                                }} />

                                <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', gap: '8px' }}>
                                    <div style={{
                                        borderRadius: '8px',
                                        fontWeight: '900',
                                        margin: 0,
                                        backdropFilter: 'blur(10px)',
                                        background: 'rgba(14, 165, 233, 0.95)',
                                        color: 'white',
                                        padding: '5px 12px',
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                        lineHeight: 1,
                                        boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {e?.eventType || 'Public'}
                                    </div>
                                </div>

                                {isBooked && (
                                    <div style={{
                                        position: 'absolute', top: '16px', right: '16px',
                                        background: 'rgba(16, 185, 129, 0.9)', backdropFilter: 'blur(10px)', color: 'white',
                                        padding: '6px 16px', borderRadius: '100px', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px',
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                                    }}>
                                        <CheckCircleOutlined style={{ fontSize: '0.9rem' }} /> Booked
                                    </div>
                                )}
                            </div>

                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 16px 0', lineHeight: 1.3 }}>{e?.title}</h3>

                                <div className="grid-cols-2" style={{ gap: '12px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.9rem' }}>
                                        <CalendarOutlined style={{ color: 'var(--primary-color)', marginTop: '3px' }} />
                                        <span style={{ lineHeight: 1.4 }}>{new Date(parseInt(e?.date) || e?.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.9rem' }}>
                                        <EnvironmentOutlined style={{ color: 'var(--secondary-color)', marginTop: '3px' }} />
                                        <span style={{ lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{e?.location}</span>
                                    </div>
                                </div>

                                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
                                    <span style={{ color: 'var(--primary-color)', fontWeight: 800, fontSize: '1.1rem' }}>
                                        {e?.amountPaid ? `Paid: $${Number(e.amountPaid).toLocaleString()}` : (e?.ticketTypes?.[0] ? `From $${Math.min(...e?.ticketTypes.map(t => t.price)).toLocaleString()}` : 'Free')}
                                    </span>

                                    {isOwner ? (
                                        <div style={{ display: 'flex', gap: '8px' }} onClick={ev => ev.stopPropagation()}>
                                            <Tooltip title="Event Analytics">
                                                <Button icon={<EyeOutlined />} shape="circle" style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--secondary-color)' }} onClick={() => showDetails(e)} />
                                            </Tooltip>
                                            <Tooltip title="Edit Event">
                                                <Button icon={<EditOutlined />} shape="circle" style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--primary-color)' }} onClick={() => handleEditOpen(e)} />
                                            </Tooltip>
                                            <Popconfirm title="Delete this event?" onConfirm={() => handleDelete(e?.id)}>
                                                <Button icon={<DeleteOutlined />} shape="circle" danger style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }} />
                                            </Popconfirm>
                                        </div>
                                    ) : (
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            View Details <ArrowRightOutlined />
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )
    );

    const upcomingEvents = allEvents.filter(e => {
        const isUpcoming = new Date(parseInt(e?.date) || e?.date) >= now;
        if (user?.role === 'ORGANIZER') {
            return isUpcoming && e?.organizer?.id === user.id;
        }
        return isUpcoming;
    });

    const completedEvents = allEvents.filter(e => {
        const isPast = new Date(parseInt(e?.date) || e?.date) < now;
        if (user?.role === 'ORGANIZER') {
            return isPast && e?.organizer?.id === user.id;
        }
        return isPast;
    });

    // BETTER: Get Participated events directly from myBookings
    const participatedEvents = myBookings
        .map(b => ({ ...b?.event, amountPaid: b?.amountPaid }))
        .filter(e => !!e?.id);

    return (
        <>
            <Head><title>Browse Events | EventHub</title></Head>
            <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                {/* Premium Hero */}
                <div style={{ padding: '60px 40px', background: 'linear-gradient(135deg, #1B2A4E 0%, #312E81 50%, #4338CA 100%)', borderRadius: '32px', marginBottom: '40px', color: 'white', textAlign: 'center', boxShadow: '0 20px 40px rgba(49, 46, 129, 0.2)' }}>
                    <h1 style={{ margin: '0 0 16px 0', fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-1px', color: 'white' }}>Explore Extraordinary Experiences</h1>
                    <p style={{ margin: '0 auto', fontSize: '1.2rem', color: 'rgba(255,255,255,0.8)', maxWidth: '600px' }}>Find and join top-rated upcoming events curated exclusively for you.</p>
                </div>

                <Tabs
                    defaultActiveKey="1"
                    centered
                    size="large"
                    items={[
                        { key: '1', label: '🔥 Upcoming', children: <EventGrid events={upcomingEvents} emptyMsg="No upcoming events found." /> },
                        user?.role !== 'ORGANIZER' && { key: '2', label: '🎫 Participated', children: <EventGrid events={participatedEvents} emptyMsg="You haven't booked any events yet." /> },
                        { key: '3', label: '✅ Completed', children: <EventGrid events={completedEvents} emptyMsg="No past events found." /> }
                    ].filter(Boolean)}
                    style={{ marginBottom: '4rem' }}
                />

                {/* Modals removed, user is now redirected directly to events/[id].js */}

                {/* EDIT EVENT MODAL - COMPACT NATIVE UI */}
                <Modal
                    title={<h3 style={{ margin: '0 0 5px 0', fontSize: '1.5rem', fontWeight: '800', color: '#f0f0f5' }}>Edit Your Event</h3>}
                    open={isEditModalOpen}
                    onCancel={() => setIsEditModalOpen(false)}
                    footer={null}
                    centered
                    width={720}
                    styles={{ body: { padding: '24px' } }}
                >
                    <p style={{ margin: '0 0 1rem 0', color: '#6b6b80', fontSize: '0.9rem' }}>Update your rich media event details below.</p>

                    <Form form={editForm} layout="vertical" onFinish={handleUpdateSubmit} requiredMark={false} className="compact-form">
                        <div className="grid-2" style={{ gap: '12px', marginBottom: '12px' }}>
                            <Form.Item name="title" label={<label style={{ fontWeight: '600', color: '#a0a0b8', fontSize: '0.85rem' }}>Event Title *</label>} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                <Input placeholder="e?.g. Next.js Dev Con" style={{ borderRadius: '10px', padding: '10px 14px' }} />
                            </Form.Item>

                            <Form.Item name="eventType" label={<label style={{ fontWeight: '600', color: '#a0a0b8', fontSize: '0.85rem' }}>Event Type *</label>} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                <Select style={{ width: '100%', height: '42px' }}>
                                    <Select.Option value="WEDDING">Wedding</Select.Option>
                                    <Select.Option value="CORPORATE">Corporate</Select.Option>
                                    <Select.Option value="BIRTHDAY">Birthday</Select.Option>
                                    <Select.Option value="SEMINAR">Seminar / Tech</Select.Option>
                                    <Select.Option value="OTHER">Other</Select.Option>
                                </Select>
                            </Form.Item>
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <label style={{ fontWeight: '600', color: '#a0a0b8', fontSize: '0.85rem' }}>Event Cover Image *</label>
                                <Button
                                    type="text"
                                    size="small"
                                    onClick={handleAIImageGenerate}
                                    loading={aiImageLoading}
                                    style={{ color: '#7c5cfc', fontSize: '0.75rem', fontWeight: 700 }}
                                >
                                    {aiImageLoading ? '✨ Generating...' : '✨ Generate with AI'}
                                </Button>
                            </div>
                            <div style={{
                                border: '2px dashed rgba(255,255,255,0.08)',
                                borderRadius: '14px',
                                padding: '16px',
                                textAlign: 'center',
                                background: 'rgba(255,255,255,0.02)',
                                transition: 'all 0.3s ease'
                            }}>
                                {previewImage ? (
                                    <img
                                        src={previewImage}
                                        crossOrigin="anonymous"
                                        referrerPolicy="no-referrer"
                                        style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '10px', marginBottom: '10px' }}
                                        alt="Preview"
                                    />
                                ) : (
                                    <div style={{ padding: '20px', color: '#6b6b80' }}>📸 Image preview here</div>
                                )}
                                <Upload beforeUpload={() => false} onChange={handleFileChange} showUploadList={false}>
                                    <Button icon={<UploadOutlined />} size="small" style={{ borderRadius: '8px' }}>Change Artwork</Button>
                                </Upload>
                            </div>
                        </div>

                        <Form.Item name="description" label={<label style={{ fontWeight: '600', color: '#a0a0b8', fontSize: '0.85rem' }}>Description *</label>} rules={[{ required: true }]} style={{ marginBottom: '12px' }}>
                            <Input.TextArea rows={3} placeholder="Event description..." style={{ borderRadius: '10px' }} />
                        </Form.Item>

                        <div className="grid-2" style={{ gap: '12px', marginBottom: '18px' }}>
                            <Form.Item name="date" label={<label style={{ fontWeight: '600', color: '#a0a0b8', fontSize: '0.85rem' }}>Date & Time *</label>} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                <DatePicker showTime style={{ width: '100%', borderRadius: '10px' }} />
                            </Form.Item>
                            <Form.Item name="location" label={<label style={{ fontWeight: '600', color: '#a0a0b8', fontSize: '0.85rem' }}>Location / Venue *</label>} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                <Input placeholder="Venue location" style={{ borderRadius: '10px' }} />
                            </Form.Item>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#a0a0b8', fontWeight: 600, fontSize: '0.85rem' }}>Assign My Vendors</label>
                            <Select
                                mode="multiple"
                                allowClear
                                style={{ width: '100%' }}
                                placeholder="Select vendors..."
                                value={editVendorIds}
                                onChange={setEditVendorIds}
                                loading={vendorLoading}
                                dropdownStyle={{ background: '#1a1a2e', border: '1px solid #312e81' }}
                                className="premium-select-compact"
                            >
                                {vendorData?.myVendors?.map(v => (
                                    <Select.Option key={v.id} value={v.id}>
                                        <span style={{ color: '#f0f0f5' }}>{v.name}</span> <span style={{ color: '#6b6b80', fontSize: '0.8rem' }}>— {v.category}</span>
                                    </Select.Option>
                                ))}
                            </Select>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '18px' }}>
                            <Button size="middle" onClick={() => setIsEditModalOpen(false)} style={{ borderRadius: '10px', padding: '0 28px', fontWeight: 'bold' }}>Discard</Button>
                            <Button type="primary" htmlType="submit" size="middle" loading={updating} style={{ borderRadius: '10px', padding: '0 28px', fontWeight: 'bold' }}>
                                Save Changes
                            </Button>
                        </div>
                    </Form>
                </Modal>
            </div>
            <style jsx global>{`
                .premium-select-compact :global(.ant-select-selector) {
                    background: rgba(255, 255, 255, 0.03) !important;
                    border-color: rgba(255, 255, 255, 0.08) !important;
                    border-radius: 12px !important;
                    color: #f0f0f5 !important;
                    min-height: 48px !important;
                    display: flex !important;
                    align-items: center !important;
                }
                .premium-select-compact :global(.ant-select-selection-item) {
                    background: rgba(124, 92, 252, 0.15) !important;
                    border: 1px solid rgba(124, 92, 252, 0.3) !important;
                    color: #a78bfa !important;
                    border-radius: 6px !important;
                    margin-top: 4px !important;
                }
                .premium-select-compact :global(.ant-select-selection-placeholder) {
                    color: #4a4a5a !important;
                }
                .premium-select-compact :global(.ant-select-arrow) {
                    color: #6b6b80 !important;
                }
            `}</style>
        </>
    );
}
