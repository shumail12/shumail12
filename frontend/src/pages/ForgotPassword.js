import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Truck, AlertCircle, Loader2, ArrowLeft, ShieldCheck, KeyRound, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=username, 2=security question, 3=success
  const [username, setUsername] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStep1 = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/forgot-password`, { username });
      setSecurityQuestion(res.data.security_question);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Account not found or not eligible for password reset');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, {
        username,
        security_answer: securityAnswer,
        new_password: newPassword,
      });
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden" data-testid="forgot-password-page">
      {/* Left Side */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full filter blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full filter blur-3xl" style={{ animation: 'pulse 6s ease-in-out infinite' }} />
        </div>
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Truck className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Shumail</h1>
              <p className="text-blue-300 text-lg font-medium">Technologies</p>
            </div>
          </div>
          <h2 className="text-4xl font-bold mb-6 leading-tight">
            Account<br />
            <span className="text-blue-400">Recovery</span>
          </h2>
          <p className="text-xl text-slate-300 max-w-md leading-relaxed">
            Reset your password securely using your security question. Only super admin accounts are eligible.
          </p>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100 rounded-full filter blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-100 rounded-full filter blur-3xl opacity-50 translate-y-1/2 -translate-x-1/2" />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Truck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Shumail Technologies</h2>
              <p className="text-sm text-slate-500">Account Recovery</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-8">
            {/* Step indicators */}
            <div className="flex items-center justify-center gap-3 mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      step >= s
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                    data-testid={`step-indicator-${s}`}
                  >
                    {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                  </div>
                  {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-blue-600' : 'bg-slate-200'}`} />}
                </div>
              ))}
            </div>

            {/* Step 1: Enter Username */}
            {step === 1 && (
              <>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-7 h-7 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Forgot Password?</h3>
                  <p className="text-slate-500 text-sm">Enter your username to verify your identity</p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-4 mb-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm" data-testid="forgot-error">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleStep1} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium text-slate-700">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className="h-12 px-4 bg-slate-50 border-slate-200 rounded-xl focus:bg-white"
                      required
                      data-testid="forgot-username-input"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30"
                    data-testid="forgot-submit-username"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
                  </Button>
                </form>
              </>
            )}

            {/* Step 2: Security Question + New Password */}
            {step === 2 && (
              <>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <KeyRound className="w-7 h-7 text-amber-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Security Verification</h3>
                  <p className="text-slate-500 text-sm">Answer your security question and set a new password</p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-4 mb-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm" data-testid="reset-error">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleStep2} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Security Question</Label>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium" data-testid="security-question-display">
                      {securityQuestion}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="answer" className="text-sm font-medium text-slate-700">Your Answer</Label>
                    <Input
                      id="answer"
                      type="text"
                      value={securityAnswer}
                      onChange={(e) => setSecurityAnswer(e.target.value)}
                      placeholder="Enter your answer"
                      className="h-12 px-4 bg-slate-50 border-slate-200 rounded-xl focus:bg-white"
                      required
                      data-testid="security-answer-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newpass" className="text-sm font-medium text-slate-700">New Password</Label>
                    <Input
                      id="newpass"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 chars)"
                      className="h-12 px-4 bg-slate-50 border-slate-200 rounded-xl focus:bg-white"
                      required
                      data-testid="new-password-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmpass" className="text-sm font-medium text-slate-700">Confirm Password</Label>
                    <Input
                      id="confirmpass"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="h-12 px-4 bg-slate-50 border-slate-200 rounded-xl focus:bg-white"
                      required
                      data-testid="confirm-password-input"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30"
                    data-testid="reset-password-submit"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
                  </Button>
                </form>
              </>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
              <div className="text-center py-4" data-testid="reset-success">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Password Reset!</h3>
                <p className="text-slate-500 mb-6">Your password has been changed successfully. You can now log in with your new password.</p>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30"
                  data-testid="go-to-login-btn"
                >
                  Back to Sign In
                </Button>
              </div>
            )}

            {/* Back to login link */}
            {step !== 3 && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors"
                  data-testid="back-to-login-link"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </button>
              </div>
            )}
          </div>

          <p className="text-center text-sm text-slate-400 mt-6">
            &copy; 2024 Shumail Technologies LLC &bull; All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
