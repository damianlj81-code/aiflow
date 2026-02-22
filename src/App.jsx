import React, { useState, useEffect, useRef } from 'react';
import { 
  Check, Zap, X, Play, Lock, ChevronDown, Youtube, 
  CreditCard, Building2, Sun, Moon, User, Mountain, 
  Eye, Scissors, Shirt, Footprints, PersonStanding, 
  Crown, Sparkles, Key, Save, Trash2, PlusCircle
} from 'lucide-react';

// FIREBASE INTEGRATION
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
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
// WIDOK 1: GŁÓWNA PLATFORMA (VOD)
// =========================================================================
const HomeView = ({ t }) => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showIban, setShowIban] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  
  const pricingRef = useRef(null);
  const DEMO_LIMIT_SECONDS = 15; 
  const YOUTUBE_VIDEO_ID = "1_1oHwOZMe4"; 

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

  const handlePlayDemo = () => { if (!isLocked) setIsVideoActive(true); };
  const scrollToPricing = () => { pricingRef.current?.scrollIntoView({ behavior: 'smooth' }); };
  const handlePurchase = (planName) => { setSelectedPlan(planName); setIsModalOpen(true); setShowIban(false); };
  const closeModal = () => { setIsModalOpen(false); setSelectedPlan(null); };

  return (
    <div className="font-sans flex flex-col pb-20">
      <div className="pt-10 pb-16 px-4 bg-slate-50 dark:bg-black transition-colors duration-500">
        <div className="max-w-4xl mx-auto text-center mb-8 font-sans">
          <div className="flex items-center justify-center gap-2 mb-2 text-red-600 font-bold uppercase text-[10px]">
            <Youtube className="w-5 h-5" /> VOD Academy Preview
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight text-slate-900 dark:text-[#E5E0D8]">
            AI FLOW ACADEMY
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-lg italic font-serif">
            {t.home_tagline}
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-black rounded-2xl overflow-hidden shadow-2xl relative aspect-video border border-slate-200 dark:border-[#1A1A1A]">
          {!isVideoActive && !isLocked && progress === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop')] bg-cover bg-center text-center px-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div>
              <button onClick={handlePlayDemo} className="relative z-10 w-20 h-20 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-transform hover:scale-105 shadow-[0_0_40px_rgba(220,38,38,0.6)]">
                <Play className="w-10 h-10 ml-1" />
              </button>
              <p className="relative z-10 text-white mt-6 font-bold tracking-widest text-xs uppercase">{t.home_play_demo}</p>
            </div>
          )}
          {isVideoActive && (
            <div className="absolute inset-0 w-full h-full bg-black">
              <iframe 
                width="100%" 
                height="100%" 
                src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&mute=1&controls=1&rel=0&start=7`} 
                title="YouTube video player" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowFullScreen 
                className="w-full h-full"
              ></iframe>
            </div>
          )}
          {isLocked && (
            <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500 font-sans">
              <Lock className="w-12 h-12 text-amber-500 mb-4" />
              <h2 className="text-xl md:text-3xl font-bold text-white mb-3 uppercase tracking-tighter">{t.home_locked_title}</h2>
              <button onClick={scrollToPricing} className="bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 px-8 rounded-xl transition-all transform hover:-translate-y-1 mt-4 uppercase text-[10px] tracking-widest">
                {t.home_locked_btn}
              </button>
            </div>
          )}
        </div>
      </div>

      <div ref={pricingRef} id="pricing-section" className="pt-16 pb-20 px-4 bg-white dark:bg-[#050505] transition-colors duration-500 font-sans">
        <div className="max-w-5xl mx-auto flex flex-col items-center">
          <h2 className="text-3xl font-bold mb-12 text-slate-900 dark:text-[#E5E0D8] uppercase tracking-tighter">{t.home_pricing_title}</h2>
          <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
            <div className="bg-slate-50 dark:bg-[#0A0A0A] rounded-3xl p-8 border border-slate-200 dark:border-[#1A1A1A] flex flex-col">
              <h3 className="text-xl font-bold mb-4 dark:text-white uppercase">{t.home_monthly_title}</h3>
              <div className="text-4xl font-extrabold mb-6 dark:text-white">199 PLN <span className="text-sm text-slate-500 font-normal">{t.home_monthly_per}</span></div>
              <ul className="space-y-4 mb-8 flex-grow">
                {t.home_monthly_features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm dark:text-slate-300"><Check className="w-4 h-4 text-emerald-500" /> {f}</li>
                ))}
              </ul>
              <button onClick={() => handlePurchase(t.home_monthly_title)} className="w-full py-4 bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-xl uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-colors">{t.home_monthly_btn}</button>
            </div>
            <div className="bg-slate-900 dark:bg-black rounded-3xl p-8 border border-amber-500/30 shadow-2xl relative scale-105 flex flex-col">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">{t.home_yearly_badge}</div>
              <h3 className="text-xl font-bold mb-4 text-white uppercase">{t.home_yearly_title}</h3>
              <div className="text-4xl font-extrabold mb-6 text-white">1800 PLN <span className="text-sm text-slate-400 font-normal">{t.home_yearly_per}</span></div>
              <ul className="space-y-4 mb-8 flex-grow">
                {t.home_yearly_features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-200"><Check className="w-4 h-4 text-amber-500" /> {f}</li>
                ))}
              </ul>
              <button onClick={() => handlePurchase(t.home_yearly_title)} className="w-full py-4 bg-amber-500 text-black font-bold rounded-xl uppercase text-[10px] tracking-widest shadow-lg hover:bg-amber-400 transition-colors">{t.home_yearly_btn}</button>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-white dark:bg-[#0A0A0A] rounded-2xl p-8 max-w-md w-full border dark:border-[#1A1A1A] relative shadow-2xl">
            <button onClick={closeModal} className="absolute top-4 right-4 dark:text-white hover:rotate-90 transition-transform"><X /></button>
            <h3 className="text-2xl font-bold mb-2 text-center dark:text-[#E5E0D8] uppercase tracking-tighter">{t.modal_title}</h3>
            <p className="text-center text-[10px] text-slate-500 uppercase tracking-widest mb-6 font-bold">{t.modal_package} <span className="text-amber-500">{selectedPlan}</span></p>
            <div className="space-y-4">
              <button className="w-full p-4 border rounded-xl flex items-center gap-4 dark:bg-black dark:border-[#1A1A1A] dark:text-white hover:border-amber-500 transition-colors group text-left">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#111] flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform"><CreditCard className="w-6 h-6" /></div>
                <div><div className="font-bold text-sm">{t.modal_auto_pay}</div><div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{t.modal_auto_pay_sub}</div></div>
              </button>
              <button onClick={() => setShowIban(!showIban)} className="w-full p-4 border rounded-xl flex items-center gap-4 dark:bg-black dark:border-[#1A1A1A] dark:text-white hover:border-slate-400 transition-colors group text-left">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#111] flex items-center justify-center text-slate-400"><Building2 className="w-6 h-6" /></div>
                <div className="flex-grow"><div className="font-bold text-sm">{t.modal_transfer}</div><div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{t.modal_transfer_sub}</div></div>
                <ChevronDown className={showIban ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {showIban && (
                <div className="p-4 bg-slate-50 dark:bg-[#111] rounded-xl text-[11px] space-y-3 dark:text-slate-300 font-mono border dark:border-[#222] animate-in slide-in-from-top-2">
                  <div className="flex justify-between border-b border-slate-200 dark:border-[#222] pb-1 font-mono"><span>IBAN (DE)</span><span className="text-amber-500 font-bold">DE89 3704 0044 0532 0130 00</span></div>
                  <div className="flex justify-between font-bold font-mono"><span>{t.modal_due}</span><span className="text-white">{selectedPlan === t.home_yearly_title ? '1800 PLN / ~420 EUR' : '199 PLN / ~46 EUR'}</span></div>
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
const VideoPreviewModal = ({ video, onClose, setCurrentView, t }) => {
  const [isBlurred, setIsBlurred] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setIsBlurred(true);
    }, 10000);
    return () => clearTimeout(timerRef.current);
  }, []);

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
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${video.ytId}?autoplay=1&controls=0&rel=0&modestbranding=1`}
            title={video.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />

          {isBlurred && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center transition-all duration-700">
              <div className="absolute inset-0 backdrop-blur-xl bg-black/60" />
              <div className="relative z-10 flex flex-col items-center px-6">
                <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(245,158,11,0.5)]">
                  <Lock className="w-8 h-8 text-black" />
                </div>
                <h3 className="text-white font-extrabold text-xl uppercase tracking-tighter mb-2">{t.preview_locked_title}</h3>
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-6 max-w-xs">{t.preview_locked_sub}</p>
                <button onClick={scrollToPayment} className="bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 px-8 rounded-xl uppercase text-[10px] tracking-widest transition-all transform hover:-translate-y-1 shadow-lg">
                  {t.preview_locked_btn}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-tight">{video.title}</h3>
            <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-1">{video.date}</p>
          </div>
          {!isBlurred && (
            <div className="flex items-center gap-2 text-amber-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              {t.tut_preview_live}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TutorialsView = ({ user, setCurrentView, t }) => {
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
                  <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white"><Play className="w-8 h-8 ml-1 fill-current" /></div>
                </div>
                <div className="absolute bottom-2 right-2 bg-black/70 text-amber-500 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded">
                  {t.tut_preview_badge}
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

        {previewVideo && <VideoPreviewModal video={previewVideo} onClose={() => setPreviewVideo(null)} setCurrentView={setCurrentView} t={t} />}
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
// GŁÓWNY KOMPONENT APP
// =========================================================================
export default function App() {
  const [currentView, setCurrentView] = useState('prompt-builder');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState('PL');

  const t = { ...translations[lang], lang };

  useEffect(() => {
  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("Auth error:", err));
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    
    return () => unsubscribe();
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    
    return () => unsubscribe();
  }, []);

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-white dark:bg-black transition-colors duration-700 font-sans selection:bg-amber-500 selection:text-black">
        <nav className="bg-slate-900 dark:bg-[#050505] border-b border-slate-800 dark:border-[#1A1A1A] sticky top-0 z-50 h-16 flex items-center px-4 font-sans">
          <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('home')}>
              <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center shadow-lg">
                <Zap className="w-5 h-5 text-black" />
              </div>
              <span className="text-white font-bold text-lg hidden sm:block tracking-tight uppercase">AI FLOW</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex bg-slate-800 dark:bg-[#121212] p-1 rounded-xl border border-slate-700 dark:border-[#222]">
                <button onClick={() => setCurrentView('home')} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${currentView === 'home' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/10' : 'text-amber-500/70 font-bold'}`}>{t.nav_academy}</button>
                <button onClick={() => setCurrentView('tutorials')} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${currentView === 'tutorials' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/10' : 'text-amber-500/70 font-bold'}`}>{t.nav_tutorials}</button>
                <button onClick={() => setCurrentView('prompt-builder')} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${currentView === 'prompt-builder' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/10' : 'text-amber-500/70 font-bold'}`}>{t.nav_studio}</button>
              </div>
              <LangSwitcher lang={lang} setLang={setLang} />
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 dark:bg-[#121212] text-amber-400 border border-slate-700 hover:scale-110 transition-transform">
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </nav>
        
        <main>
          {currentView === 'home' && <HomeView t={t} />}
          {currentView === 'tutorials' && <TutorialsView user={user} setCurrentView={setCurrentView} t={t} />}
          {currentView === 'prompt-builder' && <PromptBuilderView t={t} />}
        </main>
        
        <footer className="bg-slate-50 dark:bg-[#050505] py-10 border-t border-slate-200 dark:border-[#111] transition-colors duration-500 font-sans">
           <div className="max-w-[1400px] mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-[9px] text-slate-500 dark:text-slate-600 uppercase tracking-widest font-bold">{t.footer_copy}</p>
           </div>
        </footer>
      </div>
    </div>
  );
}