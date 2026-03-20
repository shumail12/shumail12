import React, { useState, useEffect } from 'react';
import { Layout, Header } from '../components/Layout';
import { getQuotes, createQuote, updateQuote, getLeads } from '../lib/api';
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
import { Plus, Search, Edit, FileText, MapPin, DollarSign, Calculator } from 'lucide-react';
import { toast } from 'sonner';

const vehicleTypes = ['Sedan', 'SUV', 'Truck', 'Van', 'Motorcycle', 'Coupe', 'Convertible', 'Other'];
const statusOptions = ['pending', 'approved', 'rejected', 'converted'];

const basePricePerMile = {
  Sedan: 0.55,
  SUV: 0.65,
  Truck: 0.75,
  Van: 0.70,
  Motorcycle: 0.45,
  Coupe: 0.55,
  Convertible: 0.60,
  Other: 0.60
};

const QuoteForm = ({ quote, leads, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState(quote || {
    lead_id: '',
    pickup_location: '',
    pickup_city: '',
    pickup_state: '',
    delivery_location: '',
    delivery_city: '',
    delivery_state: '',
    distance: 0,
    vehicle_type: 'Sedan',
    price: 0,
    status: 'pending',
    notes: ''
  });

  const calculatePrice = (distance, vehicleType) => {
    const basePrice = basePricePerMile[vehicleType] || 0.60;
    return Math.round(distance * basePrice + 150); // Base fee of $150
  };

  useEffect(() => {
    if (formData.distance > 0 && formData.vehicle_type) {
      const calculatedPrice = calculatePrice(formData.distance, formData.vehicle_type);
      setFormData(prev => ({ ...prev, price: calculatedPrice }));
    }
  }, [formData.distance, formData.vehicle_type]);

  const handleLeadSelect = (leadId) => {
    const selectedLead = leads.find(l => l.id === leadId);
    if (selectedLead) {
      setFormData(prev => ({
        ...prev,
        lead_id: leadId,
        vehicle_type: selectedLead.vehicle_type || 'Sedan'
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="form-label">Select Lead *</Label>
        <Select
          value={formData.lead_id}
          onValueChange={handleLeadSelect}
        >
          <SelectTrigger data-testid="quote-lead">
            <SelectValue placeholder="Select a lead" />
          </SelectTrigger>
          <SelectContent>
            {leads.filter(l => l.status !== 'converted' && l.status !== 'lost').map((lead) => (
              <SelectItem key={lead.id} value={lead.id}>
                {lead.customer_name} - {lead.vehicle_year} {lead.vehicle_make} {lead.vehicle_model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4" /> Pickup Location
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-3">
            <Label className="form-label">Address *</Label>
            <Input
              value={formData.pickup_location}
              onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
              className="form-input"
              placeholder="Street address"
              required
              data-testid="quote-pickup-address"
            />
          </div>
          <div>
            <Label className="form-label">City *</Label>
            <Input
              value={formData.pickup_city}
              onChange={(e) => setFormData({ ...formData, pickup_city: e.target.value })}
              className="form-input"
              required
              data-testid="quote-pickup-city"
            />
          </div>
          <div>
            <Label className="form-label">State *</Label>
            <Input
              value={formData.pickup_state}
              onChange={(e) => setFormData({ ...formData, pickup_state: e.target.value })}
              className="form-input"
              placeholder="e.g., CA"
              required
              data-testid="quote-pickup-state"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4" /> Delivery Location
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-3">
            <Label className="form-label">Address *</Label>
            <Input
              value={formData.delivery_location}
              onChange={(e) => setFormData({ ...formData, delivery_location: e.target.value })}
              className="form-input"
              placeholder="Street address"
              required
              data-testid="quote-delivery-address"
            />
          </div>
          <div>
            <Label className="form-label">City *</Label>
            <Input
              value={formData.delivery_city}
              onChange={(e) => setFormData({ ...formData, delivery_city: e.target.value })}
              className="form-input"
              required
              data-testid="quote-delivery-city"
            />
          </div>
          <div>
            <Label className="form-label">State *</Label>
            <Input
              value={formData.delivery_state}
              onChange={(e) => setFormData({ ...formData, delivery_state: e.target.value })}
              className="form-input"
              placeholder="e.g., TX"
              required
              data-testid="quote-delivery-state"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
          <Calculator className="w-4 h-4" /> Pricing
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="form-label">Distance (miles) *</Label>
            <Input
              type="number"
              value={formData.distance}
              onChange={(e) => setFormData({ ...formData, distance: parseFloat(e.target.value) || 0 })}
              className="form-input"
              required
              data-testid="quote-distance"
            />
          </div>
          <div>
            <Label className="form-label">Vehicle Type</Label>
            <Select
              value={formData.vehicle_type}
              onValueChange={(value) => setFormData({ ...formData, vehicle_type: value })}
            >
              <SelectTrigger data-testid="quote-vehicle-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {vehicleTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="form-label">Price ($) *</Label>
            <Input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              className="form-input font-mono"
              required
              data-testid="quote-price"
            />
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          * Price auto-calculated based on distance and vehicle type. You can adjust manually.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="form-label">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger data-testid="quote-status">
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

      <div>
        <Label className="form-label">Notes</Label>
        <textarea
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="form-input min-h-[80px] resize-none"
          data-testid="quote-notes"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" data-testid="quote-submit">
          {quote ? 'Update Quote' : 'Create Quote'}
        </Button>
      </DialogFooter>
    </form>
  );
};

const Quotes = () => {
  const [quotes, setQuotes] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);

  const fetchData = async () => {
    try {
      const [quotesRes, leadsRes] = await Promise.all([getQuotes(), getLeads()]);
      setQuotes(quotesRes.data);
      setLeads(leadsRes.data);
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
      await createQuote(data);
      toast.success('Quote created successfully');
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create quote');
    }
  };

  const handleUpdate = async (data) => {
    try {
      await updateQuote(editingQuote.id, data);
      toast.success('Quote updated successfully');
      setIsDialogOpen(false);
      setEditingQuote(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update quote');
    }
  };

  const getStatusClass = (status) => {
    const statusMap = {
      pending: 'status-pending',
      approved: 'status-approved',
      rejected: 'status-rejected',
      converted: 'status-converted'
    };
    return statusMap[status] || 'status-pending';
  };

  const filteredQuotes = quotes.filter((quote) => {
    const matchesSearch = 
      quote.quote_number?.toLowerCase().includes(search.toLowerCase()) ||
      quote.pickup_city?.toLowerCase().includes(search.toLowerCase()) ||
      quote.delivery_city?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <Header title="Quotes">
        <Button
          onClick={() => { setEditingQuote(null); setIsDialogOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="create-quote-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Quote
        </Button>
      </Header>

      <div className="p-6" data-testid="quotes-page">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search quotes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 form-input"
                  data-testid="search-quotes"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="filter-quote-status">
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
          ) : filteredQuotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No quotes found</p>
            </div>
          ) : (
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Quote #</th>
                  <th>Route</th>
                  <th>Distance</th>
                  <th>Vehicle</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.map((quote) => (
                  <tr key={quote.id} data-testid={`quote-row-${quote.id}`}>
                    <td>
                      <span className="font-mono font-medium text-slate-900">{quote.quote_number}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-700">{quote.pickup_city}, {quote.pickup_state}</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-slate-700">{quote.delivery_city}, {quote.delivery_state}</span>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-sm">{quote.distance?.toLocaleString()} mi</span>
                    </td>
                    <td>
                      <span className="text-sm text-slate-600">{quote.vehicle_type}</span>
                    </td>
                    <td>
                      <span className="font-mono font-medium text-emerald-600">
                        ${quote.price?.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusClass(quote.status)}`}>
                        {quote.status}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-sm text-slate-600">
                        {new Date(quote.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditingQuote(quote); setIsDialogOpen(true); }}
                          data-testid={`edit-quote-${quote.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingQuote ? 'Edit Quote' : 'Create New Quote'}</DialogTitle>
            </DialogHeader>
            <QuoteForm
              quote={editingQuote}
              leads={leads}
              onSubmit={editingQuote ? handleUpdate : handleCreate}
              onCancel={() => { setIsDialogOpen(false); setEditingQuote(null); }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Quotes;
