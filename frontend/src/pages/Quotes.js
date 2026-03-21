import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Header } from '../components/Layout';
import { getQuotes, getQuotesCount, getQuotesAgents, createQuote, updateQuote, getLeads } from '../lib/api';
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
import { Plus, Search, Edit, FileText, Eye, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
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
  const [pageSize] = useState(50);
  
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

      const [quotesRes, countRes, agentsRes] = await Promise.all([
        getQuotes(params),
        getQuotesCount(params),
        getQuotesAgents()
      ]);
      
      setQuotes(quotesRes.data);
      setTotalQuotes(countRes.data.total);
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

  const getStatusClass = (status) => {
    const statusMap = {
      pending: 'status-pending',
      approved: 'status-approved',
      rejected: 'status-rejected',
      converted: 'status-converted'
    };
    return statusMap[status] || 'status-pending';
  };

  const totalPages = Math.ceil(totalQuotes / pageSize);

  return (
    <Layout>
      <Header title="Quotes">
        <Button
          onClick={() => navigate('/leads')}
          variant="outline"
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
                  placeholder="Search quotes, cities, agents..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="form-input"
                  data-testid="search-quotes"
                />
                <Button onClick={handleSearch} variant="outline">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[150px]">
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
              <SelectTrigger className="w-[180px]">
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

        {/* Stats */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-600">
            Showing {quotes.length} of {totalQuotes.toLocaleString()} quotes
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-600">
              Page {page + 1} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No quotes found</p>
            </div>
          ) : (
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Quote #</th>
                  <th>Route</th>
                  <th>Price</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-slate-50">
                    <td>
                      <span className="font-mono font-medium text-slate-900">{quote.quote_number}</span>
                    </td>
                    <td>
                      <div className="text-sm">
                        <span className="text-slate-700">{quote.pickup_city}, {quote.pickup_state}</span>
                        <span className="text-slate-400 mx-1">→</span>
                        <span className="text-slate-700">{quote.delivery_city}, {quote.delivery_state}</span>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono font-medium text-emerald-600">
                        ${quote.price?.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-slate-600">{quote.assigned_to || '-'}</span>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusClass(quote.status)}`}>
                        {quote.status}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-sm text-slate-500">
                        {new Date(quote.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/quotes/${quote.id}`)}
                          className="text-blue-600 hover:bg-blue-50"
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
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/quotes/${quote.id}`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Assign Dialog */}
        {isSuperAdmin && (
          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogContent className="max-w-md">
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
                  />
                  <datalist id="agents-list">
                    {agents.map((agent) => (
                      <option key={agent} value={agent} />
                    ))}
                  </datalist>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAssignQuote}>
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
