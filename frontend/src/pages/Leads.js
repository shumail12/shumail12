import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Header } from '../components/Layout';
import { getLeads, createLead, updateLead, deleteLead } from '../lib/api';
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
import { Plus, Search, Edit, Trash2, Phone, Mail, Car, Eye } from 'lucide-react';
import { toast } from 'sonner';

const vehicleTypes = ['Sedan', 'SUV', 'Truck', 'Van', 'Motorcycle', 'Coupe', 'Convertible', 'Other'];
const statusOptions = ['new', 'contacted', 'quoted', 'converted', 'lost'];

const LeadForm = ({ lead, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState(lead || {
    customer_name: '',
    phone: '',
    email: '',
    vehicle_year: new Date().getFullYear(),
    vehicle_make: '',
    vehicle_model: '',
    vehicle_type: 'Sedan',
    status: 'new',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="form-label">Customer Name *</Label>
          <Input
            value={formData.customer_name}
            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
            className="form-input"
            required
            data-testid="lead-customer-name"
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
            data-testid="lead-email"
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
            data-testid="lead-phone"
          />
        </div>
        <div>
          <Label className="form-label">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger data-testid="lead-status">
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

      <div className="border-t border-slate-200 pt-4 mt-4">
        <h4 className="font-medium text-slate-900 mb-3">Vehicle Information</h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="form-label">Year *</Label>
            <Input
              type="number"
              value={formData.vehicle_year}
              onChange={(e) => setFormData({ ...formData, vehicle_year: parseInt(e.target.value) })}
              className="form-input"
              required
              data-testid="lead-vehicle-year"
            />
          </div>
          <div>
            <Label className="form-label">Make *</Label>
            <Input
              value={formData.vehicle_make}
              onChange={(e) => setFormData({ ...formData, vehicle_make: e.target.value })}
              className="form-input"
              placeholder="e.g., Toyota"
              required
              data-testid="lead-vehicle-make"
            />
          </div>
          <div>
            <Label className="form-label">Model *</Label>
            <Input
              value={formData.vehicle_model}
              onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
              className="form-input"
              placeholder="e.g., Camry"
              required
              data-testid="lead-vehicle-model"
            />
          </div>
        </div>
        <div className="mt-4">
          <Label className="form-label">Vehicle Type</Label>
          <Select
            value={formData.vehicle_type}
            onValueChange={(value) => setFormData({ ...formData, vehicle_type: value })}
          >
            <SelectTrigger data-testid="lead-vehicle-type">
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
      </div>

      <div>
        <Label className="form-label">Notes</Label>
        <textarea
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="form-input min-h-[80px] resize-none"
          data-testid="lead-notes"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" data-testid="lead-submit">
          {lead ? 'Update Lead' : 'Create Lead'}
        </Button>
      </DialogFooter>
    </form>
  );
};

const Leads = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);

  const fetchLeads = async () => {
    try {
      const response = await getLeads();
      setLeads(response.data);
    } catch (error) {
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleCreate = async (data) => {
    try {
      await createLead(data);
      toast.success('Lead created successfully');
      setIsDialogOpen(false);
      fetchLeads();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create lead');
    }
  };

  const handleUpdate = async (data) => {
    try {
      await updateLead(editingLead.id, data);
      toast.success('Lead updated successfully');
      setIsDialogOpen(false);
      setEditingLead(null);
      fetchLeads();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update lead');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await deleteLead(id);
      toast.success('Lead deleted successfully');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to delete lead');
    }
  };

  const getStatusClass = (status) => {
    const statusMap = {
      new: 'status-new',
      contacted: 'status-contacted',
      quoted: 'status-quoted',
      converted: 'status-converted',
      lost: 'status-lost'
    };
    return statusMap[status] || 'status-new';
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = 
      lead.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      lead.email.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone.includes(search);
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <Header title="Leads">
        <Button
          onClick={() => { setEditingLead(null); setIsDialogOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="create-lead-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Lead
        </Button>
      </Header>

      <div className="p-6" data-testid="leads-page">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search leads..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 form-input"
                  data-testid="search-leads"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="filter-status">
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
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-12">
              <Car className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No leads found</p>
            </div>
          ) : (
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} data-testid={`lead-row-${lead.id}`}>
                    <td>
                      <p className="font-medium text-slate-900">{lead.customer_name}</p>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <Mail className="w-3.5 h-3.5" />
                          {lead.email}
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <Phone className="w-3.5 h-3.5" />
                          {lead.phone}
                        </span>
                      </div>
                    </td>
                    <td>
                      <p className="font-mono text-sm">
                        {lead.vehicle_year} {lead.vehicle_make} {lead.vehicle_model}
                      </p>
                      <p className="text-xs text-slate-500">{lead.vehicle_type}</p>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusClass(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-sm text-slate-600">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/leads/${lead.id}`)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          data-testid={`view-lead-${lead.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditingLead(lead); setIsDialogOpen(true); }}
                          data-testid={`edit-lead-${lead.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(lead.id)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          data-testid={`delete-lead-${lead.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingLead ? 'Edit Lead' : 'Create New Lead'}</DialogTitle>
            </DialogHeader>
            <LeadForm
              lead={editingLead}
              onSubmit={editingLead ? handleUpdate : handleCreate}
              onCancel={() => { setIsDialogOpen(false); setEditingLead(null); }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Leads;
