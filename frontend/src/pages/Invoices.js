import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Header } from '../components/Layout';
import { getInvoices, createInvoice, updateInvoice, getOrders, getQuotes } from '../lib/api';
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
import { Plus, Search, Edit, Receipt, DollarSign, Calendar, CheckCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';

const statusOptions = ['unpaid', 'paid', 'overdue', 'draft', 'signed'];

const InvoiceForm = ({ invoice, orders, quotes, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState(invoice || {
    order_id: '',
    amount: 0,
    status: 'unpaid',
    due_date: '',
    paid_date: null,
    notes: ''
  });

  const handleOrderSelect = (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      const quote = quotes.find(q => q.id === order.quote_id);
      setFormData(prev => ({
        ...prev,
        order_id: orderId,
        amount: quote?.price || 0
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      due_date: formData.due_date ? new Date(formData.due_date).toISOString() : new Date().toISOString(),
      paid_date: formData.paid_date ? new Date(formData.paid_date).toISOString() : null
    };
    onSubmit(submitData);
  };

  const selectedOrder = orders.find(o => o.id === formData.order_id);
  const selectedQuote = selectedOrder ? quotes.find(q => q.id === selectedOrder.quote_id) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!invoice && (
        <div>
          <Label className="form-label">Select Order *</Label>
          <Select
            value={formData.order_id}
            onValueChange={handleOrderSelect}
          >
            <SelectTrigger data-testid="invoice-order">
              <SelectValue placeholder="Select an order" />
            </SelectTrigger>
            <SelectContent>
              {orders.filter(o => o.status !== 'cancelled').map((order) => {
                const quote = quotes.find(q => q.id === order.quote_id);
                return (
                  <SelectItem key={order.id} value={order.id}>
                    {order.order_number} - {quote?.pickup_city} → {quote?.delivery_city}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedQuote && (
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <h4 className="font-medium text-slate-900 mb-2">Order Details</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p><span className="text-slate-500">Order #:</span> {selectedOrder?.order_number}</p>
            <p><span className="text-slate-500">Quote Price:</span> <span className="font-mono text-emerald-600">${selectedQuote.price}</span></p>
            <p><span className="text-slate-500">Route:</span> {selectedQuote.pickup_city} → {selectedQuote.delivery_city}</p>
            <p><span className="text-slate-500">Vehicle:</span> {selectedQuote.vehicle_type}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="form-label">Amount ($) *</Label>
          <Input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            className="form-input font-mono"
            required
            data-testid="invoice-amount"
          />
        </div>
        <div>
          <Label className="form-label">Due Date *</Label>
          <Input
            type="date"
            value={formData.due_date ? formData.due_date.split('T')[0] : ''}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            className="form-input"
            required
            data-testid="invoice-due-date"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="form-label">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger data-testid="invoice-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {formData.status === 'paid' && (
          <div>
            <Label className="form-label">Paid Date</Label>
            <Input
              type="date"
              value={formData.paid_date ? formData.paid_date.split('T')[0] : ''}
              onChange={(e) => setFormData({ ...formData, paid_date: e.target.value })}
              className="form-input"
              data-testid="invoice-paid-date"
            />
          </div>
        )}
      </div>

      <div>
        <Label className="form-label">Notes</Label>
        <textarea
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="form-input min-h-[80px] resize-none"
          data-testid="invoice-notes"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" data-testid="invoice-submit">
          {invoice ? 'Update Invoice' : 'Create Invoice'}
        </Button>
      </DialogFooter>
    </form>
  );
};

const Invoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);

  const fetchData = async () => {
    try {
      const [invoicesRes, ordersRes, quotesRes] = await Promise.all([
        getInvoices(),
        getOrders(),
        getQuotes()
      ]);
      setInvoices(invoicesRes.data);
      setOrders(ordersRes.data.orders || []);
      setQuotes(quotesRes.data.quotes || []);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (data) => {
    try {
      await createInvoice(data);
      toast.success('Invoice created successfully');
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create invoice');
    }
  };

  const handleUpdate = async (data) => {
    try {
      await updateInvoice(editingInvoice.id, data);
      toast.success('Invoice updated successfully');
      setIsDialogOpen(false);
      setEditingInvoice(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update invoice');
    }
  };

  const markAsPaid = async (invoice) => {
    try {
      await updateInvoice(invoice.id, {
        ...invoice,
        status: 'paid',
        paid_date: new Date().toISOString()
      });
      toast.success('Invoice marked as paid');
      fetchData();
    } catch (error) {
      toast.error('Failed to update invoice');
    }
  };

  const getStatusClass = (status) => {
    const statusMap = {
      unpaid: 'status-unpaid',
      paid: 'status-paid',
      overdue: 'status-overdue',
      draft: 'status-pending',
      signed: 'status-delivered',
    };
    return statusMap[status] || 'status-unpaid';
  };

  const getOrderForInvoice = (orderId) => orders.find(o => o.id === orderId);
  const getQuoteForOrder = (quoteId) => quotes.find(q => q.id === quoteId);

  const filteredInvoices = invoices.filter((invoice) => {
    const order = getOrderForInvoice(invoice.order_id);
    const matchesSearch = 
      invoice.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      order?.order_number?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate totals
  const totalUnpaid = invoices.filter(i => i.status === 'unpaid').reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.amount, 0);

  return (
    <Layout>
      <Header title="Invoices">
        <Button
          onClick={() => { setEditingInvoice(null); setIsDialogOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="create-invoice-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Invoice
        </Button>
      </Header>

      <div className="p-6" data-testid="invoices-page">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Unpaid</p>
                <p className="text-2xl font-heading font-bold text-rose-600">${totalUnpaid.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-rose-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Paid</p>
                <p className="text-2xl font-heading font-bold text-emerald-600">${totalPaid.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Overdue</p>
                <p className="text-2xl font-heading font-bold text-amber-600">${totalOverdue.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search invoices..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 form-input"
                  data-testid="search-invoices"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="filter-invoice-status">
                <SelectValue placeholder="Filter by status" />
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
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No invoices found</p>
            </div>
          ) : (
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Type</th>
                  <th>Order #</th>
                  <th>Customer / Carrier</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => {
                  const order = getOrderForInvoice(invoice.order_id);
                  const isCarrier = invoice.invoice_type === 'carrier';
                  return (
                    <tr key={invoice.id} data-testid={`invoice-row-${invoice.id}`}>
                      <td>
                        <span className="font-mono font-medium text-slate-900">{invoice.invoice_number}</span>
                      </td>
                      <td>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${isCarrier ? 'bg-slate-100 text-slate-700' : 'bg-blue-50 text-blue-700'}`}>
                          {isCarrier ? 'Carrier' : 'Customer'}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-sm text-slate-600">{invoice.order_number || order?.order_number || '-'}</span>
                      </td>
                      <td>
                        <span className="text-sm text-slate-700">{isCarrier ? (invoice.carrier_name || '-') : (invoice.customer_name || '-')}</span>
                      </td>
                      <td>
                        <span className="font-mono font-medium text-emerald-600">
                          ${(invoice.total_price || invoice.amount || 0).toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusClass(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/invoices/${invoice.id}`)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            data-testid={`view-invoice-${invoice.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {invoice.status !== 'paid' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsPaid(invoice)}
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              data-testid={`mark-paid-${invoice.id}`}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setEditingInvoice(invoice); setIsDialogOpen(true); }}
                            data-testid={`edit-invoice-${invoice.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}</DialogTitle>
            </DialogHeader>
            <InvoiceForm
              invoice={editingInvoice}
              orders={orders}
              quotes={quotes}
              onSubmit={editingInvoice ? handleUpdate : handleCreate}
              onCancel={() => { setIsDialogOpen(false); setEditingInvoice(null); }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Invoices;
