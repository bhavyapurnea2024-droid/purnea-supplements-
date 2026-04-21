import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Order, UserProfile, Referral, AuditLog } from '../types';
import { TRAINER_PRICE, TRAINER_DISCOUNTED_PRICE } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { cn } from '../lib/utils';
import { Calendar, TrendingUp, Users as UsersIcon, ShoppingBag, IndianRupee } from 'lucide-react';

export const AdminReferrals = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'referrals'), orderBy('createdAt', 'desc')), (snapshot) => {
      setReferrals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'referrals');
    });
    return () => unsub();
  }, []);

  const filteredReferrals = referrals.filter(ref => {
    if (!startDate && !endDate) return true;
    const refDate = new Date(ref.createdAt).getTime();
    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
    return refDate >= start && refDate <= end;
  });

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Manage <span className="text-orange-600">Referrals</span></h1>
          <p className="text-gray-500 mt-2">Track all referral commissions generated across the platform.</p>
        </div>

        {/* Date Range Picker */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Filter:</span>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-gray-50 border-none rounded-lg px-3 py-1.5 text-xs font-bold text-gray-700 focus:ring-2 ring-orange-500/20"
            />
            <span className="text-gray-300">to</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-gray-50 border-none rounded-lg px-3 py-1.5 text-xs font-bold text-gray-700 focus:ring-2 ring-orange-500/20"
            />
          </div>
          {(startDate || endDate) && (
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-[10px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-700 underline"
            >
              Clear
            </button>
          )}
        </div>
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
              {filteredReferrals.length > 0 ? (
                filteredReferrals.map(ref => (
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
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">No referrals found for this period.</td>
                </tr>
              )}
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
  const [trainerSessions, setTrainerSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Date range state - Default to today
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    let ordersLoaded = false;
    let usersLoaded = false;
    let referralsLoaded = false;
    let trainerLoaded = false;

    const checkLoading = () => {
      if (ordersLoaded && usersLoaded && referralsLoaded && trainerLoaded) {
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

    const unsubTrainer = onSnapshot(collection(db, 'trainer_sessions'), (snapshot) => {
      setTrainerSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      trainerLoaded = true;
      checkLoading();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'trainer_sessions');
      trainerLoaded = true;
      checkLoading();
    });

    return () => {
      unsubOrders();
      unsubUsers();
      unsubReferrals();
      unsubTrainer();
    };
  }, []);

  // Filter data based on date range
  const filteredOrders = orders.filter(order => {
    if (order.status !== 'delivered') return false;
    if (!startDate && !endDate) return true;
    const orderDate = new Date(order.createdAt).getTime();
    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
    return orderDate >= start && orderDate <= end;
  });

  const filteredUsers = users.filter(user => {
    if (!startDate && !endDate) return true;
    const userDate = new Date(user.createdAt).getTime();
    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
    return userDate >= start && userDate <= end;
  });

  const filteredReferrals = referrals.filter(ref => {
    if (!startDate && !endDate) return true;
    const refDate = new Date(ref.createdAt).getTime();
    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
    return refDate >= start && refDate <= end;
  });

  const filteredTrainer = trainerSessions.filter(session => {
    if (!session.paymentVerified) return false;
    if (!startDate && !endDate) return true;
    const sessionDate = new Date(session.createdAt).getTime();
    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
    return sessionDate >= start && sessionDate <= end;
  });

  // Summary Metrics
  const productRevenue = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const trainerRevenue = filteredTrainer.reduce((sum, s) => sum + (s.couponUsed ? TRAINER_DISCOUNTED_PRICE : TRAINER_PRICE), 0);
  const totalRevenue = productRevenue + trainerRevenue;
  
  const totalOrders = filteredOrders.length + filteredTrainer.length;
  const newUsers = filteredUsers.length;
  
  const productCommissions = filteredReferrals
    .filter(ref => ref.status === 'earned' || ref.status === 'matured')
    .reduce((sum, ref) => sum + ref.amount, 0);
  const trainerCommissions = filteredTrainer.filter(s => s.referralUserId).length * 100;
  const totalCommissions = productCommissions + trainerCommissions;

  // Process daily revenue for line chart
  const dailyRevenue = [...filteredOrders, ...filteredTrainer].reduce((acc: any, item) => {
    const date = new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const amount = 'totalAmount' in item ? item.totalAmount : (item.couponUsed ? TRAINER_DISCOUNTED_PRICE : TRAINER_PRICE);
    acc[date] = (acc[date] || 0) + amount;
    return acc;
  }, {});

  const dailyChartData = Object.keys(dailyRevenue).map(date => ({
    name: date,
    revenue: dailyRevenue[date]
  })).sort((a, b) => {
    // Simple sort by date string (might need better sorting for multi-month)
    return new Date(a.name).getTime() - new Date(b.name).getTime();
  });

  // Process data for charts
  const revenueByMonth = [...filteredOrders, ...filteredTrainer].reduce((acc: any, item) => {
    const month = new Date(item.createdAt).toLocaleString('default', { month: 'short' });
    const amount = 'totalAmount' in item ? item.totalAmount : (item.couponUsed ? TRAINER_DISCOUNTED_PRICE : TRAINER_PRICE);
    acc[month] = (acc[month] || 0) + amount;
    return acc;
  }, {});

  const chartData = Object.keys(revenueByMonth).map(month => ({
    name: month,
    revenue: revenueByMonth[month]
  }));

  const categoryData = filteredOrders.reduce((acc: any, order) => {
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Business <span className="text-orange-600">Analytics</span></h1>
          <p className="text-gray-500 mt-2">In-depth performance reports and metrics.</p>
        </div>

        {/* Date Range Picker */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Date Range:</span>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-gray-50 border-none rounded-lg px-3 py-1.5 text-xs font-bold text-gray-700 focus:ring-2 ring-orange-500/20"
            />
            <span className="text-gray-300">to</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-gray-50 border-none rounded-lg px-3 py-1.5 text-xs font-bold text-gray-700 focus:ring-2 ring-orange-500/20"
            />
          </div>
          {(startDate || endDate) && (
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-[10px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-700 underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Revenue</span>
          </div>
          <p className="text-2xl font-black text-gray-900 tracking-tight">₹{totalRevenue.toLocaleString()}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Total Sales</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Orders</span>
          </div>
          <p className="text-2xl font-black text-gray-900 tracking-tight">{totalOrders}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Total Transactions</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <UsersIcon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Growth</span>
          </div>
          <p className="text-2xl font-black text-gray-900 tracking-tight">{newUsers}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">New Registrations</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Referrals</span>
          </div>
          <p className="text-2xl font-black text-gray-900 tracking-tight">₹{totalCommissions.toLocaleString()}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Total Commissions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-tight">Daily Sales Trend</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{stroke: '#ea580c', strokeWidth: 2}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Line type="monotone" dataKey="revenue" stroke="#ea580c" strokeWidth={4} dot={{ r: 4, fill: '#ea580c', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
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
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

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

  const filteredLogs = logs.filter(log => {
    if (!startDate && !endDate) return true;
    const logDate = new Date(log.timestamp).getTime();
    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
    return logDate >= start && logDate <= end;
  });

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Audit <span className="text-orange-600">Logs</span></h1>
          <p className="text-gray-500 mt-2">Real-time tracking of all user and admin actions.</p>
        </div>

        {/* Date Range Picker */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Filter:</span>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-gray-50 border-none rounded-lg px-3 py-1.5 text-xs font-bold text-gray-700 focus:ring-2 ring-orange-500/20"
            />
            <span className="text-gray-300">to</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-gray-50 border-none rounded-lg px-3 py-1.5 text-xs font-bold text-gray-700 focus:ring-2 ring-orange-500/20"
            />
          </div>
          {(startDate || endDate) && (
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-[10px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-700 underline"
            >
              Clear
            </button>
          )}
        </div>
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
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map(log => (
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
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">No activity logs found for this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
