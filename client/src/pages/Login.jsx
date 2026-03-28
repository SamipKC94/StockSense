import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogIn, UserPlus, TrendingUp, Cpu, Database, Mail, Lock, User } from 'lucide-react';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin ? { email, password } : { name, email, password };

    try {
      const response = await axios.post(endpoint, payload);
      localStorage.setItem('userInfo', JSON.stringify(response.data));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${isLogin ? 'sign in' : 'register'}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      {/* Container */}
      <div className="w-full max-w-6xl h-auto md:h-[800px] flex flex-col md:flex-row rounded-3xl overflow-hidden glass shadow-2xl shadow-primary-500/10 border border-slate-700/50">
        
        {/* Left Side: Branding / Abstract Showcase */}
        <div className="w-full md:w-1/2 p-10 md:p-16 relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-dark-surface to-slate-900">
          {/* Abstract blobs */}
          <div className="absolute top-[-10%] left-[-20%] w-[500px] h-[500px] bg-primary-600/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[80px] mix-blend-screen pointer-events-none"></div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-primary-500/30 bg-primary-500/10 mb-8 backdrop-blur-md">
              <Cpu size={18} className="text-primary-400" />
              <span className="text-sm font-medium tracking-wide text-primary-300">Intelligent Inventory API</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
              Forecast with <br/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-blue-400">Precision.</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed max-w-md">
              StockSense transforms historical chaos into predictable growth. Leverage native Linear Regression and WebSocket synchronization to never run out of supplies again.
            </p>
          </div>


        </div>

        {/* Right Side: Form Controller */}
        <div className="w-full md:w-1/2 p-8 md:p-16 bg-dark-bg/80 flex flex-col justify-center relative">
          <div className="max-w-md w-full mx-auto">
            
            <div className="mb-10 text-center md:text-left">
              <h2 className="text-3xl font-bold text-slate-100 mb-3">
                {isLogin ? 'Welcome Back' : 'Create an Account'}
              </h2>
              <p className="text-slate-400">
                {isLogin 
                  ? 'Enter your credentials to access your dashboard.' 
                  : 'Register a new profile to get started.'}
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-3 font-medium animate-in fade-in slide-in-from-top-4">
                <span className="shrink-0 w-2 h-2 rounded-full bg-red-400"></span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {!isLogin && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-300 ml-1">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User size={18} className="text-slate-500" />
                    </div>
                    <input
                      type="text"
                      required={!isLogin}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all placeholder-slate-600 shadow-sm"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-300 ml-1">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail size={18} className="text-slate-500" />
                  </div>
                  <input
                    type="email"
                    required
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all placeholder-slate-600 shadow-sm"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock size={18} className="text-slate-500" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength="6"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all placeholder-slate-600 shadow-sm"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-semibold tracking-wide transition-all shadow-lg shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 group"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <>
                      {isLogin ? 'Sign In Securely' : 'Create Account'}
                      {isLogin ? <LogIn size={18} className="translate-x-0 group-hover:translate-x-1 transition-transform" /> : <UserPlus size={18} className="translate-x-0 group-hover:translate-x-1 transition-transform" />}
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-8 text-center text-slate-400 text-sm">
              {isLogin ? "Don't have an account yet? " : "Already have an account? "}
              <button 
                onClick={toggleAuthMode}
                className="text-primary-400 hover:text-primary-300 font-semibold underline underline-offset-4 transition-colors"
                type="button"
              >
                {isLogin ? 'Sign up here' : 'Sign in here'}
              </button>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
