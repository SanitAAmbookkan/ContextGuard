import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Home, LineChart, Settings, Activity, Clock, ShieldAlert, LogIn } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

function DashboardLayout({ children }) {
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState({ activeTask: null, timeLeft: null, mode: 'focus' });

  useEffect(() => {
    socket.on('sync-timer', (data) => {
      // data: { timeRemaining, activeTask, mode }
      setSessionData({ 
        timeLeft: data.timeRemaining, 
        activeTask: data.activeTask, 
        mode: data.mode 
      });
    });
    return () => socket.off('sync-timer');
  }, []);


  const handleLogout = () => {
    navigate('/login');
  };

  const formatTime = (seconds) => {
    if (seconds === null) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 glass-panel border-r border-white/5 flex flex-col z-20 relative">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <span className="font-bold text-xl tracking-tight text-gradient">ContextGuard</span>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2">
          <Link to="/app" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors">
            <Home className="w-5 h-5 text-blue-400" />
            <span className="font-medium">Dashboard</span>
          </Link>
          <Link to="/app/stats" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
            <LineChart className="w-5 h-5" />
            <span className="font-medium">Analytics</span>
          </Link>
          <Link to="/app/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </Link>
        </nav>
        
        <div className="p-6 mt-auto">
          <div className={`glass-panel rounded-2xl p-4 text-center border-white/10 mb-4 shadow-lg transition-transform hover:scale-[1.02] ${sessionData.mode === 'break' ? 'shadow-emerald-500/10 border-emerald-500/20' : 'shadow-blue-500/10'}`}>
            <p className="text-sm text-gray-400 mb-2 flex items-center justify-center gap-2"><Clock className="w-4 h-4"/> Live Session {sessionData.mode === 'break' ? '(Break)' : ''}</p>
            <div className={`text-3xl font-bold font-mono ${sessionData.mode === 'break' ? 'text-emerald-400' : 'text-gradient'}`}>{formatTime(sessionData.timeLeft)}</div>
            <p className="text-xs text-blue-400 mt-2 truncate" title={sessionData.activeTask || "No active task"}>{sessionData.activeTask || "Waiting for extension..."}</p>
          </div>
          <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative z-10 p-10 h-full max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

const mockData = [
  { day: 'Mon', focus: 150, distractions: 25 },
  { day: 'Tue', focus: 220, distractions: 12 },
  { day: 'Wed', focus: 110, distractions: 34 },
  { day: 'Thu', focus: 260, distractions: 8 },
  { day: 'Fri', focus: 240, distractions: 14 },
  { day: 'Sat', focus: 45, distractions: 5 },
  { day: 'Sun', focus: 30, distractions: 2 },
];

function DashboardHome() {
  const [stats, setStats] = useState({ totalFocusTimeSeconds: 0, totalDistractionAttempts: 0, averageFocusScore: 100 });
  const [chartData, setChartData] = useState(mockData);

  useEffect(() => {
    const fetchSessionStats = async () => {
      try {
        const res = await fetch('http://localhost:3000/daily-productivity?userId=user-1');
        const data = await res.json();
        if (data.analytics) {
          setStats(data.analytics);
        }
      } catch (e) {
        console.error("Failed to fetch analytics", e);
      }
    };
    fetchSessionStats();
  }, []);

  const formatFocusTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="h-full flex flex-col animate-[cgFadeInUp_0.4s_ease-out_forwards]">
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">AI Focus Guardian</h1>
          <p className="text-gray-400 text-lg">Your productivity and semantic distraction analytics.</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-2 text-sm text-blue-300 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          ContextGuard Extension Sync Active
        </div>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-panel p-6 rounded-3xl border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500"></div>
          <h3 className="text-gray-400 font-medium mb-1">Total Deep Work Today</h3>
          <div className="text-5xl font-bold tracking-tight">{formatFocusTime(stats.totalFocusTimeSeconds || 0)}</div>
          <p className="text-sm text-gray-500 mt-2 text-right">Pomodoro Focus Time</p>
        </div>
        <div className="glass-panel p-6 rounded-3xl border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500"></div>
          <h3 className="text-gray-400 font-medium mb-1 flex items-center gap-2"><ShieldAlert className="w-4 h-4"/> AI Blocks Executed</h3>
          <div className="text-5xl font-bold text-purple-400 tracking-tight">{stats.totalDistractionAttempts || 0}</div>
          <p className="text-sm text-gray-500 mt-2 text-right">Including YouTube Shorts</p>
        </div>
        <div className="glass-panel p-6 rounded-3xl border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500"></div>
          <h3 className="text-gray-400 font-medium mb-1">Focus Score</h3>
          <div className="text-5xl font-bold text-emerald-400 tracking-tight">{stats.averageFocusScore || 0}%</div>
          <p className="text-sm text-gray-500 mt-2 text-right">Keep it high!</p>
        </div>
      </div>

      
      <div className="flex-1 glass-panel rounded-3xl border-white/5 p-8 flex flex-col min-h-[400px]">
        <h3 className="text-xl font-bold mb-6">Semantic Distraction Trend</h3>
        <div className="flex-1 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorDistract" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="#4b5563" tick={{fill: '#9ca3af'}} axisLine={false} tickLine={false} />
              <YAxis stroke="#4b5563" tick={{fill: '#9ca3af'}} axisLine={false} tickLine={false} />
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111827', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                itemStyle={{ color: '#e5e7eb' }}
                formatter={(value, name) => [value + ' mins', name === 'focus' ? 'Deep Work' : 'Blocked Distractions']}
              />
              <Area type="monotone" dataKey="focus" name="focus" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorFocus)" />
              <Area type="monotone" dataKey="distractions" name="distractions" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorDistract)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function AuthView() {
  const navigate = useNavigate();
  const handleLogin = (e) => {
    e.preventDefault();
    navigate('/app');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[150px] pointer-events-none" />
      
      <div className="glass-panel p-10 rounded-3xl border-white/10 w-full max-w-md relative z-10 animate-[cgFadeInUp_0.4s_ease-out_forwards]">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30 mb-8 mx-auto">
          <Activity className="w-8 h-8 text-blue-400" />
        </div>
        <h2 className="text-3xl font-bold text-center mb-2 tracking-tight">ContextGuard</h2>
        <p className="text-gray-400 text-center mb-8">Sign in to sync your semantic AI distraction preferences across all devices.</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
            <input type="email" placeholder="you@example.com" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
            <input type="password" placeholder="••••••••" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors mt-4 flex items-center justify-center gap-2">
            <LogIn className="w-5 h-5" /> Launch Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<AuthView />} />
        <Route path="/" element={<AuthView />} />
        <Route path="/app/*" element={
          <DashboardLayout>
            <Routes>
              <Route path="/" element={<DashboardHome />} />
              <Route path="/stats" element={<div className="text-2xl font-bold">Analytics View (Detailed) coming soon...</div>} />
              <Route path="/settings" element={<div className="text-2xl font-bold">Settings Panel coming soon...</div>} />
            </Routes>
          </DashboardLayout>
        } />
      </Routes>
    </Router>
  );
}

export default App;
