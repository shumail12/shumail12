import React from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Truck, Zap, Shield, DollarSign, MapPin } from 'lucide-react';

const SHIPPING_CONFIGS = {
  standard: { label: 'Standard Shipping', icon: Truck, color: 'blue', deposit: 150, carrier: 60, rate: 0.75 },
  expedited: { label: 'Expedited Shipping', icon: Zap, color: 'amber', deposit: 175, carrier: 70, rate: 0.95 },
  enclosed: { label: 'Enclosed Shipping', icon: Shield, color: 'emerald', deposit: 200, carrier: 85, rate: 1.00 },
};

const colorMap = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', header: 'bg-blue-600', headerText: 'text-white' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', header: 'bg-amber-600', headerText: 'text-white' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', header: 'bg-emerald-600', headerText: 'text-white' },
};

export const PricingEditor = ({ pricing, distance, onChange, readOnly = false }) => {
  const handleChange = (type, field, value) => {
    const updated = { ...pricing };
    if (!updated[type]) {
      const cfg = SHIPPING_CONFIGS[type];
      updated[type] = { deposit_fee: cfg.deposit, carrier_fee: cfg.carrier, total_price: cfg.deposit + cfg.carrier };
    }
    updated[type] = { ...updated[type], [field]: parseFloat(value) || 0 };
    // Auto-calc total if editing deposit/carrier
    if (field === 'deposit_fee' || field === 'carrier_fee') {
      const d = updated[type].deposit_fee || 0;
      const c = updated[type].carrier_fee || 0;
      const mileCost = distance ? distance * SHIPPING_CONFIGS[type].rate : 0;
      updated[type].total_price = Math.round((d + c + mileCost) * 100) / 100;
    }
    onChange(updated);
  };

  return (
    <div data-testid="pricing-editor">
      {/* Distance info */}
      {distance && (
        <div className="flex items-center gap-2 mb-4 text-sm text-slate-600">
          <MapPin className="w-4 h-4 text-blue-500" />
          <span>Estimated distance: <strong>{distance.toLocaleString()} miles</strong></span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['standard', 'expedited', 'enclosed'].map(type => {
          const cfg = SHIPPING_CONFIGS[type];
          const Icon = cfg.icon;
          const c = colorMap[cfg.color];
          const p = pricing?.[type] || { deposit_fee: cfg.deposit, carrier_fee: cfg.carrier, total_price: cfg.deposit + cfg.carrier };

          return (
            <div key={type} className={`rounded-xl border ${c.border} overflow-hidden`} data-testid={`pricing-card-${type}`}>
              {/* Card Header */}
              <div className={`${c.header} px-4 py-3 flex items-center gap-2`}>
                <Icon className={`w-4 h-4 ${c.headerText}`} />
                <span className={`font-semibold text-sm ${c.headerText}`}>{cfg.label}</span>
                <span className={`ml-auto text-xs ${c.headerText} opacity-80`}>${cfg.rate}/mi</span>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Deposit Fee ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={p.deposit_fee ?? ''}
                    onChange={e => handleChange(type, 'deposit_fee', e.target.value)}
                    disabled={readOnly}
                    className="h-9 text-sm"
                    data-testid={`pricing-${type}-deposit`}
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Carrier Fee ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={p.carrier_fee ?? ''}
                    onChange={e => handleChange(type, 'carrier_fee', e.target.value)}
                    disabled={readOnly}
                    className="h-9 text-sm"
                    data-testid={`pricing-${type}-carrier`}
                  />
                </div>
                {distance > 0 && (
                  <div className="text-xs text-slate-500 flex justify-between px-1">
                    <span>Mileage ({distance} mi × ${cfg.rate})</span>
                    <span className="font-medium">${(distance * cfg.rate).toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-3">
                  <Label className="text-xs text-slate-500 mb-1 block">Total Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={p.total_price ?? ''}
                    onChange={e => handleChange(type, 'total_price', e.target.value)}
                    disabled={readOnly}
                    className={`h-9 text-sm font-bold ${c.icon}`}
                    data-testid={`pricing-${type}-total`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PricingEditor;
