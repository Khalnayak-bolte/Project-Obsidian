import React, { useState } from 'react';
import { apiPost } from '../../lib/axios';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface CheckoutProps {
  amount: number; // in paise
  currency?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  buttonClassName?: string;
  children?: React.ReactNode;
}

export function CheckoutModal({ 
  amount, 
  currency = 'INR', 
  onSuccess, 
  onError,
  buttonClassName,
  children
}: CheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handlePayment = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      // 1. Create order on backend
      const res = await apiPost<{ success: boolean; data: { order_id: string; amount: number; currency: string } }>(
        '/api/v1/payments/create-order',
        { amount, currency }
      );

      if (!res.success || !res.data?.order_id) {
        throw new Error('Failed to create order');
      }

      const { order_id } = res.data;

      // 2. Open Razorpay checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: res.data.amount,
        currency: res.data.currency,
        name: 'Obsidian OS',
        description: 'Standard Payment Checkout',
        order_id: order_id,
        handler: async function (response: any) {
          try {
            // 3. Verify payment signature
            const verifyRes = await apiPost<{ success: boolean; message: string }>(
              '/api/v1/payments/verify-payment',
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }
            );

            if (verifyRes.success) {
              if (onSuccess) onSuccess();
            } else {
              const errMsg = 'Payment verification failed';
              setErrorMsg(errMsg);
              if (onError) onError(errMsg);
            }
          } catch (err: any) {
            console.error('Verify error:', err);
            const errMsg = err.response?.data?.error?.message || err.message || 'Payment verification failed';
            setErrorMsg(errMsg);
            if (onError) onError(errMsg);
          }
        },
        theme: {
          color: '#3B82F6',
        },
      };

      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', function (response: any) {
        console.error('Payment failed event:', response.error);
        const errMsg = response.error.description || 'Payment failed';
        setErrorMsg(errMsg);
        if (onError) onError(errMsg);
      });

      rzp.open();
    } catch (err: any) {
      console.error('Checkout error:', err);
      const msg = err.response?.data?.error?.message || err.message || 'Error initializing payment';
      setErrorMsg(msg);
      if (onError) onError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <button
        onClick={handlePayment}
        disabled={loading}
        className={buttonClassName || "px-6 py-3 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"}
      >
        {loading ? 'Processing...' : (children || `Pay ₹${(amount / 100).toFixed(2)}`)}
      </button>
      {errorMsg && <p className="text-red-500 text-sm mt-1">{errorMsg}</p>}
    </div>
  );
}
