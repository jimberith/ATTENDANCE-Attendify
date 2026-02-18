
import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord, UserRole } from '../types';
import { db } from '../services/db';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNotification, setShowNotification] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await db.getAttendance(user.id);
        setRecords(data);
        
        // Notification logic
        if (user.settings?.notificationsEnabled) {
          const now = new Date();
          const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
          
          const start = user.settings.workdayStart || '09:00';
          const end = user.settings.workdayEnd || '17:00';
          
          const hasTodayAttendance = data.some(r => r.date === now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
          
          if (!hasTodayAttendance) {
            if (currentTime >= start && currentTime <= '11:00') {
              setShowNotification("Good morning! Don't forget to mark your attendance for today.");
            } else if (currentTime >= end) {
              setShowNotification("End of workday reached! Please ensure your attendance is logged.");
            }
          }
        }
      } catch (err) {
        console.error("Dashboard cloud sync error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user.id, user.settings]);

  const positiveCount = records.filter(r => r.status === 'PRESENT' || r.status === 'OD').length;
  const attendancePercent = records.length > 0 ? ((positiveCount / records.length) * 100).toFixed(1) : "0.0";

  const chartData = records.slice(0, 10).reverse().map(r => ({
    name: r.date.split(',')[0],
    status: (r.status === 'PRESENT' || r.status === 'OD') ? 100 : 0
  }));

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-white uppercase tracking-[0.4em] animate-pulse">Fetching data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      {showNotification && (
        <div className="bg-indigo-600 text-white p-6 rounded-[30px] shadow-2xl flex items-center justify-between border border-white/20 animate-slideUp">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-xl">
              <i className="fa-solid fa-bell animate-swing"></i>
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-widest italic">Reminder</p>
              <p className="text-xs font-medium opacity-90">{showNotification}</p>
            </div>
          </div>
          <button onClick={() => setShowNotification(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter italic drop-shadow-lg uppercase">Home</h2>
          <p className="text-indigo-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-1 flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            Connection active
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl px-6 py-3 rounded-full border border-white/20 text-white text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center">
          <i className="fa-solid fa-server mr-3 text-indigo-400"></i>
          ID: {user.rollNumber}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2 glass-card p-8 rounded-[40px] shadow-2xl border-b-4 border-indigo-500/30">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Attendance Status</span>
            <span className="text-2xl font-black text-indigo-600 italic">{attendancePercent}%</span>
          </div>
          <div className="w-full bg-gray-100 h-8 rounded-full overflow-hidden shadow-inner p-1">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-1000 shadow-lg"
              style={{ width: `${attendancePercent}%` }}
            ></div>
          </div>
          <p className="mt-4 text-[10px] font-bold text-gray-400 uppercase text-center tracking-widest">Average attendance rate</p>
        </div>

        <div className="glass-card p-8 rounded-[40px] shadow-xl border-b-4 border-green-500/30 group">
          <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center text-xl mb-4 group-hover:rotate-12 transition-transform">
            <i className="fa-solid fa-check-double"></i>
          </div>
          <span className="text-3xl font-black text-gray-900 tracking-tighter">{positiveCount}</span>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Total Present/OD Days</p>
        </div>

        <div className="glass-card p-8 rounded-[40px] shadow-xl border-b-4 border-amber-500/30 group">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-cloud-arrow-up"></i>
          </div>
          <span className="text-3xl font-black text-gray-900 tracking-tighter">{records.length}</span>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Total Logs Synced</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`${user.role === UserRole.ADMIN ? 'lg:col-span-2' : 'lg:col-span-3'} glass-card p-10 rounded-[50px] shadow-2xl`}>
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-black text-gray-800 tracking-tight flex items-center">
               <i className="fa-solid fa-chart-line mr-4 text-indigo-600 opacity-20 text-2xl"></i>
               Trends
            </h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorStatus" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip contentStyle={{borderRadius: '25px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 'bold'}} />
                <Area type="monotone" dataKey="status" stroke="#6366f1" strokeWidth={5} fillOpacity={1} fill="url(#colorStatus)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {user.role === UserRole.ADMIN && (
          <div className="glass-card p-10 rounded-[50px] shadow-2xl bg-gray-900 text-white relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[80px]"></div>
            <h3 className="text-xl font-black mb-10 tracking-tight flex items-center relative z-10">
               <i className="fa-solid fa-database mr-4 text-indigo-400 opacity-40 text-2xl"></i>
               Status
            </h3>
            <div className="space-y-6 relative z-10">
              <div className="p-5 bg-white/5 rounded-3xl border border-white/10">
                <p className="text-[10px] opacity-40 mb-1 font-black uppercase tracking-widest">Database</p>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-sm font-bold">Online</span>
                </div>
              </div>
              <div className="p-5 bg-white/5 rounded-3xl border border-white/10">
                <p className="text-[10px] opacity-40 mb-1 font-black uppercase tracking-widest">Version</p>
                <p className="text-[9px] font-bold truncate opacity-80 italic">v2.1.0</p>
              </div>
              <div className="p-5 bg-indigo-600/30 rounded-3xl border border-indigo-500/30">
                <p className="text-[10px] opacity-40 mb-1 font-black uppercase tracking-widest">Security</p>
                <p className="text-sm font-bold">Active</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="glass-card rounded-[50px] shadow-2xl overflow-hidden border border-white/20">
        <div className="px-10 py-8 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-xl font-black text-gray-800 tracking-tight">Logs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                <th className="px-10 py-6">Date</th>
                <th className="px-10 py-6">Status</th>
                <th className="px-10 py-6">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.length === 0 ? (
                <tr><td colSpan={3} className="px-10 py-20 text-center text-gray-400 font-bold uppercase tracking-widest opacity-30 italic">No records yet...</td></tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-indigo-50/20 transition-all">
                    <td className="px-10 py-6">
                      <p className="text-sm font-black text-gray-800">{record.date}</p>
                      <p className="text-[10px] text-gray-400 font-bold italic">{record.time}</p>
                    </td>
                    <td className="px-10 py-6">
                      <span className={`px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest border ${
                        record.status === 'PRESENT' ? 'bg-green-50 text-green-700 border-green-100' : 
                        record.status === 'OD' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        'bg-red-50 text-red-700 border-red-100'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-10 py-6">
                       <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-4 py-2 rounded-full border border-gray-200">
                         {record.location.lat.toFixed(4)} / {record.location.lng.toFixed(4)}
                       </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
