import React, { useState, useEffect, createContext, useContext } from 'react';
import { useQuery, useMutation, useSubscription } from '@apollo/client/react';
import { Form, Modal, Input, Drawer, Badge, Avatar, Typography, Button } from 'antd';
import { UserOutlined, SettingOutlined, BellOutlined, CheckCircleFilled, CheckOutlined } from '@ant-design/icons';
import { GET_MY_NOTIFICATIONS, MARK_NOTIFICATION_AS_READ, MARK_ALL_NOTIFICATIONS_AS_READ, UPDATE_PROFILE, GET_ME, NOTIFICATION_SUBSCRIPTION, UNREAD_NOTIFICATION_COUNT, GET_MY_BOOKINGS } from '@/features/events/graphql/queries';
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

  const { data: notificationData, refetch: refetchGlobalNotifications } = useQuery(GET_MY_NOTIFICATIONS, {
    skip: !user, fetchPolicy: 'cache-and-network'
  });

  const { data: countData, refetch: refetchCount } = useQuery(UNREAD_NOTIFICATION_COUNT, {
    skip: !user, fetchPolicy: 'cache-and-network'
  });
  const { refetch: refetchBookings } = useQuery(GET_MY_BOOKINGS);

  // Real-time Notification Subscription
  useEffect(() => {
    if (user) console.log('📡 Initializing PubSub Subscription link...');
  }, [user]);

  useSubscription(NOTIFICATION_SUBSCRIPTION, {
    skip: !user,
    onData: (result) => {
      console.log('📡 Subscription data received:', result);
      const data = result.data;
      const payload = data?.data?.notificationAdded || data?.notificationAdded;

      if (payload) {
        console.log('🔔 Notification payload:', payload);
        toast.success(`New Activity: ${payload.message.replace(/<[^>]*>?/gm, '')}`, {
          icon: '🔔',
          duration: 4000
        });
        refetchGlobalNotifications();
        refetchCount();
        refetchBookings();
      }
    },
    onError: (error) => {
      console.error('❌ Subscription Error:', error);
    }
  });

  const unreadCount = countData?.unreadNotificationCount || 0;
  if (unreadCount > 0) console.log('Current Badge Count:', unreadCount);

  const { data: meData } = useQuery(GET_ME, {
    skip: !user,
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    if (meData?.me && user) {
      const needsUpdate =
        meData.me.name !== user?.name ||
        meData.me.loyaltyPoints !== user?.loyaltyPoints ||
        meData.me.redeemedRewards?.length !== user?.redeemedRewards?.length;

      if (needsUpdate) {
        setUser({ ...user, ...meData.me });
      }
    }
  }, [meData, user, setUser]);

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
      refetchCount();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      toast.success('All notifications marked as read');
      refetchGlobalNotifications();
      refetchCount();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleOpenDrawer = () => {
    setIsDrawerVisible(true);
    refetchGlobalNotifications();
    refetchCount();
  };

  return (
    <GlobalActionsContext.Provider value={{
      mounted, user, unreadCount, handleOpenDrawer, setIsProfileModalVisible, refetchGlobalNotifications
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
            ) : (notificationData?.myNotifications || []).map((item) => {
              const typeConfig = {
                EVENT_REMINDER: { icon: '⏰', bg: '#FEF3C7', iconBg: '#FDE68A', iconColor: '#D97706' },
                TICKET_BOOKED: { icon: '🎟️', bg: '#ECFDF5', iconBg: '#A7F3D0', iconColor: '#059669' },
                BOOKING_CONFIRMED: { icon: '✅', bg: '#EFF6FF', iconBg: '#BFDBFE', iconColor: '#2563EB' },
                EVENT_CANCELLED: { icon: '❌', bg: '#FEF2F2', iconBg: '#FECACA', iconColor: '#DC2626' },
                TICKET_CHECKED_IN: { icon: '🤝', bg: '#F0F9FF', iconBg: '#BAE6FD', iconColor: '#0284C7' },
              };
              const cfg = item.read
                ? { icon: <CheckCircleFilled />, bg: 'white', iconBg: '#F1F5F9', iconColor: '#64748B', isIcon: true }
                : { ...(typeConfig[item.type] || { icon: '🔔', bg: '#FEE2E2', iconBg: '#FECACA', iconColor: '#EF4444' }), isIcon: false };

              return (
                <div
                  key={item.id}
                  onClick={() => handleMarkRead(item.id)}
                  style={{ background: cfg.bg, padding: '16px', borderRadius: '16px', border: '1px solid #F1F5F9', transition: 'all 0.3s ease', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start' }}
                >
                  <div style={{ background: cfg.iconBg, color: cfg.iconColor, width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cfg.isIcon ? '16px' : '20px', flexShrink: 0 }}>
                    {cfg.isIcon ? cfg.icon : cfg.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#1B2A4E', fontSize: '0.95rem', marginBottom: '4px' }}>{item.title}</div>
                    <div style={{ color: '#64748B', fontSize: '0.85rem', marginBottom: '6px' }} dangerouslySetInnerHTML={{ __html: item.message }} />
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>
                      {new Date(isNaN(item.createdAt) ? item.createdAt : parseInt(item.createdAt)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )
            })}

          </div>
        </Drawer>
      )}
    </GlobalActionsContext.Provider>
  );
}

export function TopbarMobileIcons() {
  const { mounted, user, unreadCount, handleOpenDrawer, setIsProfileModalVisible } = useContext(GlobalActionsContext);
  if (!mounted || !user) return null;

  return (
    <div className="mobile-only-flex" style={{ display: 'flex', gap: '10px' }}>
      <Badge count={unreadCount} offset={[-2, 6]}>
        <div
          className="hover-bounce"
          onClick={handleOpenDrawer}
          style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, rgb(27, 42, 78) 0%, rgb(49, 46, 129) 50%, rgb(67, 56, 202) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(27, 42, 78, 0.3)' }}
        >
          <BellOutlined style={{ fontSize: '18px' }} />
        </div>
      </Badge>
      <div className="hover-bounce" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#1B2A4E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(27, 42, 78, 0.2)' }} onClick={() => setIsProfileModalVisible(true)}>
        <SettingOutlined style={{ fontSize: '18px' }} />
      </div>
    </div>
  );
}

export function DesktopHeaderActions() {
  const { mounted, user, unreadCount, handleOpenDrawer, setIsProfileModalVisible } = useContext(GlobalActionsContext);
  if (!mounted || !user) return null;

  return (
    <div className="desktop-actions" style={{ display: 'flex', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        <Badge count={unreadCount} offset={[-2, 6]}>
          <div
            className="hover-bounce"
            onClick={handleOpenDrawer}
            style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, rgb(27, 42, 78) 0%, rgb(49, 46, 129) 50%, rgb(67, 56, 202) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(27, 42, 78, 0.3)' }}
          >
            <BellOutlined style={{ fontSize: '20px' }} />
          </div>
        </Badge>
      </div>
      <div className="dashboard-profile-mobile" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '12px' }}>
        <Avatar size={44} style={{ background: 'var(--gradient-main)', color: 'white' }} icon={<UserOutlined />} />
        <div>
          <div style={{ fontWeight: 700, color: '#1B2A4E', fontSize: '0.95rem' }}>{user.name || 'User'}</div>
          <div style={{ color: '#6B7280', fontSize: '0.8rem', textTransform: 'capitalize' }}>{user.role?.toLowerCase() || 'User'}</div>
        </div>
      </div>
    </div>
  );
}
