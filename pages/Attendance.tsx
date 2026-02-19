
import React, { useState, useRef, useEffect } from 'react';
import { User, AttendanceRecord, Class } from '../types';
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
  const [locationError, setLocationError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'capturing' | 'matching' | 'success'>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [showSetup, setShowSetup] = useState(false);
  const [selectedMark, setSelectedMark] = useState<'PRESENT' | 'OD'>('PRESENT');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fetchLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("GEOLOCATION NOT SUPPORTED BY BROWSER");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationError(null);
      },
      err => {
        console.warn("GPS Error in Attendance:", err.message);
        if (err.code === 1) {
          setLocationError("PLEASE ENABLE LOCATION IN YOUR BROWSER SETTINGS.");
        } else if (err.code === 2) {
          setLocationError("CANNOT FIND YOUR LOCATION. CHECK YOUR SIGNAL.");
        } else {
          setLocationError(`GPS ERROR: ${err.message.toUpperCase()}`);
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  const startCamera = async () => {
    if (!user.facialTemplates || user.facialTemplates.length === 0) {
      setShowSetup(true);
      return;
    }

    if (locationError) {
      alert("PLEASE ENABLE LOCATION ACCESS IN YOUR SETTINGS FIRST.");
      fetchLocation();
      return;
    }

    setIsCapturing(true);
    setStatus('capturing');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video plays
        videoRef.current.play().catch(e => console.error("Video play error", e));
      }
    } catch (err) {
      alert("PLEASE ALLOW CAMERA ACCESS IN YOUR BROWSER.");
      setIsCapturing(false);
      setStatus('idle');
    }
  };

  const verifyAndMark = async () => {
    // Check if video is ready for drawing
    if (videoRef.current && canvasRef.current && videoRef.current.readyState >= 2) {
      setStatus('matching');
      setScanProgress(0);
      
      try {
        const interval = setInterval(() => {
          setScanProgress(p => p >= 90 ? 90 : p + 10);
        }, 150);

        const context = canvasRef.current.getContext('2d', { willReadFrequently: true });
        if (!context) return;
        
        // Final sanity check for dimensions
        const vw = videoRef.current.videoWidth || 320;
        const vh = videoRef.current.videoHeight || 240;
        canvasRef.current.width = vw;
        canvasRef.current.height = vh;
        
        context.drawImage(videoRef.current, 0, 0, vw, vh);
        
        const liveCapture = canvasRef.current.toDataURL('image/jpeg', 0.8);
        const base64Live = liveCapture.split(',')[1];
        const templates = user.facialTemplates || [];

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: { 
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: base64Live } },
              ...templates.slice(-2).map(t => ({ inlineData: { mimeType: 'image/jpeg', data: t.split(',')[1] } })),
              { text: "MATCH IDENTITY. RESPOND JSON: { \"isMatch\": boolean, \"confidence\": number }" }
            ] 
          },
          config: { responseMimeType: "application/json" }
        });

        clearInterval(interval);
        setScanProgress(100);
        const result = JSON.parse(response.text || '{}');
        
        if (result.isMatch && result.confidence > 70) {
          const newRecord: AttendanceRecord = {
            id: Math.random().toString(36).substr(2, 9),
            userId: user.id,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            status: selectedMark,
            location: location || { lat: 0, lng: 0 },
            device: 'WEB_APP',
            facialMatchScore: result.confidence
          };
          await db.addAttendance(newRecord);
          setStatus('success');
          
          if (videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
          }
        } else {
          alert("MATCH FAILED. PLEASE TRY AGAIN IN BETTER LIGHT.");
          setStatus('idle');
          setIsCapturing(false);
        }
      } catch (err) {
        setStatus('idle');
        alert("COULD NOT PROCESS SCAN.");
      }
    } else {
      alert("CAMERA NOT READY. PLEASE WAIT A SECOND.");
    }
  };

  if (showSetup) {
    return <EnrollmentOnboarding user={user} onComplete={(u) => { onUpdateUser?.(u); setShowSetup(false); }} />;
  }

  return (
    <div className="space-y-6 animate-enter pb-10 max-w-2xl mx-auto">
      <div className="text-center">
        <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase">Mark Attendance</h2>
        <p className="text-indigo-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Please look at the camera</p>
      </div>

      <div className="glass-panel p-6 rounded-3xl relative overflow-hidden border border-white/10">
        <div className="flex gap-3 mb-6">
          <button 
            onClick={() => setSelectedMark('PRESENT')}
            className={`flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest border transition-all ${selectedMark === 'PRESENT' ? 'bg-indigo-600 border-white text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 border-white/10 text-white/40'}`}
          >
            Regular
          </button>
          <button 
            onClick={() => setSelectedMark('OD')}
            className={`flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest border transition-all ${selectedMark === 'OD' ? 'bg-indigo-600 border-white text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 border-white/10 text-white/40'}`}
          >
            Official Work
          </button>
        </div>

        {locationError && (
          <div className="mb-6 p-4 bg-red-600/10 border border-red-500/50 rounded-xl flex flex-col items-center gap-2">
            <p className="text-red-500 font-bold text-[9px] uppercase tracking-widest text-center leading-relaxed">{locationError}</p>
            <button onClick={fetchLocation} className="text-[10px] font-black text-white px-6 py-2 bg-red-600 rounded-lg uppercase hover:bg-red-700 transition-all mt-2">Check GPS</button>
          </div>
        )}

        <div className="aspect-square bg-black rounded-2xl border-4 border-indigo-600/30 relative overflow-hidden shadow-2xl">
          {status === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-indigo-950/20">
              <div className="w-20 h-20 rounded-full bg-indigo-600/10 flex items-center justify-center mb-6 border border-indigo-500/30">
                <i className="fa-solid fa-face-viewfinder text-4xl text-indigo-500"></i>
              </div>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-6 px-4">Ensure good lighting for the scan.</p>
              <button onClick={startCamera} className="btn-action w-full py-4 rounded-xl text-xs font-bold shadow-xl">START CAMERA</button>
            </div>
          )}

          {status === 'capturing' && (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale opacity-80 scale-x-[-1]" />
              <div className="absolute inset-0 border-[2px] border-indigo-500/30"></div>
              <div className="absolute inset-[15%] border-2 border-dashed border-indigo-500/40 rounded-full"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-indigo-400 shadow-[0_0_20px_#4f46e5] animate-scan"></div>
              <div className="absolute bottom-20 left-0 w-full text-center">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest drop-shadow-lg">CENTER YOUR FACE</p>
              </div>
              <button onClick={verifyAndMark} className="absolute bottom-6 left-6 right-6 btn-action py-4 rounded-xl text-xs font-bold shadow-2xl">MARK ATTENDANCE</button>
            </>
          )}

          {(status === 'matching' || status === 'success') && (
            <div className="absolute inset-0 bg-indigo-950 flex flex-col items-center justify-center p-8">
              {status === 'matching' ? (
                <>
                  <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6"></div>
                  <p className="text-xl font-black text-white uppercase italic tracking-widest">{scanProgress}% CHECKING</p>
                  <p className="text-[9px] text-indigo-300 font-bold uppercase tracking-widest mt-2 animate-pulse">Processing...</p>
                </>
              ) : (
                <>
                  <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white text-5xl mb-6 shadow-lg shadow-green-500/50">
                    <i className="fa-solid fa-check"></i>
                  </div>
                  <p className="text-2xl font-black text-white uppercase italic tracking-tighter">DONE!</p>
                  <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest mt-2">Saved Successfully</p>
                  <button onClick={() => setStatus('idle')} className="mt-8 bg-white text-indigo-900 px-10 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform">GO BACK</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" width="320" height="240" />
    </div>
  );
};

export default Attendance;
