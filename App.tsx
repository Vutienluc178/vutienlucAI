import React, { useState, useRef, useEffect } from 'react';
import Board from './components/Board';
import Toolbar from './components/Toolbar';
import { ToolType, DrawingSettings } from './types';
import { 
  X, Dices, Loader2, List, Hash, Trophy, Save, Keyboard, Command, 
  Feather, Box, MonitorUp, Globe, Link as LinkIcon, ExternalLink, 
  RotateCw, Search, BookOpen, Youtube, ArrowLeft, ArrowRight, Home
} from 'lucide-react';
// @ts-ignore
import confetti from 'canvas-confetti';

interface SavedClass {
  name: string;
  students: string[];
}

// Educational sites that are known to allow embedding
const QUICK_LINKS = [
  { name: 'Google Tìm kiếm', url: 'https://www.google.com/webhp?igu=1' }, 
  { name: 'YouTube (Video)', url: 'https://www.youtube.com/embed?listType=search&list=Bai+giang+hay' },
  { name: 'Wikipedia (TV)', url: 'https://vi.wikipedia.org' },
  { name: 'Desmos (Đồ thị)', url: 'https://www.desmos.com/calculator?lang=vi' },
  { name: 'GeoGebra Classic', url: 'https://www.geogebra.org/classic' },
  { name: 'PhET (Mô phỏng)', url: 'https://phet.colorado.edu/vi/' },
  { name: 'Hoc247', url: 'https://hoc247.net' },
  { name: 'Bing Search', url: 'https://www.bing.com' } // Bing allows embedding often
];

function App() {
  const [currentTool, setCurrentTool] = useState<ToolType>('pen');
  const [settings, setSettings] = useState<DrawingSettings>({
    color: '#FFFFFF',
    width: 4,
    opacity: 1,
    fontSize: 32 // Default 1x size
  });
  const [clearTrigger, setClearTrigger] = useState(0);
  const [undoTrigger, setUndoTrigger] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [boardColor, setBoardColor] = useState('#0f172a'); // Default Slate-900
  const [showGrid, setShowGrid] = useState(false); 
  
  // Loading Intro State
  const [isLoading, setIsLoading] = useState(true);
  
  // --- RANDOM PICKER STATE ---
  const [showRandomPicker, setShowRandomPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'number' | 'list'>('list');
  
  // --- HELP MODAL STATE ---
  const [showHelp, setShowHelp] = useState(false);

  // --- BROWSER STATE ---
  const [showWebModal, setShowWebModal] = useState(false);
  const [activeWebUrl, setActiveWebUrl] = useState<string | null>(null);
  const [browserUrlInput, setBrowserUrlInput] = useState(''); 
  const [modalUrlInput, setModalUrlInput] = useState('');
  const [iframeKey, setIframeKey] = useState(0); 
  const [ytSearchTerm, setYtSearchTerm] = useState('');
  
  // Browser History
  const [browserHistory, setBrowserHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Number Mode
  const [classSize, setClassSize] = useState(40);
  
  // List Mode & Saved Classes
  const [rawListInput, setRawListInput] = useState('');
  const [studentList, setStudentList] = useState<string[]>([]);
  const [savedClasses, setSavedClasses] = useState<SavedClass[]>([]);
  const [isSavingClass, setIsSavingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  
  // Animation State
  const [pickedResult, setPickedResult] = useState<string | number | null>(null);
  const [displayResult, setDisplayResult] = useState<string | number>('?');
  const [isSpinning, setIsSpinning] = useState(false);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Intro Effect with Sound
  useEffect(() => {
    // Attempt to play startup sound
    const playStartupSound = () => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const now = ctx.currentTime;

        // Create a "futuristic swell" chord (C Major expanded)
        // Frequencies: C3, G3, C4, G4, C5
        const freqs = [130.81, 196.00, 261.63, 392.00, 523.25]; 
        
        freqs.forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = i % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(f, now);
          
          // Envelope: Attack (Fade In) -> Sustain -> Decay (Fade Out)
          gain.gain.setValueAtTime(0, now);
          // Swell in over 0.5s
          gain.gain.linearRampToValueAtTime(0.1 - (i * 0.015), now + 0.5); 
          // Fade out slowly
          gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5); 
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(now);
          osc.stop(now + 2.5);
        });
        
        // Add a deep bass rumble
        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(65.41, now); // C2
        bassGain.gain.setValueAtTime(0, now);
        bassGain.gain.linearRampToValueAtTime(0.05, now + 0.5);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
        
        // Lowpass filter to muffle the saw wave
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        
        bassOsc.connect(filter);
        filter.connect(bassGain);
        bassGain.connect(ctx.destination);
        
        bassOsc.start(now);
        bassOsc.stop(now + 2.0);

      } catch (e) { 
        console.error("Audio autoplay blocked by browser policy", e); 
      }
    };

    playStartupSound();

    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); 
    return () => clearTimeout(timer);
  }, []);

  // Load Saved Classes
  useEffect(() => {
    const saved = localStorage.getItem('GB_SAVED_CLASSES');
    if (saved) {
      try {
        setSavedClasses(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved classes");
      }
    }
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowRandomPicker(false);
        setIsSavingClass(false);
        setShowHelp(false);
        setShowWebModal(false);
      }
      if (e.key.toLowerCase() === 'f' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        toggleFullscreen();
      }
      if (e.altKey) {
         switch(e.key.toLowerCase()) {
            case 'p': setCurrentTool('pen'); break;
            case 'r': setShowRandomPicker(prev => !prev); break;
            case 's': toggleScreenShare(); break;
            case 'i': fileInputRef.current?.click(); break;
            default: break;
         }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Parse List
  useEffect(() => {
    if (rawListInput.trim()) {
      const list = rawListInput.split(/[\n,;]+/).map(s => s.trim()).filter(s => s.length > 0);
      setStudentList(list);
    } else {
      setStudentList([]);
    }
  }, [rawListInput]);

  const toggleScreenShare = () => {
    window.dispatchEvent(new Event('TOGGLE_SCREEN_SHARE'));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleClear = () => {
    setClearTrigger(prev => prev + 1);
    setBackgroundImage(null);
    setBoardColor('#0f172a');
  };
  
  const handleUndo = () => {
    setUndoTrigger(prev => prev + 1);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setBackgroundImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // --- BROWSER LOGIC ---
  const processUrl = (input: string): string => {
    let url = input.trim();
    if (!url) return '';
    
    // YouTube Embed
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const ytMatch = url.match(youtubeRegex);
    if (ytMatch && ytMatch[1]) {
      return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
    }

    // Google Embed Hack (igu=1)
    if (url.includes('google.com') && !url.includes('igu=1')) {
       url += (url.includes('?') ? '&' : '?') + 'igu=1';
    }

    // Protocol check
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.includes('.') && !url.includes(' ')) {
         url = 'https://' + url;
         // Add igu=1 if it's google (user typed google.com)
         if (url.includes('google.com')) url += '?igu=1';
      } else {
         // Search
         url = `https://www.google.com/search?igu=1&q=${encodeURIComponent(url)}`;
      }
    }
    return url;
  };

  const navigateTo = (url: string) => {
    const processed = processUrl(url);
    
    // Update history
    const newHistory = browserHistory.slice(0, historyIndex + 1);
    newHistory.push(processed);
    setBrowserHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    setActiveWebUrl(processed);
    setBrowserUrlInput(processed);
    setYtSearchTerm('');
  };

  const handleActivateBrowser = (url: string) => {
    navigateTo(url);
    setShowWebModal(false);
    setModalUrlInput('');
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const url = browserHistory[newIndex];
      setActiveWebUrl(url);
      setBrowserUrlInput(url);
    }
  };

  const goForward = () => {
    if (historyIndex < browserHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const url = browserHistory[newIndex];
      setActiveWebUrl(url);
      setBrowserUrlInput(url);
    }
  };

  const goHome = () => {
    setShowWebModal(true);
  };

  const handleYoutubeSearch = () => {
    if (!ytSearchTerm.trim()) return;
    const url = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(ytSearchTerm)}`;
    navigateTo(url);
  };

  const reloadBrowser = () => {
    setIframeKey(prev => prev + 1);
  };

  const closeWebSplit = () => {
    setActiveWebUrl(null);
    setBrowserHistory([]);
    setHistoryIndex(-1);
  };

  // --- SAVE/LOAD CLASS ---
  const handleSaveClass = () => {
    if (!newClassName.trim()) { alert("Vui lòng nhập tên lớp!"); return; }
    if (studentList.length === 0) { alert("Danh sách trống!"); return; }
    const newClass: SavedClass = { name: newClassName.trim(), students: studentList };
    const updatedClasses = [...savedClasses.filter(c => c.name !== newClass.name), newClass];
    setSavedClasses(updatedClasses);
    localStorage.setItem('GB_SAVED_CLASSES', JSON.stringify(updatedClasses));
    setIsSavingClass(false);
    setNewClassName('');
    alert(`Đã lưu lớp ${newClass.name} thành công!`);
  };

  const handleLoadClass = (cls: SavedClass) => {
    setRawListInput(cls.students.join('\n'));
  };

  const handleDeleteClass = (e: React.MouseEvent, className: string) => {
    e.stopPropagation();
    if (window.confirm(`Xóa lớp ${className}?`)) {
      const updated = savedClasses.filter(c => c.name !== className);
      setSavedClasses(updated);
      localStorage.setItem('GB_SAVED_CLASSES', JSON.stringify(updated));
    }
  };

  // --- SOUNDS ---
  const playSound = (type: 'tick' | 'win') => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'tick') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      osc.start(); osc.stop(ctx.currentTime + 0.06);
    } else {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach(freq => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'triangle'; o.frequency.value = freq;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.1, now + 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, now + 2);
        o.start(now); o.stop(now + 2);
      });
    }
  };

  // --- RANDOM PICKER ---
  const handleRandomPick = () => {
    if (isSpinning) return;
    if (pickerMode === 'list' && studentList.length === 0) { alert("Chưa nhập danh sách!"); return; }
    
    setIsSpinning(true); setPickedResult(null);
    let duration = 6000;
    const fps = 20;
    let frame = 0;
    
    const interval = setInterval(() => {
      frame++;
      let currentVal: string | number;
      if (pickerMode === 'number') currentVal = Math.floor(Math.random() * classSize) + 1;
      else currentVal = studentList[Math.floor(Math.random() * studentList.length)];
      
      setDisplayResult(currentVal);
      playSound('tick');
      
      if (frame >= (duration/1000)*fps) {
        clearInterval(interval);
        setIsSpinning(false);
        setPickedResult(currentVal);
        playSound('win');
        confetti({ origin: { y: 0.7 } });
      }
    }, 1000/fps);
  };

  // Check if blocked
  const isYoutubeBlocked = activeWebUrl && 
    (activeWebUrl.includes('youtube.com') || activeWebUrl.includes('youtu.be')) && 
    !activeWebUrl.includes('/embed/');

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center text-white overflow-hidden font-sans">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(59,130,246,0.1),transparent_70%)] animate-pulse" />
        <div className="z-10 flex flex-col items-center animate-[fadeIn_0.5s_ease-out]">
          <h1 className="text-6xl md:text-7xl font-black mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            GlassBoard AI
          </h1>
          <div className="h-1 w-64 bg-white/10 rounded-full mb-10 overflow-hidden relative">
            <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 w-full animate-[width_2s_ease-in-out]" style={{width: '0%', animationFillMode: 'forwards'}}></div>
          </div>
          <div className="text-center space-y-3 opacity-0 animate-[slideUp_0.8s_ease-out_0.5s_forwards] transform translate-y-4">
            <p className="text-blue-300 text-sm tracking-[0.2em] uppercase font-semibold">Tác giả</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-md">Thầy Vũ Tiến Lực</h2>
            <div className="text-gray-400 font-light text-xl mt-2">
              <p>Trường THPT Nguyễn Hữu Cảnh</p>
              <p className="text-base text-gray-500 mt-1">Tp. Hồ Chí Minh</p>
            </div>
          </div>
        </div>
        <style>{`
          @keyframes width { 0% { width: 0%; } 100% { width: 100%; } }
          @keyframes slideUp { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
          @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex relative overflow-hidden bg-slate-900 animate-[fadeIn_0.5s_ease-out]">
      
      {/* LEFT PANEL: BOARD */}
      <div className={`relative h-full transition-all duration-300 flex flex-col ${activeWebUrl ? 'w-1/2 border-r border-white/20' : 'w-full'}`}>
        <div className="flex-1 relative overflow-hidden">
          <Board 
            tool={currentTool} 
            settings={settings}
            clearTrigger={clearTrigger}
            undoTrigger={undoTrigger}
            onScreenShareReady={setIsScreenSharing}
            getCanvasRef={(ref) => canvasRef.current = ref}
            getVideoRef={(ref) => videoRef.current = ref}
            backgroundImage={backgroundImage}
            boardColor={boardColor}
            showGrid={showGrid}
          />
          
          <Toolbar 
            currentTool={currentTool}
            setTool={setCurrentTool}
            settings={settings}
            setSettings={setSettings}
            onClear={handleClear}
            onUndo={handleUndo}
            onScreenShare={toggleScreenShare}
            isScreenSharing={isScreenSharing}
            onRandomPick={() => setShowRandomPicker(true)}
            onToggleFullscreen={toggleFullscreen}
            isFullscreen={isFullscreen}
            onTriggerImageUpload={() => fileInputRef.current?.click()}
            onTriggerWebInsert={() => setShowWebModal(true)}
            boardColor={boardColor}
            setBoardColor={setBoardColor}
            showGrid={showGrid}
            setShowGrid={setShowGrid}
            onShowHelp={() => setShowHelp(true)}
          />
        </div>
      </div>

      {/* RIGHT PANEL: BROWSER */}
      {activeWebUrl && (
        <div className="w-1/2 h-full bg-slate-100 relative flex flex-col animate-[slideInRight_0.3s_ease-out]">
           
           {/* Browser Toolbar */}
           <div className="h-12 bg-gray-100 border-b border-gray-300 flex items-center px-2 gap-2 shadow-sm shrink-0 z-20">
              
              {/* Navigation Controls */}
              <div className="flex items-center gap-1">
                 <button onClick={goBack} disabled={historyIndex <= 0} className="p-1.5 hover:bg-gray-200 rounded text-gray-600 disabled:opacity-30 transition-colors" title="Quay lại">
                    <ArrowLeft size={16} />
                 </button>
                 <button onClick={goForward} disabled={historyIndex >= browserHistory.length - 1} className="p-1.5 hover:bg-gray-200 rounded text-gray-600 disabled:opacity-30 transition-colors" title="Tiếp theo">
                    <ArrowRight size={16} />
                 </button>
                 <button onClick={reloadBrowser} className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors" title="Tải lại">
                    <RotateCw size={16} />
                 </button>
                 <button onClick={goHome} className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors" title="Trang chủ">
                    <Home size={16} />
                 </button>
              </div>

              {/* Address Bar */}
              <div className="flex-1 relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                   {activeWebUrl.includes('google') ? <Search size={14} /> : <Globe size={14} />}
                </div>
                <input 
                  type="text"
                  value={browserUrlInput}
                  onChange={(e) => setBrowserUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && navigateTo(browserUrlInput)}
                  className="w-full bg-white border border-gray-300 rounded-full py-1.5 pl-8 pr-8 text-sm text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all shadow-inner"
                  placeholder="Nhập địa chỉ web hoặc tìm kiếm..."
                  onFocus={(e) => e.target.select()}
                />
                <a href={activeWebUrl} target="_blank" rel="noreferrer" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-blue-100 rounded-full text-blue-500" title="Mở trong tab mới (Nên dùng nếu bị lỗi)">
                    <ExternalLink size={14} />
                </a>
              </div>

              {/* Quick Tools */}
              <div className="relative group">
                 <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-xs font-semibold text-gray-600 shadow-sm">
                    <BookOpen size={16} className="text-purple-500" />
                 </button>
                 <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-2 hidden group-hover:block animate-[fadeIn_0.1s_ease-out] z-30">
                    <div className="px-3 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider">Web Dạy Học</div>
                    {QUICK_LINKS.map((link, i) => (
                       <button 
                          key={i}
                          onClick={() => handleActivateBrowser(link.url)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center justify-between"
                       >
                          {link.name}
                       </button>
                    ))}
                 </div>
              </div>

              <div className="h-6 w-px bg-gray-300 mx-1"></div>

              <button onClick={closeWebSplit} className="p-2 hover:bg-red-100 hover:text-red-600 rounded-lg text-gray-500 transition-colors" title="Đóng Web">
                 <X size={20} />
              </button>
           </div>
           
           {/* Browser Content */}
           <div className="flex-1 relative bg-white flex flex-col">
              {isYoutubeBlocked ? (
                 <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-[fadeIn_0.3s_ease-out]">
                    <div className="bg-red-100 p-4 rounded-full text-red-600 mb-4 shadow-sm">
                       <Youtube size={48} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Trang chủ YouTube không hỗ trợ nhúng</h3>
                    <p className="text-gray-600 max-w-sm mb-6 text-sm">
                       YouTube chặn hiển thị trang chủ trên bảng. 
                       Vui lòng nhập từ khóa để tìm video.
                    </p>
                    <div className="flex w-full max-w-sm gap-2">
                       <input 
                          type="text" 
                          autoFocus
                          value={ytSearchTerm}
                          onChange={(e) => setYtSearchTerm(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleYoutubeSearch()}
                          placeholder="Tìm video: Toán 12, Vật lý..." 
                          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:border-red-500 focus:outline-none"
                       />
                       <button 
                          onClick={handleYoutubeSearch}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                       >
                          Tìm
                       </button>
                    </div>
                 </div>
              ) : (
                <>
                  <iframe 
                    key={iframeKey}
                    src={activeWebUrl} 
                    className="w-full h-full border-0" 
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-downloads allow-modals"
                    title="Embedded Browser"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                  
                  {/* Smart Alert Bar */}
                  <div className="absolute bottom-0 left-0 right-0 bg-yellow-50/95 backdrop-blur-sm border-t border-yellow-200 p-1.5 flex items-center justify-between px-4 text-xs text-yellow-800 transition-transform duration-300">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">Lưu ý:</span> Một số trang (Facebook, VnExpress...) chặn mở trên bảng. Nếu thấy lỗi/trắng, hãy mở tab mới.
                      </div>
                      <a href={activeWebUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-white border border-yellow-300 px-2 py-0.5 rounded hover:bg-yellow-100 transition-colors font-semibold text-yellow-900">
                         <ExternalLink size={10} /> Mở Tab Mới
                      </a>
                  </div>
                </>
              )}
           </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
      
      {/* Help Modal */}
      {showHelp && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80] flex items-center justify-center p-4">
           <div className="bg-slate-900 border border-white/20 rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative animate-[fadeIn_0.3s_ease-out]">
             <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
               <X size={24} />
             </button>
             
             <div className="flex items-center gap-3 mb-6">
                <Keyboard size={32} className="text-blue-400" />
                <h2 className="text-2xl font-bold text-white">Hướng dẫn & Phím tắt</h2>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                    <Command size={14} /> Phím tắt (Shortcuts)
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex justify-between items-center text-gray-300"><span>Bút vẽ</span><code className="bg-white/10 px-2 py-0.5 rounded text-sm text-yellow-400">Alt + P</code></li>
                    <li className="flex justify-between items-center text-gray-300"><span>Quay số</span><code className="bg-white/10 px-2 py-0.5 rounded text-sm text-yellow-400">Alt + R</code></li>
                    <li className="flex justify-between items-center text-gray-300"><span>Chia sẻ</span><code className="bg-white/10 px-2 py-0.5 rounded text-sm text-yellow-400">Alt + S</code></li>
                    <li className="flex justify-between items-center text-gray-300"><span>Chèn ảnh</span><code className="bg-white/10 px-2 py-0.5 rounded text-sm text-yellow-400">Alt + I</code></li>
                    <li className="flex justify-between items-center text-gray-300"><span>Toàn màn hình</span><code className="bg-white/10 px-2 py-0.5 rounded text-sm text-yellow-400">F</code></li>
                  </ul>
               </div>
               <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                     <Trophy size={14} /> Tính năng nổi bật
                  </h3>
                  <ul className="space-y-4">
                    <li className="flex gap-3"><div className="bg-blue-500/20 p-2 rounded text-blue-400 h-fit"><Feather size={16}/></div><div><div className="font-semibold text-white">Bút cọ (Chữ đẹp)</div><p className="text-xs text-gray-400">Nét thanh đậm tự động.</p></div></li>
                    <li className="flex gap-3"><div className="bg-purple-500/20 p-2 rounded text-purple-400 h-fit"><Box size={16}/></div><div><div className="font-semibold text-white">Hình 3D thông minh</div><p className="text-xs text-gray-400">Tự động vẽ nét đứt.</p></div></li>
                    <li className="flex gap-3"><div className="bg-orange-500/20 p-2 rounded text-orange-400 h-fit"><Globe size={16}/></div><div><div className="font-semibold text-white">Trình duyệt nhúng</div><p className="text-xs text-gray-400">Duyệt web song song với bảng.</p></div></li>
                  </ul>
               </div>
             </div>
             
             <div className="mt-8 pt-6 border-t border-white/10 flex flex-col items-center justify-center text-center">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Thông tin tác giả</p>
                <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-1">Thầy Vũ Tiến Lực</h3>
                <p className="text-gray-300 font-mono text-sm mb-1">0969 068 849</p>
                <p className="text-gray-400 text-sm">Trường THPT Nguyễn Hữu Cảnh - Tp. Hồ Chí Minh</p>
             </div>
             <div className="mt-6 text-center">
                <button onClick={() => setShowHelp(false)} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">Đã hiểu</button>
             </div>
           </div>
         </div>
      )}
      
      {/* Web Insert Modal (Initial) */}
      {showWebModal && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
           <div className="bg-slate-800 border border-white/20 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-[scaleIn_0.2s_ease-out]">
              <div className="flex items-center gap-3 mb-4 text-purple-400">
                 <Globe size={28} />
                 <h3 className="text-xl font-bold text-white">Mở Trình Duyệt</h3>
              </div>
              
              <div className="mb-6">
                 <label className="block text-sm text-gray-300 mb-2">Nhập địa chỉ web hoặc chọn nhanh:</label>
                 <div className="relative mb-4">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><LinkIcon size={16} /></div>
                    <input 
                       autoFocus
                       type="text" 
                       value={modalUrlInput}
                       onChange={(e) => setModalUrlInput(e.target.value)}
                       placeholder="ví dụ: hoc247.net, youtube.com..."
                       className="w-full bg-black/30 border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500"
                       onKeyDown={(e) => e.key === 'Enter' && handleActivateBrowser(modalUrlInput)}
                    />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-2">
                    {QUICK_LINKS.slice(0, 6).map((link, i) => (
                       <button key={i} onClick={() => handleActivateBrowser(link.url)} className="text-left px-3 py-2 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-xs text-gray-300 flex items-center gap-2">
                          <ExternalLink size={10} className="text-blue-400" /> {link.name}
                       </button>
                    ))}
                 </div>
              </div>

              <div className="flex gap-3 justify-end border-t border-white/10 pt-4">
                 <button onClick={() => setShowWebModal(false)} className="px-4 py-2 text-gray-300 hover:bg-white/10 rounded-lg">Hủy</button>
                 <button 
                    onClick={() => handleActivateBrowser(modalUrlInput)}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg shadow-lg"
                 >
                    Truy cập
                 </button>
              </div>
           </div>
         </div>
      )}

      {/* Random Picker */}
      {showRandomPicker && (
         <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-4">
           <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 w-full max-w-5xl shadow-2xl flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-hidden">
             <div className="w-full md:w-1/3 flex flex-col gap-4 border-r border-white/10 pr-0 md:pr-6 overflow-y-auto no-scrollbar">
               <div className="flex justify-between items-center mb-2">
                 <div className="flex items-center gap-2 text-purple-400 font-bold text-xl"><Dices size={28} /><span>Quay Ngẫu Nhiên</span></div>
               </div>
               <div className="flex bg-slate-800 p-1 rounded-lg shrink-0">
                 <button onClick={() => setPickerMode('list')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md ${pickerMode === 'list' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}><List size={16} /> Danh sách</button>
                 <button onClick={() => setPickerMode('number')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md ${pickerMode === 'number' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}><Hash size={16} /> Số thứ tự</button>
               </div>
               <div className="flex-1 flex flex-col min-h-[200px]">
                  {pickerMode === 'list' ? (
                    <div className="flex-1 flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                         <label className="text-gray-300 text-sm font-medium">Danh sách (Excel/Word):</label>
                         {!isSavingClass ? (
                            <button onClick={() => setIsSavingClass(true)} disabled={studentList.length === 0} className="text-xs flex items-center gap-1 bg-green-700 hover:bg-green-600 px-2 py-1 rounded text-white"><Save size={12} /> Lưu lớp</button>
                         ) : (
                            <div className="flex items-center gap-1">
                               <input autoFocus className="w-24 bg-black/40 border border-white/20 rounded px-1 py-0.5 text-xs text-white" placeholder="Tên lớp..." value={newClassName} onChange={(e) => setNewClassName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveClass()}/>
                               <button onClick={handleSaveClass} className="bg-green-600 p-1 rounded"><Save size={12}/></button>
                               <button onClick={() => setIsSavingClass(false)} className="bg-red-600 p-1 rounded"><X size={12}/></button>
                            </div>
                         )}
                      </div>
                      <textarea value={rawListInput} onChange={(e) => setRawListInput(e.target.value)} placeholder="Nguyễn Văn A&#10;Trần Thị B..." className="w-full h-40 bg-black/30 border border-white/20 rounded-xl p-3 text-white text-sm resize-none font-mono"/>
                      {savedClasses.length > 0 && (
                        <div className="flex flex-col gap-2 mt-2">
                           <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Lớp đã lưu</div>
                           <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                              {savedClasses.map((cls, idx) => (
                                <div key={idx} className="group flex items-center gap-1 bg-slate-700/50 hover:bg-purple-600/30 border border-white/10 rounded-full pl-3 pr-1 py-1 cursor-pointer" onClick={() => handleLoadClass(cls)}>
                                   <span className="text-xs text-white truncate max-w-[100px]">{cls.name}</span>
                                   <span className="text-[10px] text-gray-400">({cls.students.length})</span>
                                   <button onClick={(e) => handleDeleteClass(e, cls.name)} className="p-1 rounded-full hover:bg-red-500 hover:text-white text-gray-500 opacity-0 group-hover:opacity-100"><X size={10} /></button>
                                </div>
                              ))}
                           </div>
                        </div>
                      )}
                      <div className="text-xs text-gray-500 text-right mt-auto">Tổng: {studentList.length} HS</div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 py-4">
                       <label className="text-gray-300 text-sm">Nhập sĩ số lớp:</label>
                       <input type="number" min="1" max="999" value={classSize} onChange={(e) => setClassSize(Number(e.target.value))} className="w-full bg-black/30 border border-white/20 rounded-xl p-3 text-white text-2xl text-center"/>
                    </div>
                  )}
               </div>
               <div className="flex gap-3 mt-auto shrink-0 pt-4">
                 <button onClick={() => setShowRandomPicker(false)} className="flex-1 py-3 border border-white/10 hover:bg-white/5 text-gray-300 rounded-xl">Đóng</button>
                 <button onClick={handleRandomPick} disabled={isSpinning || (pickerMode === 'list' && studentList.length === 0)} className="flex-[2] py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                    {isSpinning ? <Loader2 className="animate-spin" /> : <Dices />} {isSpinning ? "Đang quay..." : "QUAY NGAY"}
                  </button>
               </div>
             </div>
             <div className="w-full md:w-2/3 bg-black/50 rounded-2xl border border-white/10 flex flex-col relative overflow-hidden min-h-[400px]">
               <div className={`absolute inset-0 transition-opacity duration-1000 ${isSpinning ? 'opacity-100' : 'opacity-20'}`}>
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[100px] animate-pulse"></div>
               </div>
               <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 text-center">
                 {isSpinning && <div className="text-xl text-blue-300 mb-8 animate-bounce font-medium uppercase">Đang tìm người may mắn...</div>}
                 {!isSpinning && pickedResult && (
                    <div className="flex items-center gap-3 text-yellow-400 mb-6 animate-[bounce_1s_infinite]"><Trophy size={40} /><span className="text-2xl font-bold uppercase">Chúc mừng</span><Trophy size={40} /></div>
                 )}
                 <div className={`font-black break-words w-full transition-all duration-100 leading-tight ${isSpinning ? 'text-7xl md:text-8xl animate-rainbow opacity-80 scale-95 blur-[1px]' : ''} ${!isSpinning && pickedResult ? 'text-8xl md:text-[150px] text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[0_0_30px_rgba(234,179,8,0.6)] scale-110' : ''} ${!isSpinning && !pickedResult ? 'text-8xl text-gray-700' : ''}`}>{displayResult}</div>
               </div>
             </div>
           </div>
         </div>
      )}

      {/* Watermark */}
      {!isScreenSharing && !currentTool && !backgroundImage && boardColor === '#0f172a' && !activeWebUrl && (
        <div className="absolute top-10 left-10 text-white/5 pointer-events-none select-none">
          <h1 className="text-4xl font-bold">GlassBoard AI</h1>
        </div>
      )}
    </div>
  );
}

export default App;