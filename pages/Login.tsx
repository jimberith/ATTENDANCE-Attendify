
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { db } from '../services/db';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [error, setError] = useState('');
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const checkUsers = async () => {
      const users = await db.getUsers();
      setIsFirstUser(users.length === 0);
    };
    checkUsers();
  }, [isSignup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);

    try {
      if (isSignup) {
        const existing = await db.findByEmail(email);
        if (existing) {
          setError('EMAIL ALREADY USED');
          setIsProcessing(false);
          return;
        }

        const role = isFirstUser ? UserRole.ADMIN : UserRole.STUDENT;
        const newUser: User = {
          id: Math.random().toString(36).substr(2, 9),
          name: name.trim().toUpperCase(),
          email: email.trim().toLowerCase(),
          password,
          rollNumber: rollNumber.trim().toUpperCase(),
          role,
          isVerified: true,
          lastLogin: new Date().toISOString(),
          settings: {
            notificationsEnabled: true,
            workdayStart: '09:00',
            workdayEnd: '17:00',
            twoFactorEnabled: false,
            faceRecognitionSensitivity: 75,
            require2FABeforeFaceScan: false
          }
        };

        await db.saveUser(newUser);
        onLogin(newUser);
      } else {
        const user = await db.findByEmail(email.trim().toLowerCase());
        if (user && user.password === password) {
          const updatedUser = { ...user, lastLogin: new Date().toISOString() };
          await db.saveUser(updatedUser);
          onLogin(updatedUser);
        } else {
          setError('WRONG EMAIL OR PASSWORD');
        }
      }
    } catch (err) {
      setError('SOMETHING WENT WRONG. TRY AGAIN.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black">
      <div className="w-full max-w-md glass-panel p-10 rounded-[3rem] animate-enter relative overflow-hidden border border-white/10">
        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600 animate-pulse"></div>
        
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-6 shadow-2xl shadow-indigo-600/30">
            <i className="fa-solid fa-bolt-lightning text-4xl"></i>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter italic uppercase">Attendify</h1>
          <p className="text-indigo-400 text-[10px] font-black tracking-[0.3em] uppercase mt-4">
            {isSignup ? (isFirstUser ? 'SET UP MANAGER' : 'JOIN APP') : 'LOGIN'}
          </p>
        </div>

        {error && (
          <div className="bg-red-600/10 text-red-500 p-4 rounded-2xl text-[10px] font-black uppercase text-center mb-6 border border-red-500/30">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-3">Full Name</label>
                <input
                  type="text"
                  placeholder="NAME"
                  className="w-full p-4 rounded-2xl bg-black/40 border border-white/20 text-white font-bold text-xs uppercase outline-none focus:border-indigo-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-3">ID Number</label>
                <input
                  type="text"
                  placeholder="ID"
                  className="w-full p-4 rounded-2xl bg-black/40 border border-white/20 text-white font-bold text-xs uppercase outline-none focus:border-indigo-500"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  required
                />
              </div>
            </>
          )}
          
          <div className="space-y-1">
            <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-3">Email</label>
            <input
              type="email"
              placeholder="EMAIL@MAIL.COM"
              className="w-full p-4 rounded-2xl bg-black/40 border border-white/20 text-white font-bold text-xs outline-none focus:border-indigo-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-3">Password</label>
            <input
              type="password"
              placeholder="PASSWORD"
              className="w-full p-4 rounded-2xl bg-black/40 border border-white/20 text-white font-bold text-xs outline-none focus:border-indigo-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={isProcessing}
            className="w-full btn-action py-5 rounded-[2rem] text-[11px] font-black shadow-2xl mt-6 disabled:opacity-50"
          >
            {isProcessing ? '...' : (isSignup ? 'SIGN UP' : 'LOGIN')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => { setIsSignup(!isSignup); setError(''); }} 
            className="text-white/40 text-[9px] font-black uppercase tracking-widest hover:text-white"
          >
            {isSignup ? 'ALREADY HAVE AN ACCOUNT? LOGIN' : 'CREATE ACCOUNT'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
