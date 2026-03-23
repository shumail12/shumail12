import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Header } from '../components/Layout';
import { getDashboardStats } from '../lib/api';
import { FileText, ShoppingCart, Truck, DollarSign, Users, TrendingUp, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const StatCard = ({ icon: Icon, label, value, color, sub, onClick }) => (
  <div onClick={onClick}
    className={`bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all cursor-pointer group`}
    data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getDashboardStats();
        setStats(res.data);
      } catch { toast.error('Failed to load dashboard'); }
      finally { setLoading(false); }
    };
    fetchStats();
  }, []);

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-[80vh]">
        <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6" data-testid="dashboard-page">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard icon={FileText} label="Total Quotes" value={stats?.total_quotes?.toLocaleString() || '0'} color="bg-blue-600" onClick={() => navigate('/quotes')} />
          <StatCard icon={FileText} label="Leads" value={stats?.total_leads?.toLocaleString() || '0'} color="bg-cyan-600" sub="Awaiting quote" onClick={() => navigate('/quotes?status=lead')} />
          <StatCard icon={ShoppingCart} label="Orders" value={stats?.total_orders?.toLocaleString() || '0'} color="bg-emerald-600" onClick={() => navigate('/orders')} />
          <StatCard icon={DollarSign} label="Revenue" value={`$${(stats?.total_revenue || 0).toLocaleString()}`} color="bg-amber-500" />
          <StatCard icon={TrendingUp} label="Conversion" value={`${stats?.conversion_rate || 0}%`} color="bg-violet-600" sub={`${stats?.total_orders || 0} / ${stats?.total_quotes || 0}`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity Cards */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Quick Stats</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">Pending Quotes</span>
                <span className="font-semibold text-amber-600">{stats?.pending_quotes?.toLocaleString() || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">Active Orders</span>
                <span className="font-semibold text-blue-600">{stats?.active_orders || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">Delivered</span>
                <span className="font-semibold text-emerald-600">{stats?.delivered_orders || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">Carriers</span>
                <span className="font-semibold text-slate-700">{stats?.total_carriers || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">Users/Agents</span>
                <span className="font-semibold text-slate-700">{stats?.total_users || 0}</span>
              </div>
            </div>
          </div>

          {/* Recent Quotes */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Recent Quotes</h3>
              <button onClick={() => navigate('/quotes')} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {(stats?.recent_quotes || []).map(q => (
                <div key={q.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                  onClick={() => navigate(`/quotes/${q.id}`)}>
                  <div>
                    <span className="font-mono text-xs font-semibold text-blue-600 mr-2">{q.quote_number}</span>
                    <span className="text-sm font-medium text-slate-900">{q.customer_name}</span>
                    <span className="text-xs text-slate-400 ml-2">{q.pickup_city} → {q.delivery_city}</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-emerald-600">${q.price?.toLocaleString()}</span>
                </div>
              ))}
              {(!stats?.recent_quotes?.length) && <p className="text-sm text-slate-400 text-center py-4">No recent quotes</p>}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
