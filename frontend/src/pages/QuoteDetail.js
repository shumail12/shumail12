import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout, Header } from '../components/Layout';
import { getQuote, updateQuote, getLead, createOrder, getOrders } from '../lib/api';
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
import { ArrowLeft, Save, MapPin, DollarSign, User, Package, Calculator, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const vehicleTypes = ['Sedan', 'SUV', 'Truck', 'Van', 'Motorcycle', 'Coupe', 'Convertible', 'Other'];
const statusOptions = ['pending', 'approved', 'rejected', 'converted'];
const serviceLevels = [
  { value: 'standard', label: 'Standard Shipping', depositMultiplier: 1 },
  { value: 'expedited', label: 'Expedited Shipping', depositMultiplier: 1.15 },
  { value: 'enclosed', label: 'Enclosed Shipping', depositMultiplier: 1.35 }
];

const QuoteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [lead, setLead] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
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
    status: 'pending',
    notes: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [quoteRes, ordersRes] = await Promise.all([
          getQuote(id),
          getOrders()
        ]);
        const quoteData = quoteRes.data;
        setQuote(quoteData);
        setFormData({
          ...formData,
          ...quoteData,
          pickup_zip: quoteData.pickup_zip || '',
          delivery_zip: quoteData.delivery_zip || '',
          deposit_fee: quoteData.deposit_fee || 150,
          carrier_fee: quoteData.carrier_fee || (quoteData.price - 150),
          service_level: quoteData.service_level || 'standard'
        });

        // Fetch lead info
        if (quoteData.lead_id) {
          const leadRes = await getLead(quoteData.lead_id);
          setLead(leadRes.data);
        }

        // Filter orders for this quote
        setOrders(ordersRes.data.filter(o => o.quote_id === id));
      } catch (error) {
        toast.error('Failed to load quote');
        navigate('/quotes');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  const calculatePricing = () => {
    const basePricePerMile = {
      Sedan: 0.55, SUV: 0.65, Truck: 0.75, Van: 0.70,
      Motorcycle: 0.45, Coupe: 0.55, Convertible: 0.60, Other: 0.60
    };
    const basePrice = basePricePerMile[formData.vehicle_type] || 0.60;
    const carrierFee = Math.round(formData.distance * basePrice);
    const serviceMultiplier = serviceLevels.find(s => s.value === formData.service_level)?.depositMultiplier || 1;
    const adjustedDeposit = Math.round(formData.deposit_fee * serviceMultiplier);
    const totalPrice = carrierFee + adjustedDeposit;
    
    setFormData(prev => ({
      ...prev,
      carrier_fee: carrierFee,
      price: totalPrice
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateQuote(id, {
        lead_id: quote.lead_id,
        ...formData
      });
      toast.success('Quote saved successfully');
    } catch (error) {
      toast.error('Failed to save quote');
    } finally {
      setSaving(false);
    }
  };

  const handleApprovePrice = async () => {
    try {
      await updateQuote(id, {
        lead_id: quote.lead_id,
        ...formData,
        status: 'approved'
      });
      setFormData(prev => ({ ...prev, status: 'approved' }));
      toast.success('Quote approved!');
    } catch (error) {
      toast.error('Failed to approve quote');
    }
  };

  const handleConvertToOrder = async () => {
    try {
      await createOrder({
        quote_id: id,
        status: 'pending',
        pickup_date: null,
        delivery_date: null,
        carrier_id: null,
        notes: ''
      });
      await updateQuote(id, {
        lead_id: quote.lead_id,
        ...formData,
        status: 'converted'
      });
      toast.success('Order created successfully!');
      navigate('/orders');
    } catch (error) {
      toast.error('Failed to create order');
    }
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
      <Header title={`Quote: ${quote?.quote_number}`}>
        <Button variant="outline" onClick={() => navigate('/quotes')} data-testid="back-btn">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Quotes
        </Button>
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700" data-testid="save-quote-btn">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Header>

      <div className="p-6 space-y-6" data-testid="quote-detail-page">
        {/* Quote Header */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-sm text-slate-500">Quote ID:</span>
                <span className="font-mono text-sm ml-2">{quote?.quote_number}</span>
              </div>
              <div>
                <span className="text-sm text-slate-500">Created:</span>
                <span className="font-mono text-sm ml-2">{new Date(quote?.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-sm text-slate-500">Updated:</span>
                <span className="font-mono text-sm ml-2">{new Date(quote?.updated_at).toLocaleString()}</span>
              </div>
            </div>
            <span className={`status-badge status-${formData.status}`}>{formData.status}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Pickup Location */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-heading font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Pickup Location
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-4">
                  <Label className="form-label">Street Address</Label>
                  <Input
                    value={formData.pickup_location}
                    onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                    className="form-input"
                    placeholder="Street address"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="form-label">City *</Label>
                  <Input
                    value={formData.pickup_city}
                    onChange={(e) => setFormData({ ...formData, pickup_city: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <Label className="form-label">State *</Label>
                  <Input
                    value={formData.pickup_state}
                    onChange={(e) => setFormData({ ...formData, pickup_state: e.target.value })}
                    className="form-input"
                    placeholder="ST"
                  />
                </div>
                <div>
                  <Label className="form-label">ZIP</Label>
                  <Input
                    value={formData.pickup_zip}
                    onChange={(e) => setFormData({ ...formData, pickup_zip: e.target.value })}
                    className="form-input font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Location */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-heading font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-rose-600" />
                Delivery Location
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-4">
                  <Label className="form-label">Street Address</Label>
                  <Input
                    value={formData.delivery_location}
                    onChange={(e) => setFormData({ ...formData, delivery_location: e.target.value })}
                    className="form-input"
                    placeholder="Street address"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="form-label">City *</Label>
                  <Input
                    value={formData.delivery_city}
                    onChange={(e) => setFormData({ ...formData, delivery_city: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <Label className="form-label">State *</Label>
                  <Input
                    value={formData.delivery_state}
                    onChange={(e) => setFormData({ ...formData, delivery_state: e.target.value })}
                    className="form-input"
                    placeholder="ST"
                  />
                </div>
                <div>
                  <Label className="form-label">ZIP</Label>
                  <Input
                    value={formData.delivery_zip}
                    onChange={(e) => setFormData({ ...formData, delivery_zip: e.target.value })}
                    className="form-input font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Distance & Vehicle */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-heading font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                Distance & Vehicle
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="form-label">Distance (miles)</Label>
                  <Input
                    type="number"
                    value={formData.distance}
                    onChange={(e) => setFormData({ ...formData, distance: parseFloat(e.target.value) || 0 })}
                    className="form-input font-mono"
                  />
                </div>
                <div>
                  <Label className="form-label">Vehicle Type</Label>
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
                <div className="flex items-end">
                  <Button variant="outline" onClick={calculatePricing} className="w-full">
                    Recalculate Price
                  </Button>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-heading font-semibold text-slate-900 mb-4">Notes</h3>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="form-input min-h-[100px] resize-none"
                placeholder="Add any notes about this quote..."
              />
            </div>
          </div>

          {/* Pricing & Actions */}
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
                  <p className="text-sm text-slate-600 mt-2">
                    {lead.vehicle_year} {lead.vehicle_make} {lead.vehicle_model}
                  </p>
                </Link>
              </div>
            )}

            {/* Pricing Calculator */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-heading font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Pricing
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="form-label">Service Level</Label>
                  <Select
                    value={formData.service_level}
                    onValueChange={(value) => setFormData({ ...formData, service_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Deposit Fee</span>
                    <Input
                      type="number"
                      value={formData.deposit_fee}
                      onChange={(e) => setFormData({ ...formData, deposit_fee: parseFloat(e.target.value) || 0 })}
                      className="w-24 text-right font-mono"
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Carrier Fee</span>
                    <span className="font-mono">${formData.carrier_fee?.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="font-semibold text-slate-900">Total Price</span>
                    <span className="text-2xl font-bold text-emerald-600 font-mono">${formData.price?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-heading font-semibold text-slate-900 mb-4">Actions</h3>
              <div className="space-y-2">
                {formData.status === 'pending' && (
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleApprovePrice}
                    data-testid="approve-quote-btn"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Price
                  </Button>
                )}
                {formData.status === 'approved' && orders.length === 0 && (
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={handleConvertToOrder}
                    data-testid="convert-to-order-btn"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Convert to Order
                  </Button>
                )}
                {orders.length > 0 && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600">Order Created:</p>
                    {orders.map(order => (
                      <Link 
                        key={order.id} 
                        to={`/orders/${order.id}`}
                        className="font-mono text-blue-600 hover:underline"
                      >
                        {order.order_number}
                      </Link>
                    ))}
                  </div>
                )}
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
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default QuoteDetail;
