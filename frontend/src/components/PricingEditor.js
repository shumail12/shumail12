import React from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Truck, Zap, Shield, MapPin, ArrowRight } from 'lucide-react';

const SHIPPING_CONFIGS = {
  standard: { label: 'Standard Shipping', icon: Truck, color: 'blue', deposit: 150, carrier: 60, rate: 0.75 },
  expedited: { label: 'Expedited Shipping', icon: Zap, color: 'amber', deposit: 175, carrier: 70, rate: 0.95 },
  enclosed: { label: 'Enclosed Shipping', icon: Shield, color: 'emerald', deposit: 200, carrier: 85, rate: 1.00 },
};

const colorMap = {
  blue: { border: 'border-blue-200', icon: 'text-blue-600', header: 'bg-blue-600', headerText: 'text-white', totalBg: 'bg-blue-50' },
  amber: { border: 'border-amber-200', icon: 'text-amber-600', header: 'bg-amber-600', headerText: 'text-white', totalBg: 'bg-amber-50' },
  emerald: { border: 'border-emerald-200', icon: 'text-emerald-600', header: 'bg-emerald-600', headerText: 'text-white', totalBg: 'bg-emerald-50' },
};

export const PricingEditor = ({ pricing, distance, onChange, readOnly = false }) => {

  const calcTotal = (type, deposit, carrier) => {
    const mileCost = distance ? distance * SHIPPING_CONFIGS[type].rate : 0;
    return Math.round((deposit + carrier + mileCost) * 100) / 100;
  };

  const handleChange = (type, field, value) => {
    const updated = { ...pricing };
    const cfg = SHIPPING_CONFIGS[type];
    if (!updated[type]) {
      updated[type] = { deposit_fee: cfg.deposit, carrier_fee: cfg.carrier, total_price: calcTotal(type, cfg.deposit, cfg.carrier) };
    }
    const numVal = parseFloat(value) || 0;
    updated[type] = { ...updated[type], [field]: numVal };

    // Auto-calc total = deposit + carrier + mileage whenever deposit or carrier changes
    if (field === 'deposit_fee' || field === 'carrier_fee') {
      const d = field === 'deposit_fee' ? numVal : (updated[type].deposit_fee || 0);
      const c = field === 'carrier_fee' ? numVal : (updated[type].carrier_fee || 0);
      updated[type].total_price = calcTotal(type, d, c);
    }

    onChange(updated);
  };

  return (
    <div data-testid="pricing-editor">
      {distance > 0 && (
        <div className="flex items-center gap-2 mb-4 px-1">
          <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span className="text-sm text-slate-600">
            Estimated distance: <strong className="text-slate-900">{distance.toLocaleString()} miles</strong>
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['standard', 'expedited', 'enclosed'].map(type => {
          const cfg = SHIPPING_CONFIGS[type];
          const Icon = cfg.icon;
          const c = colorMap[cfg.color];
          const p = pricing?.[type] || { deposit_fee: cfg.deposit, carrier_fee: cfg.carrier, total_price: calcTotal(type, cfg.deposit, cfg.carrier) };
          const mileCost = distance ? distance * cfg.rate : 0;

          return (
            <div key={type} className={`rounded-xl border ${c.border} overflow-hidden`} data-testid={`pricing-card-${type}`}>
              <div className={`${c.header} px-4 py-3 flex items-center gap-2`}>
                <Icon className={`w-4 h-4 ${c.headerText}`} />
                <span className={`font-semibold text-sm ${c.headerText}`}>{cfg.label}</span>
                <span className={`ml-auto text-xs ${c.headerText} opacity-80`}>${cfg.rate}/mi</span>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Deposit Fee ($)</Label>
                  <Input
                    type="number" step="0.01"
                    value={p.deposit_fee ?? ''}
                    onChange={e => handleChange(type, 'deposit_fee', e.target.value)}
                    disabled={readOnly}
                    className="h-9 text-sm"
                    data-testid={`pricing-${type}-deposit`}
                  />
                </div>
                <div className="flex items-center gap-1 text-slate-400 justify-center">
                  <span className="text-xs">+</span>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Carrier Fee ($)</Label>
                  <Input
                    type="number" step="0.01"
                    value={p.carrier_fee ?? ''}
                    onChange={e => handleChange(type, 'carrier_fee', e.target.value)}
                    disabled={readOnly}
                    className="h-9 text-sm"
                    data-testid={`pricing-${type}-carrier`}
                  />
                </div>

                {distance > 0 && (
                  <>
                    <div className="flex items-center gap-1 text-slate-400 justify-center">
                      <span className="text-xs">+</span>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-600 flex justify-between">
                      <span>Mileage ({distance.toLocaleString()} mi x ${cfg.rate})</span>
                      <span className="font-semibold text-slate-800">${mileCost.toFixed(2)}</span>
                    </div>
                  </>
                )}

                <div className="flex items-center gap-1 text-slate-400 justify-center">
                  <ArrowRight className="w-3 h-3" />
                </div>

                <div className={`${c.totalBg} rounded-lg p-3`}>
                  <Label className="text-xs text-slate-500 mb-1 block">Total Price ($)</Label>
                  <Input
                    type="number" step="0.01"
                    value={p.total_price ?? ''}
                    onChange={e => handleChange(type, 'total_price', e.target.value)}
                    disabled={readOnly}
                    className={`h-10 text-base font-bold ${c.icon} bg-white`}
                    data-testid={`pricing-${type}-total`}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    = ${(p.deposit_fee || 0).toFixed(0)} + ${(p.carrier_fee || 0).toFixed(0)}{distance > 0 ? ` + $${mileCost.toFixed(0)} mileage` : ''}
                  </p>
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
