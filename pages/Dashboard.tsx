
import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord, UserRole, Class } from '../types';
import { db } from '../services/db';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [userClass, setUserClass] = useState<Class | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [attData, classes, users] = await Promise.all([
          db.getAttendance(user.id),
          db.getClasses(),
          user.role === UserRole.ADMIN ? db.getUsers() : Promise.resolve([])
        ]);
        
        setRecords(attData);
        if (user.classId) {
          setUserClass(classes.find(c => c.id === user.classId) || null);
        }
        
        if (user.role === UserRole.ADMIN) {
          setTotalUsers(users.length);
        }
      } catch (err) {
        console.error("Fetch fail:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user.id, user.role, user.classId]);

  const presentCount = records.filter(r => r.status === 'PRESENT').length;
  const odCount = records.filter(r => r.status === 'OD').length;
  const absentCount = records.filter(r => r.status === 'ABSENT' || r.status === 'REJECTED').length;
  
  const totalPositive = presentCount + odCount;
  const attendancePercent = records.length > 0 ? ((totalPositive / records.length) * 100) : 0;
  
  // Calculate Late Entries and Early Exits
  const lateStarts = records.filter(r => {
    if (!userClass?.startTime || r.status !== 'PRESENT') return false;
    // Simple HH:mm comparison
    const recordTime = r.time.split(' ')[0]; // Assuming 10:30 AM format? Let's check db time format
    // Attendance.tsx uses: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    // Returns something like "10:30 AM"
    const [hStr, mStr] = r.time.split(':');
    const isPM = r.time.includes('PM');
    let hours = parseInt(hStr);
    if (isPM && hours !== 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    const minutes = parseInt(mStr.split(' ')[0]);
    const totalMinutes = hours * 60 + minutes;

    const [startH, startM] = userClass.startTime.split(':').map(Number);
    const startTotal = startH * 60 + startM;
    
    return totalMinutes > startTotal;
  }).length;

  // Early exits usually come from live tracking breaches or manual checkout
  // For display, we'll check records that have a 'leftGeofenceAt' time before the end time
  const earlyExits = records.filter(r => {
    if (!userClass?.endTime || !r.leftGeofenceAt) return false;
    const [hStr, mStr] = r.leftGeofenceAt.split(':');
    const isPM = r.leftGeofenceAt.includes('PM');
    let hours = parseInt(hStr);
    if (isPM && hours !== 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    const minutes = parseInt(mStr.split(' ')[0]);
    const totalMinutes = hours * 60 + minutes;

    const [endH, endM] = userClass.endTime.split(':').map(Number);
    const endTotal = endH * 60 + endM;
    
    return totalMinutes < endTotal;
  }).length;

  const chartData = records.slice(0, 10).reverse().map(r => ({
    name: r.date.split(',')[0],
    score: r.facialMatchScore || (r.status === 'PRESENT' ? 95 : 0)
  }));

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (attendancePercent / 100) * circumference;

  if (isLoading) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-white rounded-full animate-spin"></div>
        <p className="text-[10px] font-bold text-white uppercase tracking-widest">LOADING...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-enter pb-10">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left">
          <p className="text-indigo-400 font-bold uppercase tracking-widest text-[9px] mb-1">Hello,</p>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase italic">
            {user.role === UserRole.ADMIN ? 'Manager' : user.name.split(' ')[0]}
          </h1>
          <p className="text-white/40 text-[9px] font-bold mt-1 uppercase tracking-widest flex items-center justify-center md:justify-start gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            App Connected // {user.role}
          </p>
        </div>
        
        <div className="glass-card px-6 py-4 rounded-xl flex items-center gap-5 border border-white/10 shadow-lg bg-black/40">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
              <circle cx="40" cy="40" r={radius} className="stroke-white/5 fill-none" strokeWidth="6" />
              <circle 
                cx="40" cy="40" r={radius} 
                className="stroke-indigo-500 fill-none transition-all duration-1000 ease-out" 
                strokeWidth="6" 
                strokeLinecap="round" 
                strokeDasharray={circumference} 
                strokeDashoffset={offset} 
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-black text-white">{attendancePercent.toFixed(0)}%</span>
            </div>
          </div>
          <div>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Score</p>
            <p className="text-md font-bold text-indigo-400 uppercase italic">Monthly</p>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${user.role === UserRole.ADMIN ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
        <div className="glass-card p-5 rounded-xl border-l-4 border-l-green-500 hover:bg-green-500/5 transition-colors">
          <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1">Days Present</p>
          <p className="text-2xl font-black text-white">{presentCount}</p>
        </div>
        <div className="glass-card p-5 rounded-xl border-l-4 border-l-red-500 hover:bg-red-500/5 transition-colors">
          <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1">Days Absent</p>
          <p className="text-2xl font-black text-white">{absentCount}</p>
        </div>
        <div className="glass-card p-5 rounded-xl border-l-4 border-l-indigo-500 hover:bg-indigo-500/5 transition-colors">
          <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1">Official Work (OD)</p>
          <p className="text-2xl font-black text-white">{odCount}</p>
        </div>
        {user.role === UserRole.ADMIN && (
          <div className="glass-card p-5 rounded-xl border-l-4 border-l-purple-500 hover:bg-purple-500/5 transition-colors">
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1">All Users</p>
            <p className="text-2xl font-black text-white">{totalUsers}</p>
          </div>
        )}
      </div>

      <div className="glass-card p-6 rounded-xl border border-white/10 bg-black/20">
        <h3 className="text-sm font-bold text-white uppercase italic mb-6">Daily Record</h3>
        <div className="w-full h-[300px] overflow-hidden" style={{ minWidth: 0, position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip 
                contentStyle={{backgroundColor: '#000', borderRadius: '0.75rem', border: '1px solid #4f46e5', color: '#fff', fontSize: '10px'}}
                itemStyle={{fontWeight: 800, textTransform: 'uppercase'}}
              />
              <Area 
                type="monotone" 
                dataKey="score" 
                stroke="#4f46e5" 
                strokeWidth={3} 
                fill="rgba(79, 70, 229, 0.2)" 
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* NEW TRACKING SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-xl border border-white/10 bg-black/30 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <i className="fa-solid fa-clock-rotate-left text-xl"></i>
            </div>
            <div>
              <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Late Starts</p>
              <h4 className="text-xl font-black text-white uppercase italic">Record</h4>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-amber-500">{lateStarts}</p>
            <p className="text-[8px] font-bold text-white/30 uppercase tracking-tighter">Instances Detected</p>
          </div>
        </div>

        <div className="glass-card p-6 rounded-xl border border-white/10 bg-black/30 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
              <i className="fa-solid fa-door-open text-xl"></i>
            </div>
            <div>
              <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Left Early</p>
              <h4 className="text-xl font-black text-white uppercase italic">Record</h4>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-red-500">{earlyExits}</p>
            <p className="text-[8px] font-bold text-white/30 uppercase tracking-tighter">Area Breaches</p>
          </div>
        </div>
      </div>

      {userClass && (
        <div className="p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-xl flex items-center justify-center gap-3">
          <i className="fa-solid fa-business-time text-indigo-400"></i>
          <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">
            My Schedule: {userClass.startTime || '--:--'} to {userClass.endTime || '--:--'}
          </p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
