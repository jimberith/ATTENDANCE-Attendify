
import React, { useState, useEffect } from 'react';
import { User, LeaveRequest } from '../types';
import { db } from '../services/db';

interface LeaveRequestsProps {
  user: User;
}

const LeaveRequests: React.FC<LeaveRequestsProps> = ({ user }) => {
  const [showModal, setShowModal] = useState(false);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isSyncing, setIsSyncing] = useState(true);

  const [formData, setFormData] = useState({
    type: 'LEAVE' as 'LEAVE' | 'OD',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const fetchRequests = async () => {
    setIsSyncing(true);
    const data = await db.getLeaveRequests(user.id);
    setRequests(data);
    setIsSyncing(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [user.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newRequest: LeaveRequest = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      userName: user.name,
      ...formData,
      status: 'PENDING'
    };
    await db.addLeaveRequest(newRequest);
    setShowModal(false);
    setFormData({ type: 'LEAVE', startDate: '', endDate: '', reason: '' });
    fetchRequests();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Leave & OD Requests</h2>
          <p className="text-white/80">Manage your attendance exemptions in the DB.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-white text-indigo-600 px-6 py-2.5 rounded-xl font-bold shadow-xl"
        >
          New Request
        </button>
      </div>

      <div className="glass-card rounded-2xl shadow-xl overflow-hidden min-h-[400px]">
        {isSyncing ? (
          <div className="flex items-center justify-center h-[400px]">
            <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">No applications found in storage.</td></tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-bold text-gray-700">{req.type}</td>
                      <td className="px-6 py-4 text-sm">{req.startDate} to {req.endDate}</td>
                      <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">{req.reason}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                          req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden scale-in">
            <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold">Persistent Application</h3>
              <button onClick={() => setShowModal(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-4 bg-white">
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => setFormData({...formData, type: 'LEAVE'})} className={`p-4 rounded-xl border-2 ${formData.type === 'LEAVE' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100'}`}>Leave</button>
                <button type="button" onClick={() => setFormData({...formData, type: 'OD'})} className={`p-4 rounded-xl border-2 ${formData.type === 'OD' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100'}`}>On Duty</button>
              </div>
              <input type="date" className="w-full px-4 py-3 rounded-xl border" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} required />
              <input type="date" className="w-full px-4 py-3 rounded-xl border" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} required />
              <textarea rows={3} className="w-full px-4 py-3 rounded-xl border" placeholder="Reason..." value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} required />
              <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold">Write to DB</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequests;
