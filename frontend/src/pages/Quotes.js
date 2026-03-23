import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Header } from '../components/Layout';
import { getQuotesEnriched, getQuotesAgents, updateQuote } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Search, FileText, Eye, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const statusOptions = ['pending', 'approved', 'rejected', 'converted'];

const Quotes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';
  
  const [quotes, setQuotes] = useState([]);
  const [totalQuotes, setTotalQuotes] = useState(0);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assigningQuote, setAssigningQuote] = useState(null);
  const [selectedUser, setSelectedUser] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        skip: page * pageSize,
        limit: pageSize
      };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (assignedFilter !== 'all') params.assigned_to = assignedFilter;
      if (search) params.search = search;

      const [enrichedRes, agentsRes] = await Promise.all([
        getQuotesEnriched(params),
        getQuotesAgents()
      ]);
      
      setQuotes(enrichedRes.data.quotes);
      setTotalQuotes(enrichedRes.data.total);
      setAgents(agentsRes.data);
    } catch (error) {
      toast.error('Failed to fetch quotes');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, assignedFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleAssignQuote = async () => {
    if (!assigningQuote || !selectedUser) return;
    try {
      await updateQuote(assigningQuote.id, {
        ...assigningQuote,
        assigned_to: selectedUser
      });
      toast.success('Quote assigned successfully');
      setIsAssignDialogOpen(false);
      setAssigningQuote(null);
      setSelectedUser('');
      fetchData();
    } catch (error) {
      toast.error('Failed to assign quote');
    }
  };

  const totalPages = Math.ceil(totalQuotes / pageSize);

  return (
    <Layout>
      <Header title="Quotes">
        <Button
          onClick={() => navigate('/leads')}
          variant="outline"
          data-testid="create-from-lead-btn"
        >
          Create from Lead
        </Button>
      </Header>

      <div className="p-6" data-testid="quotes-page">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative flex gap-2">
                <Input
                  placeholder="Search by name, phone, email, city..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="form-input"
                  data-testid="search-quotes"
                />
                <Button onClick={handleSearch} variant="outline" data-testid="search-quotes-btn">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[150px]" data-testid="status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={assignedFilter} onValueChange={(v) => { setAssignedFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[180px]" data-testid="agent-filter">
                <SelectValue placeholder="Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent} value={agent}>
                    {agent}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats & Pagination */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-600" data-testid="quotes-count">
            Showing {quotes.length} of {totalQuotes.toLocaleString()} quotes
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Per page:</span>
              <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(parseInt(v)); setPage(0); }}>
                <SelectTrigger className="w-[100px]" data-testid="page-size-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="250">250</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(0)} disabled={page === 0} data-testid="first-page-btn">
                First
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} data-testid="prev-page-btn">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-slate-600 min-w-[100px] text-center" data-testid="page-indicator">
                Page {page + 1} of {totalPages || 1}
              </span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} data-testid="next-page-btn">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} data-testid="last-page-btn">
                Last
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-12" data-testid="no-quotes-message">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No quotes found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full data-table" data-testid="quotes-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Pickup Address</th>
                    <th>Drop-off Address</th>
                    <th>Price</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote) => (
                    <tr key={quote.id} className="hover:bg-slate-50" data-testid={`quote-row-${quote.id}`}>
                      <td>
                        <span className="font-medium text-slate-900">{quote.customer_name || '-'}</span>
                      </td>
                      <td>
                        <span className="text-sm text-slate-700">{quote.customer_phone || '-'}</span>
                      </td>
                      <td>
                        <span className="text-sm text-slate-700 truncate block max-w-[200px]">{quote.customer_email || '-'}</span>
                      </td>
                      <td>
                        <span className="text-sm text-slate-900">
                          {[quote.pickup_city, quote.pickup_state].filter(Boolean).join(', ') || '-'}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm text-slate-900">
                          {[quote.delivery_city, quote.delivery_state].filter(Boolean).join(', ') || '-'}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono font-bold text-emerald-600" data-testid={`quote-price-${quote.id}`}>
                          ${quote.price?.toLocaleString() || '0'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/quotes/${quote.id}`)}
                            className="text-blue-600 hover:bg-blue-50"
                            data-testid={`view-quote-${quote.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {isSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { 
                                setAssigningQuote(quote); 
                                setSelectedUser(quote.assigned_to || ''); 
                                setIsAssignDialogOpen(true); 
                              }}
                              className="text-violet-600 hover:bg-violet-50"
                              data-testid={`assign-quote-${quote.id}`}
                            >
                              <UserPlus className="w-4 h-4" />
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

        {/* Assign Dialog */}
        {isSuperAdmin && (
          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogContent className="max-w-md" data-testid="assign-dialog">
              <DialogHeader>
                <DialogTitle>Assign Quote to Agent</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600">Quote: <span className="font-mono font-medium">{assigningQuote?.quote_number}</span></p>
                  <p className="text-sm text-slate-600">Route: {assigningQuote?.pickup_city} → {assigningQuote?.delivery_city}</p>
                  <p className="text-sm text-slate-600">Current: <span className="font-medium">{assigningQuote?.assigned_to || 'Unassigned'}</span></p>
                </div>
                <div>
                  <Label className="form-label">Assign to</Label>
                  <Input
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="form-input"
                    placeholder="Enter agent name"
                    list="agents-list"
                    data-testid="assign-agent-input"
                  />
                  <datalist id="agents-list">
                    {agents.map((agent) => (
                      <option key={agent} value={agent} />
                    ))}
                  </datalist>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)} data-testid="assign-cancel-btn">
                  Cancel
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAssignQuote} data-testid="assign-confirm-btn">
                  Assign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
};

export default Quotes;
