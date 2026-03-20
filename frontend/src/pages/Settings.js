import React, { useState } from 'react';
import { Layout, Header } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { User, Bell, Shield, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'sms', label: 'SMS Settings', icon: Smartphone },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <Layout>
      <Header title="Settings" />

      <div className="p-6" data-testid="settings-page">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg border border-slate-200 p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                  data-testid={`settings-tab-${tab.id}`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            {activeTab === 'profile' && (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-lg font-heading font-semibold text-slate-900 mb-6">Profile Settings</h2>
                
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-heading font-bold text-2xl">
                      {user?.full_name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-slate-900">{user?.full_name}</h3>
                    <p className="text-slate-500">{user?.email}</p>
                    <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="form-label">Full Name</Label>
                      <Input value={user?.full_name || ''} className="form-input" disabled />
                    </div>
                    <div>
                      <Label className="form-label">Username</Label>
                      <Input value={user?.username || ''} className="form-input" disabled />
                    </div>
                  </div>
                  <div>
                    <Label className="form-label">Email</Label>
                    <Input value={user?.email || ''} className="form-input" disabled />
                  </div>
                  <p className="text-sm text-slate-500">
                    Contact your administrator to update profile information.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-lg font-heading font-semibold text-slate-900 mb-6">Notification Preferences</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">New Lead Alerts</p>
                      <p className="text-sm text-slate-500">Get notified when a new lead is received</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-slate-300" />
                  </div>
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">Quote Approvals</p>
                      <p className="text-sm text-slate-500">Get notified when a quote is approved</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-slate-300" />
                  </div>
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">Order Status Updates</p>
                      <p className="text-sm text-slate-500">Get notified when order status changes</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-slate-300" />
                  </div>
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">Payment Received</p>
                      <p className="text-sm text-slate-500">Get notified when a payment is received</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-slate-300" />
                  </div>
                </div>

                <Button className="mt-6 bg-blue-600 hover:bg-blue-700" onClick={() => toast.success('Preferences saved')}>
                  Save Preferences
                </Button>
              </div>
            )}

            {activeTab === 'sms' && (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-lg font-heading font-semibold text-slate-900 mb-6">SMS Configuration</h2>
                
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <p className="text-amber-800 text-sm">
                    <strong>Note:</strong> SMS notifications require Twilio credentials. Contact your administrator to configure SMS settings.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="form-label">Twilio Account SID</Label>
                    <Input placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className="form-input font-mono" disabled />
                  </div>
                  <div>
                    <Label className="form-label">Twilio Auth Token</Label>
                    <Input type="password" placeholder="••••••••••••••••" className="form-input" disabled />
                  </div>
                  <div>
                    <Label className="form-label">Twilio Phone Number</Label>
                    <Input placeholder="+1234567890" className="form-input font-mono" disabled />
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h3 className="font-medium text-slate-900 mb-4">SMS Templates</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm font-medium text-slate-700">New Lead Received</p>
                      <p className="text-sm text-slate-500 mt-1">Thank you for contacting us! We'll reach out shortly.</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm font-medium text-slate-700">Quote Generated</p>
                      <p className="text-sm text-slate-500 mt-1">Quote [NUMBER]: $[PRICE] for transport from [PICKUP] to [DELIVERY]</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm font-medium text-slate-700">Shipment In Transit</p>
                      <p className="text-sm text-slate-500 mt-1">Order [NUMBER]: Your vehicle is now in transit!</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-lg font-heading font-semibold text-slate-900 mb-6">Security Settings</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-slate-900 mb-4">Change Password</h3>
                    <div className="space-y-4 max-w-md">
                      <div>
                        <Label className="form-label">Current Password</Label>
                        <Input type="password" className="form-input" placeholder="Enter current password" />
                      </div>
                      <div>
                        <Label className="form-label">New Password</Label>
                        <Input type="password" className="form-input" placeholder="Enter new password" />
                      </div>
                      <div>
                        <Label className="form-label">Confirm New Password</Label>
                        <Input type="password" className="form-input" placeholder="Confirm new password" />
                      </div>
                      <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => toast.info('Password change coming soon')}>
                        Update Password
                      </Button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-200">
                    <h3 className="font-medium text-slate-900 mb-4">Active Sessions</h3>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">Current Session</p>
                          <p className="text-sm text-slate-500">Web Browser • Active now</p>
                        </div>
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                          Current
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
