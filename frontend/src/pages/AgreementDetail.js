import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Header } from '../components/Layout';
import {
  getAgreement, createAgreement, updateAgreement,
  sendAgreement, signAgreement, getOrders,
} from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  ArrowLeft, Save, Send, PenLine, Printer, Copy,
  CheckCircle, FileText, Ban, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

const SignaturePad = ({ onSave, existingSignature }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = 150;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (existingSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasSignature(true);
      };
      img.src = existingSignature;
    }
  }, [existingSignature]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if (e.touches) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const save = () => {
    if (!hasSignature) {
      toast.error('Please draw your signature first');
      return;
    }
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="space-y-3" data-testid="signature-pad">
      <div className="border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair"
          style={{ touchAction: 'none' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
          data-testid="signature-canvas"
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">Draw your signature above</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={clear} data-testid="clear-signature">Clear</Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={save} data-testid="save-signature">
            <PenLine className="w-3.5 h-3.5 mr-1" />Apply Signature
          </Button>
        </div>
      </div>
    </div>
  );
};

const AgreementDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const [agreement, setAgreement] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState([]);
  const [signerName, setSignerName] = useState('');
  const [showSignPad, setShowSignPad] = useState(false);
  const [formData, setFormData] = useState({
    order_id: '',
    agreement_type: 'transport',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    vehicle_info: '',
    pickup_location: '',
    delivery_location: '',
    price: 0,
    deposit: 0,
    terms: '',
    special_conditions: '',
  });

  const fetchAgreement = useCallback(async () => {
    try {
      const res = await getAgreement(id);
      setAgreement(res.data);
      setFormData({
        order_id: res.data.order_id || '',
        agreement_type: res.data.agreement_type || 'transport',
        customer_name: res.data.customer_name || '',
        customer_email: res.data.customer_email || '',
        customer_phone: res.data.customer_phone || '',
        vehicle_info: res.data.vehicle_info || '',
        pickup_location: res.data.pickup_location || '',
        delivery_location: res.data.delivery_location || '',
        price: res.data.price || 0,
        deposit: res.data.deposit || 0,
        terms: res.data.terms || '',
        special_conditions: res.data.special_conditions || '',
      });
    } catch {
      toast.error('Agreement not found');
      navigate('/agreements');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await getOrders({ limit: 200 });
      setOrders(res.data.orders || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!isNew) fetchAgreement();
    fetchOrders();
  }, [isNew, fetchAgreement, fetchOrders]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.order_id) {
      toast.error('Please select an order');
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const res = await createAgreement(formData);
        toast.success('Agreement created!');
        navigate(`/agreements/${res.data.id}`);
      } else {
        await updateAgreement(id, formData);
        toast.success('Agreement updated!');
        fetchAgreement();
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    try {
      await sendAgreement(id);
      toast.success('Agreement marked as sent!');
      fetchAgreement();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send');
    }
  };

  const handleSign = async (signatureData) => {
    if (!signerName.trim()) {
      toast.error('Please enter the signer name');
      return;
    }
    try {
      await signAgreement(id, { signer_name: signerName, signature_data: signatureData });
      toast.success('Agreement signed!');
      setShowSignPad(false);
      fetchAgreement();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to sign');
    }
  };

  const copySigningLink = () => {
    const url = `${window.location.origin}/agreements/sign/${id}`;
    navigator.clipboard.writeText(url);
    toast.success('Signing link copied!');
  };

  const handlePrint = () => {
    window.print();
  };

  const isSigned = agreement?.status === 'signed';
  const isVoid = agreement?.status === 'void';
  const isEditable = !isSigned && !isVoid && (isNew || agreement?.status === 'draft');

  if (loading) {
    return (
      <Layout>
        <Header title="Agreement" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header title={isNew ? 'New Agreement' : `Agreement ${agreement?.agreement_number || ''}`}>
        <Button variant="outline" onClick={() => navigate('/agreements')}>
          <ArrowLeft className="w-4 h-4 mr-2" />Back
        </Button>
      </Header>
      <div className="p-6" data-testid="agreement-detail-page">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Status Banner */}
          {agreement && (
            <div className={`rounded-lg p-4 flex items-center justify-between ${
              isSigned ? 'bg-emerald-50 border border-emerald-200' :
              isVoid ? 'bg-rose-50 border border-rose-200' :
              agreement.status === 'sent' ? 'bg-blue-50 border border-blue-200' :
              'bg-slate-50 border border-slate-200'
            }`} data-testid="agreement-status-banner">
              <div className="flex items-center gap-3">
                {isSigned ? <CheckCircle className="w-5 h-5 text-emerald-600" /> :
                 isVoid ? <Ban className="w-5 h-5 text-rose-600" /> :
                 <FileText className="w-5 h-5 text-slate-600" />}
                <div>
                  <p className="font-medium text-sm">
                    {isSigned ? `Signed by ${agreement.signer_name} on ${new Date(agreement.signed_at).toLocaleDateString()}` :
                     isVoid ? 'This agreement has been voided' :
                     agreement.status === 'sent' ? 'Awaiting customer signature' :
                     'Draft - Not yet sent'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {!isSigned && !isVoid && !isNew && (
                  <>
                    <Button variant="outline" size="sm" onClick={copySigningLink} data-testid="copy-signing-link">
                      <Copy className="w-3.5 h-3.5 mr-1" />Copy Signing Link
                    </Button>
                    {agreement.status === 'draft' && (
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSend} data-testid="send-agreement-btn">
                        <Send className="w-3.5 h-3.5 mr-1" />Mark as Sent
                      </Button>
                    )}
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowSignPad(!showSignPad)} data-testid="sign-agreement-btn">
                      <PenLine className="w-3.5 h-3.5 mr-1" />Sign
                    </Button>
                  </>
                )}
                {!isNew && (
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="w-3.5 h-3.5 mr-1" />Print
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Signature Pad */}
          {showSignPad && (
            <div className="bg-white rounded-lg border border-slate-200 p-6" data-testid="sign-section">
              <h3 className="font-heading font-semibold text-slate-900 mb-4">Digital Signature</h3>
              <div className="mb-4">
                <Label className="form-label">Signer Full Name</Label>
                <Input
                  value={signerName}
                  onChange={e => setSignerName(e.target.value)}
                  placeholder="Enter full legal name"
                  data-testid="signer-name-input"
                />
              </div>
              <SignaturePad onSave={handleSign} existingSignature={agreement?.signature_data} />
            </div>
          )}

          {/* Signed Signature Display */}
          {isSigned && agreement?.signature_data && (
            <div className="bg-white rounded-lg border border-emerald-200 p-6" data-testid="signed-signature-display">
              <h3 className="font-heading font-semibold text-slate-900 mb-3">Customer Signature</h3>
              <div className="border border-slate-200 rounded-lg p-2 bg-white inline-block">
                <img src={agreement.signature_data} alt="Signature" className="h-24" data-testid="signature-image" />
              </div>
              <p className="text-sm text-slate-600 mt-2">
                Signed by <strong>{agreement.signer_name}</strong> on {new Date(agreement.signed_at).toLocaleString()}
              </p>
            </div>
          )}

          {/* Form */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="font-heading font-semibold text-slate-900 mb-6">Agreement Details</h3>

            {/* Order Selection */}
            {isNew && (
              <div className="mb-6">
                <Label className="form-label">Select Order *</Label>
                <select
                  className="form-input"
                  value={formData.order_id}
                  onChange={e => handleChange('order_id', e.target.value)}
                  data-testid="order-select"
                >
                  <option value="">Select an order...</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.order_number} - {o.customer_name} ({o.vehicle_year} {o.vehicle_make} {o.vehicle_model})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="form-label">Customer Name</Label>
                <Input value={formData.customer_name} onChange={e => handleChange('customer_name', e.target.value)}
                  disabled={!isEditable} className="form-input" data-testid="agreement-customer-name" />
              </div>
              <div>
                <Label className="form-label">Customer Email</Label>
                <Input value={formData.customer_email} onChange={e => handleChange('customer_email', e.target.value)}
                  disabled={!isEditable} className="form-input" data-testid="agreement-customer-email" />
              </div>
              <div>
                <Label className="form-label">Customer Phone</Label>
                <Input value={formData.customer_phone} onChange={e => handleChange('customer_phone', e.target.value)}
                  disabled={!isEditable} className="form-input" data-testid="agreement-customer-phone" />
              </div>
              <div>
                <Label className="form-label">Agreement Type</Label>
                <select className="form-input" value={formData.agreement_type}
                  onChange={e => handleChange('agreement_type', e.target.value)} disabled={!isEditable} data-testid="agreement-type">
                  <option value="transport">Transport Agreement</option>
                  <option value="broker">Broker Agreement</option>
                  <option value="carrier">Carrier Agreement</option>
                </select>
              </div>
              <div>
                <Label className="form-label">Vehicle Info</Label>
                <Input value={formData.vehicle_info} onChange={e => handleChange('vehicle_info', e.target.value)}
                  disabled={!isEditable} className="form-input" data-testid="agreement-vehicle-info" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="form-label">Price ($)</Label>
                  <Input type="number" value={formData.price} onChange={e => handleChange('price', parseFloat(e.target.value) || 0)}
                    disabled={!isEditable} className="form-input" data-testid="agreement-price" />
                </div>
                <div>
                  <Label className="form-label">Deposit ($)</Label>
                  <Input type="number" value={formData.deposit} onChange={e => handleChange('deposit', parseFloat(e.target.value) || 0)}
                    disabled={!isEditable} className="form-input" data-testid="agreement-deposit" />
                </div>
              </div>
              <div>
                <Label className="form-label">Pickup Location</Label>
                <Input value={formData.pickup_location} onChange={e => handleChange('pickup_location', e.target.value)}
                  disabled={!isEditable} className="form-input" data-testid="agreement-pickup" />
              </div>
              <div>
                <Label className="form-label">Delivery Location</Label>
                <Input value={formData.delivery_location} onChange={e => handleChange('delivery_location', e.target.value)}
                  disabled={!isEditable} className="form-input" data-testid="agreement-delivery" />
              </div>
            </div>

            <div className="mt-6">
              <Label className="form-label">Special Conditions</Label>
              <Textarea value={formData.special_conditions} onChange={e => handleChange('special_conditions', e.target.value)}
                disabled={!isEditable} rows={3} placeholder="Any special conditions or notes..."
                data-testid="agreement-special-conditions" />
            </div>
          </div>

          {/* Terms */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="font-heading font-semibold text-slate-900 mb-4">Terms & Conditions</h3>
            {isEditable ? (
              <Textarea value={formData.terms} onChange={e => handleChange('terms', e.target.value)}
                rows={15} className="font-mono text-xs" data-testid="agreement-terms" />
            ) : (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-slate-700 text-sm" data-testid="agreement-terms-display">
                {agreement?.terms || formData.terms}
              </div>
            )}
          </div>

          {/* Save */}
          {isEditable && (
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => navigate('/agreements')}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave} disabled={saving} data-testid="save-agreement-btn">
                <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : isNew ? 'Create Agreement' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AgreementDetail;
