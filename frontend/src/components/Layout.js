import React, { useEffect, useState } from 'react';
import { TopbarMobileIcons, DesktopHeaderActions } from './GlobalActions';
import { Button, Avatar, Typography, ConfigProvider, theme, Drawer, Dropdown } from 'antd';
import {
  AppstoreOutlined,
  GlobalOutlined,
  PlusCircleOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  LoginOutlined,
  UserAddOutlined,
  ShopOutlined,
  MenuOutlined,
  CalendarOutlined,
  DollarCircleOutlined,
  ScanOutlined,
  CreditCardOutlined
} from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';

const { Text: AntText } = Typography;

export default function AppLayout({ children }) {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isPlanExpired = user?.role === 'ORGANIZER' &&
    user?.isPlanPurchased &&
    user?.planExpiresAt &&
    new Date(user.planExpiresAt) < new Date();

  useEffect(() => {
    if (!loading && user && user.role === 'ORGANIZER') {
      // Block access to all routes if no plan purchased or plan expired
      // Allow /plans and /billing always so organizer can subscribe or view invoices
      if ((!user.isPlanPurchased || isPlanExpired) &&
        router.pathname !== '/plans' &&
        router.pathname !== '/billing' &&
        router.pathname !== '/login' &&
        router.pathname !== '/signup') {
        router.replace('/plans');
      }
      // Active organizers can freely visit /plans (read-only locked view)
    }
  }, [user, loading, router, isPlanExpired]);

  if (loading) return null;
  if (['/login', '/signup', '/forgot-password', '/feedback'].includes(router.pathname) || router.pathname.startsWith('/reset-password') || router.pathname.startsWith('/feedback/')) return <>{children}</>;

  let menuItems = [];
  if (user?.role === 'SUPER_ADMIN') {
    menuItems = [
      { key: '/dashboard', icon: <AppstoreOutlined />, label: 'Dashboard' },
      { key: '/superadmin/events', icon: <GlobalOutlined />, label: 'All Events' },
      { key: '/superadmin', icon: <UserOutlined />, label: 'Total Users' },
      { key: '/superadmin/payments', icon: <DollarCircleOutlined />, label: 'Payment Tracking' },
      { key: '/superadmin/tickets', icon: <ScanOutlined />, label: 'All Tickets' }
    ];
  } else {
    menuItems = [
      { key: '/dashboard', icon: <AppstoreOutlined />, label: 'Dashboard' },
      ...(!user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN') ? [
        { key: '/browse', icon: <GlobalOutlined />, label: 'Browse Events' }
      ] : []),
      ...(user?.role === 'ORGANIZER' || user?.role === 'ADMIN' ? [
        { key: '/my-events', icon: <CalendarOutlined />, label: 'My Events' },
        { key: '/transactions', icon: <DollarCircleOutlined />, label: 'Transactions' },
        { key: '/events/create', icon: <PlusCircleOutlined />, label: 'Create Event' },
        { key: '/vendors', icon: <ShopOutlined />, label: 'Vendors' },
        { key: '/verify', icon: <ScanOutlined />, label: 'Scan Ticket' },
        { key: '/billing', icon: <CreditCardOutlined />, label: 'Billing' },
        { key: '/plans', icon: <AppstoreOutlined />, label: 'Plans' }
      ] : [])
    ];
  }

  if (user?.role === 'ORGANIZER' && !user?.isPlanPurchased) {
    menuItems.length = 0; // Clear all menus — no plan yet
    menuItems.push({ key: '/plans', icon: <AppstoreOutlined />, label: 'Choose Plan' });
  }

  const selectedKey = router.pathname === '/' ? '/dashboard' : router.pathname;

  const NavItem = ({ item, isMobile = false }) => {
    const isActive = selectedKey === item.key ||
      (selectedKey.startsWith(item.key + '/') && item.key !== '/' && item.key !== '/superadmin');
    return (
      <Link href={item.key} style={{ textDecoration: 'none', width: '100%' }} onClick={() => isMobile && setMobileMenuOpen(false)}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: isMobile ? '16px 20px' : '14px 20px',
          margin: '4px 0',
          borderRadius: '12px',
          background: isActive ? 'rgba(67, 56, 202, 0.08)' : 'transparent',
          color: isActive ? 'rgb(67, 56, 202)' : '#6B7280',
          fontWeight: isActive ? 700 : 500,
          fontSize: isMobile ? '1.1rem' : '1rem',
          position: 'relative',
          transition: 'all 0.2s',
          cursor: 'pointer',
        }}
          onMouseOver={e => {
            if (!isActive) {
              e.currentTarget.style.color = '#111827';
              e.currentTarget.style.background = '#F3F4F6';
            }
          }}
          onMouseOut={e => {
            if (!isActive) {
              e.currentTarget.style.color = '#6B7280';
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          {/* Active Left Border Indicator */}
          {isActive && (
            <div style={{ position: 'absolute', left: '-16px', top: '10%', height: '80%', width: '4px', background: 'rgb(67, 56, 202)', borderRadius: '0 4px 4px 0' }} />
          )}
          <span style={{ fontSize: isMobile ? '1.4rem' : '1.3rem', pointerEvents: 'none' }}>{item.icon}</span>
          <span style={{ pointerEvents: 'none' }}>{item.label}</span>
        </div>
      </Link>
    );
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: 'rgb(67, 56, 202)',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          borderRadius: 12,
          controlHeight: 44,
          fontSize: 14,
          colorBgContainer: '#FFFFFF',
          colorText: '#1F2937',
          colorTextSecondary: '#6B7280',
          colorBorder: '#E5E7EB',
        }
      }}
    >
      <div style={{ minHeight: '100vh', background: 'var(--bg-color)', display: 'flex', position: 'relative' }}>

        {/* ULTRA-PREMIUM FLOATING SIDEBAR (Desktop) */}
        <aside className="desktop-only" style={{
          width: '260px',
          height: 'calc(100vh - 40px)',
          position: 'sticky',
          top: '20px',
          marginLeft: '20px',
          background: 'var(--bg-secondary)',
          borderRadius: '24px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 100,
          border: '1px solid rgba(0,0,0,0.02)'
        }}>
          {/* Logo Space */}
          <div style={{ padding: '32px 24px 24px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => router.push("/dashboard")}>
            <img src="/logo.png" alt="EventHub Logo" style={{ width: '44px', height: '44px', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            <h2 style={{
              margin: 0,
              color: 'var(--text-primary)',
              fontWeight: 800,
              letterSpacing: '-0.5px',
              fontSize: '1.5rem'
            }}>
              EventHub
            </h2>
          </div>

          {/* Navigation Items */}
          <nav style={{ padding: '0 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', lineHeight: "0.5" }}>
            {menuItems.map(item => <NavItem key={item.key} item={item} />)}
          </nav>

          {/* User Bottom Profile */}
          <div style={{ padding: '24px', borderTop: '1px solid var(--glass-border)', background: 'transparent' }}>
            {user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Avatar size={44} style={{ background: 'var(--gradient-main)' }} icon={<UserOutlined />} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>{user.role}</div>
                  </div>
                </div> */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button type="primary" icon={<SettingOutlined style={{ color: 'white' }} />} onClick={() => router.push('/profile')} style={{ flex: 1, borderRadius: '12px', background: 'linear-gradient(135deg, rgb(27, 42, 78) 0%, rgb(49, 46, 129) 100%)', border: 'none' }} />
                  <div
                    onClick={logout}
                    style={{
                      flex: 1,
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #FF3B3B 0%, #950101 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      height: '44px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(149, 1, 1, 0.3)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <LogoutOutlined style={{ fontSize: '1.2rem' }} />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Button type="primary" block onClick={() => router.push('/signup')} style={{ borderRadius: '12px', fontWeight: 700, height: '44px' }}>Get Started</Button>
                <Button type="text" block onClick={() => router.push('/login')} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Log In</Button>
              </div>
            )}
          </div>
        </aside>

        {/* MOBILE TOPBAR */}
        <header className="mobile-only" style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: '70px',
          background: 'var(--card-bg)', backdropFilter: 'blur(30px)',
          borderBottom: '1px solid var(--glass-border)', zIndex: 1000,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0 20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo.png" alt="EventHub Logo" style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '8px' }} />
            <h2 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 900, fontSize: '1.4rem' }}>EventHub</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TopbarMobileIcons />
            <Button type="text" icon={<MenuOutlined style={{ fontSize: '24px', color: 'var(--text-primary)' }} />} onClick={() => setMobileMenuOpen(true)} />
          </div>
        </header>

        {/* MOBILE DRAWER */}
        <Drawer
          title={<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><img src="/logo.png" alt="logo" style={{ width: '28px', borderRadius: '8px' }} /> <span style={{ fontWeight: 800 }}>EventHub</span></div>}
          placement="right"
          onClose={() => setMobileMenuOpen(false)}
          open={mobileMenuOpen}
          styles={{
            body: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-color)' },
            header: { background: 'var(--bg-secondary)', borderBottom: '1px solid var(--glass-border)' }
          }}
          size="default"
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {menuItems.map(item => <NavItem key={item.key} item={item} isMobile={true} />)}
          </div>

          <div style={{ padding: '24px 0 0 0', borderTop: '1px solid var(--glass-border)' }}>
            {user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <Avatar size={48} style={{ background: 'var(--gradient-main)' }} icon={<UserOutlined />} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{user.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{user.role}</div>
                  </div>
                </div>
                <Button size="large" block icon={<SettingOutlined />} onClick={() => { setMobileMenuOpen(false); router.push('/profile'); }} style={{ borderRadius: '14px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>Profile Settings</Button>
                <div
                  onClick={() => { setMobileMenuOpen(false); logout(); }}
                  style={{
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #FF3B3B 0%, #950101 100%)',
                    color: 'white',
                    height: '54px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(149, 1, 1, 0.3)'
                  }}
                >
                  <LogoutOutlined style={{ fontSize: '1.2rem' }} /> Logout
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Button size="large" block icon={<LoginOutlined />} onClick={() => { setMobileMenuOpen(false); router.push('/login'); }} style={{ borderRadius: '14px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-primary)' }}>Login</Button>
                <Button size="large" type="primary" block icon={<UserAddOutlined />} onClick={() => { setMobileMenuOpen(false); router.push('/signup'); }} style={{ borderRadius: '14px' }}>Sign Up</Button>
              </div>
            )}
          </div>
        </Drawer>

        {/* RIGHT COLUMN — sticky header + scrollable content */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

          {/* STICKY DESKTOP HEADER */}
          <div className="desktop-only" style={{
            position: 'sticky',
            top: 0,
            zIndex: 200,
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '16px 40px',
            background: 'var(--bg-color)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}>
            <DesktopHeaderActions />
          </div>

          {/* MAIN CONTENT AREA */}
          <main className="page-content block-reveal" style={{
            flex: 1,
            padding: '0 40px 40px',
            maxWidth: '100%',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Mobile spacer */}
            <div className="mobile-only" style={{ height: '70px', flexShrink: 0 }} />

            {children}
          </main>
        </div>
      </div>

      <style jsx global>{`
        /* Media Queries for Layout Responsiveness */
        .desktop-only { display: flex !important; }
        .mobile-only { display: none !important; }
        
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .mobile-only { display: flex !important; }
          .page-content { padding: 24px !important; }
        }
        
        /* Reveal Animation for Main Content */
        .block-reveal {
          animation: fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>
    </ConfigProvider>
  );
}
