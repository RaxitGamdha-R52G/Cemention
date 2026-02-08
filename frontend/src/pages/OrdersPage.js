import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ordersAPI } from '../api';
import { formatCurrency, getStatusColor } from '../utils';
import { ArrowLeft, Package } from 'lucide-react';
import { toast } from 'sonner';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await ordersAPI.getMyOrders();
      setOrders(response.data);
    } catch (error) {
      toast.error('Failed to load orders');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600 font-medium">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 flex items-center gap-4">
          <Button
            data-testid="back-to-products"
            onClick={() => navigate('/products')}
            variant="outline"
            className="h-10 px-4 border-2 rounded-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
          
          <h1 className="font-heading font-bold text-3xl text-slate-900">My Orders</h1>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 text-lg mb-4">No orders yet</p>
            <Button
              onClick={() => navigate('/products')}
              className="h-12 px-8 bg-accent hover:bg-accent/90 text-white font-bold rounded-sm"
            >
              Start Shopping
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div 
                key={order.id}
                className="bg-white p-6 border-2 border-slate-200 rounded-sm"
                data-testid={`order-${order.id}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-heading font-bold text-xl text-slate-900 mb-1">
                      Order #{order.order_number}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-sm text-xs font-bold border ${getStatusColor(order.payment_status)}`}>
                      {order.payment_status}
                    </span>
                    <span className={`px-3 py-1 rounded-sm text-xs font-bold border ${getStatusColor(order.order_status)}`}>
                      {order.order_status}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-slate-700">
                        {item.product_name} × {item.quantity} bags
                      </span>
                      <span className="font-mono font-medium text-slate-900">
                        {formatCurrency(item.total_price)}
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className="pt-4 border-t-2 border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-700">Total Amount</span>
                    <span className="font-mono font-bold text-2xl text-accent">
                      {formatCurrency(order.total_amount)}
                    </span>
                  </div>
                  
                  {order.driver_name && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-sm">
                      <p className="text-sm font-medium text-blue-900 mb-1">Driver Details</p>
                      <p className="text-sm text-blue-800">
                        {order.driver_name} | {order.driver_mobile}
                      </p>
                      {order.vehicle_number && (
                        <p className="text-sm text-blue-800">Vehicle: {order.vehicle_number}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
