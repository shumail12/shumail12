import React, { useState, useEffect } from 'react';
import { Layout, Header } from '../components/Layout';
import { getCarriers, createCarrier, updateCarrier, getOrders, updateOrder, getQuotes } from '../lib/api';
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
import { Plus, Search, Edit, Truck, Phone, Mail, Shield, MapPin } from 'lucide-react';
import { toast } from 'sonner';

const CarrierForm = ({ carrier, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState(carrier || {
    name: '',
    phone: '',
    email: '',
    mc_number: '',
    insurance_expiry: '',
    active_shipments: 0,
    status: 'active'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      insurance_expiry: formData.insurance_expiry ? new Date(formData.insurance_expiry).toISOString() : null
    };
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="form-label">Carrier Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="form-input"
            required
            data-testid="carrier-name"
          />
        </div>
        <div>
          <Label className="form-label">MC Number</Label>
          <Input
            value={formData.mc_number || ''}
            onChange={(e) => setFormData({ ...formData, mc_number: e.target.value })}
            className="form-input"
            placeholder="e.g., MC-123456"
            data-testid="carrier-mc-number"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="form-label">Phone *</Label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="form-input"
            required
            data-testid="carrier-phone"
          />
        </div>
        <div>
          <Label className="form-label">Email *</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="form-input"
            required
            data-testid="carrier-email"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="form-label">Insurance Expiry</Label>
          <Input
            type="date"
            value={formData.insurance_expiry ? formData.insurance_expiry.split('T')[0] : ''}
            onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })}
            className="form-input"
            data-testid="carrier-insurance"
          />
        </div>
        <div>
          <Label className="form-label">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger data-testid="carrier-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" data-testid="carrier-submit">
          {carrier ? 'Update Carrier' : 'Add Carrier'}
        </Button>
      </DialogFooter>
    </form>
  );
};

const AssignCarrierDialog = ({ order, carriers, quotes, onSubmit, onCancel }) => {
  const [selectedCarrier, setSelectedCarrier] = useState(order?.carrier_id || '');
  const quote = quotes.find(q => q.id === order?.quote_id);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...order,
      carrier_id: selectedCarrier || null,
      status: selectedCarrier ? 'assigned' : order.status
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <h4 className="font-medium text-slate-900 mb-2">Order Details</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p><span className="text-slate-500">Order #:</span> {order?.order_number}</p>
          <p><span className="text-slate-500">Status:</span> {order?.status}</p>
          <p><span className="text-slate-500">Route:</span> {quote?.pickup_city} → {quote?.delivery_city}</p>
          <p><span className="text-slate-500">Distance:</span> {quote?.distance} miles</p>
        </div>
      </div>

      <div>
        <Label className="form-label">Select Carrier</Label>
        <Select
          value={selectedCarrier || 'none'}
          onValueChange={(value) => setSelectedCarrier(value === 'none' ? '' : value)}
        >
          <SelectTrigger data-testid="assign-carrier-select">
            <SelectValue placeholder="Select a carrier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No carrier</SelectItem>
            {carriers.filter(c => c.status === 'active').map((carrier) => (
              <SelectItem key={carrier.id} value={carrier.id}>
                {carrier.name} - {carrier.phone}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" data-testid="assign-carrier-submit">
          Assign Carrier
        </Button>
      </DialogFooter>
    </form>
  );
};

const Dispatch = () => {
  const [carriers, setCarriers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCarrierDialogOpen, setIsCarrierDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState(null);
  const [assigningOrder, setAssigningOrder] = useState(null);
  const [view, setView] = useState('carriers'); // 'carriers' or 'pending'

  const fetchData = async () => {
    try {
      const [carriersRes, ordersRes, quotesRes] = await Promise.all([
        getCarriers(),
        getOrders(),
        getQuotes()
      ]);
      setCarriers(carriersRes.data);
      setOrders(ordersRes.data);
      setQuotes(quotesRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCarrier = async (data) => {
    try {
      await createCarrier(data);
      toast.success('Carrier added successfully');
      setIsCarrierDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add carrier');
    }
  };

  const handleUpdateCarrier = async (data) => {
    try {
      await updateCarrier(editingCarrier.id, data);
      toast.success('Carrier updated successfully');
      setIsCarrierDialogOpen(false);
      setEditingCarrier(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update carrier');
    }
  };

  const handleAssignCarrier = async (data) => {
    try {
      await updateOrder(assigningOrder.id, data);
      toast.success('Carrier assigned successfully');
      setIsAssignDialogOpen(false);
      setAssigningOrder(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign carrier');
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'pending' || !o.carrier_id);
  const getQuoteForOrder = (quoteId) => quotes.find(q => q.id === quoteId);

  const filteredCarriers = carriers.filter((carrier) => 
    carrier.name.toLowerCase().includes(search.toLowerCase()) ||
    carrier.phone.includes(search) ||
    carrier.mc_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <Header title="Dispatch">
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'carriers' ? 'default' : 'outline'}
            onClick={() => setView('carriers')}
            className={view === 'carriers' ? 'bg-blue-600' : ''}
            data-testid="view-carriers-btn"
          >
            Carriers
          </Button>
          <Button
            variant={view === 'pending' ? 'default' : 'outline'}
            onClick={() => setView('pending')}
            className={view === 'pending' ? 'bg-blue-600' : ''}
            data-testid="view-pending-btn"
          >
            Pending Assignment ({pendingOrders.length})
          </Button>
        </div>
      </Header>

      <div className="p-6" data-testid="dispatch-page">
        {view === 'carriers' ? (
          <>
            {/* Carriers View */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search carriers..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 form-input"
                    data-testid="search-carriers"
                  />
                </div>
              </div>
              <Button
                onClick={() => { setEditingCarrier(null); setIsCarrierDialogOpen(true); }}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="add-carrier-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Carrier
              </Button>
            </div>

            {/* Carriers Grid */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : filteredCarriers.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                <Truck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No carriers found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCarriers.map((carrier) => (
                  <div
                    key={carrier.id}
                    className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200"
                    data-testid={`carrier-card-${carrier.id}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Truck className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">{carrier.name}</h3>
                          <p className="text-xs text-slate-500 font-mono">{carrier.mc_number || 'No MC#'}</p>
                        </div>
                      </div>
                      <span className={`status-badge ${carrier.status === 'active' ? 'status-active' : 'status-cancelled'}`}>
                        {carrier.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <p className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-4 h-4" />
                        {carrier.phone}
                      </p>
                      <p className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-4 h-4" />
                        {carrier.email}
                      </p>
                      {carrier.insurance_expiry && (
                        <p className="flex items-center gap-2 text-slate-600">
                          <Shield className="w-4 h-4" />
                          Insurance: {new Date(carrier.insurance_expiry).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-sm text-slate-500">
                        {carrier.active_shipments} active shipments
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingCarrier(carrier); setIsCarrierDialogOpen(true); }}
                        data-testid={`edit-carrier-${carrier.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Pending Orders View */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              {pendingOrders.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No orders pending assignment</p>
                </div>
              ) : (
                <table className="w-full data-table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Route</th>
                      <th>Distance</th>
                      <th>Current Carrier</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingOrders.map((order) => {
                      const quote = getQuoteForOrder(order.quote_id);
                      const carrier = carriers.find(c => c.id === order.carrier_id);
                      return (
                        <tr key={order.id} data-testid={`pending-order-${order.id}`}>
                          <td>
                            <span className="font-mono font-medium text-slate-900">{order.order_number}</span>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-700">
                                {quote?.pickup_city}, {quote?.pickup_state} → {quote?.delivery_city}, {quote?.delivery_state}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="font-mono text-sm">{quote?.distance?.toLocaleString()} mi</span>
                          </td>
                          <td>
                            {carrier ? (
                              <span className="text-slate-700">{carrier.name}</span>
                            ) : (
                              <span className="text-slate-400">Not assigned</span>
                            )}
                          </td>
                          <td>
                            <span className="status-badge status-pending">{order.status}</span>
                          </td>
                          <td>
                            <div className="flex items-center justify-end">
                              <Button
                                size="sm"
                                onClick={() => { setAssigningOrder(order); setIsAssignDialogOpen(true); }}
                                className="bg-blue-600 hover:bg-blue-700"
                                data-testid={`assign-order-${order.id}`}
                              >
                                Assign Carrier
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
          </>
        )}

        {/* Carrier Dialog */}
        <Dialog open={isCarrierDialogOpen} onOpenChange={setIsCarrierDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingCarrier ? 'Edit Carrier' : 'Add New Carrier'}</DialogTitle>
            </DialogHeader>
            <CarrierForm
              carrier={editingCarrier}
              onSubmit={editingCarrier ? handleUpdateCarrier : handleCreateCarrier}
              onCancel={() => { setIsCarrierDialogOpen(false); setEditingCarrier(null); }}
            />
          </DialogContent>
        </Dialog>

        {/* Assign Carrier Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Assign Carrier to Order</DialogTitle>
            </DialogHeader>
            <AssignCarrierDialog
              order={assigningOrder}
              carriers={carriers}
              quotes={quotes}
              onSubmit={handleAssignCarrier}
              onCancel={() => { setIsAssignDialogOpen(false); setAssigningOrder(null); }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Dispatch;
