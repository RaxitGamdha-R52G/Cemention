import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { cartAPI, productsAPI, addressAPI, ordersAPI } from '../api';
import { formatCurrency } from '../utils';
import { Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const CartPage = () => {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const [cartRes, productsRes] = await Promise.all([
        cartAPI.get(),
        productsAPI.getAll()
      ]);
      
      setCart(cartRes.data);
      
      // Create product map
      const productMap = {};
      productsRes.data.forEach(p => {
        productMap[p.id] = p;
      });
      setProducts(productMap);
    } catch (error) {
      toast.error('Failed to load cart');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (productId) => {
    try {
      await cartAPI.remove(productId);
      toast.success('Item removed');
      loadCart();
    } catch (error) {
      toast.error('Failed to remove item');
      console.error(error);
    }
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600 font-medium">Loading cart...</p>
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
          
          <h1 className="font-heading font-bold text-3xl text-slate-900">Shopping Cart</h1>
        </div>

        {cart.items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600 text-lg mb-4">Your cart is empty</p>
            <Button
              onClick={() => navigate('/products')}
              className="h-12 px-8 bg-accent hover:bg-accent/90 text-white font-bold rounded-sm"
            >
              Browse Products
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item) => {
                const product = products[item.product_id];
                if (!product) return null;
                
                const itemTotal = item.quantity * item.price_per_bag;
                
                return (
                  <div 
                    key={item.product_id}
                    className="bg-white p-6 border-2 border-slate-200 rounded-sm"
                    data-testid={`cart-item-${item.product_id}`}
                  >
                    <div className="flex justify-between">
                      <div className="flex-1">
                        <h3 className="font-heading font-bold text-xl text-slate-900">{product.name}</h3>
                        <p className="text-sm text-slate-500 mb-2">{product.brand}</p>
                        
                        <div className="space-y-1">
                          <p className="text-sm text-slate-600">
                            Quantity: <span className="font-mono font-medium">{item.quantity} bags</span>
                          </p>
                          <p className="text-sm text-slate-600">
                            Price per bag: <span className="font-mono font-medium">{formatCurrency(item.price_per_bag)}</span>
                          </p>
                          <p className="text-base font-medium text-slate-900 mt-2">
                            Total: <span className="font-mono font-bold text-accent">{formatCurrency(itemTotal)}</span>
                          </p>
                        </div>
                      </div>
                      
                      <Button
                        data-testid={`remove-item-${item.product_id}`}
                        onClick={() => handleRemove(item.product_id)}
                        variant="outline"
                        className="h-10 w-10 p-0 border-2 border-red-200 text-red-600 hover:bg-red-50 rounded-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 border-2 border-slate-200 rounded-sm sticky top-4">
                <h2 className="font-heading font-bold text-xl text-slate-900 mb-4">Order Summary</h2>
                
                <div className="space-y-2 mb-4 pb-4 border-b-2 border-slate-100">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-mono font-medium">{formatCurrency(cart.total)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST (18%)</span>
                    <span className="font-mono font-medium">{formatCurrency(Math.round(cart.total * 0.18))}</span>
                  </div>
                </div>
                
                <div className="flex justify-between text-lg font-bold text-slate-900 mb-6">
                  <span>Total</span>
                  <span className="font-mono text-2xl text-accent">{formatCurrency(Math.round(cart.total * 1.18))}</span>
                </div>
                
                <Button
                  data-testid="proceed-to-checkout"
                  onClick={handleCheckout}
                  className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-bold rounded-sm shadow-md active:translate-y-[1px]"
                >
                  Proceed to Checkout
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
