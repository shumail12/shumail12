import React, { useMemo } from 'react';

// US State centroids (approximate) for positioning on a simple map
// Coordinates mapped to viewBox 0-960 x 0-600
const STATE_COORDS = {
  AL: { x: 630, y: 400, name: 'Alabama' }, AK: { x: 135, y: 505, name: 'Alaska' },
  AZ: { x: 205, y: 380, name: 'Arizona' }, AR: { x: 540, y: 370, name: 'Arkansas' },
  CA: { x: 100, y: 300, name: 'California' }, CO: { x: 295, y: 280, name: 'Colorado' },
  CT: { x: 850, y: 190, name: 'Connecticut' }, DE: { x: 820, y: 255, name: 'Delaware' },
  FL: { x: 720, y: 470, name: 'Florida' }, GA: { x: 690, y: 400, name: 'Georgia' },
  HI: { x: 260, y: 520, name: 'Hawaii' }, ID: { x: 195, y: 170, name: 'Idaho' },
  IL: { x: 580, y: 260, name: 'Illinois' }, IN: { x: 620, y: 260, name: 'Indiana' },
  IA: { x: 510, y: 220, name: 'Iowa' }, KS: { x: 430, y: 300, name: 'Kansas' },
  KY: { x: 650, y: 310, name: 'Kentucky' }, LA: { x: 540, y: 440, name: 'Louisiana' },
  ME: { x: 880, y: 110, name: 'Maine' }, MD: { x: 800, y: 260, name: 'Maryland' },
  MA: { x: 870, y: 175, name: 'Massachusetts' }, MI: { x: 620, y: 185, name: 'Michigan' },
  MN: { x: 470, y: 140, name: 'Minnesota' }, MS: { x: 580, y: 410, name: 'Mississippi' },
  MO: { x: 530, y: 310, name: 'Missouri' }, MT: { x: 260, y: 115, name: 'Montana' },
  NE: { x: 410, y: 240, name: 'Nebraska' }, NV: { x: 155, y: 260, name: 'Nevada' },
  NH: { x: 865, y: 145, name: 'New Hampshire' }, NJ: { x: 835, y: 235, name: 'New Jersey' },
  NM: { x: 270, y: 380, name: 'New Mexico' }, NY: { x: 810, y: 175, name: 'New York' },
  NC: { x: 740, y: 340, name: 'N. Carolina' }, ND: { x: 400, y: 120, name: 'N. Dakota' },
  OH: { x: 665, y: 245, name: 'Ohio' }, OK: { x: 440, y: 355, name: 'Oklahoma' },
  OR: { x: 125, y: 145, name: 'Oregon' }, PA: { x: 775, y: 220, name: 'Pennsylvania' },
  RI: { x: 870, y: 190, name: 'Rhode Island' }, SC: { x: 730, y: 370, name: 'S. Carolina' },
  SD: { x: 395, y: 170, name: 'S. Dakota' }, TN: { x: 640, y: 345, name: 'Tennessee' },
  TX: { x: 400, y: 430, name: 'Texas' }, UT: { x: 225, y: 270, name: 'Utah' },
  VT: { x: 845, y: 140, name: 'Vermont' }, VA: { x: 755, y: 290, name: 'Virginia' },
  WA: { x: 140, y: 90, name: 'Washington' }, WV: { x: 720, y: 280, name: 'W. Virginia' },
  WI: { x: 530, y: 160, name: 'Wisconsin' }, WY: { x: 280, y: 195, name: 'Wyoming' },
  DC: { x: 790, y: 270, name: 'D.C.' },
};

const normalizeState = (state) => {
  if (!state) return null;
  const s = state.trim().toUpperCase().replace('.', '');
  if (STATE_COORDS[s]) return s;
  // Try full name match
  const entry = Object.entries(STATE_COORDS).find(([, v]) => v.name.toUpperCase() === s);
  return entry ? entry[0] : null;
};

const USARouteMap = ({ pickupState, deliveryState, pickupCity, deliveryCity }) => {
  const pickup = normalizeState(pickupState);
  const delivery = normalizeState(deliveryState);

  const pickupCoord = pickup ? STATE_COORDS[pickup] : null;
  const deliveryCoord = delivery ? STATE_COORDS[delivery] : null;

  // Calculate a curve control point for the route line
  const controlPoint = useMemo(() => {
    if (!pickupCoord || !deliveryCoord) return null;
    const midX = (pickupCoord.x + deliveryCoord.x) / 2;
    const midY = (pickupCoord.y + deliveryCoord.y) / 2;
    const dx = deliveryCoord.x - pickupCoord.x;
    const dy = deliveryCoord.y - pickupCoord.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const offset = Math.min(dist * 0.25, 80);
    return { x: midX - (dy / dist) * offset, y: midY + (dx / dist) * offset };
  }, [pickupCoord, deliveryCoord]);

  return (
    <div className="relative w-full" data-testid="usa-route-map">
      <svg viewBox="0 0 960 600" className="w-full h-auto" style={{ maxHeight: '380px' }}>
        {/* Background */}
        <rect width="960" height="600" fill="#f8fafc" rx="12" />

        {/* State dots and labels */}
        {Object.entries(STATE_COORDS).map(([abbr, coord]) => {
          const isPickup = abbr === pickup;
          const isDelivery = abbr === delivery;
          const isRoute = isPickup || isDelivery;

          return (
            <g key={abbr}>
              {/* State dot */}
              <circle
                cx={coord.x} cy={coord.y}
                r={isRoute ? 8 : 3}
                fill={isPickup ? '#2563eb' : isDelivery ? '#059669' : '#cbd5e1'}
                stroke={isRoute ? '#fff' : 'none'}
                strokeWidth={isRoute ? 2 : 0}
                opacity={isRoute ? 1 : 0.7}
              />
              {/* State label */}
              <text
                x={coord.x}
                y={coord.y - (isRoute ? 14 : 8)}
                textAnchor="middle"
                className={isRoute ? 'font-bold' : ''}
                fill={isPickup ? '#2563eb' : isDelivery ? '#059669' : '#94a3b8'}
                fontSize={isRoute ? 12 : 9}
              >
                {abbr}
              </text>
            </g>
          );
        })}

        {/* Route line */}
        {pickupCoord && deliveryCoord && controlPoint && (
          <>
            {/* Glow effect */}
            <path
              d={`M ${pickupCoord.x} ${pickupCoord.y} Q ${controlPoint.x} ${controlPoint.y} ${deliveryCoord.x} ${deliveryCoord.y}`}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="6"
              opacity="0.15"
              strokeLinecap="round"
            />
            {/* Main route line */}
            <path
              d={`M ${pickupCoord.x} ${pickupCoord.y} Q ${controlPoint.x} ${controlPoint.y} ${deliveryCoord.x} ${deliveryCoord.y}`}
              fill="none"
              stroke="url(#routeGradient)"
              strokeWidth="3"
              strokeDasharray="8 4"
              strokeLinecap="round"
              data-testid="route-line"
            >
              <animate attributeName="stroke-dashoffset" from="24" to="0" dur="1.5s" repeatCount="indefinite" />
            </path>

            {/* Gradient def */}
            <defs>
              <linearGradient id="routeGradient" x1={pickupCoord.x} y1={pickupCoord.y} x2={deliveryCoord.x} y2={deliveryCoord.y} gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>

            {/* Pickup marker */}
            <g>
              <circle cx={pickupCoord.x} cy={pickupCoord.y} r="12" fill="#2563eb" opacity="0.2">
                <animate attributeName="r" values="12;18;12" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.2;0.05;0.2" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={pickupCoord.x} cy={pickupCoord.y} r="8" fill="#2563eb" stroke="#fff" strokeWidth="2" />
            </g>

            {/* Delivery marker */}
            <g>
              <circle cx={deliveryCoord.x} cy={deliveryCoord.y} r="12" fill="#059669" opacity="0.2">
                <animate attributeName="r" values="12;18;12" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.2;0.05;0.2" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={deliveryCoord.x} cy={deliveryCoord.y} r="8" fill="#059669" stroke="#fff" strokeWidth="2" />
            </g>
          </>
        )}
      </svg>

      {/* Legend */}
      {(pickupCoord || deliveryCoord) && (
        <div className="flex items-center justify-center gap-6 mt-3 text-xs">
          {pickupCoord && (
            <div className="flex items-center gap-2" data-testid="map-pickup-label">
              <div className="w-3 h-3 rounded-full bg-blue-600" />
              <span className="text-slate-600">Pickup: <strong className="text-slate-900">{pickupCity || ''}{pickupCity && pickupState ? ', ' : ''}{pickupState || ''}</strong></span>
            </div>
          )}
          {deliveryCoord && (
            <div className="flex items-center gap-2" data-testid="map-delivery-label">
              <div className="w-3 h-3 rounded-full bg-emerald-600" />
              <span className="text-slate-600">Delivery: <strong className="text-slate-900">{deliveryCity || ''}{deliveryCity && deliveryState ? ', ' : ''}{deliveryState || ''}</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default USARouteMap;
