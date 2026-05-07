import React, { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { VERIFY_TICKET } from '@/features/events/graphql/mutations';
import { Layout, Typography, Card, Button, Result, Spin, message, Space, Tag } from 'antd';
import { QrcodeOutlined, CheckCircleOutlined, CloseCircleOutlined, CameraOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import BarcodeScannerComponent from 'react-qr-barcode-scanner';
import { useRouter } from 'next/router';
import Head from 'next/head';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function TicketVerifier() {
    const router = useRouter();
    const [data, setData] = useState('No result');
    const [scanning, setScanning] = useState(false);
    const [lastScanned, setLastScanned] = useState(null);

    const [verifyTicket, { loading }] = useMutation(VERIFY_TICKET, {
        onCompleted: (data) => {
            setLastScanned({ ...data.verifyTicket, success: true });
            message.success(`Verified: ${data.verifyTicket.user.name}`);
            setScanning(false);
        },
        onError: (err) => {
            setLastScanned({ error: err.message, success: false });
            message.error(err.message);
            setScanning(false);
        }
    });

    const handleScan = (err, result) => {
        if (result && !loading) {
            const text = result.text;
            let bookingId = text;

            // Handle both legacy "ticket:ID" and new URL "http://.../v/ID"
            if (text.includes('/v/')) {
                bookingId = text.split('/v/').pop();
            } else {
                bookingId = text.replace('ticket:', '');
            }

            if (bookingId && bookingId !== data) {
                setData(bookingId);
                verifyTicket({ variables: { bookingId } });
            }
        }
    };

    return (
        <Layout style={{ minHeight: '100vh', background: '#F8FAFC' }}>
            <Head><title>Fast-Pass Gate Entry | EventHub</title></Head>
            <Content style={{ padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                <div style={{ width: '100%', maxWidth: '480px' }}>
                    <Title level={3} style={{ color: '#1B2A4E', textAlign: 'center', marginBottom: '2rem', fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
                        <QrcodeOutlined style={{ color: '#4338CA' }} /> Gate Check-in
                    </Title>

                    {!scanning && !lastScanned && (
                        <Card style={{
                            borderRadius: '28px',
                            textAlign: 'center',
                            padding: '40px 24px',
                            background: 'white',
                            border: '1px solid rgba(67, 56, 202, 0.08)',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.04)'
                        }}>
                            <div style={{ 
                                width: '70px', height: '70px', 
                                background: 'rgba(67, 56, 202, 0.05)', 
                                borderRadius: '20px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 24px'
                            }}>
                                <CameraOutlined style={{ fontSize: '2rem', color: '#4338CA' }} />
                            </div>
                            <Title level={4} style={{ color: '#1B2A4E', fontSize: '1.4rem', fontWeight: 800 }}>Scan Attendee QR</Title>
                            <Text style={{ color: '#64748B', display: 'block', marginBottom: '2rem', fontSize: '1rem', lineHeight: 1.6 }}>
                                Point your camera at the digital or printed QR code on the guest's ticket.
                            </Text>
                            <Button
                                type="primary"
                                size="large"
                                block
                                onClick={() => setScanning(true)}
                                style={{ 
                                    height: '56px', 
                                    borderRadius: '16px', 
                                    background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)', 
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    border: 'none',
                                    boxShadow: '0 10px 20px rgba(79, 70, 229, 0.15)'
                                }}
                            >
                                Activate Scanner
                            </Button>
                        </Card>
                    )}

                    {scanning && (
                        <div style={{ width: '100%' }}>
                            <div style={{ position: 'relative', borderRadius: '32px', overflow: 'hidden', border: '4px solid #4338CA', background: '#000', boxShadow: '0 20px 40px rgba(67, 56, 202, 0.15)' }}>
                                <BarcodeScannerComponent
                                    width={'100%'}
                                    height={320}
                                    onUpdate={handleScan}
                                    torch={false}
                                />
                                <div style={{
                                    position: 'absolute',
                                    bottom: '24px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: 'rgba(0,0,0,0.7)',
                                    backdropFilter: 'blur(10px)',
                                    padding: '10px 20px',
                                    borderRadius: '16px',
                                    color: 'white',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    {loading ? <Spin size="small" /> : null}
                                    {loading ? 'Verifying Ticket...' : 'Align QR in Frame'}
                                </div>
                            </div>
                            <Button 
                                block 
                                size="large"
                                onClick={() => setScanning(false)}
                                style={{ 
                                    marginTop: '24px', 
                                    height: '56px', 
                                    borderRadius: '16px', 
                                    background: 'white', 
                                    color: '#EF4444', 
                                    border: '1px solid rgba(239, 68, 68, 0.2)', 
                                    fontWeight: 700 
                                }}
                            >
                                Cancel Scanning
                            </Button>
                        </div>
                    )}

                    {lastScanned && (
                        <Card
                            variant="borderless"
                            style={{
                                borderRadius: '28px',
                                background: 'white',
                                border: `1.5px solid ${lastScanned.success ? '#10b981' : '#ef4444'}`,
                                overflow: 'hidden',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.06)'
                            }}
                            styles={{ body: { padding: '32px 24px' } }}
                        >
                            <Result
                                status={lastScanned.success ? "success" : "error"}
                                title={<span style={{ color: '#1B2A4E', fontSize: '1.5rem', fontWeight: 900 }}>{lastScanned.success ? "Access Granted ✨" : "Invalid Ticket ❌"}</span>}
                                subTitle={
                                    <Space direction="vertical" style={{ width: '100%', marginTop: '0.8rem' }}>
                                        {lastScanned.success ? (
                                            <>
                                                <div style={{ color: '#64748B', fontSize: '1rem', fontWeight: 500 }}>Guest: <Text strong style={{ color: '#1B2A4E' }}>{lastScanned.user.name}</Text></div>
                                                <div style={{ color: '#64748B', fontSize: '1rem', fontWeight: 500 }}>Event: <Text strong style={{ color: '#1B2A4E' }}>{lastScanned.event.title}</Text></div>
                                                <Tag color="green" style={{ marginTop: 12, borderRadius: 100, padding: '4px 16px', fontWeight: 800 }}>✓ CHECKED IN</Tag>
                                            </>
                                        ) : (
                                            <Text style={{ color: '#EF4444', fontSize: '1rem', fontWeight: 600 }}>{lastScanned.error}</Text>
                                        )}
                                    </Space>
                                }
                            />
                            <Button
                                block
                                size="large"
                                onClick={() => { setLastScanned(null); setScanning(true); setData('No result'); }}
                                style={{ 
                                    marginTop: '2rem', 
                                    height: '56px', 
                                    borderRadius: '16px', 
                                    background: '#F1F5F9', 
                                    color: '#475569', 
                                    border: 'none', 
                                    fontWeight: 700 
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#E2E8F0'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#F1F5F9'}
                            >
                                Scan Next
                            </Button>
                        </Card>
                    )}
                </div>
            </Content>
        </Layout>
    );
}
