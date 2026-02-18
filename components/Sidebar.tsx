
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
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-table-columns' },
    { id: 'attendance', label: 'Attendance', icon: 'fa-id-card' },
    { id: 'leave', label: 'Leave/OD', icon: 'fa-calendar-day' },
    { id: 'profile', label: 'Profile', icon: 'fa-user' },
  ];

  if (user.role === UserRole.ADMIN) {
    navItems.push({ id: 'admin', label: 'Admin Panel', icon: 'fa-gear' });
  }

  return (
    <div className="w-20 md:w-64 glass-card h-screen flex flex-col shadow-2xl transition-all duration-300">
      <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-center md:justify-start">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
          A
        </div>
        <div className="hidden md:block ml-3">
          <h1 className="text-xl font-bold text-gray-800">ATTENDIFY</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Smart System</p>
        </div>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 ${
              activeTab === item.id
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <div className="w-6 flex justify-center">
              <i className={`fa-solid ${item.icon} text-lg`}></i>
            </div>
            <span className="hidden md:block ml-3 font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="hidden md:flex items-center mb-6 px-2">
          <div className="w-10 h-10 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-indigo-700 overflow-hidden">
            {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <i className="fa-solid fa-user"></i>}
          </div>
          <div className="ml-3 overflow-hidden">
            <p className="text-sm font-bold text-gray-800 truncate">{user.name}</p>
            <p className="text-[10px] text-gray-500 uppercase">{user.role}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center p-3 rounded-xl text-red-500 hover:bg-red-50 transition-all duration-200"
        >
          <div className="w-6 flex justify-center">
            <i className="fa-solid fa-right-from-bracket text-lg"></i>
          </div>
          <span className="hidden md:block ml-3 font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
