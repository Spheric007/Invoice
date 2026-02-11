import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white p-10 md:p-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-black text-white rounded-3xl text-3xl mb-6 shadow-xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
            <i className="fas fa-print"></i>
          </div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Invoice Pro</h1>
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em] opacity-60">Master Computer Management</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-bold flex items-center animate-in fade-in slide-in-from-top-2">
            <i className="fas fa-exclamation-circle mr-3 text-lg"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Email Address</label>
            <div className="relative">
              <i className="fas fa-envelope absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
              <input
                type="email"
                required
                className="w-full pl-14 pr-6 py-4 rounded-2xl border border-gray-100 bg-gray-50 outline-none focus:ring-4 focus:ring-black/5 focus:bg-white transition-all font-bold placeholder:text-gray-300"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Password</label>
            <div className="relative">
              <i className="fas fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
              <input
                type="password"
                required
                className="w-full pl-14 pr-6 py-4 rounded-2xl border border-gray-100 bg-gray-50 outline-none focus:ring-4 focus:ring-black/5 focus:bg-white transition-all font-bold placeholder:text-gray-300"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>Sign In to Dashboard <i className="fas fa-arrow-right ml-3"></i></>
            )}
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-gray-50 text-center">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
            Protected by Cloud Auth Security
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;