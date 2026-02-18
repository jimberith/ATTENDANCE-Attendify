
import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole, Class, UserSettings } from '../types';
import { db } from '../services/db';

interface ProfileProps {
  user: User;
  onUpdateUser: (user: User) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdateUser }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    rollNumber: user.rollNumber,
    classId: user.classId || '',
    address: user.address || '',
  });

  const [settings, setSettings] = useState<UserSettings>(user.settings || {
    notificationsEnabled: false,
    workdayStart: '09:00',
    workdayEnd: '17:00',
    twoFactorEnabled: false,
    faceRecognitionSensitivity: 75,
    require2FABeforeFaceScan: false
  });

  const [classes, setClasses] = useState<Class[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    db.getClasses().then(setClasses);
  }, []);

  const handleSave = () => {
    if (user.settings?.twoFactorEnabled && !show2FAModal) {
      setShow2FAModal(true);
      return;
    }
    onUpdateUser({ ...user, ...formData, settings });
    setIsEditing(false);
    setShow2FAModal(false);
  };

  const handle2FAVerify = () => {
    if (twoFactorCode === '123456') { // Simulated verification
      onUpdateUser({ ...user, ...formData, settings });
      setIsEditing(false);
      setShow2FAModal(false);
      setTwoFactorCode('');
    } else {
      alert("Invalid 2FA code. Please use simulated code '123456'");
    }
  };

  const startCamera = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Camera access is required for profile enrollment.");
      setIsCapturing(false);
    }
  };

  const addTemplate = (dataUrl: string) => {
    const currentTemplates = user.facialTemplates || [];
    const updatedTemplates = [...currentTemplates, dataUrl];
    onUpdateUser({ ...user, facialTemplates: updatedTemplates });
    alert("Facial template registered successfully.");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        addTemplate(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const captureNewFace = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, 320, 240);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        addTemplate(dataUrl);
        
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
        setShowFaceModal(false);
        setIsCapturing(false);
      }
    }
  };

  const resetTemplates = () => {
    if (confirm("Are you sure you want to clear all facial data? You will need to re-register to use biometric attendance.")) {
      onUpdateUser({ ...user, facialTemplates: [] });
    }
  };

  const templateCount = user.facialTemplates?.length || 0;

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic drop-shadow-lg">Profile</h2>
          <p className="text-white/80 font-bold uppercase text-[10px] tracking-widest mt-1">My Information</p>
        </div>
        <div className="flex space-x-3">
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="bg-white text-indigo-600 px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl flex items-center hover:bg-gray-50 transition-all active:scale-95"
            >
              <i className="fa-solid fa-pen-to-square mr-2"></i> Edit
            </button>
          ) : (
            <>
              <button onClick={() => setIsEditing(false)} className="bg-white/20 text-white border border-white/20 px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all">Cancel</button>
              <button onClick={handleSave} className="bg-indigo-600 text-white px-10 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl transform active:scale-95 transition-all">Save</button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <div className="glass-card rounded-[50px] p-10 text-center shadow-2xl border border-white/40 bg-white/95">
            <div className="relative inline-block mb-8">
              <div className="w-48 h-48 rounded-[40px] border-4 border-indigo-500/10 bg-indigo-50 flex items-center justify-center text-indigo-700 text-6xl font-black overflow-hidden shadow-inner ring-8 ring-white transform -rotate-3 group hover:rotate-0 transition-transform">
                {templateCount > 0 ? (
                  <img src={user.facialTemplates![templateCount - 1]} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                  <span className="animate-pulse">{user.name.charAt(0)}</span>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 flex flex-col space-y-2">
                <button 
                  onClick={() => setShowFaceModal(true)} 
                  className="w-12 h-12 bg-indigo-600 text-white rounded-[20px] border-4 border-white flex items-center justify-center shadow-2xl hover:bg-indigo-700 transition-all active:scale-90"
                  title="Camera Capture"
                >
                  <i className="fa-solid fa-camera text-sm"></i>
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="w-12 h-12 bg-amber-500 text-white rounded-[20px] border-4 border-white flex items-center justify-center shadow-2xl hover:bg-amber-600 transition-all active:scale-90"
                  title="Upload Image"
                >
                  <i className="fa-solid fa-upload text-sm"></i>
                </button>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
            </div>
            
            <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-1 italic">{user.name}</h3>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] mb-4">{user.role}</p>
            
            <div className="flex justify-center space-x-2 mb-6">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase rounded-full border border-indigo-100">
                {templateCount} Templates
              </span>
              {templateCount > 0 && (
                <button onClick={resetTemplates} className="px-3 py-1 bg-red-50 text-red-500 text-[9px] font-black uppercase rounded-full border border-red-100 hover:bg-red-500 hover:text-white transition-all">
                  Reset
                </button>
              )}
            </div>

            <div className="pt-8 border-t border-slate-100 flex flex-col space-y-4">
              <div className="bg-slate-50 py-4 px-6 rounded-[25px] border border-slate-100 flex justify-between items-center group hover:bg-white transition-all">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Roll ID</p>
                <p className="text-sm font-black text-slate-800">{user.rollNumber}</p>
              </div>
              <div className="bg-slate-50 py-4 px-6 rounded-[25px] border border-slate-100 flex justify-between items-center group hover:bg-white transition-all">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Group</p>
                <p className="text-sm font-black text-indigo-600">
                   {classes.find(c => c.id === user.classId)?.name || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-[50px] p-10 shadow-2xl bg-slate-900 text-white">
            <h4 className="text-lg font-black mb-8 flex items-center tracking-tight uppercase italic">
               <i className="fa-solid fa-sliders mr-4 text-indigo-400 opacity-40"></i>
               Settings
            </h4>
            <div className="space-y-6">
               <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-black uppercase tracking-widest">Face Sensitivity</p>
                    <span className="text-indigo-400 font-bold text-[10px]">{settings.faceRecognitionSensitivity}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" max="100" 
                    disabled={!isEditing}
                    value={settings.faceRecognitionSensitivity} 
                    onChange={e => setSettings({...settings, faceRecognitionSensitivity: parseInt(e.target.value)})}
                    className="w-full accent-indigo-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer disabled:opacity-30"
                  />
                  <p className="text-[9px] opacity-40 font-medium">Lower is more strict, higher is more lenient.</p>
               </div>

               <div className="flex items-center justify-between border-t border-white/10 pt-6">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest">Mandatory 2FA</p>
                    <p className="text-[10px] opacity-40 font-medium italic">Before face scan</p>
                  </div>
                  <button 
                    disabled={!isEditing}
                    onClick={() => setSettings({...settings, require2FABeforeFaceScan: !settings.require2FABeforeFaceScan})}
                    className={`w-12 h-6 rounded-full transition-all relative ${settings.require2FABeforeFaceScan ? 'bg-indigo-500' : 'bg-white/10'} ${!isEditing ? 'opacity-30' : ''}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.require2FABeforeFaceScan ? 'left-7' : 'left-1'}`}></div>
                  </button>
               </div>

               <div className="flex items-center justify-between border-t border-white/10 pt-6">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest">Notifications</p>
                    <p className="text-[10px] opacity-40 font-medium">Daily reminders</p>
                  </div>
                  <button 
                    disabled={!isEditing}
                    onClick={() => setSettings({...settings, notificationsEnabled: !settings.notificationsEnabled})}
                    className={`w-12 h-6 rounded-full transition-all relative ${settings.notificationsEnabled ? 'bg-indigo-500' : 'bg-white/10'} ${!isEditing ? 'opacity-30' : ''}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.notificationsEnabled ? 'left-7' : 'left-1'}`}></div>
                  </button>
               </div>
               
               {settings.notificationsEnabled && (
                 <div className="grid grid-cols-2 gap-4 animate-fadeIn">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black opacity-40 uppercase tracking-widest">Start</label>
                      <input 
                        type="time" 
                        disabled={!isEditing}
                        value={settings.workdayStart} 
                        onChange={e => setSettings({...settings, workdayStart: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-bold text-white outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black opacity-40 uppercase tracking-widest">End</label>
                      <input 
                        type="time" 
                        disabled={!isEditing}
                        value={settings.workdayEnd} 
                        onChange={e => setSettings({...settings, workdayEnd: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-bold text-white outline-none"
                      />
                    </div>
                 </div>
               )}

               <div className="border-t border-white/10 pt-6 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-amber-400">2-Factor Auth</p>
                    <p className="text-[10px] opacity-40 font-medium">Extra security</p>
                  </div>
                  <button 
                    disabled={!isEditing}
                    onClick={() => setSettings({...settings, twoFactorEnabled: !settings.twoFactorEnabled})}
                    className={`w-12 h-6 rounded-full transition-all relative ${settings.twoFactorEnabled ? 'bg-amber-500' : 'bg-white/10'} ${!isEditing ? 'opacity-30' : ''}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.twoFactorEnabled ? 'left-7' : 'left-1'}`}></div>
                  </button>
               </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 glass-card rounded-[50px] p-12 shadow-2xl border border-white/40 bg-white/95">
          <h4 className="text-2xl font-black text-slate-800 mb-10 border-b border-slate-50 pb-8 flex items-center tracking-tight italic uppercase">
            <i className="fa-solid fa-address-card mr-5 text-indigo-600 opacity-10"></i>
            Info
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Name</label>
              {isEditing ? (
                <input className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:border-indigo-100 focus:bg-white transition-all font-bold text-slate-800 shadow-inner" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              ) : (
                <p className="font-black text-slate-800 text-lg ml-2">{user.name}</p>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">ID</label>
              {isEditing ? (
                <input className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:border-indigo-100 focus:bg-white transition-all font-bold text-slate-800 shadow-inner" value={formData.rollNumber} onChange={e => setFormData({...formData, rollNumber: e.target.value})} />
              ) : (
                <p className="font-black text-slate-800 text-lg ml-2">{user.rollNumber}</p>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Group Assignment</label>
              {isEditing ? (
                <select 
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:border-indigo-100 focus:bg-white transition-all font-bold text-slate-800 shadow-inner" 
                  value={formData.classId} 
                  onChange={e => setFormData({...formData, classId: e.target.value})}
                >
                  <option value="">None / Unassigned</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : (
                <p className="font-black text-slate-800 text-lg ml-2">{classes.find(c => c.id === user.classId)?.name || 'Unassigned'}</p>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Email</label>
              <p className="font-black text-slate-300 text-lg italic ml-2">{user.email}</p>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Phone</label>
              {isEditing ? (
                <input className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:border-indigo-100 focus:bg-white transition-all font-bold text-slate-800 shadow-inner" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              ) : (
                <p className="font-black text-slate-800 text-lg ml-2">{user.phone || '---'}</p>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Address</label>
              {isEditing ? (
                <input className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:border-indigo-100 focus:bg-white transition-all font-bold text-slate-800 shadow-inner" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              ) : (
                <p className="font-black text-slate-800 text-sm leading-relaxed ml-2">{user.address || '---'}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {show2FAModal && (
        <div className="fixed inset-0 z-[400] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
          <div className="glass-card w-full max-w-md rounded-[50px] overflow-hidden p-12 text-center border border-white/20 animate-slideUp">
             <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-[30px] flex items-center justify-center mx-auto mb-8 shadow-inner">
                <i className="fa-solid fa-shield-halved text-4xl"></i>
             </div>
             <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter mb-2">2-Factor Auth</h3>
             <p className="text-slate-400 text-[11px] font-medium leading-relaxed mb-10 px-6">
                Enter the code sent to your device.
             </p>
             <input 
               type="text" 
               placeholder="Code" 
               maxLength={6}
               value={twoFactorCode}
               onChange={e => setTwoFactorCode(e.target.value)}
               className="w-full text-center py-6 bg-slate-100 rounded-[30px] font-black text-2xl tracking-[0.5em] text-slate-900 outline-none border-2 border-transparent focus:border-amber-400 focus:bg-white transition-all mb-8 shadow-inner"
             />
             <div className="flex space-x-4">
                <button onClick={() => setShow2FAModal(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-[22px] font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all">Cancel</button>
                <button onClick={handle2FAVerify} className="flex-2 py-4 bg-amber-500 text-white rounded-[22px] font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-amber-600 transition-all px-12">Verify</button>
             </div>
             <p className="mt-6 text-[9px] font-bold text-slate-300 uppercase tracking-widest">Demo: 123456</p>
          </div>
        </div>
      )}

      {showFaceModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-card w-full max-w-md rounded-[50px] overflow-hidden p-12 animate-slideUp border border-white/20 text-center bg-white/95">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase">Capture Template</h3>
                <button onClick={() => { setShowFaceModal(false); setIsCapturing(false); }} className="w-12 h-12 flex items-center justify-center rounded-[20px] hover:bg-slate-100 text-slate-400 transition-all"><i className="fa-solid fa-xmark text-lg"></i></button>
             </div>
             
             <div className="w-full aspect-square bg-slate-900 rounded-[40px] overflow-hidden relative shadow-[0_20px_60px_rgba(0,0,0,0.2)] mb-10 border-8 border-white">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                {!isCapturing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
                    <button onClick={startCamera} className="bg-indigo-600 text-white px-10 py-5 rounded-[25px] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-700 transform active:scale-95 transition-all">Enable Optics</button>
                  </div>
                )}
                {isCapturing && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_30px_#6366f1] animate-scan"></div>
                    <div className="absolute inset-10 border-2 border-dashed border-white/20 rounded-full"></div>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" width="320" height="240" />
              </div>
              
              <button 
                onClick={captureNewFace}
                disabled={!isCapturing}
                className={`w-full py-6 rounded-[30px] font-black text-xs uppercase tracking-[0.3em] transition-all shadow-2xl ${isCapturing ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-300'}`}
              >
                Capture Template
              </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
