import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Header } from '../components/Layout';
import { getOrders, updateOrder } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Search, Eye, ChevronLeft, ChevronRight, Truck, Package } from 'lucide-react';
import { toast } from 'sonner';

const statusColors = {
  pending: 'bg-amber-100 text-amber-700',
  assigned: 'bg-blue-100 text-blue-700',
  picked_up: 'bg-cyan-100 text-cyan-700',
  in_transit: 'bg-purple-100 text-purple-700',
  delivered: 'bg-emerald-100 text-emerald-700',
};
const statusLabels = {
  pending: 'Pending', assigned: 'Assigned', picked_up: 'Picked Up', in_transit: 'In Transit', delivered: 'Delivered'
};

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(100);
  const [quickView, setQuickView] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { skip: page * pageSize, limit: pageSize };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search) params.search = search;
      const res = await getOrders(params);
      setOrders(res.data.orders);
      setTotal(res.data.total);
    } catch { toast.error('Failed to fetch orders'); }
    finally { setLoading(false); }
  }, [page, pageSize, statusFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = () => { setSearch(searchInput); setPage(0); };
  const totalPages = Math.ceil(total / pageSize);

  return (
    <Layout>
      <Header title="Orders" />
      <div className="p-6" data-testid="orders-page">
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-5">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px] flex gap-2">
              <Input placeholder="Search order #, customer, phone, carrier, city..." value={searchInput}
                onChange={e => setSearchInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSearch()} data-testid="search-orders" />
              <Button onClick={handleSearch} variant="outline"><Search className="w-4 h-4" /></Button>
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[160px]" data-testid="order-status-filter"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-slate-600">Showing {orders.length} of {total.toLocaleString()} orders</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(0)} disabled={page === 0}>First</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm text-slate-600 min-w-[100px] text-center">Page {page + 1} of {totalPages || 1}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}><ChevronRight className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>Last</Button>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12" data-testid="no-orders"><Package className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No orders yet. Convert quotes to create orders.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="orders-table">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Order #</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Quote #</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Customer</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Phone</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Route</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Price</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Carrier</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50 transition-colors" data-testid={`order-row-${o.id}`}>
                      <td className="px-3 py-2.5"><span className="font-mono text-xs font-semibold text-emerald-600">{o.order_number}</span></td>
                      <td className="px-3 py-2.5"><span className="font-mono text-xs text-blue-600">{o.quote_number}</span></td>
                      <td className="px-3 py-2.5 font-medium text-slate-900 text-xs">{o.customer_name}</td>
                      <td className="px-3 py-2.5 text-slate-600 text-xs">{o.phone || '-'}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-700">{[o.pickup_city, o.pickup_state].filter(Boolean).join(', ')} → {[o.delivery_city, o.delivery_state].filter(Boolean).join(', ')}</td>
                      <td className="px-3 py-2.5"><span className="font-mono font-bold text-emerald-600 text-xs">${o.price?.toLocaleString() || '0'}</span></td>
                      <td className="px-3 py-2.5 text-xs text-slate-700">{o.carrier_name || '-'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[o.status] || 'bg-slate-100 text-slate-600'}`}>
                          {statusLabels[o.status] || o.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600"
                            onClick={() => setQuickView(o)} title="Quick View"><Eye className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600"
                            onClick={() => navigate(`/orders/${o.id}`)} title="Full Details"><Truck className="w-3.5 h-3.5" /></Button>
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

      {/* Quick View */}
      <Dialog open={!!quickView} onOpenChange={() => setQuickView(null)}>
        <DialogContent className="max-w-lg" data-testid="order-quick-view">
          <DialogHeader><DialogTitle>Order {quickView?.order_number}</DialogTitle></DialogHeader>
          {quickView && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Quote:</span> <span className="font-mono font-medium">{quickView.quote_number}</span></div>
                <div><span className="text-slate-500">Customer:</span> <span className="font-medium">{quickView.customer_name}</span></div>
                <div><span className="text-slate-500">Phone:</span> <span className="font-medium">{quickView.phone || '-'}</span></div>
                <div><span className="text-slate-500">Email:</span> <span className="font-medium">{quickView.email || '-'}</span></div>
                <div><span className="text-slate-500">Vehicle:</span> <span className="font-medium">{[quickView.vehicle_year, quickView.vehicle_make, quickView.vehicle_model].filter(Boolean).join(' ')}</span></div>
                <div><span className="text-slate-500">Price:</span> <span className="font-bold text-emerald-600">${quickView.price?.toLocaleString()}</span></div>
                <div><span className="text-slate-500">Route:</span> <span className="font-medium">{quickView.pickup_city} → {quickView.delivery_city}</span></div>
                <div><span className="text-slate-500">Status:</span> <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[quickView.status]}`}>{statusLabels[quickView.status]}</span></div>
                <div><span className="text-slate-500">Carrier:</span> <span className="font-medium">{quickView.carrier_name || 'Not assigned'}</span></div>
                <div><span className="text-slate-500">Driver:</span> <span className="font-medium">{quickView.driver_name || '-'}</span></div>
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Button onClick={() => { setQuickView(null); navigate(`/orders/${quickView.id}`); }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                  View Full Details
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Orders;
