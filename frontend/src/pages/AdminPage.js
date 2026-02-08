import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { adminAPI, productsAPI } from '../api';
import { useAuth } from '../AuthContext';
import { formatCurrency, getRoleName, getStatusColor } from '../utils';
import { LogOut, Users, Package, ShoppingCart, BarChart3, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const AdminPage = () => {
  const [stats, setStats] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      navigate('/products');
      return;
    }
    loadAdminData();
  }, [user, navigate]);

  const loadAdminData = async () => {
    try {
      const [statsRes, usersRes, ordersRes, productsRes] = await Promise.all([
        adminAPI.getSummaryReport(),
        adminAPI.getPendingUsers(),
        adminAPI.getAllOrders(),
        adminAPI.getAllProducts()
      ]);
      
      setStats(statsRes.data);
      setPendingUsers(usersRes.data);
      setAllOrders(ordersRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      toast.error('Failed to load admin data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId) => {
    try {
      await adminAPI.approveUser(userId);
      toast.success('User approved');
      loadAdminData();
    } catch (error) {
      toast.error('Failed to approve user');
      console.error(error);
    }
  };

  const handleRejectUser = async (userId) => {
    try {
      await adminAPI.rejectUser(userId);
      toast.success('User rejected');
      loadAdminData();
    } catch (error) {
      toast.error('Failed to reject user');
      console.error(error);
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await adminAPI.updateOrder(orderId, { order_status: status });
      toast.success('Order status updated');
      loadAdminData();
    } catch (error) {
      toast.error('Failed to update order');
      console.error(error);
    }
  };

  const handleUpdatePaymentStatus = async (orderId, status) => {
    try {
      await adminAPI.updateOrder(orderId, { payment_status: status });
      toast.success('Payment status updated');
      loadAdminData();
    } catch (error) {
      toast.error('Failed to update payment');
      console.error(error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600 font-medium">Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-primary border-b-4 border-accent">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading font-black text-2xl md:text-3xl text-white tracking-tight">CEMENTION ADMIN</h1>
              <p className="text-slate-300 text-sm">Admin Dashboard</p>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-slate-200 font-medium hidden md:inline">
                {user?.name || user?.phone}
              </span>
              
              <Button
                data-testid="admin-logout-button"
                onClick={handleLogout}
                variant="outline"
                className="h-10 px-4 bg-white/10 border-2 border-white/30 text-white hover:bg-white/20 rounded-sm"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-6 border-2 border-slate-200 rounded-sm">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-8 w-8 text-accent" />
              <div>
                <p className="text-sm text-slate-600 font-medium">Total Users</p>
                <p className="text-2xl font-mono font-bold text-slate-900">{stats?.total_users || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 border-2 border-yellow-200 rounded-sm">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-sm text-slate-600 font-medium">Pending Users</p>
                <p className="text-2xl font-mono font-bold text-yellow-600">{stats?.pending_users || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 border-2 border-slate-200 rounded-sm">
            <div className="flex items-center gap-3 mb-2">
              <ShoppingCart className="h-8 w-8 text-accent" />
              <div>
                <p className="text-sm text-slate-600 font-medium">Total Orders</p>
                <p className="text-2xl font-mono font-bold text-slate-900">{stats?.total_orders || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 border-2 border-green-200 rounded-sm">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-slate-600 font-medium">Completed</p>
                <p className="text-2xl font-mono font-bold text-green-600">{stats?.completed_orders || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 border-2 border-slate-200 rounded-sm">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="h-8 w-8 text-accent" />
              <div>
                <p className="text-sm text-slate-600 font-medium">Revenue</p>
                <p className="text-xl font-mono font-bold text-accent">{formatCurrency(stats?.total_revenue || 0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white border-2 border-slate-200 p-1 rounded-sm">
            <TabsTrigger value="users" className="data-[state=active]:bg-accent data-[state=active]:text-white rounded-sm">Pending Users</TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-accent data-[state=active]:text-white rounded-sm">Orders</TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:bg-accent data-[state=active]:text-white rounded-sm">Products</TabsTrigger>
          </TabsList>
          
          {/* Pending Users Tab */}
          <TabsContent value="users" className="mt-6">
            <div className="bg-white border-2 border-slate-200 rounded-sm">
              <div className="p-6 border-b-2 border-slate-200">
                <h2 className="font-heading font-bold text-xl text-slate-900">Pending User Approvals</h2>
              </div>
              
              {pendingUsers.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-slate-600">No pending user approvals</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Name/Phone</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Business Details</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">GST Details</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {pendingUsers.map((user) => (
                        <tr key={user.id} data-testid={`pending-user-${user.id}`}>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-slate-900">{user.name || 'N/A'}</p>
                              <p className="text-sm text-slate-600">{user.phone}</p>
                              {user.email && <p className="text-sm text-slate-500">{user.email}</p>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-sm">
                              {getRoleName(user.role)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              {user.business_name && <p className="text-slate-900 font-medium">{user.business_name}</p>}
                              {user.brand_shop_name && <p className="text-slate-600">{user.brand_shop_name}</p>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              {user.gst_number && <p className="text-slate-900 font-medium font-mono">{user.gst_number}</p>}
                              {user.gst_registered_name && <p className="text-slate-600">{user.gst_registered_name}</p>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <Button
                                data-testid={`approve-user-${user.id}`}
                                onClick={() => handleApproveUser(user.id)}
                                className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-sm"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                data-testid={`reject-user-${user.id}`}
                                onClick={() => handleRejectUser(user.id)}
                                variant="outline"
                                className="h-9 px-4 border-2 border-red-300 text-red-600 hover:bg-red-50 rounded-sm"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Orders Tab */}
          <TabsContent value="orders" className="mt-6">
            <div className="bg-white border-2 border-slate-200 rounded-sm">
              <div className="p-6 border-b-2 border-slate-200">
                <h2 className="font-heading font-bold text-xl text-slate-900">All Orders</h2>
              </div>
              
              {allOrders.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-slate-600">No orders yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {allOrders.map((order) => (
                    <div key={order.id} className="p-6" data-testid={`admin-order-${order.id}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-heading font-bold text-lg text-slate-900 mb-1">
                            Order #{order.order_number}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {new Date(order.created_at).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-mono font-bold text-xl text-accent mb-2">
                            {formatCurrency(order.total_amount)}
                          </p>
                          <div className="flex gap-2 justify-end">
                            <span className={`px-3 py-1 rounded-sm text-xs font-bold border ${getStatusColor(order.payment_status)}`}>
                              {order.payment_status}
                            </span>
                            <span className={`px-3 py-1 rounded-sm text-xs font-bold border ${getStatusColor(order.order_status)}`}>
                              {order.order_status}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-sm font-medium text-slate-700 block mb-1">Payment Status</label>
                          <select
                            data-testid={`payment-status-${order.id}`}
                            value={order.payment_status}
                            onChange={(e) => handleUpdatePaymentStatus(order.id, e.target.value)}
                            className="w-full h-10 px-3 border-2 border-slate-200 rounded-sm font-medium"
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="RECEIVED">RECEIVED</option>
                            <option value="FAILED">FAILED</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-slate-700 block mb-1">Order Status</label>
                          <select
                            data-testid={`order-status-${order.id}`}
                            value={order.order_status}
                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                            className="w-full h-10 px-3 border-2 border-slate-200 rounded-sm font-medium"
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="PAYMENT_RECEIVED">PAYMENT_RECEIVED</option>
                            <option value="ASSIGNED">ASSIGNED</option>
                            <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                            <option value="DELIVERED">DELIVERED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 p-4 rounded-sm">
                        <p className="text-sm font-medium text-slate-700 mb-2">Order Items:</p>
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm mb-1">
                            <span className="text-slate-700">{item.product_name} × {item.quantity}</span>
                            <span className="font-mono font-medium">{formatCurrency(item.total_price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Products Tab */}
          <TabsContent value="products" className="mt-6">
            <div className="bg-white border-2 border-slate-200 rounded-sm">
              <div className="p-6 border-b-2 border-slate-200">
                <h2 className="font-heading font-bold text-xl text-slate-900">Products Management</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Brand</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Dealer Price</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Retailer Price</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Customer Price</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {products.map((product) => (
                      <tr key={product.id} data-testid={`admin-product-${product.id}`}>
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-900">{product.name}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{product.brand}</td>
                        <td className="px-6 py-4">
                          <span className="font-mono font-medium text-slate-900">
                            {formatCurrency(product.base_price_dealer)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono font-medium text-slate-900">
                            {formatCurrency(product.base_price_retailer)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono font-medium text-slate-900">
                            {formatCurrency(product.base_price_customer)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono font-medium text-slate-900">
                            {product.stock_available}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-sm text-xs font-bold ${
                            product.is_active 
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {product.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPage;
