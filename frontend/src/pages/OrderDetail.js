import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout, Header } from '../components/Layout';
import { getOrder, updateOrder, getQuote, getLead, getCarriers, createInvoice, getInvoices } from '../lib/api';
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
import { ArrowLeft, Save, MapPin, Truck, User, Calendar, DollarSign, Receipt, Package } from 'lucide-react';
import { toast } from 'sonner';

const statusOptions = ['pending', 'assigned', 'in_transit', 'delivered', 'cancelled'];

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [quote, setQuote] = useState(null);
  const [lead, setLead] = useState(null);
  const [carriers, setCarriers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    status: 'pending',
    pickup_date: '',
    delivery_date: '',
    carrier_id: '',
    notes: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [orderRes, carriersRes, invoicesRes] = await Promise.all([
          getOrder(id),
          getCarriers(),
          getInvoices()
        ]);
        const orderData = orderRes.data;
        setOrder(orderData);
        setCarriers(carriersRes.data);
        setInvoices(invoicesRes.data.filter(i => i.order_id === id));

        setFormData({
          status: orderData.status,
          pickup_date: orderData.pickup_date ? orderData.pickup_date.split('T')[0] : '',
          delivery_date: orderData.delivery_date ? orderData.delivery_date.split('T')[0] : '',
          carrier_id: orderData.carrier_id || '',
          notes: orderData.notes || ''
        });

        // Fetch quote info
        if (orderData.quote_id) {
          const quoteRes = await getQuote(orderData.quote_id);
          setQuote(quoteRes.data);

          // Fetch lead info
          if (quoteRes.data.lead_id) {
            const leadRes = await getLead(quoteRes.data.lead_id);
            setLead(leadRes.data);
          }
        }
      } catch (error) {
        toast.error('Failed to load order');
        navigate('/orders');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateOrder(id, {
        quote_id: order.quote_id,
        ...formData,
        pickup_date: formData.pickup_date ? new Date(formData.pickup_date).toISOString() : null,
        delivery_date: formData.delivery_date ? new Date(formData.delivery_date).toISOString() : null,
        carrier_id: formData.carrier_id || null
      });
      toast.success('Order saved successfully');
    } catch (error) {
      toast.error('Failed to save order');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateInvoice = async () => {
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days
      
      await createInvoice({
        order_id: id,
        amount: quote?.price || 0,
        status: 'unpaid',
        due_date: dueDate.toISOString(),
        notes: `Invoice for order ${order.order_number}`
      });
      toast.success('Invoice created successfully');
      
      // Refresh invoices
      const invoicesRes = await getInvoices();
      setInvoices(invoicesRes.data.filter(i => i.order_id === id));
    } catch (error) {
      toast.error('Failed to create invoice');
    }
  };

  const getCarrierById = (carrierId) => carriers.find(c => c.id === carrierId);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  const selectedCarrier = getCarrierById(formData.carrier_id);

  return (
    <Layout>
      <Header title={`Order: ${order?.order_number}`}>
        <Button variant="outline" onClick={() => navigate('/orders')} data-testid="back-btn">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Orders
        </Button>
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700" data-testid="save-order-btn">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Header>

      <div className="p-6 space-y-6" data-testid="order-detail-page">
        {/* Order Header */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-sm text-slate-500">Order ID:</span>
                <span className="font-mono text-sm ml-2">{order?.order_number}</span>
              </div>
              <div>
                <span className="text-sm text-slate-500">Created:</span>
                <span className="font-mono text-sm ml-2">{new Date(order?.created_at).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {formData.status === 'in_transit' && <span className="live-dot" />}
              <span className={`status-badge status-${formData.status}`}>
                {formData.status?.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Route Information */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-heading font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Route Information
              </h3>
              {quote && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-sm text-emerald-700 font-medium mb-1">Pickup</p>
                    <p className="text-slate-900">{quote.pickup_location || 'No address'}</p>
                    <p className="font-medium">{quote.pickup_city}, {quote.pickup_state}</p>
                  </div>
                  <div className="p-4 bg-rose-50 rounded-lg border border-rose-200">
                    <p className="text-sm text-rose-700 font-medium mb-1">Delivery</p>
                    <p className="text-slate-900">{quote.delivery_location || 'No address'}</p>
                    <p className="font-medium">{quote.delivery_city}, {quote.delivery_state}</p>
                  </div>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-sm text-slate-500">Distance:</span>
                    <span className="font-mono font-medium ml-2">{quote?.distance?.toLocaleString()} miles</span>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500">Price:</span>
                    <span className="font-mono font-bold text-emerald-600 ml-2">${quote?.price?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-heading font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Schedule
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="form-label">Pickup Date</Label>
                  <Input
                    type="date"
                    value={formData.pickup_date}
                    onChange={(e) => setFormData({ ...formData, pickup_date: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <Label className="form-label">Delivery Date</Label>
                  <Input
                    type="date"
                    value={formData.delivery_date}
                    onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Carrier Assignment */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-heading font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                Carrier Assignment
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="form-label">Assign Carrier</Label>
                  <Select
                    value={formData.carrier_id || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, carrier_id: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select carrier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No carrier assigned</SelectItem>
                      {carriers.filter(c => c.status === 'active').map((carrier) => (
                        <SelectItem key={carrier.id} value={carrier.id}>
                          {carrier.name} - {carrier.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="form-label">Order Status</Label>
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
                          {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {selectedCarrier && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                  <p className="font-medium text-slate-900">{selectedCarrier.name}</p>
                  <p className="text-sm text-slate-600">{selectedCarrier.phone} • {selectedCarrier.email}</p>
                  {selectedCarrier.mc_number && (
                    <p className="text-sm text-slate-500 font-mono">MC# {selectedCarrier.mc_number}</p>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-heading font-semibold text-slate-900 mb-4">Notes</h3>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="form-input min-h-[100px] resize-none"
                placeholder="Add any notes about this order..."
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Info */}
            {lead && (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="font-heading font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Customer
                </h3>
                <Link to={`/leads/${lead.id}`} className="block hover:bg-slate-50 -mx-2 px-2 py-2 rounded">
                  <p className="font-medium text-slate-900">{lead.customer_name}</p>
                  <p className="text-sm text-slate-500">{lead.email}</p>
                  <p className="text-sm text-slate-500">{lead.phone}</p>
                </Link>
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-sm text-slate-600">
                    {lead.vehicle_year} {lead.vehicle_make} {lead.vehicle_model}
                  </p>
                  <p className="text-xs text-slate-500">{lead.vehicle_type}</p>
                </div>
              </div>
            )}

            {/* Quote Info */}
            {quote && (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="font-heading font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Quote
                </h3>
                <Link to={`/quotes/${quote.id}`} className="block hover:bg-slate-50 -mx-2 px-2 py-2 rounded">
                  <p className="font-mono text-sm">{quote.quote_number}</p>
                  <p className="text-2xl font-bold text-emerald-600 font-mono">${quote.price?.toLocaleString()}</p>
                </Link>
              </div>
            )}

            {/* Invoices */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-600" />
                  Invoices
                </h3>
                {invoices.length === 0 && (
                  <Button size="sm" onClick={handleCreateInvoice} className="bg-emerald-600 hover:bg-emerald-700">
                    Create Invoice
                  </Button>
                )}
              </div>
              {invoices.length === 0 ? (
                <p className="text-sm text-slate-500">No invoices yet</p>
              ) : (
                <div className="space-y-2">
                  {invoices.map((invoice) => (
                    <Link
                      key={invoice.id}
                      to={`/invoices`}
                      className="block p-3 border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm">{invoice.invoice_number}</span>
                        <span className={`status-badge status-${invoice.status}`}>{invoice.status}</span>
                      </div>
                      <p className="font-bold text-emerald-600 font-mono">${invoice.amount?.toLocaleString()}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Status Timeline */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-heading font-semibold text-slate-900 mb-4">Status Timeline</h3>
              <div className="space-y-3">
                {['pending', 'assigned', 'in_transit', 'delivered'].map((status, index) => {
                  const isActive = statusOptions.indexOf(formData.status) >= index;
                  const isCurrent = formData.status === status;
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-blue-600' : 'bg-slate-200'} ${isCurrent ? 'ring-4 ring-blue-200' : ''}`} />
                      <span className={`text-sm ${isActive ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default OrderDetail;
