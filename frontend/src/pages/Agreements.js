import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Header } from '../components/Layout';
import { getAgreements, voidAgreement, deleteAgreement } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog';
import {
  Search, Plus, Eye, FileText, ChevronLeft, ChevronRight,
  PenLine, Ban, Trash2, CheckCircle, Clock, Send, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

const statusConfig = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700', icon: FileText },
  sent: { label: 'Sent', className: 'bg-blue-100 text-blue-700', icon: Send },
  signed: { label: 'Signed', className: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  void: { label: 'Void', className: 'bg-rose-100 text-rose-700', icon: Ban },
};

const Agreements = () => {
  const navigate = useNavigate();
  const [agreements, setAgreements] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(50);
  const [confirmAction, setConfirmAction] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { skip: page * pageSize, limit: pageSize };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await getAgreements(params);
      setAgreements(res.data.agreements);
      setTotal(res.data.total);
    } catch {
      toast.error('Failed to fetch agreements');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = () => { setSearch(searchInput); setPage(0); };

  const handleVoid = async (agreement) => {
    try {
      await voidAgreement(agreement.id);
      toast.success('Agreement voided');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to void agreement');
    }
    setConfirmAction(null);
  };

  const handleDelete = async (agreement) => {
    try {
      await deleteAgreement(agreement.id);
      toast.success('Agreement deleted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete agreement');
    }
    setConfirmAction(null);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Layout>
      <Header title="Agreements">
        <Button onClick={() => navigate('/agreements/new')} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="new-agreement-btn">
          <Plus className="w-4 h-4 mr-2" />New Agreement
        </Button>
      </Header>
      <div className="p-6" data-testid="agreements-page">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-5">
          <div className="flex gap-3">
            <div className="flex-1 flex gap-2">
              <Input placeholder="Search agreement #, customer, order..." value={searchInput}
                onChange={e => setSearchInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSearch()}
                data-testid="search-agreements" />
              <Button onClick={handleSearch} variant="outline"><Search className="w-4 h-4" /></Button>
            </div>
            <select className="form-input w-40" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }} data-testid="status-filter">
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="signed">Signed</option>
              <option value="void">Void</option>
            </select>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-slate-600" data-testid="agreements-count">
            Showing {agreements.length} of {total} agreements
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-slate-600">Page {page + 1} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : agreements.length === 0 ? (
            <div className="text-center py-12" data-testid="no-agreements">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No agreements found.</p>
              <p className="text-sm text-slate-400 mt-1">Create agreements from orders to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="agreements-table">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Agreement #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Order #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Vehicle</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Created</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agreements.map(agr => {
                    const sc = statusConfig[agr.status] || statusConfig.draft;
                    return (
                      <tr key={agr.id} className="hover:bg-slate-50 transition-colors" data-testid={`agreement-row-${agr.id}`}>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-semibold text-blue-600">{agr.agreement_number}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{agr.order_number}</td>
                        <td className="px-4 py-3 font-medium text-slate-900 text-xs">{agr.customer_name}</td>
                        <td className="px-4 py-3 text-xs text-slate-700">{agr.vehicle_info || '-'}</td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-900">${(agr.price || 0).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${sc.className}`}>
                            <sc.icon className="w-3 h-3" />{sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {new Date(agr.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600"
                              onClick={() => navigate(`/agreements/${agr.id}`)} title="View/Edit" data-testid={`view-agreement-${agr.id}`}>
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            {agr.status !== 'signed' && agr.status !== 'void' && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-amber-600"
                                onClick={() => setConfirmAction({ type: 'void', agreement: agr })} title="Void">
                                <Ban className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {agr.status !== 'signed' && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-red-600"
                                onClick={() => setConfirmAction({ type: 'delete', agreement: agr })} title="Delete" data-testid={`delete-agreement-${agr.id}`}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="max-w-md" data-testid="confirm-action-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {confirmAction?.type === 'void' ? 'Void Agreement?' : 'Delete Agreement?'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            {confirmAction?.type === 'void'
              ? 'Voiding this agreement will invalidate it. This cannot be undone.'
              : 'This will permanently delete the agreement. This cannot be undone.'}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button
              className={confirmAction?.type === 'void' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
              onClick={() => confirmAction?.type === 'void' ? handleVoid(confirmAction.agreement) : handleDelete(confirmAction.agreement)}
              data-testid="confirm-action-btn"
            >
              {confirmAction?.type === 'void' ? 'Void Agreement' : 'Delete Agreement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Agreements;
