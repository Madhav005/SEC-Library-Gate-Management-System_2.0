import React, { useState } from 'react';
import { Entry } from '../types';
import { DBService } from '../services/dbService';

interface ManualCheckoutProps {
  entries: Entry[];
  onRefresh: () => void;
}

const ManualCheckout: React.FC<ManualCheckoutProps> = ({ entries, onRefresh }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // FIX 1: Filter using 'checkOutTime' (Backend name) instead of just checking for null
  // We check for !checkOutTime to handle both null and undefined
  const activeEntries = entries.filter(e => !e.checkOutTime);

  // FIX 2: Helper to format the ISO string from Java (e.g., "2023-10-25T10:00:00")
  const formatTime = (isoString: string | undefined) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleCheckout = async (id: string) => {
    setIsProcessing(true);
    try {
      await DBService.manualCheckout(id);
      onRefresh();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckoutAll = async () => {
    if (window.confirm(`Check out all ${activeEntries.length} users?`)) {
      setIsProcessing(true);
      try {
        await DBService.checkoutAllActive();
        onRefresh();
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-black text-[#1e3a8a] flex items-center gap-2">
            <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            ACTIVE SESSIONS (IN-LIBRARY)
          </h2>
        </div>

        {activeEntries.length > 0 && (
          <button
            onClick={handleCheckoutAll}
            disabled={isProcessing}
            className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors border border-red-200 disabled:opacity-50"
          >
            Clear All Active Sessions
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-[0.15em]">
            <tr>
              <th className="px-6 py-4">User Details</th>
              <th className="px-6 py-4">Department</th>
              <th className="px-6 py-4">In-Time</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activeEntries.map(e => (
              <tr key={e.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-600 text-xs">{(e.name || '?').charAt(0)}</div>
                    <div>
                      <p className="font-bold text-slate-800">{e.name || <span className="text-orange-500 italic">Unknown</span>}</p>
                      <p className="text-xs text-slate-400 font-mono">{e.regNo}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-semibold text-slate-500">{e.department}</td>
                <td className="px-6 py-4">
                  {/* FIX 3: Use checkInTime and format it */}
                  <span className="bg-green-50 text-green-700 px-2 py-1 rounded font-black text-[10px] border border-green-100">
                    {formatTime(e.checkInTime)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleCheckout(e.id)}
                    disabled={isProcessing}
                    className="bg-[#1e3a8a] hover:bg-blue-800 text-white px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    Manual Check-out
                  </button>
                </td>
              </tr>
            ))}
            {activeEntries.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400 text-xs uppercase font-bold tracking-wider">
                  No active sessions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManualCheckout;