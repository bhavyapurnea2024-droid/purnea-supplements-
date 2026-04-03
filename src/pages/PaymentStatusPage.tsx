import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { doc, getDoc, updateDoc, addDoc, collection, increment, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logAction } from '../firebase';
import { useAuth } from '../AuthContext';
import { useCart } from '../CartContext';
import { toast } from 'sonner';
import { AI_TRAINER_BASE_PRICE, AI_TRAINER_SESSION_DURATION } from '../constants';

const PaymentStatusPage = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const { user } = useAuth();
  const { clearCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const verifyPayment = async () => {
      if (!orderId || !user) return;

      try {
        // 1. Verify with backend
        const response = await fetch(`/api/payment/verify-order/${orderId}`);
        const data = await response.json();

        if (data.order_status === 'PAID') {
          // Check if it's a trainer order
          if (orderId.startsWith('trainer_')) {
            const sessionRef = doc(db, 'trainer_sessions', orderId);
            const sessionSnap = await getDoc(sessionRef);

            if (!sessionSnap.exists()) {
              const now = new Date();
              const expiresAt = new Date(now.getTime() + AI_TRAINER_SESSION_DURATION);
              
              await setDoc(sessionRef, {
                userId: user.uid,
                status: 'active',
                paymentStatus: 'completed',
                amount: AI_TRAINER_BASE_PRICE,
                messages: [
                  {
                    role: 'model',
                    text: `Namaste! I am your Personal Trainer. I'm honored to help you on your fitness journey. To create the perfect Indian diet and workout plan for you, I need to understand you better. \n\nFirst, would you like to talk in **Hinglish** or **English**?`,
                    timestamp: new Date().toISOString()
                  }
                ],
                createdAt: now.toISOString(),
                expiresAt: expiresAt.toISOString(),
              });

              await logAction(user.uid, user.email || '', user.displayName || '', 'PURCHASE_AI_TRAINER', `Purchased Your Trainer session for ₹${AI_TRAINER_BASE_PRICE} (Cashfree Payment)`, 'user');
              toast.success('Trainer session activated!');
            }
            setStatus('success');
            return;
          }

          // 2. Update Firestore order status
          const orderRef = doc(db, 'orders', orderId);
          const orderSnap = await getDoc(orderRef);

          if (orderSnap.exists()) {
            const orderData = orderSnap.data();
            
            if (orderData.paymentStatus !== 'completed') {
              await updateDoc(orderRef, {
                paymentStatus: 'completed',
                updatedAt: new Date().toISOString(),
              });

              await logAction(user.uid, user.email || '', user.displayName || '', 'PAYMENT_SUCCESS', `Payment successful for order #${orderId.slice(-6)}`, 'user');

              // 3. Handle referral commission if applicable
              if (orderData.referralUserId && orderData.couponUsed) {
                // We need to re-fetch the coupon to get the commission rate
                // For simplicity, we'll assume the orderData already has the necessary info
                // or we could fetch it here.
                // Let's assume the referral logic was already handled or we handle it now.
                // In the checkout page, we'll save the commission amount to the order data for easier access here.
                
                if (orderData.commissionAmount) {
                  await addDoc(collection(db, 'referrals'), {
                    couponOwnerId: orderData.referralUserId,
                    orderId: orderId,
                    amount: orderData.commissionAmount,
                    orderTotal: orderData.totalAmount,
                    customerName: orderData.shippingAddress.fullName,
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                  });

                  const userRef = doc(db, 'users', orderData.referralUserId);
                  await updateDoc(userRef, {
                    'wallet.pending': increment(orderData.commissionAmount),
                    'wallet.totalEarned': increment(orderData.commissionAmount),
                  });
                }
              }

              clearCart();
              toast.success('Payment Successful!');
            }
            setOrderDetails(orderData);
            setStatus('success');
          } else {
            setStatus('failed');
          }
        } else {
          setStatus('failed');
        }
      } catch (error) {
        console.error('Verification Error:', error);
        setStatus('failed');
      }
    };

    verifyPayment();
  }, [orderId, user, clearCart]);

  if (status === 'loading') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-orange-600 animate-spin mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Verifying Payment...</h2>
        <p className="text-gray-500 mt-2 text-center">Please do not close this window or go back.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
      {status === 'success' ? (
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-gray-100 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-2">Order Confirmed!</h2>
          <p className="text-gray-500 mb-8">
            {orderId?.startsWith('trainer_') 
              ? "Your Personal Trainer is now active and waiting for you."
              : `Thank you for your purchase. Your order #${orderId?.slice(-6).toUpperCase()} has been placed successfully.`}
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => navigate(orderId?.startsWith('trainer_') ? '/ai-trainer' : '/orders')}
              className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
            >
              {orderId?.startsWith('trainer_') ? 'Go to Trainer Chat' : 'View Order History'} <ArrowRight className="w-5 h-5" />
            </button>
            <button 
              onClick={() => navigate('/shop')}
              className="w-full bg-white text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-gray-100 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-2">Payment Failed</h2>
          <p className="text-gray-500 mb-8">
            We couldn't process your payment. If any amount was deducted, it will be refunded automatically.
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/checkout')}
              className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold hover:bg-orange-700 transition-all"
            >
              Try Again
            </button>
            <button 
              onClick={() => navigate('/cart')}
              className="w-full bg-white text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all"
            >
              Back to Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentStatusPage;
