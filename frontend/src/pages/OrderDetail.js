import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Header } from '../components/Layout';
import { getOrder, updateOrder } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Save, Car, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'picked_up', label: 'Picked Up' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
];

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getOrder(id);
        setOrder(res.data);
        setForm(res.data);
      } catch { toast.error('Failed to load order'); navigate('/orders'); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id, navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateOrder(id, {
        carrier_name: form.carrier_name,
        carrier_phone: form.carrier_phone,
        carrier_mc: form.carrier_mc,
        driver_name: form.driver_name,
        driver_phone: form.driver_phone,
        dispatch_notes: form.dispatch_notes,
        status: form.status,
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
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave} disabled={saving} data-testid="save-order-btn">
            <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </Header>
      <div className="p-6 max-w-5xl" data-testid="order-detail-page">
        <div className="space-y-6">
          {/* Order & Quote Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Order Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-slate-50 rounded-lg p-3"><span className="text-slate-500 block text-xs">Order #</span><span className="font-mono font-bold text-emerald-600">{order?.order_number}</span></div>
              <div className="bg-slate-50 rounded-lg p-3"><span className="text-slate-500 block text-xs">Quote #</span><span className="font-mono font-bold text-blue-600">{order?.quote_number}</span></div>
              <div className="bg-slate-50 rounded-lg p-3"><span className="text-slate-500 block text-xs">Agent</span><span className="font-medium">{order?.agent_name || '-'}</span></div>
              <div className="bg-slate-50 rounded-lg p-3"><span className="text-slate-500 block text-xs">Price</span><span className="font-bold text-emerald-600">${order?.price?.toLocaleString()}</span></div>
            </div>
          </div>

          {/* Customer Info (read-only) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Customer & Vehicle</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-slate-500 text-xs block">Customer</span><span className="font-medium">{order?.customer_name}</span></div>
              <div><span className="text-slate-500 text-xs block">Phone</span><span className="font-medium">{order?.phone || '-'}</span></div>
              <div><span className="text-slate-500 text-xs block">Email</span><span className="font-medium">{order?.email || '-'}</span></div>
              <div><span className="text-slate-500 text-xs block">Vehicle</span>
                <button onClick={() => vehicleSearch && window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(vehicleSearch)}`, '_blank')}
                  className="font-medium text-blue-600 hover:underline flex items-center gap-1">
                  {vehicleSearch || '-'} <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <div><span className="text-slate-500 text-xs block">Pickup</span><span className="font-medium">{[order?.pickup_city, order?.pickup_state].filter(Boolean).join(', ')}</span></div>
              <div><span className="text-slate-500 text-xs block">Delivery</span><span className="font-medium">{[order?.delivery_city, order?.delivery_state].filter(Boolean).join(', ')}</span></div>
            </div>
          </div>

          {/* Dispatch Info (editable) */}
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
              <div><Label>Carrier Name</Label><Input value={form.carrier_name || ''} onChange={e => setForm(f => ({...f, carrier_name: e.target.value}))} data-testid="input-carrier-name" /></div>
              <div><Label>Carrier MC #</Label><Input value={form.carrier_mc || ''} onChange={e => setForm(f => ({...f, carrier_mc: e.target.value}))} /></div>
              <div><Label>Carrier Phone</Label><Input value={form.carrier_phone || ''} onChange={e => setForm(f => ({...f, carrier_phone: e.target.value}))} /></div>
              <div><Label>Driver Name</Label><Input value={form.driver_name || ''} onChange={e => setForm(f => ({...f, driver_name: e.target.value}))} data-testid="input-driver-name" /></div>
              <div><Label>Driver Phone</Label><Input value={form.driver_phone || ''} onChange={e => setForm(f => ({...f, driver_phone: e.target.value}))} /></div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Dispatch Notes</h3>
            <textarea className="w-full rounded-lg border border-slate-200 p-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.dispatch_notes || ''} onChange={e => setForm(f => ({...f, dispatch_notes: e.target.value}))} placeholder="Add dispatch notes..." data-testid="input-dispatch-notes" />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default OrderDetail;
