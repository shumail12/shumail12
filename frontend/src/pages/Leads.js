import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Header } from '../components/Layout';
import { getLeads, convertLeadToQuote } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import { Search, Eye, ChevronLeft, ChevronRight, Users, ArrowRightCircle, Car, FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';

const Leads = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(100);
  const [quickView, setQuickView] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { skip: page * pageSize, limit: pageSize };
      if (search) params.search = search;
      const res = await getLeads(params);
      setLeads(res.data.leads);
      setTotal(res.data.total);
    } catch { toast.error('Failed to fetch leads'); }
    finally { setLoading(false); }
  }, [page, pageSize, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = () => { setSearch(searchInput); setPage(0); };

  const handleConvertToQuote = async (lead) => {
    try {
      await convertLeadToQuote(lead.id);
      toast.success(`Lead ${lead.quote_number} converted to quote!`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to convert');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Layout>
      <Header title="Leads">
        <Button onClick={() => navigate('/leads/new')} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="new-lead-btn">
          <Plus className="w-4 h-4 mr-2" /> New Lead
        </Button>
      </Header>
      <div className="p-6" data-testid="leads-page">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-5">
          <div className="flex gap-3">
            <div className="flex-1 flex gap-2">
              <Input placeholder="Search name, phone, email, city..." value={searchInput}
                onChange={e => setSearchInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSearch()}
                data-testid="search-leads" />
              <Button onClick={handleSearch} variant="outline"><Search className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-slate-600" data-testid="leads-count">Showing {leads.length} of {total.toLocaleString()} leads</p>
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
          ) : leads.length === 0 ? (
            <div className="text-center py-12" data-testid="no-leads"><Users className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No leads yet. New vendor leads will appear here.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="leads-table">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">ID</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Customer</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Phone</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Email</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Vehicle</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Pickup</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Delivery</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Source</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map(lead => (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors" data-testid={`lead-row-${lead.id}`}>
                      <td className="px-3 py-2.5"><span className="font-mono text-xs font-semibold text-blue-600">{lead.quote_number}</span></td>
                      <td className="px-3 py-2.5 font-medium text-slate-900 text-xs">{lead.customer_name}</td>
                      <td className="px-3 py-2.5 text-slate-600 text-xs">{lead.phone || '-'}</td>
                      <td className="px-3 py-2.5 text-slate-600 text-xs truncate max-w-[160px]">{lead.email || '-'}</td>
                      <td className="px-3 py-2.5 text-xs">
                        <button onClick={() => window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${lead.vehicle_year} ${lead.vehicle_make} ${lead.vehicle_model}`)}`, '_blank')}
                          className="text-blue-600 hover:underline cursor-pointer">
                          {[lead.vehicle_year, lead.vehicle_make, lead.vehicle_model].filter(Boolean).join(' ') || '-'}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-700">{[lead.pickup_city, lead.pickup_state].filter(Boolean).join(', ') || '-'}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-700">{[lead.delivery_city, lead.delivery_state].filter(Boolean).join(', ') || '-'}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-500">{lead.source || '-'}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600"
                            onClick={() => setQuickView(lead)} title="Quick View" data-testid={`lead-quick-view-${lead.id}`}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600"
                            onClick={() => navigate(`/leads/${lead.id}`)} title="Full Details">
                            <FileText className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-emerald-600"
                            onClick={() => handleConvertToQuote(lead)} title="Convert to Quote" data-testid={`convert-quote-${lead.id}`}>
                            <ArrowRightCircle className="w-3.5 h-3.5" />
                          </Button>
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
        <DialogContent className="max-w-lg" data-testid="lead-quick-view-modal">
          <DialogHeader><DialogTitle>Lead {quickView?.quote_number}</DialogTitle></DialogHeader>
          {quickView && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Customer:</span> <span className="font-medium">{quickView.customer_name}</span></div>
                <div><span className="text-slate-500">Phone:</span> <span className="font-medium">{quickView.phone || '-'}</span></div>
                <div><span className="text-slate-500">Email:</span> <span className="font-medium">{quickView.email || '-'}</span></div>
                <div><span className="text-slate-500">Source:</span> <span className="font-medium">{quickView.source || '-'}</span></div>
                <div><span className="text-slate-500">Vehicle:</span> <span className="font-medium">{[quickView.vehicle_year, quickView.vehicle_make, quickView.vehicle_model].filter(Boolean).join(' ') || '-'}</span></div>
                <div><span className="text-slate-500">Pickup:</span> <span className="font-medium">{quickView.pickup_address || [quickView.pickup_city, quickView.pickup_state].filter(Boolean).join(', ') || '-'}</span></div>
                <div><span className="text-slate-500">Delivery:</span> <span className="font-medium">{quickView.delivery_address || [quickView.delivery_city, quickView.delivery_state].filter(Boolean).join(', ') || '-'}</span></div>
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Button onClick={() => { setQuickView(null); navigate(`/leads/${quickView.id}`); }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                  View Full Details
                </Button>
                <Button onClick={() => { handleConvertToQuote(quickView); setQuickView(null); }} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="quick-convert-quote">
                  Convert to Quote
                </Button>
                <Button variant="outline" onClick={() => window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${quickView.vehicle_year} ${quickView.vehicle_make} ${quickView.vehicle_model}`)}`, '_blank')}>
                  <Car className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Leads;
