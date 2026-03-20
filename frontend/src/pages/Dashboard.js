import React, { useState, useEffect } from 'react';
import { Layout, Header } from '../components/Layout';
import { getDashboardStats, getLeads, getQuotes, getOrders } from '../lib/api';
import {
  Users,
  FileText,
  Package,
  DollarSign,
  Clock,
  Truck,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';

const MetricCard = ({ title, value, icon: Icon, trend, color, testId }) => (
  <div className="metric-card" data-testid={testId}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <p className="text-3xl font-heading font-bold text-slate-900">{value}</p>
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-emerald-600 font-medium">{trend}</span>
          </div>
        )}
      </div>
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

const RecentActivity = ({ items, type }) => {
  const getStatusClass = (status) => {
    const statusMap = {
      new: 'status-new',
      pending: 'status-pending',
      approved: 'status-approved',
      converted: 'status-converted',
      in_transit: 'status-in_transit',
      delivered: 'status-delivered',
      assigned: 'status-assigned',
      contacted: 'status-contacted',
      quoted: 'status-quoted',
      lost: 'status-lost',
      rejected: 'status-rejected'
    };
    return statusMap[status] || 'status-new';
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="font-heading font-semibold text-slate-900">Recent {type}</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {items.length === 0 ? (
          <div className="p-6 text-center text-slate-500">
            No {type.toLowerCase()} found
          </div>
        ) : (
          items.slice(0, 5).map((item, index) => (
            <div key={item.id || index} className="px-6 py-4 hover:bg-slate-50 transition-colors duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">
                    {type === 'Leads' ? item.customer_name : (item.quote_number || item.order_number)}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {type === 'Leads' 
                      ? `${item.vehicle_year} ${item.vehicle_make} ${item.vehicle_model}`
                      : `${item.pickup_city || 'N/A'} → ${item.delivery_city || 'N/A'}`
                    }
                  </p>
                </div>
                <span className={`status-badge ${getStatusClass(item.status)}`}>
                  {item.status?.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, leadsRes, quotesRes, ordersRes] = await Promise.all([
          getDashboardStats(),
          getLeads(),
          getQuotes(),
          getOrders()
        ]);
        setStats(statsRes.data);
        setLeads(leadsRes.data);
        setQuotes(quotesRes.data);
        setOrders(ordersRes.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <Layout>
        <Header title="Dashboard" />
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header title="Dashboard">
        <div className="live-indicator">
          <span className="live-dot" />
          <span className="text-sm text-slate-600">Live Updates</span>
        </div>
      </Header>
      
      <div className="p-6" data-testid="dashboard-content">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Leads"
            value={stats?.total_leads || 0}
            icon={Users}
            color="bg-blue-600"
            testId="metric-leads"
          />
          <MetricCard
            title="Pending Quotes"
            value={stats?.pending_quotes || 0}
            icon={FileText}
            color="bg-amber-500"
            testId="metric-quotes"
          />
          <MetricCard
            title="Active Orders"
            value={stats?.active_orders || 0}
            icon={Truck}
            color="bg-violet-600"
            testId="metric-orders"
          />
          <MetricCard
            title="Total Revenue"
            value={`$${(stats?.total_revenue || 0).toLocaleString()}`}
            icon={DollarSign}
            color="bg-emerald-600"
            testId="metric-revenue"
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Quotes</p>
              <p className="text-xl font-heading font-bold text-slate-900">{stats?.total_quotes || 0}</p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Delivered</p>
              <p className="text-xl font-heading font-bold text-slate-900">{stats?.delivered_orders || 0}</p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Unpaid Invoices</p>
              <p className="text-xl font-heading font-bold text-slate-900">{stats?.unpaid_invoices || 0}</p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Orders</p>
              <p className="text-xl font-heading font-bold text-slate-900">{stats?.total_orders || 0}</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <RecentActivity items={leads} type="Leads" />
          <RecentActivity items={quotes} type="Quotes" />
          <RecentActivity items={orders} type="Orders" />
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
