import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import {
  LayoutDashboard,
  FileText,
  Package,
  Receipt,
  Settings,
  LogOut,
  ChevronRight,
  UserCog,
  Truck,
  Bell,
  Eye,
  FileEdit,
  X,
  CheckCheck,
  Users,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';

const getNavigation = (isSuperAdmin) => {
  const baseNav = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Leads', href: '/leads', icon: Users },
    { name: 'Quotes', href: '/quotes', icon: FileText },
    { name: 'Orders', href: '/orders', icon: Package },
    { name: 'Invoices', href: '/invoices', icon: Receipt },
    { name: 'Chat', href: '/chat', icon: MessageSquare },
  ];
  if (isSuperAdmin) {
    baseNav.push({ name: 'Users', href: '/users', icon: UserCog });
    baseNav.push({ name: 'Admin Panel', href: '/admin', icon: ShieldCheck });
  }
  baseNav.push({ name: 'Settings', href: '/settings', icon: Settings });
  return baseNav;
};

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === 'superadmin';
  const navigation = getNavigation(isSuperAdmin);
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 flex flex-col z-40" data-testid="sidebar">
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
          <Truck className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-lg font-heading font-bold text-white">Breamway</span>
          <span className="text-blue-400 text-xs ml-1 block -mt-1">Auto Transport</span>
        </div>
      </div>
      <nav className="flex-1 py-6 px-3 overflow-y-auto">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink to={item.href}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}>
                <item.icon className="w-5 h-5" />
                <span className="flex-1">{item.name}</span>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">{user?.full_name?.charAt(0) || 'U'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.full_name || 'User'}</p>
            <div className="flex items-center gap-1">
              {user?.role === 'superadmin' && <span className="text-xs text-rose-400 font-medium">Super Admin</span>}
              {user?.role === 'admin' && <span className="text-xs text-blue-400 font-medium">Admin</span>}
              {user?.role === 'staff' && <span className="text-xs text-slate-400">Staff</span>}
            </div>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors duration-200"
          data-testid="logout-button">
          <LogOut className="w-4 h-4" />Sign out
        </button>
      </div>
    </aside>
  );
};

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications() || {};
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!notifications) return null;

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="relative" ref={panelRef} data-testid="notification-bell-wrapper">
      <button onClick={() => setOpen(!open)}
        className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        data-testid="notification-bell">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse"
            data-testid="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
          data-testid="notification-panel"
          style={{ animation: 'fadeIn 0.15s ease-out' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-900 text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1" data-testid="mark-all-read">
                  <CheckCheck className="w-3 h-3" /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 20).map(n => (
                <div key={n.id}
                  className={`px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer ${!n.is_read ? 'bg-blue-50/50 border-l-2 border-blue-500' : ''}`}
                  data-testid={`notification-item-${n.id}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${n.type === 'new_lead' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={(e) => { e.stopPropagation(); markAsRead(n.id); setOpen(false); navigate(`/quotes/${n.quote_id}`); }}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1" data-testid={`notif-view-${n.id}`}>
                          <Eye className="w-3 h-3" /> View
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); markAsRead(n.id); setOpen(false); navigate(`/quotes/${n.quote_id}`); }}
                          className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                          <FileEdit className="w-3 h-3" /> Quote
                        </button>
                        <span className="text-xs text-slate-400 ml-auto">{formatTime(n.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const Header = ({ title, children }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
      <h1 className="page-title">{title}</h1>
      <div className="flex items-center gap-3">
        {children}
        <NotificationBell />
      </div>
    </header>
  );
};

export const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <main className="ml-64">{children}</main>
    </div>
  );
};
