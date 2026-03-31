import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logAction } from '../firebase';
import { Order, Product, UserProfile, Referral, WithdrawalRequest } from '../types';
import { useAuth } from '../AuthContext';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ShoppingBag, Package, Users, Ticket, Dumbbell, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';

const AdminOverview = () => {
  const { profile: adminProfile } = useAuth();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalCommission: 0,
    totalProducts: 0,
    trainerRevenue: 0,
    trainerSessions: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);

  useEffect(() => {
    const unsubTrainer = onSnapshot(collection(db, 'trainer_sessions'), (snapshot) => {
      const sessions = snapshot.docs.map(doc => doc.data());
      const revenue = sessions.reduce((sum, s) => sum + (s.amount || 0), 0);
      setStats(prev => ({ ...prev, trainerRevenue: revenue, trainerSessions: snapshot.size }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'trainer_sessions');
    });

    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setRecentOrders(orders.slice(0, 5));
      
      const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
      setStats(prev => ({ ...prev, totalOrders: orders.length, totalSales }));

      const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      const chartData = last7Days.map(date => {
        const dayOrders = orders.filter(o => o.createdAt.startsWith(date));
        return {
          date: new Date(date).toLocaleDateString('en-IN', { weekday: 'short' }),
          sales: dayOrders.reduce((sum, o) => sum + o.totalAmount, 0),
          orders: dayOrders.length
        };
      });
      setSalesData(chartData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setStats(prev => ({ ...prev, totalUsers: snapshot.size }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setStats(prev => ({ ...prev, totalProducts: snapshot.size }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
    });

    const unsubReferrals = onSnapshot(collection(db, 'referrals'), (snapshot) => {
      const refs = snapshot.docs.map(doc => doc.data() as Referral);
      const earnedCommission = refs
        .filter(r => r.status === 'earned')
        .reduce((sum, r) => sum + r.amount, 0);
      setStats(prev => ({ ...prev, totalCommission: earnedCommission }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'referrals');
    });

    return () => {
      unsubOrders();
      unsubUsers();
      unsubReferrals();
      unsubProducts();
      unsubTrainer();
    };
  }, []);

  return (
    <div className="space-y-12 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Admin <span className="text-orange-600">Overview</span></h1>
          <p className="text-gray-500 mt-2">Business performance at a glance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { label: 'Total Sales', value: `₹${stats.totalSales.toLocaleString()}`, icon: ShoppingBag, color: 'orange' },
          { label: 'Total Orders', value: stats.totalOrders, icon: Package, color: 'blue' },
          { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'purple' },
          { label: 'Commission Paid', value: `₹${stats.totalCommission.toLocaleString()}`, icon: Ticket, color: 'green' },
          { label: 'Trainer Revenue', value: `₹${stats.trainerRevenue.toLocaleString()}`, icon: Dumbbell, color: 'orange' },
          { label: 'Trainer Sessions', value: stats.trainerSessions, icon: MessageSquare, color: 'blue' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center mb-6",
              stat.color === 'orange' ? "bg-orange-50 text-orange-600" :
              stat.color === 'blue' ? "bg-blue-50 text-blue-600" :
              stat.color === 'purple' ? "bg-purple-50 text-purple-600" :
              "bg-green-50 text-green-600"
            )}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{stat.label}</p>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-tight">Sales Trend (Last 7 Days)</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fontWeight: 600, fill: '#9ca3af' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fontWeight: 600, fill: '#9ca3af' }}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontWeight: 800, color: '#ea580c' }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#ea580c" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-8 flex items-center justify-between border-b border-gray-50">
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Recent Orders</h2>
              <Link to="/admin/orders" className="text-orange-600 font-bold text-sm hover:underline">View All</Link>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Order ID</th>
                  <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Amount</th>
                  <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-8 py-4 text-sm font-bold text-gray-900">#{order.id.slice(-6).toUpperCase()}</td>
                    <td className="px-8 py-4 text-sm font-black text-gray-900">₹{order.totalAmount}</td>
                    <td className="px-8 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        order.status === 'delivered' ? "bg-green-100 text-green-700" : 
                        order.status === 'pending' ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
