import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Play, Square, Settings, BarChart2, Smartphone, Pause, CheckCircle2 } from 'lucide-react';
import MiniGame from './MiniGame';

const MOTIVATIONS = [
  "Stay focused, you're making progress.",
  "Keep going, you're in deep work mode.",
  "Distractions can wait. Your goals can't.",
  "One step at a time. You've got this.",
];

function App() {
  const navigate = useNavigate();
  const [task, setTask] = useState("");
  const [sessionActive, setSessionActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [mode, setMode] = useState("focus"); // 'focus' | 'break' | 'paused'
  
  // New State for Screen 1 Setup
  const [focusDuration, setFocusDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [gamesEnabled, setGamesEnabled] = useState(true);
  
  // New State for Screen 2 Active UI
  const [streak, setStreak] = useState(3);
  const [totalSessionTime, setTotalSessionTime] = useState(25 * 60);

  useEffect(() => {
    if (chrome && chrome.storage) {
      chrome.storage.local.get(['activeTask', 'sessionActive', 'timeLeft', 'mode', 'totalSessionTime'], (res) => {
        if (res.activeTask) setTask(res.activeTask);
        if (res.sessionActive) setSessionActive(res.sessionActive);
        if (res.timeLeft !== undefined) setTimeLeft(res.timeLeft);
        if (res.mode) setMode(res.mode);
        if (res.totalSessionTime) setTotalSessionTime(res.totalSessionTime);
      });
    }
  }, []);

  useEffect(() => {
    let interval;
    if (sessionActive && mode !== 'paused') {
      interval = setInterval(() => {
        if (chrome && chrome.storage) {
          chrome.storage.local.get(['timeLeft', 'mode'], (res) => {
            if (res.timeLeft !== undefined) setTimeLeft(res.timeLeft);
            if (res.mode !== undefined) setMode(res.mode);
          });
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [sessionActive, mode]);

  const toggleSession = async () => {
    if (!sessionActive && !task.trim()) return;
    
    const newState = !sessionActive;
    setSessionActive(newState);
    
    const initialTime = focusDuration * 60;
    const prefs = { aiEnabled, syncEnabled, gamesEnabled, breakDuration };

    if (chrome && chrome.runtime) {
      if (newState) {
        chrome.runtime.sendMessage({ 
          type: "START_SESSION", 
          task, 
          duration: initialTime,
          prefs 
        }, (response) => {
          if (response?.success) {
            console.log("Session started on backend");
            if (syncEnabled) navigate('/sync');
          }
        });
      } else {
        chrome.runtime.sendMessage({ type: "STOP_SESSION" }, (response) => {
          if (response?.success) {
            console.log("Session stopped on backend");
            setTask("");
          }
        });
      }
    }
  };

  const pauseSession = () => {
    const isPaused = mode === 'paused';
    const nextMode = isPaused ? 'focus' : 'paused';
    setMode(nextMode);
    if (chrome && chrome.storage) {
      chrome.storage.local.set({ mode: nextMode });
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = totalSessionTime > 0 ? ((totalSessionTime - timeLeft) / totalSessionTime) * 100 : 0;
  const currentMotivation = MOTIVATIONS[Math.floor((timeLeft / 60) % MOTIVATIONS.length)];

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] p-5 relative overflow-y-auto overflow-x-hidden custom-scrollbar">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent tracking-tight">
          ContextGuard
        </h1>
        <div className="flex gap-4 text-zinc-400">
          <Smartphone size={18} className="cursor-pointer hover:text-white transition-colors" onClick={() => navigate('/sync')} />
          <BarChart2 size={18} className="cursor-pointer hover:text-white transition-colors" onClick={() => navigate('/dashboard')} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!sessionActive ? (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col flex-1 pb-4"
          >
            <label className="text-sm font-medium text-white mb-2 ml-1">What are you working on?</label>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. Preparing presentation on Dijkstra’s Algorithm"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 resize-none h-24 mb-6 shadow-inner"
            />
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-2 block ml-1">Focus Duration</label>
                <div className="flex gap-2 bg-white/5 p-1 rounded-lg border border-white/5">
                  {[25, 45, 60].map(mins => (
                    <button 
                      key={mins}
                      onClick={() => setFocusDuration(mins)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${focusDuration === mins ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-2 block ml-1">Break Duration</label>
                <div className="flex gap-2 bg-white/5 p-1 rounded-lg border border-white/5">
                  {[5, 10].map(mins => (
                    <button 
                      key={mins}
                      onClick={() => setBreakDuration(mins)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${breakDuration === mins ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-6 bg-white/5 border border-white/10 rounded-xl p-4">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-zinc-300">Enable AI distraction detection</span>
                <input type="checkbox" checked={aiEnabled} onChange={(e) => setAiEnabled(e.target.checked)} className="accent-blue-500 w-4 h-4 cursor-pointer" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-zinc-300">Enable phone sync</span>
                <input type="checkbox" checked={syncEnabled} onChange={(e) => setSyncEnabled(e.target.checked)} className="accent-blue-500 w-4 h-4 cursor-pointer" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-zinc-300">Enable break mini-games</span>
                <input type="checkbox" checked={gamesEnabled} onChange={(e) => setGamesEnabled(e.target.checked)} className="accent-blue-500 w-4 h-4 cursor-pointer" />
              </label>
            </div>

            <button
              onClick={toggleSession}
              disabled={!task.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-all mt-auto shadow-lg shadow-blue-500/20 disabled:shadow-none"
            >
              <Play size={18} fill="currentColor" />
              Start Focus Session
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="active"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col flex-1 pb-4"
          >
            <div className="flex justify-between items-start mb-6 w-full">
              <div className={`text-xs font-bold tracking-wider px-3 py-1 rounded-full border ${mode === 'break' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : mode === 'paused' ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' : 'text-blue-400 bg-blue-400/10 border-blue-400/20'}`}>
                {mode === 'focus' ? 'FOCUS MODE' : mode === 'paused' ? 'PAUSED' : 'BREAK TIME'}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md border border-emerald-400/20">
                <CheckCircle2 size={12} />
                Streak: {streak}
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
              {/* Progress Ring / Timer */}
              <div className="relative w-48 h-48 flex items-center justify-center mb-6">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                  <circle cx="96" cy="96" r="88" strokeWidth="6" stroke="rgba(255,255,255,0.05)" fill="none" />
                  <circle 
                    cx="96" cy="96" r="88" 
                    strokeWidth="6" 
                    stroke={mode === 'break' ? '#10b981' : '#3b82f6'} 
                    fill="none" 
                    strokeLinecap="round"
                    strokeDasharray="553"
                    strokeDashoffset={553 - (553 * progress) / 100}
                    style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
                  />
                </svg>
                <div className={`text-5xl font-bold tracking-tighter tabular-nums ${mode === 'paused' ? 'opacity-50' : ''}`}>
                  {formatTime(timeLeft)}
                </div>
              </div>

              <div className="w-full text-center px-4 mb-2">
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Current Task</p>
                <p className="text-white text-base font-medium line-clamp-2 leading-tight">
                  {task}
                </p>
              </div>

              {mode === 'break' ? (
                <div className="mt-4 mx-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center w-full">
                  <p className="text-sm text-emerald-300">Great work! Take a short break to refresh your mind.</p>
                </div>
              ) : (
                <div className="mt-4 mx-4 bg-white/5 border border-white/10 rounded-xl p-3 text-center w-full">
                  <p className="text-sm text-blue-300/80 italic">"{currentMotivation}"</p>
                </div>
              )}
            </div>

            {mode === 'break' ? (
              <div className="grid grid-cols-1 gap-3 w-full mt-4">
                <button
                  onClick={() => { /* Open MiniGame fullscreen or overlay */ navigate('/game') }}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
                >
                  <Play size={16} fill="currentColor" />
                  Start Mini Game
                </button>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button
                    onClick={() => {
                       chrome.storage.local.set({ mode: 'focus', timeLeft: focusDuration * 60, totalSessionTime: focusDuration * 60 });
                       setMode('focus');
                       setTimeLeft(focusDuration * 60);
                    }}
                    className="bg-white/5 hover:bg-white/10 text-white text-sm font-medium py-3 rounded-xl flex items-center justify-center transition-colors border border-white/10"
                  >
                    Skip Break
                  </button>
                  <button
                    onClick={() => {
                        chrome.storage.local.set({ mode: 'focus', timeLeft: focusDuration * 60, totalSessionTime: focusDuration * 60 });
                        setMode('focus');
                        setTimeLeft(focusDuration * 60);
                    }}
                    className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-sm font-medium py-3 rounded-xl flex items-center justify-center transition-colors border border-blue-600/20"
                  >
                    Resume Focus
                  </button>
                </div>

              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mt-auto pt-6">
                <button
                  onClick={pauseSession}
                  className="bg-white/5 hover:bg-white/10 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors border border-white/10"
                >
                  {mode === 'paused' ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
                  {mode === 'paused' ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={toggleSession}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-500 font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors border border-red-500/20"
                >
                  <Square size={16} fill="currentColor" />
                  End Session
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
