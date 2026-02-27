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
  const [activeFeature, setActiveFeature] = useState(0);
  
  const pricingRef = useRef(null);
  const YOUTUBE_VIDEO_ID = "1_1oHwOZMe4"; 

  const features = t.lang === 'EN'
    ? ['AI Avatar Creation', 'Prompt Engineering', 'Workflow Automation', 'Live Coaching']
    : ['Tworzenie Awatarów AI', 'Inżynieria Promptów', 'Automatyzacja Workflow', 'Live Coaching'];

  useEffect(() => {
    const fi = setInterval(() => setActiveFeature(p => (p + 1) % features.length), 4000);
    return () => clearInterval(fi);
  }, []);

  const scrollToPricing = () => { pricingRef.current?.scrollIntoView({ behavior: 'smooth' }); };
  const handlePurchase = (planName) => { setSelectedPlan(planName); setIsModalOpen(true); setShowIban(false); };
  const closeModal = () => { setIsModalOpen(false); setSelectedPlan(null); };

  return (
    <div className="font-sans flex flex-col">

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-white dark:bg-black px-4 transition-colors duration-700">
        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.04]" style={{backgroundImage:'linear-gradient(#f59e0b 1px,transparent 1px),linear-gradient(90deg,#f59e0b 1px,transparent 1px)',backgroundSize:'60px 60px'}}/>
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"/>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"/>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"/>
            {t.lang === 'EN' ? 'AI Education Platform' : 'Platforma Edukacji AI'}
          </div>

          {/* Main headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-black dark:text-white mb-4 leading-[0.9] tracking-tighter">
            AI FLOW<br/>
            <span className="text-transparent bg-clip-text" style={{backgroundImage:'linear-gradient(135deg,#f59e0b,#fbbf24,#f97316)'}}>ACADEMY</span>
          </h1>

          {/* Rotating feature text */}
          <div className="h-10 mb-8 overflow-hidden relative">
            {features.map((f, i) => (
              <p key={f} className={`text-slate-600 dark:text-slate-300 text-base uppercase tracking-[0.3em] font-bold transition-all duration-1000 ${i === activeFeature ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 absolute inset-x-0'}`}>
                {f}
              </p>
            ))}
          </div>

          {/* Tagline */}
          <p className="text-slate-500 dark:text-slate-500 text-lg max-w-xl mx-auto mb-12 leading-relaxed">
            {t.home_tagline}
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button onClick={scrollToPricing} className="group relative px-8 py-4 bg-amber-500 text-black font-black text-sm uppercase tracking-widest rounded-xl overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(245,158,11,0.4)]">
              <span className="relative z-10">{t.lang === 'EN' ? '🚀 Get Full Access' : '🚀 Uzyskaj Pełny Dostęp'}</span>
              <div className="absolute inset-0 bg-amber-400 translate-y-full group-hover:translate-y-0 transition-transform duration-300"/>
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto border-t border-black/10 dark:border-white/10 pt-8">
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
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="w-px h-12 bg-gradient-to-b from-transparent to-amber-500/50"/>
        </div>
      </section>

      {/* ── VIDEO / UNDER CONSTRUCTION ────────────────────── */}
      <section id="video-section" className="bg-slate-50 dark:bg-black py-20 px-4 transition-colors duration-700">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[10px] text-amber-600 dark:text-amber-500 font-bold uppercase tracking-[0.4em] mb-3">
              {t.lang === 'EN' ? '— Featured Content —' : '— Wyróżniony Materiał —'}
            </p>
          </div>
          {/* Under Construction placeholder */}
          <div className="relative rounded-2xl overflow-hidden border border-black/5 dark:border-white/5 aspect-video bg-black flex flex-col items-center justify-center text-center px-8">
            <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:'linear-gradient(#f59e0b 1px,transparent 1px),linear-gradient(90deg,#f59e0b 1px,transparent 1px)',backgroundSize:'40px 40px'}}/>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none"/>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-6">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"/>
                {t.lang === 'EN' ? 'Coming Soon' : 'Już wkrótce'}
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter mb-3">
                {t.lang === 'EN' ? 'Content in preparation' : 'Treści w przygotowaniu'}
              </h3>
              <p className="text-white/30 text-sm max-w-md">
                {t.lang === 'EN' ? 'Our team is working on exclusive video content. Stay tuned!' : 'Nasz zespół pracuje nad ekskluzywnym contentem wideo. Wkrótce premiera!'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT YOU GET ──────────────────────────────────── */}
      <section className="bg-slate-50 dark:bg-[#050505] py-24 px-4 border-t border-black/5 dark:border-white/5 transition-colors duration-700">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-black dark:text-white uppercase tracking-tighter text-center mb-16">
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
              <div key={card.title} className="group p-6 bg-white dark:bg-black border border-black/5 dark:border-white/5 rounded-2xl hover:border-amber-500/30 hover:bg-amber-500/5 transition-all duration-300 cursor-default">
                <div className="text-3xl mb-4">{card.icon}</div>
                <h3 className="text-black dark:text-white font-bold text-sm uppercase tracking-tight mb-2">{card.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING HIDDEN — COMING SOON ─────────────────── */}
      <section className="bg-white dark:bg-black py-16 px-4 border-t border-black/5 dark:border-white/5 transition-colors duration-700">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"/>
            {t.lang === 'EN' ? 'Launching Soon' : 'Wkrótce w sprzedaży'}
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-black dark:text-white uppercase tracking-tighter mb-4">
            {t.lang === 'EN' ? 'Founding Member Pricing' : 'Ceny dla Założycieli'}
          </h2>
          <p className="text-black/30 dark:text-white/30 text-sm mb-4">
            {t.lang === 'EN'
              ? 'We\'re putting the finishing touches on our platform. Early members will get exclusive founding rates.'
              : 'Finalizujemy platformę. Pierwsi członkowie otrzymają ekskluzywne ceny założycielskie.'}
          </p>
        </div>
      </section>
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



// =========================================================================
// WIDOK TUTORIALE
// =========================================================================
const TutorialsView = ({ t, user, onLoginRequest }) => {
  const isLoggedIn = user && !user.isAnonymous;
  const YOUTUBE_VIDEO_ID = "1_1oHwOZMe4";

  const videos = [
    { id: 1, title: t.lang === 'EN' ? 'Introduction to AI Avatars' : 'Wprowadzenie do Awatarów AI', duration: '12:34', thumb: `https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/maxresdefault.jpg`, ytId: YOUTUBE_VIDEO_ID },
    { id: 2, title: t.lang === 'EN' ? 'Prompt Engineering Basics' : 'Podstawy Inżynierii Promptów', duration: '18:21', thumb: `https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/maxresdefault.jpg`, ytId: YOUTUBE_VIDEO_ID },
    { id: 3, title: t.lang === 'EN' ? 'Workflow Automation' : 'Automatyzacja Workflow', duration: '24:05', thumb: `https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/maxresdefault.jpg`, ytId: YOUTUBE_VIDEO_ID },
    { id: 4, title: t.lang === 'EN' ? 'Advanced AI Techniques' : 'Zaawansowane Techniki AI', duration: '31:12', thumb: `https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/maxresdefault.jpg`, ytId: YOUTUBE_VIDEO_ID },
  ];

  const [activeVideo, setActiveVideo] = useState(videos[0]);

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-700 font-sans px-4 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-4">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"/>
            {t.lang === 'EN' ? 'Video Library' : 'Biblioteka Wideo'}
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-black dark:text-white uppercase tracking-tighter">
            {t.nav_tutorials}
          </h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main video player */}
          <div className="lg:col-span-2">
            <div className="relative rounded-2xl overflow-hidden aspect-video border border-black/5 dark:border-white/5 bg-black">
              {isLoggedIn ? (
                <iframe width="100%" height="100%"
                  src={`https://www.youtube.com/embed/${activeVideo.ytId}?autoplay=1&controls=1&rel=0`}
                  title={activeVideo.title} frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen className="w-full h-full absolute inset-0"/>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                  <img src={activeVideo.thumb} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20"/>
                  <div className="absolute inset-0 bg-black/80"/>
                  <div className="relative z-10">
                    <Lock className="w-12 h-12 text-amber-500 mx-auto mb-4"/>
                    <h3 className="text-white font-black text-xl uppercase tracking-tighter mb-2">
                      {t.lang === 'EN' ? 'Members Only' : 'Tylko dla Członków'}
                    </h3>
                    <p className="text-white/40 text-sm mb-6">
                      {t.lang === 'EN' ? 'Log in to watch all videos' : 'Zaloguj się aby oglądać wszystkie filmy'}
                    </p>
                    <button onClick={onLoginRequest} className="bg-amber-500 hover:bg-amber-400 text-black font-black text-[11px] uppercase tracking-widest px-6 py-3 rounded-xl transition-all hover:scale-105">
                      {t.lang === 'EN' ? 'Log In / Register' : 'Zaloguj / Zarejestruj'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <h2 className="text-black dark:text-white font-black text-lg mt-4 uppercase tracking-tight">{activeVideo.title}</h2>
          </div>

          {/* Video list */}
          <div className="flex flex-col gap-3">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 mb-2">
              {t.lang === 'EN' ? 'All Videos' : 'Wszystkie Filmy'}
            </h3>
            {videos.map(video => (
              <button key={video.id} onClick={() => setActiveVideo(video)}
                className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all border ${activeVideo.id === video.id ? 'border-amber-500/50 bg-amber-500/10' : 'border-black/5 dark:border-white/5 hover:border-amber-500/30 bg-white dark:bg-black'}`}>
                <div className="relative w-20 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-900">
                  <img src={video.thumb} alt="" className="w-full h-full object-cover opacity-70"/>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {isLoggedIn ? (
                      <Play className="w-4 h-4 text-white"/>
                    ) : (
                      <Lock className="w-3 h-3 text-amber-500"/>
                    )}
                  </div>
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-black dark:text-white font-bold text-xs truncate">{video.title}</p>
                  <p className="text-slate-500 text-[10px] mt-0.5">{video.duration}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
// =========================================================================
// STUDIO PRO — NARZĘDZIA AI
// =========================================================================
const StudioProView = ({ t, user, onLoginRequest }) => {
  const isLoggedIn = user && !user.isAnonymous;

  const tools = [
    {
      name: 'Pika Labs',
      category: t.lang === 'EN' ? 'Video Generation' : 'Generowanie Wideo',
      desc: t.lang === 'EN' ? 'Generate stunning AI videos from text or images. Free tier available.' : 'Generuj niesamowite filmy AI z tekstu lub zdjęć. Darmowy tier dostępny.',
      free: t.lang === 'EN' ? '150 credits/month free' : '150 kredytów/mies. za darmo',
      link: 'https://pika.art',
      icon: '🎬',
      color: 'from-purple-500/20 to-pink-500/20',
      border: 'border-purple-500/20',
    },
    {
      name: 'Leonardo AI',
      category: t.lang === 'EN' ? 'Image Generation' : 'Generowanie Obrazów',
      desc: t.lang === 'EN' ? 'Professional AI image generation with fine-tuned models. Midjourney alternative.' : 'Profesjonalne generowanie obrazów AI. Alternatywa dla Midjourney.',
      free: t.lang === 'EN' ? '150 tokens/day free' : '150 tokenów/dzień za darmo',
      link: 'https://leonardo.ai',
      icon: '🎨',
      color: 'from-amber-500/20 to-orange-500/20',
      border: 'border-amber-500/20',
    },
    {
      name: 'D-ID',
      category: t.lang === 'EN' ? 'AI Avatars' : 'Awatary AI',
      desc: t.lang === 'EN' ? 'Create talking AI avatars from photos. Perfect for presentations and courses.' : 'Twórz mówiące awatary AI ze zdjęć. Idealne do prezentacji i kursów.',
      free: t.lang === 'EN' ? '5 free videos/month' : '5 darmowych filmów/mies.',
      link: 'https://www.d-id.com',
      icon: '🧑‍💻',
      color: 'from-blue-500/20 to-cyan-500/20',
      border: 'border-blue-500/20',
    },
    {
      name: 'Murf AI',
      category: t.lang === 'EN' ? 'Voice Generation' : 'Generowanie Głosu',
      desc: t.lang === 'EN' ? 'Convert text to natural-sounding speech. 120+ voices in 20 languages.' : 'Zamień tekst na naturalny głos. 120+ głosów w 20 językach.',
      free: t.lang === 'EN' ? '10 min audio free' : '10 min audio za darmo',
      link: 'https://murf.ai',
      icon: '🎙️',
      color: 'from-green-500/20 to-emerald-500/20',
      border: 'border-green-500/20',
    },
    {
      name: 'CapCut AI',
      category: t.lang === 'EN' ? 'Video Editing' : 'Edycja Wideo',
      desc: t.lang === 'EN' ? 'AI-powered video editor with auto-captions, background removal and effects.' : 'Edytor wideo z AI — auto-napisy, usuwanie tła i efekty.',
      free: t.lang === 'EN' ? 'Mostly free' : 'Przeważnie darmowy',
      link: 'https://www.capcut.com',
      icon: '✂️',
      color: 'from-red-500/20 to-pink-500/20',
      border: 'border-red-500/20',
    },
    {
      name: 'Adobe Firefly',
      category: t.lang === 'EN' ? 'Image Editing' : 'Edycja Zdjęć',
      desc: t.lang === 'EN' ? 'AI image generation and editing by Adobe. Commercially safe content.' : 'Generowanie i edycja zdjęć AI od Adobe. Bezpieczne komercyjnie.',
      free: t.lang === 'EN' ? '25 credits/month free' : '25 kredytów/mies. za darmo',
      link: 'https://firefly.adobe.com',
      icon: '🔥',
      color: 'from-orange-500/20 to-red-500/20',
      border: 'border-orange-500/20',
    },
    {
      name: 'ElevenLabs',
      category: t.lang === 'EN' ? 'Voice Generation' : 'Generowanie Głosu',
      desc: t.lang === 'EN' ? 'The most realistic AI voices available. Perfect for ads, courses and dialogues. Incredible value at $5/month.' : 'Najbardziej realistyczne głosy AI. Idealne do reklam, kursów i dialogów. Niesamowita wartość za $5/mies.',
      free: t.lang === 'EN' ? '$5/mo — huge amount of audio' : '$5/mies. — ogromna ilość nagrań',
      link: 'https://elevenlabs.io',
      icon: '🎤',
      color: 'from-violet-500/20 to-purple-500/20',
      border: 'border-violet-500/20',
    },
    {
      name: 'Grok Imagine',
      category: t.lang === 'EN' ? 'Image & Video AI' : 'Obrazy i Wideo AI',
      desc: t.lang === 'EN' ? 'xAI\'s image and video generator. SuperGrok gives unlimited images + 100 videos/day. Unique "Spicy mode" for bold content. Built into X (Twitter).' : 'Generator obrazów i filmów AI od xAI. SuperGrok daje nieograniczone obrazy + 100 filmów/dzień. Unikalny tryb "Spicy". Wbudowany w X (Twitter).',
      free: t.lang === 'EN' ? 'Free: ~10 videos/day (may vary) • SuperGrok: 100/day' : 'Free: ~10 filmów/dzień (może się różnić) • SuperGrok: 100/dzień',
      link: 'https://grok.com',
      icon: '🤖',
      color: 'from-sky-500/20 to-blue-500/20',
      border: 'border-sky-500/20',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-700 font-sans px-4 py-12">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-4">
            <Sparkles className="w-3 h-3"/>
            {t.lang === 'EN' ? 'AI Toolkit' : 'Zestaw Narzędzi AI'}
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-black dark:text-white uppercase tracking-tighter mb-4">
            Studio Pro
          </h1>
          <p className="text-slate-500 max-w-xl mx-auto text-sm">
            {t.lang === 'EN'
              ? 'Curated collection of the best AI tools — with tutorials showing exactly how to use them professionally.'
              : 'Wyselekcjonowana kolekcja najlepszych narzędzi AI — z tutorialami jak używać ich profesjonalnie.'}
          </p>
        </div>

        {/* Tools grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map(tool => (
            <div key={tool.name} className={`relative rounded-2xl p-6 border bg-gradient-to-br ${tool.color} ${tool.border} flex flex-col group hover:scale-[1.02] transition-all duration-300`}>
              {/* Icon + name */}
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">{tool.icon}</div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-full">
                  {tool.category}
                </span>
              </div>

              <h3 className="text-black dark:text-white font-black text-xl mb-2">{tool.name}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed mb-4 flex-grow">{tool.desc}</p>

              {/* Free tier badge */}
              <div className="flex items-center gap-1 mb-4">
                <Check className="w-3 h-3 text-emerald-500 flex-shrink-0"/>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{tool.free}</span>
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <a href={tool.link} target="_blank" rel="noopener noreferrer"
                  className="flex-grow py-2.5 bg-black dark:bg-white text-white dark:text-black font-black text-[10px] uppercase tracking-widest rounded-xl text-center hover:bg-amber-500 dark:hover:bg-amber-500 dark:hover:text-black transition-all">
                  {t.lang === 'EN' ? 'Open Tool →' : 'Otwórz →'}
                </a>
                {isLoggedIn ? (
                  <button className="px-3 py-2.5 border border-black/10 dark:border-white/10 rounded-xl text-[10px] font-bold text-slate-500 hover:border-amber-500/50 hover:text-amber-500 transition-all uppercase tracking-widest">
                    {t.lang === 'EN' ? 'Tutorial' : 'Tutorial'}
                  </button>
                ) : (
                  <button onClick={onLoginRequest} className="px-3 py-2.5 border border-amber-500/30 rounded-xl text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-all uppercase tracking-widest">
                    <Lock className="w-3 h-3"/>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        {!isLoggedIn && (
          <div className="mt-12 text-center p-8 rounded-2xl border border-amber-500/20 bg-amber-500/5">
            <h3 className="text-black dark:text-white font-black text-xl uppercase tracking-tighter mb-2">
              {t.lang === 'EN' ? 'Unlock Video Tutorials' : 'Odblokuj Tutoriale Wideo'}
            </h3>
            <p className="text-slate-500 text-sm mb-4">
              {t.lang === 'EN' ? 'Log in to watch step-by-step video guides for each tool.' : 'Zaloguj się aby oglądać przewodniki wideo krok po kroku dla każdego narzędzia.'}
            </p>
            <button onClick={onLoginRequest} className="bg-amber-500 hover:bg-amber-400 text-black font-black text-[11px] uppercase tracking-widest px-8 py-3 rounded-xl transition-all hover:scale-105">
              {t.lang === 'EN' ? 'Log In / Register' : 'Zaloguj / Zarejestruj'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// =========================================================================
// COMING SOON
// =========================================================================
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleNotify = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'waitlist'), {
        email,
        date: new Date().toISOString(),
      });
      setSent(true);
    } catch(err) { console.error(err); }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-8 font-sans relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[150px] pointer-events-none"/>
      <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:'linear-gradient(#f59e0b 1px,transparent 1px),linear-gradient(90deg,#f59e0b 1px,transparent 1px)',backgroundSize:'60px 60px'}}/>

      <div className="relative z-10 max-w-lg">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"/>
          {t.lang === 'EN' ? 'Coming Soon' : 'Już wkrótce'}
        </div>

        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white mb-4 leading-tight">
          {t.lang === 'EN' ? 'Something' : 'Coś'}<br/>
          <span className="text-transparent bg-clip-text" style={{backgroundImage:'linear-gradient(135deg,#f59e0b,#fbbf24,#f97316)'}}>
            {t.lang === 'EN' ? 'Big' : 'Wielkiego'}
          </span><br/>
          {t.lang === 'EN' ? 'is Coming' : 'Nadchodzi'}
        </h1>

        <p className="text-white/30 text-sm mb-10 leading-relaxed">
          {t.lang === 'EN'
            ? 'We\'re preparing something special. Leave your email and be the first to know when we launch.'
            : 'Przygotowujemy coś wyjątkowego. Zostaw email i dowiedz się pierwszy o starcie.'}
        </p>

        {sent ? (
          <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-widest">
            <Check className="w-5 h-5"/> {t.lang === 'EN' ? 'You\'re on the list!' : 'Jesteś na liście!'}
          </div>
        ) : (
          <form onSubmit={handleNotify} className="flex gap-2 max-w-sm mx-auto">
            <input
              type="email" required
              placeholder={t.lang === 'EN' ? 'Your email' : 'Twój email'}
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="flex-grow bg-white/5 border px-4 py-3 text-sm text-white outline-none focus:border-amber-500 transition-colors rounded-xl"
              style={{borderColor:'rgba(255,255,255,0.1)'}}
            />
            <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] uppercase tracking-widest px-5 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]">
              {t.lang === 'EN' ? 'Notify Me' : 'Powiadom'}
            </button>
          </form>
        )}

        <p className="text-white/15 text-[10px] uppercase tracking-widest font-bold mt-12">
          AI Flow Academy — 2026
        </p>
      </div>
    </div>
  );
};

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

  // LICZNIK ODWIEDZIN
  useEffect(() => {
    const visited = sessionStorage.getItem('visited');
    if (!visited) {
      sessionStorage.setItem('visited', '1');
      addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'visits'), {
        date: new Date().toISOString(),
        ua: navigator.userAgent.substring(0, 100),
        lang: navigator.language,
      }).catch(() => {});
    }
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
      <div className="min-h-screen bg-white dark:bg-black transition-colors duration-700 font-sans selection:bg-amber-500 selection:text-black">
        {/* NAV */}
        <nav className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-4 font-sans transition-colors duration-300" style={{background: isDarkMode ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.90)', backdropFilter:'blur(20px)', borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)'}}>
          <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('home')}>
              <img src="/logo.png" alt="AI Flow" className="h-8 w-auto" />
            </div>
            <div className="flex items-center gap-2">
              {/* Nav tabs */}
              <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl transition-colors" style={{background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)'}}>
                {[['home', t.nav_academy], ['tutorials', t.nav_tutorials], ['prompt-builder', t.nav_studio]].map(([view, label]) => (
                  <button key={view} onClick={() => setCurrentView(view)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${currentView === view ? 'bg-amber-500 text-black' : isDarkMode ? 'text-white/40 hover:text-white/80' : 'text-black/40 hover:text-black/80'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <LangSwitcher lang={lang} setLang={setLang} />
              {isLoggedIn ? (
                <button onClick={() => signOut(auth)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-emerald-500/10" style={{border:'1px solid rgba(52,211,153,0.3)'}}>
                  <User className="w-4 h-4" />
                  <span className="hidden sm:block">{user.email?.split('@')[0] || 'Konto'}</span>
                </button>
              ) : (
                <button onClick={() => setShowLogin(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:block">{lang === 'EN' ? 'Log In' : 'Zaloguj'}</span>
                </button>
              )}
              <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${isDarkMode ? 'text-white/40 hover:text-amber-400' : 'text-black/40 hover:text-amber-500'}`} style={{border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)'}}>
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </nav>

        <main className="pt-16">
          {currentView === 'home' && <HomeView t={t} />}
          {currentView === 'tutorials' && <TutorialsView t={t} user={user} onLoginRequest={() => setShowLogin(true)} />}
          {currentView === 'prompt-builder' && <StudioProView t={t} user={user} onLoginRequest={() => setShowLogin(true)} />}
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
