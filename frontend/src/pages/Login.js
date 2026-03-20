import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Truck, AlertCircle, Loader2 } from 'lucide-react';

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
          
          {/* Road lines animation */}
          <div className="absolute bottom-0 left-0 right-0 h-32">
            <div className="road-line line-1" />
            <div className="road-line line-2" />
            <div className="road-line line-3" />
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 animate-float">
                <Truck className="w-9 h-9 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-heading font-bold tracking-tight">Breamway</h1>
                <p className="text-blue-300 text-lg">.com</p>
              </div>
            </div>
            
            <h2 className="text-3xl font-heading font-bold mb-4 leading-tight">
              Auto Transport<br />
              <span className="text-blue-400">Management System</span>
            </h2>
            
            <p className="text-lg text-slate-300 max-w-md leading-relaxed">
              Streamline your brokerage operations with our comprehensive CRM. 
              Manage leads, quotes, orders, and dispatch all in one place.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                <p className="text-2xl font-bold text-white">500+</p>
                <p className="text-sm text-slate-400">Orders Delivered</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                <p className="text-2xl font-bold text-white">98%</p>
                <p className="text-sm text-slate-400">On-Time Rate</p>
              </div>
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
              <h2 className="text-2xl font-heading font-bold text-slate-900">Breamway.com</h2>
              <p className="text-sm text-slate-500">Transport Management</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-8 backdrop-blur-sm">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-heading font-bold text-slate-900 mb-2">
                Welcome Back
              </h3>
              <p className="text-slate-500">Sign in to continue to your dashboard</p>
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
                Powered by <span className="font-semibold text-blue-600">Breamway.com</span>
              </p>
            </div>
          </div>

          <p className="text-center text-sm text-slate-400 mt-6">
            © 2024 Breamway.com • All rights reserved
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
        
        @keyframes road-dash {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50px); }
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
        
        .road-line {
          position: absolute;
          height: 4px;
          width: 50px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          animation: road-dash 1s linear infinite;
        }
        
        .line-1 {
          bottom: 50px;
          left: 20%;
        }
        
        .line-2 {
          bottom: 50px;
          left: 50%;
          animation-delay: 0.3s;
        }
        
        .line-3 {
          bottom: 50px;
          left: 80%;
          animation-delay: 0.6s;
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
