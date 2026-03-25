import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Header } from '../components/Layout';
import { getRevenueForms, getRevenueAdminSummary, getRevenueMonthlyHistory, updateRevenueForm, deleteRevenueForm } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ScrollArea } from '../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import {
  DollarSign, Users, CreditCard, RefreshCw, TrendingUp, Filter,
  Pencil, Trash2, Calendar, BarChart3, ChevronDown, ChevronUp, X,
} from 'lucide-react';
import { toast } from 'sonner';

const PAYMENT_COLORS = {
  Zelle: 'bg-purple-100 text-purple-700',
  COD: 'bg-slate-100 text-slate-700',
  CashApp: 'bg-green-100 text-green-700',
  Venmo: 'bg-blue-100 text-blue-700',
  ACH: 'bg-cyan-100 text-cyan-700',
  Card: 'bg-amber-100 text-amber-700',
};
const PAYMENT_METHODS = ['Zelle', 'COD', 'CashApp', 'Venmo', 'ACH', 'Card'];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getMonthLabel = (monthKey) => {
  if (!monthKey) return '';
  const [y, m] = monthKey.split('-');
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
};

const getMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    options.push({ value: val, label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` });
  }
  return options;
};

const Revenue = () => {
  const [summary, setSummary] = useState(null);
  const [forms, setForms] = useState([]);
  const [formsTotal, setFormsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [monthlyHistory, setMonthlyHistory] = useState([]);
  const [historyUser, setHistoryUser] = useState('');
  const [showHistory, setShowHistory] = useState(true);

  // Edit dialog state
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await getRevenueAdminSummary(filterMonth || undefined);
      setSummary(res.data);
    } catch { /* ignore */ }
  }, [filterMonth]);

  const fetchForms = useCallback(async () => {
    try {
      const params = { limit: 200 };
      if (filterUser) params.user_id = filterUser;
      const res = await getRevenueForms(params);
      setForms(res.data.forms);
      setFormsTotal(res.data.total);
    } catch { /* ignore */ }
  }, [filterUser]);

  const fetchHistory = useCallback(async () => {
    try {
      const params = {};
      if (historyUser) params.user_id = historyUser;
      const res = await getRevenueMonthlyHistory(params);
      setMonthlyHistory(res.data.history || []);
    } catch { /* ignore */ }
  }, [historyUser]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchSummary(), fetchForms(), fetchHistory()]);
      setLoading(false);
    };
    load();
  }, [fetchSummary, fetchForms, fetchHistory]);

  const refreshAll = () => { fetchSummary(); fetchForms(); fetchHistory(); };

  const handleEdit = (item) => {
    setEditItem(item);
    setEditForm({
      deposit_amount: item.deposit_amount || 0,
      payment_method: item.payment_method || 'Zelle',
      customer_name: item.customer_name || '',
      notes: item.notes || '',
    });
  };

  const handleEditSave = async () => {
    if (!editItem) return;
    setEditSaving(true);
    try {
      await updateRevenueForm(editItem.id, editForm);
      toast.success('Revenue entry updated');
      setEditItem(null);
      refreshAll();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to update'); }
    finally { setEditSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await deleteRevenueForm(deleteItem.id);
      toast.success('Revenue entry deleted');
      setDeleteItem(null);
      refreshAll();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to delete'); }
    finally { setDeleting(false); }
  };

  if (loading) return <Layout><div className="flex items-center justify-center h-[80vh]"><div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" /></div></Layout>;

  const s = summary || {};
  const monthOptions = getMonthOptions();

  return (
    <Layout>
      <Header title="Revenue Dashboard">
        <div className="flex gap-2 items-center">
          <Select value={filterMonth || 'all'} onValueChange={v => setFilterMonth(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40 h-9" data-testid="month-filter">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" /><SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              {monthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={refreshAll} data-testid="refresh-revenue">
            <RefreshCw className="w-4 h-4 mr-2" />Refresh
          </Button>
        </div>
      </Header>
      <div className="p-6 space-y-6" data-testid="revenue-page">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Deposits {filterMonth ? `(${getMonthLabel(filterMonth)})` : ''}</p>
                <p className="text-2xl font-heading font-bold text-emerald-600" data-testid="total-deposits">${(s.total_deposits || 0).toLocaleString()}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400">{s.total_forms || 0} revenue forms</p>
          </div>

          {/* Revenue by Agent */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-slate-900 text-sm">Revenue by Agent</h3>
            </div>
            <div className="space-y-2">
              {(s.by_user || []).map((u, i) => (
                <div key={i} className="flex items-center justify-between cursor-pointer hover:bg-slate-50 rounded-lg px-2 py-1.5 -mx-2"
                  onClick={() => setFilterUser(filterUser === u.user_id ? '' : u.user_id)}
                  data-testid={`agent-row-${i}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                      {u.name?.charAt(0)}
                    </div>
                    <span className="text-sm text-slate-700">{u.name}</span>
                    <span className="text-xs text-slate-400">({u.count})</span>
                  </div>
                  <span className="font-semibold text-sm text-emerald-600">${u.total_deposit.toLocaleString()}</span>
                </div>
              ))}
              {(!s.by_user || s.by_user.length === 0) && <p className="text-xs text-slate-400">No data yet</p>}
            </div>
          </div>

          {/* Revenue by Payment Method */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4 text-amber-600" />
              <h3 className="font-semibold text-slate-900 text-sm">By Payment Method</h3>
            </div>
            <div className="space-y-2">
              {(s.by_payment_method || []).map((m, i) => {
                const pct = s.total_deposits > 0 ? (m.total / s.total_deposits * 100) : 0;
                return (
                  <div key={i} data-testid={`method-row-${i}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${PAYMENT_COLORS[m.method] || 'bg-slate-100 text-slate-700'}`}>{m.method}</span>
                      <span className="text-xs font-semibold text-slate-700">${m.total.toLocaleString()} ({m.count})</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {(!s.by_payment_method || s.by_payment_method.length === 0) && <p className="text-xs text-slate-400">No data yet</p>}
            </div>
          </div>
        </div>

        {/* Monthly Revenue History */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-slate-900 text-sm">Monthly Revenue History</h3>
            </div>
            <div className="flex items-center gap-2">
              <Select value={historyUser || 'all'} onValueChange={v => setHistoryUser(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-36 h-8 text-xs" data-testid="history-user-filter">
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {(s.by_user || []).map(u => <SelectItem key={u.user_id} value={u.user_id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <button onClick={() => setShowHistory(!showHistory)} className="text-slate-400 hover:text-slate-600">
                {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {showHistory && (
            <div className="p-5">
              {monthlyHistory.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-6">No monthly data yet</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="monthly-history-grid">
                  {monthlyHistory.map(m => {
                    const maxTotal = Math.max(...monthlyHistory.map(h => h.total), 1);
                    const pct = (m.total / maxTotal) * 100;
                    return (
                      <div key={m.month} className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-blue-200 transition-colors" data-testid={`month-card-${m.month}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-slate-800 text-sm">{getMonthLabel(m.month)}</span>
                          <span className="text-xs text-slate-400">{m.count} entries</span>
                        </div>
                        <p className="text-xl font-bold text-emerald-600 font-mono mb-2">${m.total.toLocaleString()}</p>
                        <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
                          <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        {m.users && m.users.length > 0 && (
                          <div className="space-y-1">
                            {m.users.map((u, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-slate-600 truncate max-w-[100px]">{u.name}</span>
                                <span className="font-semibold text-slate-700">${u.total.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filter */}
        {filterUser && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700">Filtering by agent</span>
            <button onClick={() => setFilterUser('')} className="ml-auto text-xs font-medium text-blue-600 hover:text-blue-800">Clear Filter</button>
          </div>
        )}

        {/* All Revenue Forms Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 text-sm">All Revenue Submissions ({formsTotal})</h3>
          </div>
          {forms.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No revenue forms submitted yet.</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <table className="w-full text-sm" data-testid="revenue-forms-table">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Order #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Route</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Agent</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Method</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Deposit</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {forms.map(f => (
                    <tr key={f.id} className="hover:bg-slate-50" data-testid={`rev-row-${f.id}`}>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{new Date(f.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-emerald-600 font-semibold">{f.order_number}</td>
                      <td className="px-4 py-2.5 text-xs font-medium text-slate-900">{f.customer_name}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-600 max-w-[200px] truncate">{f.route}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-700">{f.submitted_by}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${PAYMENT_COLORS[f.payment_method] || 'bg-slate-100 text-slate-700'}`}>{f.payment_method}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-sm text-emerald-600">${(f.deposit_amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEdit(f)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" data-testid={`edit-rev-${f.id}`}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteItem(f)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" data-testid={`delete-rev-${f.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-md" data-testid="edit-revenue-dialog">
          <DialogHeader>
            <DialogTitle>Edit Revenue Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
              <span className="font-mono font-semibold text-emerald-600">{editItem?.order_number}</span> — {editItem?.submitted_by}
            </div>
            <div>
              <Label className="text-xs text-slate-500 uppercase">Deposit Amount</Label>
              <Input type="number" step="0.01" value={editForm.deposit_amount || 0}
                onChange={e => setEditForm(f => ({ ...f, deposit_amount: parseFloat(e.target.value) || 0 }))}
                className="mt-1 text-lg font-bold text-emerald-600 font-mono" data-testid="edit-deposit-input" />
            </div>
            <div>
              <Label className="text-xs text-slate-500 uppercase">Payment Method</Label>
              <Select value={editForm.payment_method || 'Zelle'} onValueChange={v => setEditForm(f => ({ ...f, payment_method: v }))}>
                <SelectTrigger className="mt-1" data-testid="edit-payment-method"><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500 uppercase">Customer Name</Label>
              <Input value={editForm.customer_name || ''} onChange={e => setEditForm(f => ({ ...f, customer_name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-500 uppercase">Notes</Label>
              <Input value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" placeholder="Optional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleEditSave} disabled={editSaving} data-testid="save-edit-revenue">
              {editSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <DialogContent className="max-w-sm" data-testid="delete-revenue-dialog">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Revenue Entry</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-slate-600">Are you sure you want to delete this revenue entry?</p>
            <div className="mt-3 bg-red-50 rounded-lg p-3 text-sm">
              <p className="font-mono font-semibold text-red-700">{deleteItem?.order_number}</p>
              <p className="text-red-600">Deposit: ${(deleteItem?.deposit_amount || 0).toLocaleString()}</p>
              <p className="text-xs text-red-500 mt-1">This will update all dashboard totals and reports.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete} disabled={deleting} data-testid="confirm-delete-revenue">
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Revenue;
