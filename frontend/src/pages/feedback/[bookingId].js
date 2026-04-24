import { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { Form, Input, Button, Rate, Typography, ConfigProvider, Card, Result } from 'antd';
import { StarFilled, MessageOutlined, SendOutlined, ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const GET_BOOKING_DETAILS = gql`
  query GetBookingForFeedback($id: ID!) {
    feedbackInfo(bookingId: $id) {
      id
      eventTitle
      organizerName
      status
    }
  }
`;

const SUBMIT_FEEDBACK = gql`
  mutation SubmitFeedback($bookingId: ID!, $rating: Int!, $comment: String) {
    submitFeedback(bookingId: $bookingId, rating: $rating, comment: $comment) {
      id
      rating
    }
  }
`;

export default function FeedbackPage() {
  const router = useRouter();
  const { bookingId } = router.query;
  const [success, setSuccess] = useState(false);

  const { data, loading: querying } = useQuery(GET_BOOKING_DETAILS, {
    variables: { id: bookingId },
    skip: !bookingId,
  });

  const [submitFeedback, { loading: submitting }] = useMutation(SUBMIT_FEEDBACK);

  const booking = data?.feedbackInfo;

  const onFinish = async (values) => {
    try {
      await submitFeedback({
        variables: {
          bookingId,
          rating: values.rating,
          comment: values.comment
        }
      });
      setSuccess(true);
      toast.success('Thank you for your feedback! 🌟');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (querying) return null;

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: 'rgb(67, 56, 202)',
          borderRadius: 20,
          controlHeight: 48,
        }
      }}
    >
      <Head>
        <title>Feedback | EventHub</title>
      </Head>

      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        background: 'linear-gradient(rgba(255, 255, 255, 0.8) 0%, rgba(67, 56, 202, 0.1) 100%)',
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
        fontFamily: "'Inter', sans-serif"
      }}>
        {/* Animated Background Elements */}
        <div className="glass-orb o1"></div>
        <div className="glass-orb o2"></div>
        <div className="glass-orb o3"></div>
        <div className="spinning-circle sc1"></div>
        <div className="spinning-circle sc1"></div>
        <div className="glow-light g1"></div>
        <div className="glow-light g2"></div>

        {/* Left Side: Branding */}
        <div style={{
          flex: 1.5,
          padding: '80px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 5
        }} className="hide-mobile">

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
            <div className="logo-pulse-container" style={{
              width: '64px', height: '64px', background: 'white',
              borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 10px 30px rgba(67, 56, 202, 0.15)',
              position: 'relative',
              animation: 'popIn 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
              <img src="/logo.png" alt="Icon" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
              <div className="pulse-ring"></div>
            </div>
            <h1 style={{ fontSize: '4.5rem', fontWeight: 900, color: '#312E81', margin: 0, letterSpacing: '-2px' }}>
              <span className="text-reveal">Your </span>{" "}
              <span className="text-reveal" style={{ animationDelay: '0.2s' }}>Voice</span>
            </h1>
          </div>

          <p style={{ fontSize: '1.2rem', color: '#64748B', maxWidth: '500px', marginBottom: '60px', lineHeight: 1.6, animation: 'fadeInUp 1s ease-out 0.4s both' }}>
            Your feedback helps us recognize top-tier organizers and craft better experiences for the entire community.
          </p>

          {/* Social Proof Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            animation: 'fadeInUp 1s ease-out 0.8s both'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {[
                'https://i.pravatar.cc/100?u=9',
                'https://i.pravatar.cc/100?u=10',
                'https://i.pravatar.cc/100?u=11',
                'https://i.pravatar.cc/100?u=12'
              ].map((url, i) => (
                <div key={i} style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundImage: `url(${url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: '2px solid white',
                  marginLeft: i === 0 ? 0 : '-12px',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                }}></div>
              ))}
            </div>
            <div>
              <div style={{ color: '#FBBF24', fontSize: '1rem', marginBottom: '2px' }}>
                {"★ ★ ★ ★ ★"}
              </div>
              <div style={{ color: '#64748B', fontSize: '0.9rem', fontWeight: 500 }}>
                Join <span style={{ color: '#1B2A4E', fontWeight: 700 }}>thousands</span> sharing thoughts
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Card */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>

          <div className="rotating-square" style={{
            position: 'absolute',
            width: '500px',
            height: '500px',
            background: 'linear-gradient(45deg, rgba(67, 56, 202, 0.08), rgba(139, 92, 246, 0.08))',
            borderRadius: '60px',
            animation: 'rotate 20s linear infinite',
            zIndex: 1
          }} />

          {!success ? (
            <div className="feedback-card breathe" style={{
              width: '100%',
              maxWidth: '440px',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              padding: '50px 40px',
              borderRadius: '32px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.05)',
              position: 'relative',
              zIndex: 2,
              animation: 'scaleUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
              {/* Event Header */}
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <div className="logo-hover" style={{ width: '56px', height: '56px', background: 'white', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', position: 'relative', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                  <StarFilled style={{ fontSize: '24px', color: 'rgb(67, 56, 202)' }} />
                  <div className="spinner-ring"></div>
                </div>
                <Title level={3} style={{ margin: 0, color: '#1E293B', fontWeight: 800 }}>Event Feedback</Title>
                <Text type="secondary" style={{ fontSize: '0.9rem', display: 'block', marginTop: '4px' }}>
                  Rate <strong>{booking?.eventTitle || 'the event'}</strong>
                </Text>
                {booking?.organizerName && (
                  <div style={{ marginTop: '8px', color: 'rgb(67, 56, 202)', fontWeight: 600, fontSize: '0.85rem' }}>
                    Organizer: {booking.organizerName}
                  </div>
                )}
              </div>

              <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <Form.Item name="rating" rules={[{ required: true, message: 'Please select a rating' }]}>
                    <Rate
                      allowHalf={false}
                      style={{ fontSize: '32px', color: '#FBBF24' }}
                    />
                  </Form.Item>
                </div>

                <Form.Item
                  label={<Text style={{ fontWeight: 700, color: '#94A3B8', fontSize: '0.75rem', letterSpacing: '1px' }}>YOUR COMMENTS</Text>}
                  name="comment"
                >
                  <Input.TextArea
                    rows={3}
                    placeholder="What did you think of the event?"
                    style={{ borderRadius: '12px', padding: '12px', background: 'white', border: '1px solid #EDEDED' }}
                  />
                </Form.Item>

                <Form.Item style={{ marginTop: '30px', marginBottom: 0 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={submitting}
                    block
                    className="pulse-btn"
                    icon={<SendOutlined />}
                    style={{ height: '54px', borderRadius: '12px', background: 'linear-gradient(90deg, #1B2A4E 0%, #312E81 100%)', border: 'none', fontWeight: 800, fontSize: '0.9rem', color: 'white', letterSpacing: '1px' }}
                  >
                    SUBMIT REVIEW
                  </Button>
                </Form.Item>
              </Form>

              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <Button type="link" onClick={() => router.push('/dashboard')} icon={<ArrowLeftOutlined />} style={{ color: '#1B2A4E', fontWeight: 700, fontSize: '0.85rem' }}>
                  Back to Dashboard
                </Button>
              </div>
            </div>
          ) : (
            <div className="feedback-card" style={{
              width: '100%',
              maxWidth: '440px',
              background: 'white',
              padding: '60px 40px',
              borderRadius: '32px',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
              position: 'relative',
              zIndex: 2
            }}>
              <div style={{ width: '64px', height: '64px', background: 'white', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 10px 30px rgba(16, 185, 129, 0.15)' }}>
                <CheckCircleOutlined style={{ fontSize: '32px', color: '#10B981' }} />
              </div>
              <Title level={2} style={{ margin: 0, color: '#1B2A4E', fontWeight: 800 }}>Success!</Title>
              <p style={{ color: '#64748B', fontSize: '0.95rem', marginTop: '16px', lineHeight: 1.6 }}>
                Your feedback has been recorded. It helps the community find the best experiences!
              </p>
              <Button
                type="primary"
                size="large"
                onClick={() => router.push('/dashboard')}
                className="pulse-btn"
                style={{ marginTop: '32px', borderRadius: '12px', height: '54px', background: 'linear-gradient(90deg, #1B2A4E 0%, #312E81 100%)', border: 'none', fontWeight: 800, color: 'white', width: '100%' }}
              >
                GO TO DASHBOARD
              </Button>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .ant-rate-star { margin-right: 12px !important; }
        .ant-form-item-label > label { height: auto !important; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .feedback-card {
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </ConfigProvider>
  );
}
