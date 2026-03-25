import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Header } from '../components/Layout';
import { getQuotes, getQuotesAgents, updateQuote, convertQuoteToOrder, deleteQuote } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Search, Eye, UserPlus, ChevronLeft, ChevronRight, FileText, ArrowRightCircle, Car, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const statusColors = {
  lead: 'bg-blue-100 text-blue-700',
  quoted: 'bg-amber-100 text-amber-700',
  order: 'bg-emerald-100 text-emerald-700',
  dispatched: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};
const shippingLabels = { standard: 'Standard (5-7 days)', expedited: 'Expedited (48hr)', enclosed: 'Enclosed (ASAP)' };

const Quotes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';
  const [quotes, setQuotes] = useState([]);
  const [total, setTotal] = useState(0);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(100);
  const [quickView, setQuickView] = useState(null);
  const [assignDialog, setAssignDialog] = useState(null);
  const [assignValue, setAssignValue] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { skip: page * pageSize, limit: pageSize };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (agentFilter !== 'all') params.assigned_to = agentFilter;
      if (search) params.search = search;
      const [qRes, aRes] = await Promise.all([getQuotes(params), getQuotesAgents()]);
      setQuotes(qRes.data.quotes);
      setTotal(qRes.data.total);
      setAgents(aRes.data);
    } catch { toast.error('Failed to fetch quotes'); }
    finally { setLoading(false); }
  }, [page, pageSize, statusFilter, agentFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = () => { setSearch(searchInput); setPage(0); };

  const handleConvertToOrder = async (quote) => {
    try {
      await convertQuoteToOrder(quote.id);
      toast.success(`Quote ${quote.quote_number} converted to order!`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to convert');
    }
  };

  const handleAssign = async () => {
    if (!assignDialog || !assignValue) return;
    try {
      await updateQuote(assignDialog.id, { agent_name: assignValue });
      toast.success('Quote assigned');
      setAssignDialog(null);
      fetchData();
    } catch { toast.error('Failed to assign'); }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Layout>
      <Header title="Quotes">
        <Button onClick={() => navigate('/quotes/new')} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="new-quote-btn">
          <Plus className="w-4 h-4 mr-2" /> New Quote
        </Button>
      </Header>
      <div className="p-6" data-testid="quotes-page">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-5">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px] flex gap-2">
              <Input placeholder="Search name, phone, email, city, agent..." value={searchInput}
                onChange={e => setSearchInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSearch()}
                data-testid="search-quotes" />
              <Button onClick={handleSearch} variant="outline" data-testid="search-btn"><Search className="w-4 h-4" /></Button>
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[150px]" data-testid="status-filter"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="quoted">Quoted</SelectItem>
                <SelectItem value="order">Order</SelectItem>
                <SelectItem value="dispatched">Dispatched</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={agentFilter} onValueChange={v => { setAgentFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[180px]" data-testid="agent-filter"><SelectValue placeholder="Agent" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {agents.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-slate-600" data-testid="quotes-count">Showing {quotes.length} of {total.toLocaleString()} quotes</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(0)} disabled={page === 0}>First</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm text-slate-600 min-w-[100px] text-center">Page {page + 1} of {totalPages || 1}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}><ChevronRight className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>Last</Button>
          </div>
        </div>
        {/* Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-12" data-testid="no-quotes"><FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No quotes found</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="quotes-table">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Quote ID</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Agent</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Customer</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Phone</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Email</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Price</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quotes.map(q => (
                    <tr key={q.id} className="hover:bg-slate-50 transition-colors" data-testid={`quote-row-${q.id}`}>
                      <td className="px-3 py-2.5"><span className="font-mono text-xs font-semibold text-blue-600">{q.quote_number}</span></td>
                      <td className="px-3 py-2.5 text-slate-700 text-xs">{q.agent_name || '-'}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-900 text-xs">{q.customer_name}</td>
                      <td className="px-3 py-2.5 text-slate-600 text-xs">{q.phone || '-'}</td>
                      <td className="px-3 py-2.5 text-slate-600 text-xs truncate max-w-[160px]">{q.email || '-'}</td>
                      <td className="px-3 py-2.5"><span className="font-mono font-bold text-emerald-600 text-xs">${q.price?.toLocaleString() || '0'}</span></td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600"
                            onClick={() => setQuickView(q)} data-testid={`quick-view-${q.id}`} title="Quick View">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600"
                            onClick={() => navigate(`/quotes/${q.id}`)} title="Full Details">
                            <FileText className="w-3.5 h-3.5" />
                          </Button>
                          {q.status !== 'order' && q.status !== 'delivered' && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-emerald-600"
                              onClick={() => handleConvertToOrder(q)} data-testid={`convert-order-${q.id}`} title="Convert to Order">
                              <ArrowRightCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {isSuperAdmin && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-violet-600"
                              onClick={() => { setAssignDialog(q); setAssignValue(q.agent_name || ''); }} title="Assign Agent">
                              <UserPlus className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick View Modal */}
      <Dialog open={!!quickView} onOpenChange={() => setQuickView(null)}>
        <DialogContent className="max-w-lg" data-testid="quick-view-modal">
          <DialogHeader><DialogTitle>Quote {quickView?.quote_number}</DialogTitle></DialogHeader>
          {quickView && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Customer:</span> <span className="font-medium">{quickView.customer_name}</span></div>
                <div><span className="text-slate-500">Agent:</span> <span className="font-medium">{quickView.agent_name || '-'}</span></div>
                <div><span className="text-slate-500">Phone:</span> <span className="font-medium">{quickView.phone || '-'}</span></div>
                <div><span className="text-slate-500">Email:</span> <span className="font-medium">{quickView.email || '-'}</span></div>
                <div><span className="text-slate-500">Vehicle:</span> <span className="font-medium">{[quickView.vehicle_year, quickView.vehicle_make, quickView.vehicle_model].filter(Boolean).join(' ') || '-'}</span></div>
                <div><span className="text-slate-500">Status:</span> <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[quickView.status]}`}>{quickView.status}</span></div>
                <div><span className="text-slate-500">Pickup:</span> <span className="font-medium">{quickView.pickup_address || [quickView.pickup_city, quickView.pickup_state].filter(Boolean).join(', ') || '-'}</span></div>
                <div><span className="text-slate-500">Delivery:</span> <span className="font-medium">{quickView.delivery_address || [quickView.delivery_city, quickView.delivery_state].filter(Boolean).join(', ') || '-'}</span></div>
                <div><span className="text-slate-500">Shipping:</span> <span className="font-medium">{shippingLabels[quickView.shipping_type] || quickView.shipping_type}</span></div>
                <div><span className="text-slate-500">Price:</span> <span className="font-bold text-emerald-600">${quickView.price?.toLocaleString()}</span></div>
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Button onClick={() => { setQuickView(null); navigate(`/quotes/${quickView.id}`); }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" data-testid="quick-view-full">
                  View Full Details
                </Button>
                {quickView.status !== 'order' && (
                  <Button onClick={() => { handleConvertToOrder(quickView); setQuickView(null); }} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="quick-view-convert">
                    Convert to Order
                  </Button>
                )}
                <Button variant="outline" onClick={() => window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${quickView.vehicle_year} ${quickView.vehicle_make} ${quickView.vehicle_model}`)}`, '_blank')} data-testid="quick-view-vehicle">
                  <Car className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent className="max-w-md" data-testid="assign-dialog">
          <DialogHeader><DialogTitle>Assign Quote to Agent</DialogTitle></DialogHeader>
          <div className="space-y-3 py-3">
            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <p><span className="text-slate-500">Quote:</span> <span className="font-mono font-medium">{assignDialog?.quote_number}</span></p>
              <p><span className="text-slate-500">Customer:</span> <span className="font-medium">{assignDialog?.customer_name}</span></p>
            </div>
            <Input value={assignValue} onChange={e => setAssignValue(e.target.value)} placeholder="Agent name" list="agents-dl" data-testid="assign-input" />
            <datalist id="agents-dl">{agents.map(a => <option key={a} value={a} />)}</datalist>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(null)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAssign} data-testid="assign-confirm">Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Quotes;
