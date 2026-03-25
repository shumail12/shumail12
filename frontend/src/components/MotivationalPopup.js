import React, { useState, useEffect } from 'react';
import { X, Zap } from 'lucide-react';

const QUOTES = [
  { text: "Speed is the key \u2014 first quote wins the deal.", category: "Sales" },
  { text: "Every lead is an opportunity \u2014 act fast.", category: "Sales" },
  { text: "Consistency beats luck in sales.", category: "Sales" },
  { text: "The fortune is in the follow-up.", category: "Sales" },
  { text: "Don't watch the clock; do what it does \u2014 keep going.", category: "Motivation" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", category: "Motivation" },
  { text: "Your attitude, not your aptitude, will determine your altitude.", category: "Motivation" },
  { text: "The only way to do great work is to love what you do.", category: "Motivation" },
  { text: "Every shipment delivered safely builds trust that lasts forever.", category: "Transport" },
  { text: "Miles on the road mean money in the bank.", category: "Transport" },
  { text: "A smooth transport today means a referral tomorrow.", category: "Transport" },
  { text: "In logistics, every minute counts \u2014 stay sharp.", category: "Transport" },
  { text: "Close fast, ship faster \u2014 that's the Breamway way.", category: "Sales" },
  { text: "Winners don't wait for opportunities, they create them.", category: "Motivation" },
  { text: "The difference between try and triumph is a little umph.", category: "Motivation" },
  { text: "Every no gets you closer to a yes.", category: "Sales" },
  { text: "Revenue doesn't sleep \u2014 neither should your hustle.", category: "Sales" },
  { text: "Ship with confidence. Deliver with excellence.", category: "Transport" },
  { text: "Pipeline full, phone ringing \u2014 that's a good day.", category: "Sales" },
  { text: "The road to success is always under construction.", category: "Motivation" },
  { text: "Great things never come from comfort zones.", category: "Motivation" },
  { text: "Today's effort is tomorrow's commission.", category: "Sales" },
  { text: "Be the broker everyone wants to work with.", category: "Transport" },
  { text: "Hustle in silence, let your numbers make the noise.", category: "Sales" },
  { text: "A car shipped on time is a customer for life.", category: "Transport" },
  { text: "Focus on the customer, and the revenue will follow.", category: "Sales" },
  { text: "You're not just moving cars \u2014 you're building dreams.", category: "Transport" },
  { text: "The best time to close a deal was yesterday. The next best time is now.", category: "Sales" },
  { text: "Success is the sum of small efforts repeated day in and day out.", category: "Motivation" },
  { text: "Believe you can, and you're halfway there.", category: "Motivation" },
];

const MotivationalPopup = ({ show, onClose }) => {
  const [quote, setQuote] = useState(null);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (show) {
      setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
      setProgress(100);

      const timer = setTimeout(() => { onClose(); }, 30000);
      const interval = setInterval(() => {
        setProgress(p => Math.max(0, p - (100 / 300)));
      }, 100);

      return () => { clearTimeout(timer); clearInterval(interval); };
    }
  }, [show, onClose]);

  if (!show || !quote) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-8 pointer-events-none" data-testid="motivational-popup">
      <div className="pointer-events-auto animate-slideDown max-w-md w-full mx-4">
        <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-2xl shadow-2xl shadow-blue-900/30 overflow-hidden border border-blue-500/20">
          {/* Progress bar */}
          <div className="absolute top-0 left-0 h-1 bg-blue-400 transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />

          {/* Close button */}
          <button onClick={onClose} className="absolute top-3 right-3 text-white/50 hover:text-white transition-colors" data-testid="close-popup-btn">
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 pt-5">
            {/* Icon */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Daily Motivation</p>
                <p className="text-[10px] text-blue-300/60">{quote.category}</p>
              </div>
            </div>

            {/* Quote */}
            <p className="text-white text-lg font-medium leading-relaxed mb-4">
              "{quote.text}"
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-blue-300/50">Let's crush it today!</p>
              <div className="text-xs text-blue-400/40">Breamway</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-slideDown {
          animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default MotivationalPopup;
