
import React, { useState, useRef, useEffect } from 'react';
import { User, AttendanceRecord } from '../types';
import { db } from '../services/db';
import { GoogleGenAI } from "@google/genai";
import EnrollmentOnboarding from '../components/EnrollmentOnboarding';

interface AttendanceProps {
  user: User;
  onUpdateUser?: (user: User) => void;
}

const Attendance: React.FC<AttendanceProps> = ({ user, onUpdateUser }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [status, setStatus] = useState<'idle' | 'capturing' | 'matching' | 'success'>('idle');
  const [matchResult, setMatchResult] = useState<number | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [showSetup, setShowSetup] = useState(false);
  const [selectedMark, setSelectedMark] = useState<'PRESENT' | 'OD'>('PRESENT');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    if (!user.facialTemplate) {
      setShowSetup(true);
      return;
    }

    setIsCapturing(true);
    setStatus('capturing');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Camera access denied.");
      setIsCapturing(false);
    }
  };

  const verifyAndMark = async () => {
    if (videoRef.current && location && canvasRef.current) {
      setStatus('matching');
      setScanProgress(20);
      
      try {
        const context = canvasRef.current.getContext('2d');
        if (!context) throw new Error("Camera error");
        
        context.drawImage(videoRef.current, 0, 0, 320, 240);
        setScanProgress(40);
        
        const liveCapture = canvasRef.current.toDataURL('image/jpeg');
        const base64Live = liveCapture.split(',')[1];
        const base64Template = user.facialTemplate?.split(',')[1];

        if (!base64Template) throw new Error("Face data missing");

        setScanProgress(60);
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: base64Live } },
              { inlineData: { mimeType: 'image/jpeg', data: base64Template } },
              { text: "Compare these two face images. Are they the same person? Be strict. Respond only with a JSON object: { \"isMatch\": boolean, \"confidence\": number (0-100), \"reason\": string }" }
            ]
          },
          config: { responseMimeType: "application/json" }
        });

        setScanProgress(85);
        const result = JSON.parse(response.text || '{}');
        
        if (!result.isMatch || result.confidence < 75) {
          alert(`Face mismatch (${result.confidence}%): ${result.reason || "Verification failed."}`);
          setStatus('idle');
          setScanProgress(0);
          return;
        }

        const score = result.confidence;
        setMatchResult(score);
        setScanProgress(100);

        const newRecord: AttendanceRecord = {
          id: Math.random().toString(36).substr(2, 9),
          userId: user.id,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          status: selectedMark,
          location: location,
          device: 'App Check-in',
          facialMatchScore: score
        };

        await db.addAttendance(newRecord);
        
        setStatus('success');
        const stream = videoRef.current?.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.error("Verification failed:", err);
        alert("Verification failed. Please try again.");
        setStatus('idle');
        setScanProgress(0);
      }
    }
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, []);

  if (showSetup) {
    return <EnrollmentOnboarding user={user} onComplete={(u) => { onUpdateUser?.(u); setShowSetup(false); }} />;
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic drop-shadow-lg">Attendance</h2>
          <p className="text-indigo-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-1">
            <i className="fa-solid fa-face-viewfinder mr-2"></i>
            Facial recognition active
          </p>
        </div>
      </div>

      {!user.facialTemplate ? (
        <div className="glass-card p-12 rounded-[50px] shadow-2xl flex flex-col items-center justify-center text-center bg-white/95">
          <div className="w-24 h-24 bg-amber-50 text-amber-500 rounded-[35px] flex items-center justify-center mb-8 shadow-inner">
            <i className="fa-solid fa-face-viewfinder text-4xl"></i>
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight italic">Setup Required</h3>
          <p className="text-slate-400 font-medium max-w-sm mb-10 text-sm leading-relaxed">
            Please register your face data to start marking attendance.
          </p>
          <button 
            onClick={() => setShowSetup(true)}
            className="px-12 py-5 bg-indigo-600 text-white rounded-[25px] font-black uppercase tracking-[0.2em] text-xs shadow-2xl hover:bg-indigo-700 transition-all transform active:scale-95"
          >
            Start Setup
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass-card p-10 rounded-[50px] shadow-2xl flex flex-col items-center bg-white/95">
            <div className="w-full flex justify-center mb-6 gap-4">
              <button 
                onClick={() => setSelectedMark('PRESENT')}
                className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${selectedMark === 'PRESENT' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
              >
                Present
              </button>
              <button 
                onClick={() => setSelectedMark('OD')}
                className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${selectedMark === 'OD' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
              >
                On Duty (OD)
              </button>
            </div>

            <div className="w-full max-w-lg aspect-video bg-slate-900 rounded-[40px] border-8 border-white shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden relative">
              {!isCapturing ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-800/50">
                  <div className="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center mb-6 border border-white/10">
                    <i className="fa-solid fa-camera text-3xl"></i>
                  </div>
                  <button onClick={startCamera} className="px-10 py-4 bg-indigo-600 text-white rounded-[20px] font-black uppercase tracking-widest text-[10px] shadow-2xl hover:bg-indigo-700 transition-all">Start Camera</button>
                </div>
              ) : (
                <>
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                  {status === 'capturing' && (
                     <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_30px_#6366f1] animate-scan"></div>
                        <div className="absolute inset-10 border-2 border-dashed border-white/40 rounded-full"></div>
                        <div className="absolute bottom-6 left-0 w-full text-center">
                          <p className="text-[10px] font-black text-white uppercase tracking-[0.4em] drop-shadow-lg">Look here</p>
                        </div>
                     </div>
                  )}
                  {status === 'matching' && (
                    <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-white p-10">
                      <div className="relative w-20 h-20 mb-6">
                        <svg className="w-full h-full -rotate-90">
                          <circle cx="40" cy="40" r="36" className="stroke-white/10 fill-none" strokeWidth="4" />
                          <circle cx="40" cy="40" r="36" className="stroke-indigo-400 fill-none transition-all duration-300" strokeWidth="4" strokeLinecap="round" strokeDasharray="226" strokeDashoffset={226 - (226 * scanProgress) / 100} />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                           <i className="fa-solid fa-dna text-indigo-400 animate-pulse"></i>
                        </div>
                      </div>
                      <p className="font-black tracking-[0.3em] uppercase text-[10px] text-indigo-400">Verifying...</p>
                      <p className="text-[9px] opacity-40 font-bold uppercase mt-2">{scanProgress}%</p>
                    </div>
                  )}
                  {status === 'success' && (
                    <div className="absolute inset-0 bg-indigo-600/95 flex flex-col items-center justify-center text-white p-8 text-center animate-fadeIn">
                      <div className="w-20 h-20 bg-white rounded-[30px] flex items-center justify-center text-indigo-600 mb-6 shadow-2xl rotate-3">
                        <i className="fa-solid fa-check text-4xl"></i>
                      </div>
                      <p className="text-3xl font-black italic tracking-tighter uppercase">Verified</p>
                      <div className="mt-4 bg-white/20 px-6 py-2 rounded-full border border-white/20">
                         <p className="text-[10px] font-black uppercase tracking-widest">Match: {matchResult}%</p>
                         <p className="text-[9px] font-bold uppercase tracking-widest mt-1">Status: {selectedMark}</p>
                      </div>
                      <button onClick={() => { setIsCapturing(false); setStatus('idle'); }} className="mt-10 px-10 py-3 bg-white text-indigo-700 rounded-full font-black uppercase tracking-widest text-[10px] shadow-xl hover:scale-105 transition-all">Close</button>
                    </div>
                  )}
                </>
              )}
            </div>

            <button 
              disabled={!isCapturing || status !== 'capturing' || !location}
              onClick={verifyAndMark}
              className={`w-full mt-10 py-6 rounded-[30px] font-black text-xs uppercase tracking-[0.4em] shadow-2xl transition-all ${
                isCapturing && status === 'capturing' && location ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95' : 'bg-slate-100 text-slate-300'
              }`}
            >
              Confirm
            </button>
            
            <div className="w-full mt-8 grid grid-cols-2 gap-4">
              <div className="p-6 bg-slate-50 rounded-[30px] border border-slate-100 flex flex-col group hover:bg-white transition-all">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">User</span>
                <span className="text-sm font-black text-slate-800 truncate italic">{user.name}</span>
              </div>
              <div className="p-6 bg-slate-50 rounded-[30px] border border-slate-100 flex flex-col group hover:bg-white transition-all">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">GPS</span>
                <div className="flex items-center">
                   <div className={`w-2 h-2 rounded-full mr-2 ${location ? 'bg-green-500 animate-pulse' : 'bg-amber-400 animate-bounce'}`}></div>
                   <span className={`text-sm font-black ${location ? 'text-green-600' : 'text-amber-500'}`}>
                     {location ? 'Active' : 'Searching...'}
                   </span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-10 rounded-[50px] shadow-2xl bg-slate-900 text-white relative overflow-hidden group">
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[60px]"></div>
            <h3 className="text-xl font-black mb-10 flex items-center tracking-tight italic">
               <i className="fa-solid fa-shield-halved mr-4 text-indigo-400 opacity-40"></i>
               Security Info
            </h3>
            <div className="space-y-8 relative z-10">
              <div className="flex gap-5">
                <div className="w-12 h-12 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center text-indigo-400 border border-white/10 group-hover:rotate-6 transition-all">
                   <i className="fa-solid fa-fingerprint"></i>
                </div>
                <div>
                  <p className="font-black text-xs uppercase tracking-widest text-indigo-300">Face Scan</p>
                  <p className="text-[11px] opacity-60 font-medium leading-relaxed mt-1">Uses AI to verify your face against your profile.</p>
                </div>
              </div>
              <div className="flex gap-5">
                <div className="w-12 h-12 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center text-green-400 border border-white/10 group-hover:-rotate-6 transition-all">
                   <i className="fa-solid fa-satellite"></i>
                </div>
                <div>
                  <p className="font-black text-xs uppercase tracking-widest text-green-300">Location</p>
                  <p className="text-[11px] opacity-60 font-medium leading-relaxed mt-1">Verifies you are at the correct location.</p>
                </div>
              </div>
              <div className="flex gap-5">
                <div className="w-12 h-12 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center text-amber-400 border border-white/10 group-hover:scale-110 transition-all">
                   <i className="fa-solid fa-lock"></i>
                </div>
                <div>
                  <p className="font-black text-xs uppercase tracking-widest text-amber-300">Encryption</p>
                  <p className="text-[11px] opacity-60 font-medium leading-relaxed mt-1">All data is secured and encrypted.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" width="320" height="240" />
    </div>
  );
};

export default Attendance;
