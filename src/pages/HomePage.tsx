import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Star, ShieldCheck, Zap, TrendingUp, Users, ChevronRight, Utensils, Dumbbell, MessageSquare } from 'lucide-react';
import { CATEGORIES } from '../constants';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const HomePage = () => {
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'category_images'));
        if (docSnap.exists()) {
          setCategoryImages(docSnap.data() as Record<string, string>);
        }
      } catch (error) {
        console.error('Error fetching category images:', error);
      }
    };
    fetchImages();
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center overflow-hidden bg-gray-950">
        <div className="absolute inset-0 z-0 opacity-40">
          <img 
            src="https://picsum.photos/seed/fitness-hero/1920/1080" 
            alt="Hero Background" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/80 to-transparent"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <span className="inline-block px-3 py-1 bg-orange-600 text-white text-xs font-black uppercase tracking-widest rounded-full mb-6">Premium Supplements</span>
            <h1 className="text-5xl md:text-7xl font-black text-white leading-[0.9] tracking-tighter mb-6">
              FUEL YOUR <span className="text-orange-600">AMBITION</span>.
            </h1>
            <p className="text-lg text-gray-300 mb-8 leading-relaxed">
              Unlock your true potential with science-backed supplements designed for elite performance. Join the Purnea community and earn while you grow.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/shop" className="bg-orange-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-orange-700 transition-all flex items-center gap-2 group">
                Shop Now <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/my-campaign" className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/20 transition-all">
                Join MyCampaign
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats/Features */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: ShieldCheck, label: 'Lab Tested', sub: '100% Pure' },
              { icon: Zap, label: 'Fast Delivery', sub: 'Pan India' },
              { icon: TrendingUp, label: 'Results Driven', sub: 'Science Backed' },
              { icon: Users, label: 'Community', sub: 'Refer & Earn' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mb-4">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900">{item.label}</h3>
                <p className="text-xs text-gray-500">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">SHOP BY CATEGORY</h2>
              <p className="text-gray-500">Find the perfect fuel for your fitness journey.</p>
            </div>
            <Link to="/shop" className="text-orange-600 font-bold text-sm flex items-center gap-1 hover:underline">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map((cat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <Link 
                  to={`/shop?category=${cat}`}
                  className="group relative h-48 rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-2xl transition-all flex flex-col"
                >
                  {/* Category Image - Now Clear (Opacity 100) */}
                  <div className="absolute inset-0 h-full w-full">
                    <img 
                      src={categoryImages[cat] || `https://picsum.photos/seed/${cat}/800/800`} 
                      alt={cat} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 blur-0" 
                      referrerPolicy="no-referrer" 
                    />
                    {/* Dark gradient at bottom to help with text if needed, but we'll use a white background for the label */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                  
                  {/* Category Name with White Background */}
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <div className="bg-white/95 backdrop-blur-sm py-2 px-3 rounded-xl shadow-xl transform translate-y-0 group-hover:-translate-y-1 transition-all text-center">
                      <h3 className="font-black text-gray-900 text-[10px] sm:text-xs leading-tight group-hover:text-orange-600 transition-colors uppercase tracking-widest truncate">
                        {cat}
                      </h3>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* MyCampaign Promo */}
      <section className="py-24 bg-orange-600 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-orange-500 skew-x-12 translate-x-1/4"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6 leading-none">
                EARN WHILE <br /> THEY <span className="text-gray-900">GROW</span>.
              </h2>
              <p className="text-orange-100 text-lg mb-8 max-w-md">
                Join our unique MyCampaign system. Get a unique coupon code, share it with friends, and earn 5% commission on every purchase they make.
              </p>
              <div className="space-y-4 mb-8">
                {[
                  'Get a unique coupon code instantly',
                  'Friends get 10-20% discount using your code',
                  'You earn 5% commission on every order',
                  'Withdraw earnings directly to your UPI'
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white">
                      <Star className="w-3 h-3 fill-current" />
                    </div>
                    <span className="font-medium">{text}</span>
                  </div>
                ))}
              </div>
              <Link to="/my-campaign" className="inline-block bg-gray-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-gray-800 transition-all">
                Start Earning Now
              </Link>
            </div>
            <div className="relative">
              <div className="bg-white rounded-3xl p-8 shadow-2xl relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <h4 className="font-black text-gray-900">MyCampaign Dashboard</h4>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Active</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <p className="text-xs text-gray-500 mb-1">Total Earned</p>
                    <p className="text-2xl font-black text-gray-900">₹12,450</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-2xl">
                    <p className="text-xs text-orange-600 mb-1">Coupon Code</p>
                    <p className="text-2xl font-black text-orange-600 tracking-widest">FIT50</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 w-3/4"></div>
                  </div>
                  <p className="text-xs text-gray-500 text-center">You are in the top 5% of referrers this month!</p>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-orange-400 rounded-full blur-2xl opacity-50"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-orange-300 rounded-full blur-3xl opacity-30"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Personal Trainer Promo */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-900 rounded-[3rem] overflow-hidden relative">
            <div className="absolute inset-0 opacity-40 group hover:opacity-50 transition-opacity">
              <img 
                src="https://picsum.photos/seed/trainer-promo/1920/1080" 
                alt="Trainer" 
                className="w-full h-full object-cover grayscale-[20%] group-hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="relative z-10 p-12 md:p-20 flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="max-w-xl">
                <span className="inline-block px-3 py-1 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full mb-6">New Feature</span>
                <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-6 leading-none uppercase">
                  GET YOUR PERSONAL <br /> <span className="text-orange-600">TRAINER NOW 💪</span>
                </h2>
                <p className="text-gray-400 text-lg mb-8">
                  Custom workout plans, Indian diet charts, and direct 1-on-1 support. Everything you need to transform your body manually guided by our experts.
                </p>
                <Link to="/trainer" className="bg-orange-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-orange-700 transition-all flex items-center gap-2 w-fit group">
                  Get Started <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Custom Diet', icon: Utensils },
                  { icon: Dumbbell, label: 'Workout Plan' },
                  { icon: MessageSquare, label: '1-on-1 Chat' },
                  { icon: Zap, label: 'Fast Results' }
                ].map((item, i) => (
                  <div key={i} className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-orange-600/20 text-orange-500 rounded-xl flex items-center justify-center mb-3">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black text-white uppercase tracking-widest">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
