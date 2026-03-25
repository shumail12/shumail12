import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Header } from '../components/Layout';
import { getOrder, updateOrder, submitRevenueForm, getRevenueByOrder } from '../lib/api';
import { PricingEditor } from '../components/PricingEditor';
import USARouteMap from '../components/USARouteMap';
import TransportFacts from '../components/TransportFacts';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog';
import { ArrowLeft, Save, ExternalLink, DollarSign, CheckCircle, Map, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'picked_up', label: 'Picked Up' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
];

const PAYMENT_METHODS = ['Zelle', 'COD', 'CashApp', 'Venmo', 'ACH', 'Card'];

const DEFAULT_PRICING = {
  standard: { deposit_fee: 150, carrier_fee: 60, total_price: 210 },
  expedited: { deposit_fee: 175, carrier_fee: 70, total_price: 245 },
  enclosed: { deposit_fee: 200, carrier_fee: 85, total_price: 285 },
};

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [pricing, setPricing] = useState({ ...DEFAULT_PRICING });

  // Revenue form state
  const [showRevenueForm, setShowRevenueForm] = useState(false);
  const [existingRevenue, setExistingRevenue] = useState(null);
  const [revForm, setRevForm] = useState({
    customer_name: '', vehicle_info: '', route: '',
    deposit_amount: 0, total_price: 0, payment_method: 'Zelle', notes: '',
  });
  const [submittingRevenue, setSubmittingRevenue] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getOrder(id);
        setOrder(res.data);
        setForm(res.data);
        setPricing({
          standard: res.data.pricing_standard || DEFAULT_PRICING.standard,
          expedited: res.data.pricing_expedited || DEFAULT_PRICING.expedited,
          enclosed: res.data.pricing_enclosed || DEFAULT_PRICING.enclosed,
        });
        // Check if revenue form exists
        const revRes = await getRevenueByOrder(id);
        if (revRes.data) setExistingRevenue(revRes.data);
      } catch { toast.error('Failed to load order'); navigate('/orders'); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id, navigate]);

  const openRevenueForm = () => {
    const o = order || {};
    const vehicle = [o.vehicle_year, o.vehicle_make, o.vehicle_model].filter(Boolean).join(' ');
    const route = `${o.pickup_city || ''}, ${o.pickup_state || ''} → ${o.delivery_city || ''}, ${o.delivery_state || ''}`;
    setRevForm({
      customer_name: o.customer_name || '',
      vehicle_info: vehicle,
      route: route,
      deposit_amount: o.deposit_fee || o.price || 0,
      total_price: o.price || 0,
      payment_method: o.payment_method || 'Zelle',
      notes: '',
    });
    setShowRevenueForm(true);
  };

  const handleSubmitRevenue = async () => {
    if (revForm.deposit_amount <= 0) {
      toast.error('Deposit amount is required');
      return;
    }
    setSubmittingRevenue(true);
    try {
      const res = await submitRevenueForm({ order_id: id, ...revForm });
      setExistingRevenue(res.data);
      setShowRevenueForm(false);
      toast.success('Revenue submitted! Dashboard updated.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit');
    } finally { setSubmittingRevenue(false); }
  };

  const handlePricingChange = (updated) => {
    setPricing(updated);
    if (updated.standard) {
      setForm(f => ({ ...f, price: updated.standard.total_price, deposit_fee: updated.standard.deposit_fee, carrier_fee: updated.standard.carrier_fee }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateOrder(id, {
        carrier_name: form.carrier_name, carrier_phone: form.carrier_phone,
        carrier_mc: form.carrier_mc, driver_name: form.driver_name,
        driver_phone: form.driver_phone, pickup_date: form.pickup_date,
        delivery_date: form.delivery_date, dispatch_notes: form.dispatch_notes,
        status: form.status, price: form.price, deposit_fee: form.deposit_fee,
        carrier_fee: form.carrier_fee, shipping_type: form.shipping_type,
        pricing_standard: pricing.standard, pricing_expedited: pricing.expedited,
        pricing_enclosed: pricing.enclosed, estimated_distance: form.estimated_distance,
        pickup_zip: form.pickup_zip, delivery_zip: form.delivery_zip,
        payment_method: form.payment_method,
      });
      setOrder(res.data);
      setForm(res.data);
      toast.success('Order updated');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const vehicleSearch = `${form.vehicle_year} ${form.vehicle_make} ${form.vehicle_model}`.trim();

  if (loading) return <Layout><div className="flex items-center justify-center h-[80vh]"><div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" /></div></Layout>;

  return (
    <Layout>
      <Header title={`Order ${order?.order_number || ''}`}>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/orders')}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
          {!existingRevenue ? (
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={openRevenueForm} data-testid="fill-revenue-btn">
              <DollarSign className="w-4 h-4 mr-2" />Fill Revenue
            </Button>
          ) : (
            <Button variant="outline" className="text-emerald-600 border-emerald-200" disabled>
              <CheckCircle className="w-4 h-4 mr-2" />Revenue Submitted
            </Button>
          )}
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave} disabled={saving} data-testid="save-order-btn">
            <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </Header>
      <div className="p-6 max-w-5xl" data-testid="order-detail-page">
        <div className="space-y-6">
          {/* Revenue Submitted Banner */}
          {existingRevenue && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between" data-testid="revenue-banner">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Revenue Submitted</p>
                  <p className="text-xs text-emerald-600">Deposit: ${existingRevenue.deposit_amount?.toLocaleString()} via {existingRevenue.payment_method} — by {existingRevenue.submitted_by}</p>
                </div>
              </div>
            </div>
          )}

          {/* Order & Quote Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Order Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-slate-50 rounded-lg p-3"><span className="text-slate-500 block text-xs">Order #</span><span className="font-mono font-bold text-emerald-600">{order?.order_number}</span></div>
              <div className="bg-slate-50 rounded-lg p-3"><span className="text-slate-500 block text-xs">Quote #</span><span className="font-mono font-bold text-blue-600">{order?.quote_number}</span></div>
              <div className="bg-slate-50 rounded-lg p-3"><span className="text-slate-500 block text-xs">Agent</span><span className="font-medium">{order?.agent_name || '-'}</span></div>
              <div className="bg-slate-50 rounded-lg p-3"><span className="text-slate-500 block text-xs">Primary Price</span><span className="font-bold text-emerald-600">${(form.price || 0).toLocaleString()}</span></div>
            </div>
          </div>

          {/* Customer & Vehicle */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Customer & Vehicle</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-slate-500 text-xs block">Customer</span><span className="font-medium">{order?.customer_name}</span></div>
              <div><span className="text-slate-500 text-xs block">Phone</span><span className="font-medium">{order?.phone || '-'}</span></div>
              <div><span className="text-slate-500 text-xs block">Email</span><span className="font-medium">{order?.email || '-'}</span></div>
              <div><span className="text-slate-500 text-xs block">Vehicle</span>
                <button onClick={() => vehicleSearch && window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(vehicleSearch)}`, '_blank')} className="font-medium text-blue-600 hover:underline flex items-center gap-1">
                  {vehicleSearch || '-'} <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <div><span className="text-slate-500 text-xs block">Pickup</span><span className="font-medium">{[order?.pickup_city, order?.pickup_state, order?.pickup_zip].filter(Boolean).join(', ')}</span></div>
              <div><span className="text-slate-500 text-xs block">Delivery</span><span className="font-medium">{[order?.delivery_city, order?.delivery_state, order?.delivery_zip].filter(Boolean).join(', ')}</span></div>
            </div>
          </div>

          {/* USA Route Map */}
          {(order?.pickup_state || order?.delivery_state) && (
            <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="order-route-map">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center"><Map className="w-5 h-5 text-slate-600" /></div>
                <h3 className="font-semibold text-slate-900">Transport Route</h3>
              </div>
              <USARouteMap pickupState={order?.pickup_state} deliveryState={order?.delivery_state} pickupCity={order?.pickup_city} deliveryCity={order?.delivery_city} />
            </div>
          )}

          {/* Pricing */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Pricing — All Shipping Types</h3>
            <PricingEditor pricing={pricing} distance={form.estimated_distance || order?.estimated_distance} onChange={handlePricingChange} />
          </div>

          {/* Dispatch & Carrier */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Dispatch & Carrier</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Order Status</Label>
                <Select value={form.status || 'pending'} onValueChange={v => setForm(f => ({...f, status: v}))}>
                  <SelectTrigger data-testid="select-order-status"><SelectValue /></SelectTrigger>
                  <SelectContent>{statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select value={form.payment_method || ''} onValueChange={v => setForm(f => ({...f, payment_method: v}))}>
                  <SelectTrigger data-testid="select-payment-method"><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Carrier Name</Label><Input value={form.carrier_name || ''} onChange={e => setForm(f => ({...f, carrier_name: e.target.value}))} data-testid="input-carrier-name" /></div>
              <div><Label>Carrier MC #</Label><Input value={form.carrier_mc || ''} onChange={e => setForm(f => ({...f, carrier_mc: e.target.value}))} /></div>
              <div><Label>Carrier Phone</Label><Input value={form.carrier_phone || ''} onChange={e => setForm(f => ({...f, carrier_phone: e.target.value}))} /></div>
              <div><Label>Driver Name</Label><Input value={form.driver_name || ''} onChange={e => setForm(f => ({...f, driver_name: e.target.value}))} data-testid="input-driver-name" /></div>
              <div><Label>Driver Phone</Label><Input value={form.driver_phone || ''} onChange={e => setForm(f => ({...f, driver_phone: e.target.value}))} /></div>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Pickup & Delivery Dates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Pickup Date</Label><Input type="date" value={form.pickup_date || ''} onChange={e => setForm(f => ({...f, pickup_date: e.target.value}))} /></div>
              <div><Label>Delivery Date</Label><Input type="date" value={form.delivery_date || ''} onChange={e => setForm(f => ({...f, delivery_date: e.target.value}))} /></div>
            </div>
          </div>

          {/* Transport Facts */}
          {(order?.pickup_state || order?.delivery_state) && (
            <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="order-transport-facts">
              <h3 className="font-semibold text-slate-900 mb-4">Route Intelligence</h3>
              <TransportFacts pickupState={order?.pickup_state} deliveryState={order?.delivery_state} pickupCity={order?.pickup_city} deliveryCity={order?.delivery_city} />
            </div>
          )}

          {/* Notes */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Dispatch Notes</h3>
            <textarea className="w-full rounded-lg border border-slate-200 p-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.dispatch_notes || ''} onChange={e => setForm(f => ({...f, dispatch_notes: e.target.value}))} placeholder="Add dispatch notes..." />
          </div>
        </div>
      </div>

      {/* Revenue Form Dialog */}
      <Dialog open={showRevenueForm} onOpenChange={setShowRevenueForm}>
        <DialogContent className="max-w-lg" data-testid="revenue-form-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />Fill Revenue Form
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-500">Customer</Label>
                <Input value={revForm.customer_name} onChange={e => setRevForm(f => ({...f, customer_name: e.target.value}))} data-testid="rev-customer" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Vehicle</Label>
                <Input value={revForm.vehicle_info} onChange={e => setRevForm(f => ({...f, vehicle_info: e.target.value}))} data-testid="rev-vehicle" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Route</Label>
              <Input value={revForm.route} onChange={e => setRevForm(f => ({...f, route: e.target.value}))} data-testid="rev-route" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-500">Deposit Amount ($) *</Label>
                <Input type="number" step="0.01" value={revForm.deposit_amount}
                  onChange={e => setRevForm(f => ({...f, deposit_amount: parseFloat(e.target.value) || 0}))}
                  className="text-lg font-bold text-emerald-600" data-testid="rev-deposit" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Total Price ($)</Label>
                <Input type="number" step="0.01" value={revForm.total_price}
                  onChange={e => setRevForm(f => ({...f, total_price: parseFloat(e.target.value) || 0}))} data-testid="rev-total" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Payment Method *</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {PAYMENT_METHODS.map(m => (
                  <button key={m} onClick={() => setRevForm(f => ({...f, payment_method: m}))}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                      revForm.payment_method === m
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`} data-testid={`rev-method-${m.toLowerCase()}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Notes</Label>
              <Textarea value={revForm.notes} onChange={e => setRevForm(f => ({...f, notes: e.target.value}))} rows={2} placeholder="Any additional notes..." />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRevenueForm(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSubmitRevenue} disabled={submittingRevenue} data-testid="submit-revenue-btn">
              <DollarSign className="w-4 h-4 mr-2" />{submittingRevenue ? 'Submitting...' : 'Submit Revenue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default OrderDetail;
