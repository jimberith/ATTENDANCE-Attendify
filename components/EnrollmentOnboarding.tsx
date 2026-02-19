
import React, { useState, useRef, useEffect } from 'react';
import { User, Class, UserRole } from '../types';
import { db } from '../services/db';

interface EnrollmentOnboardingProps {
  user: User;
  onComplete: (updatedUser: User) => void;
}

const EnrollmentOnboarding: React.FC<EnrollmentOnboardingProps> = ({ user, onComplete }) => {
  const [step, setStep] = useState<'WELCOME' | 'CLASS_SELECT' | 'SCAN' | 'FINALIZING'>('WELCOME');
  const [isCapturing, setIsCapturing] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    db.getClasses().then(setClasses);
  }, []);

  const startCamera = async () => {
    setStep('SCAN');
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.error("Video play error", e));
      }
    } catch (err) {
      alert("Camera access required for secure identity setup.");
      setStep('WELCOME');
    }
  };

  const handleSkip = () => {
    onComplete({ 
      ...user, 
      biometricsSkipped: true, 
      classId: selectedClassId,
      settings: user.settings || {
        notificationsEnabled: false,
        workdayStart: '09:00',
        workdayEnd: '17:00',
        twoFactorEnabled: false,
        faceRecognitionSensitivity: 75,
        require2FABeforeFaceScan: false
      }
    });
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current && videoRef.current.readyState >= 2) {
      setStep('FINALIZING');
      const interval = setInterval(() => {
        setScanProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            const context = canvasRef.current!.getContext('2d', { willReadFrequently: true });
            
            const vw = videoRef.current!.videoWidth || 320;
            const vh = videoRef.current!.videoHeight || 240;
            canvasRef.current!.width = vw;
            canvasRef.current!.height = vh;
            
            context!.drawImage(videoRef.current!, 0, 0, vw, vh);
            const dataUrl = canvasRef.current!.toDataURL('image/jpeg', 0.8);
            
            const stream = videoRef.current!.srcObject as MediaStream;
            stream.getTracks().forEach(t => t.stop());
            
            onComplete({ 
              ...user, 
              facialTemplates: [dataUrl], 
              biometricsSkipped: false, 
              classId: selectedClassId,
              settings: user.settings || {
                notificationsEnabled: false,
                workdayStart: '09:00',
                workdayEnd: '17:00',
                twoFactorEnabled: false,
                faceRecognitionSensitivity: 75,
                require2FABeforeFaceScan: false
              }
            });
            return 100;
          }
          return p + 10;
        });
      }, 200);
    } else {
      alert("CAMERA NOT READY. PLEASE WAIT A SECOND.");
    }
  };

  const canProceedWithoutClass = user.role === UserRole.ADMIN || user.role === UserRole.STAFF;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 z-[200]">
      <div className="w-full max-w-xl glass-panel rounded-[50px] overflow-hidden p-10 md:p-14 shadow-2xl border border-white/20 text-center animate-enter bg-slate-900">
        
        {step === 'WELCOME' && (
          <div className="space-y-8">
            <div className="w-24 h-24 bg-indigo-500/20 rounded-3xl mx-auto flex items-center justify-center shadow-2xl border border-indigo-500/40">
              <i className="fa-solid fa-face-viewfinder text-white text-4xl"></i>
            </div>
            <div>
              <h2 className="text-4xl font-black text-white tracking-tighter mb-2 italic uppercase">Greetings, {user.name.split(' ')[0]}</h2>
              <p className="text-white/40 font-bold leading-relaxed px-4 text-[10px] uppercase tracking-widest">
                System initialization required. Enroll your identity to access restricted dashboard sectors.
              </p>
            </div>
            <button 
              onClick={() => setStep('CLASS_SELECT')}
              className="w-full py-6 bg-indigo-600 text-white rounded-[30px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-indigo-700 transition-all"
            >
              Begin Protocol
            </button>
          </div>
        )}

        {step === 'CLASS_SELECT' && (
          <div className="space-y-8 animate-enter">
            <div>
              <h2 className="text-3xl font-black text-white tracking-tighter mb-2 italic uppercase">Group Sector</h2>
              <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em]">Assigning your operational environment</p>
            </div>
            <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
               {classes.map(c => (
                 <button 
                   key={c.id} 
                   onClick={() => setSelectedClassId(c.id)}
                   className={`p-5 rounded-2xl border-2 transition-all font-black text-xs text-left uppercase ${selectedClassId === c.id ? 'border-indigo-600 bg-indigo-600/20 text-white' : 'border-white/10 bg-black/40 text-white/40 hover:border-white/20'}`}
                 >
                   {c.name}
                 </button>
               ))}
               {classes.length === 0 && (
                 <div className="py-10 bg-black/40 rounded-2xl border-2 border-dashed border-white/10">
                    <p className="text-white/20 font-black text-[10px] uppercase tracking-widest">No Sector Registry Found.</p>
                 </div>
               )}
            </div>
            <div className="flex flex-col space-y-4">
              <button 
                disabled={!selectedClassId && !canProceedWithoutClass}
                onClick={startCamera}
                className="w-full py-6 bg-indigo-600 text-white rounded-[30px] font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:bg-indigo-700 disabled:opacity-20"
              >
                Next: Biometric Sync
              </button>
              <button onClick={() => setStep('WELCOME')} className="text-[10px] font-black text-white/30 uppercase tracking-widest hover:text-white">Back</button>
            </div>
          </div>
        )}

        {step === 'SCAN' && (
          <div className="space-y-8 animate-enter">
            <div className="relative w-full aspect-square bg-black rounded-[40px] overflow-hidden shadow-2xl border-4 border-indigo-500/20">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-[15%] border-2 border-dashed border-white/20 rounded-full"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-400 shadow-[0_0_20px_#4f46e5] animate-scan"></div>
              </div>
            </div>
            <div className="flex flex-col space-y-4">
              <button onClick={handleCapture} className="w-full py-6 bg-green-500 text-white rounded-[30px] font-black text-xs uppercase tracking-[0.3em] shadow-xl">Capture Signature</button>
              <button onClick={handleSkip} className="text-[10px] font-black text-white/30 uppercase tracking-widest hover:text-white">Skip Identity Scan</button>
            </div>
          </div>
        )}

        {step === 'FINALIZING' && (
          <div className="space-y-12 py-10">
            <div className="w-32 h-32 border-4 border-white/10 border-t-indigo-500 rounded-full animate-spin mx-auto flex items-center justify-center">
              <span className="text-xl font-black text-white italic">{scanProgress}%</span>
            </div>
            <div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 italic">Securing Slot</h3>
              <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest animate-pulse">Hashing Facial Identity...</p>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" width="320" height="240" />
      </div>
    </div>
  );
};

export default EnrollmentOnboarding;
