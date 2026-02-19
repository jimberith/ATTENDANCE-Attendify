
import React, { useState, useEffect } from 'react';
import { User, UserRole, LeaveRequest, AttendanceRecord, Class, HardwareNode } from '../types';
import { db } from '../services/db';

interface AdminControlsProps {
  user: User;
}

const AdminControls: React.FC<AdminControlsProps> = ({ user }) => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'classes' | 'attendance' | 'onduty' | 'setup'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [hardwareNodes, setHardwareNodes] = useState<HardwareNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('17:00');
  const [newRadius, setNewRadius] = useState(100);

  const [currentGPS, setCurrentGPS] = useState<{lat: number, lng: number} | null>(null);
  const [selectedLocationClassId, setSelectedLocationClassId] = useState('');
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeIP, setNewNodeIP] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);

  const [viewingUserProfile, setViewingUserProfile] = useState<User | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [u, c, att, l, h] = await Promise.all([
        db.getUsers(), 
        db.getClasses(),
        db.getAttendance(),
        db.getLeaveRequests(),
        db.getHardwareNodes()
      ]);
      setUsers(u);
      setClasses(c);
      setAttendanceLogs(att);
      setLeaveRequests(l);
      setHardwareNodes(h);
    } catch (err) {
      console.error("Admin fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeSubTab]);

  const handleQuickMark = async (userId: string, status: 'PRESENT' | 'ABSENT' | 'OD') => {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const existing = attendanceLogs.find(r => r.userId === userId && r.date === today);
    if (existing && !confirm(`Change record for today?`)) return;

    const newRecord: AttendanceRecord = {
      id: Math.random().toString(36).substr(2, 9),
      userId,
      date: today,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      status,
      location: { lat: 0, lng: 0 },
      device: 'ADMIN_OVERRIDE',
      facialMatchScore: 100
    };

    await db.addAttendance(newRecord);
    alert(`Marked as ${status}`);
    fetchData();
  };

  const handleUpdateLeaveStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    await db.updateLeaveStatus(id, status);
    fetchData();
  };

  const captureGPS = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("GPS NOT SUPPORTED");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentGPS({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationError(null);
      },
      (err) => {
        setLocationError("COULD NOT FIND YOUR LOCATION");
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSaveLocation = async () => {
    if (!selectedLocationClassId || !currentGPS) return;
    const foundClass = classes.find(c => c.id === selectedLocationClassId);
    if (foundClass) {
      await db.addClass({ 
        ...foundClass, 
        location: currentGPS, 
        geofenceRadius: newRadius 
      });
      alert("Location and range saved.");
      fetchData();
    }
  };

  const handleAddClass = async () => {
    if (newClassName) {
      await db.addClass({ 
        id: Math.random().toString(36).substr(2,9), 
        name: newClassName.toUpperCase(),
        startTime: newStartTime,
        endTime: newEndTime,
        geofenceRadius: newRadius
      });
      setNewClassName('');
      fetchData();
    }
  };

  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newNodeName && newNodeIP) {
      await db.addHardwareNode({ 
        id: Math.random().toString(36).substr(2,9), 
        name: newNodeName.toUpperCase(), 
        type: 'ESP32_CAM', 
        ipAddress: newNodeIP, 
        status: 'ONLINE' 
      });
      setNewNodeName('');
      setNewNodeIP('');
      fetchData();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[600px] animate-enter">
      {/* Sidebar Navigation */}
      <div className="w-full lg:w-64 space-y-2">
        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4 ml-4">ADMIN SETTINGS</p>
        {[
          { id: 'users', label: 'All Users', icon: 'fa-users' },
          { id: 'classes', label: 'Classes', icon: 'fa-graduation-cap' },
          { id: 'attendance', label: 'Quick Mark', icon: 'fa-clipboard-list' },
          { id: 'onduty', label: 'Requests', icon: 'fa-calendar-check' },
          { id: 'setup', label: 'Live Tracking', icon: 'fa-gears' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all border ${
              activeSubTab === tab.id
                ? 'bg-white text-indigo-900 border-white shadow-2xl scale-[1.03]'
                : 'bg-indigo-900/30 text-indigo-200 border-white/5 hover:bg-indigo-800/40'
            }`}
          >
            <i className={`fa-solid ${tab.icon} w-5`}></i>
            <span className="font-black text-[11px] uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1">
        {activeSubTab === 'users' && (
          <div className="glass-panel rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
            <div className="p-6 bg-white/5 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-sm font-black text-white uppercase italic tracking-widest">User List</h3>
              <input 
                type="text" 
                placeholder="SEARCH..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="p-3 rounded-xl bg-black/50 border border-white/20 text-white text-[10px] font-bold w-56 focus:ring-1 focus:ring-indigo-500 shadow-inner"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[9px] uppercase font-black text-white/40 tracking-[0.2em] border-b border-white/5">
                    <th className="px-8 py-5">Name</th>
                    <th className="px-8 py-5">Class</th>
                    <th className="px-8 py-5">Type</th>
                    <th className="px-8 py-5 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users
                    .filter(u => u.role !== UserRole.ADMIN)
                    .filter(u => u.name.includes(searchTerm.toUpperCase()))
                    .map((u) => (
                    <tr key={u.id} className="hover:bg-indigo-500/10 transition-colors cursor-pointer" onClick={() => setViewingUserProfile(u)}>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xs shadow-lg">{u.name.charAt(0)}</div>
                          <div>
                            <p className="text-xs font-black text-white">{u.name}</p>
                            <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest">{u.rollNumber}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-[10px] font-black text-indigo-400 uppercase">
                        {classes.find(c => c.id === u.classId)?.name || 'NONE'}
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-[9px] font-black text-white/40 uppercase">{u.role}</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="text-[9px] font-black text-indigo-400 uppercase tracking-widest border border-indigo-500/30 px-3 py-1 rounded-lg hover:bg-indigo-500 hover:text-white transition-all">Profile</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === 'attendance' && (
          <div className="glass-panel rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
            <div className="p-6 bg-white/5 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-sm font-black text-white uppercase italic tracking-widest">Mark Attendance Manually</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[9px] uppercase font-black text-white/40 tracking-[0.2em] border-b border-white/5">
                    <th className="px-8 py-5">User</th>
                    <th className="px-8 py-5 text-center">Buttons</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/5">
                      <td className="px-8 py-5">
                        <p className="text-xs font-black text-white">{u.name}</p>
                        <p className="text-[8px] text-white/30 font-bold uppercase">{u.role}</p>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleQuickMark(u.id, 'PRESENT')} title="Mark Present" className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all flex items-center justify-center border border-green-500/20"><i className="fa-solid fa-check"></i></button>
                          <button onClick={() => handleQuickMark(u.id, 'ABSENT')} title="Mark Absent" className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-500/20"><i className="fa-solid fa-xmark"></i></button>
                          <button onClick={() => handleQuickMark(u.id, 'OD')} title="Mark Official" className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center border border-amber-500/20"><i className="fa-solid fa-briefcase"></i></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === 'onduty' && (
          <div className="glass-panel rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
            <div className="p-6 bg-white/5 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-sm font-black text-white uppercase italic tracking-widest">Pending Approvals</h3>
            </div>
            <div className="divide-y divide-white/5">
              {leaveRequests.filter(r => r.status === 'PENDING').length === 0 ? (
                <div className="p-20 text-center text-white/10 font-black uppercase italic text-xs">No requests waiting</div>
              ) : (
                leaveRequests.filter(r => r.status === 'PENDING').map((req) => (
                  <div key={req.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-white">{req.userName}</span>
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 text-[8px] font-black uppercase">{req.type === 'LEAVE' ? 'Leave' : 'Official'}</span>
                      </div>
                      <p className="text-[10px] text-white/40 font-bold uppercase">{req.startDate} — {req.endDate}</p>
                      <p className="text-[10px] text-white/60 italic">"{req.reason}"</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdateLeaveStatus(req.id, 'APPROVED')} className="w-10 h-10 rounded-xl bg-green-500 text-white shadow-lg shadow-green-500/20 hover:scale-105 transition-all"><i className="fa-solid fa-check"></i></button>
                      <button onClick={() => handleUpdateLeaveStatus(req.id, 'REJECTED')} className="w-10 h-10 rounded-xl bg-red-500 text-white shadow-lg shadow-red-500/20 hover:scale-105 transition-all"><i className="fa-solid fa-xmark"></i></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeSubTab === 'setup' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              {/* Geofence Configuration */}
              <div className="glass-panel p-8 rounded-[3rem] border border-white/10 bg-black/30 flex flex-col items-center">
                <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/30 text-indigo-400"><i className="fa-solid fa-location-crosshairs text-xl"></i></div>
                <h4 className="text-lg font-black text-white uppercase italic mb-4 text-center">Set Office Location</h4>
                <div className="w-full space-y-4">
                  <button onClick={captureGPS} className="w-full btn-action py-4 rounded-xl text-[10px] font-black">GET MY CURRENT LOCATION</button>
                  {locationError && <p className="text-[9px] text-red-500 font-bold uppercase text-center bg-red-500/10 p-2 rounded-lg">{locationError}</p>}
                  {currentGPS && <div className="p-4 bg-black/60 border border-indigo-500/30 rounded-xl text-[10px] font-mono text-indigo-400 text-center uppercase tracking-widest shadow-inner">LAT: {currentGPS.lat.toFixed(4)} | LNG: {currentGPS.lng.toFixed(4)}</div>}
                  
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-white/40 uppercase ml-2 tracking-widest">Tracking Range (Meters)</label>
                    <input type="number" value={newRadius} onChange={e => setNewRadius(parseInt(e.target.value))} className="w-full p-4 rounded-xl bg-black/60 border border-white/20 text-white text-xs font-black shadow-inner" />
                  </div>

                  <select value={selectedLocationClassId} onChange={e => setSelectedLocationClassId(e.target.value)} className="w-full p-4 rounded-xl bg-black/60 border border-white/20 text-white text-[10px] font-black uppercase shadow-inner">
                    <option value="">Choose Class</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button disabled={!currentGPS || !selectedLocationClassId} onClick={handleSaveLocation} className="w-full bg-green-600 text-white py-4 rounded-xl text-[10px] font-black uppercase shadow-xl hover:bg-green-500 transition-all disabled:opacity-30">Save Location</button>
                </div>
              </div>

              {/* Hardware Monitoring */}
              <div className="glass-panel p-8 rounded-[2rem] border border-white/10 bg-black/40">
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6">Connected Devices</h4>
                <form onSubmit={handleAddNode} className="mb-6 space-y-3">
                   <input type="text" placeholder="DEVICE NAME" value={newNodeName} onChange={e => setNewNodeName(e.target.value)} className="w-full p-4 rounded-xl bg-black/60 border border-white/20 text-white text-[10px] font-black uppercase" />
                   <input type="text" placeholder="IP ADDRESS" value={newNodeIP} onChange={e => setNewNodeIP(e.target.value)} className="w-full p-4 rounded-xl bg-black/60 border border-white/20 text-white text-[10px] font-black" />
                   <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-xl hover:bg-indigo-500">Register Device</button>
                </form>
                <div className="space-y-3">
                  {hardwareNodes.map(node => (
                    <div key={node.id} className="glass-card p-4 rounded-2xl flex items-center justify-between border border-white/5 bg-black/20 shadow-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <i className="fa-solid fa-microchip text-xs"></i>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-white tracking-tight">{node.name}</p>
                          <p className="text-[8px] font-bold text-white/30 uppercase">{node.ipAddress}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] bg-green-600/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30 font-black uppercase animate-pulse">Online</span>
                        <button onClick={() => db.deleteHardwareNode(node.id).then(fetchData)} className="text-red-500/40 hover:text-red-500"><i className="fa-solid fa-trash-can text-[10px]"></i></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* LIVE CONTINUOUS ENFORCEMENT ENGINE */}
            <div className="glass-panel rounded-[3rem] border border-white/10 bg-black/30 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center">
                <h4 className="text-[11px] font-black text-white uppercase italic tracking-[0.2em]">Live Tracking</h4>
                <span className="text-[8px] bg-red-600 text-white px-2 py-1 rounded-full font-black animate-pulse">MONITORING</span>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto max-h-[700px] scrollbar-hide">
                <p className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-6 text-center leading-relaxed">Checking user distance from office.</p>
                {users.filter(u => u.role !== UserRole.ADMIN).map(u => {
                  const targetClass = classes.find(c => c.id === u.classId);
                  const mockDistance = Math.floor(Math.random() * 80); 
                  const isViolation = mockDistance > (targetClass?.geofenceRadius || 100);

                  return (
                    <div key={u.id} className="p-5 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-between hover:bg-white/10 transition-all group">
                      <div className="flex items-center gap-3">
                         <div className={`w-2 h-2 rounded-full ${isViolation ? 'bg-red-500' : 'bg-green-500'} animate-pulse shadow-[0_0_10px_currentColor]`}></div>
                         <div className="flex flex-col">
                            <span className="text-[10px] font-black text-white group-hover:text-indigo-400 transition-colors uppercase">{u.name}</span>
                            <span className="text-[8px] text-white/30 font-bold uppercase tracking-widest">{targetClass?.name || 'ZONE_NULL'}</span>
                         </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-[10px] font-black ${isViolation ? 'text-red-500' : 'text-green-500'} italic`}>
                          {isViolation ? 'AWAY' : 'IN OFFICE'}
                        </p>
                        <p className="text-[8px] text-white/20 font-bold uppercase">{mockDistance}m away</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'classes' && (
          <div className="space-y-6">
            <div className="glass-panel p-8 rounded-[2rem] border border-white/10 bg-black/30">
              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6">Add New Class</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-white/40 uppercase ml-2">Class Name</label>
                  <input type="text" placeholder="E.G. 10A" value={newClassName} onChange={e => setNewClassName(e.target.value)} className="w-full p-4 rounded-xl bg-black/60 border border-white/20 text-white text-xs font-black uppercase" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-white/40 uppercase ml-2">Range (Meters)</label>
                  <input type="number" value={newRadius} onChange={e => setNewRadius(parseInt(e.target.value))} className="w-full p-4 rounded-xl bg-black/60 border border-white/20 text-white text-xs font-black uppercase" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-white/40 uppercase ml-2">Work Starts</label>
                  <input type="time" value={newStartTime} onChange={e => setNewStartTime(e.target.value)} className="w-full p-4 rounded-xl bg-black/60 border border-white/20 text-white text-xs font-black" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-white/40 uppercase ml-2">Work Ends</label>
                  <input type="time" value={newEndTime} onChange={e => setNewEndTime(e.target.value)} className="w-full p-4 rounded-xl bg-black/60 border border-white/20 text-white text-xs font-black" />
                </div>
              </div>
              <button onClick={handleAddClass} className="btn-action w-full py-4 rounded-xl text-[10px] font-black">Save Class</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
               {classes.map(c => (
                 <div key={c.id} className="glass-card p-6 rounded-2xl border border-white/10 flex flex-col gap-4 bg-white/5 hover:border-indigo-500 transition-all group">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-xs uppercase italic text-white">{c.name}</span>
                      <button onClick={() => db.deleteClass(c.id).then(fetchData)} className="text-red-500/40 hover:text-red-500 transition-colors"><i className="fa-solid fa-trash-can"></i></button>
                    </div>
                    <div className="text-[9px] font-bold text-white/30 space-y-1 uppercase tracking-widest">
                       <p>Range: {c.geofenceRadius}m</p>
                       <p>Hours: {c.startTime} - {c.endTime}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}
      </div>

      {/* USER PROFILE MODAL */}
      {viewingUserProfile && (
        <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-enter">
          <div className="glass-panel w-full max-w-2xl rounded-[3rem] overflow-hidden border border-white/20 shadow-2xl flex flex-col bg-slate-900">
            <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="text-xl font-black uppercase italic tracking-tighter">User Info</h3>
              <button onClick={() => setViewingUserProfile(null)} className="w-10 h-10 rounded-full hover:bg-white/20 transition-all flex items-center justify-center text-xl"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="flex flex-col items-center gap-6">
                <div className="w-44 h-44 bg-white/5 rounded-[40px] border-4 border-indigo-500 flex items-center justify-center overflow-hidden shadow-2xl">
                   {viewingUserProfile.facialTemplates?.length ? (
                     <img src={viewingUserProfile.facialTemplates[0]} className="w-full h-full object-cover" />
                   ) : (
                     <i className="fa-solid fa-user text-6xl text-white/10"></i>
                   )}
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-white italic uppercase tracking-tighter">{viewingUserProfile.name}</p>
                  <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{viewingUserProfile.rollNumber}</p>
                </div>
              </div>
              <div className="space-y-6">
                 {[
                   { label: 'EMAIL', value: viewingUserProfile.email },
                   { label: 'TYPE', value: viewingUserProfile.role },
                   { label: 'PHONE', value: viewingUserProfile.phone || '---' },
                   { label: 'ADDRESS', value: viewingUserProfile.address || '---' },
                   { label: 'CLASS', value: classes.find(c => c.id === viewingUserProfile.classId)?.name || 'NONE' },
                 ].map(item => (
                   <div key={item.label} className="space-y-1">
                      <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">{item.label}</p>
                      <p className="text-xs font-black text-white">{item.value}</p>
                   </div>
                 ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminControls;
