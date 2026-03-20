import React, { useState, useEffect } from 'react';
import { Layout, Header } from '../components/Layout';
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
import { Plus, Search, Edit, Trash2, User, Shield, UserCheck, UserX, Key } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

const roleOptions = ['superadmin', 'admin', 'staff'];

const UserForm = ({ user, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState(user || {
    username: '',
    email: '',
    full_name: '',
    phone: '',
    role: 'staff',
    password: '',
    is_active: true
  });
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!user && formData.password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="form-label">Full Name *</Label>
          <Input
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            className="form-input"
            required
            data-testid="user-fullname"
          />
        </div>
        <div>
          <Label className="form-label">Username *</Label>
          <Input
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="form-input"
            required
            disabled={!!user}
            data-testid="user-username"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="form-label">Email *</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="form-input"
            required
            data-testid="user-email"
          />
        </div>
        <div>
          <Label className="form-label">Phone</Label>
          <Input
            value={formData.phone || ''}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="form-input"
            data-testid="user-phone"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="form-label">Role *</Label>
          <Select
            value={formData.role}
            onValueChange={(value) => setFormData({ ...formData, role: value })}
          >
            <SelectTrigger data-testid="user-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((role) => (
                <SelectItem key={role} value={role}>
                  <div className="flex items-center gap-2">
                    {role === 'superadmin' && <Shield className="w-4 h-4 text-rose-500" />}
                    {role === 'admin' && <UserCheck className="w-4 h-4 text-blue-500" />}
                    {role === 'staff' && <User className="w-4 h-4 text-slate-500" />}
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="form-label">Status</Label>
          <Select
            value={formData.is_active ? 'active' : 'inactive'}
            onValueChange={(value) => setFormData({ ...formData, is_active: value === 'active' })}
          >
            <SelectTrigger data-testid="user-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4 mt-4">
        <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
          <Key className="w-4 h-4" />
          {user ? 'Change Password (leave blank to keep current)' : 'Set Password *'}
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="form-label">{user ? 'New Password' : 'Password *'}</Label>
            <Input
              type="password"
              value={formData.password || ''}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="form-input"
              required={!user}
              data-testid="user-password"
            />
          </div>
          <div>
            <Label className="form-label">Confirm Password {!user && '*'}</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-input"
              required={!user}
              data-testid="user-confirm-password"
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" data-testid="user-submit">
          {user ? 'Update User' : 'Create User'}
        </Button>
      </DialogFooter>
    </form>
  );
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('You do not have permission to view users');
      } else {
        toast.error('Failed to fetch users');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (data) => {
    try {
      await api.post('/auth/register', data);
      toast.success('User created successfully');
      setIsDialogOpen(false);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleUpdate = async (data) => {
    try {
      const updateData = { ...data };
      if (!updateData.password) {
        delete updateData.password;
      }
      await api.put(`/users/${editingUser.id}`, updateData);
      toast.success('User updated successfully');
      setIsDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user');
    }
  };

  const handleDelete = async (id, username) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'superadmin':
        return <Shield className="w-4 h-4 text-rose-500" />;
      case 'admin':
        return <UserCheck className="w-4 h-4 text-blue-500" />;
      default:
        return <User className="w-4 h-4 text-slate-400" />;
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.username?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <Layout>
      <Header title="User Management">
        <Button
          onClick={() => { setEditingUser(null); setIsDialogOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="create-user-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </Header>

      <div className="p-6" data-testid="users-page">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 form-input"
                  data-testid="search-users"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]" data-testid="filter-role">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roleOptions.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Users Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No users found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className={`bg-white rounded-lg border ${user.is_active ? 'border-slate-200' : 'border-rose-200 bg-rose-50/50'} p-6 hover:shadow-md transition-shadow duration-200`}
                data-testid={`user-card-${user.id}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${user.is_active ? 'bg-blue-600' : 'bg-slate-400'} rounded-full flex items-center justify-center`}>
                      <span className="text-white font-bold text-lg">
                        {user.full_name?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">{user.full_name}</h3>
                      <p className="text-sm text-slate-500">@{user.username}</p>
                    </div>
                  </div>
                  {!user.is_active && (
                    <UserX className="w-5 h-5 text-rose-500" />
                  )}
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <p className="text-slate-600">{user.email}</p>
                  {user.phone && <p className="text-slate-600">{user.phone}</p>}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    {getRoleIcon(user.role)}
                    <span className={`text-sm font-medium ${
                      user.role === 'superadmin' ? 'text-rose-600' :
                      user.role === 'admin' ? 'text-blue-600' : 'text-slate-600'
                    }`}>
                      {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setEditingUser(user); setIsDialogOpen(true); }}
                      data-testid={`edit-user-${user.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(user.id, user.username)}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      data-testid={`delete-user-${user.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Edit User' : 'Create New User'}</DialogTitle>
            </DialogHeader>
            <UserForm
              user={editingUser}
              onSubmit={editingUser ? handleUpdate : handleCreate}
              onCancel={() => { setIsDialogOpen(false); setEditingUser(null); }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Users;
