import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Header } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import {
  BarChart3, FileText, ShoppingCart, DollarSign,
  TrendingUp, Users, Truck, Clock, Target,
} from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color = 'blue', sub }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow" data-testid={`stat-${title.toLowerCase().replace(/\s/g, '-')}`}>
    <div className="flex items-center justify-between mb-3">
      <div className={`w-10 h-10 rounded-lg bg-${color}-50 flex items-center justify-center`}>
        <Icon className={`w-5 h-5 text-${color}-600`} />
      </div>
    </div>
    <p className="text-2xl font-heading font-bold text-slate-900">{value}</p>
    <p className="text-xs text-slate-500 mt-1">{title}</p>
    {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
  </div>
);

const RevenueTarget = ({ current, target }) => {
  const pct = Math.min(100, (current / target) * 100);
  const nextLevel = target === 1500 ? '$3,000' : target === 3000 ? '$5,000' : 'MAX';
  const levelLabel = target === 1500 ? 'Level 1' : target === 3000 ? 'Level 2' : 'Level 3';
  const barColor = pct >= 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-blue-500' : 'bg-amber-500';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="revenue-target">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Target className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">My Revenue Target</h3>
            <p className="text-xs text-slate-500">{levelLabel} — Next: {nextLevel}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-heading font-bold text-emerald-600">${current.toLocaleString()}</p>
          <p className="text-xs text-slate-500">of ${target.toLocaleString()} target</p>
        </div>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${pct}%` }} data-testid="revenue-progress-bar" />
      </div>
      <div className="flex justify-between mt-2 text-xs text-slate-400">
        <span>$0</span>
        <span className="font-medium text-slate-600">{pct.toFixed(0)}%</span>
        <span>${target.toLocaleString()}</span>
      </div>
      {pct >= 100 && (
        <div className="mt-3 bg-emerald-50 rounded-lg p-3 text-center">
          <p className="text-sm font-semibold text-emerald-700">Target reached! Great job!</p>
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) return <Layout><div className="flex items-center justify-center h-[80vh]"><div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" /></div></Layout>;

  const s = stats || {};

  return (
    <Layout>
      <Header title="Dashboard">
        <p className="text-sm text-slate-500">Welcome back, <strong>{user?.full_name}</strong></p>
      </Header>
      <div className="p-6 space-y-6" data-testid="dashboard-page">
        {/* Revenue Target */}
        <RevenueTarget current={s.my_revenue || 0} target={s.revenue_target || 1500} />

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard title="Total Leads" value={(s.total_leads || 0).toLocaleString()} icon={FileText} color="blue" />
          <StatCard title="Total Quotes" value={(s.total_quotes || 0).toLocaleString()} icon={BarChart3} color="purple" />
          <StatCard title="Total Orders" value={(s.total_orders || 0).toLocaleString()} icon={ShoppingCart} color="emerald" />
          <StatCard title="Revenue (Deposits)" value={`$${(s.total_revenue || 0).toLocaleString()}`} icon={DollarSign} color="emerald"
            sub={user?.role === 'superadmin' ? 'All users' : 'Your submissions'} />
          <StatCard title="Conversion Rate" value={`${s.conversion_rate || 0}%`} icon={TrendingUp} color="amber" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Active Orders" value={s.active_orders || 0} icon={Truck} color="blue" />
          <StatCard title="Delivered" value={s.delivered_orders || 0} icon={Truck} color="emerald" />
          <StatCard title="Pending Quotes" value={s.pending_quotes || 0} icon={Clock} color="amber" />
          <StatCard title="Team Members" value={s.total_users || 0} icon={Users} color="slate" />
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Quotes */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4 text-sm">Recent Quotes</h3>
            <div className="space-y-2">
              {(s.recent_quotes || []).slice(0, 5).map(q => (
                <div key={q.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 rounded px-2 -mx-2"
                  onClick={() => navigate(q.status === 'lead' ? `/leads/${q.id}` : `/quotes/${q.id}`)}>
                  <div>
                    <p className="text-xs font-mono font-semibold text-blue-600">{q.quote_number}</p>
                    <p className="text-xs text-slate-500">{q.customer_name}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    q.status === 'lead' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}>{q.status}</span>
                </div>
              ))}
              {(!s.recent_quotes || s.recent_quotes.length === 0) && <p className="text-xs text-slate-400">No recent quotes</p>}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4 text-sm">Recent Orders</h3>
            <div className="space-y-2">
              {(s.recent_orders || []).slice(0, 5).map(o => (
                <div key={o.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 rounded px-2 -mx-2"
                  onClick={() => navigate(`/orders/${o.id}`)}>
                  <div>
                    <p className="text-xs font-mono font-semibold text-emerald-600">{o.order_number}</p>
                    <p className="text-xs text-slate-500">{o.customer_name}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    o.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                  }`}>{o.status}</span>
                </div>
              ))}
              {(!s.recent_orders || s.recent_orders.length === 0) && <p className="text-xs text-slate-400">No recent orders</p>}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
