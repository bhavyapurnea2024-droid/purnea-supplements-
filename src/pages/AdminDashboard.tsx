import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  TrendingUp, 
  History, 
  CreditCard,
  MessageSquare,
  User as UserIcon,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

// Lazy load components or import them directly if they are already extracted
import AdminOverview from '../components/AdminOverview';
import AdminProducts from '../components/AdminProducts';
import AdminOrders from '../components/AdminOrders';
import AdminUsers from '../components/AdminUsers';
import AdminWithdrawals from '../components/AdminWithdrawals';
import { AdminReferrals, AdminAuditLogs, AdminAnalytics } from '../components/AdminAnalytics';
import AdminSettings from '../components/AdminSettings';
import AdminTrainerSessions from '../components/AdminTrainerSessions';
import AdminTrainerProfile from '../components/AdminTrainerProfile';
import AdminSpecialSale from '../components/AdminSpecialSale';
import AdminCategoryImages from '../components/AdminCategoryImages';

const AdminDashboard = () => {
  const { user, profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Redirect if not admin
  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      navigate('/');
    }
  }, [profile, navigate]);

  const sidebarLinks = [
    { name: 'Overview', path: '/admin', icon: LayoutDashboard },
    { name: 'Products', path: '/admin/products', icon: Package },
    { name: 'Orders', path: '/admin/orders', icon: ShoppingBag },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Withdrawals', path: '/admin/withdrawals', icon: CreditCard },
    { name: 'Referrals', path: '/admin/referrals', icon: TrendingUp },
    { name: 'Your Trainer Sessions', path: '/admin/trainer-sessions', icon: MessageSquare },
    { name: 'Your Trainer Profile', path: '/admin/trainer-profile', icon: UserIcon },
    { name: 'Analytics', path: '/admin/analytics', icon: TrendingUp },
    { name: 'Special Sale', path: '/admin/special-sale', icon: Sparkles },
    { name: 'Category Images', path: '/admin/category-images', icon: ImageIcon },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  if (!profile || profile.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm z-40 lg:hidden"
          ></motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 transition-transform duration-300 transform lg:translate-x-0 lg:static lg:inset-0",
        !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-xl group-hover:rotate-12 transition-transform">P</div>
              <span className="text-xl font-black tracking-tighter text-gray-900 uppercase">PURNEA <span className="text-orange-600">SUPPS</span></span>
            </Link>
          </div>

          <nav className="flex-grow px-4 space-y-1 overflow-y-auto custom-scrollbar">
            {sidebarLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => window.innerWidth < 1024 && setIsSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                  location.pathname === link.path 
                    ? "bg-orange-50 text-orange-600" 
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <link.icon className="w-5 h-5" />
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-50 space-y-2">
            <Link 
              to="/"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
            >
              <TrendingUp className="w-5 h-5 rotate-[-90deg]" />
              Back to Website
            </Link>
            <button 
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 flex-shrink-0 z-30">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-gray-500 hover:bg-gray-50 rounded-xl"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <div className="flex items-center gap-4 ml-auto">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{profile.displayName}</p>
              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Administrator</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-black">
              {profile.displayName?.[0]}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-grow overflow-y-auto custom-scrollbar">
          <div className="p-6 lg:p-10 max-w-7xl mx-auto w-full">
            <Routes>
              <Route index element={<AdminOverview />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="withdrawals" element={<AdminWithdrawals />} />
              <Route path="referrals" element={<AdminReferrals />} />
              <Route path="trainer-sessions" element={<AdminTrainerSessions />} />
              <Route path="trainer-profile" element={<AdminTrainerProfile />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="special-sale" element={<AdminSpecialSale />} />
              <Route path="category-images" element={<AdminCategoryImages />} />
              <Route path="settings" element={<AdminSettings />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
