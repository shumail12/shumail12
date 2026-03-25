import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Layout, Header } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import {
  getChatChannels, getChatMessages, sendChatMessage, markChatRead,
  uploadChatFile, createChatGroup, searchChatUsers,
} from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ScrollArea } from '../components/ui/scroll-area';
import { Checkbox } from '../components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog';
import {
  MessageSquare, Send, Users, User, Hash, Paperclip, Image,
  FileText, Plus, Search, Link2, X, Download,
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND = process.env.REACT_APP_BACKEND_URL;

// URL regex for link detection
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

const RenderMessageContent = ({ text, fileUrl, fileName, fileType }) => {
  // File attachment
  if (fileUrl) {
    const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${BACKEND}${fileUrl}`;
    if (fileType === 'image') {
      return (
        <div>
          {text && <p className="mb-2">{text}</p>}
          <img src={fullUrl} alt={fileName} className="max-w-xs rounded-lg border border-white/20" data-testid="chat-image-attachment" />
          <p className="text-xs opacity-70 mt-1">{fileName}</p>
        </div>
      );
    }
    return (
      <div>
        {text && <p className="mb-2">{text}</p>}
        <a href={fullUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          data-testid="chat-file-attachment"
        >
          <FileText className="w-4 h-4" />
          <span className="text-sm font-medium underline">{fileName}</span>
          <Download className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  // Linkify text
  if (text && URL_REGEX.test(text)) {
    const parts = text.split(URL_REGEX);
    return (
      <p>
        {parts.map((part, i) =>
          URL_REGEX.test(part) ? (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer"
              className="underline inline-flex items-center gap-0.5 hover:opacity-80">
              {part.length > 50 ? part.substring(0, 50) + '...' : part}
              <Link2 className="w-3 h-3 inline" />
            </a>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </p>
    );
  }

  return <p>{text}</p>;
};

const Chat = () => {
  const { user, token } = useAuth();
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState('all-team');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const eventSourceRef = useRef(null);

  // Search & Group state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChannels = useCallback(async () => {
    try {
      const res = await getChatChannels();
      setChannels(res.data);
    } catch { /* ignore */ }
  }, []);

  const fetchMessages = useCallback(async (channel) => {
    try {
      const res = await getChatMessages(channel);
      setMessages(res.data);
      setTimeout(scrollToBottom, 100);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);
  useEffect(() => {
    fetchMessages(activeChannel);
    markChatRead(activeChannel).catch(() => {});
  }, [activeChannel, fetchMessages]);

  // SSE listener
  useEffect(() => {
    if (!token) return;
    const url = `${BACKEND}/api/notifications/stream?token=${token}`;
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
            if (msg.sender_id !== user?.id) markChatRead(activeChannel).catch(() => {});
          } else {
            setChannels(prev => prev.map(ch =>
              ch.id === msg.channel ? { ...ch, unread: (ch.unread || 0) + 1 } : ch
            ));
          }
        }
      } catch { /* ignore */ }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [token, activeChannel, user?.id]);

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
    } catch { toast.error('Failed to send'); }
    finally { setSending(false); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Max 10MB.');
      return;
    }
    setUploading(true);
    try {
      const res = await uploadChatFile(file);
      const { file_url, file_name, file_type } = res.data;
      const activeChannelObj = channels.find(c => c.id === activeChannel);
      await sendChatMessage({
        receiver_id: activeChannelObj?.user_id || null,
        channel: activeChannel,
        text: newMessage.trim() || '',
        file_url,
        file_name,
        file_type,
      });
      setNewMessage('');
      toast.success('File sent!');
    } catch { toast.error('Failed to upload file'); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Search users
  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 1) { setSearchResults([]); return; }
    try {
      const res = await searchChatUsers(q);
      setSearchResults(res.data);
    } catch { /* ignore */ }
  };

  const startDm = (userId) => {
    const dmId = [user?.id, userId].sort().join('-');
    const channelId = `dm-${dmId}`;
    const existing = channels.find(c => c.id === channelId);
    if (existing) {
      setActiveChannel(channelId);
    } else {
      setActiveChannel(channelId);
      fetchChannels();
    }
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Create group
  const openCreateGroup = async () => {
    try {
      const res = await searchChatUsers('');
      setAllUsers(res.data);
    } catch { /* ignore */ }
    setShowCreateGroup(true);
  };

  const toggleGroupMember = (uid) => {
    setGroupMembers(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) { toast.error('Enter a group name'); return; }
    if (groupMembers.length === 0) { toast.error('Select at least one member'); return; }
    try {
      await createChatGroup({ name: groupName.trim(), member_ids: groupMembers });
      toast.success('Group created!');
      setShowCreateGroup(false);
      setGroupName('');
      setGroupMembers([]);
      fetchChannels();
    } catch { toast.error('Failed to create group'); }
  };

  const activeChannelObj = channels.find(c => c.id === activeChannel);
  const channelName = activeChannelObj?.name || 'All Team';

  const formatTime = (dateStr) => new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString();
  };

  const groupedMessages = messages.reduce((groups, msg) => {
    const date = formatDate(msg.created_at);
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  // Filter channels by search
  const filteredChannels = showSearch && searchQuery
    ? channels.filter(ch => ch.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : channels;

  return (
    <Layout>
      <Header title="Team Chat" />
      <div className="p-6 h-[calc(100vh-4rem)]" data-testid="chat-page">
        <div className="flex h-full bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {/* Channel List */}
          <div className="w-72 border-r border-slate-200 flex flex-col bg-slate-50" data-testid="chat-channel-list">
            <div className="p-3 border-b border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-semibold text-slate-900 text-sm">Channels</h3>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowSearch(!showSearch)} data-testid="toggle-search-btn">
                    <Search className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={openCreateGroup} data-testid="create-group-btn">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              {showSearch && (
                <div className="relative">
                  <Input
                    value={searchQuery}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="Search users..."
                    className="text-xs h-8 pr-7"
                    data-testid="chat-user-search"
                  />
                  {searchQuery && (
                    <button onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Search Results */}
            {showSearch && searchResults.length > 0 && (
              <div className="border-b border-slate-200 bg-white">
                <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase">Users</p>
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => startDm(u.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                    data-testid={`search-result-${u.id}`}
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                      <User className="w-3 h-3 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-900">{u.full_name}</p>
                      <p className="text-[10px] text-slate-400">@{u.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <ScrollArea className="flex-1">
              <div className="p-2 space-y-0.5">
                {filteredChannels.map(ch => (
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
                      ch.type === 'group' ? ch.is_custom ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {ch.type === 'group' ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ch.name}</p>
                      <p className="text-xs text-slate-500">
                        {ch.type === 'group' ? (ch.is_custom ? 'Custom Group' : 'Team') : 'Direct Message'}
                      </p>
                    </div>
                    {ch.unread > 0 && (
                      <span className="w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {ch.unread}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            <div className="h-14 flex items-center gap-3 px-5 border-b border-slate-200 bg-white">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                activeChannelObj?.type === 'group' ? activeChannelObj?.is_custom ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-600'
              }`}>
                {activeChannelObj?.type === 'group' ? <Hash className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-sm" data-testid="chat-active-channel-name">{channelName}</h4>
                <p className="text-xs text-slate-500">
                  {activeChannelObj?.type === 'group'
                    ? activeChannelObj?.is_custom ? 'Custom group' : 'Team-wide channel'
                    : 'Direct message'}
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
                          <div className={`max-w-[70%]`}>
                            {!isMe && (
                              <p className="text-xs font-medium text-slate-500 mb-1 ml-1">{msg.sender_name}</p>
                            )}
                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isMe
                                ? 'bg-blue-600 text-white rounded-br-md'
                                : 'bg-slate-100 text-slate-900 rounded-bl-md'
                            }`}>
                              <RenderMessageContent
                                text={msg.text}
                                fileUrl={msg.file_url}
                                fileName={msg.file_name}
                                fileType={msg.file_type}
                              />
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
              <div className="flex gap-2 items-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
                  data-testid="chat-file-input"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-slate-400 hover:text-blue-600 flex-shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  data-testid="chat-attach-btn"
                >
                  {uploading ? (
                    <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                  ) : (
                    <Paperclip className="w-4 h-4" />
                  )}
                </Button>
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
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 flex-shrink-0"
                  data-testid="chat-send-button"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Group Dialog */}
      <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
        <DialogContent className="max-w-md" data-testid="create-group-dialog">
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="form-label">Group Name</Label>
              <Input
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="e.g. Sales Team, Night Shift..."
                data-testid="group-name-input"
              />
            </div>
            <div>
              <Label className="form-label">Members</Label>
              <ScrollArea className="h-48 border border-slate-200 rounded-lg">
                <div className="p-2 space-y-1">
                  {allUsers.map(u => (
                    <label
                      key={u.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                      data-testid={`group-member-${u.id}`}
                    >
                      <Checkbox
                        checked={groupMembers.includes(u.id)}
                        onCheckedChange={() => toggleGroupMember(u.id)}
                      />
                      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{u.full_name}</p>
                        <p className="text-xs text-slate-400">@{u.username} · {u.role}</p>
                      </div>
                    </label>
                  ))}
                  {allUsers.length === 0 && (
                    <p className="text-center text-slate-400 text-sm py-4">No users found</p>
                  )}
                </div>
              </ScrollArea>
              {groupMembers.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">{groupMembers.length} member(s) selected</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreateGroup(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleCreateGroup} data-testid="save-group-btn">
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Chat;
