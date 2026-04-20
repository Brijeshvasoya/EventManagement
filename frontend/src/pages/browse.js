import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_EVENTS, GET_MY_BOOKINGS, CANCEL_BOOKING, CREATE_CHECKOUT_SESSION, DELETE_EVENT, UPDATE_EVENT, GET_MY_VENDORS } from '@/features/events/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import Head from 'next/head';
import { Tabs, Card, Tag, Badge, Button, Modal, Spin, Empty, Descriptions, Popconfirm, Select, InputNumber, Divider, Tooltip, Form, Input, DatePicker, Upload, Table, Typography } from 'antd';
import { CalendarOutlined, EnvironmentOutlined, CheckCircleOutlined, CloseCircleOutlined, ShoppingCartOutlined, WalletOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined, UploadOutlined, TeamOutlined, UserOutlined, MailOutlined, DollarCircleOutlined, ShopOutlined, EyeOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useRouter } from 'next/router';


export default function Browse() {
    const router = useRouter();
    const { user } = useAuth();
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState('');
    const [editForm] = Form.useForm();

    const [bookingOptions, setBookingOptions] = useState({ ticketType: '', quantity: 1 });

    const { data: eventData, loading: eventLoading, refetch: refetchEvents } = useQuery(GET_EVENTS, { fetchPolicy: 'cache-and-network' });
    const { data: bookingData, refetch: refetchBookings } = useQuery(GET_MY_BOOKINGS, {
        fetchPolicy: 'network-only'
    });
    const { data: vendorData, loading: vendorLoading } = useQuery(GET_MY_VENDORS, {
        skip: !user || user.role === 'USER'
    });
    const [editVendorIds, setEditVendorIds] = useState([]);
    const [aiImageLoading, setAiImageLoading] = useState(false);

    const [cancel] = useMutation(CANCEL_BOOKING);
    const [deleteEvent] = useMutation(DELETE_EVENT);
    const [updateEvent, { loading: updating }] = useMutation(UPDATE_EVENT);
    const [createCheckout, { loading: sessionLoading }] = useMutation(CREATE_CHECKOUT_SESSION);

    const handleAIImageGenerate = async () => {
        const title = editForm.getFieldValue('title');
        const eventType = editForm.getFieldValue('eventType');

        if (!title) return toast.error("Please enter an event title first!");
        setAiImageLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}:4000/api/ai/generate-image`, {
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

    if (eventLoading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '100px', flexDirection: 'column', gap: '16px' }}>
            <div style={{
                width: '48px', height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #7c5cfc 0%, #00d4aa 100%)',
                animation: 'pulse-glow 2s ease-in-out infinite',
                boxShadow: '0 8px 24px rgba(124, 92, 252, 0.3)'
            }} />
            <span style={{ color: '#a0a0b8', fontWeight: 500 }}>Discovering Events...</span>
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
        const file = info.file.originFileObj || info.file;
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
                        date: values.date.toISOString(),
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
            console.error("Update Error:", e);
            toast.error(e.message);
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteEvent({ variables: { id } });
            toast.success('Event deleted successfully');
            refetchEvents();
        } catch (e) {
            toast.error(e.message);
        }
    };

    const openBooking = (event) => {
        const firstType = event.ticketTypes?.[0]?.name || 'Standard';
        setSelectedEvent(event);
        setBookingOptions({ ticketType: firstType, quantity: 1 });
        setIsBookingModalOpen(true);
        setIsDetailModalOpen(false);
    };

    const handleCheckout = async () => {
        try {
            const { data } = await createCheckout({
                variables: {
                    eventId: selectedEvent.id,
                    ticketType: bookingOptions.ticketType,
                    quantity: bookingOptions.quantity
                }
            });
            window.location.href = data.createCheckoutSession;
        } catch (e) {
            toast.error(e.message);
        }
    };

    const handleCancel = async (eventId) => {
        const booking = myBookings.find(b => b.event.id === eventId);
        if (!booking) return;
        try {
            await cancel({ variables: { id: booking.id } });
            toast.success('Reservation cancelled successfully');
            refetchBookings();
            setIsDetailModalOpen(false);
        } catch (e) {
            toast.error(e.message);
        }
    };

    const showDetails = (event, isOwner) => {
        if (isOwner) {
            router.push(`/events/${event.id}`);
        } else {
            setSelectedEvent(event);
            setIsDetailModalOpen(true);
        }
    };

    const EventGrid = ({ events, emptyMsg }) => (
        events.length === 0 ? (
            <div style={{
                padding: '5rem 2rem',
                textAlign: 'center',
                background: 'rgba(22, 22, 35, 0.5)',
                borderRadius: '24px',
                border: '2px dashed rgba(255,255,255,0.06)'
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }}>🔍</div>
                <p style={{ color: '#6b6b80', fontSize: '1.1rem', margin: 0 }}>{emptyMsg}</p>
            </div>
        ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '30px' }}>
                {events.map((e, index) => {
                    const isBooked = myBookedEventIds.includes(e.id);
                    const isOwner = user?.id === e.organizer?.id || user?.role === 'ADMIN';

                    return (
                        <Card
                            key={e.id}
                            hoverable
                            cover={
                                <div onClick={() => showDetails(e, isOwner)} style={{
                                    height: '220px',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    cursor: 'pointer'
                                }}>
                                    <img
                                        src={e.imageUrl || '/event-placeholder.jpg'}
                                        style={{
                                            width: '100%', height: '100%', objectFit: 'cover',
                                            transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)'
                                        }}
                                        onMouseOver={ev => ev.currentTarget.style.transform = 'scale(1.05)'}
                                        onMouseOut={ev => ev.currentTarget.style.transform = 'scale(1)'}
                                    />
                                    {/* Gradient overlay */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        height: '50%',
                                        background: 'linear-gradient(to top, rgba(10, 10, 15, 0.8) 0%, transparent 100%)',
                                        pointerEvents: 'none'
                                    }} />
                                    {isBooked && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '14px',
                                            right: '14px',
                                            background: 'rgba(0, 212, 170, 0.15)',
                                            backdropFilter: 'blur(10px)',
                                            border: '1px solid rgba(0, 212, 170, 0.3)',
                                            color: '#00d4aa',
                                            padding: '6px 14px',
                                            borderRadius: '100px',
                                            fontWeight: 700,
                                            fontSize: '0.75rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px'
                                        }}>
                                            <CheckCircleOutlined /> Booked
                                        </div>
                                    )}
                                </div>
                            }
                            actions={isOwner ? [
                                <Tooltip title="Event Analytics & Attendees" key="view">
                                    <Link href={`/events/${e.id}`}>
                                        <EyeOutlined style={{ color: '#00d4aa' }} />
                                    </Link>
                                </Tooltip>,
                                <Tooltip title="Edit Event" key="edit">
                                    <EditOutlined onClick={() => handleEditOpen(e)} style={{ color: '#7c5cfc' }} />
                                </Tooltip>,
                                <Popconfirm
                                    key="delete"
                                    title="Delete this event?"
                                    description="This action cannot be undone."
                                    onConfirm={() => handleDelete(e.id)}
                                    okText="Yes"
                                    cancelText="No"
                                    icon={<ExclamationCircleOutlined style={{ color: '#ff4d6a' }} />}
                                >
                                    <Tooltip title="Delete Event"><DeleteOutlined style={{ color: '#ff4d6a' }} /></Tooltip>
                                </Popconfirm>
                            ] : []}
                            style={{
                                borderRadius: '24px',
                                overflow: 'hidden',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                background: 'rgba(22, 22, 35, 0.8)',
                                backdropFilter: 'blur(20px)',
                                transition: 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                                animation: `fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${index * 0.08}s forwards`,
                                opacity: 0
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <Tag color="blue" style={{ borderRadius: '8px', fontWeight: 600 }}>{e.eventType || 'Public'}</Tag>
                                <span style={{
                                    color: '#6b6b80',
                                    fontSize: '0.8rem',
                                    fontFamily: 'monospace',
                                    background: 'rgba(255,255,255,0.03)',
                                    padding: '2px 8px',
                                    borderRadius: '6px'
                                }}>#{e.id.slice(-6).toUpperCase()}</span>
                            </div>
                            <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#f0f0f5', marginBottom: '14px', lineHeight: 1.25 }}>{e.title}</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', color: '#a0a0b8' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
                                    <CalendarOutlined style={{ color: '#7c5cfc' }} />
                                    {new Date(parseInt(e.date) || e.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
                                    <EnvironmentOutlined style={{ color: '#00d4aa' }} /> {e.location}
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        )
    );

    const upcomingEvents = allEvents.filter(e => {
        const isUpcoming = new Date(parseInt(e.date) || e.date) >= now;
        if (user?.role === 'ORGANIZER') {
            return isUpcoming && e.organizer?.id === user.id;
        }
        return isUpcoming;
    });

    const completedEvents = allEvents.filter(e => {
        const isPast = new Date(parseInt(e.date) || e.date) < now;
        if (user?.role === 'ORGANIZER') {
            return isPast && e.organizer?.id === user.id;
        }
        return isPast;
    });

    // BETTER: Get Participated events directly from myBookings
    const participatedEvents = myBookings
        .map(b => b.event)
        .filter(e => !!e); // remove nulls

    return (
        <>
            <Head><title>Browse Events | EventHub</title></Head>
            <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', minHeight: '100vh' }}>
                {/* Premium Hero */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: '4rem',
                    marginTop: '2rem',
                    position: 'relative'
                }}>
                    <div style={{
                        display: 'inline-block',
                        padding: '6px 16px',
                        background: 'rgba(124, 92, 252, 0.1)',
                        border: '1px solid rgba(124, 92, 252, 0.2)',
                        borderRadius: '100px',
                        color: '#7c5cfc',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '1.5px',
                        marginBottom: '1.5rem'
                    }}>
                        ✨ Discover Amazing Events
                    </div>
                    <h1 style={{
                        fontSize: '3.8rem',
                        fontWeight: '900',
                        background: 'linear-gradient(135deg, #f0f0f5 0%, #a0a0b8 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-2.5px',
                        marginBottom: '1rem',
                        lineHeight: 1.1
                    }}>
                        Explore Experiences
                    </h1>
                    <p style={{ fontSize: '1.15rem', color: '#6b6b80', maxWidth: '520px', margin: '0 auto', lineHeight: 1.6 }}>
                        Find and join top-rated events curated for you.
                    </p>
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

                {/* EVENT DETAIL MODAL */}
                <Modal open={isDetailModalOpen} onCancel={() => setIsDetailModalOpen(false)} footer={null} width={800} centered styles={{ body: { padding: 0 } }} style={{ borderRadius: '32px', overflow: 'hidden' }}>
                    {selectedEvent && (
                        <div>
                            <div style={{ position: 'relative' }}>
                                <img src={selectedEvent.imageUrl || '/event-placeholder.jpg'} style={{ width: '100%', height: '320px', objectFit: 'cover' }} />
                                <div style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    height: '60%',
                                    background: 'linear-gradient(to top, #16162b 0%, transparent 100%)'
                                }} />
                            </div>
                            <div style={{ padding: '32px 40px 40px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                                    <div>
                                        <Tag color={new Date(parseInt(selectedEvent.date) || selectedEvent.date) < now ? "default" : "blue"} style={{ marginBottom: '12px' }}>
                                            {new Date(parseInt(selectedEvent.date) || selectedEvent.date) < now ? "Completed" : selectedEvent.eventType}
                                        </Tag>
                                        <h2 style={{ fontSize: '2.2rem', fontWeight: '900', color: '#f0f0f5', margin: 0, letterSpacing: '-1px' }}>{selectedEvent.title}</h2>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
                                        {myBookedEventIds.includes(selectedEvent.id) ? (
                                            <>
                                                <Tag color="green" style={{ fontSize: '0.9rem', padding: '8px 16px', borderRadius: '10px' }}><CheckCircleOutlined /> Booked</Tag>
                                                {new Date(parseInt(selectedEvent.date) || selectedEvent.date) >= now && (
                                                    <Popconfirm title="Are you sure you want to cancel?" onConfirm={() => handleCancel(selectedEvent.id)}>
                                                        <Button danger icon={<CloseCircleOutlined />} size="large" style={{ borderRadius: '12px' }}>Cancel</Button>
                                                    </Popconfirm>
                                                )}
                                            </>
                                        ) : (
                                            /* Hide Reserve Spot button if user is the organizer, show analytics link instead */
                                            user?.id === selectedEvent.organizer?.id ? (
                                                <Button
                                                    type="primary"
                                                    size="large"
                                                    icon={<EyeOutlined />}
                                                    onClick={() => router.push(`/events/${selectedEvent.id}`)}
                                                    style={{ borderRadius: '12px', height: '50px', padding: '0 32px', fontWeight: 'bold', background: 'linear-gradient(135deg, #00d4aa 0%, #00b890 100%)', border: 'none' }}
                                                >
                                                    Full Analytics
                                                </Button>
                                            ) : (
                                                new Date(parseInt(selectedEvent.date) || selectedEvent.date) >= now && (
                                                    <Button
                                                        type="primary"
                                                        size="large"
                                                        onClick={() => openBooking(selectedEvent)}
                                                        style={{ borderRadius: '12px', height: '50px', padding: '0 36px', fontWeight: 'bold' }}
                                                    >
                                                        Reserve Spot
                                                    </Button>
                                                )
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* Info grid */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(4, 1fr)',
                                    gap: '16px',
                                    marginBottom: '32px'
                                }}>
                                    {[
                                        { label: 'Date & Time', value: new Date(parseInt(selectedEvent.date) || selectedEvent.date).toLocaleString(), icon: <CalendarOutlined /> },
                                        { label: 'Venue', value: selectedEvent.location, icon: <EnvironmentOutlined /> },
                                        { label: 'Capacity', value: `${selectedEvent.capacity} Guests`, icon: <TeamOutlined /> },
                                        { label: 'Status', value: 'Active', icon: <CheckCircleOutlined /> }
                                    ].map((item, i) => (
                                        <div key={i} style={{
                                            padding: '16px',
                                            background: 'rgba(255,255,255,0.03)',
                                            borderRadius: '14px',
                                            border: '1px solid rgba(255,255,255,0.06)'
                                        }}>
                                            <div style={{ color: '#7c5cfc', marginBottom: '8px', fontSize: '1rem' }}>{item.icon}</div>
                                            <div style={{ color: '#6b6b80', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{item.label}</div>
                                            <div style={{ color: '#f0f0f5', fontWeight: 600, fontSize: '0.9rem' }}>{item.value}</div>
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <h3 style={{ fontWeight: '800', marginBottom: '12px', color: '#f0f0f5' }}>Description</h3>
                                    <p style={{ fontSize: '1rem', lineHeight: '1.8', color: '#a0a0b8' }}>{selectedEvent.description}</p>
                                </div>

                                {/* ATTENDEE LIST FOR ORGANIZER */}
                                {(user?.id === selectedEvent.organizer?.id || user?.role === 'ADMIN') && (
                                    <div style={{ marginTop: '40px' }}>
                                        <Divider />
                                        <h3 style={{ fontWeight: '800', fontSize: '1.3rem', marginBottom: '20px', color: '#f0f0f5' }}>
                                            <TeamOutlined /> Attendee List
                                        </h3>
                                        <Table
                                            dataSource={selectedEvent.attendees}
                                            pagination={{ pageSize: 5 }}
                                            rowKey="id"
                                            columns={[
                                                {
                                                    title: 'User',
                                                    key: 'user',
                                                    render: (_, record) => (
                                                        <div>
                                                            <div style={{ fontWeight: 'bold', color: '#f0f0f5' }}><UserOutlined /> {record.user.name}</div>
                                                            <div style={{ fontSize: '0.85rem', color: '#6b6b80' }}><MailOutlined /> {record.user.email}</div>
                                                        </div>
                                                    )
                                                },
                                                {
                                                    title: 'Ticket Type',
                                                    dataIndex: 'ticketType',
                                                    key: 'ticketType',
                                                    render: (type) => <Tag color="purple">{type}</Tag>
                                                },
                                                {
                                                    title: 'Quantity',
                                                    dataIndex: 'quantity',
                                                    key: 'quantity',
                                                    align: 'center',
                                                    render: (qty) => <span style={{ fontWeight: 'bold', color: '#f0f0f5' }}>{qty}</span>
                                                },
                                                {
                                                    title: 'Total Amount',
                                                    dataIndex: 'amountPaid',
                                                    key: 'amountPaid',
                                                    render: (amt) => <span style={{ fontWeight: '800', color: '#00d4aa' }}><DollarCircleOutlined /> ${amt}</span>
                                                }
                                            ]}
                                        />
                                    </div>
                                )}

                                {/* VENDOR LIST FOR ORGANIZER */}
                                {(user?.id === selectedEvent.organizer?.id || user?.role === 'ADMIN') && selectedEvent.vendors?.length > 0 && (
                                    <div style={{ marginTop: '40px' }}>
                                        <Divider />
                                        <h3 style={{ fontWeight: '800', fontSize: '1.3rem', marginBottom: '20px', color: '#f0f0f5' }}>
                                            <ShopOutlined /> Assigned Vendors
                                        </h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                                            {selectedEvent.vendors.map(v => (
                                                <Card key={v.id} size="small" style={{
                                                    borderRadius: '16px',
                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                    background: 'rgba(255,255,255,0.03)'
                                                }}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#f0f0f5' }}>{v.name}</div>
                                                    <Tag color="blue" style={{ marginTop: '6px' }}>{v.category}</Tag>
                                                    <div style={{ marginTop: '8px', color: '#00d4aa', fontWeight: 'bold' }}>${v.cost}</div>
                                                    {v.contactInfo && <div style={{ fontSize: '0.85rem', color: '#6b6b80', marginTop: '4px' }}>{v.contactInfo}</div>}
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </Modal>

                {/* TICKET SELECTION MODAL */}
                <Modal
                    title={<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><WalletOutlined /> Select Your Tickets</span>}
                    open={isBookingModalOpen}
                    onCancel={() => setIsBookingModalOpen(false)}
                    footer={[
                        <Button key="back" onClick={() => setIsBookingModalOpen(false)}>Cancel</Button>,
                        <Button key="submit" type="primary" loading={sessionLoading} onClick={handleCheckout} style={{ height: '40px', borderRadius: '10px' }}>
                            Proceed to Secure Payment
                        </Button>
                    ]}
                    centered
                >
                    {selectedEvent && (
                        <div style={{ padding: '20px 0' }}>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#a0a0b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Choose Ticket Tier</label>
                                <Select style={{ width: '100%', height: '45px' }} value={bookingOptions.ticketType} onChange={(val) => setBookingOptions({ ...bookingOptions, ticketType: val })} options={selectedEvent.ticketTypes.map(t => ({ label: `${t.name} - $${t.price}`, value: t.name }))} />
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#a0a0b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quantity</label>
                                <InputNumber min={1} max={10} style={{ width: '100%', height: '45px', lineHeight: '45px' }} value={bookingOptions.quantity} onChange={(val) => setBookingOptions({ ...bookingOptions, quantity: val })} />
                            </div>
                            <Divider />
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '16px 20px',
                                background: 'rgba(124, 92, 252, 0.06)',
                                borderRadius: '14px',
                                border: '1px solid rgba(124, 92, 252, 0.1)'
                            }}>
                                <span style={{ fontSize: '1rem', color: '#a0a0b8' }}>Estimated Total:</span>
                                <span style={{ fontSize: '1.8rem', fontWeight: '900', background: 'linear-gradient(135deg, #7c5cfc, #00d4aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                    ${(selectedEvent.ticketTypes.find(t => t.name === bookingOptions.ticketType)?.price || 0) * bookingOptions.quantity}
                                </span>
                            </div>
                        </div>
                    )}
                </Modal>

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
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                            <Form.Item name="title" label={<label style={{ fontWeight: '600', color: '#a0a0b8', fontSize: '0.85rem' }}>Event Title *</label>} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                <Input placeholder="e.g. Next.js Dev Con" style={{ borderRadius: '10px', padding: '10px 14px' }} />
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

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
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
