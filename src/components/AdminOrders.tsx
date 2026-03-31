import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, getDoc, getDocs, where, orderBy, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logAction } from '../firebase';
import { Order, Referral } from '../types';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const AdminOrders = () => {
  const { user: adminUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Items</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Total</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Actions</th>
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
                  <td className="px-6 py-4 text-sm text-gray-600">{order.items.length} items</td>
                  <td className="px-6 py-4 text-sm font-black text-gray-900">₹{order.totalAmount}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      order.status === 'delivered' ? "bg-green-100 text-green-700" : 
                      order.status === 'pending' ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;
