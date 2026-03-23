import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Header } from '../components/Layout';
import { getLead, updateLead, convertLeadToQuote, createQuote } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ArrowLeft, Save, ArrowRightCircle, Car, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const isNew = !id || id === 'new';

  useEffect(() => {
    if (isNew) {
      setForm({ customer_name: '', phone: '', email: '', agent_name: '', vehicle_year: '', vehicle_make: '', vehicle_model: '',
        pickup_city: '', pickup_state: '', delivery_city: '', delivery_state: '', pickup_address: '', delivery_address: '',
        status: 'lead', notes: '', source: '' });
      setLoading(false);
      return;
    }
    const fetch = async () => {
      try {
        const res = await getLead(id);
        setLead(res.data);
        setForm(res.data);
      } catch { toast.error('Failed to load lead'); navigate('/leads'); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id, isNew, navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) {
        const res = await createQuote({ ...form, status: 'lead' });
        toast.success(`Lead ${res.data.quote_number} created!`);
        navigate(`/leads/${res.data.id}`);
      } else {
        const res = await updateLead(id, form);
        setLead(res.data);
        setForm(res.data);
        toast.success('Lead updated');
      }
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleConvert = async () => {
    try {
      await convertLeadToQuote(id);
      toast.success('Converted to quote!');
      navigate(`/quotes/${id}`);
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to convert'); }
  };

  const vehicleSearch = `${form.vehicle_year} ${form.vehicle_make} ${form.vehicle_model}`.trim();

  if (loading) return <Layout><div className="flex items-center justify-center h-[80vh]"><div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" /></div></Layout>;

  return (
    <Layout>
      <Header title={isNew ? 'New Lead' : `Lead ${lead?.quote_number || ''}`}>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/leads')}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
          {!isNew && lead?.status === 'lead' && (
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleConvert} data-testid="convert-to-quote-btn">
              <ArrowRightCircle className="w-4 h-4 mr-2" />Convert to Quote
            </Button>
          )}
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave} disabled={saving} data-testid="save-lead-btn">
            <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </Header>
      <div className="p-6 max-w-5xl" data-testid="lead-detail-page">
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Customer Name *</Label><Input value={form.customer_name || ''} onChange={e => setForm(f => ({...f, customer_name: e.target.value}))} data-testid="input-customer-name" /></div>
              <div><Label>Phone</Label><Input value={form.phone || ''} onChange={e => setForm(f => ({...f, phone: e.target.value}))} data-testid="input-phone" /></div>
              <div><Label>Email</Label><Input value={form.email || ''} onChange={e => setForm(f => ({...f, email: e.target.value}))} data-testid="input-email" /></div>
              <div><Label>Agent Name</Label><Input value={form.agent_name || ''} onChange={e => setForm(f => ({...f, agent_name: e.target.value}))} /></div>
              <div><Label>Source</Label><Input value={form.source || ''} onChange={e => setForm(f => ({...f, source: e.target.value}))} /></div>
            </div>
          </div>

          {/* Vehicle */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Vehicle Information</h3>
              {vehicleSearch && (
                <Button variant="outline" size="sm" onClick={() => window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(vehicleSearch)}`, '_blank')} data-testid="view-vehicle-btn">
                  <Car className="w-4 h-4 mr-1" />View Vehicle <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Year</Label><Input value={form.vehicle_year || ''} onChange={e => setForm(f => ({...f, vehicle_year: e.target.value}))} /></div>
              <div><Label>Make</Label><Input value={form.vehicle_make || ''} onChange={e => setForm(f => ({...f, vehicle_make: e.target.value}))} /></div>
              <div><Label>Model</Label><Input value={form.vehicle_model || ''} onChange={e => setForm(f => ({...f, vehicle_model: e.target.value}))} /></div>
            </div>
          </div>

          {/* Addresses */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Pickup & Delivery</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-blue-600">Pickup</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>City</Label><Input value={form.pickup_city || ''} onChange={e => setForm(f => ({...f, pickup_city: e.target.value}))} /></div>
                  <div><Label>State</Label><Input value={form.pickup_state || ''} onChange={e => setForm(f => ({...f, pickup_state: e.target.value}))} /></div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-emerald-600">Delivery</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>City</Label><Input value={form.delivery_city || ''} onChange={e => setForm(f => ({...f, delivery_city: e.target.value}))} /></div>
                  <div><Label>State</Label><Input value={form.delivery_state || ''} onChange={e => setForm(f => ({...f, delivery_state: e.target.value}))} /></div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Notes</h3>
            <textarea className="w-full rounded-lg border border-slate-200 p-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.notes || ''} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Add notes..." />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LeadDetail;
