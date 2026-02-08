import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { authAPI } from '../api';
import { useAuth } from '../AuthContext';
import { formatPhone } from '../utils';
import { toast } from 'sonner';

const AuthPage = () => {
  const [step, setStep] = useState('phone'); // phone, otp, register
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSid, setOtpSid] = useState(null);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');
  
  const [formData, setFormData] = useState({
    role: 'CUSTOMER',
    name: '',
    email: '',
    business_name: '',
    brand_shop_name: '',
    gst_number: '',
    gst_registered_name: '',
  });
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formattedPhone = formatPhone(phone);
      const response = await authAPI.sendOTP(formattedPhone);
      
      if (response.data.success) {
        setOtpSid(response.data.sid);
        setStep('otp');
        
        if (response.data.otp) {
          setDemoOtp(response.data.otp);
          toast.info(`Demo OTP: ${response.data.otp}`);
        } else {
          toast.success('OTP sent successfully');
        }
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error('Failed to send OTP');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formattedPhone = formatPhone(phone);
      const verifyResponse = await authAPI.verifyOTP(formattedPhone, otp);
      
      if (verifyResponse.data.success) {
        // Try to login
        const loginResponse = await authAPI.login(formattedPhone);
        
        if (loginResponse.data.success) {
          login(loginResponse.data.user, loginResponse.data.token);
          toast.success('Login successful');
          
          if (loginResponse.data.user.role === 'ADMIN') {
            navigate('/admin');
          } else {
            navigate('/products');
          }
        } else {
          // User doesn't exist, go to registration
          setIsExistingUser(false);
          setStep('register');
        }
      } else {
        toast.error(verifyResponse.data.message);
      }
    } catch (error) {
      // User not found, proceed to registration
      if (error.response?.status === 404 || error.response?.data?.message?.includes('not found')) {
        setIsExistingUser(false);
        setStep('register');
        toast.info('Please complete registration');
      } else {
        toast.error('OTP verification failed');
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formattedPhone = formatPhone(phone);
      const registerData = {
        phone: formattedPhone,
        role: formData.role,
        name: formData.name || null,
        email: formData.email || null,
        business_name: formData.business_name || null,
        brand_shop_name: formData.brand_shop_name || null,
        gst_number: formData.gst_number || null,
        gst_registered_name: formData.gst_registered_name || null,
      };
      
      const response = await authAPI.register(registerData);
      
      if (response.data.success) {
        login(response.data.user, response.data.token);
        toast.success('Registration successful');
        
        if (response.data.user.status === 'PENDING') {
          toast.info('Your account is pending admin approval');
        }
        
        navigate('/products');
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error('Registration failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left side - Branding */}
      <div 
        className="hidden lg:flex lg:w-1/2 bg-cover bg-center relative"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1768796373360-95d80c5830fb?q=85')` }}
      >
        <div className="absolute inset-0 bg-slate-900/80"></div>
        <div className="relative z-10 p-12 flex flex-col justify-center text-white">
          <h1 className="font-heading font-black text-5xl mb-4 tracking-tight">CEMENTION</h1>
          <p className="font-body text-lg text-slate-200 max-w-md">
            India's trusted B2B cement marketplace. Buy bulk cement with transparent pricing and reliable delivery.
          </p>
        </div>
      </div>
      
      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="font-heading font-bold text-3xl text-slate-900 mb-2">
              {step === 'phone' && 'Welcome'}
              {step === 'otp' && 'Verify OTP'}
              {step === 'register' && 'Complete Registration'}
            </h2>
            <p className="text-slate-600">
              {step === 'phone' && 'Enter your phone number to continue'}
              {step === 'otp' && 'Enter the OTP sent to your phone'}
              {step === 'register' && 'Choose your role and provide details'}
            </p>
          </div>
          
          {step === 'phone' && (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <Label htmlFor="phone" className="font-medium text-slate-900">Phone Number</Label>
                <Input
                  id="phone"
                  data-testid="phone-input"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="mt-1.5 h-12 border-2 focus:border-accent"
                />
              </div>
              <Button 
                data-testid="send-otp-button"
                type="submit" 
                disabled={loading} 
                className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-bold rounded-sm shadow-md active:translate-y-[1px]"
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </Button>
            </form>
          )}
          
          {step === 'otp' && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              {demoOtp && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-sm">
                  <p className="text-sm font-mono text-orange-800">Demo OTP: <strong>{demoOtp}</strong></p>
                </div>
              )}
              <div>
                <Label htmlFor="otp" className="font-medium text-slate-900">Enter OTP</Label>
                <Input
                  id="otp"
                  data-testid="otp-input"
                  type="text"
                  placeholder="6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  className="mt-1.5 h-12 border-2 focus:border-accent"
                />
              </div>
              <Button 
                data-testid="verify-otp-button"
                type="submit" 
                disabled={loading} 
                className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-bold rounded-sm shadow-md active:translate-y-[1px]"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </Button>
              <Button 
                data-testid="back-button"
                type="button" 
                variant="outline"
                onClick={() => setStep('phone')} 
                className="w-full h-12 border-2 border-slate-300 hover:bg-slate-50 rounded-sm"
              >
                Back
              </Button>
            </form>
          )}
          
          {step === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Label className="font-medium text-slate-900 mb-3 block">Select Role</Label>
                <RadioGroup 
                  value={formData.role} 
                  onValueChange={(value) => setFormData({...formData, role: value})}
                >
                  <div className="flex items-center space-x-2 p-3 border-2 border-slate-200 rounded-sm hover:border-accent">
                    <RadioGroupItem value="CUSTOMER" id="customer" data-testid="role-customer" />
                    <Label htmlFor="customer" className="cursor-pointer flex-1">Customer</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border-2 border-slate-200 rounded-sm hover:border-accent">
                    <RadioGroupItem value="RETAILER" id="retailer" data-testid="role-retailer" />
                    <Label htmlFor="retailer" className="cursor-pointer flex-1">Retailer</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border-2 border-slate-200 rounded-sm hover:border-accent">
                    <RadioGroupItem value="DEALER" id="dealer" data-testid="role-dealer" />
                    <Label htmlFor="dealer" className="cursor-pointer flex-1">Dealer</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div>
                <Label htmlFor="name" className="font-medium text-slate-900">Full Name</Label>
                <Input
                  id="name"
                  data-testid="name-input"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="mt-1.5 h-12 border-2 focus:border-accent"
                />
              </div>
              
              <div>
                <Label htmlFor="email" className="font-medium text-slate-900">Email</Label>
                <Input
                  id="email"
                  data-testid="email-input"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="mt-1.5 h-12 border-2 focus:border-accent"
                />
              </div>
              
              {(formData.role === 'DEALER' || formData.role === 'RETAILER') && (
                <>
                  <div>
                    <Label htmlFor="business_name" className="font-medium text-slate-900">Business Name *</Label>
                    <Input
                      id="business_name"
                      data-testid="business-name-input"
                      type="text"
                      value={formData.business_name}
                      onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                      required
                      className="mt-1.5 h-12 border-2 focus:border-accent"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="brand_shop_name" className="font-medium text-slate-900">Brand/Shop Name *</Label>
                    <Input
                      id="brand_shop_name"
                      data-testid="shop-name-input"
                      type="text"
                      value={formData.brand_shop_name}
                      onChange={(e) => setFormData({...formData, brand_shop_name: e.target.value})}
                      required
                      className="mt-1.5 h-12 border-2 focus:border-accent"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="gst_number" className="font-medium text-slate-900">GST Number *</Label>
                    <Input
                      id="gst_number"
                      data-testid="gst-number-input"
                      type="text"
                      value={formData.gst_number}
                      onChange={(e) => setFormData({...formData, gst_number: e.target.value.toUpperCase()})}
                      required
                      className="mt-1.5 h-12 border-2 focus:border-accent"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="gst_registered_name" className="font-medium text-slate-900">GST Registered Name *</Label>
                    <Input
                      id="gst_registered_name"
                      data-testid="gst-name-input"
                      type="text"
                      value={formData.gst_registered_name}
                      onChange={(e) => setFormData({...formData, gst_registered_name: e.target.value})}
                      required
                      className="mt-1.5 h-12 border-2 focus:border-accent"
                    />
                  </div>
                </>
              )}
              
              <Button 
                data-testid="register-button"
                type="submit" 
                disabled={loading} 
                className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-bold rounded-sm shadow-md active:translate-y-[1px]"
              >
                {loading ? 'Registering...' : 'Complete Registration'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
