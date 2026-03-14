import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { RefreshCcw, Square, ArrowLeft } from 'lucide-react';

function MiniGame() {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState('idle'); // idle, waiting, click, result
  const [startTime, setStartTime] = useState(0);
  const [reactionTime, setReactionTime] = useState(null);
  const [highScore, setHighScore] = useState(
    parseInt(localStorage.getItem('cg_highscore')) || null
  );

  useEffect(() => {
    let timeout;
    if (gameState === 'waiting') {
      const waitTime = Math.random() * 3000 + 1000;
      timeout = setTimeout(() => {
        setGameState('click');
        setStartTime(Date.now());
      }, waitTime);
    }
    return () => clearTimeout(timeout);
  }, [gameState]);

  const handleClick = () => {
    if (gameState === 'idle' || gameState === 'result') {
      setGameState('waiting');
    } else if (gameState === 'waiting') {
      setGameState('idle');
      alert("Too early! Wait for green.");
      setReactionTime("Fail");
    } else if (gameState === 'click') {
      const time = Date.now() - startTime;
      setReactionTime(time);
      setGameState('result');
      if (!highScore || time < highScore) {
        setHighScore(time);
        localStorage.setItem('cg_highscore', time.toString());
      }
    }
  };

  const endSession = async () => {
    if (chrome && chrome.storage) {
      chrome.storage.local.set({ sessionActive: false, mode: 'focus', timeLeft: 0 });
    }
    try {
      await fetch('http://localhost:3000/end-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'session-id-mock' })
      });
    } catch (e) {}
    navigate('/');
  };

  const returnToFocus = () => {
    if (chrome && chrome.storage) {
       chrome.storage.local.get(['prefs'], (res) => {
         const focusTime = (res.prefs?.focusDuration || 25) * 60;
         chrome.storage.local.set({ mode: 'focus', timeLeft: focusTime, totalSessionTime: focusTime });
         navigate('/');
       });
    } else {
       navigate('/');
    }
  };

  let bgClass = "bg-zinc-800";
  let text = "Click to Start";
  
  if (gameState === 'waiting') {
    bgClass = "bg-red-500/80";
    text = "Wait for Green...";
  } else if (gameState === 'click') {
    bgClass = "bg-emerald-500";
    text = "CLICK NOW!";
  } else if (gameState === 'result') {
    bgClass = "bg-blue-500/80";
    text = `${reactionTime} ms`;
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] p-5 relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-lg font-bold text-white tracking-tight">
          Break Time Game
        </h1>
        {highScore && (
           <div className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
             Top Score: {highScore}ms
           </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <p className="text-zinc-400 text-center text-sm mb-6">
          Test your reaction speed. Click when the box turns green.
        </p>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleClick}
          className={`w-full aspect-square max-h-64 rounded-3xl flex items-center justify-center transition-colors border shadow-2xl ${bgClass} ${
            gameState === 'click' ? 'border-emerald-400' : 'border-white/10'
          }`}
        >
          <span className="text-2xl font-bold text-white tracking-widest">{text}</span>
        </motion.button>
        
        <div className="h-6 mt-4 text-center">
          {gameState === 'result' && typeof reactionTime === 'number' && (
            <span className="text-sm font-medium text-zinc-300">
              {reactionTime < 250 ? '⚡ Lightning fast!' : reactionTime < 400 ? '👍 Good speed' : '🐢 Too slow'}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 mt-auto pt-4">
         <button
            onClick={() => {
              setGameState('waiting');
              setReactionTime(null);
            }}
            className="bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors border border-white/5"
          >
            <RefreshCcw size={16} />
            Restart Game
          </button>
          
         <div className="grid grid-cols-2 gap-3 mt-1">
            <button
               onClick={returnToFocus}
               className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-blue-500/50"
             >
               <ArrowLeft size={16} />
               Focus Mode
             </button>
             <button
               onClick={endSession}
               className="bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-medium py-3 rounded-xl flex items-center justify-center transition-colors border border-red-500/20"
             >
               <Square size={16} />
               End Session
             </button>
         </div>
      </div>
    </div>
  );
}

export default MiniGame;
