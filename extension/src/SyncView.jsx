import { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Smartphone, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import QRCode from "react-qr-code";

function SyncView() {
  const navigate = useNavigate();
  const [syncToken, setSyncToken] = useState("");
  const [task, setTask] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);

  const fetchToken = () => {
    fetch('http://localhost:3000/generate-sync-qr', { method: "POST" })
      .then(res => res.json())
      .then(data => setSyncToken(data.syncToken))
      .catch(err => console.error("Sync generation error", err));
  };

  useEffect(() => {
    fetchToken();
    if (chrome && chrome.storage) {
      chrome.storage.local.get(['activeTask', 'timeLeft'], (res) => {
        if (res.activeTask) setTask(res.activeTask);
        if (res.timeLeft !== undefined) setTimeLeft(res.timeLeft);
      });
    }
    
    const interval = setInterval(() => {
        if (chrome && chrome.storage) {
            chrome.storage.local.get(['timeLeft'], (res) => {
                if (res.timeLeft !== undefined) setTimeLeft(res.timeLeft);
            });
        }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const syncUrl = `http://localhost:5173/sync?token=${syncToken}`;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] p-5 relative overflow-y-auto">
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <ArrowLeft size={20} className="cursor-pointer text-zinc-400 hover:text-white transition-colors" onClick={() => navigate('/')} />
        <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent tracking-tight">
          Device Sync
        </h2>
      </div>

      <div className="flex-1 flex flex-col items-center">
        <p className="text-zinc-300 text-sm text-center mb-6 leading-relaxed">
          Scan this code using your phone to sync your focus session.
        </p>
        
        <div className="bg-white p-3 rounded-2xl mb-6 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
          {syncToken ? (
            <QRCode value={syncUrl} size={160} level="H" />
          ) : (
            <div className="w-[160px] h-[160px] bg-zinc-200 animate-pulse rounded-lg" />
          )}
        </div>

        {/* Mini Phone Preview */}
        <div className="w-48 bg-black border-[4px] border-zinc-800 rounded-[2rem] p-4 relative mb-6 shadow-xl">
           <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mb-3" />
           <div className="flex flex-col items-center">
             <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md mb-2">FOCUSING</span>
             <span className="text-3xl font-bold tracking-tight text-white mb-2">{formatTime(timeLeft)}</span>
             <p className="text-[10px] text-zinc-400 text-center line-clamp-2 leading-snug">{task || "Waiting for task..."}</p>
           </div>
        </div>

        <div className="w-full grid grid-cols-2 gap-3 mt-auto pt-4">
           <button
             onClick={fetchToken}
             className="bg-white/5 hover:bg-white/10 text-white text-sm font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors border border-white/10"
           >
             <RefreshCw size={14} />
             New QR
           </button>
           <button
             onClick={() => navigate('/')}
             className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-sm font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors border border-blue-500/30"
           >
             <X size={14} />
             Skip Sync
           </button>
        </div>
      </div>
    </div>
  );
}

export default SyncView;
