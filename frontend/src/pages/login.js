import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { Form, Input, Button, Typography, ConfigProvider } from 'antd';
import { MailOutlined, LockOutlined, ThunderboltOutlined, BarChartOutlined, GlobalOutlined, CustomerServiceOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';

const { Text: AntText } = Typography;

// Animation Variants
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) { token }
  }
`;

export default function Login() {
  const { login, user } = useAuth();
  const [loginM, { loading }] = useMutation(LOGIN_MUTATION);
  const router = useRouter();
  const { returnUrl } = router.query;

  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const onFinish = async (values) => {
    try {
      const { data } = await loginM({ variables: values });
      toast.success('Welcome back! ✨');
      login(data.login.token, returnUrl || '/dashboard');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: 'rgb(67, 56, 202)',
          fontFamily: "'Inter', sans-serif",
          borderRadius: 20,
          controlHeight: 48,
        }
      }}
    >
      <Head>
        <title>Sign In | EventHub</title>
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
        {/* RE-ADDED: Round Type Glass Circles Animation */}
        <div className="glass-orb o1"></div>
        <div className="glass-orb o2"></div>
        <div className="glass-orb o3"></div>

        {/* Decorative Spinning Circles */}
        <div className="spinning-circle sc1"></div>
        <div className="spinning-circle sc2"></div>

        {/* Orbiting Glow Lights */}
        <div className="glow-light g1"></div>
        <div className="glow-light g2"></div>

        {/* Floating Event Elements Animation */}
        <div className="event-item e1">🎫</div>
        <div className="event-item e2">🎉</div>
        <div className="event-item e3">📅</div>
        <div className="event-item e4">🎵</div>

        {/* Left Side: Branding */}
        <motion.div 
          initial="initial"
          animate="animate"
          variants={staggerContainer}
          style={{
            flex: 1.5,
            padding: '80px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 5
          }} className="hide-mobile"
        >

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
            <motion.div 
              variants={{
                initial: { scale: 0.5, opacity: 0 },
                animate: { scale: 1, opacity: 1 }
              }}
              className="logo-pulse-container" 
              style={{
                width: '64px', height: '64px', background: 'white',
                borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 10px 30px rgba(67, 56, 202, 0.15)',
                position: 'relative'
              }}
            >
              <Image src="/logo.png" alt="Icon" width={40} height={40} style={{ objectFit: 'contain' }} />
              <div className="pulse-ring"></div>
            </motion.div>
            <motion.h1 
              variants={fadeInUp}
              style={{ fontSize: '4.5rem', fontWeight: 900, color: '#312E81', margin: 0, letterSpacing: '-2px' }}
            >
              <span>Welcome </span>{" "}
              <span style={{ color: 'rgb(67, 56, 202)' }}>back</span>
            </motion.h1>
          </div>

          <motion.p 
            variants={fadeInUp}
            style={{ fontSize: '1.2rem', color: '#64748B', maxWidth: '500px', marginBottom: '60px', lineHeight: 1.6 }}
          >
            Access your events dashboard and monitor your global impact in real-time.
          </motion.p>

          <motion.div 
            variants={staggerContainer}
            className="grid-cols-2" 
            style={{ gap: '20px', maxWidth: '700px', marginBottom: '48px' }}
          >
            {[
              { icon: <ThunderboltOutlined />, title: 'Smart Sync', desc: 'Real-time booking' },
              { icon: <BarChartOutlined />, title: 'Insight Pro', desc: 'Growth analytics' }
            ].map((item, i) => (
              <motion.div 
                key={i} 
                variants={fadeInUp}
                whileHover={{ scale: 1.05, x: 10 }}
                className="feature-card" 
                style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(10px)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(67, 56, 202, 0.1)' }}
              >
                <div style={{ fontSize: '1.5rem', color: 'rgb(67, 56, 202)' }}>{item.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, color: '#1B2A4E', fontSize: '0.95rem' }}>{item.title}</div>
                  <div style={{ color: '#64748B', fontSize: '0.8rem' }}>{item.desc}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Social Proof Bar */}
          <motion.div 
            variants={fadeInUp}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {[
                'https://i.pravatar.cc/100?u=1',
                'https://i.pravatar.cc/100?u=2',
                'https://i.pravatar.cc/100?u=12',
                'https://i.pravatar.cc/100?u=4'
              ].map((url, i) => (
                <motion.div 
                  key={i} 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.8 + (i * 0.1) }}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundImage: `url(${url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: '2px solid white',
                    marginLeft: i === 0 ? 0 : '-12px',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                  }}
                ></motion.div>
              ))}
            </div>
            <div>
              <div style={{ color: '#FBBF24', fontSize: '1rem', marginBottom: '2px' }}>
                {"★ ★ ★ ★ ★"}
              </div>
              <div style={{ color: '#64748B', fontSize: '0.9rem', fontWeight: 500 }}>
                <span style={{ color: '#1B2A4E', fontWeight: 700 }}>4.9 / 5</span> from 2,400+ reviews
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Right Side: Card */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>

          <motion.div 
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="rotating-square" 
            style={{
              position: 'absolute',
              width: '500px',
              height: '500px',
              background: 'linear-gradient(45deg, rgba(67, 56, 202, 0.08), rgba(139, 92, 246, 0.08))',
              borderRadius: '60px',
              zIndex: 1
            }} 
          />

          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
            className="login-card breathe" 
            style={{
              width: '100%',
              maxWidth: '440px',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              padding: '50px 40px',
              borderRadius: '32px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.05)',
              position: 'relative',
              zIndex: 2
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <div className="logo-hover" style={{ width: '56px', height: '56px', background: 'white', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', position: 'relative', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                <Image src="/logo.png" alt="Icon" width={40} height={40} style={{ objectFit: 'contain' }} />
                <div className="spinner-ring"></div>
              </div>
              <p style={{ color: '#64748B', fontSize: '0.9rem', fontWeight: 600 }}>Authorize to access your ecosystem.</p>
            </div>

            <Form layout="vertical" onFinish={onFinish} size="large" requiredMark={false}>
              <Form.Item label={<span style={{ fontWeight: 700, fontSize: '0.75rem', color: '#94A3B8' }}>EMAIL ADDRESS</span>} name="email" rules={[{ required: true, message: 'Required' }, { type: 'email' }]}>
                <Input prefix={<MailOutlined style={{ color: '#94A3B8', marginRight: '10px' }} />} placeholder="Enter your email" className="focus-glow" style={{ background: 'white', border: '1px solid #EDEDED', borderRadius: '10px' }} />
              </Form.Item>

              <Form.Item label={<span style={{ fontWeight: 700, fontSize: '0.75rem', color: '#94A3B8' }}>PASSWORD</span>} name="password" rules={[{ required: true, message: 'Required' }]}>
                <Input.Password prefix={<LockOutlined style={{ color: '#94A3B8', marginRight: '10px' }} />} placeholder="••••••••" className="focus-glow" style={{ background: 'white', border: '1px solid #EDEDED', borderRadius: '10px' }} />
              </Form.Item>

              <div style={{ textAlign: 'right', marginTop: '-12px', marginBottom: '20px' }}>
                <Link href="/forgot-password" style={{ color: 'rgb(67, 56, 202)', fontSize: '0.85rem', fontWeight: 600 }}>Forgot Password?</Link>
              </div>

              <Form.Item style={{ marginTop: '40px' }}>
                <Button type="primary" htmlType="submit" loading={loading} block className="pulse-btn" style={{ height: '54px', borderRadius: '12px', background: 'linear-gradient(90deg, #1B2A4E 0%, #312E81 100%)', border: 'none', fontWeight: 800, fontSize: '0.9rem', color: 'white', letterSpacing: '1px' }}>
                  SIGN IN TO DASHBOARD <ArrowRightOutlined style={{ marginLeft: '8px' }} />
                </Button>
              </Form.Item>
            </Form>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>New to the mission? </span>
              <Link href="/signup" style={{ color: '#1B2A4E', fontWeight: 700, fontSize: '0.85rem' }}>Create Account</Link>
            </div>
          </motion.div>
      </div>
    </div>

      <style jsx global>{`
        body { margin: 0; padding: 0; overflow: hidden; }
        .hide-mobile {
          @media (max-width: 1024px) { display: none !important; }
        }

        /* RE-ADDED: Round Glass Pearls Animation */
        .glass-orb {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.4);
          z-index: 1;
          animation: floatOrb 20s infinite ease-in-out;
        }
        .o1 { width: 150px; height: 150px; top: 10%; right: 15%; animation-duration: 25s; }
        .o2 { width: 100px; height: 100px; bottom: 15%; left: 10%; animation-duration: 18s; animation-delay: -5s; }
        .o3 { width: 70px; height: 70px; top: 40%; left: 35%; animation-duration: 22s; }

        @keyframes floatOrb {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(50px, -50px) scale(1.1); }
        }

        /* Decorative Spinning Circles */
        .spinning-circle {
          position: absolute;
          border-radius: 50%;
          border: 1px dashed rgba(67, 56, 202, 0.15);
          z-index: 0;
          animation: rotate 60s infinite linear;
        }
        .sc1 { width: 1000px; height: 1000px; top: -20%; left: -20%; }
        .sc2 { width: 700px; height: 700px; bottom: -10%; right: -10%; animation-direction: reverse; }

        .spinner-ring {
          position: absolute;
          width: 70px;
          height: 70px;
          border: 2px solid transparent;
          border-top-color: rgba(67, 56, 202, 0.5);
          border-radius: 50%;
          animation: rotate 3s infinite linear;
        }

        .pulse-ring {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          border: 4px solid rgba(67, 56, 202, 0.2);
          border-radius: 18px;
          animation: ringPulse 2s infinite ease-out;
        }
        @keyframes ringPulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.8); opacity: 0; }
        }

        .glow-light {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          z-index: 0;
          opacity: 0.15;
          animation: orbit 25s infinite linear;
        }
        .g1 { width: 600px; height: 600px; background: rgba(67, 56, 202, 0.4); top: -200px; left: -200px; }
        .g2 { width: 500px; height: 500px; background: rgba(139, 92, 246, 0.3); bottom: -150px; right: 5%; animation-direction: reverse; }
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(50px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(50px) rotate(-360deg); }
        }

        .text-reveal {
          display: inline-block;
          animation: revealUp 0.8s cubic-bezier(0.19, 1, 0.22, 1) both;
        }
        @keyframes revealUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .breathe {
          animation: breatheEffect 6s infinite ease-in-out;
        }
        @keyframes breatheEffect {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-8px) scale(1.002); }
        }

        .focus-glow:focus, .ant-input-affix-wrapper-focused {
          box-shadow: 0 0 0 4px rgba(67, 56, 202, 0.1) !important;
          border-color: rgb(67, 56, 202) !important;
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(49, 46, 129, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(49, 46, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(49, 46, 129, 0); }
        }
        .pulse-btn:hover { animation: pulse 1.5s infinite; }

        .event-item {
          position: absolute;
          font-size: 2rem;
          opacity: 0.15;
          animation: floatItem 15s infinite linear;
          z-index: 0;
          user-select: none;
        }
        .e1 { top: 10%; left: 5%; }
        .e2 { top: 20%; left: 40%; animation-delay: -5s; }
        .e3 { top: 60%; left: 10%; animation-delay: -2s; }
        .e4 { top: 70%; left: 45%; }

        @keyframes floatItem {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.15; }
          90% { opacity: 0.15; }
          100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </ConfigProvider>
  );
}
