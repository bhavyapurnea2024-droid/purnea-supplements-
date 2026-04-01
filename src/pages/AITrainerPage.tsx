import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { db, handleFirestoreError, OperationType, logAction } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, orderBy, limit, increment } from 'firebase/firestore';
import { TrainerSession, TrainerMessage } from '../types';
import { AI_TRAINER_PRICE, AI_TRAINER_SESSION_DURATION } from '../constants';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  ShieldCheck, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  User, 
  Dumbbell, 
  Utensils, 
  Sparkles,
  Send,
  AlertCircle,
  IndianRupee,
  Copy,
  Wallet
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';

const AITrainerPage = () => {
  const { user, profile } = useAuth();
  const [session, setSession] = useState<TrainerSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentStep, setPaymentStep] = useState<'landing' | 'processing' | 'success'>('landing');
  const [paymentMethod, setPaymentMethod] = useState<'cashfree' | 'wallet'>('cashfree');
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [cashfree, setCashfree] = useState<any>(null);
  const [trainerProfile, setTrainerProfile] = useState({
    name: 'Personal Trainer',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=1000',
    bio: 'Your Personal Fitness Expert specializing in Indian Diet & Workouts.',
  });
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'trainer'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setTrainerProfile({
          name: data.name || 'Personal Trainer',
          image: data.image || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=1000',
          bio: data.bio || 'Your Personal Fitness Expert specializing in Indian Diet & Workouts.',
        });
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const initCashfree = () => {
      if ((window as any).Cashfree) {
        try {
          const cf = (window as any).Cashfree({
            mode: process.env.NODE_ENV === "production" ? "production" : "sandbox",
          });
          setCashfree(cf);
          console.log("Cashfree SDK initialized in Trainer Page");
        } catch (err) {
          console.error("Error initializing Cashfree SDK:", err);
        }
      }
    };

    if ((window as any).Cashfree) {
      initCashfree();
    } else {
      const interval = setInterval(() => {
        if ((window as any).Cashfree) {
          initCashfree();
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  const getTrainerPrompt = (name: string) => `You are "${name}", a professional Indian Fitness & Nutrition Expert. 
Your goal is to provide a highly personalized Indian Diet and Workout plan.

Persona:
- Professional, empathetic, and encouraging.
- Use VERY SIMPLE words. Avoid complex jargon.
- Ask questions ONE BY ONE. Never ask more than one question in a single message.
- Expert in Indian cuisine (Dal, Roti, Sabzi, Paneer, Chicken Curry, etc.).
- Understands Indian lifestyle (long working hours, vegetarian/non-vegetarian preferences).
- Speaks clearly and professionally, like a real person.

Process:
1. You MUST follow a strict questioning sequence to understand the user:
   - Ask questions one by one.
   - For Multiple Choice questions, use this EXACT format at the end of your message:
     OPTIONS: ["Option 1", "Option 2", "Option 3"]
   - First, ask if they prefer to talk in "Hinglish" or "English" (Multiple Choice).
   - Then, ask 3 Multiple Choice questions (e.g., Goal, Activity Level, Diet Preference).
   - Then, ask 3 Written questions (e.g., Medical conditions, Allergies, Daily Routine).
   - Then, ask 3 Multiple Choice questions (e.g., Workout frequency, Equipment access, Budget).
2. CRITICAL: You must ask for the user's height and weight.
3. Once you have enough information, generate a comprehensive 7-day Indian Diet Plan and a Workout Plan.
4. WORKOUT REQUIREMENTS: Every exercise MUST include specific Sets and Reps (e.g., 3 Sets of 12 Reps).
5. DIET REQUIREMENTS: Every food item MUST include measurements in GRAMS (e.g., 100g Paneer, 50g Oats).
6. Suggest specific products from "Purnea Supplements" (like Whey Protein, Creatine, Multivitamins) where they fit naturally. 
   - CRITICAL: When suggesting a supplement, ALWAYS include a link to it using this format: [Product Name](/products). For example: [Whey Protein](/products).
7. Remind the user to COPY their plan because it will vanish after 24 hours.

Current Context:
- User is paying ₹149 for this 24-hour access.
- All food recommendations must be Indian.
`;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'trainer_sessions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const sessionData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as TrainerSession;
        // Check if session is still active (within 24h)
        const now = new Date().getTime();
        const expiresAt = new Date(sessionData.expiresAt).getTime();
        
        if (now < expiresAt && sessionData.paymentStatus === 'completed') {
          setSession(sessionData);
        } else {
          setSession(null);
        }
      } else {
        setSession(null);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'trainer_sessions');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (session?.messages && chatContainerRef.current) {
      const container = chatContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [session?.messages, isTyping, isConnecting]);

  const handleWalletPayment = async () => {
    if (!user || !profile) return;
    
    if ((profile.wallet?.withdrawable || 0) < AI_TRAINER_PRICE) {
      toast.error('Insufficient wallet balance');
      return;
    }

    setPaymentStep('processing');
    
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + AI_TRAINER_SESSION_DURATION);

      const sessionData: Omit<TrainerSession, 'id'> = {
        userId: user.uid,
        status: 'active',
        paymentStatus: 'completed',
        amount: AI_TRAINER_PRICE,
        messages: [
          {
            role: 'model',
            text: `Namaste ${profile?.displayName || 'Friend'}! I am ${trainerProfile.name}. I'm honored to help you on your fitness journey. To create the perfect Indian diet and workout plan for you, I need to understand you better. \n\nFirst, would you like to talk in **Hinglish** or **English**?`,
            timestamp: new Date().toISOString()
          }
        ],
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      const docRef = await addDoc(collection(db, 'trainer_sessions'), sessionData);
      
      // Deduct from wallet
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        'wallet.withdrawable': increment(-AI_TRAINER_PRICE)
      });

      await logAction(user.uid, user.email || '', user.displayName || '', 'PURCHASE_AI_TRAINER', `Purchased Your Trainer session for ₹${AI_TRAINER_PRICE} (Wallet Payment)`, 'user');
      
      setPaymentStep('success');
      toast.success('Payment Successful via Wallet! Your Trainer is ready.');
      
      setTimeout(() => {
        setPaymentStep('landing');
      }, 1500);
    } catch (error) {
      setPaymentStep('landing');
      handleFirestoreError(error, OperationType.CREATE, 'trainer_sessions');
    }
  };

  const handleCashfreePayment = async () => {
    if (!user || !cashfree) {
      toast.error("Payment system not ready. Please refresh.");
      return;
    }
    setPaymentStep('processing');
    
    const orderId = `trainer_${Date.now()}`;

    try {
      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderAmount: AI_TRAINER_PRICE,
          customerId: user.uid,
          customerPhone: profile?.phoneNumber || '9999999999',
          customerEmail: user.email,
          orderId: orderId
        })
      });

      const data = await response.json();
      console.log("Trainer Payment Response:", data);

      if (!data.payment_session_id) {
        const errorMsg = data.message || data.error?.message || 'Failed to create payment session';
        throw new Error(errorMsg);
      }

      // Initiate Cashfree Checkout
      console.log("Initiating Trainer Checkout with session:", data.payment_session_id);
      cashfree.checkout({
        paymentSessionId: data.payment_session_id,
        redirectTarget: "_self",
      });
    } catch (error: any) {
      console.error("Payment Error:", error);
      toast.error(`Payment Error: ${error.message || "Failed to initiate payment"}`);
      setPaymentStep('landing');
    }
  };

  const sendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || inputText;
    if (!textToSend.trim() || !session || !user) return;

    const userMessage: TrainerMessage = {
      role: 'user',
      text: textToSend,
      timestamp: new Date().toISOString()
    };

    // Calculate delay
    const lastMessage = session.messages[session.messages.length - 1];
    const timeSinceLastMessage = lastMessage 
      ? Date.now() - new Date(lastMessage.timestamp).getTime() 
      : Infinity;
    
    const userMessageCount = session.messages.filter(m => m.role === 'user').length;
    const isFirstReply = userMessageCount === 0;
    const needsLongDelay = isFirstReply || timeSinceLastMessage > 4 * 60 * 1000;
    const delay = needsLongDelay ? 120000 : 5000;

    const updatedMessages = [...session.messages, userMessage];
    if (!textOverride) setInputText('');
    
    if (needsLongDelay) {
      setIsConnecting(true);
    } else {
      setIsTyping(true);
    }

    try {
      // Update Firestore with user message immediately
      const sessionRef = doc(db, 'trainer_sessions', session.id);
      await updateDoc(sessionRef, { messages: updatedMessages });

      // Wait for the specified delay
      await new Promise(resolve => setTimeout(resolve, delay));

      // Call Gemini
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API Key is missing. Please check your environment settings.');
      }
      
      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-3-flash-preview";
      
      const chatHistory = updatedMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const response = await ai.models.generateContent({
        model,
        contents: chatHistory,
        config: {
          systemInstruction: getTrainerPrompt(trainerProfile.name),
        }
      });

      const aiText = response.text || "I'm sorry, I'm having trouble connecting. Could you repeat that?";
      
      const aiMessage: TrainerMessage = {
        role: 'model',
        text: aiText,
        timestamp: new Date().toISOString()
      };

      await updateDoc(sessionRef, { 
        messages: [...updatedMessages, aiMessage]
      });

    } catch (error) {
      console.error('Gemini Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to get response: ${errorMessage}. Please try again.`);
    } finally {
      setIsTyping(false);
      setIsConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="bg-gray-50 min-h-screen py-12">
        <div className="max-w-4xl mx-auto px-4">
          {paymentStep === 'landing' ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100"
            >
              <div className="relative h-80">
                <img 
                  src={trainerProfile.image} 
                  alt={trainerProfile.name} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-end p-12">
                  <div className="mt-auto">
                    <span className="bg-orange-600 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4 inline-block">Premium Service</span>
                    <h1 className="text-5xl font-black text-white tracking-tighter uppercase leading-none mb-4">Meet <span className="text-orange-500">{trainerProfile.name}</span></h1>
                    <p className="text-gray-200 text-lg font-medium max-w-xl">{trainerProfile.bio}</p>
                  </div>
                </div>
              </div>

              <div className="p-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center">
                      <Utensils className="w-6 h-6" />
                    </div>
                    <h3 className="font-black text-gray-900 uppercase tracking-tight">Indian Diet Plan</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">Customized meal plans featuring Ghar ka Khana, optimized for your fitness goals.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                      <Dumbbell className="w-6 h-6" />
                    </div>
                    <h3 className="font-black text-gray-900 uppercase tracking-tight">Personalized Workout</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">Training routines designed for your body type, equipment access, and schedule.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <h3 className="font-black text-gray-900 uppercase tracking-tight">24h Expert Access</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">Talk to {trainerProfile.name} anytime for 24 hours to refine and adjust your plans instantly.</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-3xl p-8 flex flex-col gap-8">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div>
                      <div className="flex items-center gap-2 text-orange-600 font-black uppercase tracking-widest text-xs mb-2">
                        <Sparkles className="w-4 h-4" /> Limited Time Offer
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-gray-900">₹{AI_TRAINER_PRICE}</span>
                        <span className="text-gray-400 line-through font-bold">₹999</span>
                      </div>
                      <p className="text-sm text-gray-500 font-medium mt-1">Get your personalized plan in minutes.</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                      <button 
                        onClick={() => setPaymentMethod('cashfree')}
                        className={cn(
                          "flex-1 md:w-48 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                          paymentMethod === 'cashfree' ? "border-orange-500 bg-orange-50" : "border-gray-200 bg-white"
                        )}
                      >
                        <CreditCard className="w-6 h-6 text-orange-600" />
                        <span className="font-bold text-xs uppercase tracking-widest">Cashfree</span>
                      </button>
                      <button 
                        onClick={() => setPaymentMethod('wallet')}
                        disabled={(profile?.wallet?.withdrawable || 0) < AI_TRAINER_PRICE}
                        className={cn(
                          "flex-1 md:w-48 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                          paymentMethod === 'wallet' ? "border-orange-500 bg-orange-50" : "border-gray-200 bg-white",
                          (profile?.wallet?.withdrawable || 0) < AI_TRAINER_PRICE && "opacity-50 grayscale cursor-not-allowed"
                        )}
                      >
                        <Wallet className="w-6 h-6 text-orange-600" />
                        <span className="font-bold text-xs uppercase tracking-widest">Wallet (₹{profile?.wallet?.withdrawable || 0})</span>
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={paymentMethod === 'cashfree' ? handleCashfreePayment : handleWalletPayment}
                    disabled={(paymentMethod === 'wallet' && (profile?.wallet?.withdrawable || 0) < AI_TRAINER_PRICE)}
                    className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-orange-700 shadow-2xl shadow-orange-600/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    Start My Transformation <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : paymentStep === 'processing' ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mb-8"></div>
              <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-4">Processing Payment</h2>
              <p className="text-gray-500 max-w-sm">Please do not refresh. We are connecting you with {trainerProfile.name}...</p>
            </div>
          ) : (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-8">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-4">Namaste! Payment Successful</h2>
              <p className="text-gray-500 mb-8">{trainerProfile.name} is waiting for you in the chat.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const timeLeft = new Date(session.expiresAt).getTime() - new Date().getTime();
  const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));
  const minutesLeft = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)));

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      {/* 24h Warning Banner */}
      <div className="bg-orange-600 text-white py-2.5 px-4 text-center text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2">
        <AlertCircle className="w-3.5 h-3.5" />
        Important: Your session with {trainerProfile.name} is valid for exactly 24 hours after payment.
      </div>

      {/* Chat Header */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 font-black text-xl overflow-hidden">
                <img 
                  src={trainerProfile.image} 
                  alt={trainerProfile.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <h2 className="font-black text-gray-900 uppercase tracking-tight leading-none mb-1">{trainerProfile.name}</h2>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <Clock className="w-3 h-3" /> {hoursLeft}h {minutesLeft}m access remaining
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5" /> Verified Expert
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-grow overflow-y-auto p-4 sm:p-8 scroll-smooth"
      >
        <div className="max-w-4xl mx-auto space-y-8">
          {session.messages.map((msg, i) => {
            const optionsMatch = msg.text.match(/OPTIONS:\s*(\[.*\])/);
            const options = optionsMatch ? JSON.parse(optionsMatch[1]) : null;
            const cleanText = msg.text.replace(/OPTIONS:\s*\[.*\]/, '').trim();
            const isPlan = msg.text.toLowerCase().includes('diet plan') || msg.text.toLowerCase().includes('workout plan');

            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={i} 
                className={cn(
                  "flex gap-4 max-w-[90%]",
                  msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-xs",
                  msg.role === 'user' ? "bg-gray-900 text-white" : "bg-orange-100 text-orange-600"
                )}>
                  {msg.role === 'user' ? profile?.displayName?.charAt(0) || 'U' : 'A'}
                </div>
                <div className="flex flex-col gap-2 flex-grow">
                  <div className={cn(
                    "p-6 rounded-3xl shadow-sm relative group",
                    msg.role === 'user' ? "bg-gray-900 text-white rounded-tr-none" : "bg-white text-gray-800 rounded-tl-none border border-gray-100"
                  )}>
                    {isPlan && (
                      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(cleanText);
                            toast.success('Plan copied to clipboard!');
                          }}
                          className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-all"
                          title="Copy Plan"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <div className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest animate-pulse">
                          Copy now! Vanishes in 24h
                        </div>
                      </div>
                    )}
                    <div className="prose prose-sm max-w-none prose-headings:text-inherit prose-p:text-inherit prose-strong:text-inherit prose-ul:text-inherit">
                      <Markdown>{cleanText}</Markdown>
                    </div>
                    <p className={cn(
                      "text-[10px] mt-4 font-bold uppercase tracking-widest opacity-40",
                      msg.role === 'user' ? "text-right" : ""
                    )}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  
                  {options && msg.role === 'model' && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {options.map((opt: string, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => sendMessage(opt)}
                          disabled={isTyping}
                          className="bg-orange-50 hover:bg-orange-100 text-orange-600 px-4 py-2 rounded-xl text-xs font-bold border border-orange-200 transition-all active:scale-95 disabled:opacity-50"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
          {isConnecting && (
            <div className="flex gap-4 max-w-[85%]">
              <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-black text-xs">A</div>
              <div className="bg-white p-6 rounded-3xl rounded-tl-none border border-gray-100 shadow-sm">
                <div className="flex flex-col gap-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">
                    Connecting you to the best trainer...
                  </p>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Chat Input */}
      <div className="bg-white border-t border-gray-100 p-4 sm:p-8 sticky bottom-0">
        <div className="max-w-4xl mx-auto">
          <div className="relative flex items-center gap-4">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={`Type your message to ${trainerProfile.name}...`}
              className="flex-grow bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 ring-orange-500/20 transition-all"
            />
            <button 
              onClick={() => sendMessage()}
              disabled={!inputText.trim() || isTyping || isConnecting}
              className="bg-orange-600 text-white p-4 rounded-2xl hover:bg-orange-700 transition-all active:scale-95 disabled:bg-gray-200 disabled:scale-100"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest mt-4">
            {trainerProfile.name} will help you with Indian Diet & Workout Plans
          </p>
        </div>
      </div>
    </div>
  );
};

export default AITrainerPage;
