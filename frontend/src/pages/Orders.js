import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Header } from '../components/Layout';
import { getOrders, createOrder, updateOrder, getQuotes, getCarriers } from '../lib/api';
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
import { Plus, Search, Edit, Package, MapPin, Calendar, Truck, Eye } from 'lucide-react';
import { toast } from 'sonner';

const statusOptions = ['pending', 'assigned', 'in_transit', 'delivered', 'cancelled'];

const OrderForm = ({ order, quotes, carriers, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState(order || {
    quote_id: '',
    status: 'pending',
    pickup_date: '',
    delivery_date: '',
    carrier_id: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      pickup_date: formData.pickup_date ? new Date(formData.pickup_date).toISOString() : null,
      delivery_date: formData.delivery_date ? new Date(formData.delivery_date).toISOString() : null,
      carrier_id: formData.carrier_id || null
    };
    onSubmit(submitData);
  };

  const selectedQuote = quotes.find(q => q.id === formData.quote_id);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!order && (
        <div>
          <Label className="form-label">Select Quote *</Label>
          <Select
            value={formData.quote_id}
            onValueChange={(value) => setFormData({ ...formData, quote_id: value })}
          >
            <SelectTrigger data-testid="order-quote">
              <SelectValue placeholder="Select an approved quote" />
            </SelectTrigger>
            <SelectContent>
              {quotes.filter(q => q.status === 'approved').map((quote) => (
                <SelectItem key={quote.id} value={quote.id}>
                  {quote.quote_number} - {quote.pickup_city} → {quote.delivery_city} (${quote.price})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedQuote && (
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <h4 className="font-medium text-slate-900 mb-2">Quote Details</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p><span className="text-slate-500">Route:</span> {selectedQuote.pickup_city} → {selectedQuote.delivery_city}</p>
            <p><span className="text-slate-500">Price:</span> <span className="font-mono text-emerald-600">${selectedQuote.price}</span></p>
            <p><span className="text-slate-500">Distance:</span> {selectedQuote.distance} miles</p>
            <p><span className="text-slate-500">Vehicle:</span> {selectedQuote.vehicle_type}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="form-label">Pickup Date</Label>
          <Input
            type="date"
            value={formData.pickup_date ? formData.pickup_date.split('T')[0] : ''}
            onChange={(e) => setFormData({ ...formData, pickup_date: e.target.value })}
            className="form-input"
            data-testid="order-pickup-date"
          />
        </div>
        <div>
          <Label className="form-label">Delivery Date</Label>
          <Input
            type="date"
            value={formData.delivery_date ? formData.delivery_date.split('T')[0] : ''}
            onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
            className="form-input"
            data-testid="order-delivery-date"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="form-label">Assign Carrier</Label>
          <Select
            value={formData.carrier_id || 'none'}
            onValueChange={(value) => setFormData({ ...formData, carrier_id: value === 'none' ? '' : value })}
          >
            <SelectTrigger data-testid="order-carrier">
              <SelectValue placeholder="Select a carrier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No carrier assigned</SelectItem>
              {carriers.filter(c => c.status === 'active').map((carrier) => (
                <SelectItem key={carrier.id} value={carrier.id}>
                  {carrier.name} ({carrier.active_shipments} active)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="form-label">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger data-testid="order-status">
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

      <div>
        <Label className="form-label">Notes</Label>
        <textarea
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="form-input min-h-[80px] resize-none"
          data-testid="order-notes"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" data-testid="order-submit">
          {order ? 'Update Order' : 'Create Order'}
        </Button>
      </DialogFooter>
    </form>
  );
};

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);

  const fetchData = async () => {
    try {
      const [ordersRes, quotesRes, carriersRes] = await Promise.all([
        getOrders(),
        getQuotes(),
        getCarriers()
      ]);
      setOrders(ordersRes.data);
      setQuotes(quotesRes.data);
      setCarriers(carriersRes.data);
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
      await createOrder(data);
      toast.success('Order created successfully');
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create order');
    }
  };

  const handleUpdate = async (data) => {
    try {
      await updateOrder(editingOrder.id, data);
      toast.success('Order updated successfully');
      setIsDialogOpen(false);
      setEditingOrder(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update order');
    }
  };

  const getStatusClass = (status) => {
    const statusMap = {
      pending: 'status-pending',
      assigned: 'status-assigned',
      in_transit: 'status-in_transit',
      delivered: 'status-delivered',
      cancelled: 'status-cancelled'
    };
    return statusMap[status] || 'status-pending';
  };

  const getQuoteForOrder = (quoteId) => quotes.find(q => q.id === quoteId);
  const getCarrierForOrder = (carrierId) => carriers.find(c => c.id === carrierId);

  const filteredOrders = orders.filter((order) => {
    const quote = getQuoteForOrder(order.quote_id);
    const matchesSearch = 
      order.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      quote?.pickup_city?.toLowerCase().includes(search.toLowerCase()) ||
      quote?.delivery_city?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <Header title="Orders">
        <Button
          onClick={() => { setEditingOrder(null); setIsDialogOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="create-order-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Order
        </Button>
      </Header>

      <div className="p-6" data-testid="orders-page">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search orders..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 form-input"
                  data-testid="search-orders"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="filter-order-status">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
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
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No orders found</p>
            </div>
          ) : (
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Route</th>
                  <th>Carrier</th>
                  <th>Pickup</th>
                  <th>Delivery</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const quote = getQuoteForOrder(order.quote_id);
                  const carrier = getCarrierForOrder(order.carrier_id);
                  return (
                    <tr key={order.id} data-testid={`order-row-${order.id}`}>
                      <td>
                        <span className="font-mono font-medium text-slate-900">{order.order_number}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700">
                            {quote?.pickup_city}, {quote?.pickup_state} → {quote?.delivery_city}, {quote?.delivery_state}
                          </span>
                        </div>
                      </td>
                      <td>
                        {carrier ? (
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-700">{carrier.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Not assigned</span>
                        )}
                      </td>
                      <td>
                        <span className="font-mono text-sm text-slate-600">
                          {order.pickup_date ? new Date(order.pickup_date).toLocaleDateString() : '-'}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-sm text-slate-600">
                          {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : '-'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {order.status === 'in_transit' && <span className="live-dot" />}
                          <span className={`status-badge ${getStatusClass(order.status)}`}>
                            {order.status?.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/orders/${order.id}`)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            data-testid={`view-order-${order.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setEditingOrder(order); setIsDialogOpen(true); }}
                            data-testid={`edit-order-${order.id}`}
                          >
                            <Edit className="w-4 h-4" />
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

        {/* Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingOrder ? 'Edit Order' : 'Create New Order'}</DialogTitle>
            </DialogHeader>
            <OrderForm
              order={editingOrder}
              quotes={quotes}
              carriers={carriers}
              onSubmit={editingOrder ? handleUpdate : handleCreate}
              onCancel={() => { setIsDialogOpen(false); setEditingOrder(null); }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Orders;
