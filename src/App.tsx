import React, { useState, useEffect, useRef } from 'react';
import { Search, Radio, Play, Plus, Bookmark, X, User, LogIn, Upload, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ALL_GENRES = ['Rock', 'Jazz', 'Folk', 'Soul', 'Blues', 'Pop', 'Punk', 'Reggae', 'Modern folk', 'Hip-hop', 'Metal', 'Rnb'];

interface Video {
  id: number;
  user_id: number;
  title: string;
  video_path: string;
  price: number;
  views: number;
  genres: string;
  username: string;
  avatar: string;
}

interface User {
  id: number;
  username: string;
  avatar: string;
}

export default function App() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [miniPlayerVisible, setMiniPlayerVisible] = useState(false);
  const [isRadioMode, setIsRadioMode] = useState(false);
  const [currentRadioIndex, setCurrentRadioIndex] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  const videoRefs = useRef<{ [key: number]: HTMLVideoElement | null }>({});
  const miniVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    fetchVideos();
    // Check local storage for user
    const savedUser = localStorage.getItem('mandarina_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const fetchVideos = async (search = '', genres: string[] = []) => {
    const genreQuery = genres.length > 0 ? `&genres=${genres.join(',')}` : '';
    const res = await fetch(`/api/videos?search=${search}${genreQuery}`);
    const data = await res.json();
    setVideos(data);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVideos(searchTerm, selectedGenres);
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const handlePlay = async (video: Video) => {
    if (activeVideo?.id !== video.id) {
      setActiveVideo(video);
      await fetch(`/api/videos/${video.id}/view`, { method: 'POST' });
      // Update local views count
      setVideos(prev => prev.map(v => v.id === video.id ? { ...v, views: v.views + 1 } : v));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm)
    });
    if (res.ok) {
      const userData = await res.json();
      setUser(userData);
      localStorage.setItem('mandarina_user', JSON.stringify(userData));
      setShowLoginModal(false);
    } else {
      alert('Invalid credentials');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('mandarina_user');
  };

  const startRadio = () => {
    if (videos.length > 0) {
      setIsRadioMode(true);
      setCurrentRadioIndex(0);
      handlePlay(videos[0]);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!activeVideo) return;
      const videoEl = videoRefs.current[activeVideo.id];
      if (videoEl) {
        const rect = videoEl.getBoundingClientRect();
        const isOffScreen = rect.top < -100 || rect.bottom > window.innerHeight + 100;
        setMiniPlayerVisible(isOffScreen);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeVideo]);

  const handleVideoEnd = () => {
    if (isRadioMode) {
      const nextIndex = (currentRadioIndex + 1) % videos.length;
      setCurrentRadioIndex(nextIndex);
      handlePlay(videos[nextIndex]);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#1a1a1a] font-serif">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-black/5 px-6 py-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tighter text-[#5A5A40]">
          <a href="/">Mandarina</a>
        </h1>
        
        <div className="hidden md:flex items-center space-x-8 text-sm uppercase tracking-widest font-sans font-semibold">
          <a href="/" className="hover:text-[#5A5A40] transition-colors">Početna</a>
          {user ? (
            <>
              <button onClick={handleLogout} className="hover:text-[#5A5A40] transition-colors">Odjava</button>
              <div className="flex items-center space-x-2">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} className="w-8 h-8 rounded-full border border-black/10" alt="avatar" />
                <span className="text-[#5A5A40]">{user.username}</span>
              </div>
            </>
          ) : (
            <button onClick={() => setShowLoginModal(true)} className="flex items-center space-x-2 hover:text-[#5A5A40] transition-colors">
              <LogIn size={18} />
              <span>Prijava</span>
            </button>
          )}
        </div>
        <button className="md:hidden">
          <Menu />
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Search & Filter */}
        <section className="mb-16">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Pretraži pesme..." 
                className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-black/5 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all font-sans"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button type="submit" className="px-8 py-4 bg-[#5A5A40] text-white rounded-2xl font-sans font-bold uppercase tracking-widest hover:bg-[#4a4a34] transition-all shadow-lg shadow-[#5A5A40]/20">
              Pretraži
            </button>
            <button 
              type="button"
              onClick={startRadio}
              className="flex items-center justify-center space-x-2 px-8 py-4 bg-white border border-[#5A5A40] text-[#5A5A40] rounded-2xl font-sans font-bold uppercase tracking-widest hover:bg-[#5A5A40] hover:text-white transition-all"
            >
              <Radio size={20} />
              <span>Pusti Radio</span>
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {ALL_GENRES.map(genre => (
              <button
                key={genre}
                onClick={() => toggleGenre(genre)}
                className={`px-4 py-2 rounded-full text-xs font-sans font-bold uppercase tracking-wider transition-all border ${
                  selectedGenres.includes(genre) 
                    ? 'bg-[#5A5A40] text-white border-[#5A5A40]' 
                    : 'bg-white text-gray-500 border-black/5 hover:border-[#5A5A40]/30'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </section>

        {/* Video Grid */}
        <section>
          <h2 className="text-4xl font-light mb-12 italic border-b border-black/10 pb-4">Najnovije pesme</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {videos.map(video => (
              <motion.div 
                layout
                key={video.id} 
                className="group bg-white rounded-[32px] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-black/5"
              >
                <div className="relative aspect-video overflow-hidden bg-black">
                  <video 
                    ref={el => videoRefs.current[video.id] = el}
                    src={video.video_path} 
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    onPlay={() => handlePlay(video)}
                    onEnded={handleVideoEnd}
                    controls
                  />
                  {activeVideo?.id === video.id && (
                    <div className="absolute top-4 right-4 bg-[#5A5A40] text-white text-[10px] px-3 py-1 rounded-full uppercase tracking-widest font-bold animate-pulse">
                      Sada svira
                    </div>
                  )}
                </div>
                
                <div className="p-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${video.username}`} 
                        className="w-10 h-10 rounded-full border border-black/5" 
                        alt="avatar" 
                      />
                      <div>
                        <p className="text-xs font-sans font-bold uppercase tracking-widest text-gray-400">{video.username}</p>
                        <h3 className="text-xl font-medium leading-tight">{video.title}</h3>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-6">
                    {video.genres.split(',').map(g => (
                      <span key={g} className="text-[10px] font-sans font-bold uppercase tracking-tighter text-[#5A5A40]/60 bg-[#5A5A40]/5 px-2 py-0.5 rounded">
                        {g.trim()}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-sm border-t border-black/5 pt-6">
                    <div className="space-y-1">
                      <p className="text-gray-400 font-sans text-[10px] uppercase tracking-widest">Cena</p>
                      <p className="text-lg font-sans font-bold">{video.price.toFixed(2)} €</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-gray-400 font-sans text-[10px] uppercase tracking-widest">Pregledi</p>
                      <p className="text-lg font-sans font-bold">{video.views}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <button className="flex items-center justify-center space-x-2 py-3 bg-[#5A5A40] text-white rounded-xl text-xs font-sans font-bold uppercase tracking-widest hover:bg-[#4a4a34] transition-all">
                      <Bookmark size={14} />
                      <span>Rezerviši</span>
                    </button>
                    <button className="flex items-center justify-center space-x-2 py-3 bg-white border border-black/10 text-gray-600 rounded-xl text-xs font-sans font-bold uppercase tracking-widest hover:bg-gray-50 transition-all">
                      <Plus size={14} />
                      <span>Plejlista</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      {/* Mini Player */}
      <AnimatePresence>
        {miniPlayerVisible && activeVideo && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 right-8 w-80 bg-[#151619] rounded-2xl shadow-2xl z-50 overflow-hidden border border-white/10"
          >
            <div className="relative aspect-video">
              <video 
                ref={miniVideoRef}
                src={activeVideo.video_path}
                autoPlay
                controls
                className="w-full h-full object-cover"
              />
              <button 
                onClick={() => setMiniPlayerVisible(false)}
                className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-all"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 flex items-center space-x-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-gray-500 truncate">{activeVideo.username}</p>
                <p className="text-white text-sm font-medium truncate">{activeVideo.title}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 text-white/70 hover:text-white transition-colors">
                  <Play size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-[32px] p-12 shadow-2xl"
            >
              <h2 className="text-3xl font-light mb-8 italic">Dobrodošli nazad</h2>
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-sans font-bold uppercase tracking-widest text-gray-400 mb-2">Korisničko ime</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl border border-black/5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 font-sans"
                    value={loginForm.username}
                    onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-sans font-bold uppercase tracking-widest text-gray-400 mb-2">Lozinka</label>
                  <input 
                    type="password" 
                    required
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl border border-black/5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 font-sans"
                    value={loginForm.password}
                    onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                  />
                </div>
                <button type="submit" className="w-full py-4 bg-[#5A5A40] text-white rounded-2xl font-sans font-bold uppercase tracking-widest hover:bg-[#4a4a34] transition-all shadow-lg shadow-[#5A5A40]/20">
                  Prijavi se
                </button>
              </form>
              <p className="mt-8 text-center text-xs text-gray-400 font-sans">
                Podrazumevani nalog: <span className="font-bold">admin / admin123</span>
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-white border-t border-black/5 py-12 px-6 mt-24">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <h2 className="text-2xl font-bold tracking-tighter text-[#5A5A40]">Mandarina</h2>
          <p className="text-xs font-sans font-bold uppercase tracking-widest text-gray-400">© 2024 Sva prava zadržana</p>
          <div className="flex space-x-6 text-[10px] font-sans font-bold uppercase tracking-widest text-gray-400">
            <a href="#" className="hover:text-[#5A5A40]">Privatnost</a>
            <a href="#" className="hover:text-[#5A5A40]">Uslovi</a>
            <a href="#" className="hover:text-[#5A5A40]">Kontakt</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
