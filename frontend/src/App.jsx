import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const QUESTIONS = [
  { id: 'sleep_hours', label: "How many hours did you sleep last night?", min: 0, max: 12, step: 1, defaultValue: 6, getHumor: (v) => v <= 3 ? "Bro..." : v <= 5 ? "We need to talk." : v <= 7 ? "Respectable." : "WHO ARE YOU?" },
  { id: 'screen_time', label: "Daily screen time? (Be honest)", min: 0, max: 16, step: 1, defaultValue: 5, getHumor: (v) => v <= 3 ? "Touch grass champion 🌱" : v <= 6 ? "Average scroller." : v <= 10 ? "Your brain is frying." : "Do you even blink?" },
  { id: 'attendance', label: "Current attendance percentage?", min: 0, max: 100, step: 5, defaultValue: 75, getHumor: (v) => v <= 40 ? "Do you even go here?" : v <= 60 ? "Living on the edge." : v <= 80 ? "Playing it safe." : "Nerd. (Respectfully)" },
  { id: 'assignments', label: "How many assignments are pending?", min: 0, max: 15, step: 1, defaultValue: 3, getHumor: (v) => v === 0 ? "Suspiciously responsible." : v <= 3 ? "Manageable." : v <= 7 ? "The pile is growing..." : "You are negotiating with destiny." }
];

const ALL_BADGES = [
  { id: 'First Cook', icon: '🔥', desc: 'Complete your first CookedAI test.' },
  { id: 'Touch Grass', icon: '🌱', desc: 'Log 3 hours or less of screen time.' },
  { id: 'Sleep Survivor', icon: '🌙', desc: 'Survive on 3 hours or less of sleep.' },
  { id: 'Academic Weapon', icon: '🧠', desc: '0 assignments pending and 90%+ attendance.' }
];

const LOADING_MESSAGES = [
  "Analyzing your life choices...",
  "Checking your sleep schedule...",
  "Inspecting your screen time...",
  "Calculating academic damage...",
  "Consulting the professor...",
  "Running highly questionable mathematics..."
];

function getCookedData(score) {
  if (score <= 20) return { category: "🥗 FRESH", text: "Suspiciously responsible.", personality: "The Surprisingly Responsible One", color: "text-green-400", bg: "from-green-500/20" };
  if (score <= 40) return { category: "🍳 SLIGHTLY TOASTED", text: "Questionable decisions.", personality: "The Weekend Warrior", color: "text-yellow-400", bg: "from-yellow-500/20" };
  if (score <= 60) return { category: "🔥 GETTING COOKED", text: "The situation is developing.", personality: "The Chaos Student", color: "text-orange-400", bg: "from-orange-500/20" };
  if (score <= 80) return { category: "🍗 WELL DONE", text: "Academic recovery difficult.", personality: "The Professional Procrastinator", color: "text-orange-600", bg: "from-orange-600/20" };
  if (score <= 95) return { category: "💀 ABSOLUTELY COOKED", text: "Negotiating with destiny.", personality: "The Last-Minute Warrior", color: "text-red-500", bg: "from-red-500/20" };
  return { category: "☢️ BEYOND SAVING", text: "Contact your future self.", personality: "The Sleep-Deprived Zombie", color: "text-red-700", bg: "from-red-700/20" };
}

function App() {
  const [currentView, setCurrentView] = useState('landing'); 
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [finalScore, setFinalScore] = useState(0);
  const [cookedData, setCookedData] = useState(null);
  
  // Custom User Details
  const [nickname, setNickname] = useState('');
  const [studentCode, setStudentCode] = useState('BWU/BTA/23/456');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [roomCode, setRoomCode] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  
  const idCardRef = useRef(null);

  const [xp, setXp] = useState(() => Number(localStorage.getItem('cooked_xp')) || 0);
  const [badges, setBadges] = useState(() => JSON.parse(localStorage.getItem('cooked_badges')) || []);
  const currentLevel = Math.floor(xp / 100) + 1;
  const xpProgress = xp % 100;

  const [error, setError] = useState(null);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  
  const [generatedContent, setGeneratedContent] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    let interval;
    if (currentView === 'leaderboard' && roomCode) {
      const fetchLeaderboard = async () => {
        try {
          const res = await fetch(`${API_URL}/api/rooms/${roomCode}`);
          const data = await res.json();
          if (data.players) setLeaderboardData(data.players);
        } catch (e) {}
      };
      fetchLeaderboard();
      interval = setInterval(fetchLeaderboard, 3000);
    }
    return () => clearInterval(interval);
  }, [currentView, roomCode]);

  useEffect(() => {
    let interval;
    if (currentView === 'calculating') {
      interval = setInterval(() => {
        setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 700);
    }
    return () => clearInterval(interval);
  }, [currentView]);

  const processAchievements = (payload) => {
    let earnedXP = xp + 50;
    let newBadges = [...badges];
    if (!newBadges.includes('First Cook')) newBadges.push('First Cook');
    if (payload.screen_time <= 3 && !newBadges.includes('Touch Grass')) newBadges.push('Touch Grass');
    if (payload.sleep_hours <= 3 && !newBadges.includes('Sleep Survivor')) newBadges.push('Sleep Survivor');
    if (payload.assignments === 0 && payload.attendance >= 90 && !newBadges.includes('Academic Weapon')) newBadges.push('Academic Weapon');
    setXp(earnedXP); setBadges(newBadges);
    localStorage.setItem('cooked_xp', earnedXP); localStorage.setItem('cooked_badges', JSON.stringify(newBadges));
  };

  const handleNext = async () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setCurrentView('calculating');
      setError(null);
      try {
        const payload = {
          sleep_hours: answers.sleep_hours ?? 6, screen_time: answers.screen_time ?? 5,
          attendance: answers.attendance ?? 75, assignments: answers.assignments ?? 3
        };
        processAchievements(payload);

        const response = await fetch(`${API_URL}/api/predict`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error("Server rejected request");
        
        const data = await response.json();
        setFinalScore(data.cooked_score);
        const cData = getCookedData(data.cooked_score);
        setCookedData(cData);

        if (roomCode && nickname) {
          await fetch(`${API_URL}/api/rooms/${roomCode}/join`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nickname: nickname, score: data.cooked_score, category: cData.category })
          });
        }
        setTimeout(() => setCurrentView('results'), 3500);
      } catch (err) {
        setError("Failed to reach the AI Backend. Please ensure your Python server is running.");
        setCurrentView('landing');
      }
    }
  };

  const fetchContent = async (action) => {
    setIsGenerating(true);
    setGeneratedContent(null);
    try {
      const response = await fetch(`${API_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: action,
          score: finalScore,
          screen_time: answers.screen_time ?? 5,
          assignments: answers.assignments ?? 3
        })
      });
      const data = await response.json();
      setGeneratedContent(data);
    } catch (e) {
      setGeneratedContent({ title: "Error", text: "AI is too tired to roast you right now." });
    }
    setIsGenerating(false);
  };

  const handleAnswerChange = (questionId, value) => setAnswers(prev => ({ ...prev, [questionId]: Number(value) }));
  const handleBack = () => currentStep > 0 ? setCurrentStep(prev => prev - 1) : setCurrentView('landing');
  const handleRestart = () => { setAnswers({}); setCurrentStep(0); setGeneratedContent(null); setCurrentView('landing'); };
  const handleStart = () => { setRoomCode(null); setError(null); setCurrentView('quiz'); };
  
  const handleCreateRoom = async () => { 
    if (!nickname) { setError("Nickname is required!"); return; }
    try {
      const res = await fetch(`${API_URL}/api/rooms/create`, { method: "POST" }); 
      const data = await res.json(); 
      setRoomCode(data.room_code); setCurrentView('quiz'); setError(null);
    } catch(e) { setError("Failed to connect to multiplayer server."); }
  };
  
  const handleJoinRoom = () => { 
    if (!nickname || !joinCodeInput) { setError("Nickname and Code are required!"); return; }
    setRoomCode(joinCodeInput.toUpperCase()); setCurrentView('quiz'); setError(null);
  };

  // --- FIXED DOWNLOAD FUNCTION WITH HTML2CANVAS OPTIONS ---
  const handleDownload = async () => { 
    if (!idCardRef.current) return; 
    try {
      const canvas = await html2canvas(idCardRef.current, { 
        backgroundColor: '#0f172a', 
        scale: 2,
        useCORS: true,
        allowTaint: true
      }); 
      const fakeLink = document.createElement("a"); 
      fakeLink.download = `Cooked_ID_${finalScore}.png`; 
      fakeLink.href = canvas.toDataURL("image/png", 1.0); 
      fakeLink.click(); 
    } catch (err) {
      alert("Download failed. Try taking a screenshot instead!");
    }
  };

  // --- VIEWS ---

  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        {error && (
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-red-500/20 border border-red-500 text-red-100 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md animate-bounce z-50">
            ⚠️ {error}
          </div>
        )}
        <h1 className="text-6xl md:text-8xl font-black mb-2 bg-gradient-to-r from-orange-400 via-red-500 to-purple-500 text-transparent bg-clip-text mt-8">CookedAI</h1>
        <p className="text-xl md:text-2xl text-slate-400 mb-8 font-medium">Find out before your professor does.</p>
        
        {/* User Details Setup Card */}
        <div className="w-full max-w-md bg-slate-900 border border-slate-700 p-6 rounded-3xl shadow-xl mb-6 text-left">
          <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Your Name / Nickname</label>
          <input 
            type="text" maxLength="15" value={nickname} onChange={(e) => setNickname(e.target.value)} 
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 mb-4 text-white focus:outline-none focus:border-orange-500" 
            placeholder="e.g. Tanuj Saha" 
          />
          
          <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Student Code</label>
          <input 
            type="text" value={studentCode} onChange={(e) => setStudentCode(e.target.value)} 
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-orange-500" 
            placeholder="BWU/BTA/23/456" 
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8 w-full max-w-md">
          <button onClick={handleStart} className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 font-bold rounded-2xl text-lg shadow-[0_0_30px_rgba(249,115,22,0.4)] transform hover:scale-105 transition-all">🔥 SOLO</button>
          <button onClick={() => setCurrentView('multiplayer_setup')} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 font-bold rounded-2xl text-lg border border-slate-600 transform hover:scale-105 transition-all">👥 BATTLE</button>
        </div>

        <button onClick={() => setCurrentView('achievements')} className="flex items-center gap-3 bg-slate-900 border border-slate-700 px-6 py-3 rounded-full hover:bg-slate-800 transition-colors">
          <span className="bg-orange-500 text-white font-black px-2 py-1 rounded text-sm">LVL {currentLevel}</span>
          <span className="font-bold text-slate-300">My Stats & Badges</span><span className="text-slate-500">→</span>
        </button>
      </div>
    );
  }

  if (currentView === 'calculating') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="relative flex items-center justify-center mb-8">
          <div className="absolute w-24 h-24 border-4 border-slate-800 rounded-full"></div>
          <div className="w-24 h-24 border-4 border-transparent border-t-orange-500 border-r-purple-500 rounded-full animate-spin"></div>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-purple-400 mb-4 h-10 transition-all duration-300">
          {LOADING_MESSAGES[loadingMsgIdx]}
        </h2>
        <p className="text-slate-500 font-mono text-sm animate-pulse">Running Random Forest ML Regressor...</p>
      </div>
    );
  }

  if (currentView === 'achievements') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center py-12 p-6">
        <div className="w-full max-w-lg bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl">
          <h2 className="text-3xl font-black mb-8">Player Profile</h2>
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-8">
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-sm text-slate-400 font-bold uppercase">Current Level</p>
                <p className="text-4xl font-black text-orange-500">Level {currentLevel}</p>
              </div>
              <p className="text-slate-400 font-mono text-sm">{xpProgress} / 100 XP</p>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-3">
              <div className="bg-orange-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${xpProgress}%` }}></div>
            </div>
          </div>
          <h3 className="text-xl font-bold mb-4 text-slate-300">Unlocked Badges ({badges.length}/{ALL_BADGES.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {ALL_BADGES.map((badge) => {
              const isUnlocked = badges.includes(badge.id);
              return (
                <div key={badge.id} className={`p-4 rounded-2xl border ${isUnlocked ? 'bg-orange-500/10 border-orange-500/50' : 'bg-slate-950 border-slate-800 opacity-50 grayscale'}`}>
                  <div className="text-3xl mb-2">{isUnlocked ? badge.icon : '🔒'}</div>
                  <p className="font-bold text-white mb-1">{badge.id}</p>
                  <p className="text-xs text-slate-400">{badge.desc}</p>
                </div>
              );
            })}
          </div>
          <button onClick={() => setCurrentView('landing')} className="w-full py-4 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl transition-all border border-slate-600">
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (currentView === 'multiplayer_setup') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        {error && <div className="mb-4 text-red-400 bg-red-400/10 p-3 rounded-xl border border-red-400/50 text-sm font-bold w-full max-w-md text-center">{error}</div>}
        <div className="w-full max-w-md bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl">
          <h2 className="text-3xl font-black text-center mb-8">Join the Lobby</h2>
          
          <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Your Nickname</label>
          <input type="text" maxLength="12" value={nickname} onChange={(e) => setNickname(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 mb-4 text-white focus:outline-none focus:border-orange-500" placeholder="e.g. Tanuj" />
          
          <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Student Code</label>
          <input type="text" value={studentCode} onChange={(e) => setStudentCode(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 mb-6 text-white font-mono focus:outline-none focus:border-orange-500" placeholder="BWU/BTA/23/456" />

          <button onClick={handleCreateRoom} className="w-full py-4 bg-orange-500 hover:bg-orange-600 font-bold rounded-xl mb-6 shadow-lg text-lg transition-all">✨ CREATE NEW ROOM</button>
          <div className="flex items-center gap-4 mb-6 text-slate-500"><div className="flex-1 h-px bg-slate-700"></div><span>OR</span><div className="flex-1 h-px bg-slate-700"></div></div>
          <div className="flex gap-2 mb-6">
            <input type="text" maxLength="4" value={joinCodeInput} onChange={(e) => setJoinCodeInput(e.target.value)} className="w-1/2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white uppercase text-center font-mono focus:outline-none focus:border-orange-500" placeholder="CODE" />
            <button onClick={handleJoinRoom} className="w-1/2 py-3 bg-slate-700 hover:bg-slate-600 font-bold rounded-xl transition-all">JOIN</button>
          </div>
          <button onClick={() => {setCurrentView('landing'); setError(null);}} className="text-slate-500 hover:text-white w-full text-center">Cancel</button>
        </div>
      </div>
    );
  }

  if (currentView === 'leaderboard') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center py-12 p-6">
        <div className="w-full max-w-lg bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-black">🏆 Leaderboard</h2>
            <div className="bg-slate-800 px-3 py-1 rounded-lg font-mono text-orange-400 font-bold tracking-widest border border-slate-700">ROOM: {roomCode}</div>
          </div>
          <div className="flex flex-col gap-4 mb-8">
            {leaderboardData.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Waiting for players to finish...</p>
            ) : (
              leaderboardData.map((player, index) => (
                <div key={index} className={`flex items-center justify-between p-4 rounded-xl border ${index === 0 ? 'bg-orange-500/10 border-orange-500/50' : 'bg-slate-800 border-slate-700'}`}>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-black text-slate-500">#{index + 1}</span>
                    <div>
                      <p className="font-bold text-lg">{player.nickname}</p>
                      <p className="text-xs text-slate-400">{player.category}</p>
                    </div>
                  </div>
                  <div className="text-3xl font-black text-white">{player.score}<span className="text-lg text-slate-500">%</span></div>
                </div>
              ))
            )}
          </div>
          <button onClick={() => setCurrentView('results')} className="w-full py-4 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl transition-all">← Back to My Results</button>
        </div>
      </div>
    );
  }

  if (currentView === 'results' && cookedData) {
    const touchGrassScore = Math.max(0, Math.round(100 - ((answers.screen_time ?? 5) * 6)));
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center py-12 px-4 overflow-y-auto">
        {roomCode && (
          <button onClick={() => setCurrentView('leaderboard')} className="mb-6 w-full max-w-[360px] py-4 bg-gradient-to-r from-orange-500 to-purple-600 font-black rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.4)] animate-pulse">
            🏆 VIEW ROOM LEADERBOARD
          </button>
        )}
        <div ref={idCardRef} className={`w-[360px] h-[640px] bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 flex flex-col relative overflow-hidden mb-8`}>
          <div className={`absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br ${cookedData.bg} to-transparent rounded-full blur-3xl`}></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-tr from-purple-600/20 to-transparent rounded-full blur-3xl"></div>
          <div className="flex justify-between items-start mb-6 z-10">
            <div>
              <p className="text-[10px] text-slate-400 font-mono tracking-widest">OFFICIAL REPORT</p>
              <h2 className="font-black text-xl tracking-tight text-white">{nickname ? nickname.toUpperCase() : 'COOKED'} ID</h2>
            </div>
            <div className="bg-slate-800/80 px-2 py-1 rounded text-xs font-mono text-slate-400 border border-slate-700">
              #{studentCode}
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center z-10 mb-6">
            <div className={`text-9xl font-black tracking-tighter ${cookedData.color} drop-shadow-2xl`}>{finalScore}</div>
            <p className="text-2xl font-bold text-slate-500 -mt-2">%</p>
          </div>
          <div className="z-10 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50 backdrop-blur-sm mb-4">
            <h3 className={`font-black text-xl mb-1 ${cookedData.color}`}>{cookedData.category}</h3>
            <p className="text-sm text-slate-300 font-medium mb-3">"{cookedData.text}"</p>
            <div className="h-px w-full bg-slate-700/50 mb-3"></div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Personality</p>
            <p className="text-sm font-bold text-white">{cookedData.personality}</p>
          </div>
          <div className="z-10 flex justify-between items-center text-xs font-mono text-slate-400">
            <div>GRASS: {touchGrassScore}/100</div>
            <div>CookedAI</div>
          </div>
        </div>
        
        <div className="w-full max-w-[360px] flex flex-col gap-3">
          <button onClick={handleDownload} className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all">📸 DOWNLOAD ID CARD</button>
          
          <div className="flex gap-3">
            <button onClick={() => fetchContent('roast')} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl border border-slate-600 text-red-400">🔥 ROAST</button>
            <button onClick={() => fetchContent('save')} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl border border-slate-600 text-blue-400">🆘 SAVE</button>
          </div>

          {(isGenerating || generatedContent) && (
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-700 text-left mt-2">
              {isGenerating ? (
                <div className="flex items-center gap-3 text-slate-400 font-mono text-sm animate-pulse">
                  <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  Generating...
                </div>
              ) : (
                <div>
                  <h3 className="font-black text-white mb-2">{generatedContent.title}</h3>
                  <p className="text-slate-300 font-mono text-sm leading-relaxed whitespace-pre-line">{generatedContent.text}</p>
                </div>
              )}
            </div>
          )}

          <button onClick={handleRestart} className="mt-2 py-3 w-full text-slate-400 hover:text-white font-bold">↺ Retake the Test</button>
        </div>
      </div>
    );
  }

  const question = QUESTIONS[currentStep];
  const currentValue = answers[question.id] !== undefined ? answers[question.id] : question.defaultValue;
  const progressPercentage = ((currentStep + 1) / QUESTIONS.length) * 100;
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl">
        <div className="w-full bg-slate-800 rounded-full h-2 mb-6"><div className="bg-orange-500 h-2 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }}></div></div>
        <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center leading-tight">{question.label}</h2>
        <div className="text-6xl md:text-7xl font-extrabold text-orange-400 text-center mb-4 transition-all duration-200 ease-in-out">{currentValue}</div>
        <p className="text-center text-slate-400 mb-8 italic h-6">"{question.getHumor(currentValue)}"</p>
        <input 
          type="range" min={question.min} max={question.max} step={question.step} value={currentValue} 
          aria-label={question.label}
          onChange={(e) => handleAnswerChange(question.id, e.target.value)} 
          className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500 mb-10 hover:bg-slate-600 transition-colors" 
        />
        <div className="flex justify-between mt-6">
          <button onClick={handleBack} className="px-4 py-2 text-slate-400 hover:text-white font-semibold transition-colors">← Back</button>
          <button onClick={handleNext} className="px-8 py-3 bg-white text-slate-900 font-bold rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-white/20">
            {currentStep === QUESTIONS.length - 1 ? 'Calculate 💀' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;