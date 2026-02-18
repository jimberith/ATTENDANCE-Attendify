
import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { db } from './services/db';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sidebar from './components/Sidebar';
import Attendance from './pages/Attendance';
import LeaveRequests from './pages/LeaveRequests';
import Profile from './pages/Profile';
import AdminControls from './pages/AdminControls';
import EnrollmentOnboarding from './components/EnrollmentOnboarding';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const savedUserId = localStorage.getItem('attendify_active_user_id');
    if (savedUserId) {
      setIsSyncing(true);
      db.getUsers().then(users => {
        const user = users.find(u => u.id === savedUserId);
        if (user) setCurrentUser(user);
        setIsSyncing(false);
      });
    }
  }, []);

  const handleLogin = (user: User) => {
    localStorage.setItem('attendify_active_user_id', user.id);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('attendify_active_user_id');
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const handleUserUpdate = async (updatedUser: User) => {
    setIsSyncing(true);
    const saved = await db.saveUser(updatedUser);
    setCurrentUser(saved);
    setIsSyncing(false);
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // Gate content if user has NO facial template AND hasn't skipped onboarding yet
  if (!currentUser.facialTemplate && !currentUser.biometricsSkipped) {
    return <EnrollmentOnboarding user={currentUser} onComplete={handleUserUpdate} />;
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
      {isSyncing && (
        <div className="fixed top-4 right-4 z-[100] bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 animate-bounce">
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Syncing with DB...</span>
        </div>
      )}
      
      <Sidebar user={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto h-full">{renderContent()}</div>
      </main>
    </div>
  );
};

export default App;
