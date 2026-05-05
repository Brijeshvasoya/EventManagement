
import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { Send, Bot, User, Sparkles, X, ChevronDown, Calendar, Users, MapPin, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

const suggestions = [
  { icon: Calendar, text: 'How do I book a ticket?', color: '#4f46e5' },
  { icon: Sparkles, text: 'How to get my digital pass?', color: '#8b5cf6' },
  { icon: X, text: 'How do I cancel a ticket?', color: '#ef4444' },
  { icon: Zap, text: 'What is the organizer dashboard?', color: '#f59e0b' },
];

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your **Event Management Assistant**. I am here specifically to help you with this project. How can I assist you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e, text = input) => {
    if (e) e.preventDefault();
    const query = text.trim();
    if (!query || isLoading) return;

    const newMessages = [...messages, { role: 'user', content: query }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) throw new Error('Failed to fetch');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              assistantMessage += parsed.text;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1].content = assistantMessage;
                return updated;
              });
            } catch (e) {
              console.error('Error parsing chunk', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-assistant-container">
      <Head>
        <title>AI Assistant | Event Management</title>
      </Head>

      <div className="chat-wrapper">
        {/* Header */}
        <header className="chat-header">
          <div className="header-info">
            <div className="bot-icon-wrapper">
              <Bot size={24} color="white" />
            </div>
            <div className="header-text">
              <h1>Project AI Assistant</h1>
              <div className="status-badge">
                <span className="status-dot"></span>
                <span>Active • Project Knowledge Only</span>
              </div>
            </div>
          </div>
          <button className="close-btn">
            <ChevronDown size={20} />
          </button>
        </header>

        {/* Chat Area */}
        <div ref={scrollRef} className="chat-area">
          {messages.map((msg, i) => (
            <div key={i} className={`message-row ${msg.role === 'user' ? 'user' : 'assistant'}`}>
              <div className="message-bubble">
                <div className="avatar">
                  {msg.role === 'user' ? <User size={18} /> : <Sparkles size={18} />}
                </div>
                <div className="content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message-row assistant loading">
              <div className="message-bubble">
                <div className="avatar">
                  <Sparkles size={18} />
                </div>
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="suggestions-grid">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => handleSend(null, s.text)} className="suggestion-card">
                <s.icon size={20} color={s.color} />
                <span>{s.text}</span>
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSend} className="input-form">
          <div className="input-wrapper">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about events, roles, tickets..."
            />
            <button type="submit" disabled={isLoading || !input.trim()} className="send-btn">
              <Send size={20} />
            </button>
          </div>
        </form>
        
        <footer className="chat-footer">
          Powered by Mistral AI & Mastra
        </footer>
      </div>

      <style jsx>{`
        .ai-assistant-container {
          min-height: calc(100vh - 120px);
          display: flex;
          justify-content: center;
          padding: 0;
          background: transparent;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
 
        .chat-wrapper {
          width: 100%;
          max-width: 900px;
          height: calc(100vh - 160px);
          display: flex;
          flex-direction: column;
          background: #FFFFFF;
          border-radius: 32px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.04);
          border: 1px solid #F1F5F9;
        }
 
        .chat-header {
          padding: 24px 32px;
          background: linear-gradient(135deg, #1B2A4E 0%, #312E81 50%, #4338CA 100%);
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: white;
        }
 
        .header-info {
          display: flex;
          align-items: center;
          gap: 20px;
        }
 
        .bot-icon-wrapper {
          width: 52px;
          height: 52px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          display: flex;
          justify-content: center;
          align-items: center;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
 
        .header-text h1 {
          font-size: 20px;
          font-weight: 800;
          margin: 0;
          color: white;
          letter-spacing: -0.5px;
        }
 
        .status-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 600;
          margin-top: 4px;
        }
 
        .status-dot {
          width: 10px;
          height: 10px;
          background: #10B981;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
          animation: pulse 2s infinite;
        }
 
        @keyframes pulse {
          0% { opacity: 0.5; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0.5; transform: scale(0.9); }
        }
 
        .close-btn {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s;
        }
 
        .close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }
 
        .chat-area {
          flex: 1;
          overflow-y: auto;
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 32px;
          background: #F8FAFB;
        }
 
        .message-row {
          display: flex;
          width: 100%;
        }
 
        .message-row.user {
          justify-content: flex-end;
        }
 
        .message-bubble {
          max-width: 85%;
          display: flex;
          gap: 16px;
        }
 
        .user .message-bubble {
          flex-direction: row-reverse;
        }
 
        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-shrink: 0;
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }
 
        .assistant .avatar {
          background: white;
          color: #4338CA;
          border: 1px solid #E2E8F0;
        }
 
        .user .avatar {
          background: #1B2A4E;
          color: white;
        }
 
        .content {
          padding: 16px 24px;
          border-radius: 20px;
          font-size: 15px;
          line-height: 1.7;
          box-shadow: 0 2px 10px rgba(0,0,0,0.02);
        }
 
        .assistant .content {
          background: white;
          color: #334155;
          border-top-left-radius: 4px;
          border: 1px solid #E2E8F0;
        }
 
        .user .content {
          background: linear-gradient(135deg, #4F46E5 0%, #4338CA 100%);
          color: white;
          border-top-right-radius: 4px;
          box-shadow: 0 10px 20px rgba(79, 70, 229, 0.15);
        }
 
        .typing-indicator {
          display: flex;
          gap: 6px;
          padding: 16px 24px;
          background: white;
          border-radius: 20px;
          border-top-left-radius: 4px;
          border: 1px solid #E2E8F0;
        }
 
        .typing-indicator span {
          width: 8px;
          height: 8px;
          background: #4338CA;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out;
          opacity: 0.6;
        }
 
        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
 
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
 
        .suggestions-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          padding: 0 32px 24px;
          background: #F8FAFB;
        }
 
        .suggestion-card {
          background: white;
          border: 1px solid #E2E8F0;
          padding: 20px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          text-align: left;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: #475569;
          font-size: 14px;
          font-weight: 600;
        }
 
        .suggestion-card:hover {
          background: #FFFFFF;
          border-color: #4338CA;
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.05);
          color: #1E293B;
        }
 
        .input-form {
          padding: 24px 32px;
          background: white;
          border-top: 1px solid #F1F5F9;
        }
 
        .input-wrapper {
          display: flex;
          align-items: center;
          gap: 16px;
          background: #F8FAFB;
          border: 2px solid #F1F5F9;
          border-radius: 20px;
          padding: 10px 12px 10px 24px;
          transition: all 0.3s;
        }
 
        .input-wrapper:focus-within {
          border-color: #4338CA;
          background: white;
          box-shadow: 0 0 0 4px rgba(67, 56, 202, 0.05);
        }
 
        .input-wrapper input {
          flex: 1;
          background: transparent;
          border: none;
          color: #1E293B;
          font-size: 16px;
          font-weight: 500;
          outline: none;
          padding: 12px 0;
        }
 
        .input-wrapper input::placeholder {
          color: #94A3B8;
        }
 
        .send-btn {
          width: 52px;
          height: 52px;
          background: #4338CA;
          border: none;
          border-radius: 16px;
          color: white;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 8px 16px rgba(67, 56, 202, 0.2);
        }
 
        .send-btn:hover:not(:disabled) {
          background: #3730A3;
          transform: scale(1.05) rotate(-5deg);
        }
 
        .send-btn:disabled {
          background: #E2E8F0;
          color: #94A3B8;
          box-shadow: none;
          cursor: not-allowed;
        }
 
        .chat-footer {
          padding: 16px;
          text-align: center;
          font-size: 11px;
          color: #94A3B8;
          text-transform: uppercase;
          letter-spacing: 2px;
          font-weight: 800;
          background: white;
        }
 
        /* Markdown Overrides */
        :global(.content p) { margin-bottom: 12px; }
        :global(.content p:last-child) { margin-bottom: 0; }
        :global(.content strong) { color: #4338CA; font-weight: 800; }
        :global(.content ul) { padding-left: 20px; margin-bottom: 12px; }
        :global(.content li) { margin-bottom: 6px; }
      `}</style>
    </div>
  );
}
