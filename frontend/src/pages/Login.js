import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Truck, AlertCircle, Loader2, Shield, Clock, DollarSign, MapPin } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden" data-testid="login-page">
      {/* Left Side - Animated Background */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Moving trucks animation */}
          <div className="absolute w-full h-full">
            <div className="truck-animation truck-1">
              <Truck className="w-16 h-16 text-blue-400/20" />
            </div>
            <div className="truck-animation truck-2">
              <Truck className="w-12 h-12 text-blue-300/15" />
            </div>
            <div className="truck-animation truck-3">
              <Truck className="w-20 h-20 text-blue-500/10" />
            </div>
          </div>
          
          {/* Glowing orbs */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full filter blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full filter blur-3xl animate-pulse-slower" />
          
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 animate-float">
                <Truck className="w-9 h-9 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-heading font-bold tracking-tight">Shumail</h1>
                <p className="text-blue-300 text-lg font-medium">Technologies</p>
              </div>
            </div>
            
            <h2 className="text-4xl font-heading font-bold mb-6 leading-tight">
              Vehicle Shipping<br />
              <span className="text-blue-400">Made Simple</span>
            </h2>
            
            <p className="text-xl text-slate-300 max-w-md leading-relaxed mb-8">
              Get instant quotes. Ship with confidence. Your vehicle deserves the best transport service.
            </p>

            {/* Features */}
            <div className="space-y-4 mb-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-600/30 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Competitive Pricing</p>
                  <p className="text-sm text-slate-400">Best rates in the industry</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-600/30 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Fully Insured</p>
                  <p className="text-sm text-slate-400">Your vehicle is protected</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-600/30 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-white">On-Time Delivery</p>
                  <p className="text-sm text-slate-400">98% on-time delivery rate</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-violet-600/30 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Nationwide Coverage</p>
                  <p className="text-sm text-slate-400">Door-to-door service across USA</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10">
              <p className="text-sm text-slate-400">
                "Moving vehicles across the nation with precision and care."
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 relative">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100 rounded-full filter blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-100 rounded-full filter blur-3xl opacity-50 translate-y-1/2 -translate-x-1/2" />
        
        <div className="w-full max-w-md relative z-10 animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Truck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-heading font-bold text-slate-900">Shumail Technologies</h2>
              <p className="text-sm text-slate-500">Vehicle Transport CRM</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-8 backdrop-blur-sm">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-heading font-bold text-slate-900 mb-2">
                Welcome Back
              </h3>
              <p className="text-slate-500">Sign in to manage your quotes & shipments</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 mb-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm animate-shake" data-testid="login-error">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-slate-700">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="h-12 px-4 bg-slate-50 border-slate-200 rounded-xl focus:bg-white transition-colors duration-200"
                  required
                  data-testid="username-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-12 px-4 bg-slate-50 border-slate-200 rounded-xl focus:bg-white transition-colors duration-200"
                  required
                  data-testid="password-input"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5"
                data-testid="login-button"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-center text-sm text-slate-500">
                Powered by <span className="font-semibold text-blue-600">Shumail Technologies</span>
              </p>
            </div>
          </div>

          <p className="text-center text-sm text-slate-400 mt-6">
            © 2024 Shumail Technologies • All rights reserved
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        @keyframes truck-move {
          0% { transform: translateX(-100px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(calc(100vw + 100px)); opacity: 0; }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.1); }
        }
        
        @keyframes pulse-slower {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.15); }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        
        .animate-pulse-slower {
          animation: pulse-slower 6s ease-in-out infinite;
        }
        
        .truck-animation {
          position: absolute;
          animation: truck-move 15s linear infinite;
        }
        
        .truck-1 {
          top: 20%;
          animation-delay: 0s;
        }
        
        .truck-2 {
          top: 50%;
          animation-delay: 5s;
        }
        
        .truck-3 {
          top: 75%;
          animation-delay: 10s;
        }
        
        .bg-grid-pattern {
          background-image: 
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>
    </div>
  );
};

export default Login;
