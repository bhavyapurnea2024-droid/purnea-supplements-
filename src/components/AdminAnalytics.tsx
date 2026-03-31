import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Order, UserProfile, Referral, AuditLog } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { cn } from '../lib/utils';

export const AdminReferrals = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'referrals'), orderBy('createdAt', 'desc')), (snapshot) => {
      setReferrals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'referrals');
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Manage <span className="text-orange-600">Referrals</span></h1>
        <p className="text-gray-500 mt-2">Track all referral commissions generated across the platform.</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Referrer ID</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Order ID</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Commission</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {referrals.map(ref => (
                <tr key={ref.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(ref.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-xs text-gray-500 font-mono">{ref.couponOwnerId}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">#{ref.orderId.slice(-6).toUpperCase()}</td>
                  <td className="px-6 py-4 text-sm font-black text-orange-600">₹{ref.amount.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      ref.status === 'earned' ? "bg-green-100 text-green-700" : 
                      ref.status === 'pending' ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                    )}>
                      {ref.status}
                    </span>
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

export const AdminAnalytics = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ordersLoaded = false;
    let usersLoaded = false;
    let referralsLoaded = false;

    const checkLoading = () => {
      if (ordersLoaded && usersLoaded && referralsLoaded) {
        setLoading(false);
      }
    };

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      ordersLoaded = true;
      checkLoading();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
      ordersLoaded = true;
      checkLoading();
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
      usersLoaded = true;
      checkLoading();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
      usersLoaded = true;
      checkLoading();
    });

    const unsubReferrals = onSnapshot(collection(db, 'referrals'), (snapshot) => {
      setReferrals(snapshot.docs.map(doc => doc.data() as Referral));
      referralsLoaded = true;
      checkLoading();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'referrals');
      referralsLoaded = true;
      checkLoading();
    });

    return () => {
      unsubOrders();
      unsubUsers();
      unsubReferrals();
    };
  }, []);

  // Process data for charts
  const revenueByMonth = orders.reduce((acc: any, order) => {
    const month = new Date(order.createdAt).toLocaleString('default', { month: 'short' });
    acc[month] = (acc[month] || 0) + order.totalAmount;
    return acc;
  }, {});

  const chartData = Object.keys(revenueByMonth).map(month => ({
    name: month,
    revenue: revenueByMonth[month]
  }));

  const categoryData = orders.reduce((acc: any, order) => {
    order.items.forEach(item => {
      acc[item.category] = (acc[item.category] || 0) + 1;
    });
    return acc;
  }, {});

  const pieData = Object.keys(categoryData).map(cat => ({
    name: cat,
    value: categoryData[cat]
  }));

  const COLORS = ['#ea580c', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-12 pb-12">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Business <span className="text-orange-600">Analytics</span></h1>
        <p className="text-gray-500 mt-2">In-depth performance reports and metrics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-tight">Revenue Growth</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="revenue" fill="#ea580c" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-tight">Category Distribution</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                <span className="text-xs font-bold text-gray-600 uppercase">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminAuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc')), (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'audit_logs');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Audit <span className="text-orange-600">Logs</span></h1>
        <p className="text-gray-500 mt-2">Real-time tracking of all user and admin actions.</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Action</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Details</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Loading logs...</td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-900">{log.userName}</p>
                      <p className="text-[10px] text-gray-500">{log.userEmail}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-gray-900 uppercase tracking-tight">{log.action}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                        log.type === 'admin' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {log.type}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">No activity logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
