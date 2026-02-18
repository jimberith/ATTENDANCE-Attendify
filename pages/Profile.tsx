
import React, { useState, useRef } from 'react';
import { User, UserRole } from '../types';

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
    className: user.className || '',
    address: user.address || '',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showFaceModal, setShowFaceModal] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleSave = () => {
    onUpdateUser({ ...user, ...formData });
    setIsEditing(false);
  };

  const startCamera = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Camera access is required for profile enrollment.");
    }
  };

  const captureNewFace = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, 320, 240);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        onUpdateUser({ ...user, facialTemplate: dataUrl });
        
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
        setShowFaceModal(false);
        setIsCapturing(false);
        alert("Facial signature updated successfully.");
      }
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Identity Profile</h2>
          <p className="text-white/80">Manage your credentials and biometric footprint.</p>
        </div>
        <div className="flex space-x-2">
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="bg-white text-indigo-600 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center hover:bg-gray-50 transition-all"
            >
              <i className="fa-solid fa-pen-to-square mr-2"></i> Edit Record
            </button>
          ) : (
            <button onClick={handleSave} className="bg-green-500 text-white px-8 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transform active:scale-95 transition-all">
              Commit Changes
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card rounded-[40px] p-8 text-center shadow-2xl border border-white/40">
            <div className="relative inline-block mb-6">
              <div className="w-40 h-40 rounded-full border-4 border-indigo-500/20 bg-indigo-50 flex items-center justify-center text-indigo-700 text-5xl font-bold overflow-hidden shadow-inner ring-4 ring-white">
                {user.facialTemplate ? (
                  <img src={user.facialTemplate} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                  <span className="animate-pulse">{user.name.charAt(0)}</span>
                )}
              </div>
              <button 
                onClick={() => setShowFaceModal(true)} 
                className="absolute bottom-2 right-2 w-12 h-12 bg-indigo-600 text-white rounded-full border-4 border-white flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-all active:scale-90"
              >
                <i className="fa-solid fa-camera text-sm"></i>
              </button>
            </div>
            
            <h3 className="text-2xl font-black text-gray-800 tracking-tight leading-none mb-1">{user.name}</h3>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-6">{user.role}</p>
            
            <div className="pt-6 border-t border-gray-100 flex flex-col space-y-3">
              <div className="bg-indigo-50 py-3 px-4 rounded-2xl border border-indigo-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Roll ID</p>
                <p className="text-sm font-black text-indigo-700">{user.rollNumber}</p>
              </div>
              <div className="bg-purple-50 py-3 px-4 rounded-2xl border border-purple-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Department/Class</p>
                <p className="text-sm font-black text-purple-700">{user.className || 'Unassigned'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 glass-card rounded-[40px] p-10 shadow-2xl border border-white/40">
          <h4 className="text-xl font-black text-gray-800 mb-10 border-b border-gray-50 pb-6 flex items-center">
            <i className="fa-solid fa-address-card mr-4 text-indigo-600 opacity-20"></i>
            Detailed Credentials
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Legal Name</label>
              {isEditing ? (
                <input className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:border-indigo-100 focus:bg-white transition-all font-bold text-gray-700" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              ) : (
                <p className="font-bold text-gray-800 text-lg">{user.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Register No / Roll No</label>
              {isEditing ? (
                <input className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:border-indigo-100 focus:bg-white transition-all font-bold text-gray-700" value={formData.rollNumber} onChange={e => setFormData({...formData, rollNumber: e.target.value})} />
              ) : (
                <p className="font-bold text-gray-800 text-lg">{user.rollNumber}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Class / Section</label>
              {isEditing ? (
                <input className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:border-indigo-100 focus:bg-white transition-all font-bold text-gray-700" value={formData.className} onChange={e => setFormData({...formData, className: e.target.value})} />
              ) : (
                <p className="font-bold text-gray-800 text-lg">{user.className || 'Not Provided'}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Authentication Email</label>
              <p className="font-bold text-gray-400 text-lg italic">{user.email}</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mobile Endpoint</label>
              {isEditing ? (
                <input className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:border-indigo-100 focus:bg-white transition-all font-bold text-gray-700" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              ) : (
                <p className="font-bold text-gray-800 text-lg">{user.phone || '---'}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Address Record</label>
              {isEditing ? (
                <input className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:border-indigo-100 focus:bg-white transition-all font-bold text-gray-700" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              ) : (
                <p className="font-bold text-gray-800 text-sm leading-relaxed">{user.address || '---'}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showFaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="glass-card w-full max-w-md rounded-[50px] overflow-hidden p-12 animate-slideUp border border-white/20 text-center">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-gray-800 tracking-tight italic">Biometric Scan</h3>
                <button onClick={() => { setShowFaceModal(false); setIsCapturing(false); }} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><i className="fa-solid fa-xmark text-lg"></i></button>
             </div>
             
             <div className="w-full aspect-square bg-gray-900 rounded-[40px] overflow-hidden relative shadow-2xl mb-10 border-4 border-white">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                {!isCapturing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 backdrop-blur-sm">
                    <button onClick={startCamera} className="bg-indigo-600 text-white px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-700 transform active:scale-95 transition-all">Enable Sensor</button>
                  </div>
                )}
                {isCapturing && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-indigo-500 shadow-[0_0_20px_#6366f1] animate-scan"></div>
                    <div className="absolute inset-10 border-2 border-dashed border-white/20 rounded-full"></div>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" width="320" height="240" />
              </div>
              
              <button 
                onClick={captureNewFace}
                disabled={!isCapturing}
                className={`w-full py-6 rounded-[30px] font-black text-xs uppercase tracking-[0.3em] transition-all ${isCapturing ? 'bg-indigo-600 text-white shadow-2xl hover:bg-indigo-700' : 'bg-gray-100 text-gray-400'}`}
              >
                Sync Biometric ID
              </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
