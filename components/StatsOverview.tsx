import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Entry } from '../types';

interface StatsOverviewProps {
  entries: Entry[];
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ entries }) => {
  
  // FIX: Get Local Date (YYYY-MM-DD) instead of UTC
  // This ensures the default filter is always "Today" in your timezone.
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

  /**
   * ✅ FILTER BY DATE (USING checkInTime)
   */
  const filteredData = useMemo(() => {
    return entries.filter(e => {
      // Safety check for missing timestamps
      if (!e.checkInTime) return false;
      
      const date = e.checkInTime.split('T')[0]; // YYYY-MM-DD
      return date >= fromDate && date <= toDate;
    });
  }, [entries, fromDate, toDate]);

  /**
   * ✅ BASIC STATS
   */
  const totalVisits = filteredData.length;
  const uniqueUsers = new Set(filteredData.map(e => e.regNo)).size;

  /**
   * ✅ STUDENT / STAFF SPLIT
   */
  const userTypeData = useMemo(() => {
    const counts = { STUDENT: 0, STAFF: 0 };
    filteredData.forEach(e => {
      if (e.userType === 'STUDENT') counts.STUDENT++;
      if (e.userType === 'STAFF') counts.STAFF++;
    });
    return [
      { name: 'Student', value: counts.STUDENT },
      { name: 'Staff', value: counts.STAFF }
    ];
  }, [filteredData]);

  /**
   * ✅ DEPARTMENT DISTRIBUTION
   */
  const deptData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(e => {
      const dept = e.department || 'Unknown'; // Handle missing departments
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Limit to top 10 to prevent overcrowding
  }, [filteredData]);

  /**
   * ✅ HOURLY USAGE
   */
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label:
        i === 0 ? '12 AM' :
        i < 12 ? `${i} AM` :
        i === 12 ? '12 PM' :
        `${i - 12} PM`,
      count: 0
    }));

    filteredData.forEach(e => {
      if (e.checkInTime) {
        // new Date() parses the string in Local Time by default (if no 'Z' suffix)
        // This correctly aligns with the user's perception of time
        const hour = new Date(e.checkInTime).getHours();
        if (hours[hour]) hours[hour].count++;
      }
    });

    // Filter to show meaningful hours (e.g., 7 AM to 9 PM)
    // You can adjust this range or remove the filter to show 24h
    return hours.filter(h => h.hour >= 7 && h.hour <= 21);
  }, [filteredData]);

  const TYPE_COLORS = ['#1e3a8a', '#8b5cf6'];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      {/* DATE FILTER */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-6">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">
            Start Date
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border-2 border-slate-100 rounded-lg p-2 text-sm font-bold outline-none focus:border-[#1e3a8a] transition-colors"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">
            End Date
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border-2 border-slate-100 rounded-lg p-2 text-sm font-bold outline-none focus:border-[#1e3a8a] transition-colors"
          />
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Visits', val: totalVisits, color: 'text-blue-900' },
          { label: 'Unique Users', val: uniqueUsers, color: 'text-yellow-600' },
          { label: 'Staff Visits', val: userTypeData[1].value, color: 'text-purple-600' },
          { label: 'Student Visits', val: userTypeData[0].value, color: 'text-green-600' }
        ].map((m, i) => (
          <div key={i} className="p-6 bg-white rounded-2xl border shadow-sm flex flex-col justify-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              {m.label}
            </p>
            <p className={`text-4xl font-black ${m.color}`}>{m.val}</p>
          </div>
        ))}
      </div>

      {/* PIE + AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <h3 className="text-sm font-black uppercase mb-6 text-slate-700">User Composition</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie 
                data={userTypeData} 
                innerRadius={60} 
                outerRadius={80} 
                paddingAngle={5}
                dataKey="value"
              >
                {userTypeData.map((_, i) => (
                  <Cell key={i} fill={TYPE_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border shadow-sm">
          <h3 className="text-sm font-black uppercase mb-6 text-slate-700">Hourly Traffic Volume</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={hourlyData}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="label" 
                tick={{fontSize: 10, fill: '#94a3b8'}} 
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{fontSize: 10, fill: '#94a3b8'}} 
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                 contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                 cursor={{ stroke: '#94a3b8', strokeWidth: 1 }}
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="#1e3a8a" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorCount)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DEPARTMENT BAR */}
      <div className="bg-white p-6 rounded-2xl border shadow-sm">
        <h3 className="text-sm font-black uppercase mb-6 text-slate-700">Top Departments (Visits)</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={deptData} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" hide />
            <YAxis 
                type="category" 
                dataKey="name" 
                width={150} 
                tick={{fontSize: 11, fontWeight: 600, fill: '#475569'}}
                axisLine={false}
                tickLine={false}
            />
            <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="value" fill="#1e3a8a" barSize={20} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StatsOverview;