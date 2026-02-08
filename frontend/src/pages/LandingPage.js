import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Package, Truck, Shield, Users, ArrowRight } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div 
        className="relative h-[90vh] bg-cover bg-center"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1768796373360-95d80c5830fb?q=85')` }}
      >
        <div className="absolute inset-0 bg-slate-900/75"></div>
        
        <div className="relative z-10 container mx-auto px-4 h-full flex items-center">
          <div className="max-w-3xl">
            <h1 className="font-heading font-black text-5xl md:text-7xl text-white mb-6 tracking-tight leading-none">
              CEMENTION
            </h1>
            <p className="font-body text-xl md:text-2xl text-slate-200 mb-8 leading-relaxed">
              India's most trusted B2B cement marketplace. Fixed role-based pricing. Bulk orders starting from 100 bags. GST-compliant invoices. Reliable delivery.
            </p>
            <div className="flex gap-4">
              <Button 
                data-testid="get-started-button"
                onClick={() => navigate('/auth')}
                className="h-14 px-8 bg-accent hover:bg-accent/90 text-white font-bold text-lg rounded-sm shadow-md active:translate-y-[1px]"
              >
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                onClick={() => navigate('/products')}
                variant="outline"
                className="h-14 px-8 border-2 border-white bg-white/10 text-white hover:bg-white/20 font-bold text-lg rounded-sm backdrop-blur-sm"
              >
                View Products
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-slate-50">
        <div className="container mx-auto px-4">
          <h2 className="font-heading font-bold text-4xl text-center text-slate-900 mb-16">
            Why Choose Cemention?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-8 border-2 border-slate-200 rounded-sm shadow-sm hover:border-accent transition-colors">
              <Package className="h-12 w-12 text-accent mb-4" />
              <h3 className="font-heading font-bold text-xl text-slate-900 mb-2">Bulk Orders</h3>
              <p className="text-slate-600">Minimum 100 bags per order. Flexible quantities in multiples of 50.</p>
            </div>
            
            <div className="bg-white p-8 border-2 border-slate-200 rounded-sm shadow-sm hover:border-accent transition-colors">
              <Users className="h-12 w-12 text-accent mb-4" />
              <h3 className="font-heading font-bold text-xl text-slate-900 mb-2">Fixed Pricing</h3>
              <p className="text-slate-600">Role-based transparent pricing for dealers, retailers, and customers.</p>
            </div>
            
            <div className="bg-white p-8 border-2 border-slate-200 rounded-sm shadow-sm hover:border-accent transition-colors">
              <Shield className="h-12 w-12 text-accent mb-4" />
              <h3 className="font-heading font-bold text-xl text-slate-900 mb-2">GST Compliant</h3>
              <p className="text-slate-600">Auto-generated GST invoices for all transactions.</p>
            </div>
            
            <div className="bg-white p-8 border-2 border-slate-200 rounded-sm shadow-sm hover:border-accent transition-colors">
              <Truck className="h-12 w-12 text-accent mb-4" />
              <h3 className="font-heading font-bold text-xl text-slate-900 mb-2">Reliable Delivery</h3>
              <p className="text-slate-600">Track your orders with assigned driver details and vehicle info.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-heading font-bold text-4xl text-white mb-4">
            Ready to Start Ordering?
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Join thousands of dealers, retailers, and builders across India.
          </p>
          <Button 
            data-testid="cta-button"
            onClick={() => navigate('/auth')}
            className="h-14 px-12 bg-accent hover:bg-accent/90 text-white font-bold text-lg rounded-sm shadow-md active:translate-y-[1px]"
          >
            Get Started Today
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slate-400">&copy; 2024 Cemention. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
