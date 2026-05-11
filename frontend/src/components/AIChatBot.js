import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Sparkles, ChevronDown, Calendar, Zap, MessageSquare, Maximize2, Minimize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Badge } from 'antd';
import { useAuth } from '@/context/AuthContext';

const attendeeSuggestions = [
  { icon: Calendar, text: 'How do I book a ticket?', color: '#4f46e5' },
  { icon: Sparkles, text: 'How to get my digital pass?', color: '#8b5cf6' },
  { icon: X, text: 'How do I cancel a ticket?', color: '#ef4444' },
  { icon: MessageSquare, text: 'Where are my bookings?', color: '#f59e0b' },
];

const organizerSuggestions = [
  { icon: Zap, text: 'How to create a new event?', color: '#4f46e5' },
  { icon: Calendar, text: 'How to track event sales?', color: '#8b5cf6' },
  { icon: MessageSquare, text: 'How to manage vendors?', color: '#10B981' },
  { icon: Sparkles, text: 'View my event dashboard', color: '#f59e0b' },
];

export default function AIChatBot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle', 'loading', 'streaming'
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([
    { id: 'welcome', role: 'assistant', content: `Hello ${user?.name || 'there'}! I am your **EventHub AI Assistant**. How can I help you today?` }
  ]);

  const scrollRef = useRef(null);
  const chatRef = useRef(null);
  const [buttonPos, setButtonPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chatRef.current && !chatRef.current.contains(event.target)) {
        // Only close if it's not a click on the floating button itself
        const isClickOnButton = event.target.closest('.chat-toggle-button');
        if (!isClickOnButton) {
          setIsOpen(false);
          setIsExpanded(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const sendMessage = async (content) => {
    if (!content.trim() || status !== 'idle') return;

    const userMsg = { id: Date.now().toString(), role: 'user', content };
    const newMessages = [...messages, userMsg];

    setMessages(newMessages);
    setInput('');
    setStatus('loading');
    setError(null);

    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      console.log('🔑 Chat token check:', { hasToken: !!token, tokenLength: token?.length, userRole: user?.role });
      
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          role: user?.role || 'USER',
          token: token,
        }),
      });

      if (!response.ok) throw new Error('Failed to connect to AI');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      const assistantMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '' }]);
      setStatus('streaming');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;

        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          const updated = [...prev.slice(0, -1), { ...lastMsg, content: assistantContent }];
          return updated;
        });
      }
    } catch (err) {
      console.error('Chat Error:', err);
      setError(err.message);
      
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      
      // Handle rate limit errors specifically
      if (err.status === 429) {
        const waitTime = err.retryAfter || 15;
        errorMessage = `⏱️ Rate limit reached. Please wait ${waitTime} seconds before trying again.`;
      } else if (err.message?.includes('rate limits')) {
        errorMessage = '⏱️ AI service is busy right now due to high demand. Please wait a moment and try again.';
      }
      
      setMessages(prev => [...prev, { id: 'error', role: 'assistant', content: errorMessage }]);
    } finally {
      setStatus('idle');
    }
  };

  const handleInputChange = (e) => setInput(e.target.value);
  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const suggestions = user?.role === 'ORGANIZER' ? organizerSuggestions : attendeeSuggestions;

  return (
    <div style={{ position: 'fixed', bottom: 0, right: 0, zIndex: 2147483647, pointerEvents: 'none' }}>
      <style jsx global>{`
        .solid-chat-window {
          position: fixed;
          bottom: 110px;
          right: 30px;
          width: 550px;
          height: 650px;
          max-height: calc(100vh - 140px);
          border-radius: 28px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          pointer-events: auto;
          font-family: 'Inter', sans-serif;
          z-index: 1000001;
          box-shadow: 0 20px 50px rgba(0,0,0,0.3);
          background: white;
          border: 1px solid #E2E8F0;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .solid-chat-window.expanded {
          bottom: 20px !important;
          right: 20px !important;
          width: calc(100vw - 40px) !important;
          height: calc(100vh - 40px) !important;
          max-height: calc(100vh - 40px) !important;
          border-radius: 32px !important;
        }

        .chat-scroll-area::-webkit-scrollbar { display: none; }

        @media (max-width: 640px) {
          .solid-chat-window {
            bottom: 0 !important;
            right: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            max-height: 100vh !important;
            border-radius: 0 !important;
          }
          
          .chat-scroll-area {
            padding: 16px !important;
          }
        }

        /* Responsive Table Styling */
        .analytics-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          overflow-x: auto;
          display: block;
          white-space: nowrap;
        }

        .analytics-table th,
        .analytics-table td {
          padding: 8px 6px;
          text-align: left;
          border-bottom: 1px solid #E2E8F0;
          min-width: 80px;
        }

        .analytics-table th {
          background: #F8FAFB;
          font-weight: 600;
          color: #475569;
          font-size: 11px;
        }

        .analytics-table td {
          color: #1E293B;
        }

        /* Mobile Responsive Table */
        @media (max-width: 640px) {
          .analytics-table {
            font-size: 11px;
            display: block;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          .analytics-table th,
          .analytics-table td {
            padding: 6px 4px;
            min-width: 70px;
            font-size: 10px;
          }

          .analytics-table th {
            font-size: 9px;
          }
        }

        /* Revenue and Occupancy styling */
        .revenue-cell {
          font-weight: 600;
          color: #059669;
        }

        .occupancy-high {
          color: #059669;
          font-weight: 600;
        }

        .occupancy-medium {
          color: #D97706;
          font-weight: 600;
        }

        .occupancy-low {
          color: #DC2626;
          font-weight: 600;
        }

        .suggestion-btn:hover {
          background: #F1F5F9 !important;
          transform: translateX(4px);
          border-color: #4338CA !important;
          color: #1E293B !important;
        }
        
        .typing-dot {
          width: 6px;
          height: 6px;
          background: #4338CA;
          border-radius: 50%;
          animation: typing 1.4s infinite ease-in-out;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Floating Button */}
      <motion.div
        drag dragMomentum={false}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={() => setIsOpen(!isOpen)}
        className="chat-toggle-button"
        style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 1000002, cursor: 'grab', pointerEvents: 'auto' }}
      >
        <Badge dot color="#10B981" offset={[-5, 5]}>
          <div style={{ width: '64px', height: '64px', background: '#1B2A4E', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', border: '2px solid white' }}>
            {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
          </div>
        </Badge>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={chatRef}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`solid-chat-window ${isExpanded ? 'expanded' : ''}`}
          >
            {/* Header */}
            <div style={{ padding: '24px', background: '#1B2A4E', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '44px', height: '44px', background: 'rgba(255,255,255,0.15)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={22} color="white" /></div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'white' }}>Project AI Assistant</h3>
                  <div style={{ fontSize: '12px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}>
                    <span style={{ width: '7px', height: '7px', background: '#10B981', borderRadius: '50%' }}></span> Always Active
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  onClick={() => setIsExpanded(!isExpanded)} 
                  style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.8 }}
                >
                  {isExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>
                <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.8 }}><X size={22} /></button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: '#FFFFFF' }} className="chat-scroll-area">
              {messages.map((msg) => (
                <div key={msg.id} style={{ display: 'flex', width: '100%', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '85%', padding: '14px 18px', borderRadius: '20px', fontSize: '15px', lineHeight: 1.6, background: msg.role === 'user' ? '#4F46E5' : '#F1F5F9', color: msg.role === 'user' ? 'white' : '#1E293B', borderTopLeftRadius: msg.role === 'assistant' ? '4px' : '20px', borderTopRightRadius: msg.role === 'user' ? '4px' : '20px' }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {(status === 'loading' || status === 'streaming') && (
                <div style={{ display: 'flex', width: '100%' }}>
                  <div style={{ padding: '14px 18px', background: '#F1F5F9', borderRadius: '20px', borderTopLeftRadius: '4px', display: 'flex', gap: '5px' }}>
                    <div className="typing-dot"></div><div className="typing-dot"></div><div className="typing-dot"></div>
                  </div>
                </div>
              )}
            </div>

            {/* Suggestions */}
            {messages.length <= 1 && status === 'idle' && (
              <div style={{ padding: '0 24px 20px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#FFFFFF' }}>
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s.text)} style={{ background: '#F8FAFB', border: '1px solid #E2E8F0', padding: '12px 16px', borderRadius: '14px', fontSize: '14px', fontWeight: 600, color: '#475569', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }} className="suggestion-btn">
                    <s.icon size={16} color={s.color} />{s.text}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', gap: '12px', background: '#FFFFFF', borderTop: '1px solid #F1F5F9' }}>
              <input value={input} onChange={handleInputChange} placeholder="Type your question..." style={{ flex: 1, border: '1px solid #E2E8F0', borderRadius: '14px', padding: '12px 18px', fontSize: '15px', outline: 'none', background: '#F8FAFB' }} />
              <button type="submit" disabled={!input.trim() || status !== 'idle'} style={{ width: '48px', height: '48px', background: '#1B2A4E', color: 'white', border: 'none', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: (!input.trim() || status !== 'idle') ? 0.5 : 1 }}>
                <Send size={20} />
              </button>
            </form>

            <div style={{ padding: '12px', textAlign: 'center', fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 800 }}>Official EventHub Support</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
