import React, { useState, useEffect, createContext, useContext } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Form, Modal, Input, Drawer, Badge, Avatar, Typography, Button } from 'antd';
import { UserOutlined, SettingOutlined, BellOutlined, CheckCircleFilled, CheckOutlined } from '@ant-design/icons';
import { GET_MY_NOTIFICATIONS, UNREAD_NOTIFICATION_COUNT, MARK_NOTIFICATION_AS_READ, MARK_ALL_NOTIFICATIONS_AS_READ, UPDATE_PROFILE, GET_ME } from '@/features/events/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

const { Text: AntText } = Typography;

export const GlobalActionsContext = createContext({});

export function GlobalActionsProvider({ children }) {
  const { user, setUser } = useAuth();

  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [profileForm] = Form.useForm();
  const [mounted, setMounted] = useState(false);

  const { data: unreadCountData, refetch: refetchUnreadCount } = useQuery(UNREAD_NOTIFICATION_COUNT, {
    skip: !user, fetchPolicy: 'cache-and-network', pollInterval: 30000
  });

  const { data: notificationData, refetch: refetchGlobalNotifications } = useQuery(GET_MY_NOTIFICATIONS, {
    skip: !user, fetchPolicy: 'cache-and-network'
  });

  useQuery(GET_ME, {
    skip: !user,
    fetchPolicy: 'cache-and-network',
    onCompleted: (data) => {
      if (data.me && data.me.name !== user?.name) setUser({ ...user, ...data.me });
    }
  });

  const [updateProfile, { loading: updating }] = useMutation(UPDATE_PROFILE);
  const [markRead] = useMutation(MARK_NOTIFICATION_AS_READ);
  const [markAllRead] = useMutation(MARK_ALL_NOTIFICATIONS_AS_READ);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user && isProfileModalVisible) {
      profileForm.setFieldsValue({ name: user.name, email: user.email });
    }
  }, [user, isProfileModalVisible, profileForm]);

  const handleProfileSubmit = async (values) => {
    try {
      const { data } = await updateProfile({ variables: values });
      setUser({ ...user, name: data.updateProfile.name, email: data.updateProfile.email });
      toast.success('Profile updated successfully! ✨');
      setIsProfileModalVisible(false);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await markRead({ variables: { id } });
      refetchGlobalNotifications();
      refetchUnreadCount();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      toast.success('All notifications marked as read');
      refetchGlobalNotifications();
      refetchUnreadCount();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleOpenDrawer = async () => {
    setIsDrawerVisible(true);
    try {
      await markAllRead();
      refetchUnreadCount();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <GlobalActionsContext.Provider value={{
      mounted, user, unreadCountData, handleOpenDrawer, setIsProfileModalVisible, refetchGlobalNotifications
    }}>
      {children}

      {/* Profile Modal */}
      {user && (
        <Modal title={<div style={{ fontSize: '1.4rem', fontWeight: 800 }}>Update Profile</div>} open={isProfileModalVisible} onCancel={() => setIsProfileModalVisible(false)} footer={null} centered destroyOnHidden>
          <Form form={profileForm} layout="vertical" onFinish={handleProfileSubmit} style={{ marginTop: '20px' }}>
            <Form.Item label="Full Name" name="name" rules={[{ required: true }]}><Input size="large" style={{ borderRadius: '12px' }} /></Form.Item>
            <Form.Item label="Email Address" name="email" rules={[{ required: true, type: 'email' }]}><Input disabled size="large" style={{ borderRadius: '12px' }} /></Form.Item>
            <Button type="primary" htmlType="submit" loading={updating} block size="large" style={{ marginTop: '10px', borderRadius: '12px', height: '50px', fontWeight: 700, background: 'linear-gradient(135deg, rgb(27, 42, 78) 0%, rgb(49, 46, 129) 100%)' }}>Save Changes</Button>
          </Form>
        </Modal>
      )}

      {/* Notifications Drawer */}
      {user && (
        <Drawer
          title={<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1B2A4E' }}>Activity Stream</span><Button type="text" onClick={handleMarkAllRead} icon={<CheckOutlined />} style={{ color: 'rgb(67, 56, 202)' }}>Archive All</Button></div>}
          placement="right"
          onClose={() => setIsDrawerVisible(false)}
          open={isDrawerVisible}
          size="default"
          closeIcon={null}
          styles={{ header: { padding: '24px', borderBottom: 'none' }, body: { padding: '0 24px 24px', background: '#FAFAFA' } }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(notificationData?.myNotifications || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8', fontSize: '0.9rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔔</div>
                No notifications yet
              </div>
            ) : (notificationData?.myNotifications || []).map((item) => (
              <div
                key={item.id}
                onClick={() => handleMarkRead(item.id)}
                style={{ background: item.read ? 'white' : '#FEE2E2', padding: '16px', borderRadius: '16px', border: '1px solid #F1F5F9', transition: 'all 0.3s ease', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start' }}
              >
                <div style={{ background: item.read ? '#F1F5F9' : '#FECACA', color: item.read ? '#64748B' : '#EF4444', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                  {item.read ? <CheckCircleFilled /> : <BellOutlined />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#1B2A4E', fontSize: '0.95rem', marginBottom: '4px' }}>{item.title}</div>
                  <div style={{ color: '#64748B', fontSize: '0.85rem', marginBottom: '6px' }}>{item.message}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>
                    {new Date(parseInt(item.createdAt)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Drawer>
      )}
    </GlobalActionsContext.Provider>
  );
}

export function TopbarMobileIcons() {
  const { mounted, user, unreadCountData, handleOpenDrawer, setIsProfileModalVisible } = useContext(GlobalActionsContext);
  if (!mounted || !user) return null;

  return (
    <div className="mobile-only-flex" style={{ display: 'none', gap: '10px' }}>
      {["ORGANIZER", "ADMIN"]?.includes(user?.role) && (
        <Badge count={unreadCountData?.unreadNotificationCount || 0} offset={[-2, 6]}>
          <div
            className="hover-bounce"
            onClick={handleOpenDrawer}
            style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, rgb(27, 42, 78) 0%, rgb(49, 46, 129) 50%, rgb(67, 56, 202) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(27, 42, 78, 0.3)' }}
          >
            <BellOutlined style={{ fontSize: '18px' }} />
          </div>
        </Badge>
      )}
      <div className="hover-bounce" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#1B2A4E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(27, 42, 78, 0.2)' }} onClick={() => setIsProfileModalVisible(true)}>
        <SettingOutlined style={{ fontSize: '18px' }} />
      </div>
    </div>
  );
}

export function DesktopHeaderActions() {
  const { mounted, user, unreadCountData, handleOpenDrawer, setIsProfileModalVisible } = useContext(GlobalActionsContext);
  if (!mounted || !user) return null;

  return (
    <div className="desktop-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        {["ORGANIZER", "ADMIN"]?.includes(user?.role) && (
          <Badge count={unreadCountData?.unreadNotificationCount || 0} offset={[-2, 6]}>
            <div
              className="hover-bounce"
              onClick={handleOpenDrawer}
              style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, rgb(27, 42, 78) 0%, rgb(49, 46, 129) 50%, rgb(67, 56, 202) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(27, 42, 78, 0.3)' }}
            >
              <BellOutlined style={{ fontSize: '20px' }} />
            </div>
          </Badge>
        )}
        <div className="hover-bounce" style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#1B2A4E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(27, 42, 78, 0.2)' }} onClick={() => setIsProfileModalVisible(true)}>
          <SettingOutlined style={{ fontSize: '20px' }} />
        </div>
      </div>
      <div className="dashboard-profile-mobile" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '12px' }}>
        <Avatar size={44} style={{ background: '#E5E7EB', color: '#1B2A4E' }} icon={<UserOutlined />} />
        <div>
          <div style={{ fontWeight: 700, color: '#1B2A4E', fontSize: '0.95rem' }}>{user.name || 'User'}</div>
          <div style={{ color: '#6B7280', fontSize: '0.8rem', textTransform: 'capitalize' }}>{user.role?.toLowerCase() || 'User'}</div>
        </div>
      </div>
    </div>
  );
}
