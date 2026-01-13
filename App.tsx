import React, { useState, useEffect, useCallback } from 'react';
import { Entry, AppTab } from './types';
import { DBService } from './services/dbService';
import ScannerInput from './components/ScannerInput';
import StatsOverview from './components/StatsOverview';
import Reports from './components/Reports';
import ManualCheckout from './components/ManualCheckout';
import DataManagement from './components/DataManagement';
import UnknownEntries from './components/UnknownEntries';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock for Sidebar
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      const data = await DBService.getEntries();
      setEntries(data);
      setError(null);
    } catch (err: any) {
      console.error("Database connection failed", err);
      setError(err.message || "Could not connect to Spring Boot + MySQL Backend.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  // --- LOGIC: LOCAL DATE & TIME ---
  const getTodayLocal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const today = getTodayLocal();

  const formatTime = (iso: string | undefined) => {
    if (!iso) return '--:--';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // --- LOGIC: LIVE DASHBOARD ---
  const liveEntries = entries
    .filter(e => e.checkInTime && e.checkInTime.startsWith(today))
    .sort((a, b) => {
      const getTime = (entry: Entry) => entry.checkOutTime || entry.checkInTime || '';
      return getTime(b).localeCompare(getTime(a));
    })
    .slice(0, 50);

  const activeCount = entries.filter(e => !e.checkOutTime).length;

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Backend Connection Failed</h2>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="w-full bg-[#1e3a8a] text-white py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-blue-800 transition-all">Retry Connection</button>
        </div>
      </div>
    );
  }

  // Define Tabs for Sidebar
  const tabs = [
    { id: AppTab.DASHBOARD, label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: AppTab.NOT_CHECKED_OUT, label: 'In-Library', badge: activeCount, icon: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' },
    { id: AppTab.REPORTS, label: 'Reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: AppTab.STATISTICS, label: 'Analytics', icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: AppTab.DATA_MANAGEMENT, label: 'Manage DB', icon: 'M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3zm8 0c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 6c2.5 0 5 1.25 5 2.5V17H7v-1.5c0-1.25 2.5-2.5 5-2.5z' },
    { id: AppTab.UNKNOWN_ENTRIES, label: 'Unknown Entries', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' }
  ];

  return (
    <div className="flex h-screen bg-[#f1f5f9] font-sans overflow-hidden">

      {/* --- SIDEBAR --- */}
      <aside className="w-64 bg-[#1e3a8a] text-white flex flex-col shadow-2xl relative z-20 shrink-0">
        {/* Sidebar Header - UPDATED WITH LOGO */}
        <div className="h-20 flex flex-col items-center justify-center border-b border-blue-800/50 bg-[#172e6e] text-center px-4">
          <h1 className="font-black text-[20px] tracking-tight leading-none text-white">SEC</h1>
          <h1 className="font-bold text-[15px] tracking-tight leading-none text-white">CENTRAL LIBRARY</h1>
          <h2 className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mt-0.5 leading-tight">Gate Management System</h2>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${activeTab === tab.id
                ? 'bg-white text-[#1e3a8a] shadow-lg font-bold'
                : 'text-blue-100 hover:bg-white/10 hover:text-white font-medium'
                }`}
            >
              <div className="flex items-center gap-3">
                <svg className={`w-5 h-5 ${activeTab === tab.id ? 'text-orange-500' : 'opacity-70'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon} />
                </svg>
                <span className="text-sm">{tab.label}</span>
              </div>
              {tab.badge && tab.badge > 0 && (
                <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer (Time) */}
        <div className="p-4 border-t border-blue-800/50 bg-[#172e6e]">
          <div className="flex items-center justify-between text-blue-200">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">System Time</span>
              <span className="text-xl font-black font-mono text-white leading-tight">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-[10px] font-bold">{today}</span>
            </div>
            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f8fafc] relative">

        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10 shrink-0">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
            {tabs.find(t => t.id === activeTab)?.label}
          </h2>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Spring Boot Active
            </div>
          </div>
        </header>

        {/* --- DYNAMIC CONTENT CONTAINER --- */}
        <div className="flex-1 overflow-hidden relative">

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Loading Data...</p>
            </div>
          ) : (
            <>
              {/* ----------------- DASHBOARD VIEW (FIXED NO SCROLL) ----------------- */}
              {activeTab === AppTab.DASHBOARD && (
                <div className="h-full flex flex-col p-6 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">

                  {/* Centered Logo */}
                  <div className="flex justify-center mb-6 shrink-0">
                    <img
                      src="https://saveetha.ac.in/wp-content/uploads/2024/03/sec-logo-01as.png"
                      alt="Saveetha Engineering College Logo"
                      className="h-28 w-auto object-contain"
                    />
                  </div>



                  {/* MAIN GRID LAYOUT */}
                  <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-6 min-h-0">

                    {/* --- LEFT COLUMN (Scanner & Stats) --- */}
                    <div className="xl:col-span-1 flex flex-col gap-6 h-full overflow-y-auto pr-1">

                      {/* 1. Scanner */}
                      <ScannerInput onEntryProcessed={handleRefresh} />

                      {/* 2. Stats Cards (Stacked) */}
                      <div className="grid grid-cols-1 gap-4">
                        {/* Active Users */}
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all">
                          <div className="absolute right-0 top-0 p-4 opacity-10 transform translate-x-2 -translate-y-2">
                            <svg className="w-20 h-20 text-[#1e3a8a]" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>
                          </div>
                          <h4 className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-1">Currently In Library</h4>
                          <div className="flex items-end gap-2">
                            <span className="text-4xl font-black text-[#1e3a8a]">{activeCount}</span>
                            <span className="text-xs font-bold text-slate-400 mb-1.5">users</span>
                          </div>
                        </div>

                        {/* Total Scans */}
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-green-300 transition-all">
                          <div className="absolute right-0 top-0 p-4 opacity-10 transform translate-x-2 -translate-y-2">
                            <svg className="w-20 h-20 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 00-1-1H3zm6 9a1 1 0 100-2 1 1 0 000 2zM9.5 5.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm5 1.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" clipRule="evenodd"></path></svg>
                          </div>
                          <h4 className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-1">Total Scans Today</h4>
                          <div className="flex items-end gap-2">
                            <span className="text-4xl font-black text-slate-800">{liveEntries.length}</span>
                            <span className="text-xs font-bold text-slate-400 mb-1.5">entries</span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* --- RIGHT COLUMN (Activity Log) --- */}
                    <div className="xl:col-span-2 h-full min-h-0">
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-700 text-sm uppercase">Live Activity</h3>
                            <span className="bg-blue-100 text-[#1e3a8a] text-[10px] font-bold px-2 py-0.5 rounded">{today}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{liveEntries.length} Records</span>
                        </div>

                        <div className="overflow-y-auto flex-1 p-0 custom-scrollbar">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-white text-slate-400 sticky top-0 z-10 text-[10px] font-black uppercase tracking-wider border-b border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                              <tr>
                                <th className="px-6 py-3 bg-white">Student / Staff</th>
                                <th className="px-6 py-3 bg-white text-center">Status</th>
                                <th className="px-6 py-3 bg-white text-right">Timestamp</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {liveEntries.map(e => (
                                <tr key={e.id} className="hover:bg-blue-50/30 transition-colors group">
                                  <td className="px-6 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold text-xs flex items-center justify-center border border-slate-200 group-hover:bg-[#1e3a8a] group-hover:text-white transition-colors">
                                        {(e.name || '?').charAt(0)}
                                      </div>
                                      <div>
                                        <p className="font-bold text-slate-700 text-sm group-hover:text-[#1e3a8a] transition-colors">{e.name || <span className="text-orange-500 italic">Unknown</span>}</p>
                                        <p className="text-[10px] text-slate-400 font-mono font-medium">{e.regNo}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-3 text-center">
                                    <span className={`inline-block px-2 py-1 rounded text-[9px] font-black uppercase tracking-wide min-w-[60px] ${e.checkOutTime
                                      ? 'bg-slate-100 text-slate-500 border border-slate-200'
                                      : 'bg-green-100 text-green-700 border border-green-200'
                                      }`}>
                                      {e.checkOutTime ? 'Out' : 'In'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-3 text-right font-mono text-xs font-medium text-slate-500">
                                    {formatTime(e.checkOutTime || e.checkInTime)}
                                  </td>
                                </tr>
                              ))}
                              {liveEntries.length === 0 && (
                                <tr>
                                  <td colSpan={3} className="py-20 text-center text-slate-400 italic">
                                    No scans recorded for today ({today}).
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* ----------------- OTHER TABS (SCROLLABLE) ----------------- */}
              {activeTab !== AppTab.DASHBOARD && (
                <div className="h-full overflow-y-auto p-6 md:p-8 scroll-smooth">
                  <div className="max-w-6xl mx-auto">
                    {activeTab === AppTab.NOT_CHECKED_OUT && <ManualCheckout entries={entries} onRefresh={handleRefresh} />}
                    {activeTab === AppTab.STATISTICS && <StatsOverview entries={entries} />}
                    {activeTab === AppTab.REPORTS && <Reports entries={entries} />}
                    {activeTab === AppTab.DATA_MANAGEMENT && <DataManagement />}
                    {activeTab === AppTab.UNKNOWN_ENTRIES && <UnknownEntries entries={entries} onRefresh={handleRefresh} />}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;