
import React from 'react';
import { User, UserRole } from '../types';

interface SidebarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, activeTab, setActiveTab, onLogout }) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: 'fa-house' },
    { id: 'attendance', label: 'Attendance', icon: 'fa-fingerprint' },
    { id: 'leave', label: 'Requests', icon: 'fa-calendar-xmark' },
    { id: 'profile', label: 'Profile', icon: 'fa-user' },
  ];

  if (user.role === UserRole.ADMIN) {
    navItems.push({ id: 'admin', label: 'Settings', icon: 'fa-shield-halved' });
  }

  return (
    <aside className="w-20 lg:w-56 h-screen flex flex-col p-3 z-40 relative">
      <div className="glass-panel h-full rounded-2xl flex flex-col shadow-xl">
        {/* Brand */}
        <div className="p-6 flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
            <i className="fa-solid fa-bolt-lightning text-xl"></i>
          </div>
          <div className="hidden lg:block text-center">
            <h1 className="text-lg font-black text-white tracking-tighter uppercase italic">Attendify</h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center p-3 rounded-xl transition-all border ${
                activeTab === item.id
                  ? 'bg-indigo-600 border-white/20 text-white shadow-lg'
                  : 'text-white/40 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="w-full lg:w-6 flex justify-center">
                <i className={`fa-solid ${item.icon} text-lg`}></i>
              </div>
              <span className="hidden lg:block ml-3 text-[11px] font-bold tracking-widest uppercase">
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        {/* User / Logout */}
        <div className="p-3 mt-auto">
          <div className="bg-white/5 rounded-xl p-3 flex flex-col items-center gap-3 border border-white/10">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
              {user.name.charAt(0)}
            </div>
            <button 
              onClick={onLogout}
              className="w-full py-2 rounded-lg bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white transition-all text-[9px] font-bold tracking-widest flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-power-off"></i>
              <span className="hidden lg:block">LOGOUT</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
