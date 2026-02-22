import React, { useState, useEffect, useRef } from 'react';
import { 
  Check, Zap, X, Play, Lock, ChevronDown, Youtube, 
  CreditCard, Building2, Sun, Moon, User, Mountain, 
  Eye, Scissors, Shirt, Footprints, PersonStanding, 
  Crown, Sparkles, Key, Save, Trash2, PlusCircle
} from 'lucide-react';

// FIREBASE INTEGRATION
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB36wJrKgkyH0_ev6uyzVWKc2gQdXZNaWA",
  authDomain: "aiflow-academy.firebaseapp.com",
  projectId: "aiflow-academy",
  storageBucket: "aiflow-academy.firebasestorage.app",
  messagingSenderId: "397056782057",
  appId: "1:397056782057:web:8eb4ff5bd4fcbc7f0aca78",
  measurementId: "G-SJVX8JP5P6"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

const appId = "aiflow_academy";

const getYTId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// =========================================================================
// SŁOWNIK TŁUMACZEŃ
// =========================================================================
const translations = {
  PL: {
    // Nawigacja
    nav_academy: 'Academy',
    nav_tutorials: 'Tutoriale',
    nav_studio: 'Studio Pro',
    // Strona główna
    home_tagline: 'Sztuka tworzenia wizji przyszłości.',
    home_play_demo: 'Odtwórz Demo: Wirtualne Awatary',
    home_locked_title: 'Osiągnięto limit podglądu',
    home_locked_btn: 'Odblokuj Pełną Wiedzę',
    home_pricing_title: 'Subskrypcja Premium',
    home_monthly_title: 'Abonament Miesięczny',
    home_monthly_per: '/ msc',
    home_monthly_features: ['Baza VOD', 'Live Coaching 3x/tydz', 'Prompt Builder Pro', 'Zamknięta Grupa'],
    home_monthly_btn: 'Wybieram Plan Standard',
    home_yearly_badge: 'Najlepszy Wybór',
    home_yearly_title: 'Plan Roczny VIP',
    home_yearly_per: '/ rok',
    home_yearly_features: ['Wszystko w Pro', 'Gwarancja stałej ceny', 'Bonusy VIP', 'Certyfikat Eksperta'],
    home_yearly_btn: 'Zostań Członkiem VIP',
    // Modal płatności
    modal_title: 'Finalizacja',
    modal_package: 'Pakiet',
    modal_auto_pay: 'Płatność Automatyczna',
    modal_auto_pay_sub: 'BLIK, Karta, Apple Pay',
    modal_transfer: 'Przelew Tradycyjny',
    modal_transfer_sub: 'Konta Sparkasse & Volksbank',
    modal_due: 'Do zapłaty',
    // Tutoriale
    tut_title: 'Tutoriale VOD',
    tut_subtitle: 'Baza Wiedzy Eksperckiej',
    tut_password_placeholder: 'Hasło dostępowe',
    tut_wrong_pass: 'Nieprawidłowe hasło',
    tut_add_title: 'Dodaj Nowy Materiał Wideo',
    tut_url_placeholder: 'Wklej link YouTube',
    tut_name_placeholder: 'Tytuł Tutorialu',
    tut_save_btn: 'Zapisz i Wyjdź z Edycji',
    tut_empty: 'Brak materiałów w bazie.',
    tut_preview_badge: 'Podgląd 10s',
    tut_preview_live: 'Podgląd',
    // Modal podglądu
    preview_locked_title: 'To był tylko podgląd',
    preview_locked_sub: 'Odblokuj pełny dostęp do wszystkich materiałów VOD',
    preview_locked_btn: 'Wykup Dostęp',
    // Studio Pro
    studio_title: 'PROMPT STUDIO',
    studio_edition: 'Edition Limitée',
    studio_compile: 'Kompilacja Promptu',
    studio_export: 'Export Prompt',
    studio_copied: 'Copied!',
    studio_subject_label: 'Podmiot',
    studio_body_label: 'Sylwetka',
    studio_breast_label: 'Biust',
    studio_lower_label: 'Dół anatomia',
    studio_hair_body_label: 'Owłosienie',
    studio_hairstyle_label: 'Fryzura',
    studio_hair_color_label: 'Kolor',
    studio_hair_length_label: 'Długość',
    studio_face_label: 'Twarz',
    studio_top_label: 'Góra',
    studio_bottom_label: 'Dół',
    studio_shoes_label: 'Obuwie',
    studio_legs_label: 'Nogi',
    studio_bg_label: 'Tło',
    // Stopka
    footer_copy: '© 2026 Damian L. J. - Professional AI Suite',
  },
  EN: {
    // Navigation
    nav_academy: 'Academy',
    nav_tutorials: 'Tutorials',
    nav_studio: 'Studio Pro',
    // Home
    home_tagline: 'The art of creating visions of the future.',
    home_play_demo: 'Play Demo: Virtual Avatars',
    home_locked_title: 'Preview limit reached',
    home_locked_btn: 'Unlock Full Access',
    home_pricing_title: 'Premium Subscription',
    home_monthly_title: 'Monthly Plan',
    home_monthly_per: '/ mo',
    home_monthly_features: ['VOD Library', 'Live Coaching 3x/week', 'Prompt Builder Pro', 'Private Community'],
    home_monthly_btn: 'Choose Standard Plan',
    home_yearly_badge: 'Best Value',
    home_yearly_title: 'Annual VIP Plan',
    home_yearly_per: '/ year',
    home_yearly_features: ['Everything in Pro', 'Price Lock Guarantee', 'VIP Bonuses', 'Expert Certificate'],
    home_yearly_btn: 'Become a VIP Member',
    // Payment modal
    modal_title: 'Checkout',
    modal_package: 'Package',
    modal_auto_pay: 'Automatic Payment',
    modal_auto_pay_sub: 'Card, Apple Pay, Google Pay',
    modal_transfer: 'Bank Transfer',
    modal_transfer_sub: 'Sparkasse & Volksbank accounts',
    modal_due: 'Amount due',
    // Tutorials
    tut_title: 'VOD Tutorials',
    tut_subtitle: 'Expert Knowledge Base',
    tut_password_placeholder: 'Access password',
    tut_wrong_pass: 'Incorrect password',
    tut_add_title: 'Add New Video Material',
    tut_url_placeholder: 'Paste YouTube link',
    tut_name_placeholder: 'Tutorial Title',
    tut_save_btn: 'Save & Exit Editing',
    tut_empty: 'No materials in the database.',
    tut_preview_badge: '10s Preview',
    tut_preview_live: 'Preview',
    // Preview modal
    preview_locked_title: 'That was just a preview',
    preview_locked_sub: 'Unlock full access to all VOD materials',
    preview_locked_btn: 'Get Access',
    // Studio Pro
    studio_title: 'PROMPT STUDIO',
    studio_edition: 'Edition Limitée',
    studio_compile: 'Prompt Compilation',
    studio_export: 'Export Prompt',
    studio_copied: 'Copied!',
    studio_subject_label: 'Subject',
    studio_body_label: 'Body Type',
    studio_breast_label: 'Bust',
    studio_lower_label: 'Lower Anatomy',
    studio_hair_body_label: 'Body Hair',
    studio_hairstyle_label: 'Hairstyle',
    studio_hair_color_label: 'Color',
    studio_hair_length_label: 'Length',
    studio_face_label: 'Face',
    studio_top_label: 'Top',
    studio_bottom_label: 'Bottom',
    studio_shoes_label: 'Footwear',
    studio_legs_label: 'Legwear',
    studio_bg_label: 'Background',
    // Footer
    footer_copy: '© 2026 Damian L. J. - Professional AI Suite',
  }
};

// =========================================================================
// PRZEŁĄCZNIK JĘZYKA
// =========================================================================
const LangSwitcher = ({ lang, setLang }) => (
  <div className="flex bg-slate-800 dark:bg-[#121212] p-1 rounded-xl border border-slate-700 dark:border-[#222] gap-1">
    <button
      onClick={() => setLang('PL')}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${lang === 'PL' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'}`}
    >
      <span className="text-sm leading-none">🇵🇱</span> PL
    </button>
    <button
      onClick={() => setLang('EN')}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${lang === 'EN' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'}`}
    >
      <span className="text-sm leading-none">🇬🇧</span> EN
    </button>
  </div>
);

// =========================================================================
// MODAL LOGOWANIA
// =========================================================================
const LoginModal = ({ onClose, lang }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const errorMsg = (code) => {
    const msgs = {
      'auth/email-already-in-use': lang === 'EN' ? 'This email is already registered.' : 'Ten email jest już zarejestrowany.',
      'auth/wrong-password': lang === 'EN' ? 'Incorrect password.' : 'Nieprawidłowe hasło.',
      'auth/user-not-found': lang === 'EN' ? 'No account found with this email.' : 'Nie znaleziono konta z tym emailem.',
      'auth/weak-password': lang === 'EN' ? 'Password must be at least 6 characters.' : 'Hasło musi mieć co najmniej 6 znaków.',
      'auth/invalid-email': lang === 'EN' ? 'Invalid email address.' : 'Nieprawidłowy adres email.',
      'auth/popup-closed-by-user': '',
    };
    return msgs[code] || (lang === 'EN' ? 'An error occurred. Please try again.' : 'Wystąpił błąd. Spróbuj ponownie.');
  };

  const handleGoogle = async () => {
    setLoading(true); setError('');
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (e) { setError(errorMsg(e.code)); }
    setLoading(false);
  };

  const handleEmail = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (mode === 'register') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (e) { setError(errorMsg(e.code)); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 font-sans" onClick={onClose}>
      <div className="bg-white dark:bg-[#0A0A0A] rounded-2xl p-8 w-full max-w-sm border dark:border-[#1A1A1A] shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-black dark:hover:text-white hover:rotate-90 transition-all"><X className="w-5 h-5" /></button>

        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <img src="/logo.png" alt="AI Flow" className="h-8 w-auto" />
        </div>

        {/* Tytuł */}
        <h2 className="text-xl font-extrabold uppercase tracking-tighter text-black dark:text-white mb-1">
          {mode === 'login'
            ? (lang === 'EN' ? 'Welcome back' : 'Witaj ponownie')
            : (lang === 'EN' ? 'Create account' : 'Utwórz konto')}
        </h2>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-6">
          {mode === 'login'
            ? (lang === 'EN' ? 'Sign in to access all content' : 'Zaloguj się aby uzyskać dostęp')
            : (lang === 'EN' ? 'Join AI Flow Academy' : 'Dołącz do AI Flow Academy')}
        </p>

        {/* Google */}
        <button onClick={handleGoogle} disabled={loading} className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-slate-200 dark:border-[#222] rounded-xl font-bold text-sm text-black dark:text-white hover:border-amber-500 transition-all mb-4 disabled:opacity-50">
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          {lang === 'EN' ? 'Continue with Google' : 'Kontynuuj przez Google'}
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-slate-200 dark:bg-[#222]"></div>
          <span className="text-[10px] text-slate-400 uppercase font-bold">{lang === 'EN' ? 'or' : 'lub'}</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-[#222]"></div>
        </div>

        {/* Email + hasło */}
        <form onSubmit={handleEmail} className="space-y-3">
          <input
            type="email"
            required
            placeholder={lang === 'EN' ? 'Email address' : 'Adres email'}
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#333] rounded-xl px-4 py-3 text-sm text-black dark:text-white outline-none focus:border-amber-500 transition-colors"
          />
          <input
            type="password"
            required
            placeholder={lang === 'EN' ? 'Password (min. 6 characters)' : 'Hasło (min. 6 znaków)'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#333] rounded-xl px-4 py-3 text-sm text-black dark:text-white outline-none focus:border-amber-500 transition-colors"
          />
          {error && <p className="text-red-500 text-[11px] font-bold">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl uppercase text-[10px] tracking-widest transition-all disabled:opacity-50">
            {loading ? '...' : mode === 'login'
              ? (lang === 'EN' ? 'Sign In' : 'Zaloguj się')
              : (lang === 'EN' ? 'Create Account' : 'Utwórz konto')}
          </button>
        </form>

        {/* Przełącznik login/rejestracja */}
        <p className="text-center text-[11px] text-slate-500 mt-4">
          {mode === 'login'
            ? (lang === 'EN' ? "Don't have an account? " : 'Nie masz konta? ')
            : (lang === 'EN' ? 'Already have an account? ' : 'Masz już konto? ')}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} className="text-amber-500 font-bold hover:underline">
            {mode === 'login'
              ? (lang === 'EN' ? 'Register' : 'Zarejestruj się')
              : (lang === 'EN' ? 'Sign In' : 'Zaloguj się')}
          </button>
        </p>
      </div>
    </div>
  );
};

// =========================================================================
// WIDOK 1: GŁÓWNA PLATFORMA (VOD) — REDESIGN
// =========================================================================
const HomeView = ({ t, onLoginRequest }) => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showIban, setShowIban] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  
  const pricingRef = useRef(null);
  const DEMO_LIMIT_SECONDS = 15; 
  const YOUTUBE_VIDEO_ID = "1_1oHwOZMe4"; 

  const features = t.lang === 'EN'
    ? ['AI Avatar Creation', 'Prompt Engineering', 'Workflow Automation', 'Live Coaching']
    : ['Tworzenie Awatarów AI', 'Inżynieria Promptów', 'Automatyzacja Workflow', 'Live Coaching'];

  useEffect(() => {
    const fi = setInterval(() => setActiveFeature(p => (p + 1) % features.length), 2500);
    return () => clearInterval(fi);
  }, []);

  useEffect(() => {
    let interval;
    if (isVideoActive && !isLocked) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= DEMO_LIMIT_SECONDS - 1) {
            setIsVideoActive(false); 
            setIsLocked(true);       
            return DEMO_LIMIT_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isVideoActive, isLocked]);

  const scrollToPricing = () => { pricingRef.current?.scrollIntoView({ behavior: 'smooth' }); };
  const handlePurchase = (planName) => { setSelectedPlan(planName); setIsModalOpen(true); setShowIban(false); };
  const closeModal = () => { setIsModalOpen(false); setSelectedPlan(null); };

  return (
    <div className="font-sans flex flex-col">

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-black px-4">
        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'linear-gradient(#f59e0b 1px,transparent 1px),linear-gradient(90deg,#f59e0b 1px,transparent 1px)',backgroundSize:'60px 60px'}}/>
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"/>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"/>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"/>
            {t.lang === 'EN' ? 'AI Education Platform' : 'Platforma Edukacji AI'}
          </div>

          {/* Main headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-4 leading-[0.9] tracking-tighter">
            AI FLOW<br/>
            <span className="text-transparent bg-clip-text" style={{backgroundImage:'linear-gradient(135deg,#f59e0b,#fbbf24,#f97316)'}}>ACADEMY</span>
          </h1>

          {/* Rotating feature text */}
          <div className="h-8 mb-8 overflow-hidden">
            {features.map((f, i) => (
              <p key={f} className={`text-slate-400 text-sm uppercase tracking-[0.3em] font-bold transition-all duration-500 ${i === activeFeature ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 absolute'}`}>
                {f}
              </p>
            ))}
          </div>

          {/* Tagline */}
          <p className="text-slate-500 text-lg max-w-xl mx-auto mb-12 leading-relaxed">
            {t.home_tagline}
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button onClick={scrollToPricing} className="group relative px-8 py-4 bg-amber-500 text-black font-black text-sm uppercase tracking-widest rounded-xl overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(245,158,11,0.4)]">
              <span className="relative z-10">{t.lang === 'EN' ? '🚀 Get Full Access' : '🚀 Uzyskaj Pełny Dostęp'}</span>
              <div className="absolute inset-0 bg-amber-400 translate-y-full group-hover:translate-y-0 transition-transform duration-300"/>
            </button>
            <button onClick={() => setIsVideoActive(true)} className="px-8 py-4 border border-white/20 text-white font-bold text-sm uppercase tracking-widest rounded-xl hover:border-amber-500/50 hover:bg-white/5 transition-all flex items-center gap-2">
              <Play className="w-4 h-4 text-amber-500" />
              {t.lang === 'EN' ? 'Watch Demo' : 'Obejrzyj Demo'}
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto border-t border-white/10 pt-8">
            {[
              { n: '100+', l: t.lang === 'EN' ? 'Videos' : 'Filmów' },
              { n: '3x', l: t.lang === 'EN' ? 'Weekly Live' : 'Live/Tydzień' },
              { n: '24/7', l: t.lang === 'EN' ? 'Access' : 'Dostęp' },
            ].map(s => (
              <div key={s.n} className="text-center">
                <div className="text-2xl font-black text-amber-500">{s.n}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-600">
          <div className="w-px h-12 bg-gradient-to-b from-transparent to-amber-500/50"/>
        </div>
      </section>

      {/* ── VIDEO SECTION ─────────────────────────────────── */}
      <section className="bg-black py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[10px] text-amber-500 font-bold uppercase tracking-[0.4em] mb-3">
              {t.lang === 'EN' ? '— Featured Content —' : '— Wyróżniony Materiał —'}
            </p>
          </div>
          <div className="relative rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(245,158,11,0.15)] border border-white/5 aspect-video">
            {!isVideoActive && !isLocked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop')] bg-cover bg-center">
                <div className="absolute inset-0 bg-black/70"/>
                <button onClick={() => setIsVideoActive(true)} className="relative z-10 w-24 h-24 bg-amber-500 hover:bg-amber-400 text-black rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-[0_0_60px_rgba(245,158,11,0.5)]">
                  <Play className="w-10 h-10 ml-1" />
                </button>
                <p className="relative z-10 text-white mt-6 font-bold tracking-widest text-xs uppercase">{t.home_play_demo}</p>
              </div>
            )}
            {isVideoActive && (
              <iframe width="100%" height="100%"
                src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&mute=1&controls=1&rel=0&start=7`}
                title="AI Flow Demo" frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen className="w-full h-full absolute inset-0"/>
            )}
            {isLocked && (
              <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-6 text-center">
                <Lock className="w-12 h-12 text-amber-500 mb-4"/>
                <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter">{t.home_locked_title}</h2>
                <button onClick={scrollToPricing} className="bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 px-8 rounded-xl transition-all hover:scale-105 mt-4 uppercase text-[10px] tracking-widest">
                  {t.home_locked_btn}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── WHAT YOU GET ──────────────────────────────────── */}
      <section className="bg-[#050505] py-24 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter text-center mb-16">
            {t.lang === 'EN' ? 'What you get' : 'Co otrzymujesz'}
            <span className="text-amber-500">.</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '🎬', title: t.lang === 'EN' ? 'VOD Library' : 'Baza VOD', desc: t.lang === 'EN' ? '100+ expert videos on demand' : '100+ filmów eksperckich na żądanie' },
              { icon: '⚡', title: t.lang === 'EN' ? 'Live Coaching' : 'Live Coaching', desc: t.lang === 'EN' ? '3x per week with Damian' : '3x w tygodniu z Damianem' },
              { icon: '🤖', title: 'Prompt Builder', desc: t.lang === 'EN' ? 'Professional AI prompt studio' : 'Profesjonalne studio promptów AI' },
              { icon: '👥', title: t.lang === 'EN' ? 'Community' : 'Społeczność', desc: t.lang === 'EN' ? 'Private members group' : 'Zamknięta grupa członków' },
            ].map(card => (
              <div key={card.title} className="group p-6 bg-black border border-white/5 rounded-2xl hover:border-amber-500/30 hover:bg-amber-500/5 transition-all duration-300 cursor-default">
                <div className="text-3xl mb-4">{card.icon}</div>
                <h3 className="text-white font-bold text-sm uppercase tracking-tight mb-2">{card.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────── */}
      <section ref={pricingRef} id="pricing-section" className="bg-black py-24 px-4 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[10px] text-amber-500 font-bold uppercase tracking-[0.4em] mb-3">— {t.lang === 'EN' ? 'Simple Pricing' : 'Prosta Wycena'} —</p>
            <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">{t.home_pricing_title}</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Standard */}
            <div className="relative p-8 bg-[#0A0A0A] border border-white/10 rounded-2xl flex flex-col hover:border-white/20 transition-all">
              <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500 mb-4">{t.home_monthly_title}</h3>
              <div className="flex items-end gap-2 mb-6">
                <span className="text-5xl font-black text-white">199</span>
                <span className="text-slate-500 font-bold mb-2">PLN {t.home_monthly_per}</span>
              </div>
              <ul className="space-y-3 mb-8 flex-grow">
                {t.home_monthly_features.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-slate-400">
                    <Check className="w-4 h-4 text-amber-500 flex-shrink-0"/> {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => handlePurchase(t.home_monthly_title)} className="w-full py-3 border border-white/20 text-white font-bold rounded-xl uppercase text-[10px] tracking-widest hover:border-amber-500/50 hover:bg-amber-500/5 transition-all">
                {t.home_monthly_btn}
              </button>
            </div>

            {/* VIP */}
            <div className="relative p-8 rounded-2xl flex flex-col overflow-hidden" style={{background:'linear-gradient(135deg,#1a1200,#0d0900)',border:'1px solid rgba(245,158,11,0.4)'}}>
              <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle at 50% 0%,#f59e0b,transparent 70%)'}}/>
              <div className="absolute -top-px left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[9px] font-black uppercase tracking-widest px-4 py-1 rounded-b-lg">
                {t.home_yearly_badge}
              </div>
              <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-amber-500/70 mb-4 mt-2">{t.home_yearly_title}</h3>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-5xl font-black text-white">1800</span>
                <span className="text-amber-500/70 font-bold mb-2">PLN {t.home_yearly_per}</span>
              </div>
              <p className="text-[10px] text-amber-500/60 font-bold uppercase tracking-widest mb-6">{t.lang === 'EN' ? '= 150 PLN/month — save 25%' : '= 150 PLN/mies. — oszczędzasz 25%'}</p>
              <ul className="space-y-3 mb-8 flex-grow">
                {t.home_yearly_features.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-amber-500 flex-shrink-0"/> {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => handlePurchase(t.home_yearly_title)} className="relative w-full py-3 bg-amber-500 text-black font-black rounded-xl uppercase text-[10px] tracking-widest hover:bg-amber-400 transition-all hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]">
                {t.home_yearly_btn}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* MODAL PŁATNOŚCI */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-[#0A0A0A] rounded-2xl p-8 max-w-md w-full border border-white/10 relative shadow-2xl">
            <button onClick={closeModal} className="absolute top-4 right-4 text-slate-500 hover:text-white hover:rotate-90 transition-all"><X /></button>
            <h3 className="text-2xl font-black mb-1 text-white uppercase tracking-tighter">{t.modal_title}</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-6 font-bold">{t.modal_package} <span className="text-amber-500">{selectedPlan}</span></p>
            <div className="space-y-3">
              <button className="w-full p-4 border border-white/10 rounded-xl flex items-center gap-4 bg-black hover:border-amber-500/30 transition-colors group text-left">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform"><CreditCard className="w-6 h-6"/></div>
                <div><div className="font-bold text-sm text-white">{t.modal_auto_pay}</div><div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{t.modal_auto_pay_sub}</div></div>
              </button>
              <button onClick={() => setShowIban(!showIban)} className="w-full p-4 border border-white/10 rounded-xl flex items-center gap-4 bg-black hover:border-white/20 transition-colors group text-left">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-slate-400"><Building2 className="w-6 h-6"/></div>
                <div className="flex-grow"><div className="font-bold text-sm text-white">{t.modal_transfer}</div><div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{t.modal_transfer_sub}</div></div>
                <ChevronDown className={`text-slate-500 ${showIban ? 'rotate-180' : ''} transition-transform`}/>
              </button>
              {showIban && (
                <div className="p-4 bg-black rounded-xl text-[11px] space-y-3 text-slate-300 font-mono border border-white/10">
                  <div className="flex justify-between border-b border-white/10 pb-1"><span>IBAN (DE)</span><span className="text-amber-500 font-bold">DE89 3704 0044 0532 0130 00</span></div>
                  <div className="flex justify-between font-bold"><span>{t.modal_due}</span><span className="text-white">{selectedPlan === t.home_yearly_title ? '1800 PLN / ~420 EUR' : '199 PLN / ~46 EUR'}</span></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// WIDOK 2: TUTORIALE VOD
// =========================================================================
const VideoPreviewModal = ({ video, onClose, setCurrentView, t, user, onLoginRequest }) => {
  const isLoggedIn = user && !user.isAnonymous;

  const scrollToPayment = () => {
    onClose();
    setCurrentView('home');
    setTimeout(() => {
      const el = document.getElementById('pricing-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 400);
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 z-50 font-sans" onClick={onClose}>
      <div className="bg-black w-full max-w-3xl rounded-2xl overflow-hidden border border-[#222] shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 z-30 w-8 h-8 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="relative aspect-video w-full overflow-hidden">
          {isLoggedIn ? (
            // Zalogowany — odtwarza film
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${video.ytId}?autoplay=1&controls=1&rel=0&modestbranding=1`}
              title={video.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          ) : (
            // Niezalogowany — miniatura + paywall
            <>
              <img
                src={`https://img.youtube.com/vi/${video.ytId}/maxresdefault.jpg`}
                className="w-full h-full object-cover"
                alt={video.title}
                onError={e => e.target.src = `https://img.youtube.com/vi/${video.ytId}/hqdefault.jpg`}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="absolute inset-0 backdrop-blur-sm bg-black/75" />
                <div className="relative z-10 flex flex-col items-center px-6">
                  <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(245,158,11,0.5)]">
                    <Lock className="w-8 h-8 text-black" />
                  </div>
                  <h3 className="text-white font-extrabold text-xl uppercase tracking-tighter mb-2">
                    {t.lang === 'EN' ? 'Members Only' : 'Tylko dla członków'}
                  </h3>
                  <p className="text-slate-400 text-xs uppercase tracking-widest mb-6 max-w-xs">
                    {t.lang === 'EN' ? 'Log in or create a free account to watch' : 'Zaloguj się lub utwórz konto aby oglądać'}
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => { onClose(); onLoginRequest(); }} className="bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 px-6 rounded-xl uppercase text-[10px] tracking-widest transition-all transform hover:-translate-y-1 shadow-lg">
                      {t.lang === 'EN' ? 'Log In / Register' : 'Zaloguj / Zarejestruj'}
                    </button>
                    <button onClick={scrollToPayment} className="border border-amber-500/50 text-amber-500 font-bold py-3 px-6 rounded-xl uppercase text-[10px] tracking-widest transition-all hover:bg-amber-500/10">
                      {t.lang === 'EN' ? 'See Plans' : 'Zobacz plany'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-tight">{video.title}</h3>
            <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-1">{video.date}</p>
          </div>
          {isLoggedIn && (
            <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-bold uppercase tracking-widest">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              {t.lang === 'EN' ? 'Full Access' : 'Pełny dostęp'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TutorialsView = ({ user, setCurrentView, t, onLoginRequest }) => {
  const [tutorials, setTutorials] = useState([]);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [previewVideo, setPreviewVideo] = useState(null);
  
  const ADMIN_HASH = "138b0152acb98e5dbad52fe9ec5ba5601725884a877a84aa7e92b6a06afa8d14";

  const hashPassword = async (pass) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pass);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  useEffect(() => {
    if (!user) return;
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'tutorials');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTutorials(data);
    }, (err) => {
      console.error("Błąd bazy danych:", err.message);
    });
    return () => unsubscribe();
  }, [user]);

  const addVideo = async (e) => {
    e.preventDefault();
    const videoId = getYTId(newUrl);
    if (!videoId || !newTitle || !user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tutorials'), {
        ytId: videoId,
        title: newTitle,
        date: new Date().toISOString().split('T')[0]
      });
      setNewUrl(''); 
      setNewTitle('');
      setIsAuthorized(false); 
    } catch (err) {
      console.error("Błąd dodawania filmu:", err);
    }
  };

  const removeVideo = async (docId) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tutorials', docId));
  };

  return (
    <div className="min-h-screen bg-[#F4EFE6] dark:bg-black p-6 md:p-12 text-left font-sans transition-colors duration-700">
      <div className="max-w-[1400px] mx-auto">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-black dark:border-[#222] pb-6 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center text-black shadow-lg">
              <Youtube className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-serif text-black dark:text-white uppercase tracking-tight font-bold">{t.tut_title}</h1>
              <p className="text-[10px] uppercase tracking-[0.6em] text-amber-600 dark:text-amber-500 font-bold mt-1">{t.tut_subtitle}</p>
            </div>
          </div>

          {!isAuthorized && (
            <form onSubmit={async (e) => { e.preventDefault(); const h = await hashPassword(password); if (h === ADMIN_HASH) { setIsAuthorized(true); } else { setPassword(''); alert(t.tut_wrong_pass); } }} className="flex items-center gap-3">
              <input 
                type="password" 
                placeholder={t.tut_password_placeholder}
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="bg-white dark:bg-[#121212] border border-black dark:border-[#333] px-4 py-2 text-xs text-black dark:text-white outline-none focus:border-amber-500 transition-colors"
              />
              <button type="submit" className="p-2 bg-black dark:bg-[#1A1A1A] text-white dark:text-amber-500 border border-black dark:border-amber-500 hover:bg-amber-500 hover:text-black transition-all">
                <Key className="w-4 h-4" />
              </button>
            </form>
          )}
        </header>

        {isAuthorized && (
          <div className="mb-12 p-8 bg-white dark:bg-[#0A0A0A] border border-black dark:border-[#333] shadow-[8px_8px_0px_#5E626B] dark:shadow-none transition-all duration-500">
             <div className="flex items-center gap-3 mb-6 text-black dark:text-amber-500 text-xs uppercase font-bold tracking-widest">
               <PlusCircle className="w-4 h-4" /> {t.tut_add_title}
             </div>
             <form onSubmit={addVideo} className="grid md:grid-cols-3 gap-6">
                <input 
                  type="text" 
                  placeholder={t.tut_url_placeholder}
                  value={newUrl} 
                  onChange={e => setNewUrl(e.target.value)} 
                  className="bg-[#EBECEF] dark:bg-[#121212] px-4 py-3 text-xs font-bold border border-black dark:border-[#333] text-black dark:text-white outline-none focus:border-amber-600" 
                />
                <input 
                  type="text" 
                  placeholder={t.tut_name_placeholder}
                  value={newTitle} 
                  onChange={e => setNewTitle(e.target.value)} 
                  className="bg-[#EBECEF] dark:bg-[#121212] px-4 py-3 text-xs font-bold border border-black dark:border-[#333] text-black dark:text-white outline-none focus:border-amber-600" 
                />
                <button type="submit" className="bg-black dark:bg-[#1A1A1A] text-amber-500 dark:text-amber-500 font-bold uppercase text-[10px] tracking-widest border border-black dark:border-amber-500 hover:bg-amber-500 hover:text-black flex items-center justify-center gap-2 transition-all">
                  <Save className="w-4 h-4" /> {t.tut_save_btn}
                </button>
             </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tutorials.length === 0 && <p className="text-slate-500 text-xs font-bold uppercase tracking-widest col-span-full">{t.tut_empty}</p>}
          {tutorials.map((v) => (
            <div key={v.id} className="group cursor-pointer bg-white dark:bg-[#0A0A0A] border border-black dark:border-[#222] shadow-[4px_4px_0px_#5E626B] dark:shadow-none transition-all duration-300 hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_#5E626B] dark:hover:border-amber-500/50 flex flex-col">
              <div className="relative aspect-video overflow-hidden border-b border-black dark:border-[#222]" onClick={() => setPreviewVideo(v)}>
                <img src={`https://img.youtube.com/vi/${v.ytId}/maxresdefault.jpg`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={v.title} onError={e => e.target.src=`https://img.youtube.com/vi/${v.ytId}/hqdefault.jpg`} />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-16 h-16 bg-amber-500/90 rounded-full flex items-center justify-center text-black"><Lock className="w-8 h-8" /></div>
                </div>
              </div>
              <div className="p-5 flex justify-between items-start flex-grow">
                <div>
                  <h3 className="text-sm font-bold text-black dark:text-white mb-2 line-clamp-2 uppercase tracking-tight leading-snug">{v.title}</h3>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{v.date}</div>
                </div>
                {isAuthorized && (
                  <button onClick={() => removeVideo(v.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            </div>
          ))}
        </div>

        {previewVideo && <VideoPreviewModal video={previewVideo} onClose={() => setPreviewVideo(null)} setCurrentView={setCurrentView} t={t} user={user} onLoginRequest={onLoginRequest} />}
      </div>
    </div>
  );
};

// =========================================================================
// WIDOK 3: KREATOR PROMPTÓW
// =========================================================================
const PromptBuilderView = ({ t }) => {
  const [copied, setCopied] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCopied, setAiCopied] = useState(false);

  const generateAiPrompt = async () => {
    setAiLoading(true);
    setAiPrompt('');
    const rawPrompt = generatePrompt();
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are an expert AI image prompt engineer specializing in both Midjourney and Stable Diffusion / FLUX prompts.

Based on the following raw parameters selected by the user, generate ONE single cohesive, professional, highly detailed image generation prompt that works universally for both Midjourney and Stable Diffusion/FLUX.

Raw parameters: ${rawPrompt}

Rules:
- Write ONLY the final prompt, nothing else — no explanations, no labels, no preamble
- Make it flow naturally as one continuous descriptive text
- Include lighting, mood, photography style, camera angle, quality tags
- Add relevant artistic and technical quality keywords (e.g. 8k, RAW photo, sharp focus, cinematic lighting, bokeh, etc.)
- The prompt should be 80–150 words
- Write entirely in English`
          }]
        })
      });
      const data = await response.json();
      const text = data.content?.map(i => i.text || '').join('') || '';
      setAiPrompt(text.trim());
    } catch (err) {
      setAiPrompt('Error generating prompt. Please try again.');
    }
    setAiLoading(false);
  };

  const handleAiCopy = () => {
    navigator.clipboard.writeText(aiPrompt).then(() => {
      setAiCopied(true);
      setTimeout(() => setAiCopied(false), 2000);
    });
  };

  const [subject, setSubject] = useState('1girl, beautiful woman');
  const [bodyType, setBodyType] = useState('slim and toned body');
  const [breastSize, setBreastSize] = useState('medium breasts');
  const [lowerAnatomy, setLowerAnatomy] = useState('none'); 
  const [bodyHair, setBodyHair] = useState('none'); 
  const [faceSelect, setFaceSelect] = useState('detailed symmetrical face, sharp features, natural skin');
  const [hairLength, setHairLength] = useState('long');
  const [hairColor, setHairColor] = useState('blonde');
  const [hairStyle, setHairStyle] = useState('elegant updo hair, wedding style, revealing ears and earrings');
  const [shoes, setShoes] = useState('elegant high heels, stilettos');
  const [topClothing, setTopClothing] = useState('casual white t-shirt');
  const [bottomClothing, setBottomClothing] = useState('blue denim jeans');
  const [legwear, setLegwear] = useState('none');
  const [bgSelect, setBgSelect] = useState('luxurious mansion interior, marble floors');

  const generatePrompt = () => {
    const parts = [
      "full body shot", subject, bodyType, breastSize, 
      lowerAnatomy !== 'none' ? lowerAnatomy : '',
      bodyHair !== 'none' ? bodyHair : '',
      faceSelect, "stunning detailed eyes", 
      `${hairLength} ${hairColor} ${hairStyle}`, 
      topClothing, bottomClothing, 
      legwear !== 'none' ? legwear : '',
      shoes, "wearing luxury pearl drop earrings", "cat eyes, sharp winged eyeliner",
      bgSelect, "photorealistic, 8k resolution", 'masterpiece, high-end fashion photography, ultra-detailed, sharp focus, cinematic lighting'
    ];
    return parts.filter(part => part && part.trim() !== '').join(', ');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatePrompt()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const sectionClass = "bg-[#FCFBF9] dark:bg-[#0A0A0A] border border-black dark:border-[#222] p-5 relative shadow-[4px_4px_0px_#5E626B] dark:shadow-none mb-6 transition-all duration-500 font-sans";
  const labelClass = "block text-[9px] uppercase tracking-widest text-[#5E626B] dark:text-[#888] mb-1.5 font-bold";
  const inputClass = "w-full bg-[#EBECEF] dark:bg-[#121212] border border-black dark:border-[#333] px-3 py-2 text-xs dark:text-[#E5E0D8] focus:border-amber-600 focus:outline-none transition-all font-bold appearance-none";
  const headerClass = "text-xs font-serif italic tracking-widest text-black dark:text-amber-500 mb-5 flex items-center gap-2 border-b border-black dark:border-[#222] pb-3 uppercase";

  return (
    <div className="pb-20 p-2 md:p-8 bg-[#F4EFE6] dark:bg-black transition-colors duration-700 min-h-screen text-left">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8 font-sans">
        <div className="lg:col-span-3">
          <div className="mb-10 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-black dark:border-[#222] pb-6 gap-4">
            <h1 className="text-3xl font-serif text-black dark:text-white flex items-center gap-3">
              <Crown className="w-8 h-8 text-amber-600 dark:text-amber-500" />
              {t.studio_title} <span className="text-[10px] bg-amber-500 text-black px-2 py-1 ml-2 font-bold uppercase tracking-widest relative -top-1">{t.studio_edition}</span>
            </h1>
          </div>

          <div className={sectionClass}>
            <h2 className={headerClass}><PersonStanding className="w-4 h-4" /> I. Form & Anatomy</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className={labelClass}>{t.studio_subject_label}</label>
                <div className="relative">
                  <select value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass}>
                    <option value="1girl, beautiful woman">{t.lang === 'EN' ? '1 Woman' : '1 Kobieta'}</option>
                    <option value="1boy, handsome man">{t.lang === 'EN' ? '1 Man' : '1 Mężczyzna'}</option>
                    <option value="2girls, beautiful women">{t.lang === 'EN' ? '2 Women' : '2 Kobiety'}</option>
                    <option value="1boy and 1girl, couple">{t.lang === 'EN' ? 'Couple (M+F)' : 'Para (K+M)'}</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelClass}>{t.studio_body_label}</label>
                <div className="relative">
                  <select value={bodyType} onChange={(e) => setBodyType(e.target.value)} className={inputClass}>
                    <option value="slim and toned body">{t.lang === 'EN' ? 'Slim' : 'Szczupła'}</option>
                    <option value="curvy, hourglass figure">{t.lang === 'EN' ? 'Hourglass' : 'Klepsydra'}</option>
                    <option value="athletic, muscular body">{t.lang === 'EN' ? 'Athletic' : 'Atletyczna'}</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelClass}>{t.studio_breast_label}</label>
                <div className="relative">
                  <select value={breastSize} onChange={(e) => setBreastSize(e.target.value)} className={inputClass}>
                    <option value="small breasts">{t.lang === 'EN' ? 'Small' : 'Mały'}</option>
                    <option value="medium breasts">{t.lang === 'EN' ? 'Medium' : 'Średni'}</option>
                    <option value="large heavy breasts">{t.lang === 'EN' ? 'Large' : 'Duży'}</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelClass}>{t.studio_lower_label}</label>
                <div className="relative">
                  <select value={lowerAnatomy} onChange={(e) => setLowerAnatomy(e.target.value)} className={inputClass}>
                    <option value="none">Standard</option>
                    <option value="noticeable crotch bulge">Bulge (M)</option>
                    <option value="cameltoe">Cameltoe (F)</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelClass}>{t.studio_hair_body_label}</label>
                <div className="relative">
                  <select value={bodyHair} onChange={(e) => setBodyHair(e.target.value)} className={inputClass}>
                    <option value="none">{t.lang === 'EN' ? 'Smooth' : 'Gładkie'}</option>
                    <option value="light body hair">{t.lang === 'EN' ? 'Light' : 'Lekkie'}</option>
                    <option value="hairy body">{t.lang === 'EN' ? 'Heavy' : 'Mocne'}</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          <div className={sectionClass}>
            <h2 className={headerClass}><User className="w-4 h-4" /> II. Visage & Hair</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>{t.studio_hairstyle_label}</label>
                <div className="relative">
                  <select value={hairStyle} onChange={(e) => setHairStyle(e.target.value)} className={inputClass}>
                    <option value="elegant updo hair, wedding style">{t.lang === 'EN' ? 'Wedding Updo' : 'Upięcie ślubne'}</option>
                    <option value="high bun hair, sleek look">{t.lang === 'EN' ? 'High Bun' : 'Wysoki kok'}</option>
                    <option value="tied in a ponytail">{t.lang === 'EN' ? 'Ponytail' : 'Kucyk'}</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelClass}>{t.studio_hair_color_label}</label>
                <div className="relative">
                  <select value={hairColor} onChange={(e) => setHairColor(e.target.value)} className={inputClass}>
                    <option value="blonde">{t.lang === 'EN' ? 'Blonde' : 'Blond'}</option>
                    <option value="brunette">{t.lang === 'EN' ? 'Brunette' : 'Brązowe'}</option>
                    <option value="black">{t.lang === 'EN' ? 'Black' : 'Czarne'}</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelClass}>{t.studio_hair_length_label}</label>
                <div className="relative">
                  <select value={hairLength} onChange={(e) => setHairLength(e.target.value)} className={inputClass}>
                    <option value="short">{t.lang === 'EN' ? 'Short' : 'Krótkie'}</option>
                    <option value="long">{t.lang === 'EN' ? 'Long' : 'Długie'}</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelClass}>{t.studio_face_label}</label>
                <div className="relative">
                  <select value={faceSelect} onChange={(e) => setFaceSelect(e.target.value)} className={inputClass}>
                    <option value="detailed symmetrical face, sharp features, natural skin">{t.lang === 'EN' ? 'Classic' : 'Klasyczna'}</option>
                    <option value="cute face, freckles">{t.lang === 'EN' ? 'Freckles' : 'Piegi'}</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          <div className={sectionClass}>
            <h2 className={headerClass}><Shirt className="w-4 h-4" /> III. Haute Couture</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>{t.studio_top_label}</label>
                <div className="relative">
                  <select value={topClothing} onChange={(e) => setTopClothing(e.target.value)} className={inputClass}>
                    <option value="casual white t-shirt">T-shirt</option>
                    <option value="suit jacket, formal">{t.lang === 'EN' ? 'Blazer' : 'Marynarka'}</option>
                    <option value="bikini top">Bikini</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelClass}>{t.studio_bottom_label}</label>
                <div className="relative">
                  <select value={bottomClothing} onChange={(e) => setBottomClothing(e.target.value)} className={inputClass}>
                    <option value="blue denim jeans">{t.lang === 'EN' ? 'Jeans' : 'Jeansy'}</option>
                    <option value="mini skirt">{t.lang === 'EN' ? 'Mini Skirt' : 'Mini'}</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelClass}>{t.studio_shoes_label}</label>
                <div className="relative">
                  <select value={shoes} onChange={(e) => setShoes(e.target.value)} className={inputClass}>
                    <option value="elegant high heels, stilettos">{t.lang === 'EN' ? 'Heels' : 'Szpilki'}</option>
                    <option value="modern sneakers">{t.lang === 'EN' ? 'Sneakers' : 'Sportowe'}</option>
                    <option value="barefoot">{t.lang === 'EN' ? 'Barefoot' : 'Boso'}</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelClass}>{t.studio_legs_label}</label>
                <div className="relative">
                  <select value={legwear} onChange={(e) => setLegwear(e.target.value)} className={inputClass}>
                    <option value="none">{t.lang === 'EN' ? 'Bare' : 'Gołe'}</option>
                    <option value="pantyhose">{t.lang === 'EN' ? 'Pantyhose' : 'Rajstopy'}</option>
                    <option value="stockings with lace">{t.lang === 'EN' ? 'Stockings' : 'Pończochy'}</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* ===== SEKCJA AI ===== */}
          <div className={sectionClass}>
            <h2 className={headerClass}><Sparkles className="w-4 h-4" /> IV. AI Prompt Generator</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6 font-bold">
              {t.lang === 'EN'
                ? 'Let AI analyze your selections and generate a professional prompt optimized for Midjourney & Stable Diffusion / FLUX.'
                : 'Pozwól AI przeanalizować Twoje wybory i wygenerować profesjonalny prompt zoptymalizowany pod Midjourney & SD / FLUX.'}
            </p>

            <button
              onClick={generateAiPrompt}
              disabled={aiLoading}
              className={`w-full py-4 font-bold text-[10px] uppercase tracking-widest border transition-all flex items-center justify-center gap-3 mb-6 ${aiLoading ? 'bg-slate-200 dark:bg-[#1A1A1A] text-slate-400 border-slate-300 dark:border-[#333] cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-400 text-black border-amber-500 shadow-[4px_4px_0px_black] dark:shadow-none hover:-translate-y-0.5'}`}
            >
              {aiLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  {t.lang === 'EN' ? 'AI is thinking...' : 'AI generuje...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {t.lang === 'EN' ? '✦ Generate AI Prompt' : '✦ Generuj AI Prompt'}
                </>
              )}
            </button>

            {aiPrompt && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="bg-[#EBECEF] dark:bg-[#0D0D0D] border border-black dark:border-amber-500/30 p-5 font-mono text-[11px] leading-relaxed text-black dark:text-[#E5E0D8] mb-4 shadow-inner relative">
                  <div className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">AI ✦</div>
                  <span className="text-amber-600 dark:text-amber-500 font-bold select-none">{`> `}</span>
                  {aiPrompt}
                </div>
                <button
                  onClick={handleAiCopy}
                  className={`w-full py-3 font-bold text-[10px] uppercase tracking-widest border transition-all ${aiCopied ? 'bg-emerald-500 text-black border-emerald-500 shadow-none' : 'bg-black dark:bg-[#1A1A1A] text-white dark:text-amber-500 border-black dark:border-amber-500 hover:bg-amber-500 hover:text-black shadow-[4px_4px_0px_black] dark:shadow-none'}`}
                >
                  {aiCopied
                    ? (t.lang === 'EN' ? '✓ Copied!' : '✓ Skopiowano!')
                    : (t.lang === 'EN' ? 'Copy AI Prompt' : 'Kopiuj AI Prompt')}
                </button>
              </div>
            )}
          </div>

        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 font-sans text-left">
            <div className="bg-[#FCFBF9] dark:bg-[#0A0A0A] border border-black dark:border-[#333] p-6 shadow-[8px_8px_0px_#5E626B] dark:shadow-none transition-colors duration-500">
              <h2 className="text-[10px] font-bold tracking-widest mb-4 border-b border-black dark:border-[#333] pb-2 text-black dark:text-amber-500 uppercase">{t.studio_compile}</h2>
              <div className="bg-[#EBECEF] dark:bg-[#121212] p-5 min-h-[400px] text-black dark:text-[#E5E0D8] font-mono text-[11px] leading-relaxed break-words border border-black dark:border-[#222] mb-6 shadow-inner">
                <span className="text-amber-600 dark:text-amber-500 font-bold select-none">{`> `}</span>{generatePrompt()}
              </div>
              <button onClick={handleCopy} className={`w-full py-4 font-bold text-[10px] uppercase tracking-widest border border-black dark:border-amber-500 transition-all ${copied ? 'bg-emerald-500 text-black shadow-none' : 'bg-black dark:bg-[#1A1A1A] text-white dark:text-amber-500 hover:bg-amber-500 hover:text-black shadow-[4px_4px_0px_black] dark:shadow-none'}`}>
                {copied ? t.studio_copied : t.studio_export}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


// =========================================================================
// UNDER CONSTRUCTION
// =========================================================================
const UnderConstruction = ({ t }) => (
  <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-8 font-sans">
    <div className="max-w-lg">
      <div className="text-6xl mb-6">🚧</div>
      <h1 className="text-3xl md:text-5xl font-extrabold uppercase tracking-tighter text-white mb-4">
        Under Construction
      </h1>
      <p className="text-slate-400 text-sm uppercase tracking-widest font-bold mb-2">
        {t.lang === 'EN' ? 'This section is coming soon.' : 'Ta sekcja jest w przygotowaniu.'}
      </p>
      <p className="text-slate-600 text-xs uppercase tracking-widest font-bold">
        AI Flow Academy — 2026
      </p>
    </div>
  </div>
);

// =========================================================================
// GŁÓWNY KOMPONENT APP
// =========================================================================
export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState('PL');
  const [cookiesAccepted, setCookiesAccepted] = useState(() => localStorage.getItem('cookies') === '1');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSent, setNewsletterSent] = useState(false);
  const [digitalConsent, setDigitalConsent] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const t = { ...translations[lang], lang };
  const isLoggedIn = user && !user.isAnonymous;

  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("Auth error:", err));
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleCookies = (accepted) => {
    setCookiesAccepted(true);
    if (accepted) localStorage.setItem('cookies', '1');
  };

  const handleNewsletter = async (e) => {
    e.preventDefault();
    if (!newsletterEmail || !user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'newsletter'), {
        email: newsletterEmail,
        date: new Date().toISOString(),
        consent: true
      });
      setNewsletterSent(true);
      setNewsletterEmail('');
    } catch (err) {
      console.error("Newsletter error:", err);
    }
  };

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-black transition-colors duration-700 font-sans selection:bg-amber-500 selection:text-black">
        {/* NAV */}
        <nav className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-4 font-sans" style={{background:'rgba(0,0,0,0.85)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('home')}>
              <img src="/logo.png" alt="AI Flow" className="h-8 w-auto" />
            </div>
            <div className="flex items-center gap-2">
              {/* Nav tabs */}
              <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}>
                {[['home', t.nav_academy], ['tutorials', t.nav_tutorials], ['prompt-builder', t.nav_studio]].map(([view, label]) => (
                  <button key={view} onClick={() => setCurrentView(view)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${currentView === view ? 'bg-amber-500 text-black' : 'text-white/40 hover:text-white/80'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <LangSwitcher lang={lang} setLang={setLang} />
              {isLoggedIn ? (
                <button onClick={() => signOut(auth)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-emerald-400 text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-emerald-500/10" style={{border:'1px solid rgba(52,211,153,0.2)'}}>
                  <User className="w-4 h-4" />
                  <span className="hidden sm:block">{user.email?.split('@')[0] || 'Konto'}</span>
                </button>
              ) : (
                <button onClick={() => setShowLogin(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:block">{lang === 'EN' ? 'Log In' : 'Zaloguj'}</span>
                </button>
              )}
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-9 h-9 flex items-center justify-center rounded-xl text-white/40 hover:text-amber-400 transition-colors" style={{border:'1px solid rgba(255,255,255,0.08)'}}>
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </nav>

        <main className="pt-16">
          {currentView === 'home' && <HomeView t={t} />}
          {currentView === 'tutorials' && <UnderConstruction t={t} />}
          {currentView === 'prompt-builder' && <UnderConstruction t={t} />}
          {currentView === 'impressum' && <ImpressumView setCurrentView={setCurrentView} lang={lang} />}
          {currentView === 'datenschutz' && <DatenschutzView setCurrentView={setCurrentView} lang={lang} />}
          {currentView === 'regulamin' && <RegulaminView setCurrentView={setCurrentView} lang={lang} />}
        </main>

        {/* MODAL LOGOWANIA */}
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} lang={lang} />}

        <footer className="bg-black border-t font-sans" style={{borderColor:'rgba(255,255,255,0.06)'}}>
          <div className="max-w-[1400px] mx-auto px-6 py-16 flex flex-col gap-12">

            {/* Top row */}
            <div className="flex flex-col md:flex-row justify-between gap-12">
              {/* Brand */}
              <div className="max-w-xs">
                <img src="/logo.png" alt="AI Flow" className="h-8 w-auto mb-4" />
                <p className="text-[11px] text-white/30 leading-relaxed">
                  {lang === 'EN' ? 'Professional AI education platform for creators, coaches and entrepreneurs.' : 'Profesjonalna platforma edukacji AI dla twórców, coachów i przedsiębiorców.'}
                </p>
              </div>

              {/* Newsletter */}
              <div className="max-w-sm w-full">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-white mb-1">{lang === 'EN' ? 'Stay updated' : 'Bądź na bieżąco'}</p>
                <p className="text-[10px] text-white/30 mb-4">{lang === 'EN' ? 'Marketing updates from AI Flow Academy.' : 'Aktualizacje marketingowe od AI Flow Academy.'}</p>
                {newsletterSent ? (
                  <p className="text-emerald-400 font-bold text-[11px] uppercase tracking-widest">✓ {lang === 'EN' ? 'Thank you!' : 'Dziękujemy!'}</p>
                ) : (
                  <form onSubmit={handleNewsletter} className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input type="email" required placeholder={lang === 'EN' ? 'Email address' : 'Adres email'} value={newsletterEmail} onChange={e => setNewsletterEmail(e.target.value)}
                        className="flex-grow bg-white/5 border px-3 py-2.5 text-xs text-white outline-none focus:border-amber-500 transition-colors rounded-lg" style={{borderColor:'rgba(255,255,255,0.1)'}} />
                      <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] uppercase tracking-widest px-4 rounded-lg transition-colors">
                        {lang === 'EN' ? 'Join' : 'Dołącz'}
                      </button>
                    </div>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" required className="mt-0.5 accent-amber-500" />
                      <span className="text-[9px] text-white/25 leading-relaxed">
                        {lang === 'EN' ? 'I agree to marketing communications. ' : 'Zgadzam się na komunikaty marketingowe. '}
                        <button type="button" onClick={() => setCurrentView('datenschutz')} className="text-amber-500 underline">{lang === 'EN' ? 'Privacy Policy' : 'Polityka Prywatności'}</button>
                      </span>
                    </label>
                  </form>
                )}
              </div>
            </div>

            {/* Bottom row */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>
              <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold">{t.footer_copy}</p>
              <div className="flex items-center gap-6">
                {[['impressum','Impressum'], ['datenschutz', lang==='EN'?'Privacy':'Datenschutz'], ['regulamin', lang==='EN'?'Terms':'Regulamin']].map(([view, label]) => (
                  <button key={view} onClick={() => setCurrentView(view)} className="text-[9px] text-white/20 uppercase tracking-widest font-bold hover:text-amber-500 transition-colors">{label}</button>
                ))}
              </div>
            </div>
          </div>
        </footer>

        {/* COOKIE BANNER */}
        {!cookiesAccepted && (
          <div className="fixed bottom-0 left-0 right-0 z-50 p-4 font-sans" style={{background:'rgba(0,0,0,0.95)',backdropFilter:'blur(20px)',borderTop:'1px solid rgba(245,158,11,0.2)'}}>
            <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center gap-4 justify-between">
              <p className="text-[11px] text-white/50 leading-relaxed max-w-2xl">
                🍪 {lang === 'EN' ? 'We use cookies and collect emails for contact and marketing. By continuing you accept our ' : 'Używamy cookies i zbieramy emaile w celach kontaktowych i marketingowych. Kontynuując akceptujesz naszą '}
                <button onClick={() => setCurrentView('datenschutz')} className="text-amber-500 underline font-bold">{lang === 'EN' ? 'Privacy Policy' : 'Politykę Prywatności'}</button>.
              </p>
              <div className="flex gap-3 flex-shrink-0">
                <button onClick={() => handleCookies(true)} className="bg-amber-500 text-black font-black text-[10px] uppercase tracking-widest px-6 py-2 rounded-lg hover:bg-amber-400 transition-colors">
                  {lang === 'EN' ? 'Accept' : 'Akceptuję'}
                </button>
                <button onClick={() => handleCookies(false)} className="text-white/40 font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg hover:text-white/60 transition-colors" style={{border:'1px solid rgba(255,255,255,0.1)'}}>
                  {lang === 'EN' ? 'Reject' : 'Odrzuć'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// =========================================================================
// STRONA: IMPRESSUM
// =========================================================================
const ImpressumView = ({ setCurrentView, lang }) => (
  <div className="min-h-screen bg-white dark:bg-black p-6 md:p-16 font-sans transition-colors duration-500">
    <div className="max-w-3xl mx-auto">
      <button onClick={() => setCurrentView('home')} className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-8 flex items-center gap-2 hover:gap-3 transition-all">← {lang === 'EN' ? 'Back' : 'Powrót'}</button>
      <h1 className="text-3xl font-extrabold uppercase tracking-tighter text-black dark:text-white mb-10 border-b border-black dark:border-[#222] pb-6">Impressum</h1>
      <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        <div><h2 className="font-bold uppercase text-[10px] tracking-widest text-amber-600 dark:text-amber-500 mb-2">Angaben gemäß § 5 TMG</h2><p>DDC – Dienstleistungen Damian Chlad<br />Garteler Weg 38<br />27711 Osterholz-Scharmbeck<br />Deutschland</p></div>
        <div><h2 className="font-bold uppercase text-[10px] tracking-widest text-amber-600 dark:text-amber-500 mb-2">Kontakt</h2><p>Telefon: +49 151 66396941<br />E-Mail: info@loveaiflow.com</p></div>
        <div><h2 className="font-bold uppercase text-[10px] tracking-widest text-amber-600 dark:text-amber-500 mb-2">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2><p>Damian Chlad<br />Garteler Weg 38<br />27711 Osterholz-Scharmbeck</p></div>
        <div><h2 className="font-bold uppercase text-[10px] tracking-widest text-amber-600 dark:text-amber-500 mb-2">Streitschlichtung</h2><p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr" className="text-amber-500 underline" target="_blank" rel="noreferrer">https://ec.europa.eu/consumers/odr</a>. Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p></div>
      </div>
    </div>
  </div>
);

// =========================================================================
// STRONA: DATENSCHUTZ / POLITYKA PRYWATNOŚCI
// =========================================================================
const DatenschutzView = ({ setCurrentView, lang }) => (
  <div className="min-h-screen bg-white dark:bg-black p-6 md:p-16 font-sans transition-colors duration-500">
    <div className="max-w-3xl mx-auto">
      <button onClick={() => setCurrentView('home')} className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-8 flex items-center gap-2 hover:gap-3 transition-all">← {lang === 'EN' ? 'Back' : 'Powrót'}</button>
      <h1 className="text-3xl font-extrabold uppercase tracking-tighter text-black dark:text-white mb-10 border-b border-black dark:border-[#222] pb-6">{lang === 'EN' ? 'Privacy Policy' : 'Datenschutzerklärung / Polityka Prywatności'}</h1>
      <div className="space-y-8 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        <div><h2 className="font-bold uppercase text-[10px] tracking-widest text-amber-600 dark:text-amber-500 mb-2">{lang === 'EN' ? '1. Data Controller' : '1. Administrator Danych'}</h2><p>DDC – Dienstleistungen Damian Chlad, Garteler Weg 38, 27711 Osterholz-Scharmbeck<br />E-Mail: info@loveaiflow.com | Tel: +49 151 66396941</p></div>
        <div><h2 className="font-bold uppercase text-[10px] tracking-widest text-amber-600 dark:text-amber-500 mb-2">{lang === 'EN' ? '2. Data We Collect' : '2. Jakie dane zbieramy'}</h2><p>{lang === 'EN' ? 'We collect email addresses provided voluntarily via our newsletter form. We also collect technical data (IP address, browser type) via cookies for website operation and security.' : 'Zbieramy adresy e-mail podawane dobrowolnie przez formularz newslettera. Zbieramy również dane techniczne (adres IP, typ przeglądarki) poprzez pliki cookie w celu działania i bezpieczeństwa strony.'}</p></div>
        <div><h2 className="font-bold uppercase text-[10px] tracking-widest text-amber-600 dark:text-amber-500 mb-2">{lang === 'EN' ? '3. Purpose of Processing' : '3. Cel przetwarzania'}</h2><p>{lang === 'EN' ? 'Email addresses are processed for: (a) direct contact regarding your subscription, (b) marketing communications about AI Flow Academy. Legal basis: Art. 6(1)(a) GDPR – consent.' : 'Adresy e-mail przetwarzamy w celu: (a) kontaktu w sprawie subskrypcji, (b) wysyłania komunikatów marketingowych AI Flow Academy. Podstawa prawna: art. 6 ust. 1 lit. a RODO – zgoda.'}</p></div>
        <div><h2 className="font-bold uppercase text-[10px] tracking-widest text-amber-600 dark:text-amber-500 mb-2">{lang === 'EN' ? '4. Your Rights (GDPR)' : '4. Twoje prawa (RODO)'}</h2><p>{lang === 'EN' ? 'You have the right to access, rectify, erase your data, restrict processing, data portability, and withdraw consent at any time. Contact: info@loveaiflow.com' : 'Masz prawo do dostępu, sprostowania, usunięcia danych, ograniczenia przetwarzania, przenoszenia danych oraz cofnięcia zgody. Kontakt: info@loveaiflow.com'}</p></div>
        <div><h2 className="font-bold uppercase text-[10px] tracking-widest text-amber-600 dark:text-amber-500 mb-2">{lang === 'EN' ? '5. Cookies & Firebase' : '5. Cookies i Firebase'}</h2><p>{lang === 'EN' ? 'We use technically necessary cookies and Firebase (Google) for anonymous authentication and database services (region: europe-west3, EU).' : 'Używamy technicznie niezbędnych plików cookie oraz Firebase (Google) do uwierzytelniania i bazy danych (region: europe-west3, UE).'}</p></div>
        <div><h2 className="font-bold uppercase text-[10px] tracking-widest text-amber-600 dark:text-amber-500 mb-2">{lang === 'EN' ? '6. Complaints' : '6. Skargi'}</h2><p>{lang === 'EN' ? 'You may lodge a complaint with: Der Bundesbeauftragte für den Datenschutz und die Informationsfreiheit (BfDI), Graurheindorfer Str. 153, 53117 Bonn.' : 'Możesz złożyć skargę do: Der Bundesbeauftragte für den Datenschutz und die Informationsfreiheit (BfDI), Graurheindorfer Str. 153, 53117 Bonn.'}</p></div>
      </div>
    </div>
  </div>
);

// =========================================================================
// STRONA: REGULAMIN
// =========================================================================
const RegulaminView = ({ setCurrentView, lang }) => (
  <div className="min-h-screen bg-white dark:bg-black p-6 md:p-16 font-sans transition-colors duration-500">
    <div className="max-w-3xl mx-auto">
      <button onClick={() => setCurrentView('home')} className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-8 flex items-center gap-2 hover:gap-3 transition-all">← {lang === 'EN' ? 'Back' : 'Powrót'}</button>
      <h1 className="text-3xl font-extrabold uppercase tracking-tighter text-black dark:text-white mb-10 border-b border-black dark:border-[#222] pb-6">{lang === 'EN' ? 'Terms & Conditions' : 'Regulamin'}</h1>
      <div className="space-y-8 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        <div><h2 className="font-bold uppercase text-[10px] tracking-widest text-amber-600 dark:text-amber-500 mb-2">{lang === 'EN' ? '1. Provider' : '1. Usługodawca'}</h2><p>DDC – Dienstleistungen Damian Chlad, Garteler Weg 38, 27711 Osterholz-Scharmbeck. E-Mail: info@loveaiflow.com | Tel: +49 151 66396941</p></div>
        <div><h2 className="font-bold uppercase text-[10px] tracking-widest text-amber-600 dark:text-amber-500 mb-2">{lang === 'EN' ? '2. Subject' : '2. Przedmiot umowy'}</h2><p>{lang === 'EN' ? 'AI Flow Academy provides access to digital educational content (VOD, coaching, tools) via subscription, delivered exclusively online.' : 'AI Flow Academy udostępnia dostęp do cyfrowych treści edukacyjnych (VOD, coaching, narzędzia) w ramach subskrypcji, świadczonej wyłącznie online.'}</p></div>
        <div><h2 className="font-bold uppercase text-[10px] tracking-widest text-amber-600 dark:text-amber-500 mb-2">{lang === 'EN' ? '3. Pricing & Auto-Renewal' : '3. Ceny i automatyczne odnowienie'}</h2><p>{lang === 'EN' ? 'Monthly plan: 199 PLN/month, cancellable anytime. Annual VIP: 1800 PLN/year, paid in advance. The annual plan renews automatically unless cancelled at least 14 days before renewal.' : 'Plan miesięczny: 199 PLN/mies., rezygnacja w dowolnym momencie. Plan roczny VIP: 1800 PLN/rok, płatny z góry. Plan roczny odnawia się automatycznie, chyba że zostanie wypowiedziany co najmniej 14 dni przed datą odnowienia.'}</p></div>
        <div>
          <h2 className="font-bold uppercase text-[10px] tracking-widest text-amber-600 dark:text-amber-500 mb-2">{lang === 'EN' ? '4. Right of Withdrawal — Digital Content' : '4. Prawo odstąpienia — treści cyfrowe'}</h2>
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-lg">
            <p className="font-bold text-amber-600 dark:text-amber-500 mb-2">⚠️ {lang === 'EN' ? 'Important:' : 'Ważne:'}</p>
            <p>{lang === 'EN' ? 'By completing your purchase and checking the consent box, you expressly agree to the immediate commencement of the digital service and acknowledge that you thereby waive your right of withdrawal pursuant to § 356(5) BGB / Art. 16(m) Directive 2011/83/EU.' : 'Dokonując zakupu i zaznaczając checkbox zgody, wyraźnie wyrażasz zgodę na natychmiastowe rozpoczęcie świadczenia usługi cyfrowej i przyjmujesz do wiadomości, że tym samym tracisz prawo odstąpienia od umowy zgodnie z § 356 ust. 5 BGB / art. 16 lit. m dyrektywy 2011/83/UE.'}</p>
          </div>
        </div>
        <div><h2 className="font-bold uppercase text-[10px] tracking-widest text-amber-600 dark:text-amber-500 mb-2">{lang === 'EN' ? '5. Cancellation' : '5. Rezygnacja'}</h2><p>{lang === 'EN' ? 'Cancel anytime by email: info@loveaiflow.com. Access continues until end of paid period. Annual plan: cancel 14+ days before renewal.' : 'Rezygnacja w dowolnym momencie przez e-mail: info@loveaiflow.com. Dostęp trwa do końca opłaconego okresu. Plan roczny: wypowiedzenie 14+ dni przed odnowieniem.'}</p></div>
        <div><h2 className="font-bold uppercase text-[10px] tracking-widest text-amber-600 dark:text-amber-500 mb-2">{lang === 'EN' ? '6. Governing Law' : '6. Prawo właściwe'}</h2><p>{lang === 'EN' ? 'German law applies. Jurisdiction: Osterholz-Scharmbeck, Germany.' : 'Stosuje się prawo niemieckie. Sąd właściwy: Osterholz-Scharmbeck, Niemcy.'}</p></div>
      </div>
    </div>
  </div>
);
