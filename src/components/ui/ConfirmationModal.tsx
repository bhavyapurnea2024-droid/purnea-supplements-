import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  loading = false
}: ConfirmationModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm"
          ></motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  type === 'danger' ? "bg-red-100 text-red-600" : 
                  type === 'warning' ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                )}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-8">{message}</p>

              <div className="flex gap-3">
                <button 
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 bg-gray-100 text-gray-900 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all disabled:opacity-50"
                >
                  {cancelText}
                </button>
                <button 
                  onClick={onConfirm}
                  disabled={loading}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2",
                    type === 'danger' ? "bg-red-600 text-white hover:bg-red-700 shadow-red-600/20" : 
                    type === 'warning' ? "bg-orange-600 text-white hover:bg-orange-700 shadow-orange-600/20" : 
                    "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20"
                  )}
                >
                  {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;
