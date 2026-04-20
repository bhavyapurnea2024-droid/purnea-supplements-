import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, getDoc, getDocs, where, orderBy, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logAction } from '../firebase';
import { Order, Referral } from '../types';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { Eye, X, MapPin, Phone, User, Tag, ShoppingBag, CreditCard, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const AdminOrders = () => {
  const { user: adminUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) return;
      const orderData = orderSnap.data() as Order;
      const oldStatus = orderData.status;

      await updateDoc(orderRef, { status, updatedAt: new Date().toISOString() });
      await logAction(adminUser!.uid, adminUser!.email, adminUser!.displayName, 'UPDATE_ORDER_STATUS', `Updated order #${orderId.slice(-6)} status to ${status}`, 'admin');
      toast.success(`Order status updated to ${status}`);

      // Logic for commission maturity
      if (orderData.referralUserId) {
        const q = query(
          collection(db, 'referrals'), 
          where('orderId', '==', orderId)
        );
        const refSnapshot = await getDocs(q);
        
        if (!refSnapshot.empty) {
          const refDoc = refSnapshot.docs[0];
          const refData = refDoc.data() as Referral;
          const userRef = doc(db, 'users', orderData.referralUserId);

          // If marked DELIVERED: move from pending to earned with 12h maturity
          if (status === 'delivered' && oldStatus !== 'delivered') {
            if (refData.status === 'pending') {
              const maturesAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
              await updateDoc(doc(db, 'referrals', refDoc.id), { 
                status: 'earned',
                maturesAt: maturesAt
              });
              await updateDoc(userRef, {
                'wallet.pending': increment(-refData.amount),
              });
              toast.success('Commission earned! It will be withdrawable in 12 hours.');
            }
          }
          
          // If moved OUT of delivered: move back to pending
          else if (status !== 'delivered' && oldStatus === 'delivered') {
            if (refData.status === 'earned') {
              await updateDoc(doc(db, 'referrals', refDoc.id), { 
                status: 'pending',
                maturesAt: null
              });
              await updateDoc(userRef, {
                'wallet.pending': increment(refData.amount),
              });
              toast.info('Commission moved back to pending');
            }
          }

          // If CANCELLED: remove from whatever balance it was in
          else if (status === 'cancelled' && oldStatus !== 'cancelled') {
            if (refData.status === 'pending') {
              await updateDoc(doc(db, 'referrals', refDoc.id), { status: 'cancelled' });
              await updateDoc(userRef, {
                'wallet.pending': increment(-refData.amount),
                'wallet.totalEarned': increment(-refData.amount),
              });
              toast.info('Pending commission cancelled');
            } else if (refData.status === 'earned') {
              await updateDoc(doc(db, 'referrals', refDoc.id), { status: 'cancelled' });
              await updateDoc(userRef, {
                'wallet.totalEarned': increment(-refData.amount),
              });
              toast.info('Maturing commission cancelled');
            } else if (refData.status === 'matured') {
              await updateDoc(doc(db, 'referrals', refDoc.id), { status: 'cancelled' });
              await updateDoc(userRef, {
                'wallet.withdrawable': increment(-refData.amount),
                'wallet.totalEarned': increment(-refData.amount),
              });
              toast.info('Matured commission reversed');
            }
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Manage <span className="text-orange-600">Orders</span></h1>
        <p className="text-gray-500 mt-2">Track and update customer orders.</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Order ID</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Address</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Items</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Total</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Method</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">#{order.id.slice(-6).toUpperCase()}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-gray-900">{order.shippingAddress.fullName}</p>
                    <p className="text-[10px] text-gray-500">{order.shippingAddress.phone}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 group/addr">
                      <p className="text-[10px] font-medium text-gray-600 max-w-[150px] truncate">
                        {order.shippingAddress.addressLine1}, {order.shippingAddress.city}
                      </p>
                      <button 
                        onClick={() => {
                          const fullAddr = `${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.zipCode}`;
                          navigator.clipboard.writeText(fullAddr);
                          toast.success('Address copied!');
                        }}
                        className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-orange-600 opacity-0 group-hover/addr:opacity-100 transition-all"
                        title="Copy Full Address"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{order.items.length} items</td>
                  <td className="px-6 py-4 text-sm font-black text-gray-900">₹{order.totalAmount}</td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      {order.paymentMethod || 'cashfree'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      order.status === 'delivered' ? "bg-green-100 text-green-700" : 
                      order.status === 'pending' ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 text-gray-400 hover:text-orange-600 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <select 
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className="bg-gray-50 border-none rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-2 ring-orange-500/20"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Order Details</h2>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto max-h-[70vh] space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-orange-600" />
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer Name</p>
                        <p className="text-sm font-bold text-gray-900">{selectedOrder.shippingAddress.fullName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-orange-600" />
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</p>
                        <p className="text-sm font-bold text-gray-900">{selectedOrder.shippingAddress.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Tag className="w-4 h-4 text-orange-600" />
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Coupon Code</p>
                        <p className="text-sm font-bold text-gray-900">{selectedOrder.couponUsed || 'None'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-orange-600 mt-1" />
                      <div className="flex-grow">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Shipping Address</p>
                          <button 
                            onClick={() => {
                              const fullAddr = `${selectedOrder.shippingAddress.addressLine1}, ${selectedOrder.shippingAddress.city}, ${selectedOrder.shippingAddress.state} - ${selectedOrder.shippingAddress.zipCode}`;
                              navigator.clipboard.writeText(fullAddr);
                              toast.success('Address copied!');
                            }}
                            className="flex items-center gap-1 text-[10px] font-bold text-orange-600 hover:underline"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </div>
                        <p className="text-sm font-bold text-gray-900 leading-relaxed">
                          {selectedOrder.shippingAddress.addressLine1},<br />
                          {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} - {selectedOrder.shippingAddress.zipCode}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-4 h-4 text-orange-600" />
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Method</p>
                        <p className="text-sm font-bold text-gray-900 uppercase">{selectedOrder.paymentMethod || 'cashfree'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <ShoppingBag className="w-4 h-4 text-orange-600" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Items Ordered</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 font-medium">
                            {item.name} <span className="text-gray-400 font-bold">x{item.quantity}</span>
                          </span>
                          <span className="text-gray-900 font-black">₹{item.price * item.quantity}</span>
                        </div>
                        {(item.flavor || item.weight) && (
                          <div className="flex gap-2 mt-1 mb-2">
                            {item.flavor && (
                              <span className="text-[10px] bg-white border border-gray-100 px-2 py-0.5 rounded text-gray-500 font-bold">
                                F: {item.flavor}
                              </span>
                            )}
                            {item.weight && (
                              <span className="text-[10px] bg-white border border-gray-100 px-2 py-0.5 rounded text-gray-500 font-bold">
                                W: {item.weight}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="pt-3 border-t border-gray-200 flex justify-between">
                      <span className="font-black text-gray-900 uppercase tracking-tight">Total Amount</span>
                      <span className="font-black text-orange-600 text-lg">₹{selectedOrder.totalAmount}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-gray-50 flex justify-end gap-3">
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="px-6 py-2 rounded-xl font-bold text-sm text-gray-500 hover:bg-gray-100 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminOrders;
