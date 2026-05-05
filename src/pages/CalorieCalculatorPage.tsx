import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calculator, RotateCcw, Info, CheckCircle2, User, Flame, TrendingDown, TrendingUp, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

const CalorieCalculatorPage = () => {
  const navigate = useNavigate();
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [activity, setActivity] = useState('1.2');
  const [calories, setCalories] = useState<number | null>(null);

  const calculateTDEE = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseFloat(age);
    const activityFactor = parseFloat(activity);

    if (w > 0 && h > 0 && a > 0) {
      let bmr = 0;
      if (gender === 'male') {
        bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
      } else {
        bmr = (10 * w) + (6.25 * h) - (5 * a) - 161;
      }
      
      const tdee = bmr * activityFactor;
      setCalories(Math.round(tdee));
    }
  };

  const reset = () => {
    setWeight('');
    setHeight('');
    setAge('');
    setGender('male');
    setActivity('1.2');
    setCalories(null);
  };

  const activityOptions = [
    { value: '1.2', label: 'Sedentary', desc: 'Little or no exercise' },
    { value: '1.375', label: 'Light', desc: '1-3 days/week' },
    { value: '1.55', label: 'Moderate', desc: '3-5 days/week' },
    { value: '1.725', label: 'Active', desc: '6-7 days/week' },
    { value: '1.9', label: 'Extra Active', desc: 'Physical job' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-3 py-1 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full mb-6"
          >
            Performance Tools
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter uppercase mb-6"
          >
            Maintenance <span className="text-orange-600">Calories Calculator</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 font-medium max-w-2xl mx-auto"
          >
            Find out exactly how many calories your body needs to maintain its current weight. Knowledge is the first step to your transformation in Purnea!
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Calculator Card */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 bg-white p-8 md:p-12 rounded-[2.5rem] border border-gray-100 shadow-xl"
          >
            <form onSubmit={calculateTDEE} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-xs font-black text-gray-900 uppercase tracking-widest">Gender</label>
                  <div className="flex gap-4">
                    {['male', 'female'].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g as 'male' | 'female')}
                        className={cn(
                          "flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all",
                          gender === g 
                            ? "bg-gray-900 text-white border-gray-900 shadow-lg" 
                            : "bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100"
                        )}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black text-gray-900 uppercase tracking-widest">Age (Years)</label>
                  <input 
                    type="number" 
                    required
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 25"
                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 ring-orange-500/20"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black text-gray-900 uppercase tracking-widest">Weight (kg)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    required
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="e.g. 70"
                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 ring-orange-500/20"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black text-gray-900 uppercase tracking-widest">Height (cm)</label>
                  <input 
                    type="number" 
                    required
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="e.g. 175"
                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 ring-orange-500/20"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-black text-gray-900 uppercase tracking-widest">Activity Level</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {activityOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setActivity(opt.value)}
                      className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all text-center",
                        activity === opt.value 
                          ? "bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-600/20" 
                          : "bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100"
                      )}
                    >
                      <span className="text-[10px] font-black uppercase tracking-tight">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="submit"
                  className="flex-grow bg-gray-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-xl"
                >
                  <Calculator className="w-5 h-5 text-orange-600" /> Calculate Now
                </button>
                <button 
                  type="button"
                  onClick={reset}
                  className="bg-gray-100 text-gray-600 p-5 rounded-2xl hover:bg-gray-200 transition-all"
                >
                  <RotateCcw className="w-6 h-6" />
                </button>
              </div>
            </form>

            {calories !== null && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-12 space-y-8"
              >
                <div className="p-10 bg-orange-600 rounded-[2.5rem] text-white text-center shadow-2xl shadow-orange-600/30 relative overflow-hidden">
                  <Flame className="absolute -right-8 -bottom-8 w-48 h-48 opacity-10 rotate-12" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 opacity-80">Daily Maintenance Calories</p>
                  <div className="text-7xl font-black tracking-tighter mb-4">{calories}</div>
                  <p className="text-sm font-bold bg-white/20 inline-block px-6 py-2 rounded-full uppercase tracking-widest backdrop-blur-sm">
                    kcal / day
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="w-5 h-5 text-blue-600" />
                      <h4 className="text-sm font-black text-blue-900 uppercase tracking-tight">Weight Loss</h4>
                    </div>
                    <p className="text-xs text-blue-700 font-medium mb-3">Eat {calories - 500} kcal/day to lose ~0.5kg/week.</p>
                  </div>
                  <div className="p-6 bg-green-50 rounded-3xl border border-green-100">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <h4 className="text-sm font-black text-green-900 uppercase tracking-tight">Muscle Gain</h4>
                    </div>
                    <p className="text-xs text-green-700 font-medium mb-3">Eat {calories + 300} kcal/day to lean bulk.</p>
                  </div>
                </div>

                {/* Personal Training Call to Action */}
                <div className="bg-gray-900 p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-2">
                    <h4 className="text-xl font-black uppercase tracking-tight">Need a custom plan?</h4>
                    <p className="text-sm text-gray-400 font-medium">Get a personalized diet and workout routine from Coach Bhavyapurnea.</p>
                  </div>
                  <button 
                    onClick={() => navigate('/trainer')}
                    className="w-full md:w-auto bg-orange-600 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-orange-700 transition-all flex items-center justify-center gap-2 group whitespace-nowrap shadow-lg shadow-orange-600/20"
                  >
                    Get Personal Training <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Info Side Area */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                <Info className="w-6 h-6 text-orange-600" />
                Why Calorie Tracking?
              </h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">
                Your maintenance calories (TDEE) is the number of calories you burn each day. Understanding this number allows you to manipulate your diet for your specific goals in Purnea.
              </p>
              <div className="space-y-4">
                {[
                  { label: 'Fat Loss', text: 'Caloric Deficit' },
                  { label: 'Bulking', text: 'Caloric Surplus' },
                  { label: 'Maintain', text: 'Caloric Balance' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <span className="text-xs font-black uppercase tracking-widest text-gray-900">{item.label}</span>
                    <span className="text-xs font-bold text-orange-600">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-orange-600 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
               <User className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
              <h3 className="text-xl font-black uppercase tracking-tight mb-4">Elite Coaching</h3>
              <p className="text-sm text-white/80 mb-6 font-medium leading-relaxed">
                Unlock your full potential with a transformation program designed specifically for you. No more guessing.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  'Custom Macro Calculations',
                  'Purnea-Specific Grocery Lists',
                  'WhatsApp Check-ins',
                  'Progressive Overload Tracking'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-xs font-black uppercase tracking-widest">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    {item}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => navigate('/trainer')}
                className="w-full bg-white text-orange-600 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-gray-50 transition-all shadow-lg"
              >
                Hire Your Trainer
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CalorieCalculatorPage;
