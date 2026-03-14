import { useState, useEffect } from 'react';
import { ArrowLeft, Activity, Target, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockData = [
  { name: 'Mon', focus: 80, dist: 12 },
  { name: 'Tue', focus: 95, dist: 5 },
  { name: 'Wed', focus: 60, dist: 25 },
  { name: 'Thu', focus: 110, dist: 8 },
  { name: 'Fri', focus: 90, dist: 15 },
];

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalFocusTimeSeconds: 0, totalDistractionAttempts: 0 });

  useEffect(() => {
    fetch('http://localhost:3000/daily-productivity?userId=user-1')
      .then(res => res.json())
      .then(data => {
        if (data.analytics) setStats(data.analytics);
      })
      .catch(e => console.error("Stats fetch failed", e));
  }, []);

  const formatHours = (seconds) => {
    return (seconds / 3600).toFixed(1) + 'h';
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-6 overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-3 mb-6">
        <ArrowLeft size={20} className="cursor-pointer text-zinc-400 hover:text-white" onClick={() => navigate('/')} />
        <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          Analytics Dashboard
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center border border-white/5">
          <Target size={24} className="text-emerald-400 mb-2" />
          <div className="text-2xl font-bold">{formatHours(stats.totalFocusTimeSeconds || 0)}</div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider">Total Focus</div>
        </div>
        <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center border border-white/5">
          <ShieldAlert size={24} className="text-red-400 mb-2" />
          <div className="text-2xl font-bold">{stats.totalDistractionAttempts || 0}</div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider">Blocked</div>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
        <Activity size={16} /> Weekly Focus Trends
      </h3>

      <div className="h-48 w-full glass-panel rounded-xl p-4 mb-4 border border-white/5">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mockData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '8px', fontSize: '12px' }}
            />
            <Line type="monotone" dataKey="focus" stroke="#3b82f6" strokeWidth={3} dot={false} animationDuration={1000} />
            <Line type="monotone" dataKey="dist" stroke="#ef4444" strokeWidth={2} dot={false} animationDuration={1000} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default Dashboard;
