import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Menu, X, Search, Heart, Package, LayoutDashboard, Wallet, Settings, ShieldCheck, ChevronRight, Star, Plus, Minus, Trash2, CheckCircle2, AlertCircle, ArrowRight, Filter, IndianRupee, Instagram, MessageCircle } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './AuthContext';
import { CartProvider, useCart } from './CartContext';
import { cn } from './lib/utils';
import { CATEGORIES, GOALS, MIN_WITHDRAWAL_AMOUNT, WHATSAPP_NUMBER, INSTAGRAM_HANDLE, INSTAGRAM_URL } from './constants';

// Pages (to be implemented in separate files or inline for now)
import HomePage from './pages/HomePage';
import ProductListingPage from './pages/ProductListingPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import MyCampaignPage from './pages/MyCampaignPage';
import AdminDashboard from './pages/AdminDashboard';
import OrderHistoryPage from './pages/OrderHistoryPage';
import LoginPage from './pages/LoginPage';
import PaymentStatusPage from './pages/PaymentStatusPage';
import TrainerPage from './pages/TrainerPage';
import { LoginModal } from './components/LoginModal';
import SpecialSaleBanner from './components/SpecialSaleBanner';

const Navbar = () => {
  const { user, profile, isAdmin, logout, setIsLoginModalOpen } = useAuth();
  const { totalItems } = useCart();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/shop' },
    { name: 'Your Trainer', path: '/trainer' },
    { name: 'MyCampaign', path: '/my-campaign' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-xl group-hover:rotate-12 transition-transform">P</div>
              <span className="text-xl font-black tracking-tighter text-gray-900">PURNEA <span className="text-orange-600">SUPPS</span></span>
            </Link>
            
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map(link => (
                <Link 
                  key={link.path} 
                  to={link.path} 
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-orange-600",
                    location.pathname === link.path ? "text-orange-600" : "text-gray-600"
                  )}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center bg-gray-100 rounded-full px-4 py-1.5 focus-within:ring-2 ring-orange-500/20 transition-all">
              <Search className="w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search supplements..." 
                className="bg-transparent border-none focus:ring-0 text-sm w-48 ml-2"
              />
            </div>

            <Link to="/cart" className="relative p-2 text-gray-600 hover:text-orange-600 transition-colors">
              <ShoppingCart className="w-6 h-6" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white">
                  {totalItems}
                </span>
              )}
            </Link>

            {user && profile ? (
              <div className="flex items-center gap-2">
                <Link to="/my-campaign" className="hidden sm:flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-orange-100 transition-colors">
                  <Wallet className="w-3.5 h-3.5" />
                  ₹{profile?.wallet?.withdrawable.toFixed(2)}
                </Link>
                <div className="relative group">
                  <button className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden border-2 border-transparent group-hover:border-orange-500 transition-all">
                    <img 
                      src={`https://ui-avatars.com/api/?name=${profile.displayName}&background=random`} 
                      alt={profile.displayName || 'User'} 
                      referrerPolicy="no-referrer"
                    />
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all translate-y-2 group-hover:translate-y-0">
                    <div className="px-4 py-2 border-b border-gray-50">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-gray-900 truncate">{profile.displayName}</p>
                        {isAdmin && <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">Admin</span>}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{profile.email}</p>
                    </div>
                    <Link to="/orders" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"><Package className="w-4 h-4" /> My Orders</Link>
                    <Link to="/my-campaign" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"><LayoutDashboard className="w-4 h-4" /> MyCampaign</Link>
                    {isAdmin && (
                      <Link to="/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-orange-600 font-bold hover:bg-orange-50"><ShieldCheck className="w-4 h-4" /> Admin Panel</Link>
                    )}
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setIsLoginModalOpen(true)}
                className="bg-gray-900 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-gray-800 transition-all active:scale-95"
              >
                Sign In
              </button>
            )}

            <button 
              className="md:hidden p-2 text-gray-600"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-100 overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4">
              {navLinks.map(link => (
                <Link 
                  key={link.path} 
                  to={link.path} 
                  onClick={() => setIsMenuOpen(false)}
                  className="block text-lg font-bold text-gray-900"
                >
                  {link.name}
                </Link>
              ))}
              <div className="pt-4 border-t border-gray-50">
                {user ? (
                  <div className="space-y-4">
                    {isAdmin && (
                      <Link 
                        to="/admin" 
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2 text-lg font-bold text-orange-600"
                      >
                        <ShieldCheck className="w-5 h-5" /> Admin Panel
                      </Link>
                    )}
                    <button 
                      onClick={handleLogout}
                      className="flex items-center gap-2 text-red-600 font-bold"
                    >
                      <LogOut className="w-5 h-5" /> Sign Out
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsLoginModalOpen(true);
                    }}
                    className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Footer = () => (
  <footer className="bg-gray-950 text-gray-400 py-12 border-t border-gray-900">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-2">
          <Link to="/" className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">P</div>
            <span className="text-xl font-black tracking-tighter text-white">PURNEA <span className="text-orange-600">SUPPS</span></span>
          </Link>
          <p className="text-sm leading-relaxed max-w-sm">
            Your premium destination for high-quality fitness supplements. We help you reach your goals with science-backed nutrition and a community-driven referral system.
            </p>
        </div>
        <div>
          <h4 className="text-white font-bold mb-6">Quick Links</h4>
          <ul className="space-y-4 text-sm">
            <li><Link to="/shop" className="hover:text-orange-500 transition-colors">Shop All</Link></li>
            <li><Link to="/trainer" className="hover:text-orange-500 transition-colors">Your Trainer</Link></li>
            <li><Link to="/my-campaign" className="hover:text-orange-500 transition-colors">MyCampaign</Link></li>
            <li><Link to="/orders" className="hover:text-orange-500 transition-colors">Order Tracking</Link></li>
            <li><Link to="/about" className="hover:text-orange-500 transition-colors">About Us</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-6">Support</h4>
          <ul className="space-y-4 text-sm">
            <li>
              <a 
                href={`https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}`} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-orange-500 transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp Support
              </a>
            </li>
            <li>
              <a 
                href={INSTAGRAM_URL} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-orange-500 transition-colors"
              >
                <Instagram className="w-4 h-4" /> Instagram {INSTAGRAM_HANDLE}
              </a>
            </li>
            <li><Link to="/faq" className="hover:text-orange-500 transition-colors">FAQs</Link></li>
            <li><Link to="/privacy" className="hover:text-orange-500 transition-colors">Privacy Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="mt-12 pt-8 border-t border-gray-900 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
        <p>© 2026 Purnea Supplements. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <span>Made with ❤️ for Fitness</span>
        </div>
      </div>
    </div>
  </footer>
);

const AppContent = () => {
  const { isLoginModalOpen, setIsLoginModalOpen } = useAuth();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans selection:bg-orange-100 selection:text-orange-900">
      {!isAdminRoute && <SpecialSaleBanner />}
      {!isAdminRoute && <Navbar />}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ProductListingPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/my-campaign" element={<MyCampaignPage />} />
          <Route path="/trainer" element={<TrainerPage />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/orders" element={<OrderHistoryPage />} />
          <Route path="/payment-status" element={<PaymentStatusPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </main>
      {!isAdminRoute && <Footer />}
      
      {/* Floating WhatsApp Button */}
      {!isAdminRoute && (
        <a 
          href={`https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}`}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-6 right-6 z-[60] bg-green-500 text-white p-4 rounded-full shadow-2xl shadow-green-500/40 hover:bg-green-600 hover:scale-110 transition-all group active:scale-95"
          title="Contact on WhatsApp"
        >
          <MessageCircle className="w-6 h-6 fill-current" />
          <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Chat with us
          </span>
        </a>
      )}

      <Toaster position="top-center" richColors />
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}
