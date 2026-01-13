
import React, { useState, useMemo } from 'react';
import { Entry, UserProfile } from '../types';
import { DBService } from '../services/dbService';

interface UnknownEntriesProps {
    entries: Entry[];
    onRefresh: () => void;
}

const UnknownEntries: React.FC<UnknownEntriesProps> = ({ entries, onRefresh }) => {
    const [selectedReg, setSelectedReg] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', department: '', userType: 'STUDENT' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter only Unknown entries (or where name is null)
    const unknownEntries: Entry[] = useMemo(() => {
        return entries.filter(e => e.userType === 'UNKNOWN' || !e.name);
    }, [entries]);

    // Group by RegNo to show unique "Users" to register
    const uniqueUnknowns = useMemo(() => {
        const map = new Map<string, { count: number, lastSeen: string }>();
        unknownEntries.forEach(e => {
            const current = map.get(e.regNo) || { count: 0, lastSeen: '' };
            // Update last seen
            const entryTime = e.checkOutTime || e.checkInTime;
            if (!current.lastSeen || entryTime > current.lastSeen) {
                current.lastSeen = entryTime;
            }
            map.set(e.regNo, { count: current.count + 1, lastSeen: current.lastSeen });
        });
        return Array.from(map.entries()).map(([regNo, data]) => ({ regNo, ...data }));
    }, [unknownEntries]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReg) return;

        setIsSubmitting(true);
        try {
            const user: UserProfile = {
                regNo: selectedReg,
                name: formData.name,
                department: formData.department,
                userType: formData.userType as any
            };

            await DBService.registerUnknownUser(user);

            // Reset and Refresh
            setSelectedReg(null);
            setFormData({ name: '', department: '', userType: 'STUDENT' });
            onRefresh();
        } catch (err) {
            alert("Failed to register user. Check console.");
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Auto-sync on mount
    React.useEffect(() => {
        const sync = async () => {
            try {
                const res = await DBService.syncUnknownEntryLogs();
                if (res.resolvedCount > 0) {
                    onRefresh();
                }
            } catch (e) { console.error("Sync failed", e); }
        };
        sync();
    }, []);

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Unknown Entries</h2>
                    <p className="text-slate-500 text-sm font-medium">Register users from scanned unknown IDs.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={async () => {
                            const res = await DBService.syncUnknownEntryLogs();
                            if (res.resolvedCount > 0) {
                                alert(`Resolved ${res.resolvedCount} entries found in database.`);
                                onRefresh();
                            } else {
                                alert("No matching records found in database.");
                            }
                        }}
                        className="bg-white text-slate-500 hover:text-blue-600 px-3 py-2 rounded-xl border border-slate-200 font-bold text-xs uppercase tracking-wide transition-colors"
                        title="Check Database for these IDs"
                    >
                        ↻ Auto-Resolve
                    </button>
                    <div className="bg-orange-50 text-orange-700 px-4 py-2 rounded-xl border border-orange-100 font-bold text-xs uppercase tracking-wide">
                        {uniqueUnknowns.length} Unregistered IDs
                    </div>
                </div>
            </div>

            {uniqueUnknowns.length === 0 ? (
                <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 border-dashed">
                    <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h3 className="text-slate-900 font-black text-lg">All caught up!</h3>
                    <p className="text-slate-400 text-sm">No unknown entries found in the logs.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* LIST */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                        <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-xs uppercase tracking-widest text-slate-500">
                            Detected IDs
                        </div>
                        <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px]">
                            {uniqueUnknowns.map(u => (
                                <button
                                    key={u.regNo}
                                    onClick={() => {
                                        setSelectedReg(u.regNo);
                                        const autoType = DBService.getUserType(u.regNo);
                                        setFormData(prev => ({ ...prev, userType: autoType }));
                                    }}
                                    className={`w-full text-left p-4 flex items-center justify-between hover:bg-blue-50 transition-colors group ${selectedReg === u.regNo ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                                >
                                    <div>
                                        <div className="font-mono font-bold text-lg text-slate-700 group-hover:text-blue-700">{u.regNo}</div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400">Last Seen: {new Date(u.lastSeen).toLocaleDateString()} {new Date(u.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    </div>
                                    <div className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold">
                                        {u.count} Entries
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* FORM */}
                    <div className="sticky top-6">
                        {selectedReg ? (
                            <form onSubmit={handleRegister} className="bg-white p-8 rounded-2xl shadow-lg border border-blue-100 animate-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-black text-slate-800">Register ID</h3>
                                    <div className="bg-slate-100 px-3 py-1 rounded font-mono font-bold text-slate-600">{selectedReg}</div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Full Name</label>
                                        <input
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            type="text"
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            placeholder="e.g. John Doe"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Department</label>
                                            <input
                                                required
                                                value={formData.department}
                                                onChange={e => setFormData({ ...formData, department: e.target.value })}
                                                type="text"
                                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                placeholder="e.g. CSE"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">User Type</label>
                                            <select
                                                disabled
                                                value={formData.userType}
                                                onChange={e => setFormData({ ...formData, userType: e.target.value })}
                                                className="w-full p-3 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-500 focus:outline-none cursor-not-allowed appearance-none"
                                            >
                                                <option value="STUDENT">Student</option>
                                                <option value="STAFF">Staff</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedReg(null)}
                                        className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-[2] py-3 bg-[#1e3a8a] text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? 'Saving...' : 'Register & Update Logs'}
                                    </button>
                                </div>

                                <p className="mt-4 text-[10px] text-slate-400 text-center leading-relaxed">
                                    This will create the user in the master database and automatically update all previous unknown log entries for this ID.
                                </p>
                            </form>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                                <svg className="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                                <p className="font-bold text-sm">Select an ID from the list to register</p>
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>
    );
};

export default UnknownEntries;
