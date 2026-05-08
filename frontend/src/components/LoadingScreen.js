import React from 'react';
import { Spin, Typography } from 'antd';

const { Text } = Typography;

const LoadingScreen = ({ message = "Loading..." }) => {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      width: '100%',
      flexDirection: 'column', 
      gap: '24px',
      background: 'var(--bg-color)',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999
    }}>
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        {/* Premium Pulse Background */}
        <div style={{
          position: 'absolute',
          width: '80px',
          height: '80px',
          borderRadius: '24px',
          background: 'var(--gradient-main)',
          opacity: 0.1,
          animation: 'pulse-glow 2s ease-in-out infinite'
        }} />
        <Spin size="large" />
      </div>
      
      <div style={{ textAlign: 'center', animation: 'fadeUp 0.8s ease-out' }}>
        <Text style={{ 
          color: 'var(--text-primary)', 
          fontWeight: 800, 
          fontSize: '1.2rem',
          display: 'block',
          marginBottom: '6px',
          letterSpacing: '-0.5px'
        }}>
          {message}
        </Text>
        <Text style={{ 
          color: 'var(--text-muted)', 
          fontSize: '0.9rem',
          fontWeight: 500,
          letterSpacing: '0.2px'
        }}>
          Preparing your premium experience
        </Text>
      </div>
    </div>
  );
};

export default LoadingScreen;
