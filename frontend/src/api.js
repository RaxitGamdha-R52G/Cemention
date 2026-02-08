import axios from 'axios';

const BACKEND_URL = process.env.NODE_ENV === 'production' 
  ? '' // Same domain in production
  : 'http://localhost:8000'; // Local backend in development
export const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth API
export const authAPI = {
  sendOTP: (phone) => api.post('/auth/send-otp', { phone }),
  verifyOTP: (phone, otp) => api.post('/auth/verify-otp', { phone, otp }),
  register: (userData) => api.post('/auth/register', userData),
  login: (phone) => api.post('/auth/login', { phone }),
  getMe: () => api.get('/auth/me'),
};

// Products API
export const productsAPI = {
  getAll: () => api.get('/products'),
  getById: (id) => api.get(`/products/${id}`),
};

// Cart API
export const cartAPI = {
  get: () => api.get('/cart'),
  add: (productId, quantity) => api.post('/cart/add', { product_id: productId, quantity }),
  remove: (productId) => api.delete(`/cart/remove/${productId}`),
  clear: () => api.delete('/cart/clear'),
};

// Address API
export const addressAPI = {
  getAll: () => api.get('/addresses'),
  create: (addressData) => api.post('/addresses', addressData),
  delete: (id) => api.delete(`/addresses/${id}`),
};

// Orders API
export const ordersAPI = {
  create: (orderData) => api.post('/orders/create', orderData),
  getMyOrders: () => api.get('/orders/my-orders'),
  getById: (id) => api.get(`/orders/${id}`),
  confirmPayment: (orderId, data) => api.post(`/orders/payment-confirmation/${orderId}`, data),
  createRequestOrder: (requestData) => api.post('/orders/request-order', requestData),
  getMyRequestOrders: () => api.get('/orders/request-orders'),
};

// Admin API
export const adminAPI = {
  // Users
  getPendingUsers: () => api.get('/admin/users/pending'),
  getAllUsers: (role) => api.get('/admin/users', { params: { role } }),
  approveUser: (userId) => api.patch(`/admin/users/${userId}/approve`),
  rejectUser: (userId) => api.patch(`/admin/users/${userId}/reject`),
  
  // Products
  createProduct: (productData) => api.post('/admin/products', productData),
  getAllProducts: () => api.get('/admin/products'),
  updateProduct: (productId, productData) => api.patch(`/admin/products/${productId}`, productData),
  deleteProduct: (productId) => api.delete(`/admin/products/${productId}`),
  
  // Orders
  getAllOrders: () => api.get('/admin/orders'),
  updateOrder: (orderId, orderData) => api.patch(`/admin/orders/${orderId}`, orderData),
  
  // Request Orders
  getAllRequestOrders: () => api.get('/admin/request-orders'),
  updateRequestOrder: (requestId, requestData) => api.patch(`/admin/request-orders/${requestId}`, requestData),
  
  // Reports
  getSummaryReport: () => api.get('/admin/reports/summary'),
};

export default api;
