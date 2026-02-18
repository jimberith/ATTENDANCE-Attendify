
import React, { useState, useEffect } from 'react';
import { User, UserRole, LeaveRequest, AttendanceRecord, Class, AuditEntry, HardwareNode } from '../types';
import { db } from '../services/db';

interface AdminControlsProps {
  user: User;
}

const AdminControls: React.FC<AdminControlsProps> = ({ user }) => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'requests' | 'classes' | 'manual' | 'audit' | 'hardware'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [hardwareNodes, setHardwareNodes] = useState<HardwareNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeIP, setNewNodeIP] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [u, l, c, logs, h] = await Promise.all([
        db.getUsers(), 
        db.getLeaveRequests(), 
        db.getClasses(),
        db.getAuditLogs(),
        db.getHardwareNodes()
      ]);
      setUsers(u);
      setLeaveRequests(l);
      setClasses(c);
      setAuditLogs(logs);
      setHardwareNodes(h);
    } catch (err) {
      console.error("Admin fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createAuditEntry = async (action: string, details: string) => {
    const entry: AuditEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleString(),
      adminId: user.id,
      adminName: user.name,
      action,
      details
    };
    await db.addAuditEntry(entry);
    fetchData();
  };

  const handleDownloadCSV = async () => {
    if (!selectedClassId) {
      alert("Please select a group first to download records.");
      return;
    }
    const groupName = classes.find(c => c.id === selectedClassId)?.name || 'Group';
    const groupUsers = users.filter(u => u.classId === selectedClassId);
    const allRecords = await db.getAttendance();
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Name,ID,Date,Time,Status,Location\n";
    
    groupUsers.forEach(u => {
      const userRecords = allRecords.filter(r => r.userId === u.id);
      userRecords.forEach(r => {
        csvContent += `"${u.name}","${u.rollNumber}","${r.date}","${r.time}","${r.status}","${r.location.lat}/${r.location.lng}"\n`;
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${groupName}_Attendance_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    await createAuditEntry('CSV_EXPORT', `Exported attendance for group: ${groupName}`);
  };

  const markAttendanceManual = async (u: User, status: 'PRESENT' | 'ABSENT' | 'OD') => {
    const newRecord: AttendanceRecord = {
      id: Math.random().toString(36).substr(2, 9),
      userId: u.id,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      status,
      location: { lat: 0, lng: 0 },
      device: `Manual (${user.name})`
    };
    await db.addAttendance(newRecord);
    await createAuditEntry('MANUAL_ATTENDANCE', `Marked ${u.name} as ${status}`);
    alert(`Marked ${status} for ${u.name}`);
    fetchData();
  };

  const handleAddHardware = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeName.trim() || !newNodeIP.trim()) return;
    const node: HardwareNode = {
      id: Math.random().toString(36).substr(2, 9),
      name: newNodeName.trim(),
      type: 'ESP32_CAM',
      ipAddress: newNodeIP.trim(),
      status: 'OFFLINE'
    };
    await db.addHardwareNode(node);
    await createAuditEntry('HARDWARE_ADD', `Added hardware: ${newNodeName}`);
    setNewNodeName('');
    setNewNodeIP('');
    fetchData();
  };

  const handleDeleteHardware = async (id: string) => {
    if (confirm("Remove hardware?")) {
      await db.deleteHardwareNode(id);
      await createAuditEntry('HARDWARE_DELETE', `Removed hardware ID: ${id}`);
      fetchData();
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    const newClass: Class = {
      id: Math.random().toString(36).substr(2, 9),
      name: newClassName.trim(),
      description: newClassDesc.trim()
    };
    await db.addClass(newClass);
    await createAuditEntry('CLASS_CREATE', `Created new group: ${newClassName}`);
    setNewClassName('');
    setNewClassDesc('');
    fetchData();
  };

  const handleDeleteClass = async (id: string, name: string) => {
    const message = `CONFIRM DELETION: Are you sure you want to delete '${name}'?\n\nWARNING: Deleting this group will unassign all users from it. This action cannot be undone.`;
    if (confirm(message)) {
      await db.deleteClass(id);
      await createAuditEntry('CLASS_DELETE', `Deleted group: ${name}`);
      fetchData();
    }
  };

  const updateUserRole = async (u: User, newRole: UserRole) => {
    await db.saveUser({ ...u, role: newRole });
    await createAuditEntry('ROLE_CHANGE', `Changed ${u.name}'s role to ${newRole}`);
    fetchData();
  };

  const updateUserClass = async (u: User, newClassId: string) => {
    const className = classes.find(c => c.id === newClassId)?.name || 'None';
    await db.saveUser({ ...u, classId: newClassId });
    await createAuditEntry('CLASS_REASSIGN', `Reassigned ${u.name} to ${className}`);
    fetchData();
  };

  const filteredUsers = users.filter(u => 
    (u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (!selectedClassId || u.classId === selectedClassId)
  );

  const arduinoCode = `#include "esp_camera.h"
#include <WiFi.h>

// Select camera model
#define CAMERA_MODEL_AI_THINKER 

#include "camera_pins.h"

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

void startCameraServer();

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi connected");

  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  
  if(psramFound()){
    config.frame_size = FRAMESIZE_UXGA;
    config.jpeg_quality = 10;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }

  startCameraServer();
  Serial.print("Camera Ready! Use 'http://");
  Serial.print(WiFi.localIP());
  Serial.println("' to connect");
}`;

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic drop-shadow-lg">Admin</h2>
          <p className="text-white/80 font-bold uppercase text-[10px] tracking-widest mt-1">Management Console</p>
        </div>
        
        <div className="flex bg-white/20 p-2 rounded-[30px] backdrop-blur-3xl border border-white/20 shadow-xl overflow-x-auto">
          <button 
            onClick={() => setActiveSubTab('users')} 
            className={`px-6 py-3 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'users' ? 'bg-white text-indigo-700 shadow-xl' : 'text-white hover:bg-white/10'}`}
          >
            People
          </button>
          <button 
            onClick={() => setActiveSubTab('classes')} 
            className={`px-6 py-3 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'classes' ? 'bg-white text-indigo-700 shadow-xl' : 'text-white hover:bg-white/10'}`}
          >
            Groups
          </button>
          <button 
            onClick={() => setActiveSubTab('hardware')} 
            className={`px-6 py-3 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'hardware' ? 'bg-white text-indigo-700 shadow-xl' : 'text-white hover:bg-white/10'}`}
          >
            Hardware
          </button>
          <button 
            onClick={() => setActiveSubTab('manual')} 
            className={`px-6 py-3 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'manual' ? 'bg-white text-indigo-700 shadow-xl' : 'text-white hover:bg-white/10'}`}
          >
            Manual
          </button>
          <button 
            onClick={() => setActiveSubTab('audit')} 
            className={`px-6 py-3 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'audit' ? 'bg-white text-indigo-700 shadow-xl' : 'text-white hover:bg-white/10'}`}
          >
            History
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {(activeSubTab === 'users' || activeSubTab === 'manual') && (
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative group flex-1">
              <i className="fa-solid fa-magnifying-glass absolute left-7 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors"></i>
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-16 pr-8 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[30px] outline-none text-white placeholder:text-white/40 font-black text-[10px] uppercase tracking-widest transition-all"
              />
            </div>
            <select 
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-6 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[30px] text-white font-black text-[10px] uppercase tracking-widest outline-none"
            >
              <option value="" className="text-slate-900">All Groups</option>
              {classes.map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.name}</option>)}
            </select>
            {activeSubTab === 'manual' && selectedClassId && (
              <button 
                onClick={handleDownloadCSV}
                className="px-8 py-4 bg-green-600 text-white rounded-[30px] font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-green-700 active:scale-95 transition-all flex items-center gap-3"
              >
                <i className="fa-solid fa-file-csv text-lg"></i>
                Download CSV
              </button>
            )}
          </div>
        )}

        {activeSubTab === 'classes' && (
          <div className="space-y-6">
            <div className="bg-white/10 p-8 rounded-[40px] border border-white/20 backdrop-blur-xl">
               <h3 className="text-white font-black text-xs uppercase tracking-widest mb-6">Create New Group</h3>
               <form onSubmit={handleCreateClass} className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                      type="text" 
                      placeholder="Group Name"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      className="px-8 py-4 bg-white rounded-[25px] text-slate-900 font-bold outline-none shadow-inner"
                      required
                    />
                    <input 
                      type="text" 
                      placeholder="Description (Optional)"
                      value={newClassDesc}
                      onChange={(e) => setNewClassDesc(e.target.value)}
                      className="px-8 py-4 bg-white rounded-[25px] text-slate-900 font-bold outline-none shadow-inner"
                    />
                 </div>
                 <button type="submit" className="w-full md:w-auto px-10 py-4 bg-indigo-600 text-white rounded-[25px] font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">
                   Save Group
                 </button>
               </form>
            </div>

            <div className="glass-card rounded-[50px] shadow-2xl overflow-hidden border border-white/40 bg-white/95 p-10">
              <h3 className="text-slate-800 font-black text-xs uppercase tracking-widest mb-8">Existing Groups</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map(c => (
                  <div key={c.id} className="p-8 bg-slate-50 border-2 border-slate-100 rounded-[40px] flex flex-col justify-between group hover:border-indigo-200 hover:bg-white transition-all">
                    <div>
                      <h4 className="text-xl font-black text-slate-900 tracking-tight uppercase mb-1 italic">{c.name}</h4>
                      <p className="text-[10px] font-medium text-slate-400 mb-6 italic">{c.description || 'No description'}</p>
                      <div className="inline-flex items-center text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-xl">
                        {users.filter(u => u.classId === c.id).length} People
                      </div>
                    </div>
                    <div className="mt-8 flex justify-end">
                      <button 
                        onClick={() => handleDeleteClass(c.id, c.name)}
                        className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                ))}
                {classes.length === 0 && (
                  <div className="col-span-full text-center py-20 text-slate-300 font-black uppercase tracking-widest text-[10px]">Registry Empty</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'hardware' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              <div className="bg-white/10 p-8 rounded-[40px] border border-white/20 backdrop-blur-xl">
                 <h3 className="text-white font-black text-xs uppercase tracking-widest mb-6">Add Device</h3>
                 <form onSubmit={handleAddHardware} className="space-y-4">
                   <input 
                     type="text" 
                     placeholder="Name"
                     value={newNodeName}
                     onChange={(e) => setNewNodeName(e.target.value)}
                     className="w-full px-8 py-4 bg-white rounded-[25px] text-slate-900 font-bold outline-none shadow-inner"
                   />
                   <div className="flex gap-4">
                     <input 
                       type="text" 
                       placeholder="IP Address"
                       value={newNodeIP}
                       onChange={(e) => setNewNodeIP(e.target.value)}
                       className="flex-1 px-8 py-4 bg-white rounded-[25px] text-slate-900 font-bold outline-none shadow-inner"
                     />
                     <button type="submit" className="px-10 py-4 bg-indigo-600 text-white rounded-[25px] font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all">Add</button>
                   </div>
                 </form>
              </div>

              <div className="glass-card rounded-[40px] p-8 bg-white shadow-2xl overflow-hidden">
                <h3 className="text-slate-800 font-black text-xs uppercase tracking-widest mb-6">Devices</h3>
                <div className="space-y-4">
                  {hardwareNodes.map(node => (
                    <div key={node.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-[30px] border border-slate-100 group hover:border-indigo-200 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${node.status === 'ONLINE' ? 'bg-green-50 text-green-600' : 'bg-slate-200 text-slate-400'}`}>
                          <i className="fa-solid fa-camera-web"></i>
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-sm">{node.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{node.ipAddress}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => window.open(`http://${node.ipAddress}`, '_blank')}
                          className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                        >
                          <i className="fa-solid fa-external-link"></i>
                        </button>
                        <button 
                          onClick={() => handleDeleteHardware(node.id)}
                          className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                        >
                          <i className="fa-solid fa-trash-can text-sm"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                  {hardwareNodes.length === 0 && <p className="text-center py-10 text-slate-400 font-bold uppercase text-[10px] tracking-widest opacity-40">No devices.</p>}
                </div>
              </div>
            </div>

            <div className="glass-card rounded-[40px] p-10 bg-slate-900 text-white shadow-2xl relative overflow-hidden">
               <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[60px]"></div>
               <h3 className="text-xl font-black mb-6 flex items-center tracking-tight uppercase italic relative z-10">
                 <i className="fa-solid fa-code mr-4 text-indigo-400 opacity-40"></i>
                 Setup Code
               </h3>
               <p className="text-[11px] opacity-60 font-medium leading-relaxed mb-6 relative z-10">
                 Upload this code to your device.
               </p>
               <div className="relative z-10 bg-black/40 rounded-3xl p-6 border border-white/10 font-mono text-[10px] leading-relaxed h-[400px] overflow-y-auto scrollbar-hide">
                  <pre className="text-indigo-300">
                    {arduinoCode}
                  </pre>
               </div>
               <button 
                onClick={() => {
                  navigator.clipboard.writeText(arduinoCode);
                  alert("Copied!");
                }}
                className="mt-6 w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/10"
               >
                 Copy Code
               </button>
            </div>
          </div>
        )}

        {activeSubTab === 'users' && (
          <div className="glass-card rounded-[50px] shadow-2xl overflow-hidden border border-white/40 bg-white/95">
            {isLoading ? (
              <div className="h-[500px] flex items-center justify-center">
                <div className="w-14 h-14 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-100/50">
                    <tr className="text-slate-400 text-[10px] uppercase font-black tracking-widest">
                      <th className="px-10 py-8">User</th>
                      <th className="px-10 py-8">Group Assignment</th>
                      <th className="px-10 py-8">Role Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-indigo-50/40 transition-all group">
                        <td className="px-10 py-8">
                          <div className="flex items-center">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-white shadow flex items-center justify-center text-indigo-600 font-black mr-4 overflow-hidden">
                              {u.facialTemplate ? <img src={u.facialTemplate} className="w-full h-full object-cover" /> : u.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-800 tracking-tight">{u.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold tracking-widest truncate max-w-[150px]">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <select 
                            value={u.classId || ''}
                            onChange={(e) => updateUserClass(u, e.target.value)}
                            className="bg-white border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-tighter py-3 px-4 text-slate-600 outline-none focus:border-indigo-500 transition-all shadow-sm"
                          >
                            <option value="">None / Unassigned</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </td>
                        <td className="px-10 py-8">
                          {u.id === user.id ? (
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-red-50 text-red-600 px-6 py-2.5 rounded-2xl border border-red-100 shadow-sm">Root Admin</span>
                          ) : (
                            <select 
                              value={u.role}
                              onChange={(e) => updateUserRole(u, e.target.value as UserRole)}
                              className="bg-white border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] py-3 px-6 text-slate-700 outline-none focus:border-indigo-500 transition-all shadow-sm"
                            >
                              <option value={UserRole.STUDENT}>STUDENT</option>
                              <option value={UserRole.STAFF}>STAFF</option>
                              <option value={UserRole.ADMIN}>ADMIN</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'manual' && (
          <div className="glass-card rounded-[50px] shadow-2xl overflow-hidden border border-white/40 bg-white/95">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-indigo-50/50">
                  <tr className="text-indigo-400 text-[10px] uppercase font-black tracking-widest">
                    <th className="px-10 py-8">User</th>
                    <th className="px-10 py-8">Group</th>
                    <th className="px-10 py-8 text-center">Authorization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-indigo-50/40 transition-all group">
                      <td className="px-10 py-8">
                        <p className="text-sm font-black text-slate-800 tracking-tight italic">{u.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">ID: {u.rollNumber}</p>
                      </td>
                      <td className="px-10 py-8">
                        <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full uppercase tracking-tighter border border-indigo-100">
                           {classes.find(c => c.id === u.classId)?.name || 'None'}
                        </span>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex justify-center gap-3">
                          <button 
                            onClick={() => markAttendanceManual(u, 'PRESENT')}
                            title="Present"
                            className="w-12 h-12 flex items-center justify-center bg-green-500 text-white rounded-xl shadow-lg hover:bg-green-600 active:scale-90 transition-all"
                          >
                            <i className="fa-solid fa-check text-lg"></i>
                          </button>
                          <button 
                            onClick={() => markAttendanceManual(u, 'ABSENT')}
                            title="Absent"
                            className="w-12 h-12 flex items-center justify-center bg-red-500 text-white rounded-xl shadow-lg hover:bg-red-600 active:scale-90 transition-all"
                          >
                            <i className="fa-solid fa-xmark text-lg"></i>
                          </button>
                          <button 
                            onClick={() => markAttendanceManual(u, 'OD')}
                            title="On Duty (OD)"
                            className="w-12 h-12 flex items-center justify-center bg-blue-500 text-white rounded-xl shadow-lg hover:bg-blue-600 active:scale-90 transition-all"
                          >
                            <i className="fa-solid fa-briefcase text-lg"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === 'requests' && (
          <div className="glass-card rounded-[50px] shadow-2xl overflow-hidden border border-white/40 bg-white/95">
             <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-100/50">
                  <tr className="text-slate-400 text-[10px] uppercase font-black tracking-widest">
                    <th className="px-10 py-8">Person</th>
                    <th className="px-10 py-8">Type</th>
                    <th className="px-10 py-8">Dates</th>
                    <th className="px-10 py-8 text-center">Authorization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaveRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50 transition-all">
                      <td className="px-10 py-8">
                        <p className="text-sm font-black text-slate-800">{req.userName}</p>
                      </td>
                      <td className="px-10 py-8">
                        <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">{req.type}</span>
                      </td>
                      <td className="px-10 py-8 text-[11px] font-bold text-slate-500 italic">
                        {req.startDate} — {req.endDate}
                      </td>
                      <td className="px-10 py-8 text-center">
                        {req.status === 'PENDING' ? (
                          <div className="flex justify-center space-x-2">
                            <button 
                              onClick={() => db.updateLeaveStatus(req.id, 'APPROVED').then(fetchData)} 
                              className="w-10 h-10 flex items-center justify-center bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-xl transition-all"
                            >
                              <i className="fa-solid fa-check"></i>
                            </button>
                            <button 
                              onClick={() => db.updateLeaveStatus(req.id, 'REJECTED').then(fetchData)} 
                              className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all"
                            >
                              <i className="fa-solid fa-xmark"></i>
                            </button>
                          </div>
                        ) : (
                          <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border ${
                            req.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {req.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {leaveRequests.length === 0 && <p className="text-center py-20 text-slate-300 font-black uppercase tracking-widest text-[10px]">No pending requests</p>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === 'audit' && (
          <div className="glass-card rounded-[50px] shadow-2xl overflow-hidden border border-white/40 bg-white/95">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-900">
                  <tr className="text-slate-400 text-[10px] uppercase font-black tracking-widest">
                    <th className="px-10 py-8">Action</th>
                    <th className="px-10 py-8">Details</th>
                    <th className="px-10 py-8">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-all">
                      <td className="px-10 py-8">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          log.action === 'ROLE_CHANGE' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          log.action === 'MANUAL_ATTENDANCE' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                          'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          {log.action}
                        </span>
                        <p className="text-[10px] font-bold text-slate-400 mt-2 ml-1">BY: {log.adminName}</p>
                      </td>
                      <td className="px-10 py-8">
                        <p className="text-[11px] font-medium text-slate-700 leading-relaxed italic">"{log.details}"</p>
                      </td>
                      <td className="px-10 py-8">
                        <p className="text-[10px] font-black text-slate-400">{log.timestamp}</p>
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && <p className="text-center py-20 text-slate-300 font-black uppercase tracking-widest text-[10px]">History Clear</p>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminControls;
