import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');

// Leads
export const getLeads = (params = {}) => api.get('/leads', { params });
export const getLead = (id) => api.get(`/leads/${id}`);
export const updateLead = (id, data) => api.put(`/leads/${id}`, data);
export const convertLeadToQuote = (id) => api.post(`/leads/${id}/convert-to-quote`);
export const getLeadPricing = (id) => api.get(`/leads/pricing/${id}`);
export const approveLead = (id, data) => api.post(`/leads/${id}/approve`, data);

// Quotes (main entity — replaces leads)
export const getQuotes = (params = {}) => api.get('/quotes', { params });
export const getQuotesAgents = () => api.get('/quotes/agents/list');
export const getQuote = (id) => api.get(`/quotes/${id}`);
export const createQuote = (data) => api.post('/quotes', data);
export const updateQuote = (id, data) => api.put(`/quotes/${id}`, data);
export const deleteQuote = (id) => api.delete(`/quotes/${id}`);
export const convertQuoteToOrder = (id) => api.post(`/quotes/${id}/convert-to-order`);

// Orders
export const getOrders = (params = {}) => api.get('/orders', { params });
export const getOrder = (id) => api.get(`/orders/${id}`);
export const updateOrder = (id, data) => api.put(`/orders/${id}`, data);
export const deleteOrder = (id) => api.delete(`/orders/${id}`);

// Carriers
export const getCarriers = () => api.get('/carriers');
export const getCarrier = (id) => api.get(`/carriers/${id}`);
export const createCarrier = (data) => api.post('/carriers', data);
export const updateCarrier = (id, data) => api.put(`/carriers/${id}`, data);
export const deleteCarrier = (id) => api.delete(`/carriers/${id}`);

// Invoices
export const getInvoices = () => api.get('/invoices');
export const getInvoice = (id) => api.get(`/invoices/${id}`);
export const createInvoice = (data) => api.post('/invoices', data);
export const updateInvoice = (id, data) => api.put(`/invoices/${id}`, data);
export const deleteInvoice = (id) => api.delete(`/invoices/${id}`);

// Users
export const getUsers = () => api.get('/users');
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const registerUser = (data) => api.post('/auth/register', data);

// Settings
export const getCompanySettings = () => api.get('/settings/company');
export const updateCompanySettings = (data) => api.put('/settings/company', data);

// Chat
export const getChatChannels = () => api.get('/chat/channels');
export const getChatMessages = (channel, limit = 100) => api.get('/chat/messages', { params: { channel, limit } });
export const sendChatMessage = (data) => api.post('/chat/send', data);
export const markChatRead = (channel) => api.post('/chat/read', null, { params: { channel } });
export const uploadChatFile = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/chat/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const createChatGroup = (data) => api.post('/chat/groups', data);
export const getChatGroups = () => api.get('/chat/groups');
export const searchChatUsers = (q = '') => api.get('/chat/users/search', { params: { q } });

// Admin - API Management
export const getVendorApiKey = () => api.get('/leads/api-key');
export const regenerateVendorApiKey = () => api.post('/leads/api-key/regenerate');
export const getApiLogs = (limit = 100) => api.get('/admin/api-logs', { params: { limit } });
export const getLeadSources = () => api.get('/admin/lead-sources');

// Admin - Lead Distribution
export const getDistributionRules = () => api.get('/admin/distribution');
export const upsertDistributionRule = (agent_name, source, weight = 1, enabled = true) =>
  api.post('/admin/distribution', null, { params: { agent_name, source, weight, enabled } });
export const deleteDistributionRule = (agent_name, source) =>
  api.delete('/admin/distribution', { params: { agent_name, source } });

// Agreements
export const getAgreements = (params = {}) => api.get('/agreements', { params });
export const getAgreement = (id) => api.get(`/agreements/${id}`);
export const createAgreement = (data) => api.post('/agreements', data);
export const updateAgreement = (id, data) => api.put(`/agreements/${id}`, data);
export const sendAgreement = (id) => api.post(`/agreements/${id}/send`);
export const signAgreement = (id, data) => api.post(`/agreements/${id}/sign`, data);
export const voidAgreement = (id) => api.post(`/agreements/${id}/void`);
export const deleteAgreement = (id) => api.delete(`/agreements/${id}`);

// Revenue
export const submitRevenueForm = (data) => api.post('/revenue', data);
export const getRevenueForms = (params = {}) => api.get('/revenue', { params });
export const getRevenueByOrder = (orderId) => api.get(`/revenue/by-order/${orderId}`);
export const getRevenueAdminSummary = (month) => api.get('/revenue/admin/summary', { params: month ? { month } : {} });
export const updateRevenueForm = (id, data) => api.put(`/revenue/${id}`, data);
export const deleteRevenueForm = (id) => api.delete(`/revenue/${id}`);
export const getRevenueMonthlyHistory = (params = {}) => api.get('/revenue/monthly-history', { params });

// Generate Invoice from Order
export const generateInvoiceFromOrder = (orderId, invoiceType = 'customer') =>
  api.post(`/orders/${orderId}/generate-invoice?invoice_type=${invoiceType}`);
export const signInvoice = (invoiceId, data) => api.post(`/invoices/${invoiceId}/sign`, data);

// Lead Email Settings
export const getLeadEmail = () => api.get('/settings/lead-email');
export const regenerateLeadEmail = () => api.post('/settings/lead-email/regenerate');

// Reminders
export const createReminder = (data) => api.post('/reminders', data);
export const getReminders = (params = {}) => api.get('/reminders', { params });
export const getTodayReminders = () => api.get('/reminders/today');
export const updateReminder = (id, data) => api.put(`/reminders/${id}`, data);
export const deleteReminder = (id) => api.delete(`/reminders/${id}`);

// Sidebar badge counts
export const getSidebarCounts = () => api.get('/sidebar/counts');

export default api;
