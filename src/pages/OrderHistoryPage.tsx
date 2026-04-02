import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { Order } from '../types';
import { Package, ChevronRight, Clock, CheckCircle2, Truck, XCircle, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const OrderHistoryPage = () => {
  const { user, loading: authLoading, setIsLoginModalOpen } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'orders'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (authLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div></div>;

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 bg-gray-50">
        <div className="bg-white p-12 rounded-3xl shadow-xl border border-gray-100 text-center max-w-md w-full">
          <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <Package className="w-12 h-12 text-orange-600" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tighter uppercase leading-none">Sign in to view orders</h2>
          <p className="text-gray-500 mb-10 leading-relaxed">Please sign in to view your order history and track your current shipments.</p>
          <button 
            onClick={() => setIsLoginModalOpen(true)}
            className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-700 shadow-xl shadow-orange-600/20 transition-all active:scale-95"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link to="/" className="hover:text-orange-600">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-bold">My Orders</span>
        </div>

        <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase mb-12">Order <span className="text-orange-600">History</span></h1>

        {loading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white h-48 rounded-3xl animate-pulse border border-gray-100"></div>
            ))}
          </div>
        ) : orders.length > 0 ? (
          <div className="space-y-6">
            {orders.map((order) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={order.id}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="p-6 sm:p-8 border-b border-gray-50 flex flex-col sm:flex-row justify-between gap-6">
                  <div className="flex flex-wrap gap-8">
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Order Placed</p>
                      <p className="text-sm font-bold text-gray-900">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Amount</p>
                      <p className="text-sm font-black text-gray-900">₹{order.totalAmount}</p>
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Order ID</p>
                      <p className="text-sm font-bold text-gray-900">#{order.id.slice(-6).toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2",
                      order.status === 'delivered' ? "bg-green-100 text-green-700" : 
                      order.status === 'pending' ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {order.status === 'delivered' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {order.status === 'pending' && <Clock className="w-3.5 h-3.5" />}
                      {order.status === 'shipped' && <Truck className="w-3.5 h-3.5" />}
                      {order.status}
                    </span>
                  </div>
                </div>
                
                <div className="p-6 sm:p-8">
                  <div className="space-y-6">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 flex-shrink-0">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-grow">
                          <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight mb-1">{item.name}</h4>
                          <p className="text-xs text-gray-500">Quantity: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-gray-900">₹{item.price * item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-8 pt-8 border-t border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <Truck className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">Shipping to {order.shippingAddress.fullName}</p>
                        <p className="text-[10px] text-gray-500">{order.shippingAddress.city}, {order.shippingAddress.state}</p>
                      </div>
                    </div>
                    <Link 
                      to={`/shop`}
                      className="text-orange-600 font-bold text-sm hover:underline flex items-center gap-1"
                    >
                      Buy Again <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">NO ORDERS YET</h3>
            <p className="text-gray-500 mb-8">You haven't placed any orders yet. Start shopping to fuel your fitness journey!</p>
            <Link to="/shop" className="inline-block bg-orange-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-700 transition-all">
              Start Shopping
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderHistoryPage;
