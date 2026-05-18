import React from 'react';
import { CheckoutModal } from './CheckoutModal';

export function BillingDashboard() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-white">Billing Dashboard</h1>
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-sm">
        <h2 className="text-xl font-semibold mb-4 text-white">Standard Checkout Test</h2>
        <p className="text-gray-400 mb-6">
          Click the button below to test the Razorpay Standard Checkout flow.
          This will create a 100 paise (₹1.00) test payment.
        </p>
        
        <CheckoutModal 
          amount={100} // Minimum 100 paise
          onSuccess={() => alert('Payment successful!')}
          onError={(err) => alert(`Payment error: ${err}`)}
        />
      </div>
    </div>
  );
}
