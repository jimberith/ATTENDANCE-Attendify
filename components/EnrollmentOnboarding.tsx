
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
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Camera access required for secure identity setup.");
      setStep('WELCOME');
    }
  };

  const handleSkip = () => {
    onComplete({ ...user, biometricsSkipped: true, classId: selectedClassId });
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      setStep('FINALIZING');
      const interval = setInterval(() => {
        setScanProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            const context = canvasRef.current!.getContext('2d');
            context!.drawImage(videoRef.current!, 0, 0, 320, 240);
            const dataUrl = canvasRef.current!.toDataURL('image/jpeg');
            
            const stream = videoRef.current!.srcObject as MediaStream;
            stream.getTracks().forEach(t => t.stop());
            
            onComplete({ ...user, facialTemplate: dataUrl, biometricsSkipped: false, classId: selectedClassId });
            return 100;
          }
          return p + 10;
        });
      }, 200);
    }
  };

  const canProceedWithoutClass = user.role === UserRole.ADMIN || user.role === UserRole.STAFF;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 via-gray-900 to-black flex items-center justify-center p-6 z-[200]">
      <div className="w-full max-w-xl glass-card rounded-[50px] overflow-hidden p-10 md:p-14 shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-white/10 text-center animate-fadeIn">
        
        {step === 'WELCOME' && (
          <div className="space-y-8 animate-slideUp">
            <div className="w-24 h-24 bg-indigo-500 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-indigo-500/30">
              <i className="fa-solid fa-face-viewfinder text-white text-4xl"></i>
            </div>
            <div>
              <h2 className="text-4xl font-black text-gray-800 tracking-tighter mb-2 italic">Welcome, {user.name.split(' ')[0]}</h2>
              <p className="text-gray-500 font-medium leading-relaxed px-4 text-sm">
                To access your secure dashboard, let's complete your profile setup and register your unique facial signature.
              </p>
            </div>
            <div className="space-y-3">
              <button 
                onClick={() => setStep('CLASS_SELECT')}
                className="w-full py-6 bg-indigo-600 text-white rounded-[30px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-indigo-700 transition-all active:scale-95"
              >
                Begin Setup
              </button>
            </div>
          </div>
        )}

        {step === 'CLASS_SELECT' && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-3xl font-black text-gray-800 tracking-tighter mb-2 italic uppercase">Select Your Class</h2>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Enrollment tracks your attendance within a group</p>
            </div>
            <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-2">
               {classes.map(c => (
                 <button 
                   key={c.id} 
                   onClick={() => setSelectedClassId(c.id)}
                   className={`p-4 rounded-2xl border-2 transition-all font-bold text-left ${selectedClassId === c.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-600'}`}
                 >
                   {c.name}
                 </button>
               ))}
               {classes.length === 0 && (
                 <div className="py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 italic font-bold text-xs uppercase tracking-widest">No classes established yet.</p>
                 </div>
               )}
            </div>
            <div className="flex flex-col space-y-3">
              <button 
                disabled={!selectedClassId && !canProceedWithoutClass}
                onClick={startCamera}
                className="w-full py-6 bg-indigo-600 text-white rounded-[30px] font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                {!selectedClassId && canProceedWithoutClass ? 'Skip Class & Face Setup' : 'Next: Face Setup'}
              </button>
              <button 
                onClick={() => setStep('WELCOME')}
                className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-indigo-500 transition-colors"
              >
                Back to Welcome
              </button>
            </div>
          </div>
        )}

        {step === 'SCAN' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="relative w-full aspect-square bg-black rounded-[40px] overflow-hidden shadow-2xl border-4 border-indigo-500/20">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-[15%] border-2 border-dashed border-white/40 rounded-full"></div>
                <div className="absolute top-0 left-0 w-full h-0.5 bg-indigo-400 shadow-[0_0_20px_#818cf8] animate-scan"></div>
                <div className="absolute bottom-8 left-0 w-full text-center">
                  <p className="text-[10px] font-black text-white uppercase tracking-[0.4em] drop-shadow-md">Center your face</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-3">
              <button 
                onClick={handleCapture}
                className="w-full py-6 bg-green-500 text-white rounded-[30px] font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:bg-green-600 active:scale-95 transition-all"
              >
                Capture Face ID
              </button>
              <button 
                onClick={handleSkip}
                className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-white transition-colors"
              >
                Finish Setup without Biometrics
              </button>
            </div>
          </div>
        )}

        {step === 'FINALIZING' && (
          <div className="space-y-12 py-10 animate-fadeIn">
            <div className="relative w-32 h-32 mx-auto">
              <svg className="w-full h-full -rotate-90">
                <circle cx="64" cy="64" r="60" className="stroke-gray-100 fill-none" strokeWidth="8" />
                <circle cx="64" cy="64" r="60" className="stroke-indigo-600 fill-none transition-all duration-300" strokeWidth="8" strokeLinecap="round" strokeDasharray="377" strokeDashoffset={377 - (377 * scanProgress) / 100} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-black text-indigo-600 italic">{scanProgress}%</span>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tighter mb-2 italic">Securing Profile</h3>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Syncing enrollment data with Cloud Registry...</p>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" width="320" height="240" />
      </div>
    </div>
  );
};

export default EnrollmentOnboarding;
