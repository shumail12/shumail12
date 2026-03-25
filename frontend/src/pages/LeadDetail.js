import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Header } from '../components/Layout';
import { getLead, updateLead, convertLeadToQuote, createQuote, getLeadPricing, approveLead } from '../lib/api';
import { PricingEditor } from '../components/PricingEditor';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ArrowLeft, Save, ArrowRightCircle, Car, ExternalLink, DollarSign, CheckCircle, MapPin, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_PRICING = {
  standard: { deposit_fee: 150, carrier_fee: 60, total_price: 210 },
  expedited: { deposit_fee: 175, carrier_fee: 70, total_price: 245 },
  enclosed: { deposit_fee: 200, carrier_fee: 85, total_price: 285 },
};

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [pricing, setPricing] = useState({ ...DEFAULT_PRICING });
  const [distance, setDistance] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const isNew = !id || id === 'new';

  useEffect(() => {
    if (isNew) {
      setForm({ customer_name: '', phone: '', email: '', agent_name: '', vehicle_year: '', vehicle_make: '', vehicle_model: '',
        pickup_city: '', pickup_state: '', pickup_zip: '', delivery_city: '', delivery_state: '', delivery_zip: '',
        pickup_address: '', delivery_address: '', status: 'lead', notes: '', source: '' });
      setLoading(false);
      return;
    }
    const fetch = async () => {
      try {
        const res = await getLead(id);
        setLead(res.data);
        setForm(res.data);
        // Load saved pricing if available
        if (res.data.pricing_standard) {
          setPricing({
            standard: res.data.pricing_standard,
            expedited: res.data.pricing_expedited || DEFAULT_PRICING.expedited,
            enclosed: res.data.pricing_enclosed || DEFAULT_PRICING.enclosed,
          });
        }
        if (res.data.estimated_distance) setDistance(res.data.estimated_distance);
      } catch { toast.error('Failed to load lead'); navigate('/leads'); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id, isNew, navigate]);

  const fetchPricing = useCallback(async () => {
    if (isNew || !id) return;
    setPricingLoading(true);
    try {
      const res = await getLeadPricing(id);
      if (res.data.pricing) {
        const p = res.data.pricing;
        setPricing({
          standard: { deposit_fee: p.standard.deposit_fee, carrier_fee: p.standard.carrier_fee, total_price: p.standard.total_price },
          expedited: { deposit_fee: p.expedited.deposit_fee, carrier_fee: p.expedited.carrier_fee, total_price: p.expedited.total_price },
          enclosed: { deposit_fee: p.enclosed.deposit_fee, carrier_fee: p.enclosed.carrier_fee, total_price: p.enclosed.total_price },
        });
        setDistance(res.data.distance_miles);
      }
    } catch { /* ignore */ }
    finally { setPricingLoading(false); }
  }, [id, isNew]);

  useEffect(() => {
    if (!isNew && id && !lead?.pricing_standard) fetchPricing();
  }, [isNew, id, fetchPricing, lead?.pricing_standard]);

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

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await approveLead(id, {
        pricing_standard: pricing.standard,
        pricing_expedited: pricing.expedited,
        pricing_enclosed: pricing.enclosed,
        estimated_distance: distance,
      });
      toast.success('All prices approved! Lead converted to quote.');
      navigate(`/quotes/${res.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to approve');
    } finally { setApproving(false); }
  };

  const handlePricingChange = (updated) => {
    setPricing(updated);
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
          {/* Pricing Section */}
          {!isNew && lead?.status === 'lead' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="pricing-section">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Pricing — All Shipping Types</h3>
                    <p className="text-xs text-slate-500">Edit deposit, carrier fee, and total for each type. Approve all at once.</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={fetchPricing} disabled={pricingLoading} data-testid="recalculate-pricing-btn">
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${pricingLoading ? 'animate-spin' : ''}`} />Recalculate
                </Button>
              </div>

              {pricingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full" />
                </div>
              ) : (
                <>
                  <PricingEditor pricing={pricing} distance={distance} onChange={handlePricingChange} />
                  <div className="flex items-center justify-between mt-5 bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <p className="text-sm text-slate-600">Approving saves all 3 shipping prices and converts this lead to a quote.</p>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                      onClick={handleApprove}
                      disabled={approving}
                      data-testid="approve-lead-btn"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {approving ? 'Approving...' : 'Approve All Prices'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

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

          {/* Addresses with Zip */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Pickup & Delivery</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-blue-600">Pickup</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>City</Label><Input value={form.pickup_city || ''} onChange={e => setForm(f => ({...f, pickup_city: e.target.value}))} data-testid="input-pickup-city" /></div>
                  <div><Label>State</Label><Input value={form.pickup_state || ''} onChange={e => setForm(f => ({...f, pickup_state: e.target.value}))} data-testid="input-pickup-state" /></div>
                  <div><Label>Zip Code</Label><Input value={form.pickup_zip || ''} onChange={e => setForm(f => ({...f, pickup_zip: e.target.value}))} placeholder="e.g. 90001" data-testid="input-pickup-zip" /></div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-emerald-600">Delivery</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>City</Label><Input value={form.delivery_city || ''} onChange={e => setForm(f => ({...f, delivery_city: e.target.value}))} data-testid="input-delivery-city" /></div>
                  <div><Label>State</Label><Input value={form.delivery_state || ''} onChange={e => setForm(f => ({...f, delivery_state: e.target.value}))} data-testid="input-delivery-state" /></div>
                  <div><Label>Zip Code</Label><Input value={form.delivery_zip || ''} onChange={e => setForm(f => ({...f, delivery_zip: e.target.value}))} placeholder="e.g. 77001" data-testid="input-delivery-zip" /></div>
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
