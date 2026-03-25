import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Truck, CheckCircle, PenLine, Ban } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const PublicSignaturePad = ({ onSave }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = 160;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if (e.touches) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
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

  const endDraw = () => setIsDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const save = () => {
    if (!hasSignature) return;
    onSave(canvasRef.current.toDataURL('image/png'));
  };

  return (
    <div className="space-y-3" data-testid="public-signature-pad">
      <div className="border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-white">
        <canvas ref={canvasRef} className="w-full cursor-crosshair" style={{ touchAction: 'none' }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
          data-testid="public-signature-canvas" />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">Draw your signature above</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={clear}>Clear</Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={save} data-testid="public-apply-signature">
            <PenLine className="w-3.5 h-3.5 mr-1" />Apply Signature
          </Button>
        </div>
      </div>
    </div>
  );
};

const PublicSign = () => {
  const { id } = useParams();
  const [agreement, setAgreement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [signed, setSigned] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAgreement = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/agreements/public/${id}`);
      setAgreement(res.data);
      if (res.data.status === 'signed') setSigned(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Agreement not found');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAgreement(); }, [fetchAgreement]);

  const handleSign = async (signatureData) => {
    if (!signerName.trim()) {
      alert('Please enter your full name');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/agreements/public/${id}/sign`, {
        signer_name: signerName,
        signature_data: signatureData,
      });
      setSigned(true);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to sign');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Ban className="w-12 h-12 text-rose-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Agreement Not Available</h2>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" data-testid="public-sign-success">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-heading font-bold text-slate-900 mb-2">Agreement Signed!</h2>
          <p className="text-slate-600">Thank you for signing the transport agreement. A copy will be provided by Breamway Auto Transport.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="public-sign-page">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-slate-900">Breamway Auto Transport</h1>
            <p className="text-xs text-slate-500">Vehicle Transport Agreement</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Agreement Info */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="font-heading font-semibold text-slate-900 text-lg mb-4">Agreement {agreement.agreement_number}</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500">Customer:</span> <span className="font-medium">{agreement.customer_name}</span></div>
            <div><span className="text-slate-500">Order:</span> <span className="font-medium">{agreement.order_number}</span></div>
            <div><span className="text-slate-500">Vehicle:</span> <span className="font-medium">{agreement.vehicle_info}</span></div>
            <div><span className="text-slate-500">Price:</span> <span className="font-medium">${(agreement.price || 0).toLocaleString()}</span></div>
            <div><span className="text-slate-500">Pickup:</span> <span className="font-medium">{agreement.pickup_location}</span></div>
            <div><span className="text-slate-500">Delivery:</span> <span className="font-medium">{agreement.delivery_location}</span></div>
          </div>
        </div>

        {/* Terms */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="font-heading font-semibold text-slate-900 mb-4">Terms & Conditions</h3>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-slate-700 text-sm max-h-96 overflow-y-auto">
            {agreement.terms}
          </div>
        </div>

        {/* Special Conditions */}
        {agreement.special_conditions && (
          <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
            <h4 className="font-semibold text-amber-800 text-sm mb-1">Special Conditions</h4>
            <p className="text-sm text-amber-700">{agreement.special_conditions}</p>
          </div>
        )}

        {/* Signature Section */}
        <div className="bg-white rounded-lg border border-blue-200 p-6">
          <h3 className="font-heading font-semibold text-slate-900 mb-4">Sign Agreement</h3>
          <div className="mb-4">
            <Label className="form-label">Your Full Legal Name *</Label>
            <Input value={signerName} onChange={e => setSignerName(e.target.value)}
              placeholder="Enter your full name" data-testid="public-signer-name" />
          </div>
          <PublicSignaturePad onSave={handleSign} />
          {submitting && <p className="text-sm text-blue-600 mt-2">Submitting signature...</p>}
        </div>
      </div>
    </div>
  );
};

export default PublicSign;
