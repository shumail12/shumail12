import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout, Header } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { ArrowLeft, Save, DollarSign, User, Package, Calendar, CreditCard, FileText, Printer, CheckCircle, Building } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

const statusOptions = ['unpaid', 'paid', 'overdue', 'cancelled'];
const paymentMethods = ['Cash', 'Check', 'Credit Card', 'Bank Transfer', 'Zelle', 'Venmo', 'PayPal', 'Other'];

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [order, setOrder] = useState(null);
  const [quote, setQuote] = useState(null);
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    deposit_amount: 0,
    carrier_pay: 0,
    amount: 0,
    tax_amount: 0,
    discount_amount: 0,
    total_amount: 0,
    status: 'unpaid',
    due_date: '',
    paid_date: '',
    payment_method: '',
    payment_reference: '',
    notes: '',
    terms: 'Payment due within 30 days of invoice date.'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const invoiceRes = await api.get(`/invoices/${id}`);
        const invoiceData = invoiceRes.data;
        setInvoice(invoiceData);

        setFormData({
          ...formData,
          ...invoiceData,
          due_date: invoiceData.due_date ? invoiceData.due_date.split('T')[0] : '',
          paid_date: invoiceData.paid_date ? invoiceData.paid_date.split('T')[0] : '',
        });

        // Fetch order info
        if (invoiceData.order_id) {
          const orderRes = await api.get(`/orders/${invoiceData.order_id}`);
          setOrder(orderRes.data);

          // Fetch quote info
          if (orderRes.data.quote_id) {
            const quoteRes = await api.get(`/quotes/${orderRes.data.quote_id}`);
            setQuote(quoteRes.data);

            // Fetch lead info
            if (quoteRes.data.lead_id) {
              const leadRes = await api.get(`/leads/${quoteRes.data.lead_id}`);
              setLead(leadRes.data);

              // Pre-fill customer info if not set
              if (!invoiceData.customer_name) {
                setFormData(prev => ({
                  ...prev,
                  customer_name: leadRes.data.customer_name,
                  customer_email: leadRes.data.email,
                  customer_phone: leadRes.data.phone,
                }));
              }
            }
          }
        }
      } catch (error) {
        toast.error('Failed to load invoice');
        navigate('/invoices');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  const calculateTotal = () => {
    const total = formData.amount + formData.tax_amount - formData.discount_amount;
    setFormData(prev => ({ ...prev, total_amount: total }));
  };

  useEffect(() => {
    calculateTotal();
  }, [formData.amount, formData.tax_amount, formData.discount_amount]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/invoices/${id}`, {
        order_id: invoice.order_id,
        ...formData,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : new Date().toISOString(),
        paid_date: formData.paid_date ? new Date(formData.paid_date).toISOString() : null
      });
      toast.success('Invoice saved successfully');
    } catch (error) {
      toast.error('Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async () => {
    try {
      await api.put(`/invoices/${id}`, {
        order_id: invoice.order_id,
        ...formData,
        status: 'paid',
        paid_date: new Date().toISOString(),
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : new Date().toISOString()
      });
      setFormData(prev => ({ 
        ...prev, 
        status: 'paid', 
        paid_date: new Date().toISOString().split('T')[0] 
      }));
      toast.success('Invoice marked as paid!');
    } catch (error) {
      toast.error('Failed to update invoice');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header title={`Invoice: ${invoice?.invoice_number}`}>
        <Button variant="outline" onClick={() => navigate('/invoices')} data-testid="back-btn">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700" data-testid="save-invoice-btn">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </Header>

      <div className="p-6 space-y-6" data-testid="invoice-detail-page">
        {/* Invoice Header */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-heading font-bold text-slate-900">INVOICE</h2>
                  <p className="font-mono text-lg text-slate-600">{invoice?.invoice_number}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xl font-heading font-bold text-blue-600">Breamway.com</p>
                <p className="text-sm text-slate-500">Auto Transport Brokerage</p>
              </div>
            </div>
            <div className="text-right">
              <span className={`status-badge text-lg px-4 py-2 status-${formData.status}`}>
                {formData.status?.toUpperCase()}
              </span>
              <div className="mt-4 space-y-1">
                <p className="text-sm text-slate-500">Created: {new Date(invoice?.created_at).toLocaleDateString()}</p>
                <p className="text-sm text-slate-500">Due: {formData.due_date ? new Date(formData.due_date).toLocaleDateString() : 'Not set'}</p>
                {formData.paid_date && (
                  <p className="text-sm text-emerald-600 font-medium">Paid: {new Date(formData.paid_date).toLocaleDateString()}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-heading font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Bill To
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="form-label">Customer Name</Label>
                  <Input
                    value={formData.customer_name || ''}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <Label className="form-label">Email</Label>
                  <Input
                    type="email"
                    value={formData.customer_email || ''}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <Label className="form-label">Phone</Label>
                  <Input
                    value={formData.customer_phone || ''}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <Label className="form-label">Address</Label>
                  <Input
                    value={formData.customer_address || ''}
                    onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Service Details */}
            {quote && (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="font-heading font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Service Details
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 text-sm font-semibold text-slate-600">Description</th>
                        <th className="text-right py-3 text-sm font-semibold text-slate-600">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="py-4">
                          <p className="font-medium text-slate-900">Auto Transport Service</p>
                          <p className="text-sm text-slate-500">
                            {quote.pickup_city}, {quote.pickup_state} → {quote.delivery_city}, {quote.delivery_state}
                          </p>
                          <p className="text-sm text-slate-500">
                            {lead?.vehicle_year} {lead?.vehicle_make} {lead?.vehicle_model} ({lead?.vehicle_type})
                          </p>
                          <p className="text-sm text-slate-500">Distance: {quote.distance} miles</p>
                        </td>
                        <td className="py-4 text-right font-mono font-medium text-slate-900">
                          ${quote.price?.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pricing Breakdown */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-heading font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                Pricing
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="form-label">Deposit Amount</Label>
                  <Input
                    type="number"
                    value={formData.deposit_amount || 0}
                    onChange={(e) => setFormData({ ...formData, deposit_amount: parseFloat(e.target.value) || 0 })}
                    className="form-input font-mono"
                  />
                </div>
                <div>
                  <Label className="form-label">Carrier Pay</Label>
                  <Input
                    type="number"
                    value={formData.carrier_pay || 0}
                    onChange={(e) => setFormData({ ...formData, carrier_pay: parseFloat(e.target.value) || 0 })}
                    className="form-input font-mono"
                  />
                </div>
                <div>
                  <Label className="form-label">Subtotal</Label>
                  <Input
                    type="number"
                    value={formData.amount || 0}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="form-input font-mono"
                  />
                </div>
                <div>
                  <Label className="form-label">Tax</Label>
                  <Input
                    type="number"
                    value={formData.tax_amount || 0}
                    onChange={(e) => setFormData({ ...formData, tax_amount: parseFloat(e.target.value) || 0 })}
                    className="form-input font-mono"
                  />
                </div>
                <div>
                  <Label className="form-label">Discount</Label>
                  <Input
                    type="number"
                    value={formData.discount_amount || 0}
                    onChange={(e) => setFormData({ ...formData, discount_amount: parseFloat(e.target.value) || 0 })}
                    className="form-input font-mono"
                  />
                </div>
                <div>
                  <Label className="form-label">Total Amount</Label>
                  <div className="h-10 px-3 flex items-center bg-slate-100 rounded-md border border-slate-200">
                    <span className="text-2xl font-bold text-emerald-600 font-mono">${formData.total_amount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms & Notes */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-heading font-semibold text-slate-900 mb-4">Terms & Notes</h3>
              <div className="space-y-4">
                <div>
                  <Label className="form-label">Terms</Label>
                  <textarea
                    value={formData.terms || ''}
                    onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                    className="form-input min-h-[80px] resize-none"
                  />
                </div>
                <div>
                  <Label className="form-label">Notes</Label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="form-input min-h-[80px] resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Details */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-heading font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                Payment
              </h3>
              <div className="space-y-4">
                <div>
                  <Label className="form-label">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
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
                <div>
                  <Label className="form-label">Due Date</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="form-input"
                  />
                </div>
                {formData.status === 'paid' && (
                  <>
                    <div>
                      <Label className="form-label">Paid Date</Label>
                      <Input
                        type="date"
                        value={formData.paid_date}
                        onChange={(e) => setFormData({ ...formData, paid_date: e.target.value })}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <Label className="form-label">Payment Method</Label>
                      <Select
                        value={formData.payment_method || 'none'}
                        onValueChange={(value) => setFormData({ ...formData, payment_method: value === 'none' ? '' : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not specified</SelectItem>
                          {paymentMethods.map((method) => (
                            <SelectItem key={method} value={method}>{method}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="form-label">Reference #</Label>
                      <Input
                        value={formData.payment_reference || ''}
                        onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
                        className="form-input font-mono"
                        placeholder="Check #, Transaction ID, etc."
                      />
                    </div>
                  </>
                )}

                {formData.status !== 'paid' && (
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleMarkPaid}
                    data-testid="mark-paid-btn"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Paid
                  </Button>
                )}
              </div>
            </div>

            {/* Order Info */}
            {order && (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="font-heading font-semibold text-slate-900 mb-4">Related Order</h3>
                <Link to={`/orders/${order.id}`} className="block hover:bg-slate-50 -mx-2 px-2 py-2 rounded">
                  <p className="font-mono text-sm">{order.order_number}</p>
                  <span className={`status-badge status-${order.status}`}>{order.status?.replace('_', ' ')}</span>
                </Link>
              </div>
            )}

            {/* Customer from Lead */}
            {lead && (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="font-heading font-semibold text-slate-900 mb-4">Customer</h3>
                <Link to={`/leads/${lead.id}`} className="block hover:bg-slate-50 -mx-2 px-2 py-2 rounded">
                  <p className="font-medium text-slate-900">{lead.customer_name}</p>
                  <p className="text-sm text-slate-500">{lead.email}</p>
                  <p className="text-sm text-slate-500">{lead.phone}</p>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default InvoiceDetail;
