'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  X,
  RefreshCw,
  SlidersHorizontal,
  ArrowRight,
  Info,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import {
  sendAiChat,
  getAiStatus,
  AiChatResponse,
  AiFilterAction,
  AiStatusResponse,
} from '@/lib/api';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  action?: AiFilterAction | null;
  provider?: string;
  timestamp: string;
}

interface AiCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: (filters: AiFilterAction['filters']) => void;
  isDemoMode?: boolean;
}

export default function AiCopilotDrawer({
  isOpen,
  onClose,
  onApplyFilter,
  isDemoMode = false,
}: AiCopilotDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "### 👋 Welcome to Walcano & Surfaces AI Copilot!\nI have direct access to your live QuickBooks inventory catalog and Surfaces tile specifications.\n\n- Ask about **stock availability** or critical reorders.\n- Inquire about **tile sizes, finishes, or mapping**.\n- Or click one of the quick suggestions below!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<AiStatusResponse | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !aiStatus) {
      getAiStatus().then(setAiStatus).catch(console.error);
    }
  }, [isOpen, aiStatus]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  const handleSend = async (queryText?: string) => {
    const text = (queryText || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputMessage('');
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({ role: m.sender, content: m.text }));

      const res: AiChatResponse = await sendAiChat(text, history, isDemoMode);

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        action: res.action,
        provider: res.provider,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ Error reaching AI assistant: ${err.message || 'Unknown network error'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: "Conversation cleared. How can I help you with your tile inventory today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginTop: '6px', marginBottom: '3px' }}>
            {line.replace('### ', '')}
          </h4>
        );
      }
      if (line.startsWith('- ')) {
        const content = line.substring(2);
        return (
          <li
            key={idx}
            style={{ marginLeft: '16px', fontSize: '12px', color: '#334155', marginBottom: '3px', lineHeight: '1.4' }}
            dangerouslySetInnerHTML={{ __html: formatInline(content) }}
          />
        );
      }
      if (!line.trim()) {
        return <div key={idx} style={{ height: '6px' }} />;
      }
      return (
        <p
          key={idx}
          style={{ fontSize: '12px', color: '#1E293B', marginBottom: '4px', lineHeight: '1.45' }}
          dangerouslySetInnerHTML={{ __html: formatInline(line) }}
        />
      );
    });
  };

  const formatInline = (str: string) => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0F172A; font-weight: 700;">$1</strong>')
      .replace(/`([^`]+)`/g, '<code style="font-family: monospace; font-size: 11px; background: #F1F5F9; padding: 2px 4px; border-radius: 4px; color: #4F46E5;">$1</code>');
  };

  const quickPrompts = [
    { label: '⚠️ Low stock alert', query: 'Show all low stock items running low on quantity' },
    { label: '🔗 Unmapped tiles', query: 'Which products are unmapped to Surfaces catalog?' },
    { label: '📊 Health summary', query: 'Give me an executive inventory health summary' },
    { label: '🌿 Outdoor pavers', query: 'Show me outdoor 2cm porcelain pavers' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`ai-drawer-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />

      {/* Slide-over Drawer */}
      <div className={`ai-drawer ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="ai-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'var(--ai-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 2px 8px var(--ai-glow)',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                  Walcano AI Copilot
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                Real-time inventory assistant
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              onClick={clearChat}
              title="Reset Chat"
              className="btn btn-secondary"
              style={{ padding: '6px 8px', borderRadius: '6px' }}
            >
              <RefreshCw size={13} />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close Drawer"
              className="btn btn-secondary"
              style={{ padding: '6px 8px', borderRadius: '6px' }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Notice for heuristic mode */}
        {aiStatus && !aiStatus.configured && (
          <div
            style={{
              padding: '8px 16px',
              background: '#FFFBEB',
              borderBottom: '1px solid #FCD34D',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: '#92400E',
            }}
          >
            <Info size={13} color="#D97706" style={{ flexShrink: 0 }} />
            <span>High-accuracy local reasoning active. Connect Gemini API key in backend for multi-turn models.</span>
          </div>
        )}

        {/* Chat Messages */}
        <div className="ai-drawer-body">
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div className={msg.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                {msg.sender === 'assistant' ? (
                  <div>
                    {renderMarkdown(msg.text)}

                    {/* Interactive Action Card */}
                    {msg.action && (
                      <div className="ai-action-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <SlidersHorizontal size={13} color="#4F46E5" />
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#4F46E5' }}>
                            Suggested View:
                          </span>
                        </div>
                        <button
                          type="button"
                          className="ai-action-btn"
                          onClick={() => {
                            if (msg.action?.filters) {
                              onApplyFilter(msg.action.filters);
                              onClose();
                            }
                          }}
                        >
                          <span>{msg.action.label || 'Apply Filter'}</span>
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ margin: 0 }}>{msg.text}</p>
                )}
              </div>
              <span style={{ fontSize: '10px', color: '#94A3B8', marginTop: '3px', padding: '0 4px' }}>
                {msg.timestamp}
              </span>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div
              className="chat-bubble-ai"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: 'fit-content',
                padding: '10px 14px',
              }}
            >
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#4F46E5',
                  animation: 'bounce 1s infinite',
                }}
              />
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#7C3AED',
                  animation: 'bounce 1s infinite 0.2s',
                }}
              />
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#6366F1',
                  animation: 'bounce 1s infinite 0.4s',
                }}
              />
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                Analyzing live stock...
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div
          style={{
            padding: '10px 16px',
            background: '#FFFFFF',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
          }}
        >
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(p.query)}
              disabled={isLoading}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '16px',
                border: '1px solid var(--border-subtle)',
                background: '#F8FAFC',
                color: '#334155',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#EEF2FF';
                e.currentTarget.style.borderColor = '#C7D2FE';
                e.currentTarget.style.color = '#4F46E5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F8FAFC';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.color = '#334155';
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Footer Chat Input */}
        <div className="ai-drawer-footer">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about inventory, low stock, mapping..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '9px 12px',
                fontSize: '12px',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                background: '#F8FAFC',
                outline: 'none',
                color: '#0F172A',
              }}
              onFocus={(e) => {
                e.target.style.background = '#FFFFFF';
                e.target.style.borderColor = '#4F46E5';
              }}
              onBlur={(e) => {
                e.target.style.background = '#F8FAFC';
                e.target.style.borderColor = 'var(--border-subtle)';
              }}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="btn btn-ai"
              style={{
                padding: '9px 12px',
                borderRadius: '8px',
                opacity: !inputMessage.trim() || isLoading ? 0.6 : 1,
              }}
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
