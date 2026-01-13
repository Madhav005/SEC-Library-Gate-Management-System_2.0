// Import React to use React namespace for types like FC and FormEvent
import React, { useState, useEffect, useRef } from 'react';
import { DBService } from '../services/dbService';
import { Entry, UserProfile } from '../types';

interface ScannerInputProps {
  onEntryProcessed: (entry: Entry, type: 'IN' | 'OUT') => void;
}

const ScannerInput: React.FC<ScannerInputProps> = ({ onEntryProcessed }) => {
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState<{
    msg: string;
    details?: string;
    userType?: string;
    type: 'success' | 'info' | 'error' | null
  }>({ msg: '', type: null });

  const inputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // FIX 1: Use a Ref to track the timeout so we can clear it if a new scan happens
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // FIX 2: Better Focus Logic
  // Only steal focus if it is lost (document.body), allowing users to click "Manual Checkout" tabs.
  useEffect(() => {
    const checkFocus = () => {
      if (document.activeElement === document.body) {
        inputRef.current?.focus();
      }
    };
    const interval = setInterval(checkFocus, 1000);
    return () => clearInterval(interval);
  }, []);

  // FIX 3: Audio Context Cleanup to prevent memory leaks
  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // Helper to handle status with auto-clear debounce
  const setTimedStatus = (newStatus: typeof status) => {
    // Clear any existing timer so the message doesn't disappear prematurely
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }

    setStatus(newStatus);

    if (newStatus.type) {
      statusTimeoutRef.current = setTimeout(() => {
        setStatus({ msg: '', type: null });
      }, 4000);
    }
  };

  const playFeedbackSound = (type: 'IN' | 'OUT') => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech to prevent queue buildup
      window.speechSynthesis.cancel();

      const text = type === 'IN' ? 'Checked in' : 'Checked out';
      const utterance = new SpeechSynthesisUtterance(text);

      // Optional: Adjust voice/speed/pitch
      utterance.rate = 1.1;
      utterance.pitch = 1.0;

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const regNo = inputValue.trim();
    if (!regNo) return;

    setInputValue('');
    setTimedStatus({ msg: 'Checking records...', type: 'info' });


    try {
      // Direct lookup from MySQL Master Tables
      const profile: UserProfile | undefined = await DBService.lookupUserFromMaster(regNo);

      let finalProfile: Omit<UserProfile, 'regNo'>;

      if (!profile) {
        // UNKNOWN USER LOGIC
        finalProfile = {
          name: null as any, // Cast to any to bypass strict type for now (or update type def)
          department: null as any,
          userType: 'UNKNOWN'
        };

        setTimedStatus({
          msg: `UNKNOWN ID ${regNo}`,
          details: 'User logged. Register in "Unknown Entries" tab.',
          type: 'info' // Use Info or a warning color logic
        });
      } else {
        finalProfile = profile;
      }

      // Add log entry to MySQL log_entry table
      const entry = await DBService.addEntry(regNo, finalProfile);
      const entryType = entry.checkOutTime ? 'OUT' : 'IN';

      playFeedbackSound(entryType);

      if (profile) {
        setTimedStatus({
          msg: `${profile.name} marked ${entryType}.`,
          details: `${profile.department} | ${regNo}`,
          userType: profile.userType,
          type: 'success'
        });
      } else {
        setTimedStatus({
          msg: `Unknown User (${regNo}) marked ${entryType}.`,
          details: 'Please register this user later.',
          userType: 'UNKNOWN',
          type: 'info'
        });
      }

      onEntryProcessed(entry, entryType);

    } catch (err) {
      console.error(err);
      setTimedStatus({ msg: 'Database connection failed', details: 'Check backend status', type: 'error' });
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-black text-[#1e3a8a] flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
          SCANNER ONLINE
        </h2>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">Validation: Strict Master Mode</div>
      </div>

      <form onSubmit={handleSubmit} className="relative group">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Scan Student or Staff ID Card..."
          className="w-full text-2xl font-mono p-5 border-2 border-slate-100 rounded-2xl bg-slate-50 group-hover:bg-white focus:bg-white focus:border-[#1e3a8a] focus:ring-8 focus:ring-blue-50 outline-none transition-all pr-6 shadow-inner text-slate-900 placeholder:text-slate-200"
          autoFocus
          autoComplete="off"
        />
      </form>

      {status.type && (
        <div className={`mt-5 p-4 rounded-xl flex items-start gap-4 animate-in zoom-in-95 fade-in duration-300 ${status.type === 'success' ? 'bg-blue-50 text-[#1e3a8a] border border-blue-100' : status.type === 'info' ? 'bg-slate-50 text-slate-600 border border-slate-100' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          <div className="flex flex-col">
            <span className="font-black text-sm uppercase tracking-tight">{status.msg}</span>
            {status.details && <span className="text-[10px] font-bold opacity-70 uppercase tracking-widest mt-0.5">{status.details}</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScannerInput;