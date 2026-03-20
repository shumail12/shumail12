import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout, Header } from '../components/Layout';
import { getLead, updateLead, createQuote, getQuotes } from '../lib/api';
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
import { ArrowLeft, Save, Phone, Mail, Car, User, FileText, Plus, Calendar, MapPin } from 'lucide-react';
import { toast } from 'sonner';

const vehicleTypes = ['Sedan', 'SUV', 'Truck', 'Van', 'Motorcycle', 'Coupe', 'Convertible', 'Other'];
const statusOptions = ['new', 'contacted', 'quoted', 'converted', 'lost'];
const runningStatuses = ['Running', 'Not Running', 'Unknown'];

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);

  const [formData, setFormData] = useState({
    customer_name: '',
    phone: '',
    email: '',
    vehicle_year: new Date().getFullYear(),
    vehicle_make: '',
    vehicle_model: '',
    vehicle_type: 'Sedan',
    status: 'new',
    notes: '',
    // Extended fields
    company_name: '',
    phone2: '',
    vehicle_color: '',
    vehicle_vin: '',
    vehicle_license: '',
    vehicle_state: '',
    running_status: 'Running',
    modifications: [],
    quote_source: ''
  });

  const [quoteFormData, setQuoteFormData] = useState({
    pickup_location: '',
    pickup_city: '',
    pickup_state: '',
    pickup_zip: '',
    delivery_location: '',
    delivery_city: '',
    delivery_state: '',
    delivery_zip: '',
    distance: 0,
    vehicle_type: 'Sedan',
    price: 0,
    deposit_fee: 150,
    carrier_fee: 0,
    service_level: 'standard',
    notes: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leadRes, quotesRes] = await Promise.all([
          getLead(id),
          getQuotes()
        ]);
        const leadData = leadRes.data;
        setLead(leadData);
        setFormData({
          ...formData,
          ...leadData,
          company_name: leadData.company_name || '',
          phone2: leadData.phone2 || '',
          vehicle_color: leadData.vehicle_color || '',
          vehicle_vin: leadData.vehicle_vin || '',
          vehicle_license: leadData.vehicle_license || '',
          vehicle_state: leadData.vehicle_state || '',
          running_status: leadData.running_status || 'Running',
          modifications: leadData.modifications || [],
          quote_source: leadData.quote_source || ''
        });
        setQuotes(quotesRes.data.filter(q => q.lead_id === id));
      } catch (error) {
        toast.error('Failed to load lead');
        navigate('/leads');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateLead(id, formData);
      toast.success('Lead saved successfully');
    } catch (error) {
      toast.error('Failed to save lead');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateQuote = async () => {
    try {
      await createQuote({
        lead_id: id,
        ...quoteFormData
      });
      toast.success('Quote created successfully');
      setShowQuoteForm(false);
      // Refresh quotes
      const quotesRes = await getQuotes();
      setQuotes(quotesRes.data.filter(q => q.lead_id === id));
    } catch (error) {
      toast.error('Failed to create quote');
    }
  };

  const calculatePrice = () => {
    const basePricePerMile = {
      Sedan: 0.55, SUV: 0.65, Truck: 0.75, Van: 0.70,
      Motorcycle: 0.45, Coupe: 0.55, Convertible: 0.60, Other: 0.60
    };
    const basePrice = basePricePerMile[quoteFormData.vehicle_type] || 0.60;
    const carrierFee = Math.round(quoteFormData.distance * basePrice);
    const totalPrice = carrierFee + quoteFormData.deposit_fee;
    setQuoteFormData(prev => ({
      ...prev,
      carrier_fee: carrierFee,
      price: totalPrice
    }));
  };

  useEffect(() => {
    if (quoteFormData.distance > 0) {
      calculatePrice();
    }
  }, [quoteFormData.distance, quoteFormData.vehicle_type, quoteFormData.deposit_fee]);

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
      <Header title={`Lead: ${formData.customer_name}`}>
        <Button variant="outline" onClick={() => navigate('/leads')} data-testid="back-btn">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Leads
        </Button>
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700" data-testid="save-lead-btn">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Header>

      <div className="p-6 space-y-6" data-testid="lead-detail-page">
        {/* Lead ID & Status Bar */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">Lead ID:</span>
              <span className="font-mono text-sm">{lead?.id?.slice(0, 8).toUpperCase()}</span>
              <span className="text-sm text-slate-500 ml-4">Received:</span>
              <span className="font-mono text-sm">{new Date(lead?.created_at).toLocaleString()}</span>
            </div>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger className="w-[150px]" data-testid="lead-status-select">
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Information */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-heading font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Contact Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="form-label">Customer Name *</Label>
                  <Input
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="form-input"
                    data-testid="lead-customer-name"
                  />
                </div>
                <div>
                  <Label className="form-label">Company Name</Label>
                  <Input
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <Label className="form-label">Phone 1 *</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="form-input"
                    data-testid="lead-phone"
                  />
                </div>
                <div>
                  <Label className="form-label">Phone 2</Label>
                  <Input
                    value={formData.phone2}
                    onChange={(e) => setFormData({ ...formData, phone2: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="form-label">Email *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="form-input"
                    data-testid="lead-email"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="form-label">Quote Source</Label>
                  <Input
                    value={formData.quote_source}
                    onChange={(e) => setFormData({ ...formData, quote_source: e.target.value })}
                    className="form-input"
                    placeholder="e.g., Website, Referral, A1 Auto Transport"
                  />
                </div>
              </div>
            </div>

            {/* Vehicle Information */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-heading font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-600" />
                Vehicle Information
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="form-label">Year *</Label>
                  <Input
                    type="number"
                    value={formData.vehicle_year}
                    onChange={(e) => setFormData({ ...formData, vehicle_year: parseInt(e.target.value) })}
                    className="form-input"
                  />
                </div>
                <div>
                  <Label className="form-label">Make *</Label>
                  <Input
                    value={formData.vehicle_make}
                    onChange={(e) => setFormData({ ...formData, vehicle_make: e.target.value })}
                    className="form-input"
                    placeholder="e.g., Ford"
                  />
                </div>
                <div>
                  <Label className="form-label">Model *</Label>
                  <Input
                    value={formData.vehicle_model}
                    onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                    className="form-input"
                    placeholder="e.g., F250"
                  />
                </div>
                <div>
                  <Label className="form-label">Type *</Label>
                  <Select
                    value={formData.vehicle_type}
                    onValueChange={(value) => setFormData({ ...formData, vehicle_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="form-label">Running Status *</Label>
                  <Select
                    value={formData.running_status}
                    onValueChange={(value) => setFormData({ ...formData, running_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {runningStatuses.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="form-label">Color</Label>
                  <Input
                    value={formData.vehicle_color}
                    onChange={(e) => setFormData({ ...formData, vehicle_color: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <Label className="form-label">VIN</Label>
                  <Input
                    value={formData.vehicle_vin}
                    onChange={(e) => setFormData({ ...formData, vehicle_vin: e.target.value })}
                    className="form-input font-mono"
                  />
                </div>
                <div>
                  <Label className="form-label">License Plate</Label>
                  <Input
                    value={formData.vehicle_license}
                    onChange={(e) => setFormData({ ...formData, vehicle_license: e.target.value })}
                    className="form-input font-mono"
                  />
                </div>
                <div>
                  <Label className="form-label">State</Label>
                  <Input
                    value={formData.vehicle_state}
                    onChange={(e) => setFormData({ ...formData, vehicle_state: e.target.value })}
                    className="form-input"
                    placeholder="e.g., TX"
                  />
                </div>
              </div>

              {/* Modifications */}
              <div className="mt-4">
                <Label className="form-label">Modifications</Label>
                <div className="flex flex-wrap gap-3 mt-2">
                  {['Lifted', 'Lowered', 'Oversized Tires', 'Custom Wheels', 'Roof Rack'].map((mod) => (
                    <label key={mod} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.modifications?.includes(mod)}
                        onChange={(e) => {
                          const newMods = e.target.checked
                            ? [...(formData.modifications || []), mod]
                            : formData.modifications?.filter(m => m !== mod);
                          setFormData({ ...formData, modifications: newMods });
                        }}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                      <span className="text-sm text-slate-700">{mod}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-heading font-semibold text-slate-900 mb-4">Customer Requests / Notes</h3>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="form-input min-h-[120px] resize-none"
                placeholder="Add any special requests or notes here..."
              />
            </div>
          </div>

          {/* Quotes Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Quotes ({quotes.length})
                </h3>
                <Button
                  size="sm"
                  onClick={() => setShowQuoteForm(!showQuoteForm)}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="create-quote-from-lead"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New Quote
                </Button>
              </div>

              {showQuoteForm && (
                <div className="border border-blue-200 rounded-lg p-4 mb-4 bg-blue-50">
                  <h4 className="font-medium text-slate-900 mb-3">Create Quote</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Pickup City</Label>
                        <Input
                          value={quoteFormData.pickup_city}
                          onChange={(e) => setQuoteFormData({ ...quoteFormData, pickup_city: e.target.value })}
                          className="form-input text-sm"
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">State</Label>
                        <Input
                          value={quoteFormData.pickup_state}
                          onChange={(e) => setQuoteFormData({ ...quoteFormData, pickup_state: e.target.value })}
                          className="form-input text-sm"
                          placeholder="ST"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Delivery City</Label>
                        <Input
                          value={quoteFormData.delivery_city}
                          onChange={(e) => setQuoteFormData({ ...quoteFormData, delivery_city: e.target.value })}
                          className="form-input text-sm"
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">State</Label>
                        <Input
                          value={quoteFormData.delivery_state}
                          onChange={(e) => setQuoteFormData({ ...quoteFormData, delivery_state: e.target.value })}
                          className="form-input text-sm"
                          placeholder="ST"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Distance (miles)</Label>
                      <Input
                        type="number"
                        value={quoteFormData.distance}
                        onChange={(e) => setQuoteFormData({ ...quoteFormData, distance: parseFloat(e.target.value) || 0 })}
                        className="form-input text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <div>
                        <Label className="text-xs">Deposit Fee</Label>
                        <Input
                          type="number"
                          value={quoteFormData.deposit_fee}
                          onChange={(e) => setQuoteFormData({ ...quoteFormData, deposit_fee: parseFloat(e.target.value) || 0 })}
                          className="form-input text-sm font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Carrier Fee</Label>
                        <Input
                          type="number"
                          value={quoteFormData.carrier_fee}
                          className="form-input text-sm font-mono bg-slate-100"
                          disabled
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="font-medium">Total Price:</span>
                      <span className="text-xl font-bold text-emerald-600 font-mono">${quoteFormData.price}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setShowQuoteForm(false)}>Cancel</Button>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreateQuote}>
                        Create Quote
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {quotes.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No quotes yet</p>
              ) : (
                <div className="space-y-2">
                  {quotes.map((quote) => (
                    <Link
                      key={quote.id}
                      to={`/quotes/${quote.id}`}
                      className="block p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-medium">{quote.quote_number}</span>
                        <span className={`status-badge status-${quote.status}`}>{quote.status}</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        {quote.pickup_city} → {quote.delivery_city}
                      </p>
                      <p className="text-lg font-bold text-emerald-600 font-mono">${quote.price}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-heading font-semibold text-slate-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => window.open(`tel:${formData.phone}`)}>
                  <Phone className="w-4 h-4 mr-2" />
                  Call Customer
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => window.open(`mailto:${formData.email}`)}>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LeadDetail;
