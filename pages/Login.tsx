
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { db } from '../services/db';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showGooglePicker, setShowGooglePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [emailOrRoll, setEmailOrRoll] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [className, setClassName] = useState('');

  const simulatedGoogleAccounts = [
    { name: 'John Doe', email: 'john.doe@gmail.com', avatar: 'https://i.pravatar.cc/150?u=john' },
    { name: 'Alice Smith', email: 'alice.work@gmail.com', avatar: 'https://i.pravatar.cc/150?u=alice' },
    { name: 'System Root', email: 'admin.attendify@gmail.com', avatar: 'https://i.pravatar.cc/150?u=root' }
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      const users = await db.getUsers();
      const user = users.find(u => (u.email === emailOrRoll || u.rollNumber === emailOrRoll) && u.password === password);
      
      setTimeout(() => {
        if (user) {
          onLogin(user);
        } else {
          setError('Authentication failed. Check your ID and password.');
          setIsLoading(false);
        }
      }, 1000);
    } catch (err) {
      setError('System unreachable. Please try again later.');
      setIsLoading(false);
    }
  };

  const finalizeRegistration = async (regName: string, regEmail: string, regPass: string, regRoll?: string, regClass?: string) => {
    const usersList = await db.getUsers();
    // Only the very first user registered in the system becomes Admin
    const assignedRole = usersList.length === 0 ? UserRole.ADMIN : UserRole.STUDENT;

    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: regName,
      email: regEmail,
      password: regPass,
      rollNumber: regRoll || (assignedRole === UserRole.ADMIN ? 'ADM-001' : 'STU-' + Math.floor(Math.random() * 90000 + 10000)),
      className: regClass || (assignedRole === UserRole.ADMIN ? 'Management' : 'General'),
      role: assignedRole,
      isVerified: true,
      lastLogin: new Date().toISOString()
    };
    return await db.saveUser(newUser);
  };

  const selectGoogleAccount = async (account: typeof simulatedGoogleAccounts[0]) => {
    setShowGooglePicker(false);
    setIsGoogleLoading(true);
    setError(null);
    
    setTimeout(async () => {
      try {
        const users = await db.getUsers();
        const existingUser = users.find(u => u.email === account.email);

        if (existingUser) {
          onLogin(existingUser);
        } else {
          const newUser = await finalizeRegistration(account.name, account.email, 'google-oauth');
          onLogin(newUser);
        }
      } catch (err) {
        setError('Google Sign-In failed.');
        setIsGoogleLoading(false);
      }
    }, 1500);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const users = await db.getUsers();
      if (users.some(u => u.email === emailOrRoll)) {
        setError('Identity already registered. Use login instead.');
        setIsLoading(false);
        return;
      }

      const newUser = await finalizeRegistration(name, emailOrRoll, password, rollNumber, className);
      setTimeout(() => {
        onLogin(newUser);
      }, 1000);
    } catch (err) {
      setError('Registration error.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="text-center text-white max-w-lg animate-fadeIn z-10">
        <h1 className="text-8xl font-black tracking-tighter mb-2 italic drop-shadow-2xl select-none">ATTENDIFY</h1>
        <p className="text-xl font-bold mb-4 tracking-[0.4em] opacity-80 uppercase">Verified Entry Protocol</p>
      </div>

      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-[60px] shadow-[0_40px_120px_rgba(0,0,0,0.5)] overflow-hidden p-10 md:p-12 relative animate-slideUp border border-white/40 z-10">
        <div className="flex bg-gray-100/80 p-1.5 rounded-[30px] mb-10 shadow-inner">
          <button 
            onClick={() => { setIsSignup(false); setError(null); }} 
            className={`flex-1 py-4 px-6 rounded-[25px] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${!isSignup ? 'bg-white text-indigo-700 shadow-md scale-[1.05]' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Sign In
          </button>
          <button 
            onClick={() => { setIsSignup(true); setError(null); }} 
            className={`flex-1 py-4 px-6 rounded-[25px] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${isSignup ? 'bg-white text-indigo-700 shadow-md scale-[1.05]' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Create
          </button>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 rounded-2xl animate-shake flex items-center space-x-3">
            <i className="fa-solid fa-circle-exclamation text-red-500"></i>
            <p className="text-xs font-bold text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-4">
          <div className="relative group">
            <i className="fa-solid fa-at absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-500 transition-colors"></i>
            <input 
              type="text" required value={emailOrRoll} onChange={e => setEmailOrRoll(e.target.value)} 
              placeholder={isSignup ? "Corporate Email" : "Email or Roll Number"} 
              className="w-full pl-14 pr-7 py-5 bg-gray-50 border-2 border-transparent rounded-[30px] outline-none focus:border-indigo-100 focus:bg-white focus:ring-8 focus:ring-indigo-500/5 transition-all font-bold text-gray-700 placeholder:text-gray-300" 
            />
          </div>

          {isSignup && (
            <div className="space-y-4 animate-fadeIn">
              <div className="relative group">
                <i className="fa-solid fa-user absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-500 transition-colors"></i>
                <input 
                  type="text" required value={name} onChange={e => setName(e.target.value)} 
                  placeholder="Full Legal Name" 
                  className="w-full pl-14 pr-7 py-5 bg-gray-50 border-2 border-transparent rounded-[30px] outline-none focus:border-indigo-100 focus:bg-white focus:ring-8 focus:ring-indigo-500/5 transition-all font-bold text-gray-700 placeholder:text-gray-300" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative group">
                  <i className="fa-solid fa-id-card absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-500 transition-colors"></i>
                  <input 
                    type="text" required value={rollNumber} onChange={e => setRollNumber(e.target.value)} 
                    placeholder="Reg ID" 
                    className="w-full pl-14 pr-4 py-5 bg-gray-50 border-2 border-transparent rounded-[30px] outline-none focus:border-indigo-100 focus:bg-white transition-all font-bold text-gray-700 placeholder:text-gray-300 text-sm" 
                  />
                </div>
                <div className="relative group">
                  <i className="fa-solid fa-building-user absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-500 transition-colors"></i>
                  <input 
                    type="text" required value={className} onChange={e => setClassName(e.target.value)} 
                    placeholder="Class/Dept" 
                    className="w-full pl-14 pr-4 py-5 bg-gray-50 border-2 border-transparent rounded-[30px] outline-none focus:border-indigo-100 focus:bg-white transition-all font-bold text-gray-700 placeholder:text-gray-300 text-sm" 
                  />
                </div>
              </div>
            </div>
          )}

          <div className="relative group">
            <i className="fa-solid fa-shield-halved absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-500 transition-colors"></i>
            <input 
              type="password" required value={password} onChange={e => setPassword(e.target.value)} 
              placeholder="Secure Password" 
              className="w-full pl-14 pr-7 py-5 bg-gray-50 border-2 border-transparent rounded-[30px] outline-none focus:border-indigo-100 focus:bg-white focus:ring-8 focus:ring-indigo-500/5 transition-all font-bold text-gray-700 placeholder:text-gray-300" 
            />
          </div>

          <button 
            type="submit" disabled={isLoading}
            className="w-full py-6 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-700 text-white rounded-[35px] font-black text-xs uppercase tracking-[0.4em] shadow-[0_20px_50px_rgba(79,70,229,0.3)] hover:shadow-[0_25px_60px_rgba(79,70,229,0.4)] active:scale-[0.97] transition-all disabled:opacity-70 flex items-center justify-center overflow-hidden relative group/btn"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <span className="relative z-10 group-hover/btn:tracking-[0.5em] transition-all duration-300">{isSignup ? 'Initialize Account' : 'Authenticate Access'}</span>
            )}
            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover/btn:translate-x-[0%] transition-transform duration-500"></div>
          </button>
        </form>

        <div className="relative flex items-center py-6">
          <div className="flex-grow border-t border-gray-100"></div>
          <span className="flex-shrink mx-6 text-[9px] font-black text-gray-300 uppercase tracking-[0.3em]">Alternate Identity</span>
          <div className="flex-grow border-t border-gray-100"></div>
        </div>

        <button 
          onClick={() => { setShowGooglePicker(true); setError(null); }} 
          disabled={isGoogleLoading}
          className="w-full flex items-center justify-center space-x-4 py-5 bg-white border border-gray-100 rounded-[35px] font-bold text-gray-700 shadow-sm hover:bg-gray-50 hover:shadow-xl active:scale-[0.97] transition-all group/google"
        >
          {isGoogleLoading ? (
            <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          ) : (
            <>
              <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-6 h-6 group-hover/google:scale-125 transition-transform duration-300" alt="Google" />
              <span className="text-sm tracking-tight font-black text-gray-600 uppercase">Google Single Sign-On</span>
            </>
          )}
        </button>
      </div>

      {showGooglePicker && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-2xl animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-[60px] overflow-hidden shadow-[0_50px_150px_rgba(0,0,0,0.6)] animate-slideUp border border-white/20">
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-indigo-50 rounded-3xl mx-auto flex items-center justify-center mb-8 shadow-inner">
                 <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-10 h-10" alt="Google" />
              </div>
              <h3 className="text-3xl font-black text-gray-800 mb-8 tracking-tighter italic">Choose Your ID</h3>
              <div className="space-y-3">
                {simulatedGoogleAccounts.map((acc) => (
                  <button 
                    key={acc.email} onClick={() => selectGoogleAccount(acc)} 
                    className="w-full flex items-center p-5 rounded-[30px] hover:bg-indigo-50 transition-all border border-gray-50 group hover:border-indigo-100 shadow-sm hover:shadow-md"
                  >
                    <img src={acc.avatar} className="w-12 h-12 rounded-full mr-4 border-2 border-white shadow-md group-hover:scale-110 transition-transform" alt={acc.name} />
                    <div className="text-left overflow-hidden">
                      <p className="text-sm font-black text-gray-800 truncate group-hover:text-indigo-700">{acc.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold truncate tracking-widest uppercase">{acc.email}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowGooglePicker(false)} className="mt-10 px-8 py-3 text-[10px] font-black text-gray-300 hover:text-red-500 uppercase tracking-widest transition-colors bg-gray-50 rounded-full hover:bg-red-50">Discard Selection</button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </div>
  );
};

export default Login;
