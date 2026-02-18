
import React, { useState, useEffect } from 'react';
import { User, UserRole, LeaveRequest, AttendanceRecord } from '../types';
import { db } from '../services/db';

interface AdminControlsProps {
  user: User;
}

const AdminControls: React.FC<AdminControlsProps> = ({ user }) => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'requests'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [u, l] = await Promise.all([db.getUsers(), db.getLeaveRequests()]);
      setUsers(u);
      setLeaveRequests(l);
    } catch (err) {
      console.error("Admin fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    const target = users.find(u => u.id === userId);
    if (target) {
      if (target.id === user.id) {
        alert("Security restriction: You cannot modify your own administrative root role.");
        return;
      }
      await db.saveUser({ ...target, role: newRole });
      fetchData();
    }
  };

  const handleLeaveAction = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    await db.updateLeaveStatus(requestId, status);
    fetchData();
  };

  const markUserPresent = async (targetUser: User) => {
    const confirmMark = confirm(`Manually authorize presence for ${targetUser.name}?`);
    if (confirmMark) {
      const newRecord: AttendanceRecord = {
        id: Math.random().toString(36).substr(2, 9),
        userId: targetUser.id,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        status: 'PRESENT',
        location: { lat: 0, lng: 0 },
        device: `Admin Override (${user.name})`
      };
      await db.addAttendance(newRecord);
      alert(`Manual entry committed for ${targetUser.name}.`);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic drop-shadow-lg">Nexus Console</h2>
          <p className="text-white/80 font-bold tracking-widest uppercase text-xs mt-1">Personnel & Authority Orchestration</p>
        </div>
        
        <div className="flex bg-white/20 p-2 rounded-[30px] backdrop-blur-3xl border border-white/20 shadow-xl">
          <button 
            onClick={() => setActiveSubTab('users')} 
            className={`px-8 py-3 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'users' ? 'bg-white text-indigo-700 shadow-xl scale-105' : 'text-white hover:bg-white/10'}`}
          >
            User Fleet
          </button>
          <button 
            onClick={() => setActiveSubTab('requests')} 
            className={`px-8 py-3 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'requests' ? 'bg-white text-indigo-700 shadow-xl scale-105' : 'text-white hover:bg-white/10'}`}
          >
            Requests
            {leaveRequests.filter(r => r.status === 'PENDING').length > 0 && (
              <span className="ml-2 w-2 h-2 bg-red-500 rounded-full inline-block animate-ping"></span>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeSubTab === 'users' && (
          <div className="relative group max-w-lg mb-4">
            <i className="fa-solid fa-magnifying-glass absolute left-7 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors"></i>
            <input 
              type="text" 
              placeholder="Search Users..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-16 pr-8 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[30px] outline-none text-white placeholder:text-white/40 font-black text-xs uppercase tracking-widest transition-all"
            />
          </div>
        )}

        <div className="glass-card rounded-[50px] shadow-2xl overflow-hidden min-h-[500px] border border-white/40 bg-white/95">
          {isLoading ? (
            <div className="h-[500px] flex items-center justify-center">
              <div className="w-14 h-14 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : activeSubTab === 'users' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-100/50">
                  <tr className="text-gray-400 text-[10px] uppercase font-black tracking-widest">
                    <th className="px-10 py-8">User ID</th>
                    <th className="px-10 py-8">Registration</th>
                    <th className="px-10 py-8">Role Permission</th>
                    <th className="px-10 py-8 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-indigo-50/40 transition-all group">
                      <td className="px-10 py-8">
                        <div className="flex items-center">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-white shadow flex items-center justify-center text-indigo-600 font-black mr-4 overflow-hidden">
                            {u.facialTemplate ? <img src={u.facialTemplate} className="w-full h-full object-cover" /> : u.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-800 tracking-tight">{u.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold tracking-widest truncate max-w-[150px]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full uppercase tracking-tighter border border-indigo-100">{u.rollNumber}</span>
                        <p className="text-[9px] font-bold text-gray-400 mt-1 ml-1 uppercase">{u.className || 'General'}</p>
                      </td>
                      <td className="px-10 py-8">
                        {u.role === UserRole.ADMIN ? (
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-red-50 text-red-600 px-6 py-2.5 rounded-2xl border border-red-100 shadow-sm">Global Root Admin</span>
                        ) : (
                          <select 
                            value={u.role}
                            onChange={(e) => updateUserRole(u.id, e.target.value as UserRole)}
                            className="bg-white border-2 border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] py-3 px-6 text-gray-700 outline-none focus:border-indigo-500 transition-all shadow-sm"
                          >
                            <option value={UserRole.STUDENT}>STUDENT</option>
                            <option value={UserRole.STAFF}>STAFF</option>
                            {/* ADMIN role cannot be assigned through this interface */}
                          </select>
                        )}
                      </td>
                      <td className="px-10 py-8 text-center">
                        {u.id !== user.id && (
                          <button 
                            onClick={() => markUserPresent(u)}
                            className="text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 px-6 py-3.5 rounded-2xl uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                          >
                            Override Auth
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-100/50">
                  <tr className="text-gray-400 text-[10px] uppercase font-black tracking-widest">
                    <th className="px-10 py-8">User & Type</th>
                    <th className="px-10 py-8">Period</th>
                    <th className="px-10 py-8">Justification</th>
                    <th className="px-10 py-8 text-center">Authorization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {leaveRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50 transition-all">
                      <td className="px-10 py-8">
                        <p className="text-sm font-black text-gray-800 tracking-tight">{req.userName}</p>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mt-2 inline-block ${req.type === 'LEAVE' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                          {req.type}
                        </span>
                      </td>
                      <td className="px-10 py-8 text-[11px] font-black text-gray-500 italic">
                        {req.startDate} — {req.endDate}
                      </td>
                      <td className="px-10 py-8">
                        <div className="max-w-xs text-[11px] text-gray-500 italic bg-gray-50 p-4 rounded-2xl border border-gray-100 leading-relaxed shadow-inner">
                          "{req.reason}"
                        </div>
                      </td>
                      <td className="px-10 py-8 text-center">
                        {req.status === 'PENDING' ? (
                          <div className="flex justify-center space-x-3">
                            <button 
                              onClick={() => handleLeaveAction(req.id, 'APPROVED')} 
                              className="w-12 h-12 flex items-center justify-center bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-2xl border border-green-100 transition-all shadow-sm"
                            >
                              <i className="fa-solid fa-check"></i>
                            </button>
                            <button 
                              onClick={() => handleLeaveAction(req.id, 'REJECTED')} 
                              className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-2xl border border-red-100 transition-all shadow-sm"
                            >
                              <i className="fa-solid fa-xmark"></i>
                            </button>
                          </div>
                        ) : (
                          <span className={`text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl border ${
                            req.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200 shadow-sm' : 'bg-red-50 text-red-700 border-red-200 shadow-sm'
                          }`}>
                            {req.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminControls;
