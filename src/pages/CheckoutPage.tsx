import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, increment, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth, logAction } from '../firebase';
import { useCart } from '../CartContext';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';
import { ChevronRight, ShieldCheck, CreditCard, Truck, CheckCircle2, AlertCircle, ShoppingBag, ArrowRight, Wallet, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Order, UserProfile } from '../types';
import { DEFAULT_DISCOUNT_RATE, DEFAULT_COMMISSION_RATE, WHATSAPP_NUMBER } from '../constants';

const DELIVERY_CHARGE = 0;

const CheckoutPage = () => {
  const { items, subtotal, clearCart } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ 
    code: string; 
    userId: string; 
    discount: number; 
    commissionRate: number;
    applicableSubtotal: number;
  } | null>(null);
  
  const [address, setAddress] = useState({
    fullName: user?.displayName || '',
    addressLine1: '',
    city: 'Purnea',
    state: 'Bihar',
    zipCode: '',
    phone: '',
  });
  const [globalSettings, setGlobalSettings] = useState<any>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        setGlobalSettings(snapshot.data());
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (items.length === 0) {
      navigate('/shop');
    }
    if (!user) {
      toast.error('Please sign in to checkout');
      navigate('/shop');
    }
  }, [items, user, navigate]);

  const [paymentStep, setPaymentStep] = useState<'selection' | 'processing' | 'success'>('selection');
  const [paymentMethod, setPaymentMethod] = useState<'whatsapp' | 'wallet'>('whatsapp');

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('couponCode', '==', couponCode.toUpperCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast.error('Invalid coupon code');
        setAppliedCoupon(null);
      } else {
        const couponOwner = querySnapshot.docs[0].data() as UserProfile;
        if (couponOwner.isCouponDisabled) {
          toast.error('This coupon code is currently disabled');
          setAppliedCoupon(null);
        } else if (couponOwner.uid === user?.uid) {
          toast.error('You cannot use your own coupon code');
          setAppliedCoupon(null);
        } else {
          const commissionRate = couponOwner.customCommissionRate || globalSettings?.defaultCommissionRate || DEFAULT_COMMISSION_RATE;
          const discountRate = couponOwner.customDiscountRate || globalSettings?.defaultDiscountRate || DEFAULT_DISCOUNT_RATE;
          const allowedCategories = couponOwner.allowedCouponCategories || [];
          
          let applicableSubtotal = 0;
          items.forEach(item => {
            if (allowedCategories.length === 0 || allowedCategories.includes(item.category)) {
              applicableSubtotal += item.price * item.quantity;
            }
          });

          if (applicableSubtotal === 0) {
            toast.error(`This coupon is only valid for categories: ${allowedCategories.join(', ')}`);
            setAppliedCoupon(null);
            return;
          }

          const discount = applicableSubtotal * discountRate;
          setAppliedCoupon({
            code: couponCode.toUpperCase(),
            userId: couponOwner.uid,
            discount,
            commissionRate,
            applicableSubtotal
          });
          toast.success(`Coupon applied! ${(discountRate * 100).toFixed(0)}% discount added for applicable items.`);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'users');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppPayment = async () => {
    if (!user) return;
    setLoading(true);
    
    const totalAmount = subtotal - (appliedCoupon?.discount || 0) + DELIVERY_CHARGE;
    const orderId = `order_${Date.now()}`;

    try {
      // 1. Save order as 'pending' in Firestore before redirecting
      const orderData: any = {
        userId: user.uid,
        items,
        totalAmount,
        discountAmount: appliedCoupon?.discount || 0,
        couponUsed: appliedCoupon?.code || null,
        referralUserId: appliedCoupon?.userId || null,
        commissionAmount: appliedCoupon ? (appliedCoupon.applicableSubtotal * appliedCoupon.commissionRate) : 0,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'whatsapp',
        paymentId: orderId,
        shippingAddress: address,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await setDoc(doc(db, 'orders', orderId), orderData);
      await logAction(user.uid, user.email || '', user.displayName || '', 'INITIATE_WHATSAPP_PAYMENT', `Initiated WhatsApp payment for order #${orderId.slice(-6)} for ₹${totalAmount}`, 'user');

      // 2. Generate WhatsApp message
      const itemsList = items.map(item => {
        let details = `${item.name} (x${item.quantity})`;
        if (item.flavor) details += ` [Flavor: ${item.flavor}]`;
        if (item.weight) details += ` [Weight: ${item.weight}]`;
        return details;
      }).join(', ');
      const message = `*New Order Request*%0A%0A` +
        `*Order ID:* ${orderId}%0A` +
        `*Name:* ${address.fullName}%0A` +
        `*Phone:* ${address.phone}%0A` +
        `*Address:* ${address.addressLine1}, ${address.city}, ${address.state} - ${address.zipCode}%0A` +
        `*Items:* ${itemsList}%0A` +
        `*Coupon Code:* ${appliedCoupon?.code || 'None'}%0A` +
        `*Total Amount to Pay:* ₹${totalAmount}%0A%0A` +
        `_Note: I understand there is no Cash on Delivery. Please provide payment details._`;

      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${message}`;
      
      // 3. Clear cart and redirect
      clearCart();
      
      // Use window.location.href for more reliable redirect in iframes/mobile
      try {
        window.location.href = whatsappUrl;
      } catch (e) {
        window.open(whatsappUrl, '_blank');
      }
      
      setPaymentStep('success');
      toast.success("Order request sent! Redirecting to WhatsApp...");
    } catch (error) {
      console.error("Order Error:", error);
      toast.error("Failed to process order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleWalletPayment = async () => {
    if (!user || !profile) return;
    
    const totalAmount = subtotal - (appliedCoupon?.discount || 0) + DELIVERY_CHARGE;
    
    if ((profile.wallet?.withdrawable || 0) < totalAmount) {
      toast.error('Insufficient wallet balance');
      return;
    }

    setLoading(true);
    setPaymentStep('processing');

    try {
      const orderData: any = {
        userId: user.uid,
        items,
        totalAmount,
        discountAmount: appliedCoupon?.discount || 0,
        couponUsed: appliedCoupon?.code || null,
        referralUserId: appliedCoupon?.userId || null,
        commissionAmount: appliedCoupon ? (appliedCoupon.applicableSubtotal * appliedCoupon.commissionRate) : 0,
        status: 'pending',
        paymentStatus: 'completed',
        paymentId: 'wallet_pay_' + Math.random().toString(36).substr(2, 9),
        paymentMethod: 'wallet',
        shippingAddress: address,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      
      // Deduct from wallet
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        'wallet.withdrawable': increment(-totalAmount)
      });

      await logAction(user.uid, user.email || '', user.displayName || '', 'PLACE_ORDER', `Placed order #${orderRef.id.slice(-6)} for ₹${totalAmount} (Wallet Payment)`, 'user');
      
      if (appliedCoupon) {
        const commissionAmount = appliedCoupon.applicableSubtotal * appliedCoupon.commissionRate;
        await addDoc(collection(db, 'referrals'), {
          couponOwnerId: appliedCoupon.userId,
          orderId: orderRef.id,
          amount: commissionAmount,
          orderTotal: totalAmount,
          customerName: address.fullName,
          status: 'pending',
          createdAt: new Date().toISOString(),
        });

        const referralUserRef = doc(db, 'users', appliedCoupon.userId);
        await updateDoc(referralUserRef, {
          'wallet.pending': increment(commissionAmount),
          'wallet.totalEarned': increment(commissionAmount),
        });
      }

      setPaymentStep('success');
      toast.success('Payment Successful via Wallet!');
      
      const itemsList = items.map(item => {
        let details = `${item.name} (x${item.quantity})`;
        if (item.flavor) details += ` [Flavor: ${item.flavor}]`;
        if (item.weight) details += ` [Weight: ${item.weight}]`;
        return details;
      }).join(', ');
      const whatsappMessage = `*New Order Received (Wallet Pay)!*%0A%0A` +
        `*Order ID:* %23${orderRef.id.slice(-6).toUpperCase()}%0A` +
        `*Customer:* ${address.fullName}%0A` +
        `*Phone:* ${address.phone}%0A` +
        `*Total:* ₹${totalAmount}%0A` +
        `*Items:* ${itemsList}%0A` +
        `*Address:* ${address.addressLine1}, ${address.city}, ${address.state} - ${address.zipCode}%0A%0A` +
        `_Please process this order as soon as possible._`;

      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${whatsappMessage}`;
      window.open(whatsappUrl, '_blank');
      
      setTimeout(() => {
        clearCart();
      }, 1000);
    } catch (error) {
      setPaymentStep('selection');
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    } finally {
      setLoading(false);
    }
  };

  const finalTotal = subtotal - (appliedCoupon?.discount || 0) + DELIVERY_CHARGE;

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link to="/cart" className="hover:text-orange-600">Cart</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-bold">Checkout</span>
          </div>
          <div className="flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
            <ShieldCheck className="w-3 h-3" />
            Cashfree Secure Checkout
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Checkout Steps */}
          <div className="lg:col-span-2 space-y-8">
            {/* Step 1: Shipping Address */}
            <div className={cn(
              "bg-white p-8 rounded-3xl border transition-all",
              step === 1 ? "border-orange-500 shadow-xl" : "border-gray-100 opacity-80"
            )}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg",
                    step >= 1 ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-400"
                  )}>1</div>
                  <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Shipping Address</h2>
                </div>
                {step > 1 && (
                  <button onClick={() => setStep(1)} className="text-orange-600 font-bold text-sm hover:underline">Edit</button>
                )}
              </div>

              {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Full Name</label>
                    <input 
                      type="text" 
                      value={address.fullName}
                      onChange={(e) => setAddress({...address, fullName: e.target.value})}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Address Line 1</label>
                    <input 
                      type="text" 
                      value={address.addressLine1}
                      onChange={(e) => setAddress({...address, addressLine1: e.target.value})}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20"
                      placeholder="House No, Street, Area"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">City</label>
                    <div className="w-full bg-gray-100 border-none rounded-xl px-4 py-3 text-gray-500 font-bold">
                      Purnea (Only Purnea orders accepted)
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">State</label>
                    <div className="w-full bg-gray-100 border-none rounded-xl px-4 py-3 text-gray-500 font-bold">
                      Bihar
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Zip Code</label>
                    <input 
                      type="text" 
                      value={address.zipCode}
                      onChange={(e) => setAddress({...address, zipCode: e.target.value})}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20"
                      placeholder="Pincode"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Phone Number</label>
                    <input 
                      type="text" 
                      value={address.phone}
                      onChange={(e) => setAddress({...address, phone: e.target.value})}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20"
                      placeholder="10-digit mobile number"
                    />
                  </div>
                  <div className="md:col-span-2 pt-4">
                    <button 
                      onClick={() => {
                        if (Object.values(address).some(v => !v)) {
                          toast.error('Please fill all address fields');
                          return;
                        }
                        setStep(2);
                      }}
                      className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all"
                    >
                      Continue to Payment
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Payment */}
            <div className={cn(
              "bg-white p-8 rounded-3xl border transition-all",
              step === 2 ? "border-orange-500 shadow-xl" : "border-gray-100 opacity-80"
            )}>
              <div className="flex items-center gap-4 mb-8">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg",
                  step >= 2 ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-400"
                )}>2</div>
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Payment Method</h2>
              </div>

              {step === 2 && (
                <div className="space-y-6">
                  {paymentStep === 'selection' ? (
                    <>
                      <div className="space-y-4">
                        <div 
                          onClick={() => setPaymentMethod('whatsapp')}
                          className={cn(
                            "p-6 border-2 rounded-2xl flex items-center justify-between cursor-pointer transition-all",
                            paymentMethod === 'whatsapp' ? "border-orange-500 bg-orange-50" : "border-gray-100 hover:border-gray-200"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                              <MessageCircle className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">WhatsApp Order Verification</p>
                              <p className="text-xs text-gray-500">No Cash on Delivery available</p>
                            </div>
                          </div>
                          {paymentMethod === 'whatsapp' && <CheckCircle2 className="w-6 h-6 text-orange-600" />}
                        </div>

                        <div 
                          onClick={() => setPaymentMethod('wallet')}
                          className={cn(
                            "p-6 border-2 rounded-2xl flex items-center justify-between cursor-pointer transition-all",
                            paymentMethod === 'wallet' ? "border-orange-500 bg-orange-50" : "border-gray-100 hover:border-gray-200",
                            (profile?.wallet?.withdrawable || 0) < finalTotal && "opacity-50 grayscale cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                              <Wallet className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">Pay with Wallet</p>
                              <p className="text-xs text-gray-500">Available Balance: ₹{profile?.wallet?.withdrawable || 0}</p>
                            </div>
                          </div>
                          {paymentMethod === 'wallet' && <CheckCircle2 className="w-6 h-6 text-orange-600" />}
                        </div>
                      </div>

                      <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
                        <div className="flex items-center gap-3 mb-4">
                          <AlertCircle className="w-5 h-5 text-orange-600" />
                          <p className="text-sm font-bold text-gray-900">No Cash on Delivery (COD)</p>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          {paymentMethod === 'whatsapp' 
                            ? 'We do not offer Cash on Delivery. To complete your order, click "Proceed to Payment" below. You will be redirected to WhatsApp to verify your order and receive payment details.'
                            : 'The total amount will be deducted from your wallet balance. This is an instant payment method.'}
                        </p>
                      </div>

                      <div className="flex flex-col gap-4">
                        <button 
                          onClick={paymentMethod === 'whatsapp' ? handleWhatsAppPayment : handleWalletPayment}
                          disabled={loading || (paymentMethod === 'wallet' && (profile?.wallet?.withdrawable || 0) < finalTotal)}
                          className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-700 shadow-xl shadow-orange-600/20 transition-all active:scale-95 disabled:bg-gray-200 flex items-center justify-center gap-2"
                        >
                          {loading ? 'Processing...' : paymentMethod === 'whatsapp' ? 'Proceed to Payment' : `Pay ₹${finalTotal} & Place Order`}
                        </button>
                      </div>
                    </>
                  ) : paymentStep === 'processing' ? (
                    <div className="py-12 text-center">
                      <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                      <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Processing Payment</h3>
                      <p className="text-sm text-gray-500">Please do not refresh or close this window...</p>
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                      <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Payment Successful!</h3>
                      <p className="text-sm text-gray-500 mb-8">Your order has been placed and we've notified the admin.</p>
                      
                      <div className="flex flex-col gap-3 max-w-xs mx-auto">
                        <a 
                          href={`https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${encodeURIComponent('Hi, I just placed an order on Purnea Supps. Please check my order details.')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-xl font-bold text-sm hover:bg-green-600 transition-all"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Chat with Admin
                        </a>
                        <Link 
                          to="/orders"
                          className="text-gray-500 font-bold text-sm hover:underline"
                        >
                          View My Orders
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl sticky top-24">
              <h3 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-tight">Order Summary</h3>
              
              <div className="space-y-4 mb-8 max-h-64 overflow-y-auto pr-2 scrollbar-hide">
                {items.map(item => (
                  <div key={`${item.productId}-${item.flavor}-${item.weight}`} className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate uppercase">{item.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.flavor && <span className="text-[9px] bg-gray-100 px-1 rounded text-gray-500">F: {item.flavor}</span>}
                        {item.weight && <span className="text-[9px] bg-gray-100 px-1 rounded text-gray-500">W: {item.weight}</span>}
                        <span className="text-[9px] bg-gray-100 px-1 rounded text-gray-500">Qty: {item.quantity}</span>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-gray-900">₹{item.price * item.quantity}</p>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-gray-100 space-y-4 mb-8">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-gray-900">₹{subtotal}</span>
                </div>
                
                {appliedCoupon ? (
                  <div className="flex justify-between text-sm text-green-600">
                    <div className="flex items-center gap-1">
                      <span>Coupon ({appliedCoupon.code})</span>
                      <button onClick={() => setAppliedCoupon(null)} className="text-[10px] underline">Remove</button>
                    </div>
                    <span className="font-bold">-₹{appliedCoupon.discount}</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Coupon Code" 
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-grow bg-gray-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 ring-orange-500/20"
                    />
                    <button 
                      onClick={handleApplyCoupon}
                      disabled={loading || !couponCode}
                      className="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-800 disabled:bg-gray-200 transition-all"
                    >
                      Apply
                    </button>
                  </div>
                )}

                <div className="flex justify-between text-sm text-gray-600">
                  <span>Delivery Charge</span>
                  <span className="font-bold text-gray-900">₹{DELIVERY_CHARGE}</span>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-between items-end">
                  <span className="text-lg font-black text-gray-900 uppercase">Total</span>
                  <span className="text-3xl font-black text-orange-600 tracking-tighter leading-none">₹{finalTotal}</span>
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-orange-600" />
                  <p className="text-xs font-bold text-orange-900 uppercase tracking-tight">Referral Benefits</p>
                </div>
                <p className="text-[10px] text-orange-700 leading-relaxed">
                  Using a referral code saves you 10-20% and helps your friend earn commission. It's a win-win!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
