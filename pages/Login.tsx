
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { db } from '../services/db';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const user = await db.findByEmail(email);
        if (!user || user.password !== password) {
          throw new Error("Invalid email or password.");
        }
        onLogin(user);
      } else {
        const existing = await db.findByEmail(email);
        if (existing) throw new Error("Email already registered.");

        const allUsers = await db.getUsers();
        // The very first user to sign up in the system is automatically the Admin
        const assignedRole = allUsers.length === 0 ? UserRole.ADMIN : UserRole.STUDENT;

        const newUser: User = {
          id: Math.random().toString(36).substr(2, 9),
          name,
          email,
          password,
          rollNumber: assignedRole === UserRole.ADMIN ? 'ROOT-001' : 'ID-' + Math.floor(Math.random() * 90000 + 10000),
          role: assignedRole,
          isVerified: true, // Verification removed as requested
          lastLogin: new Date().toISOString()
        };
        const saved = await db.saveUser(newUser);
        onLogin(saved);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0f172a]">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-black text-white tracking-tighter italic">ATTENDIFY</h1>
        <p className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest mt-2">Smart Attendance System</p>
      </div>

      <div className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl animate-fadeIn">
        <h2 className="text-3xl font-black text-slate-900 mb-8 text-center uppercase tracking-tight">
          {isLogin ? 'Login' : 'Sign Up'}
        </h2>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Full Name</label>
              <input 
                type="text" 
                placeholder="Your name" 
                className="w-full px-6 py-4 bg-slate-100 rounded-2xl border-2 border-transparent outline-none font-bold text-slate-900 focus:border-indigo-500 transition-all"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Email Address</label>
            <input 
              type="email" 
              placeholder="email@example.com" 
              className="w-full px-6 py-4 bg-slate-100 rounded-2xl border-2 border-transparent outline-none font-bold text-slate-900 focus:border-indigo-500 transition-all"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="w-full px-6 py-4 bg-slate-100 rounded-2xl border-2 border-transparent outline-none font-bold text-slate-900 focus:border-indigo-500 transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
              <p className="text-red-500 text-xs font-bold text-center">{error}</p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 mt-4 shadow-xl active:scale-[0.98]"
          >
            {isLoading ? "Loading..." : (isLogin ? "Sign In" : "Create Account")}
          </button>
        </form>

        <button 
          onClick={() => { setIsLogin(!isLogin); setError(null); }}
          className="mt-8 w-full text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
        >
          {isLogin ? (
            <>Don't have an account? <span className="text-indigo-600 ml-1">Sign Up</span></>
          ) : (
            <>Already have an account? <span className="text-indigo-600 ml-1">Login</span></>
          )}
        </button>
      </div>
    </div>
  );
};

export default Login;
