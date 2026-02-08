import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../AuthContext';
import { productsAPI, cartAPI } from '../api';
import { formatCurrency } from '../utils';
import { ShoppingCart, Plus, Minus, LogOut } from 'lucide-react';
import { toast } from 'sonner';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadProducts();
    loadCart();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(response.data);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Account pending approval. Please wait for admin approval.');
      } else {
        toast.error('Failed to load products');
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadCart = async () => {
    try {
      const response = await cartAPI.get();
      setCartCount(response.data.items?.length || 0);
    } catch (error) {
      console.error('Failed to load cart:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600 font-medium">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-primary border-b-4 border-accent">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="font-heading font-black text-2xl md:text-3xl text-white tracking-tight">CEMENTION</h1>
            
            <div className="flex items-center gap-4">
              {user && (
                <span className="text-slate-200 font-medium hidden md:inline">
                  {user.name || user.phone}
                </span>
              )}
              
              <Button
                data-testid="cart-button"
                onClick={() => navigate('/cart')}
                variant="outline"
                className="relative h-10 px-4 bg-white/10 border-2 border-white/30 text-white hover:bg-white/20 rounded-sm"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-accent text-white font-bold text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Button>
              
              <Button
                data-testid="orders-button"
                onClick={() => navigate('/orders')}
                variant="outline"
                className="h-10 px-4 bg-white/10 border-2 border-white/30 text-white hover:bg-white/20 rounded-sm"
              >
                My Orders
              </Button>
              
              <Button
                data-testid="logout-button"
                onClick={handleLogout}
                variant="outline"
                className="h-10 px-3 bg-white/10 border-2 border-white/30 text-white hover:bg-white/20 rounded-sm"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Pending Approval Banner */}
      {user && user.status === 'PENDING' && (
        <div className="bg-yellow-50 border-b-2 border-yellow-200">
          <div className="container mx-auto px-4 py-3">
            <p className="text-yellow-800 font-medium text-center">
              Your account is pending admin approval. You can browse but cannot place orders yet.
            </p>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="font-heading font-bold text-3xl text-slate-900 mb-2">Available Products</h2>
          <p className="text-slate-600">Minimum order: 100 bags | Increments: 50 bags</p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600 text-lg">No products available at the moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onAddToCart={loadCart}
                disabled={user?.status === 'PENDING'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ProductCard = ({ product, onAddToCart, disabled }) => {
  const [quantity, setQuantity] = useState(100);
  const [loading, setLoading] = useState(false);

  const adjustQuantity = (delta) => {
    const newQty = quantity + delta;
    if (newQty >= 100) {
      setQuantity(newQty);
    }
  };

  const handleAddToCart = async () => {
    if (quantity < 100) {
      toast.error('Minimum order quantity is 100 bags');
      return;
    }

    setLoading(true);
    try {
      await cartAPI.add(product.id, quantity);
      toast.success('Added to cart');
      onAddToCart();
    } catch (error) {
      toast.error('Failed to add to cart');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const total = quantity * product.user_price;

  return (
    <div 
      className="bg-white border-2 border-slate-200 rounded-sm shadow-sm hover:border-accent transition-colors"
      data-testid={`product-card-${product.id}`}
    >
      {product.image_url && (
        <img 
          src={product.image_url} 
          alt={product.name}
          className="w-full h-48 object-cover"
        />
      )}
      
      <div className="p-6">
        <h3 className="font-heading font-bold text-xl text-slate-900 mb-1">{product.name}</h3>
        <p className="text-sm text-slate-500 mb-3">{product.brand}</p>
        
        {product.description && (
          <p className="text-sm text-slate-600 mb-4">{product.description}</p>
        )}
        
        <div className="mb-4">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-mono font-bold text-2xl text-accent">
              {formatCurrency(product.user_price)}
            </span>
            <span className="text-sm text-slate-600">per bag</span>
          </div>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
            Min. order: {product.min_quantity} bags
          </p>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Quantity (bags)</label>
            <div className="flex items-center gap-2">
              <Button
                data-testid={`decrease-qty-${product.id}`}
                onClick={() => adjustQuantity(-50)}
                disabled={quantity <= 100 || disabled}
                variant="outline"
                className="h-10 w-10 p-0 border-2 rounded-sm"
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <Input
                data-testid={`qty-input-${product.id}`}
                type="number"
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 100;
                  if (val >= 100) setQuantity(val);
                }}
                className="h-10 text-center font-mono font-medium border-2 rounded-sm"
                min={100}
                step={50}
                disabled={disabled}
              />
              
              <Button
                data-testid={`increase-qty-${product.id}`}
                onClick={() => adjustQuantity(50)}
                disabled={disabled}
                variant="outline"
                className="h-10 w-10 p-0 border-2 rounded-sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="pt-3 border-t-2 border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-700">Total</span>
              <span className="font-mono font-bold text-xl text-slate-900">
                {formatCurrency(total)}
              </span>
            </div>
            
            <Button
              data-testid={`add-to-cart-${product.id}`}
              onClick={handleAddToCart}
              disabled={loading || disabled || quantity < 100}
              className="w-full h-11 bg-accent hover:bg-accent/90 text-white font-bold rounded-sm shadow-md active:translate-y-[1px]"
            >
              {loading ? 'Adding...' : 'Add to Cart'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
