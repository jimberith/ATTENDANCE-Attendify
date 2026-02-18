
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
  const [status, setStatus] = useState<'idle' | '2fa' | 'capturing' | 'matching' | 'success'>('idle');
  const [matchResult, setMatchResult] = useState<number | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [showSetup, setShowSetup] = useState(false);
  const [selectedMark, setSelectedMark] = useState<'PRESENT' | 'OD'>('PRESENT');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startProcess = () => {
    if (user.settings?.require2FABeforeFaceScan) {
      setStatus('2fa');
    } else {
      startCamera();
    }
  };

  const handle2FAVerify = () => {
    if (twoFactorCode === '123456') {
      setTwoFactorCode('');
      startCamera();
    } else {
      alert("Invalid 2FA code. Demo: 123456");
    }
  };

  const startCamera = async () => {
    if (!user.facialTemplates || user.facialTemplates.length === 0) {
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
      setStatus('idle');
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
        const templates = user.facialTemplates || [];

        if (templates.length === 0) throw new Error("Face data missing");

        setScanProgress(60);
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Multi-template verification: We can either prompt AI to check against a collage or pick the best one.
        // For simplicity and robustness, we pick up to 3 templates to compare.
        const selectedTemplates = templates.slice(-3); 
        const promptParts = [
          { inlineData: { mimeType: 'image/jpeg', data: base64Live } },
          ...selectedTemplates.map(t => ({ inlineData: { mimeType: 'image/jpeg', data: t.split(',')[1] } })),
          { text: `Compare the FIRST image (live capture) with the OTHER images (registered templates). Is the person in the first image the same as the person in ANY of the other images? Sensitivity threshold: ${user.settings?.faceRecognitionSensitivity || 75}%. Respond only with JSON: { "isMatch": boolean, "confidence": number (0-100), "reason": string }` }
        ];

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: { parts: promptParts },
          config: { responseMimeType: "application/json" }
        });

        setScanProgress(85);
        const result = JSON.parse(response.text || '{}');
        
        const threshold = user.settings?.faceRecognitionSensitivity || 75;
        if (!result.isMatch || result.confidence < threshold) {
          alert(`Verification failed (Match: ${result.confidence}%). Threshold is ${threshold}%. Reason: ${result.reason || "Unknown"}`);
          setStatus('idle');
          setIsCapturing(false);
          setScanProgress(0);
          return;
        }

        const score = result.confidence;
        setMatchResult(score);
        setScanProgress(100);

        markAttendance(score, 'App Biometric Check-in');
        
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

  const markAttendance = async (score: number | null, device: string) => {
    const newRecord: AttendanceRecord = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      status: selectedMark,
      location: location || { lat: 0, lng: 0 },
      device,
      facialMatchScore: score || undefined
    };
    await db.addAttendance(newRecord);
  };

  const handleSkipFace = () => {
    if (confirm("By skipping facial verification, your attendance will be logged with low-trust status. Continue?")) {
      markAttendance(null, 'Manual Bypass');
      setStatus('success');
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
            Verification Hub
          </p>
        </div>
      </div>

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
            {status === 'idle' && (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-800/50">
                <div className="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center mb-6 border border-white/10">
                  <i className="fa-solid fa-lock text-3xl"></i>
                </div>
                <div className="flex flex-col space-y-3">
                  <button onClick={startProcess} className="px-12 py-4 bg-indigo-600 text-white rounded-[20px] font-black uppercase tracking-widest text-[10px] shadow-2xl hover:bg-indigo-700 transition-all">Begin Verification</button>
                  <button onClick={handleSkipFace} className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition-colors">Skip Face Registration</button>
                </div>
              </div>
            )}

            {status === '2fa' && (
              <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-8 animate-fadeIn">
                <i className="fa-solid fa-shield-halved text-4xl text-indigo-600 mb-4"></i>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">2FA Required</h3>
                <p className="text-[10px] text-slate-400 font-bold mb-6 text-center uppercase tracking-widest">Enter the verification code to proceed</p>
                <input 
                  type="text" 
                  maxLength={6} 
                  placeholder="000000"
                  className="w-48 text-center py-3 bg-slate-100 rounded-xl font-black text-2xl tracking-[0.3em] outline-none border-2 border-transparent focus:border-indigo-400 mb-6 shadow-inner"
                  value={twoFactorCode}
                  onChange={e => setTwoFactorCode(e.target.value)}
                />
                <div className="flex space-x-3">
                   <button onClick={() => setStatus('idle')} className="px-6 py-2 bg-slate-200 text-slate-500 rounded-lg text-[10px] font-black uppercase">Cancel</button>
                   <button onClick={handle2FAVerify} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase">Verify</button>
                </div>
                <p className="mt-4 text-[8px] font-bold text-slate-300 uppercase">Demo: 123456</p>
              </div>
            )}

            {status === 'capturing' && (
              <>
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_30px_#6366f1] animate-scan"></div>
                  <div className="absolute inset-10 border-2 border-dashed border-white/40 rounded-full"></div>
                </div>
              </>
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
                <p className="font-black tracking-[0.3em] uppercase text-[10px] text-indigo-400">Comparing Identity...</p>
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
                   {matchResult && <p className="text-[10px] font-black uppercase tracking-widest">Match: {matchResult}%</p>}
                   <p className="text-[9px] font-bold uppercase tracking-widest mt-1">Status: {selectedMark}</p>
                </div>
                <button onClick={() => setStatus('idle')} className="mt-10 px-10 py-3 bg-white text-indigo-700 rounded-full font-black uppercase tracking-widest text-[10px] shadow-xl hover:scale-105 transition-all">Close</button>
              </div>
            )}
          </div>

          <button 
            disabled={status !== 'capturing' || !location}
            onClick={verifyAndMark}
            className={`w-full mt-10 py-6 rounded-[30px] font-black text-xs uppercase tracking-[0.4em] shadow-2xl transition-all ${
              status === 'capturing' && location ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95' : 'bg-slate-100 text-slate-300'
            }`}
          >
            Confirm Identity
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
             Security Overview
          </h3>
          <div className="space-y-8 relative z-10">
            <div className="flex gap-5">
              <div className="w-12 h-12 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center text-indigo-400 border border-white/10 group-hover:rotate-6 transition-all">
                 <i className="fa-solid fa-users-viewfinder"></i>
              </div>
              <div>
                <p className="font-black text-xs uppercase tracking-widest text-indigo-300">Multi-Model Verification</p>
                <p className="text-[11px] opacity-60 font-medium leading-relaxed mt-1">Identity checks against multiple registered facial templates for max accuracy.</p>
              </div>
            </div>
            <div className="flex gap-5">
              <div className="w-12 h-12 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center text-green-400 border border-white/10 group-hover:-rotate-6 transition-all">
                 <i className="fa-solid fa-key"></i>
              </div>
              <div>
                <p className="font-black text-xs uppercase tracking-widest text-green-300">Pre-Scan 2FA</p>
                <p className="text-[11px] opacity-60 font-medium leading-relaxed mt-1">Multi-factor requirement ensures the actual account holder is present.</p>
              </div>
            </div>
            <div className="flex gap-5">
              <div className="w-12 h-12 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center text-amber-400 border border-white/10 group-hover:scale-110 transition-all">
                 <i className="fa-solid fa-sliders"></i>
              </div>
              <div>
                <p className="font-black text-xs uppercase tracking-widest text-amber-300">Custom Sensitivity</p>
                <p className="text-[11px] opacity-60 font-medium leading-relaxed mt-1">Algorithm threshold adjusted via your personal profile settings.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" width="320" height="240" />
    </div>
  );
};

export default Attendance;
