import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Layout, Header } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { getChatChannels, getChatMessages, sendChatMessage, markChatRead } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { MessageSquare, Send, Users, User, Hash } from 'lucide-react';

const Chat = () => {
  const { user, token } = useAuth();
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState('all-team');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const eventSourceRef = useRef(null);
  const API = process.env.REACT_APP_BACKEND_URL;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChannels = useCallback(async () => {
    try {
      const res = await getChatChannels();
      setChannels(res.data);
    } catch (err) {
      console.error('Failed to fetch channels:', err);
    }
  }, []);

  const fetchMessages = useCallback(async (channel) => {
    try {
      const res = await getChatMessages(channel);
      setMessages(res.data);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  useEffect(() => {
    fetchMessages(activeChannel);
    markChatRead(activeChannel).catch(() => {});
  }, [activeChannel, fetchMessages]);

  // SSE listener for real-time chat
  useEffect(() => {
    if (!token) return;
    const url = `${API}/api/notifications/stream?token=${token}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'chat_message' && data.message) {
          const msg = data.message;
          if (msg.channel === activeChannel) {
            setMessages(prev => [...prev, msg]);
            setTimeout(scrollToBottom, 100);
            if (msg.sender_id !== user?.id) {
              markChatRead(activeChannel).catch(() => {});
            }
          } else {
            // Update unread count on other channels
            setChannels(prev => prev.map(ch =>
              ch.id === msg.channel ? { ...ch, unread: (ch.unread || 0) + 1 } : ch
            ));
          }
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    es.onerror = () => {
      es.close();
      setTimeout(() => {
        if (eventSourceRef.current === es) {
          // Reconnection handled by component re-render
        }
      }, 5000);
    };

    return () => es.close();
  }, [token, API, activeChannel, user?.id]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const activeChannelObj = channels.find(c => c.id === activeChannel);
      await sendChatMessage({
        receiver_id: activeChannelObj?.user_id || null,
        channel: activeChannel,
        text: newMessage.trim(),
      });
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeChannelObj = channels.find(c => c.id === activeChannel);
  const channelName = activeChannelObj?.name || 'All Team';

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString();
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = formatDate(msg.created_at);
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  return (
    <Layout>
      <Header title="Team Chat" />
      <div className="p-6 h-[calc(100vh-4rem)]" data-testid="chat-page">
        <div className="flex h-full bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {/* Channel List */}
          <div className="w-72 border-r border-slate-200 flex flex-col bg-slate-50" data-testid="chat-channel-list">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-heading font-semibold text-slate-900 text-sm">Channels</h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-0.5">
                {channels.map(ch => (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setActiveChannel(ch.id);
                      setChannels(prev => prev.map(c => c.id === ch.id ? { ...c, unread: 0 } : c));
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      activeChannel === ch.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                    data-testid={`chat-channel-${ch.id}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      ch.type === 'group' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {ch.type === 'group' ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ch.name}</p>
                      <p className="text-xs text-slate-500">{ch.type === 'group' ? 'Group' : 'Direct Message'}</p>
                    </div>
                    {ch.unread > 0 && (
                      <span className="w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center" data-testid={`chat-unread-${ch.id}`}>
                        {ch.unread}
                      </span>
                    )}
                  </button>
                ))}
                {channels.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    No channels available
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="h-14 flex items-center gap-3 px-5 border-b border-slate-200 bg-white">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                activeChannelObj?.type === 'group' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-600'
              }`}>
                {activeChannelObj?.type === 'group' ? <Hash className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-sm" data-testid="chat-active-channel-name">{channelName}</h4>
                <p className="text-xs text-slate-500">
                  {activeChannelObj?.type === 'group' ? 'Team-wide channel' : 'Direct message'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4" data-testid="chat-messages-area">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                Object.entries(groupedMessages).map(([date, msgs]) => (
                  <div key={date}>
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="text-xs text-slate-400 font-medium">{date}</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>
                    {msgs.map((msg) => {
                      const isMe = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex mb-3 ${isMe ? 'justify-end' : 'justify-start'}`} data-testid={`chat-msg-${msg.id}`}>
                          <div className={`max-w-[70%] ${isMe ? 'order-2' : ''}`}>
                            {!isMe && (
                              <p className="text-xs font-medium text-slate-500 mb-1 ml-1">{msg.sender_name}</p>
                            )}
                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isMe
                                ? 'bg-blue-600 text-white rounded-br-md'
                                : 'bg-slate-100 text-slate-900 rounded-bl-md'
                            }`}>
                              {msg.text}
                            </div>
                            <p className={`text-xs text-slate-400 mt-1 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                              {formatTime(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t border-slate-200 p-4 bg-white" data-testid="chat-input-area">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Message ${channelName}...`}
                  className="flex-1"
                  data-testid="chat-message-input"
                />
                <Button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4"
                  data-testid="chat-send-button"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Chat;
