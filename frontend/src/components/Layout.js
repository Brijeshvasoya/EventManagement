import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Space, Typography, ConfigProvider, theme, Drawer } from 'antd';
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
  ThunderboltOutlined,
  MenuOutlined
} from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';

const { Sider, Content } = Layout;
const { Text: AntText } = Typography;

export default function AppLayout({ children }) {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) return null;
  if (['/login', '/signup'].includes(router.pathname)) return <>{children}</>;

  const menuItems = [
    { key: '/dashboard', icon: <AppstoreOutlined />, label: <Link href="/dashboard">Dashboard</Link> },
    { key: '/browse', icon: <GlobalOutlined />, label: <Link href="/browse">Browse Events</Link> },
    ...(user?.role === 'ORGANIZER' || user?.role === 'ADMIN' ? [
      { key: '/events/create', icon: <PlusCircleOutlined />, label: <Link href="/events/create">Create Event</Link> },
      { key: '/vendors', icon: <ShopOutlined />, label: <Link href="/vendors">Vendors</Link> }
    ] : [])
  ];

  // Set the default selected key to handle the root path
  const selectedKey = router.pathname === '/' ? '/dashboard' : router.pathname;

  return (
    <ConfigProvider 
      theme={{ 
        algorithm: theme.darkAlgorithm,
        token: { 
          colorPrimary: '#7c5cfc', 
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          borderRadius: 14,
          colorBgContainer: '#16162b',
          colorBgElevated: '#1a1a2e',
          colorBorder: 'rgba(255, 255, 255, 0.08)',
          colorText: '#f0f0f5',
          colorTextSecondary: '#a0a0b8',
          colorBgLayout: '#0a0a0f',
          controlHeight: 40,
          fontSize: 14,
        } 
      }}
    >
      <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'row', background: '#0a0a0f' }}>
        <Sider 
          breakpoint="lg" 
          collapsedWidth="0"
          theme="dark"
          style={{ 
            background: 'rgba(22, 22, 43, 0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRight: '1px solid rgba(255, 255, 255, 0.06)',
            height: '100vh', 
            position: 'sticky', 
            top: 0, 
            left: 0, 
            zIndex: 999,
            boxShadow: '4px 0 24px rgba(0, 0, 0, 0.3)'
          }}
        >
          {/* Logo Section */}
          <div style={{ 
            height: '72px', 
            padding: '0 24px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #7c5cfc 0%, #00d4aa 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(124, 92, 252, 0.4)'
            }}>
              <ThunderboltOutlined style={{ color: 'white', fontSize: '18px' }} />
            </div>
            <Typography.Title level={4} style={{ 
              margin: 0, 
              background: 'linear-gradient(135deg, #7c5cfc 0%, #00d4aa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 800,
              letterSpacing: '-0.5px',
              fontSize: '1.3rem'
            }}>EventHub</Typography.Title>
          </div>
          
          {/* Navigation */}
          <Menu 
            theme="dark" 
            mode="inline" 
            selectedKeys={[selectedKey]} 
            items={menuItems} 
            style={{ 
              borderRight: 0, 
              marginTop: '16px',
              padding: '0 8px',
              background: 'transparent' 
            }}
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* User Section */}
          <div style={{ 
            position: 'absolute', 
            bottom: 0, 
            width: '100%', 
            padding: '20px 16px', 
            borderTop: '1px solid rgba(255, 255, 255, 0.06)', 
            background: 'rgba(10, 10, 15, 0.5)',
            backdropFilter: 'blur(10px)'
          }}>
            {user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '10px 12px',
                  background: 'rgba(124, 92, 252, 0.06)',
                  borderRadius: '12px',
                  border: '1px solid rgba(124, 92, 252, 0.1)',
                  marginBottom: '8px'
                }}>
                  <Avatar 
                    style={{ 
                      background: 'linear-gradient(135deg, #7c5cfc 0%, #00d4aa 100%)',
                      boxShadow: '0 4px 12px rgba(124, 92, 252, 0.3)',
                      flexShrink: 0
                    }} 
                    icon={<UserOutlined />} 
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                     <AntText strong style={{ fontSize: '13px', maxWidth: '120px', color: '#f0f0f5' }} ellipsis>{user.name}</AntText>
                     <AntText style={{ 
                       fontSize: '10px', 
                       textTransform: 'uppercase', 
                       letterSpacing: '1px',
                       color: '#7c5cfc',
                       fontWeight: 700
                     }}>{user.role}</AntText>
                  </div>
                </div>
                <Button 
                  type="default" 
                  block 
                  icon={<SettingOutlined />} 
                  onClick={() => router.push('/profile')}
                  style={{ 
                    borderRadius: '10px', 
                    border: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.03)',
                    color: '#a0a0b8',
                    height: '36px',
                    fontSize: '13px'
                  }}
                >Manage Profile</Button>
                <Button 
                  danger 
                  block 
                  icon={<LogoutOutlined />} 
                  onClick={logout}
                  style={{ 
                    borderRadius: '10px',
                    height: '36px',
                    fontSize: '13px'
                  }}
                >Logout</Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                 <Button 
                   type="default" 
                   block 
                   icon={<LoginOutlined />} 
                   onClick={() => router.push('/login')}
                   style={{ borderRadius: '10px', height: '38px' }}
                 >Login</Button>
                 <Button 
                   type="primary" 
                   block 
                   icon={<UserAddOutlined />} 
                   onClick={() => router.push('/signup')}
                   style={{ borderRadius: '10px', height: '38px' }}
                 >Sign Up</Button>
              </div>
            )}
          </div>
        </Sider>

        <Drawer
          title={<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><ThunderboltOutlined style={{ color: '#7c5cfc' }} /> EventHub</div>}
          placement="left"
          onClose={() => setMobileMenuOpen(false)}
          open={mobileMenuOpen}
          styles={{ 
            body: { padding: 0, display: 'flex', flexDirection: 'column', background: '#0a0a0f' },
            header: { background: '#1a1a2e', borderBottom: '1px solid rgba(255,255,255,0.06)' }
          }}
          width={280}
        >
          <Menu 
            theme="dark" 
            mode="inline" 
            selectedKeys={[selectedKey]} 
            items={menuItems} 
            style={{ borderRight: 0, background: 'transparent', padding: '16px 8px', flex: 1 }}
            onClick={() => setMobileMenuOpen(false)}
          />
          <div style={{ padding: '20px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', background: 'rgba(22, 22, 43, 0.85)' }}>
            {user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Button block onClick={() => { setMobileMenuOpen(false); router.push('/profile'); }}>Profile</Button>
                <Button danger block onClick={() => { setMobileMenuOpen(false); logout(); }}>Logout</Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Button block onClick={() => { setMobileMenuOpen(false); router.push('/login'); }}>Login</Button>
                <Button type="primary" block onClick={() => { setMobileMenuOpen(false); router.push('/signup'); }}>Sign Up</Button>
              </div>
            )}
          </div>
        </Drawer>

        <Layout style={{ background: '#0a0a0f', width: '100%' }}>
          {/* Mobile Header */}
          <div className="mobile-only-header" style={{
            display: 'none',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            background: 'rgba(22, 22, 43, 0.85)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            position: 'sticky',
            top: 0,
            zIndex: 99
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ThunderboltOutlined style={{ color: '#7c5cfc', fontSize: '20px' }} />
              <Typography.Title level={4} style={{ margin: 0, color: '#f0f0f5' }}>EventHub</Typography.Title>
            </div>
            <Button
              type="text"
              icon={<MenuOutlined style={{ fontSize: '20px', color: '#f0f0f5' }} />}
              onClick={() => setMobileMenuOpen(true)}
            />
          </div>

          <Content className="page-content" style={{ margin: '24px', overflow: 'initial' }}>
            {children}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
