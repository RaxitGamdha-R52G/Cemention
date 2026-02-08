import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { addressAPI, ordersAPI, cartAPI } from '../api';
import { formatCurrency } from '../utils';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const CheckoutPage = () => {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [addressForm, setAddressForm] = useState({
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    is_default: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [addressRes, cartRes] = await Promise.all([
        addressAPI.getAll(),
        cartAPI.get()
      ]);
      
      setAddresses(addressRes.data);
      if (addressRes.data.length > 0) {
        const defaultAddr = addressRes.data.find(a => a.is_default) || addressRes.data[0];
        setSelectedAddress(defaultAddr.id);
      }
      
      setCart(cartRes.data);
    } catch (error) {
      toast.error('Failed to load checkout data');
      console.error(error);
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    
    try {
      await addressAPI.create(addressForm);
      toast.success('Address added');
      setShowAddressForm(false);
      loadData();
    } catch (error) {
      toast.error('Failed to add address');
      console.error(error);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        delivery_address_id: selectedAddress,
        payment_method: paymentMethod
      };
      
      const response = await ordersAPI.create(orderData);
      toast.success('Order placed successfully!');
      navigate(`/orders`);
    } catch (error) {
      toast.error('Failed to place order');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const subtotal = cart.total;
  const gst = Math.round(subtotal * 0.18);
  const surcharge = paymentMethod === 'CARD' ? Math.round(subtotal * 0.02) : 0;
  const total = subtotal + gst + surcharge;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 flex items-center gap-4">
          <Button
            data-testid="back-to-cart"
            onClick={() => navigate('/cart')}
            variant="outline"
            className="h-10 px-4 border-2 rounded-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cart
          </Button>
          
          <h1 className="font-heading font-bold text-3xl text-slate-900">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Address */}
            <div className="bg-white p-6 border-2 border-slate-200 rounded-sm">
              <h2 className="font-heading font-bold text-xl text-slate-900 mb-4">Delivery Address</h2>
              
              {addresses.length === 0 && !showAddressForm ? (
                <div>
                  <p className="text-slate-600 mb-4">No delivery addresses found</p>
                  <Button
                    data-testid="add-address-button"
                    onClick={() => setShowAddressForm(true)}
                    className="h-10 px-4 bg-accent hover:bg-accent/90 text-white font-bold rounded-sm"
                  >
                    Add Address
                  </Button>
                </div>
              ) : showAddressForm ? (
                <form onSubmit={handleAddAddress} className="space-y-4">
                  <div>
                    <Label htmlFor="address_line1">Address Line 1 *</Label>
                    <Input
                      id="address_line1"
                      data-testid="address-line1-input"
                      value={addressForm.address_line1}
                      onChange={(e) => setAddressForm({...addressForm, address_line1: e.target.value})}
                      required
                      className="mt-1.5 h-11 border-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address_line2">Address Line 2</Label>
                    <Input
                      id="address_line2"
                      value={addressForm.address_line2}
                      onChange={(e) => setAddressForm({...addressForm, address_line2: e.target.value})}
                      className="mt-1.5 h-11 border-2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        data-testid="city-input"
                        value={addressForm.city}
                        onChange={(e) => setAddressForm({...addressForm, city: e.target.value})}
                        required
                        className="mt-1.5 h-11 border-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        data-testid="state-input"
                        value={addressForm.state}
                        onChange={(e) => setAddressForm({...addressForm, state: e.target.value})}
                        required
                        className="mt-1.5 h-11 border-2"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="pincode">Pincode *</Label>
                    <Input
                      id="pincode"
                      data-testid="pincode-input"
                      value={addressForm.pincode}
                      onChange={(e) => setAddressForm({...addressForm, pincode: e.target.value})}
                      required
                      maxLength={6}
                      className="mt-1.5 h-11 border-2"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" data-testid="save-address-button" className="h-10 px-4 bg-accent hover:bg-accent/90 text-white font-bold rounded-sm">
                      Save Address
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowAddressForm(false)} className="h-10 px-4 border-2 rounded-sm">
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <RadioGroup value={selectedAddress} onValueChange={setSelectedAddress}>
                    {addresses.map((addr) => (
                      <div key={addr.id} className="flex items-start space-x-3 p-3 border-2 border-slate-200 rounded-sm hover:border-accent">
                        <RadioGroupItem value={addr.id} id={addr.id} data-testid={`address-${addr.id}`} />
                        <Label htmlFor={addr.id} className="cursor-pointer flex-1">
                          <div className="font-medium text-slate-900">{addr.address_line1}</div>
                          {addr.address_line2 && <div className="text-sm text-slate-600">{addr.address_line2}</div>}
                          <div className="text-sm text-slate-600">{addr.city}, {addr.state} - {addr.pincode}</div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <Button
                    onClick={() => setShowAddressForm(true)}
                    variant="outline"
                    className="h-10 px-4 border-2 rounded-sm"
                  >
                    Add New Address
                  </Button>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="bg-white p-6 border-2 border-slate-200 rounded-sm">
              <h2 className="font-heading font-bold text-xl text-slate-900 mb-4">Payment Method</h2>
              
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="flex items-center space-x-3 p-3 border-2 border-slate-200 rounded-sm hover:border-accent">
                  <RadioGroupItem value="UPI" id="upi" data-testid="payment-upi" />
                  <Label htmlFor="upi" className="cursor-pointer flex-1">UPI Payment</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border-2 border-slate-200 rounded-sm hover:border-accent">
                  <RadioGroupItem value="BANK_TRANSFER" id="bank" data-testid="payment-bank" />
                  <Label htmlFor="bank" className="cursor-pointer flex-1">Bank Transfer (Manual Verification)</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border-2 border-slate-200 rounded-sm hover:border-accent">
                  <RadioGroupItem value="CARD" id="card" data-testid="payment-card" />
                  <Label htmlFor="card" className="cursor-pointer flex-1">
                    <div>Card Payment</div>
                    <div className="text-xs text-orange-600 font-medium">2% surcharge applies</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border-2 border-slate-200 rounded-sm hover:border-accent">
                  <RadioGroupItem value="COD" id="cod" data-testid="payment-cod" />
                  <Label htmlFor="cod" className="cursor-pointer flex-1">Cash on Delivery</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 border-2 border-slate-200 rounded-sm sticky top-4">
              <h2 className="font-heading font-bold text-xl text-slate-900 mb-4">Order Summary</h2>
              
              <div className="space-y-2 mb-4 pb-4 border-b-2 border-slate-100">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST (18%)</span>
                  <span className="font-mono font-medium">{formatCurrency(gst)}</span>
                </div>
                {surcharge > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Card Surcharge (2%)</span>
                    <span className="font-mono font-medium">{formatCurrency(surcharge)}</span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between text-lg font-bold text-slate-900 mb-6">
                <span>Total</span>
                <span className="font-mono text-2xl text-accent">{formatCurrency(total)}</span>
              </div>
              
              <Button
                data-testid="place-order-button"
                onClick={handlePlaceOrder}
                disabled={loading || !selectedAddress}
                className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-bold rounded-sm shadow-md active:translate-y-[1px]"
              >
                {loading ? 'Placing Order...' : 'Place Order'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
