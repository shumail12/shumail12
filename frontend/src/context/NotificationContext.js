import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarCounts, setSidebarCounts] = useState({ new_leads: 0, unread_chat: 0 });
  const eventSourceRef = useRef(null);
  const audioRef = useRef(null);
  const API = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Mi4x4aGR0gI2RjYF1bHJ+i5GPiYB1cHeCjZGOhXtxcn+JjZCIgHdyc3+IjJCJgXhzc4CIjJCJgnp0dICIjJCJg3t0dICIjI+Ig3t0dICIi4+Ig3t0dICIi46Hg3t0dICHi46Gg3t0dICHi46Gg3t0dICHi42Fg3t0dICHi42Eg3t1dYGHi42Eg3t1dYGIi42Eg3x1dYGIi42Dg3x1dYGIi42Dg3x1doKIi42Dg3x1doKIi4yDhHx1doKIi4yDhHx1doKIi4yCg3x1doKIiouCg3x2d4OJiouBgnx2d4OJiouBgnx2d4OJiouBgnx2d4OJiYuBgnx2d4OIiYqAgXt2d4OIiIp/gXt2d4OIiIp/gXt2eIOIiIl/gHt3eIOHiIl+gHt3eIOHh4h+gHt3eIOHh4h+gHt3eIOHh4h+gHt3eIOHh4h+gHt3eIOHh4h+gHt3eIOHh4d9f3p3eYOGh4d9f3p3eYOGh4d9f3p3eYOGhod8f3p3eYKGhod8f3p4eoKGhod8f3p4eoKFhoZ7fnp4eoKFhYV6fnl4eoKFhYV6fXl5e4OFhYV5fXl5e4OAAIA=');
    audioRef.current.volume = 0.5;
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/notifications?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [token, API]);

  const fetchSidebarCounts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/sidebar/counts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSidebarCounts(data);
      }
    } catch (err) {
      console.error('Failed to fetch sidebar counts:', err);
    }
  }, [token, API]);

  useEffect(() => {
    if (!token || !user) return;

    fetchNotifications();
    fetchSidebarCounts();

    const pollInterval = setInterval(fetchSidebarCounts, 15000);

    const connectSSE = () => {
      const url = `${API}/api/notifications/stream?token=${token}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_lead') {
            const notif = data.notification;
            setNotifications(prev => [notif, ...prev]);
            setUnreadCount(prev => prev + 1);
            fetchSidebarCounts();

            if (audioRef.current) {
              audioRef.current.play().catch(() => {});
            }

            toast.custom((t) => (
              <div className="bg-white rounded-xl shadow-2xl border border-blue-200 p-4 w-[380px] animate-in slide-in-from-right">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-lg font-bold">!</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm">New Lead Received</p>
                    <p className="text-xs text-slate-600 mt-0.5">{notif.customer_name}</p>
                    <p className="text-xs text-slate-500">{notif.vehicle} &bull; {notif.route}</p>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => { window.location.href = `/quotes/${notif.quote_id}`; toast.dismiss(t); }}
                        className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        View Lead
                      </button>
                      <button onClick={() => { window.location.href = `/quotes/${notif.quote_id}`; toast.dismiss(t); }}
                        className="px-3 py-1 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                        Start Quote
                      </button>
                      <button onClick={() => toast.dismiss(t)}
                        className="px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ), { duration: 15000, position: 'top-right' });
          }
          if (data.type === 'chat_message') {
            fetchSidebarCounts();
          }
        } catch (err) {
          console.error('SSE parse error:', err);
        }
      };

      es.onerror = () => {
        es.close();
        setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    return () => {
      clearInterval(pollInterval);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [token, user, API, fetchNotifications, fetchSidebarCounts]);

  const markAsRead = async (notifId) => {
    try {
      await fetch(`${API}/api/notifications/${notifId}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch(`${API}/api/notifications/read-all`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllRead, fetchNotifications, sidebarCounts, fetchSidebarCounts }}>
      {children}
    </NotificationContext.Provider>
  );
};
