import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Header } from '../components/Layout';
import { getRevenueForms, getRevenueAdminSummary } from '../lib/api';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  DollarSign, Users, CreditCard, RefreshCw, TrendingUp, Filter,
} from 'lucide-react';

const PAYMENT_COLORS = {
  Zelle: 'bg-purple-100 text-purple-700',
  COD: 'bg-slate-100 text-slate-700',
  CashApp: 'bg-green-100 text-green-700',
  Venmo: 'bg-blue-100 text-blue-700',
  ACH: 'bg-cyan-100 text-cyan-700',
  Card: 'bg-amber-100 text-amber-700',
};

const Revenue = () => {
  const [summary, setSummary] = useState(null);
  const [forms, setForms] = useState([]);
  const [formsTotal, setFormsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState('');

  const fetchSummary = useCallback(async () => {
    try {
      const res = await getRevenueAdminSummary();
      setSummary(res.data);
    } catch { /* ignore */ }
  }, []);

  const fetchForms = useCallback(async () => {
    try {
      const params = { limit: 200 };
      if (filterUser) params.user_id = filterUser;
      const res = await getRevenueForms(params);
      setForms(res.data.forms);
      setFormsTotal(res.data.total);
    } catch { /* ignore */ }
  }, [filterUser]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchSummary(), fetchForms()]);
      setLoading(false);
    };
    load();
  }, [fetchSummary, fetchForms]);

  if (loading) return <Layout><div className="flex items-center justify-center h-[80vh]"><div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" /></div></Layout>;

  const s = summary || {};

  return (
    <Layout>
      <Header title="Revenue Dashboard">
        <Button variant="outline" onClick={() => { fetchSummary(); fetchForms(); }} data-testid="refresh-revenue">
          <RefreshCw className="w-4 h-4 mr-2" />Refresh
        </Button>
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
                <p className="text-xs text-slate-500">Total Deposits</p>
                <p className="text-2xl font-heading font-bold text-emerald-600" data-testid="total-deposits">${(s.total_deposits || 0).toLocaleString()}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400">{s.total_forms || 0} revenue forms submitted</p>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Revenue;
