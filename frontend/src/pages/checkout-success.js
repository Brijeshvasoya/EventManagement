import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useMutation } from '@apollo/client/react';
import { BOOK_EVENT } from '@/features/events/graphql/queries';
import toast from 'react-hot-toast';
import Head from 'next/head';

export default function CheckoutSuccess() {
  const router = useRouter();
  const { eventId, ticketType, quantity, sessionId } = router.query;
  const [bookEvent] = useMutation(BOOK_EVENT);
  const processed = useRef(false);

  useEffect(() => {
    if (!router.isReady || processed.current) return;

    const finalizeBooking = async () => {
      if (!eventId) return;
      console.log("eventId", eventId);
      console.log("ticketType", ticketType);
      console.log("quantity", quantity);
      console.log("sessionId", sessionId);
      processed.current = true;

      try {
        toast.loading('Confirming your payment and booking...', { id: 'finalize' });

        // SYNC: Exactly match the arguments for BOOK_EVENT mutation
        await bookEvent({
          variables: {
            id: eventId,
            ticketType: ticketType || 'Regular',
            quantity: parseInt(quantity) || 1,
            amountPaid: 0.0,
            stripePaymentId: sessionId || `RECOVERED_${Date.now()}`
          }
        });

        toast.success('Booking Successful! 🎉', { id: 'finalize' });
        setTimeout(() => router.push('/dashboard'), 2000);
      } catch (err) {
        // If webhook already processed it, we just show success anyway!
        if (err.message.includes('Already booked')) {
          toast.success('Booking Confirmed! 🎉', { id: 'finalize' });
          setTimeout(() => router.push('/dashboard'), 1500);
          return;
        }

        // console.error(err);
        toast.error('Booking confirmation failed. Please check your history.', { id: 'finalize' });
        setTimeout(() => router.push('/dashboard'), 3000);
      }
    };

    finalizeBooking();
  }, [router.isReady, eventId]);

  return (
    <>
      <Head><title>Payment Verified | EventHub</title></Head>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        flexDirection: 'column',
        position: 'relative'
      }}>
        {/* Background orbs */}
        <div style={{
          position: 'absolute',
          top: '20%', right: '20%',
          width: '300px', height: '300px',
          background: 'radial-gradient(circle, rgba(0, 212, 170, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'floatOrb 8s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '20%', left: '15%',
          width: '250px', height: '250px',
          background: 'radial-gradient(circle, rgba(124, 92, 252, 0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'floatOrb 10s ease-in-out infinite reverse'
        }} />

        <div style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          animation: 'scaleIn 0.6s cubic-bezier(0.22, 1, 0.36, 1)'
        }}>
          {/* Success Icon */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #00d4aa 0%, #00b890 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '2rem',
            fontSize: '2.5rem',
            boxShadow: '0 16px 40px rgba(0, 212, 170, 0.3)',
            animation: 'pulse-glow 2s ease-in-out infinite'
          }}>
            ✓
          </div>
          
          <h1 style={{ 
            color: '#f0f0f5', 
            fontWeight: 800, 
            fontSize: '2.2rem',
            letterSpacing: '-1px',
            marginBottom: '12px'
          }}>Payment Verified! 🎉</h1>
          <p style={{ color: '#6b6b80', marginTop: '0', maxWidth: '400px', lineHeight: 1.6, fontSize: '1rem' }}>
            Your tickets are being securely provisioned on our servers via Stripe Hooks.
          </p>
          
          {/* Loading indicator */}
          <div style={{ marginTop: '2.5rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(255,255,255,0.06)',
              borderTopColor: '#7c5cfc',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto'
            }} />
            <p style={{ color: '#6b6b80', marginTop: '16px', fontSize: '0.85rem' }}>Redirecting to dashboard...</p>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
