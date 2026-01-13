
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DBService } from '../services/dbService';
import { UserProfile } from '../types';

type SubTab = 'RECORDS' | 'MANUAL' | 'BULK' | 'BULK_DELETE';

const DataManagement: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('RECORDS');
  const [formData, setFormData] = useState({ regNo: '', name: '', department: '' });
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, msg: string }>({ type: null, msg: '' });
  const [isLoading, setIsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<'STUDENT' | 'STAFF'>('STUDENT');
  const [masterList, setMasterList] = useState<Omit<UserProfile, 'userType'>[]>([]);

  const fileImportRef = useRef<HTMLInputElement>(null);
  const fileDeleteRef = useRef<HTMLInputElement>(null);

  const existingDepartments = useMemo(() => {
    const depts = new Set(masterList.map(u => u.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [masterList]);

  const [totalStats, setTotalStats] = useState({ students: 0, staff: 0 });

  const refreshList = async () => {
    setIsLoading(true);
    try {
      // Fetch both for accurate stats
      const [students, staff] = await Promise.all([
        DBService.getMasterStudents(),
        DBService.getMasterStaff()
      ]);

      setTotalStats({ students: students.length, staff: staff.length });
      setMasterList(userTypeFilter === 'STUDENT' ? students : staff);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshList();
  }, [userTypeFilter, activeSubTab]);

  const filteredList = useMemo(() => {
    return masterList.filter(u =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.regNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.department.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [masterList, searchQuery]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Reset page on search or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, userTypeFilter]);

  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage]);


  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.regNo || !formData.name || !formData.department) {
      setStatus({ type: 'error', msg: 'Please fill all fields' });
      return;
    }

    setIsLoading(true);
    try {
      if (editingUser) {
        await DBService.updateMasterUser({ regNo: formData.regNo, name: formData.name, department: formData.department });
        setStatus({ type: 'success', msg: `Successfully updated ${formData.name}` });
        setEditingUser(null);
        setActiveSubTab('RECORDS');
      } else {
        await DBService.addMasterUser({ regNo: formData.regNo, name: formData.name, department: formData.department });
        setStatus({ type: 'success', msg: `Added to MySQL (${DBService.getUserType(formData.regNo)})` });
      }
      setFormData(prev => ({ ...prev, regNo: '', name: '' }));
      await refreshList();
      setTimeout(() => setStatus({ type: null, msg: '' }), 3000);
    } catch (err) {
      setStatus({ type: 'error', msg: 'MySQL Transaction Failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (user: Omit<UserProfile, 'userType'>) => {
    setFormData({ regNo: user.regNo, name: user.name, department: user.department });
    setEditingUser(user.regNo);
    setActiveSubTab('MANUAL');
  };

  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      setIsLoading(true);
      setUploadProgress(0);

      const lines = text.split('\n');
      const dataLines = lines.slice(1).filter(line => line.trim()); // Filter empty lines
      const total = dataLines.length;
      let count = 0;

      for (let i = 0; i < total; i++) {
        const line = dataLines[i];
        const [regNo, name, department] = line.split(',').map(s => s?.trim().replace(/^"|"$/g, ''));
        if (regNo && name && department) {
          try {
            await DBService.addMasterUser({ regNo, name, department });
            count++;
          } catch (err) {
            console.error(`Failed to add user ${regNo}`, err);
          }
        }
        // Update progress
        setUploadProgress(Math.round(((i + 1) / total) * 100));
      }

      setStatus({ type: 'success', msg: `Processed ${count} records into MySQL.` });
      await refreshList();
      setIsLoading(false);
      setUploadProgress(0);
      if (fileImportRef.current) fileImportRef.current.value = '';
      setTimeout(() => setStatus({ type: null, msg: '' }), 3000);
    };
    reader.readAsText(file);
  };

  const handleBulkDeleteUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('WARNING: This will permanently remove records from MySQL. Proceed?')) {
      if (fileDeleteRef.current) fileDeleteRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      setIsLoading(true);
      setUploadProgress(10); // Start artificial progress for single request

      const lines = text.split('\n');
      const regNos = lines.map(line => line.split(',')[0].trim().replace(/^"|"$/g, '')).filter(id => id && id.toLowerCase() !== 'regno');

      try {
        setUploadProgress(50); // Sending request
        const result = await DBService.bulkDeleteMasterUsers(regNos);
        setUploadProgress(100);
        setStatus({
          type: result.deletedCount > 0 ? 'success' : 'error',
          msg: result.deletedCount > 0
            ? `Successfully removed ${result.deletedCount} users from MySQL.`
            : 'No matching records found in database.'
        });
        await refreshList();
      } catch (err) {
        setStatus({ type: 'error', msg: 'MySQL Deletion Error' });
      }

      setIsLoading(false);
      setUploadProgress(0);
      if (fileDeleteRef.current) fileDeleteRef.current.value = '';
      setTimeout(() => setStatus({ type: null, msg: '' }), 3000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500 relative">

      {/* Blocking Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="w-64 space-y-4 text-center">
            <div className="w-16 h-16 border-4 border-blue-100 border-t-[#1e3a8a] rounded-full animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="text-xl font-black text-[#1e3a8a] uppercase tracking-tight">Processing...</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Please Wait</p>
            </div>
            {uploadProgress > 0 && (
              <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden relative">
                <div
                  className="h-full bg-[#1e3a8a] transition-all duration-300 ease-out flex items-center justify-center"
                  style={{ width: `${uploadProgress}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white mix-blend-difference">
                  {uploadProgress}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="p-6 border-b border-slate-100 bg-[#1e3a8a] text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight">MySQL Administration</h2>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-200 bg-blue-900/50 px-3 py-1 rounded-lg border border-blue-500/30">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              STUDENTS: <span className="text-white">{totalStats.students}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-purple-200 bg-blue-900/50 px-3 py-1 rounded-lg border border-purple-500/30">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              STAFF: <span className="text-white">{totalStats.staff}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {['RECORDS', 'MANUAL', 'BULK', 'BULK_DELETE'].map(tab => (
            <button
              key={tab}
              disabled={isLoading}
              onClick={() => setActiveSubTab(tab as SubTab)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === tab ? 'bg-white text-[#1e3a8a]' : 'bg-blue-800/50 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'}`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="p-8">
        {status.type && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 font-bold text-sm animate-in fade-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center bg-current text-white text-[10px]">
              {status.type === 'success' ? '✓' : '!'}
            </span>
            {status.msg}
          </div>
        )}

        {activeSubTab === 'RECORDS' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center p-1 bg-slate-100 rounded-xl">
                <button onClick={() => setUserTypeFilter('STUDENT')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${userTypeFilter === 'STUDENT' ? 'bg-white text-[#1e3a8a] shadow-sm' : 'text-slate-400'}`}>
                  Table: students_data <span className="ml-1 opacity-50">({totalStats.students})</span>
                </button>
                <button onClick={() => setUserTypeFilter('STAFF')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${userTypeFilter === 'STAFF' ? 'bg-white text-[#1e3a8a] shadow-sm' : 'text-slate-400'}`}>
                  Table: staff_data <span className="ml-1 opacity-50">({totalStats.staff})</span>
                </button>
              </div>
              <div className="relative w-full md:w-80">
                <input
                  type="text"
                  placeholder="Filter name, ID or department..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-900 focus:border-[#1e3a8a] outline-none shadow-sm"
                />
              </div>
            </div>
            {isLoading ? (
              <div className="py-20 text-center text-slate-400 uppercase font-black text-[10px] tracking-widest">Querying MySQL Cluster...</div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-slate-100 min-h-[400px]">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest sticky top-0 bg-slate-50 z-10 shadow-sm">
                      <tr>
                        <th className="px-6 py-4 w-16 text-center">S.No</th>
                        <th className="px-6 py-4">Reg No (PK)</th>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Department</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedList.map((user, index) => (
                        <tr key={user.regNo} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4 text-center font-bold text-slate-300 text-xs">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                          <td className="px-6 py-4 font-mono font-bold text-[#1e3a8a]">{user.regNo}</td>
                          <td className="px-6 py-4 font-black text-slate-700">{user.name}</td>
                          <td className="px-6 py-4 font-bold text-slate-400 italic text-xs">{user.department}</td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => handleEdit(user)} className="px-4 py-2 bg-blue-50 text-[#1e3a8a] border border-blue-100 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#1e3a8a] hover:text-white transition-all">Edit</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                      Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredList.length)} of {filteredList.length}
                    </p>
                    <div className="flex gap-2">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                        className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs uppercase disabled:opacity-50 hover:bg-slate-50"
                      >
                        Previous
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          // Simple logic to show first few pages or centered around current
                          let p = i + 1;
                          if (totalPages > 5 && currentPage > 3) {
                            p = currentPage - 2 + i;
                            if (p > totalPages) p = totalPages - (5 - 1) + i; // simplistic clamp
                          }
                          return (
                            <button
                              key={p}
                              onClick={() => setCurrentPage(p)}
                              className={`w-8 h-8 rounded-lg font-bold text-xs ${currentPage === p ? 'bg-[#1e3a8a] text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                            >
                              {p}
                            </button>
                          )
                        })}
                      </div>
                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs uppercase disabled:opacity-50 hover:bg-slate-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeSubTab === 'MANUAL' && (
          <form onSubmit={handleManualSubmit} className="max-w-md space-y-4">
            <h3 className="text-sm font-black text-[#1e3a8a] uppercase tracking-widest mb-4">
              {editingUser ? 'Update Master Record' : 'Manual Entry to MySQL'}
            </h3>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Registration Number</label>
              <input type="text" value={formData.regNo} disabled={!!editingUser} onChange={e => setFormData({ ...formData, regNo: e.target.value })} className={`w-full border-2 border-slate-100 rounded-lg p-3 text-sm font-bold text-slate-900 focus:border-[#1e3a8a] outline-none ${editingUser ? 'bg-slate-50' : ''}`} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Full Name</label>
              <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border-2 border-slate-100 rounded-lg p-3 text-sm font-bold text-slate-900 focus:border-[#1e3a8a] outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Department</label>
              <input
                type="text"
                list="dept-list-mgmt"
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
                className="w-full border-2 border-slate-100 rounded-lg p-3 text-sm font-bold text-slate-900 focus:border-[#1e3a8a] outline-none"
                placeholder="Select or enter new department..."
              />
              <datalist id="dept-list-mgmt">
                {existingDepartments.map(d => <option key={d} value={d} />)}
              </datalist>
            </div>
            <button disabled={isLoading} className="w-full bg-[#1e3a8a] text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-blue-800 transition-all shadow-md active:scale-95 disabled:opacity-50">
              {isLoading ? 'Processing...' : (editingUser ? 'Commit Changes' : 'Sync to MySQL')}
            </button>
          </form>
        )}

        {activeSubTab === 'BULK' && (
          <div className="space-y-6">
            <h3 className="text-sm font-black text-[#1e3a8a] uppercase tracking-widest">Batch Enrollment</h3>
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center bg-slate-50 hover:bg-white hover:border-[#1e3a8a] transition-all group">
              <svg className="w-12 h-12 text-slate-300 group-hover:text-[#1e3a8a] transition-colors mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <h3 className="font-black text-slate-700 uppercase tracking-tight mb-2">Upload Master Enrollment CSV</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] text-center max-w-xs mb-6">
                CSV Headers: regNo, name, department <br />(Auto-sorted by ID prefix)
              </p>
              <input
                ref={fileImportRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileImportRef.current?.click()}
                className="bg-white border-2 border-[#1e3a8a] text-[#1e3a8a] px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-50 transition-all shadow-sm active:scale-95"
              >
                Choose Enrollment File
              </button>
            </div>
          </div>
        )}

        {activeSubTab === 'BULK_DELETE' && (
          <div className="space-y-6">
            <h3 className="text-sm font-black text-red-600 uppercase tracking-widest">Global Removal</h3>
            <div className="border-2 border-dashed border-red-100 rounded-2xl p-10 flex flex-col items-center justify-center bg-red-50/30 hover:bg-white hover:border-red-500 transition-all group">
              <svg className="w-12 h-12 text-red-200 group-hover:text-red-500 transition-colors mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <h3 className="font-black text-slate-700 uppercase tracking-tight mb-2">Upload Cleanup List</h3>
              <p className="text-[10px] text-red-500 font-bold uppercase tracking-[0.2em] text-center max-w-xs mb-6">
                WARNING: Deletes from students_data & staff_data <br />Permanent Database Action
              </p>
              <input
                ref={fileDeleteRef}
                type="file"
                accept=".csv"
                onChange={handleBulkDeleteUpload}
                className="hidden"
              />
              <button
                onClick={() => fileDeleteRef.current?.click()}
                className="bg-white border-2 border-red-500 text-red-500 px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-50 transition-all shadow-sm active:scale-95"
              >
                Select Cleanup List
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataManagement;
