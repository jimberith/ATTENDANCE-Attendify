
import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { db } from './services/db';
import Dashboard from './pages/Dashboard';
import Sidebar from './components/Sidebar';
import Attendance from './pages/Attendance';
import LeaveRequests from './pages/LeaveRequests';
import Profile from './pages/Profile';
import AdminControls from './pages/AdminControls';
import Login from './pages/Login';
import { AIChatbot } from './components/AIChatbot';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      const savedUserId = localStorage.getItem('attendify_active_user_id');
      if (savedUserId) {
        const users = await db.getUsers();
        const user = users.find(u => u.id === savedUserId);
        if (user) {
          setCurrentUser(user);
        } else {
          localStorage.removeItem('attendify_active_user_id');
        }
      }
      setIsLoading(false);
    };
    initApp();
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('attendify_active_user_id', user.id);
  };

  const handleLogout = () => {
    localStorage.removeItem('attendify_active_user_id');
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const handleUserUpdate = async (updatedUser: User) => {
    const saved = await db.saveUser(updatedUser);
    setCurrentUser(saved);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 space-y-4">
        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-white uppercase tracking-[0.4em] animate-pulse">Initializing System...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard user={currentUser} />;
      case 'attendance': return <Attendance user={currentUser} onUpdateUser={handleUserUpdate} />;
      case 'leave': return <LeaveRequests user={currentUser} />;
      case 'profile': return <Profile user={currentUser} onUpdateUser={handleUserUpdate} />;
      case 'admin': return currentUser.role === UserRole.ADMIN ? <AdminControls user={currentUser} /> : <Dashboard user={currentUser} />;
      default: return <Dashboard user={currentUser} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-transparent overflow-hidden relative">
      <Sidebar user={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto h-full">{renderContent()}</div>
      </main>
      <AIChatbot />
    </div>
  );
};

export default App;
