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

export default api;
