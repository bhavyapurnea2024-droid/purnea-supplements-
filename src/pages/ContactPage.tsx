import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Phone, Mail, Clock, MessageCircle, Send, Instagram, ExternalLink } from 'lucide-react';
import { WHATSAPP_NUMBER, INSTAGRAM_URL, ADMIN_EMAIL } from '../constants';

const ContactPage = () => {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative h-[40vh] flex items-center bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
          >
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase mb-4">
              Get <span className="text-orange-600">In Touch</span>
            </h1>
            <p className="text-lg text-gray-400 font-medium tracking-tight">
              Visit the best supplements store and fitness center in Purnea. Have a question? We're here to help.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Contact Info */}
          <div className="space-y-12">
            <div>
              <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight mb-8 underline decoration-orange-600 decoration-4 underline-offset-8">Visit Our Store</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 flex flex-col gap-4">
                  <div className="w-12 h-12 bg-orange-600 text-white rounded-2xl flex items-center justify-center">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs mb-2">Location</h3>
                    <p className="text-sm text-gray-500 font-medium">Line Bazar, Near Red Cross Society, Purnea, Bihar 854301</p>
                  </div>
                  <a 
                    href="https://maps.google.com/?q=Line+Bazar+Purnea+Bihar" 
                    target="_blank" 
                    className="text-xs font-black text-orange-600 uppercase tracking-widest flex items-center gap-1 hover:underline mt-2"
                  >
                    Get Directions <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 flex flex-col gap-4">
                  <div className="w-12 h-12 bg-orange-600 text-white rounded-2xl flex items-center justify-center">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs mb-2">Opening Hours</h3>
                    <p className="text-sm text-gray-500 font-medium">Mon - Sun: 06:00 AM - 10:00 PM</p>
                    <p className="text-[10px] text-orange-600 font-bold mt-1 uppercase italic">Open All Days</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Direct Support</h3>
              <div className="space-y-4">
                <a href={`tel:${WHATSAPP_NUMBER}`} className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-all border border-transparent hover:border-gray-100 group">
                  <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Call or WhatsApp</p>
                    <p className="text-sm font-black text-gray-900">{WHATSAPP_NUMBER}</p>
                  </div>
                </a>
                <a href={`mailto:${ADMIN_EMAIL || 'help@purneasupps.com'}`} className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-all border border-transparent hover:border-gray-100 group">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Address</p>
                    <p className="text-sm font-black text-gray-900">{ADMIN_EMAIL || 'help@purneasupps.com'}</p>
                  </div>
                </a>
                <a href={INSTAGRAM_URL} target="_blank" className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-all border border-transparent hover:border-gray-100 group">
                  <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Instagram className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Instagram</p>
                    <p className="text-sm font-black text-gray-900">Follow for Daily Tips</p>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Quick Inquiry Form */}
          <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl relative">
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-8">Quick <span className="text-orange-600">Inquiry</span></h3>
            <form className="space-y-6" onSubmit={(e) => {
              e.preventDefault();
              alert('Redirecting to WhatsApp for instant reply...');
              window.open(`https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=Hello Purnea Supps, I have an inquiry about...`, '_blank');
            }}>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Name</label>
                <input type="text" required className="w-full bg-gray-50 border-none rounded-xl px-6 py-4 text-sm font-bold focus:ring-2 ring-orange-500/20" placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mobile Number</label>
                <input type="tel" required className="w-full bg-gray-50 border-none rounded-xl px-6 py-4 text-sm font-bold focus:ring-2 ring-orange-500/20" placeholder="+91 00000 00000" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Interest</label>
                <select className="w-full bg-gray-50 border-none rounded-xl px-6 py-4 text-sm font-bold focus:ring-2 ring-orange-500/20">
                  <option>Supplements Inquiry</option>
                  <option>Gym Membership</option>
                  <option>Personal Training</option>
                  <option>Weight Loss Program</option>
                  <option>Muscle Gain Program</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Message</label>
                <textarea rows={4} className="w-full bg-gray-50 border-none rounded-xl px-6 py-4 text-sm font-bold focus:ring-2 ring-orange-500/20 resize-none" placeholder="How can we help you?"></textarea>
              </div>
              <button type="submit" className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-orange-700 transition-all flex items-center justify-center gap-2 group active:scale-95 shadow-xl shadow-orange-600/20">
                Send Message <MessageCircle className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              </button>
            </form>
            
            <div className="mt-8 pt-8 border-t border-gray-50 flex items-center justify-center gap-4 grayscale opacity-50">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_Maps_icon_%282020%29.svg/1200px-Google_Maps_icon_%282020%29.svg.png" className="h-6" alt="Maps" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/1200px-WhatsApp.svg.png" className="h-6" alt="WhatsApp" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/1200px-Instagram_logo_2016.svg.png" className="h-6" alt="Instagram" />
            </div>
          </div>
        </div>
      </section>

      {/* Embedded Map Simulation - Purnea Bihar */}
      <section className="h-[400px] bg-gray-100 grayscale hover:grayscale-0 transition-all cursor-pointer relative overflow-hidden" onClick={() => window.open('https://maps.google.com/?q=Line+Bazar+Purnea+Bihar', '_blank')}>
        <div className="absolute inset-0 flex items-center justify-center flex-col z-10 bg-gray-950/40 text-white p-4">
          <MapPin className="w-12 h-12 mb-4 text-orange-600" />
          <h3 className="text-2xl font-black uppercase tracking-tighter">Locate Us in Purnea</h3>
          <p className="text-sm font-medium">Click to open Google Maps</p>
        </div>
        <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2074&auto=format&fit=crop" className="w-full h-full object-cover" alt="Map Placeholder" />
      </section>
    </div>
  );
};

export default ContactPage;
