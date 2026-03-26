import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Header } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { createReminder, getReminders, getTodayReminders, updateReminder, deleteReminder } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import {
  Calendar as CalIcon, Plus, Bell, Truck, Package, Phone, Clock,
  ChevronLeft, ChevronRight, Pencil, Trash2, CheckCircle, AlertTriangle, Filter, X,
} from 'lucide-react';
import { toast } from 'sonner';

const TYPE_CONFIG = {
  pickup:    { label: 'Pickup', color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500', icon: Truck },
  dispatch:  { label: 'Dispatch', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: Package },
  follow_up: { label: 'Follow Up', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500', icon: Phone },
  custom:    { label: 'Custom', color: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-500', icon: Bell },
};

const STATUS_CONFIG = {
  pending:   { label: 'Pending', color: 'bg-amber-50 text-amber-700' },
  completed: { label: 'Done', color: 'bg-emerald-50 text-emerald-700' },
  missed:    { label: 'Missed', color: 'bg-red-50 text-red-700' },
};

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

const Reminders = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  const [reminders, setReminders] = useState([]);
  const [todayReminders, setTodayReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState('');
  const [filterType, setFilterType] = useState('');
  const [viewMonth, setViewMonth] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });

  // Dialog states
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [form, setForm] = useState({
    title: '', notes: '', reminder_date: '', reminder_type: 'custom',
    order_number: '', order_id: '', quote_number: '',
  });

  const monthStart = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-01`;
  const monthEnd = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-${getDaysInMonth(viewMonth.year, viewMonth.month)}`;
  const monthLabel = new Date(viewMonth.year, viewMonth.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

  const fetchReminders = useCallback(async () => {
    try {
      const params = { start_date: monthStart, end_date: monthEnd };
      if (filterUser) params.user_id = filterUser;
      if (filterType) params.status = filterType;
      const res = await getReminders(params);
      setReminders(res.data.reminders || []);
    } catch { /* ignore */ }
  }, [monthStart, monthEnd, filterUser, filterType]);

  const fetchToday = useCallback(async () => {
    try {
      const res = await getTodayReminders();
      setTodayReminders(res.data.reminders || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchReminders(), fetchToday()]);
      setLoading(false);
    };
    load();
  }, [fetchReminders, fetchToday]);

  const openAdd = (date) => {
    setForm({
      title: '', notes: '', reminder_date: date || new Date().toISOString().slice(0, 10),
      reminder_type: 'custom', order_number: '', order_id: '', quote_number: '',
    });
    setShowAdd(true);
  };

  const openEdit = (r) => {
    setEditItem(r);
    setForm({
      title: r.title, notes: r.notes, reminder_date: r.reminder_date,
      reminder_type: r.reminder_type, order_number: r.order_number || '',
      order_id: r.order_id || '', quote_number: r.quote_number || '',
    });
  };

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error('Title is required');
    if (!form.reminder_date) return toast.error('Date is required');
    try {
      if (editItem) {
        await updateReminder(editItem.id, form);
        toast.success('Reminder updated');
        setEditItem(null);
      } else {
        await createReminder(form);
        toast.success('Reminder created');
        setShowAdd(false);
      }
      fetchReminders();
      fetchToday();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to save'); }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      await deleteReminder(deleteItem.id);
      toast.success('Reminder deleted');
      setDeleteItem(null);
      fetchReminders();
      fetchToday();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to delete'); }
  };

  const handleComplete = async (r) => {
    try {
      await updateReminder(r.id, { status: r.status === 'completed' ? 'pending' : 'completed' });
      toast.success(r.status === 'completed' ? 'Marked pending' : 'Marked complete');
      fetchReminders();
      fetchToday();
    } catch { toast.error('Failed to update'); }
  };

  const prevMonth = () => setViewMonth(p => p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 });
  const nextMonth = () => setViewMonth(p => p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 });

  const today = new Date().toISOString().slice(0, 10);

  // Build calendar grid
  const daysInMonth = getDaysInMonth(viewMonth.year, viewMonth.month);
  const firstDay = getFirstDayOfMonth(viewMonth.year, viewMonth.month);
  const calDays = [];
  for (let i = 0; i < firstDay; i++) calDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calDays.push(d);

  // Group reminders by date
  const remindersByDate = {};
  reminders.forEach(r => {
    if (!remindersByDate[r.reminder_date]) remindersByDate[r.reminder_date] = [];
    remindersByDate[r.reminder_date].push(r);
  });

  // Unique users for filter
  const uniqueUsers = [...new Map(reminders.map(r => [r.user_id, { id: r.user_id, name: r.user_name }])).values()];

  if (loading) return <Layout><div className="flex items-center justify-center h-[80vh]"><div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" /></div></Layout>;

  const ReminderForm = () => (
    <div className="space-y-4 py-2">
      <div>
        <Label className="text-xs text-slate-500 uppercase">Title *</Label>
        <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="e.g. Pickup for John Doe - Toyota Camry" data-testid="reminder-title-input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-slate-500 uppercase">Date *</Label>
          <Input type="date" value={form.reminder_date} onChange={e => setForm(f => ({ ...f, reminder_date: e.target.value }))} data-testid="reminder-date-input" />
        </div>
        <div>
          <Label className="text-xs text-slate-500 uppercase">Type</Label>
          <Select value={form.reminder_type} onValueChange={v => setForm(f => ({ ...f, reminder_type: v }))}>
            <SelectTrigger data-testid="reminder-type-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-slate-500 uppercase">Order #</Label>
          <Input value={form.order_number} onChange={e => setForm(f => ({ ...f, order_number: e.target.value }))} placeholder="ORD000001" />
        </div>
        <div>
          <Label className="text-xs text-slate-500 uppercase">Quote #</Label>
          <Input value={form.quote_number} onChange={e => setForm(f => ({ ...f, quote_number: e.target.value }))} placeholder="BR000001" />
        </div>
      </div>
      <div>
        <Label className="text-xs text-slate-500 uppercase">Notes</Label>
        <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Pickup scheduled at 9am. Customer phone: 555-1234. Special instructions..." rows={3} data-testid="reminder-notes-input" />
      </div>
    </div>
  );

  return (
    <Layout>
      <Header title="Reminder Calendar">
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => openAdd()} data-testid="add-reminder-btn">
          <Plus className="w-4 h-4 mr-2" />New Reminder
        </Button>
      </Header>

      <div className="p-6 space-y-6" data-testid="reminders-page">
        {/* Today's Reminders Banner */}
        {todayReminders.length > 0 && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-5 text-white" data-testid="today-banner">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Today's Reminders ({todayReminders.length})</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {todayReminders.map(r => {
                const tc = TYPE_CONFIG[r.reminder_type] || TYPE_CONFIG.custom;
                return (
                  <div key={r.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20" data-testid={`today-reminder-${r.id}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${tc.color}`}>{tc.label}</span>
                      {isAdmin && <span className="text-xs text-blue-200">{r.user_name}</span>}
                    </div>
                    <p className="font-medium text-sm">{r.title}</p>
                    {r.notes && <p className="text-xs text-blue-200 mt-1 line-clamp-2">{r.notes}</p>}
                    {r.order_number && <p className="text-xs text-blue-300 mt-1 font-mono">{r.order_number}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => handleComplete(r)}
                        className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${r.status === 'completed' ? 'bg-emerald-500/30 text-emerald-200' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                        {r.status === 'completed' ? 'Done' : 'Mark Done'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters + Month Navigation */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><ChevronLeft className="w-5 h-5" /></button>
            <h2 className="font-semibold text-slate-900 text-lg min-w-[180px] text-center">{monthLabel}</h2>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && uniqueUsers.length > 0 && (
              <Select value={filterUser || 'all'} onValueChange={v => setFilterUser(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-36 h-9 text-xs" data-testid="filter-user">
                  <Filter className="w-3 h-3 mr-1" /><SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {uniqueUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={filterType || 'all'} onValueChange={v => setFilterType(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-32 h-9 text-xs" data-testid="filter-type">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="calendar-grid">
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="px-2 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calDays.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-slate-100 bg-slate-50/30" />;
              const dateStr = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayReminders = remindersByDate[dateStr] || [];
              const isToday = dateStr === today;
              return (
                <div key={day} className={`min-h-[100px] border-b border-r border-slate-100 p-1.5 cursor-pointer hover:bg-blue-50/30 transition-colors ${isToday ? 'bg-blue-50/50' : ''}`}
                  onClick={() => openAdd(dateStr)} data-testid={`cal-day-${day}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${isToday ? 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center' : 'text-slate-700'}`}>
                      {day}
                    </span>
                    {dayReminders.length > 0 && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">{dayReminders.length}</span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {dayReminders.slice(0, 3).map(r => {
                      const tc = TYPE_CONFIG[r.reminder_type] || TYPE_CONFIG.custom;
                      return (
                        <div key={r.id} className={`text-[10px] px-1.5 py-0.5 rounded truncate border ${tc.color} ${r.status === 'completed' ? 'opacity-50 line-through' : ''}`}
                          onClick={e => { e.stopPropagation(); openEdit(r); }} data-testid={`reminder-${r.id}`}>
                          {r.title}
                        </div>
                      );
                    })}
                    {dayReminders.length > 3 && <span className="text-[10px] text-slate-400">+{dayReminders.length - 3} more</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reminders List (below calendar) */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900 text-sm">{monthLabel} Reminders ({reminders.length})</h3>
          </div>
          {reminders.length === 0 ? (
            <div className="text-center py-12">
              <CalIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No reminders this month</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {reminders.map(r => {
                const tc = TYPE_CONFIG[r.reminder_type] || TYPE_CONFIG.custom;
                const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                const TIcon = tc.icon;
                const isPast = r.reminder_date < today && r.status === 'pending';
                return (
                  <div key={r.id} className={`px-5 py-3 flex items-center gap-4 hover:bg-slate-50 ${isPast ? 'bg-red-50/30' : ''}`} data-testid={`list-reminder-${r.id}`}>
                    <button onClick={() => handleComplete(r)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${r.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400 hover:bg-blue-100 hover:text-blue-600'}`}>
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tc.color}`}>
                      <TIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-sm ${r.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>{r.title}</span>
                        {isPast && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                      </div>
                      {r.notes && <p className="text-xs text-slate-500 truncate mt-0.5">{r.notes}</p>}
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(r.reminder_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        {r.order_number && <span className="font-mono text-blue-500">{r.order_number}</span>}
                        {isAdmin && <span className="text-slate-500">{r.user_name}</span>}
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${sc.color}`}>{sc.label}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteItem(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Reminder Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md" data-testid="add-reminder-dialog">
          <DialogHeader><DialogTitle>New Reminder</DialogTitle></DialogHeader>
          <ReminderForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave} data-testid="save-reminder-btn">Create Reminder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Reminder Dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-md" data-testid="edit-reminder-dialog">
          <DialogHeader><DialogTitle>Edit Reminder</DialogTitle></DialogHeader>
          <ReminderForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave} data-testid="update-reminder-btn">Update Reminder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-red-600">Delete Reminder?</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 py-2">Delete "<strong>{deleteItem?.title}</strong>"? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Reminders;
