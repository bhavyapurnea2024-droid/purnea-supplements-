import React from 'react';
import { LoginModal } from '../components/LoginModal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading, setIsLoginModalOpen } = useAuth();

  // If user is already logged in, redirect to home
  React.useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Open login modal on mount
  React.useEffect(() => {
    setIsLoginModalOpen(true);
    // We don't close it on unmount here because the user might have logged in
    // and we want the modal to close naturally via the auth flow.
  }, [setIsLoginModalOpen]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-orange-100 rounded-full blur-[120px] opacity-50" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-orange-100 rounded-full blur-[120px] opacity-50" />
      </div>
      
      <div className="text-center relative z-0">
        <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-8 animate-bounce">
          <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">P</div>
        </div>
        <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-4">
          Sign in to access your <br />
          <span className="text-orange-600">dashboard</span>
        </h1>
        <p className="text-gray-500 max-w-xs mx-auto font-medium">
          Please complete the authentication in the window that appeared to continue.
        </p>
        <div className="mt-12 flex items-center justify-center gap-4">
          <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse" />
          <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse delay-75" />
          <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse delay-150" />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
