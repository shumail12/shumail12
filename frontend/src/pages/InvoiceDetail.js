import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Header } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Save, Printer, Truck, FileText, PenLine, CheckCircle, User, Package, MapPin, CreditCard, Shield, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

const PAYMENT_METHODS = ['Zelle', 'COD', 'CashApp', 'Venmo', 'ACH', 'Card', 'Check', 'Wire Transfer'];

const SignaturePad = ({ onSave, existingSignature }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = 120;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    if (existingSignature) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = existingSignature;
    }
  }, [existingSignature]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if (e.touches) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const startDraw = (e) => { e.preventDefault(); const ctx = canvasRef.current.getContext('2d'); const pos = getPos(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); setIsDrawing(true); };
  const draw = (e) => { if (!isDrawing) return; e.preventDefault(); const ctx = canvasRef.current.getContext('2d'); const pos = getPos(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); };
  const endDraw = () => { if (isDrawing) { setIsDrawing(false); onSave(canvasRef.current.toDataURL('image/png')); } };
  const clear = () => { const canvas = canvasRef.current; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); onSave(null); };

  return (
    <div>
      <canvas ref={canvasRef} className="w-full border-2 border-dashed border-slate-300 rounded-lg cursor-crosshair bg-white"
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
      <button type="button" onClick={clear} className="text-xs text-slate-500 hover:text-red-500 mt-1">Clear Signature</button>
    </div>
  );
};

const SectionTitle = ({ icon: Icon, title, color = 'blue' }) => (
  <div className="flex items-center gap-3 mb-4 pb-2 border-b border-slate-200">
    <div className={`w-8 h-8 rounded-lg bg-${color}-50 flex items-center justify-center`}>
      <Icon className={`w-4 h-4 text-${color}-600`} />
    </div>
    <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wide">{title}</h3>
  </div>
);

const Field = ({ label, value, onChange, type = 'text', disabled = false, className = '', placeholder = '' }) => (
  <div className={className}>
    <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</Label>
    <Input type={type} value={value || ''} onChange={onChange} disabled={disabled}
      className="mt-1 h-9 text-sm border-slate-200 focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-700"
      placeholder={placeholder} />
  </div>
);

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  const canEdit = user?.role === 'superadmin' || user?.role === 'admin';
  const isCustomer = (form.invoice_type || 'customer') === 'customer';
  const isSigned = form.status === 'signed';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/invoices/${id}`);
        setInvoice(res.data);
        setForm(res.data);
      } catch { toast.error('Failed to load invoice'); navigate('/invoices'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [id, navigate]);

  const handleSave = async () => {
    if (!canEdit) return toast.error('Only admin/superadmin can edit');
    setSaving(true);
    try {
      const res = await api.put(`/invoices/${id}`, form);
      setInvoice(res.data);
      setForm(res.data);
      toast.success('Invoice saved successfully');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handlePrint = () => window.print();

  const updateField = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const updateNumField = (field) => (e) => setForm(f => ({ ...f, [field]: parseFloat(e.target.value) || 0 }));

  if (loading) return <Layout><div className="flex items-center justify-center h-[80vh]"><div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" /></div></Layout>;

  const vehicle = [form.vehicle_year, form.vehicle_make, form.vehicle_model].filter(Boolean).join(' ');
  const route = `${form.pickup_city || ''}, ${form.pickup_state || ''} \u2192 ${form.delivery_city || ''}, ${form.delivery_state || ''}`;

  return (
    <Layout>
      <Header title={`${isCustomer ? 'Customer' : 'Carrier'} Invoice`}>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/invoices')} data-testid="back-btn"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
          <Button variant="outline" onClick={handlePrint} data-testid="print-invoice-btn"><Printer className="w-4 h-4 mr-2" />Print</Button>
          {canEdit && !isSigned && (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave} disabled={saving} data-testid="save-invoice-btn">
              <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save'}
            </Button>
          )}
        </div>
      </Header>

      <div className="p-6 max-w-4xl mx-auto print:p-0 print:max-w-none" data-testid="invoice-detail-page">
        {/* Status Banner */}
        {isSigned && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 flex items-center gap-2" data-testid="signed-banner">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-800">Signed by {form.signer_name} on {form.signed_at ? new Date(form.signed_at).toLocaleDateString() : ''}</span>
          </div>
        )}

        {/* Professional Invoice Document */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:border-0">

          {/* Header */}
          <div className={`${isCustomer ? 'bg-gradient-to-r from-blue-700 to-blue-900' : 'bg-gradient-to-r from-slate-800 to-slate-900'} p-6 print:p-8`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Truck className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Breamway Auto Transport</h1>
                  <p className="text-blue-200 text-sm">Shumail Technologies LLC</p>
                  <p className="text-blue-300/70 text-xs mt-1">USDOT# 4246498 | MC# 1622825</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  form.status === 'signed' ? 'bg-emerald-500/20 text-emerald-200' :
                  form.status === 'paid' ? 'bg-green-500/20 text-green-200' :
                  'bg-amber-500/20 text-amber-200'
                }`}>{form.status || 'draft'}</div>
                <p className="text-white font-mono text-lg mt-2">{form.invoice_number}</p>
                <p className="text-blue-200 text-xs">{form.order_number && `Order: ${form.order_number}`}</p>
              </div>
            </div>
          </div>

          {/* Document Type Title */}
          <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 print:bg-white">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                {isCustomer ? 'Customer Transport Agreement & Invoice' : 'Carrier Dispatch Agreement & Invoice'}
              </h2>
              <p className="text-xs text-slate-500">Date: {invoice?.created_at ? new Date(invoice.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Customer Section */}
            {isCustomer ? (
              <div>
                <SectionTitle icon={User} title="Customer Information" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Field label="Full Name" value={form.customer_name} onChange={updateField('customer_name')} disabled={!canEdit || isSigned} className="col-span-2" />
                  <Field label="Email" value={form.customer_email} onChange={updateField('customer_email')} disabled={!canEdit || isSigned} />
                  <Field label="Phone" value={form.customer_phone} onChange={updateField('customer_phone')} disabled={!canEdit || isSigned} />
                  <Field label="Address" value={form.customer_address} onChange={updateField('customer_address')} disabled={!canEdit || isSigned} className="col-span-4" />
                </div>
              </div>
            ) : (
              <div>
                <SectionTitle icon={Shield} title="Carrier Information" color="slate" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Field label="Carrier Name" value={form.carrier_name} onChange={updateField('carrier_name')} disabled={!canEdit || isSigned} className="col-span-2" />
                  <Field label="MC Number" value={form.carrier_mc} onChange={updateField('carrier_mc')} disabled={!canEdit || isSigned} />
                  <Field label="Carrier Phone" value={form.carrier_phone} onChange={updateField('carrier_phone')} disabled={!canEdit || isSigned} />
                  <Field label="Carrier Email" value={form.carrier_email} onChange={updateField('carrier_email')} disabled={!canEdit || isSigned} className="col-span-2" />
                  <Field label="Driver Name" value={form.driver_name} onChange={updateField('driver_name')} disabled={!canEdit || isSigned} />
                  <Field label="Driver Phone" value={form.driver_phone} onChange={updateField('driver_phone')} disabled={!canEdit || isSigned} />
                </div>
                {/* Also show customer for carrier reference */}
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Customer Reference</p>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div><span className="text-slate-400 text-xs">Name:</span> <span className="font-medium">{form.customer_name || '-'}</span></div>
                    <div><span className="text-slate-400 text-xs">Phone:</span> <span className="font-medium">{form.customer_phone || '-'}</span></div>
                    <div><span className="text-slate-400 text-xs">Email:</span> <span className="font-medium">{form.customer_email || '-'}</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* Vehicle Section */}
            <div>
              <SectionTitle icon={Package} title="Vehicle Information" color="indigo" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Year" value={form.vehicle_year} onChange={updateField('vehicle_year')} disabled={!canEdit || isSigned} />
                <Field label="Make" value={form.vehicle_make} onChange={updateField('vehicle_make')} disabled={!canEdit || isSigned} />
                <Field label="Model" value={form.vehicle_model} onChange={updateField('vehicle_model')} disabled={!canEdit || isSigned} />
                <Field label="Type" value={form.vehicle_type} onChange={updateField('vehicle_type')} disabled={!canEdit || isSigned} placeholder="Sedan, SUV, Truck..." />
                <Field label="VIN" value={form.vehicle_vin} onChange={updateField('vehicle_vin')} disabled={!canEdit || isSigned} className="col-span-2" placeholder="Vehicle Identification Number" />
                <Field label="Color" value={form.vehicle_color} onChange={updateField('vehicle_color')} disabled={!canEdit || isSigned} />
                <div>
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Condition</Label>
                  <Select value={form.vehicle_condition || 'running'} onValueChange={v => setForm(f => ({ ...f, vehicle_condition: v }))} disabled={!canEdit || isSigned}>
                    <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="running">Running</SelectItem>
                      <SelectItem value="not_running">Not Running</SelectItem>
                      <SelectItem value="inoperable">Inoperable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Route Section */}
            <div>
              <SectionTitle icon={MapPin} title="Route Information" color="emerald" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pickup */}
                <div className="p-4 border border-blue-100 rounded-lg bg-blue-50/30">
                  <p className="text-xs font-bold text-blue-700 uppercase mb-3">Pickup Location</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="City" value={form.pickup_city} onChange={updateField('pickup_city')} disabled={!canEdit || isSigned} />
                    <Field label="State" value={form.pickup_state} onChange={updateField('pickup_state')} disabled={!canEdit || isSigned} />
                    <Field label="Zip Code" value={form.pickup_zip} onChange={updateField('pickup_zip')} disabled={!canEdit || isSigned} />
                    <Field label="Date" value={form.pickup_date} onChange={updateField('pickup_date')} type="date" disabled={!canEdit || isSigned} />
                    <Field label="Address" value={form.pickup_address} onChange={updateField('pickup_address')} disabled={!canEdit || isSigned} className="col-span-2" />
                    <Field label="Contact Name" value={form.pickup_contact} onChange={updateField('pickup_contact')} disabled={!canEdit || isSigned} />
                    <Field label="Contact Phone" value={form.pickup_phone} onChange={updateField('pickup_phone')} disabled={!canEdit || isSigned} />
                  </div>
                </div>
                {/* Delivery */}
                <div className="p-4 border border-emerald-100 rounded-lg bg-emerald-50/30">
                  <p className="text-xs font-bold text-emerald-700 uppercase mb-3">Delivery Location</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="City" value={form.delivery_city} onChange={updateField('delivery_city')} disabled={!canEdit || isSigned} />
                    <Field label="State" value={form.delivery_state} onChange={updateField('delivery_state')} disabled={!canEdit || isSigned} />
                    <Field label="Zip Code" value={form.delivery_zip} onChange={updateField('delivery_zip')} disabled={!canEdit || isSigned} />
                    <Field label="Date" value={form.delivery_date} onChange={updateField('delivery_date')} type="date" disabled={!canEdit || isSigned} />
                    <Field label="Address" value={form.delivery_address} onChange={updateField('delivery_address')} disabled={!canEdit || isSigned} className="col-span-2" />
                    <Field label="Contact Name" value={form.delivery_contact} onChange={updateField('delivery_contact')} disabled={!canEdit || isSigned} />
                    <Field label="Contact Phone" value={form.delivery_phone} onChange={updateField('delivery_phone')} disabled={!canEdit || isSigned} />
                  </div>
                </div>
              </div>
              {/* Route Summary */}
              <div className="mt-3 p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{route}</span>
                {form.estimated_distance > 0 && <span className="text-xs text-slate-500 font-mono">{Math.round(form.estimated_distance)} miles est.</span>}
              </div>
            </div>

            {/* Pricing Section */}
            <div>
              <SectionTitle icon={CreditCard} title={isCustomer ? 'Pricing & Payment' : 'Carrier Pay & COD'} color="amber" />
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {isCustomer ? (
                    <>
                      <div>
                        <Label className="text-xs text-slate-500 uppercase">Deposit</Label>
                        <Input type="number" step="0.01" value={form.deposit_amount || 0} onChange={updateNumField('deposit_amount')}
                          disabled={!canEdit || isSigned} className="mt-1 h-10 text-lg font-bold text-blue-700 font-mono" data-testid="input-deposit" />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500 uppercase">COD (Balance Due)</Label>
                        <Input type="number" step="0.01" value={form.cod_amount || 0} onChange={updateNumField('cod_amount')}
                          disabled={!canEdit || isSigned} className="mt-1 h-10 text-lg font-bold text-amber-700 font-mono" data-testid="input-cod" />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500 uppercase">Total Price</Label>
                        <div className="mt-1 h-10 px-3 flex items-center bg-emerald-50 rounded-md border border-emerald-200">
                          <span className="text-lg font-bold text-emerald-700 font-mono" data-testid="total-price">${(form.total_price || 0).toLocaleString()}</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500 uppercase">Payment Method</Label>
                        <Select value={form.payment_method || ''} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))} disabled={!canEdit || isSigned}>
                          <SelectTrigger className="mt-1 h-10" data-testid="select-payment"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label className="text-xs text-slate-500 uppercase">Carrier Pay</Label>
                        <Input type="number" step="0.01" value={form.carrier_pay || 0} onChange={updateNumField('carrier_pay')}
                          disabled={!canEdit || isSigned} className="mt-1 h-10 text-lg font-bold text-blue-700 font-mono" data-testid="input-carrier-pay" />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500 uppercase">COD to Collect</Label>
                        <Input type="number" step="0.01" value={form.cod_amount || 0} onChange={updateNumField('cod_amount')}
                          disabled={!canEdit || isSigned} className="mt-1 h-10 text-lg font-bold text-amber-700 font-mono" />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500 uppercase">Shipping Type</Label>
                        <Select value={form.shipping_type || 'standard'} onValueChange={v => setForm(f => ({ ...f, shipping_type: v }))} disabled={!canEdit || isSigned}>
                          <SelectTrigger className="mt-1 h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard Open</SelectItem>
                            <SelectItem value="expedited">Expedited</SelectItem>
                            <SelectItem value="enclosed">Enclosed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500 uppercase">Payment Method</Label>
                        <Select value={form.payment_method || ''} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))} disabled={!canEdit || isSigned}>
                          <SelectTrigger className="mt-1 h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div>
              <SectionTitle icon={FileText} title="Terms & Conditions" color="violet" />
              <Textarea value={form.terms || ''} onChange={(e) => setForm(f => ({ ...f, terms: e.target.value }))}
                disabled={!canEdit || isSigned} rows={12}
                className="text-xs leading-relaxed font-mono whitespace-pre-wrap bg-slate-50 border-slate-200" data-testid="terms-textarea" />
            </div>

            {/* Special Conditions */}
            <div>
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Special Conditions / Notes</Label>
              <Textarea value={form.special_conditions || ''} onChange={(e) => setForm(f => ({ ...f, special_conditions: e.target.value }))}
                disabled={!canEdit || isSigned} rows={3} placeholder="Enter any special conditions or instructions..."
                className="mt-1 text-sm bg-slate-50" data-testid="special-conditions" />
            </div>

            {/* Signature Section */}
            <div className="border-t-2 border-slate-300 pt-6">
              <div className="flex items-center gap-3 mb-4">
                <PenLine className="w-5 h-5 text-slate-600" />
                <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wide">
                  {isCustomer ? 'Customer Signature' : 'Carrier / Driver Signature'}
                </h3>
              </div>
              {isSigned && form.signature_data ? (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <img src={form.signature_data} alt="Signature" className="h-24 mx-auto" data-testid="signature-image" />
                  <div className="text-center mt-2 border-t border-slate-300 pt-2">
                    <p className="font-medium text-slate-900">{form.signer_name}</p>
                    <p className="text-xs text-slate-500">Signed on {form.signed_at ? new Date(form.signed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Field label="Signer Name" value={form.signer_name || ''} onChange={updateField('signer_name')}
                    disabled={isSigned} placeholder={isCustomer ? "Customer's full name" : "Driver / Carrier representative name"} />
                  <div>
                    <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Signature</Label>
                    <SignaturePad
                      existingSignature={form.signature_data}
                      onSave={(data) => setForm(f => ({ ...f, signature_data: data }))}
                    />
                  </div>
                  {canEdit && form.signer_name && form.signature_data && (
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave} data-testid="sign-save-btn">
                      <CheckCircle className="w-4 h-4 mr-2" />Save & Sign
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 pt-4 mt-6 text-center print:mt-8">
              <p className="text-xs text-slate-400">Breamway Auto Transport | Shumail Technologies LLC | www.breamway.com</p>
              <p className="text-xs text-slate-400">USDOT# 4246498 | MC# 1622825</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          nav, header, [data-testid="sidebar"], button, .print\\:hidden { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:max-w-none { max-width: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-0 { border: none !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:p-8 { padding: 2rem !important; }
          main { margin-left: 0 !important; }
        }
      `}</style>
    </Layout>
  );
};

export default InvoiceDetail;
