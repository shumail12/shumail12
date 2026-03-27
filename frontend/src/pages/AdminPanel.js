import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Header } from '../components/Layout';
import {
  getVendorApiKey, regenerateVendorApiKey, getApiLogs,
  getLeadSources, getDistributionRules, upsertDistributionRule,
  deleteDistributionRule, getUsers, getQuotesAgents,
  getLeadEmail, regenerateLeadEmail,
  getEmailConfig, updateEmailConfig, getEmailTemplates,
  updateEmailTemplate, previewEmailTemplate, testSendEmailTemplate, getEmailLogs,
} from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Key, RefreshCw, Copy, Shield, BarChart3, Network,
  Trash2, Plus, AlertTriangle, CheckCircle, ExternalLink, Mail,
  Send, Eye, FileEdit, Save,
} from 'lucide-react';
import { toast } from 'sonner';

// ==================== EMAIL SETTINGS PANEL ====================
const EmailSettingsPanel = () => {
  const [emailConfig, setEmailConfig] = useState({ sender_email: '', sender_name: '', company_name: '', company_address: '', company_phone: '' });
  const [templates, setTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [emailLogs, setEmailLogs] = useState([]);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await getEmailConfig();
      setEmailConfig(res.data);
    } catch { /* ignore */ }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await getEmailTemplates();
      setTemplates(res.data);
    } catch { /* ignore */ }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await getEmailLogs(30);
      setEmailLogs(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchConfig(); fetchTemplates(); fetchLogs(); }, [fetchConfig, fetchTemplates, fetchLogs]);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await updateEmailConfig(emailConfig);
      toast.success('Email configuration saved');
    } catch { toast.error('Failed to save config'); }
    finally { setSaving(false); }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    setSaving(true);
    try {
      await updateEmailTemplate(editingTemplate.id, {
        subject: editingTemplate.subject,
        html: editingTemplate.html,
        name: editingTemplate.name,
        description: editingTemplate.description,
      });
      toast.success('Template saved');
      fetchTemplates();
    } catch { toast.error('Failed to save template'); }
    finally { setSaving(false); }
  };

  const handlePreview = async (tplId) => {
    try {
      const res = await previewEmailTemplate(tplId);
      setPreviewHtml(res.data.html);
      setShowPreview(true);
    } catch { toast.error('Failed to generate preview'); }
  };

  const handleTestSend = async (tplId) => {
    if (!testEmail) { toast.error('Enter a test email address'); return; }
    try {
      await testSendEmailTemplate(tplId, testEmail);
      toast.success(`Test email sent to ${testEmail}`);
      fetchLogs();
    } catch { toast.error('Failed to send test email'); }
  };

  return (
    <div className="space-y-6">
      {/* Sender Configuration */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-1">
          <Mail className="w-5 h-5 text-blue-600" />
          <h2 className="font-heading font-semibold text-slate-900 text-lg">Sender Configuration</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">Configure the sender details for all outgoing CRM emails.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Sender Email</Label>
            <Input value={emailConfig.sender_email || ''} onChange={e => setEmailConfig({...emailConfig, sender_email: e.target.value})}
              placeholder="info@breamway.com" className="mt-1" data-testid="sender-email-input" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Sender Name</Label>
            <Input value={emailConfig.sender_name || ''} onChange={e => setEmailConfig({...emailConfig, sender_name: e.target.value})}
              placeholder="Breamway Auto Transport" className="mt-1" data-testid="sender-name-input" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Company Name</Label>
            <Input value={emailConfig.company_name || ''} onChange={e => setEmailConfig({...emailConfig, company_name: e.target.value})}
              placeholder="Breamway Auto Transport" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Company Phone</Label>
            <Input value={emailConfig.company_phone || ''} onChange={e => setEmailConfig({...emailConfig, company_phone: e.target.value})}
              placeholder="+1 (555) 000-0000" className="mt-1" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs font-medium text-slate-600">Company Address</Label>
            <Input value={emailConfig.company_address || ''} onChange={e => setEmailConfig({...emailConfig, company_address: e.target.value})}
              placeholder="277 Osgood Avenue, Houston, TX" className="mt-1" />
          </div>
        </div>
        <Button onClick={handleSaveConfig} disabled={saving} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white" data-testid="save-email-config-btn">
          <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>

      {/* Email Templates */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-1">
          <FileEdit className="w-5 h-5 text-emerald-600" />
          <h2 className="font-heading font-semibold text-slate-900 text-lg">Email Templates</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">Edit the HTML templates used for customer emails. Use {'{{placeholders}}'} for dynamic data.</p>

        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 mb-4">
          <p className="text-xs font-semibold text-slate-700 mb-2">Available Placeholders:</p>
          <div className="flex flex-wrap gap-1.5">
            {['customer_name','quote_number','vehicle','pickup_address','delivery_address','pickup_date','distance','price_standard','price_expedited','price_enclosed','deposit','carrier_fee','price','company_name','company_address','company_phone','sender_email'].map(p => (
              <code key={p} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-mono">{`{{${p}}}`}</code>
            ))}
          </div>
        </div>

        {templates.map(tpl => (
          <div key={tpl.id} className="border border-slate-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">{tpl.name}</h3>
                <p className="text-xs text-slate-500">{tpl.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handlePreview(tpl.id)} data-testid={`preview-tpl-${tpl.id}`}>
                  <Eye className="w-3.5 h-3.5 mr-1" />Preview
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditingTemplate({...tpl})} data-testid={`edit-tpl-${tpl.id}`}>
                  <FileEdit className="w-3.5 h-3.5 mr-1" />Edit
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="Enter email to send test..." className="flex-1 text-sm" data-testid={`test-email-${tpl.id}`} />
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleTestSend(tpl.id)} data-testid={`send-test-${tpl.id}`}>
                <Send className="w-3.5 h-3.5 mr-1" />Send Test
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Email Logs */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-slate-600" />
          <h2 className="font-heading font-semibold text-slate-900 text-lg">Email Delivery Logs</h2>
        </div>
        {emailLogs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No emails sent yet</p>
        ) : (
          <ScrollArea className="h-64">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-3 py-2 text-xs font-semibold text-slate-500">Time</th>
                  <th className="px-3 py-2 text-xs font-semibold text-slate-500">To</th>
                  <th className="px-3 py-2 text-xs font-semibold text-slate-500">Subject</th>
                  <th className="px-3 py-2 text-xs font-semibold text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {emailLogs.map((log, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-xs text-slate-500">{new Date(log.sent_at).toLocaleString()}</td>
                    <td className="px-3 py-2 text-xs text-slate-700">{log.to}</td>
                    <td className="px-3 py-2 text-xs text-slate-700 max-w-[200px] truncate">{log.subject}</td>
                    <td className="px-3 py-2">
                      {log.status === 202 || log.status === 200 ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs font-medium">Sent</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs font-medium">{log.error || log.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        )}
      </div>

      {/* Template Editor Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => { if (!open) setEditingTemplate(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="template-editor-dialog">
          <DialogHeader>
            <DialogTitle>Edit Email Template: {editingTemplate?.name}</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs font-medium text-slate-600">Template Name</Label>
                <Input value={editingTemplate.name} onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-600">Email Subject Line</Label>
                <Input value={editingTemplate.subject} onChange={e => setEditingTemplate({...editingTemplate, subject: e.target.value})} className="mt-1"
                  placeholder="Your Vehicle Transport Quote — {{quote_number}}" data-testid="tpl-subject-input" />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-600">HTML Template Body</Label>
                <textarea value={editingTemplate.html} onChange={e => setEditingTemplate({...editingTemplate, html: e.target.value})}
                  className="w-full h-80 mt-1 p-3 border border-slate-200 rounded-lg font-mono text-xs resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="tpl-html-textarea" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSaveTemplate} disabled={saving} data-testid="save-template-btn">
              <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="template-preview-dialog">
          <DialogHeader>
            <DialogTitle>Email Template Preview</DialogTitle>
          </DialogHeader>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <iframe srcDoc={previewHtml} title="Email Preview" className="w-full h-[500px] border-0" sandbox="" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AdminPanel = () => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [apiLogs, setApiLogs] = useState([]);
  const [apiLogsTotal, setApiLogsTotal] = useState(0);
  const [leadSources, setLeadSources] = useState([]);
  const [distRules, setDistRules] = useState([]);
  const [agents, setAgents] = useState([]);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [addRuleDialog, setAddRuleDialog] = useState(false);
  const [newRule, setNewRule] = useState({ agent_name: '', source: 'default', weight: 1 });
  const [leadEmail, setLeadEmail] = useState('');
  const [regenEmailConfirm, setRegenEmailConfirm] = useState(false);

  const fetchApiKey = useCallback(async () => {
    try {
      const res = await getVendorApiKey();
      setApiKey(res.data.api_key);
    } catch { /* ignore */ }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await getApiLogs(50);
      setApiLogs(res.data.logs);
      setApiLogsTotal(res.data.total);
    } catch { /* ignore */ }
  }, []);

  const fetchSources = useCallback(async () => {
    try {
      const res = await getLeadSources();
      setLeadSources(res.data);
    } catch { /* ignore */ }
  }, []);

  const fetchRules = useCallback(async () => {
    try {
      const res = await getDistributionRules();
      setDistRules(res.data);
    } catch { /* ignore */ }
  }, []);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await getQuotesAgents();
      setAgents(res.data);
    } catch { /* ignore */ }
  }, []);

  const fetchLeadEmail = useCallback(async () => {
    try {
      const res = await getLeadEmail();
      setLeadEmail(res.data.email);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchApiKey();
    fetchLogs();
    fetchSources();
    fetchRules();
    fetchAgents();
    fetchLeadEmail();
  }, [fetchApiKey, fetchLogs, fetchSources, fetchRules, fetchAgents, fetchLeadEmail]);

  const handleRegenerate = async () => {
    try {
      const res = await regenerateVendorApiKey();
      setApiKey(res.data.api_key);
      setConfirmRegen(false);
      toast.success('API key regenerated! Update all vendor integrations with the new key.');
    } catch {
      toast.error('Failed to regenerate API key');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleAddRule = async () => {
    if (!newRule.agent_name) {
      toast.error('Please select an agent');
      return;
    }
    try {
      await upsertDistributionRule(newRule.agent_name, newRule.source, newRule.weight, true);
      toast.success('Distribution rule saved');
      setAddRuleDialog(false);
      setNewRule({ agent_name: '', source: 'default', weight: 1 });
      fetchRules();
    } catch {
      toast.error('Failed to save rule');
    }
  };

  const handleDeleteRule = async (agentName, source) => {
    try {
      await deleteDistributionRule(agentName, source);
      toast.success('Rule deleted');
      fetchRules();
    } catch {
      toast.error('Failed to delete rule');
    }
  };

  const handleRegenEmail = async () => {
    try {
      const res = await regenerateLeadEmail();
      setLeadEmail(res.data.email);
      setRegenEmailConfirm(false);
      toast.success('Lead delivery email regenerated');
    } catch {
      toast.error('Failed to regenerate email');
    }
  };

  const vendorDocsUrl = `${process.env.REACT_APP_BACKEND_URL}/api/vendor/docs`;
  const apiEndpoint = `${process.env.REACT_APP_BACKEND_URL}/api/leads/incoming`;
  const emailEndpoint = `${process.env.REACT_APP_BACKEND_URL}/api/leads/email-incoming`;
  const emailWebhookUrl = `${process.env.REACT_APP_BACKEND_URL}/api/leads/email-webhook`;

  const handleToggleRule = async (rule) => {
    try {
      await upsertDistributionRule(rule.agent_name, rule.source, rule.weight, !rule.enabled);
      toast.success(`Rule ${rule.enabled ? 'disabled' : 'enabled'}`);
      fetchRules();
    } catch {
      toast.error('Failed to update rule');
    }
  };

  const baseUrl = process.env.REACT_APP_BACKEND_URL;

  return (
    <Layout>
      <Header title="Admin Control Panel" />
      <div className="p-6" data-testid="admin-panel-page">
        <Tabs defaultValue="api-keys" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-lg" data-testid="admin-tabs">
            <TabsTrigger value="api-keys" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700" data-testid="tab-api-keys">
              <Key className="w-4 h-4 mr-2" />API Keys
            </TabsTrigger>
            <TabsTrigger value="distribution" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700" data-testid="tab-distribution">
              <Network className="w-4 h-4 mr-2" />Lead Distribution
            </TabsTrigger>
            <TabsTrigger value="sources" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700" data-testid="tab-sources">
              <BarChart3 className="w-4 h-4 mr-2" />Lead Sources
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700" data-testid="tab-logs">
              <Shield className="w-4 h-4 mr-2" />API Logs
            </TabsTrigger>
            <TabsTrigger value="email" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700" data-testid="tab-email">
              <Mail className="w-4 h-4 mr-2" />Email Settings
            </TabsTrigger>
          </TabsList>

          {/* API Keys Tab */}
          <TabsContent value="api-keys" className="space-y-6" data-testid="api-keys-content">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h2 className="font-heading font-semibold text-slate-900 text-lg mb-1">Vendor API Key</h2>
              <p className="text-sm text-slate-500 mb-6">This key is used by external lead vendors to submit leads via the API.</p>

              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 relative">
                  <Input
                    readOnly
                    value={showKey ? apiKey : '•'.repeat(Math.min(apiKey.length, 40))}
                    className="font-mono text-sm pr-20"
                    data-testid="api-key-display"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setShowKey(!showKey)} data-testid="toggle-key-visibility">
                      {showKey ? 'Hide' : 'Show'}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => copyToClipboard(apiKey)} data-testid="copy-api-key">
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setConfirmRegen(true)} data-testid="regenerate-key-btn">
                  <RefreshCw className="w-4 h-4 mr-2" />Regenerate
                </Button>
              </div>

              {/* API Endpoint Info */}
              <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                <h3 className="font-semibold text-slate-900 text-sm mb-3">API Endpoint</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-mono font-bold rounded">POST</span>
                    <code className="text-sm text-slate-700 font-mono">{baseUrl}/api/leads/incoming</code>
                    <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => copyToClipboard(`${baseUrl}/api/leads/incoming`)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="text-sm text-slate-600">
                    <p className="mb-1"><strong>Header:</strong> <code className="bg-slate-200 px-1 rounded">X-API-Key: {showKey ? apiKey : '••••••••'}</code></p>
                    <p><strong>Content-Type:</strong> <code className="bg-slate-200 px-1 rounded">application/json</code></p>
                  </div>
                  <a href={`${baseUrl}/api/leads/specs`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
                    <ExternalLink className="w-3.5 h-3.5" />View Full API Documentation
                  </a>
                </div>
              </div>
            </div>

            {/* Sample Request */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 text-sm mb-3">Sample cURL Request</h3>
              <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-emerald-400 font-mono whitespace-pre-wrap">
{`curl -X POST "${baseUrl}/api/leads/incoming" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${showKey ? apiKey : 'YOUR_API_KEY'}" \\
  -d '{
    "name": "John Doe",
    "phone": "1234567890",
    "email": "john@example.com",
    "vehicle_year": "2020",
    "vehicle_make": "Toyota",
    "vehicle_model": "Camry",
    "pickup_city": "Los Angeles",
    "pickup_state": "CA",
    "delivery_city": "Houston",
    "delivery_state": "TX",
    "source": "TOLM"
  }'`}
                </pre>
              </div>
            </div>

            {/* Lead Delivery Email */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="w-5 h-5 text-blue-600" />
                <h2 className="font-heading font-semibold text-slate-900 text-lg">Lead Delivery Email</h2>
              </div>
              <p className="text-sm text-slate-500 mb-4">Vendors can send leads to this email address in plain-text format. Leads will auto-create in your CRM.</p>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 relative">
                  <Input readOnly value={leadEmail || 'Loading...'} className="font-mono text-sm text-blue-700 bg-blue-50 border-blue-200" data-testid="lead-delivery-email" />
                  <Button variant="ghost" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2" onClick={() => copyToClipboard(leadEmail)} data-testid="copy-lead-email">
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <Button variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => setRegenEmailConfirm(true)} data-testid="regen-email-btn">
                  <RefreshCw className="w-4 h-4 mr-2" />Regenerate
                </Button>
              </div>

              {/* Email Format Template */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h3 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-3">Required Email Format (Plain Text)</h3>
                <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm text-emerald-400 font-mono whitespace-pre-wrap">{`Name: John Smith
Pickup City: Redding
Pickup State: CA
Pickup Zip: 96003
Delivery City: Orlando
Delivery State: FL
Delivery Zip: 32801
Year: 2004
Make: Ford
Model: Focus
Pickup Date: 04/30/2014
Running: true
Email: testing@emailaddress.com
Phone: 111-111-1111
Phone 2: 111-111-1111
Notes: Notes go here.
Lead Source ID#: BR000000`}</pre>
                </div>
                <p className="text-xs text-slate-500 mt-2">Leads sent as plain text (not HTML) to the email above will be auto-parsed and added to the CRM.</p>
              </div>

              {/* Email API Endpoint */}
              <div className="mt-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h3 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-2">Email Lead API Endpoint</h3>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-mono font-bold rounded">POST</span>
                  <code className="text-sm text-slate-700 font-mono">{emailEndpoint}</code>
                  <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => copyToClipboard(emailEndpoint)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Send the plain-text body as JSON: <code className="bg-slate-200 px-1 rounded">{"{"}"body": "Name: ...\nPickup City: ..."{"}"}</code></p>
              </div>

              {/* SendGrid Inbound Parse Webhook */}
              <div className="mt-4 bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                <h3 className="font-semibold text-emerald-900 text-xs uppercase tracking-wider mb-2">SendGrid Inbound Parse Webhook URL</h3>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-mono font-bold rounded">POST</span>
                  <code className="text-sm text-emerald-700 font-mono break-all">{emailWebhookUrl}</code>
                  <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => copyToClipboard(emailWebhookUrl)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-xs text-emerald-700 mt-2 font-medium">Setup Steps:</p>
                <ol className="text-xs text-slate-600 mt-1 space-y-1 list-decimal list-inside">
                  <li>Go to SendGrid Dashboard &rarr; Settings &rarr; Inbound Parse</li>
                  <li>Add this webhook URL for your domain (e.g., leads.breamway.com)</li>
                  <li>Set MX record for your domain to point to <code className="bg-slate-200 px-1 rounded">mx.sendgrid.net</code></li>
                  <li>Emails sent to any address @leads.breamway.com will auto-create leads</li>
                </ol>
              </div>
            </div>

            {/* Vendor Docs Link */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-800 text-sm">Vendor API Documentation</h3>
                <p className="text-xs text-blue-600">Share this link with your vendors for full API docs</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(vendorDocsUrl)} className="text-blue-700" data-testid="copy-vendor-docs">
                  <Copy className="w-3.5 h-3.5 mr-1" />Copy Link
                </Button>
                <a href={vendorDocsUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="text-blue-700 border-blue-300" data-testid="open-vendor-docs">
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />Open Docs
                  </Button>
                </a>
              </div>
            </div>

            {/* Regenerate Email Confirm */}
            <Dialog open={regenEmailConfirm} onOpenChange={setRegenEmailConfirm}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-amber-600">Regenerate Email Address?</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-slate-600 py-2">This will generate a new lead delivery email. The old address will stop working. Update all vendor configurations.</p>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRegenEmailConfirm(false)}>Cancel</Button>
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleRegenEmail}>Regenerate</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Lead Distribution Tab */}
          <TabsContent value="distribution" className="space-y-6" data-testid="distribution-content">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-heading font-semibold text-slate-900 text-lg mb-1">Lead Distribution Rules</h2>
                  <p className="text-sm text-slate-500">Configure how incoming vendor leads are automatically assigned to agents.</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setAddRuleDialog(true)} data-testid="add-rule-btn">
                  <Plus className="w-4 h-4 mr-2" />Add Rule
                </Button>
              </div>

              {distRules.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg">
                  <Network className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm mb-1">No distribution rules configured</p>
                  <p className="text-slate-400 text-xs">Leads will not be auto-assigned until rules are created.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="distribution-rules-table">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Agent</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Source</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Weight</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {distRules.map((rule, idx) => (
                        <tr key={idx} className="hover:bg-slate-50" data-testid={`dist-rule-${idx}`}>
                          <td className="px-4 py-3 font-medium text-slate-900">{rule.agent_name}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-mono">{rule.source}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{rule.weight}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => handleToggleRule(rule)} className="cursor-pointer" data-testid={`toggle-rule-${idx}`}>
                              {rule.enabled ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs font-medium">
                                  <CheckCircle className="w-3 h-3" />Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs font-medium">
                                  Disabled
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                              onClick={() => handleDeleteRule(rule.agent_name, rule.source)}
                              data-testid={`delete-rule-${idx}`}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Lead Sources Tab */}
          <TabsContent value="sources" className="space-y-6" data-testid="sources-content">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h2 className="font-heading font-semibold text-slate-900 text-lg mb-1">Lead Sources</h2>
              <p className="text-sm text-slate-500 mb-6">Overview of all lead sources and their volumes.</p>

              {leadSources.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg">
                  <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No lead sources tracked yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {leadSources.map((src) => (
                    <div key={src.name} className="bg-slate-50 rounded-lg p-4 border border-slate-200" data-testid={`source-${src.name}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-900 text-sm">{src.name}</span>
                        <span className="text-2xl font-heading font-bold text-blue-600">{src.count.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div className="bg-blue-600 h-1.5 rounded-full" style={{
                          width: `${Math.min(100, (src.count / Math.max(...leadSources.map(s => s.count))) * 100)}%`
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* API Logs Tab */}
          <TabsContent value="logs" className="space-y-6" data-testid="logs-content">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-heading font-semibold text-slate-900 text-lg mb-1">API Activity Logs</h2>
                  <p className="text-sm text-slate-500">Total: {apiLogsTotal.toLocaleString()} API calls</p>
                </div>
                <Button variant="outline" onClick={fetchLogs} data-testid="refresh-logs">
                  <RefreshCw className="w-4 h-4 mr-2" />Refresh
                </Button>
              </div>

              {apiLogs.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg">
                  <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No API activity recorded yet.</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <table className="w-full text-sm" data-testid="api-logs-table">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Timestamp</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Source</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Quote #</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {apiLogs.map((log, idx) => (
                        <tr key={idx} className="hover:bg-slate-50" data-testid={`log-row-${idx}`}>
                          <td className="px-4 py-2.5 text-xs text-slate-600 font-mono">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">{log.type}</span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-700">{log.source || '-'}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-blue-600">{log.quote_number || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              )}
            </div>
          </TabsContent>

          {/* Email Settings Tab */}
          <TabsContent value="email" className="space-y-6" data-testid="email-settings-content">
            <EmailSettingsPanel />
          </TabsContent>
        </Tabs>
      </div>

      {/* Regenerate API Key Confirmation */}
      <Dialog open={confirmRegen} onOpenChange={setConfirmRegen}>
        <DialogContent className="max-w-md" data-testid="regen-confirm-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />Regenerate API Key?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            This will invalidate the current API key immediately. All vendors using the old key will stop receiving leads until they update their configuration.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmRegen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleRegenerate} data-testid="confirm-regen-btn">
              Yes, Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Distribution Rule */}
      <Dialog open={addRuleDialog} onOpenChange={setAddRuleDialog}>
        <DialogContent className="max-w-md" data-testid="add-rule-dialog">
          <DialogHeader>
            <DialogTitle>Add Distribution Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="form-label">Agent Name</Label>
              <select
                className="form-input"
                value={newRule.agent_name}
                onChange={e => setNewRule({ ...newRule, agent_name: e.target.value })}
                data-testid="rule-agent-select"
              >
                <option value="">Select an agent...</option>
                {agents.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              {agents.length === 0 && (
                <div className="mt-2">
                  <Input
                    placeholder="Type agent name manually"
                    value={newRule.agent_name}
                    onChange={e => setNewRule({ ...newRule, agent_name: e.target.value })}
                    data-testid="rule-agent-input"
                  />
                </div>
              )}
            </div>
            <div>
              <Label className="form-label">Lead Source</Label>
              <select
                className="form-input"
                value={newRule.source}
                onChange={e => setNewRule({ ...newRule, source: e.target.value })}
                data-testid="rule-source-select"
              >
                <option value="default">Default (All Sources)</option>
                {leadSources.map(s => (
                  <option key={s.name} value={s.name}>{s.name} ({s.count})</option>
                ))}
                <option value="TOLM">TOLM</option>
                <option value="vendor">Vendor</option>
              </select>
            </div>
            <div>
              <Label className="form-label">Weight (Higher = More Leads)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={newRule.weight}
                onChange={e => setNewRule({ ...newRule, weight: parseInt(e.target.value) || 1 })}
                data-testid="rule-weight-input"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddRuleDialog(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAddRule} data-testid="save-rule-btn">
              Save Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AdminPanel;
