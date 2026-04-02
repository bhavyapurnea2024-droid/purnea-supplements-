import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Sparkles, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface SpecialSale {
  active: boolean;
  title: string;
  subtitle: string;
  discountText: string;
  endTime: string;
}

const SpecialSaleBanner = () => {
  const [sale, setSale] = useState<SpecialSale | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'special_sale'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as SpecialSale;
        setSale(data.active ? data : null);
      } else {
        setSale(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!sale) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(sale.endTime).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setSale(null);
        clearInterval(timer);
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sale]);

  if (!sale || !isVisible || !timeLeft) return null;

  return (
    <div className="bg-orange-600 text-white py-3 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center animate-pulse">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tighter leading-none mb-1">{sale.title}</h3>
            <p className="text-[10px] font-bold text-orange-100 uppercase tracking-widest">{sale.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-[8px] font-black text-orange-200 uppercase tracking-widest mb-1">Discount</p>
            <p className="text-sm font-black">{sale.discountText}</p>
          </div>
          
          <div className="h-8 w-px bg-white/20"></div>

          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-orange-200" />
            <div className="flex gap-2">
              {[
                { label: 'D', value: timeLeft.days },
                { label: 'H', value: timeLeft.hours },
                { label: 'M', value: timeLeft.minutes },
                { label: 'S', value: timeLeft.seconds },
              ].map((unit, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span className="text-sm font-black tabular-nums">{unit.value.toString().padStart(2, '0')}</span>
                  <span className="text-[8px] font-bold text-orange-200">{unit.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button 
          onClick={() => setIsVisible(false)}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-full transition-all md:static md:translate-y-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SpecialSaleBanner;
