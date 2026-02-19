
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
    onUpdateUser({ ...user, ...formData, settings });
    setIsEditing(false);
    setShow2FAModal(false);
  };

  const startCamera = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Please allow camera access.");
      setIsCapturing(false);
    }
  };

  const addTemplate = (dataUrl: string) => {
    const currentTemplates = user.facialTemplates || [];
    const updatedTemplates = [...currentTemplates, dataUrl];
    onUpdateUser({ ...user, facialTemplates: updatedTemplates });
    alert("Face saved!");
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

  const templateCount = user.facialTemplates?.length || 0;

  return (
    <div className="space-y-6 animate-enter pb-16">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic drop-shadow-lg">My Profile</h2>
          <p className="text-white/80 font-bold uppercase text-[10px] tracking-widest mt-1">My Personal Info</p>
        </div>
        <div className="flex space-x-3">
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="bg-white text-indigo-600 px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl flex items-center hover:scale-105 transition-all active:scale-95"
            >
              <i className="fa-solid fa-pen-to-square mr-2"></i> Edit Profile
            </button>
          ) : (
            <>
              <button onClick={() => setIsEditing(false)} className="bg-white/10 text-white border border-white/20 px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all">Cancel</button>
              <button onClick={handleSave} className="bg-indigo-600 text-white px-10 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl transform active:scale-95 transition-all">Save Changes</button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <div className="glass-panel rounded-[50px] p-10 text-center shadow-2xl border border-white/40 bg-white/95 text-slate-900">
            <div className="relative inline-block mb-8">
              <div className="w-48 h-48 rounded-[40px] border-4 border-indigo-500/10 bg-indigo-50 flex items-center justify-center text-indigo-700 text-6xl font-black overflow-hidden shadow-inner ring-8 ring-white transform -rotate-3 transition-transform">
                {templateCount > 0 ? (
                  <img src={user.facialTemplates![templateCount - 1]} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                  <span className="animate-pulse">{user.name.charAt(0)}</span>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 flex flex-col space-y-2">
                <button onClick={() => setShowFaceModal(true)} className="w-12 h-12 bg-indigo-600 text-white rounded-[20px] border-4 border-white flex items-center justify-center shadow-2xl hover:scale-110 transition-all"><i className="fa-solid fa-camera text-sm"></i></button>
                <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 bg-amber-500 text-white rounded-[20px] border-4 border-white flex items-center justify-center shadow-2xl hover:scale-110 transition-all"><i className="fa-solid fa-upload text-sm"></i></button>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
            </div>
            
            <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-1 italic uppercase">{user.name}</h3>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] mb-4">{user.role}</p>
            
            <div className="flex justify-center space-x-2 mb-6">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase rounded-full border border-indigo-100">{templateCount} Face Saved</span>
            </div>
          </div>

          <div className="glass-card rounded-[50px] p-10 shadow-2xl bg-slate-900 text-white">
            <h4 className="text-lg font-black mb-8 flex items-center tracking-tight uppercase italic">Settings</h4>
            <div className="space-y-6">
               <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-black uppercase tracking-widest">Accuracy</p>
                    <span className="text-indigo-400 font-bold text-[10px]">{settings.faceRecognitionSensitivity}%</span>
                  </div>
                  <input type="range" min="1" max="100" disabled={!isEditing} value={settings.faceRecognitionSensitivity} onChange={e => setSettings({...settings, faceRecognitionSensitivity: parseInt(e.target.value)})} className="w-full accent-indigo-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer disabled:opacity-30" />
               </div>

               <div className="flex items-center justify-between border-t border-white/10 pt-6">
                  <p className="text-xs font-black uppercase tracking-widest">Extra Security</p>
                  <button disabled={!isEditing} onClick={() => setSettings({...settings, require2FABeforeFaceScan: !settings.require2FABeforeFaceScan})} className={`w-12 h-6 rounded-full transition-all relative ${settings.require2FABeforeFaceScan ? 'bg-indigo-500' : 'bg-white/10'} ${!isEditing ? 'opacity-30' : ''}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.require2FABeforeFaceScan ? 'left-7' : 'left-1'}`}></div></button>
               </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 glass-panel rounded-[50px] p-12 shadow-2xl border border-white/40 bg-white/95 text-slate-900">
          <h4 className="text-2xl font-black text-slate-800 mb-10 border-b border-slate-50 pb-8 flex items-center tracking-tight italic uppercase">Personal Info</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            {[
              { label: 'Name', key: 'name', type: 'text' },
              { label: 'ID Number', key: 'rollNumber', type: 'text' },
              { label: 'Email', key: 'email', type: 'email', disabled: true },
              { label: 'Phone', key: 'phone', type: 'text' },
              { label: 'My Class', key: 'classId', type: 'select' },
              { label: 'Address', key: 'address', type: 'text' },
            ].map((field) => (
              <div key={field.key} className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{field.label}</label>
                {isEditing && !field.disabled ? (
                  field.type === 'select' ? (
                    <select 
                      className="w-full px-6 py-4 bg-slate-100 border-2 border-slate-200 rounded-2xl text-slate-800 font-bold outline-none focus:border-indigo-500 transition-all" 
                      value={formData[field.key as keyof typeof formData]} 
                      onChange={e => setFormData({...formData, [field.key]: e.target.value})}
                    >
                      <option value="">Select Group</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  ) : (
                    <input 
                      type={field.type}
                      className="w-full px-6 py-4 bg-slate-100 border-2 border-slate-200 rounded-2xl text-slate-800 font-bold outline-none focus:border-indigo-500 transition-all" 
                      value={formData[field.key as keyof typeof formData]} 
                      onChange={e => setFormData({...formData, [field.key]: e.target.value})}
                    />
                  )
                ) : (
                  <p className={`font-black text-lg ml-2 ${field.disabled ? 'text-slate-400' : 'text-slate-800'}`}>
                    {field.key === 'classId' ? (classes.find(c => c.id === user.classId)?.name || 'N/A') : (user[field.key as keyof User] || '---')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
