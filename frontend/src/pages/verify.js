import React, { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { VERIFY_TICKET } from '@/features/events/graphql/queries';
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
        <Layout style={{ minHeight: '100vh', background: '#0f172a' }}>
            <Head><title>Fast-Pass Gate Entry | EventHub</title></Head>
            <Content style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                <div style={{ width: '100%', maxWidth: '500px' }}>
                    <Title level={2} style={{ color: 'white', textAlign: 'center', marginBottom: '2rem' }}>
                        <QrcodeOutlined /> Gate Check-in
                    </Title>

                    {!scanning && !lastScanned && (
                        <Card style={{
                            borderRadius: '24px',
                            textAlign: 'center',
                            padding: '3rem',
                            background: 'rgba(30, 41, 59, 0.7)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(10px)'
                        }}>
                            <CameraOutlined style={{ fontSize: '4rem', color: '#6366f1', marginBottom: '1.5rem' }} />
                            <Title level={4} style={{ color: 'white' }}>Scan Attendee QR</Title>
                            <Text style={{ color: '#94a3b8', display: 'block', marginBottom: '2rem' }}>
                                Point your camera at the digital or printed QR code on the guest's ticket.
                            </Text>
                            <Button
                                type="primary"
                                size="large"
                                block
                                onClick={() => setScanning(true)}
                                style={{ height: '56px', borderRadius: '14px', background: '#6366f1' }}
                            >
                                Activate Scanner
                            </Button>
                        </Card>
                    )}

                    {scanning && (
                        <div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', border: '4px solid #6366f1' }}>
                            <BarcodeScannerComponent
                                width={'100%'}
                                height={400}
                                onUpdate={handleScan}
                                torch={false}
                            />
                            <div style={{
                                position: 'absolute',
                                bottom: '20px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'rgba(0,0,0,0.6)',
                                padding: '8px 20px',
                                borderRadius: '20px',
                                color: 'white'
                            }}>
                                {loading ? <Spin size="small" /> : 'Align QR in frame'}
                            </div>
                        </div>
                    )}

                    {lastScanned && (
                        <Card style={{
                            borderRadius: '24px',
                            background: 'rgba(30, 41, 59, 1)',
                            border: `1px solid ${lastScanned.success ? '#10b981' : '#ef4444'}`,
                            overflow: 'hidden'
                        }}>
                            <Result
                                status={lastScanned.success ? "success" : "error"}
                                title={<span style={{ color: 'white' }}>{lastScanned.success ? "Access Granted" : "Invalid Ticket"}</span>}
                                subTitle={
                                    <Space direction="vertical" style={{ width: '100%', marginTop: '1rem' }}>
                                        {lastScanned.success ? (
                                            <>
                                                <div style={{ color: '#94a3b8' }}>Guest: <Text strong style={{ color: 'white' }}>{lastScanned.user.name}</Text></div>
                                                <div style={{ color: '#94a3b8' }}>Event: <Text strong style={{ color: 'white' }}>{lastScanned.event.title}</Text></div>
                                                <Tag color="green">CHECKED IN SUCCESSFULLY</Tag>
                                            </>
                                        ) : (
                                            <Text style={{ color: '#f87171' }}>{lastScanned.error}</Text>
                                        )}
                                    </Space>
                                }
                            />
                            <Button
                                block
                                size="large"
                                onClick={() => { setLastScanned(null); setScanning(true); setData('No result'); }}
                                style={{ marginTop: '1rem', height: '50px', background: '#334155', color: 'white', border: 'none' }}
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
