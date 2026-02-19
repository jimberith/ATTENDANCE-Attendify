
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
    <div className="space-y-6 animate-enter">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic drop-shadow-lg">My Requests</h2>
          <p className="text-white/80 font-bold uppercase text-[10px] tracking-widest mt-1">Leaves and official work</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-white text-indigo-600 px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all active:scale-95"
        >
          Add New
        </button>
      </div>

      <div className="glass-panel rounded-[2.5rem] shadow-2xl overflow-hidden min-h-[400px] border border-white/10">
        {isSyncing ? (
          <div className="flex items-center justify-center h-[400px]">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 text-white/40 text-[9px] uppercase font-black tracking-[0.2em] border-b border-white/5">
                  <th className="px-10 py-6">Type</th>
                  <th className="px-10 py-6">Dates</th>
                  <th className="px-10 py-6">Reason</th>
                  <th className="px-10 py-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {requests.length === 0 ? (
                  <tr><td colSpan={4} className="px-10 py-24 text-center text-white/20 font-black uppercase italic tracking-widest">No requests found</td></tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req.id} className="hover:bg-white/5 transition-all">
                      <td className="px-10 py-6 font-black text-white text-xs">{req.type === 'LEAVE' ? 'Leave' : 'Official Work'}</td>
                      <td className="px-10 py-6 text-[10px] font-bold text-white/60">{req.startDate} — {req.endDate}</td>
                      <td className="px-10 py-6 text-[10px] font-bold text-white/80 max-w-xs truncate italic">"{req.reason}"</td>
                      <td className="px-10 py-6">
                        <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase border ${
                          req.status === 'APPROVED' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 
                          req.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}>
                          {req.status === 'PENDING' ? 'Waiting' : req.status === 'APPROVED' ? 'Approved' : 'Rejected'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-md animate-enter">
          <div className="glass-card w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-white/20 bg-slate-900">
            <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="text-xl font-black uppercase italic tracking-tighter">New Request</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full hover:bg-white/20 transition-all"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => setFormData({...formData, type: 'LEAVE'})} className={`p-4 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all ${formData.type === 'LEAVE' ? 'border-indigo-500 bg-indigo-500/20 text-white' : 'border-white/10 text-white/30'}`}>Leave</button>
                <button type="button" onClick={() => setFormData({...formData, type: 'OD'})} className={`p-4 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all ${formData.type === 'OD' ? 'border-indigo-500 bg-indigo-500/20 text-white' : 'border-white/10 text-white/30'}`}>Official Work</button>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-white/40 uppercase tracking-widest ml-2">From Date</label>
                <input type="date" className="w-full px-5 py-4 rounded-xl bg-black/40 border border-white/20 text-white font-bold outline-none focus:border-indigo-500" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} required />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-white/40 uppercase tracking-widest ml-2">To Date</label>
                <input type="date" className="w-full px-5 py-4 rounded-xl bg-black/40 border border-white/20 text-white font-bold outline-none focus:border-indigo-500" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} required />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-white/40 uppercase tracking-widest ml-2">Why?</label>
                <textarea rows={3} className="w-full px-5 py-4 rounded-xl bg-black/40 border border-white/20 text-white font-bold outline-none focus:border-indigo-500" placeholder="Type your reason here..." value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} required />
              </div>
              <button type="submit" className="w-full btn-action py-5 rounded-2xl font-black uppercase text-[11px] shadow-2xl mt-4">Send Request</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequests;
