import React, { useState, useMemo } from 'react';
import { Entry, UserType } from '../types';

interface ReportsProps {
  entries: Entry[];
}

const Reports: React.FC<ReportsProps> = ({ entries }) => {

  // Logic: Get Local Date (YYYY-MM-DD)
  const getTodayLocal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = getTodayLocal();

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedUserType, setSelectedUserType] = useState<'ALL' | UserType>('ALL');
  const [filterSearch, setFilterSearch] = useState('');

  // Reset filters
  const clearFilters = () => {
    setFromDate('');
    setToDate('');
    setSelectedDept('ALL');
    setSelectedUserType('ALL');
    setFilterSearch('');
  };

  const departments = useMemo(() => {
    const depts = new Set(entries.map(e => e.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const result = entries.filter(e => {
      // Safety check
      if (!e.checkInTime) return false;

      const entryDate = e.checkInTime.split('T')[0];
      const matchesDateRange = (!fromDate || entryDate >= fromDate) && (!toDate || entryDate <= toDate);
      const matchesDept = selectedDept === 'ALL' || e.department === selectedDept;
      const matchesType = selectedUserType === 'ALL' || e.userType === selectedUserType;
      const matchesSearch = filterSearch
        ? e.regNo.toLowerCase().includes(filterSearch.toLowerCase()) ||
        e.name.toLowerCase().includes(filterSearch.toLowerCase())
        : true;
      return matchesDateRange && matchesDept && matchesSearch && matchesType;
    });

    // FIX: SORT BY DATE & TIME (Newest First)
    return result.sort((a, b) => {
      const timeA = a.checkInTime || '';
      const timeB = b.checkInTime || '';
      return timeB.localeCompare(timeA); // Descending Order
    });

  }, [entries, fromDate, toDate, selectedDept, selectedUserType, filterSearch]);

  const deptCounts = useMemo(() => {
    const counts: Record<string, { total: number, student: number, staff: number }> = {};
    filteredEntries.forEach(e => {
      if (!counts[e.department]) {
        counts[e.department] = { total: 0, student: 0, staff: 0 };
      }
      counts[e.department].total += 1;
      if (e.userType === 'STUDENT') counts[e.department].student += 1;
      else counts[e.department].staff += 1;
    });
    return Object.entries(counts).sort((a, b) => b[1].total - a[1].total);
  }, [filteredEntries]);

  // Helpers
  const formatTime = (iso: string | undefined) => {
    if (!iso) return '---';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso: string | undefined) => {
    if (!iso) return '';
    return iso.split('T')[0];
  };

  const exportToCSV = () => {
    const reportTitle = `${selectedUserType}_${selectedDept === 'ALL' ? 'Overall' : selectedDept.replace(/\s+/g, '_')}_Report`;
    const headers = ['Entry ID', 'Registration No', 'Full Name', 'Department', 'User Type', 'Date', 'In Time', 'Out Time'];

    const rows = filteredEntries.map(e => [
      e.id,
      e.regNo,
      e.name?.replace(/,/g, '') || 'Unknown',
      e.department,
      e.userType,
      formatDate(e.checkInTime),
      formatTime(e.checkInTime),
      formatTime(e.checkOutTime)
    ]);

    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `SEC_Library_Logs_${reportTitle}_${fromDate || 'ALL'}_to_${toDate || 'ALL'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSummaryCSV = () => {
    const headers = ['Department Name', 'Total Usage', 'Student Count', 'Staff Count', 'Report Start', 'Report End'];
    const rows = deptCounts.map(([dept, data]) => [
      dept,
      data.total.toString(),
      data.student.toString(),
      data.staff.toString(),
      fromDate || 'ALL',
      toDate || 'ALL'
    ]);

    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `SEC_Dept_Usage_Summary.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-black text-[#1e3a8a] flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              ADMINISTRATIVE REPORTS
            </h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Generate access logs and usage summaries</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 flex flex-col justify-center">
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-tighter">Total Results</span>
              <span className="text-lg font-black text-[#1e3a8a] leading-none">{filteredEntries.length}</span>
            </div>
            <button
              onClick={exportToCSV}
              disabled={filteredEntries.length === 0}
              className="bg-[#1e3a8a] hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-bold transition-all shadow-md active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              EXPORT FULL LOG
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-6 bg-slate-50 rounded-xl border border-slate-100 mb-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">From Date</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full border-2 border-slate-200 rounded-lg p-2 text-sm font-semibold outline-none focus:border-[#1e3a8a] transition-all bg-white" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">To Date</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full border-2 border-slate-200 rounded-lg p-2 text-sm font-semibold outline-none focus:border-[#1e3a8a] transition-all bg-white" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">User Category</label>
            <select value={selectedUserType} onChange={(e) => setSelectedUserType(e.target.value as any)} className="w-full border-2 border-slate-200 rounded-lg p-2 text-sm font-semibold outline-none focus:border-[#1e3a8a] transition-all bg-white">
              <option value="ALL">All Users</option>
              <option value="STUDENT">Students Only</option>
              <option value="STAFF">Staff Only</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Department</label>
            <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="w-full border-2 border-slate-200 rounded-lg p-2 text-sm font-semibold outline-none focus:border-[#1e3a8a] transition-all bg-white">
              <option value="ALL">Overall</option>
              {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
            </select>
          </div>

          {/* Search + Clear Button */}
          <div className="flex gap-2">
            <div className="flex-grow">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Search</label>
              <input type="text" placeholder="Name/Reg No..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} className="w-full border-2 border-slate-200 rounded-lg p-2 text-sm font-semibold outline-none focus:border-[#1e3a8a] transition-all bg-white" />
            </div>
            <div className="flex flex-col justify-end">
              <button onClick={clearFilters} className="h-[42px] px-4 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors" title="Clear All Filters">
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Division 1: Department Usage Summary */}
        <div className="mb-10 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-6 bg-yellow-400 rounded-full"></div>
                Department Usage Summary
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Visit counts based on selected date range</p>
            </div>
            <button
              onClick={exportSummaryCSV}
              disabled={deptCounts.length === 0}
              className="bg-white hover:bg-slate-50 text-[#1e3a8a] border border-slate-200 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              Export Summary CSV
            </button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {deptCounts.length > 0 ? (
                deptCounts.map(([dept, data]) => (
                  <div key={dept} className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center justify-between hover:border-[#1e3a8a] transition-colors group">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-tight mb-2 truncate">{dept}</p>

                      <div className="flex items-end gap-3 mb-1">
                        <span className="text-2xl font-black text-slate-800 group-hover:text-[#1e3a8a] transition-colors">{data.total}</span>
                        <span className="text-[9px] font-bold text-slate-400 mb-1.5 uppercase">Total</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                          <span className="text-xs font-bold text-slate-600">{data.student} <span className="text-[8px] text-slate-400 uppercase">Stu</span></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                          <span className="text-xs font-bold text-slate-600">{data.staff} <span className="text-[8px] text-slate-400 uppercase">Stf</span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-10 text-center text-slate-400 italic font-medium">
                  No data visible. Try clearing filters or adjusting dates.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Division 2: Detailed Transaction Log */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Detailed Entry Logs</h3>
            <div className="h-px flex-grow bg-slate-100"></div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#1e3a8a] text-white uppercase text-[10px] font-black tracking-[0.15em]">
                <tr>
                  <th className="px-6 py-4">Reg No</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">In Time</th>
                  <th className="px-6 py-4 text-center">Out Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-black text-[#1e3a8a] font-mono">{e.regNo}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{e.name}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${e.userType === 'STAFF' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                        {e.userType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-500 italic">{e.department}</td>
                    <td className="px-6 py-4">
                      <span className="bg-green-50 text-green-700 px-2 py-1 rounded font-black text-[10px] border border-green-100">
                        {formatTime(e.checkInTime)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded font-black text-[10px] border ${e.checkOutTime ? 'bg-red-50 text-red-700 border-red-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                        }`}>
                        {formatTime(e.checkOutTime)}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">
                      No records found. If you have data, try clearing the date filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;