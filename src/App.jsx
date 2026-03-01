import React, { useState, useEffect, useRef } from 'react';
import {
  Check, Zap, X, Play, Lock, ChevronDown, Youtube,
  CreditCard, Building2, Sun, Moon, User, Mountain,
  Eye, Scissors, Shirt, Footprints, PersonStanding,
  Crown, Sparkles, Key, Save, Trash2, PlusCircle
} from 'lucide-react';

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

const translations = {
  PL: {
    nav_academy: 'Academy',
    nav_tutorials: 'Tutoriale',
    nav_studio: 'Studio Pro',
    home_tagline: 'Sztuka tworzenia wizji przyszłości.',
    home_pricing_title: 'Subskrypcja Premium',
    footer_copy: '© 2026 Damian L. J. - Professional AI Suite',
    lang: 'PL',
  },
  EN: {
    nav_academy: 'Academy',
    nav_tutorials: 'Tutorials',
    nav_studio: 'Studio Pro',
    home_tagline: 'The art of creating visions of the future.',
    home_pricing_title: 'Premium Subscription',
    footer_copy: '© 2026 Damian L. J. - Professional AI Suite',
    lang: 'EN',
  }
};

const LangSwitcher = ({ lang, setLang }) => (
  <div className="flex bg-slate-800 dark:bg-[#121212] p-1 rounded-xl border border-slate-700 dark:border-[#222] gap-1">
    <button onClick={() => setLang('PL')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${lang === 'PL' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'}`}>
      <span className="text-sm leading-none">🇵🇱</span> PL
    </button>
    <button onClick={() => setLang('EN')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${lang === 'EN' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'}`}>
      <span className="text-sm leading-none">🇬🇧</span> EN
    </button>
  </div>
);

const LoginModal = ({ onClose, lang }) => {
  const [mode, setMode] = useState('login');
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
      const result = await signInWithPopup(auth, googleProvider); 
      if (result?.user) onClose();
    } catch (e) { 
      if (e.code !== 'auth/popup-closed-by-user') setError(errorMsg(e.code)); 
    }
    setLoading(false);
  };

  const handleEmail = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (mode === 'register') { await createUserWithEmailAndPassword(auth, email, password); }
      else { await signInWithEmailAndPassword(auth, email, password); }
      onClose();
    } catch (e) { setError(errorMsg(e.code)); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 font-sans" onClick={onClose}>
      <div className="bg-white dark:bg-[#0A0A0A] rounded-2xl p-8 w-full max-w-sm border dark:border-[#1A1A1A] shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-black dark:hover:text-white hover:rotate-90 transition-all"><X className="w-5 h-5" /></button>
        <div className="flex items-center gap-2 mb-6"><img src="/logo.png" alt="AI Flow" className="h-8 w-auto" /></div>
        <h2 className="text-xl font-extrabold uppercase tracking-tighter text-black dark:text-white mb-1">
          {mode === 'login' ? (lang === 'EN' ? 'Welcome back' : 'Witaj ponownie') : (lang === 'EN' ? 'Create account' : 'Utwórz konto')}
        </h2>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-6">
          {mode === 'login' ? (lang === 'EN' ? 'Sign in to access all content' : 'Zaloguj się aby uzyskać dostęp') : (lang === 'EN' ? 'Join AI Flow Academy' : 'Dołącz do AI Flow Academy')}
        </p>
        <button onClick={handleGoogle} disabled={loading} className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-slate-200 dark:border-[#222] rounded-xl font-bold text-sm text-black dark:text-white hover:border-amber-500 transition-all mb-4 disabled:opacity-50">
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          {lang === 'EN' ? 'Continue with Google' : 'Kontynuuj przez Google'}
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-slate-200 dark:bg-[#222]"></div>
          <span className="text-[10px] text-slate-400 uppercase font-bold">{lang === 'EN' ? 'or' : 'lub'}</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-[#222]"></div>
        </div>
        <form onSubmit={handleEmail} className="space-y-3">
          <input type="email" required placeholder={lang === 'EN' ? 'Email address' : 'Adres email'} value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#333] rounded-xl px-4 py-3 text-sm text-black dark:text-white outline-none focus:border-amber-500 transition-colors" />
          <input type="password" required placeholder={lang === 'EN' ? 'Password (min. 6 characters)' : 'Hasło (min. 6 znaków)'} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#333] rounded-xl px-4 py-3 text-sm text-black dark:text-white outline-none focus:border-amber-500 transition-colors" />
          {error && <p className="text-red-500 text-[11px] font-bold">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl uppercase text-[10px] tracking-widest transition-all disabled:opacity-50">
            {loading ? '...' : mode === 'login' ? (lang === 'EN' ? 'Sign In' : 'Zaloguj się') : (lang === 'EN' ? 'Create Account' : 'Utwórz konto')}
          </button>
        </form>
        <p className="text-center text-[11px] text-slate-500 mt-4">
          {mode === 'login' ? (lang === 'EN' ? "Don't have an account? " : 'Nie masz konta? ') : (lang === 'EN' ? 'Already have an account? ' : 'Masz już konto? ')}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} className="text-amber-500 font-bold hover:underline">
            {mode === 'login' ? (lang === 'EN' ? 'Register' : 'Zarejestruj się') : (lang === 'EN' ? 'Sign In' : 'Zaloguj się')}
          </button>
        </p>
      </div>
    </div>
  );
};

// =========================================================================
// PRICING BUTTON — Stripe Payment Links (bezpośrednie linki)
// =========================================================================
const PricingButton = ({ plan, t, highlight }) => {
  const LINKS = {
    basic: 'https://buy.stripe.com/28EfZg0Y1aqzcbmdYm8bS00',
    monthly: 'https://buy.stripe.com/cNiaEWbCF6aj7V63jI8bS01',
    annual: 'https://buy.stripe.com/9B6cN4eOR8ir1wIcUi8bS02',
  };

  return (
    <a
      href={LINKS[plan]}
      target="_blank"
      rel="noopener noreferrer"
      className={`block w-full py-3.5 font-black text-[11px] uppercase tracking-widest rounded-xl transition-all text-center ${highlight ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20' : 'bg-black dark:bg-white text-white dark:text-black hover:bg-amber-500 hover:text-black dark:hover:bg-amber-500 dark:hover:text-black'}`}>
      {t.lang === 'EN' ? 'Get Access →' : 'Uzyskaj dostęp →'}
    </a>
  );
};

// =========================================================================
// FAQ SECTION
// =========================================================================
const FAQSection = ({ t }) => {
  const [openIdx, setOpenIdx] = useState(null);
  const [customQ, setCustomQ] = useState('');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedQ, setSelectedQ] = useState('');

  const faqs = [
    { q: t.lang === 'EN' ? 'When do tutorials start?' : 'Kiedy startują tutoriale?', a: t.lang === 'EN' ? 'We are currently working on the first video materials. Leave your email on the home page and you will be the first to know about the launch.' : 'Aktualnie pracujemy nad pierwszymi materiałami wideo. Zostaw email na stronie głównej a będziesz pierwsza/y informowana/y o starcie.' },
    { q: t.lang === 'EN' ? 'Do I need AI experience?' : 'Czy potrzebuję doświadczenia z AI?', a: t.lang === 'EN' ? 'No! AI Flow Academy is designed for complete beginners. We start from scratch — step by step, without unnecessary jargon.' : 'Nie! AI Flow Academy jest stworzona dla kompletnych początkujących. Zaczynamy od zera — krok po kroku, bez zbędnego żargonu.' },
    { q: t.lang === 'EN' ? 'What tools will be covered?' : 'Jakie narzędzia będą omawiane?', a: t.lang === 'EN' ? 'We focus on free and cheap tools: Pika Labs, Leonardo AI, D-ID, Murf AI, CapCut, Adobe Firefly, ElevenLabs, Grok and more.' : 'Skupiamy się na darmowych i tanich narzędziach: Pika Labs, Leonardo AI, D-ID, Murf AI, CapCut, Adobe Firefly, ElevenLabs, Grok i więcej.' },
    { q: t.lang === 'EN' ? 'What is included in the paid plan?' : 'Co zawiera płatny plan?', a: t.lang === 'EN' ? 'The paid plan gives you: access to the full video library (100+ tutorials), 3x weekly live sessions with Damian, the AI avatar builder, Studio Pro tools with guides, and access to the private members community.' : 'Płatny plan daje Ci: dostęp do pełnej biblioteki wideo (100+ tutoriali), live sesje 3x w tygodniu z Damianem, kreator awatarów AI, narzędzia Studio Pro z poradnikami oraz dostęp do zamkniętej społeczności.' },
    { q: t.lang === 'EN' ? 'Can I cancel at any time?' : 'Czy mogę zrezygnować w dowolnym momencie?', a: t.lang === 'EN' ? 'Yes! You can cancel your subscription at any time through the customer portal. Access continues until the end of the paid period — no hidden fees.' : 'Tak! Możesz anulować subskrypcję w dowolnym momencie przez portal klienta. Dostęp trwa do końca opłaconego okresu — bez ukrytych opłat.' },
    { q: t.lang === 'EN' ? 'Is there a free trial?' : 'Czy jest darmowy okres próbny?', a: t.lang === 'EN' ? 'The tools in Studio Pro are completely free to use — no account needed. The paid plan gives you access to tutorials and live sessions.' : 'Narzędzia w Studio Pro są całkowicie darmowe — bez konta. Płatny plan daje dostęp do tutoriali i live sesji.' },
  ];

  const handleSend = async () => {
    if (!email || (!selectedQ && !customQ)) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'questions'), { email, question: customQ || selectedQ, date: new Date().toISOString() });
      setSent(true);
    } catch(err) { console.error(err); }
    setSending(false);
  };

  return (
    <section className="bg-white dark:bg-[#050505] py-24 px-4 border-t border-black/5 dark:border-white/5 transition-colors duration-700">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"/>FAQ
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-black dark:text-white uppercase tracking-tighter">
            {t.lang === 'EN' ? 'Frequently Asked' : 'Najczęściej zadawane'}
            <span className="text-amber-500"> {t.lang === 'EN' ? 'Questions' : 'pytania'}</span>
          </h2>
        </div>
        <div className="space-y-3 mb-16">
          {faqs.map((faq, i) => (
            <div key={i} className={`border rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer ${openIdx === i ? 'border-amber-500/40 bg-amber-500/5' : 'border-black/5 dark:border-white/5 bg-white dark:bg-[#0A0A0A] hover:border-amber-500/20'}`} onClick={() => setOpenIdx(openIdx === i ? null : i)}>
              <div className="flex items-center justify-between px-6 py-4 gap-4">
                <p className="text-sm font-bold text-black dark:text-white">{faq.q}</p>
                <span className={`text-amber-500 text-lg font-black transition-transform duration-300 flex-shrink-0 ${openIdx === i ? 'rotate-45' : ''}`}>+</span>
              </div>
              {openIdx === i && <div className="px-6 pb-5"><p className="text-sm text-slate-500 leading-relaxed">{faq.a}</p></div>}
            </div>
          ))}
        </div>
        <div className="bg-white dark:bg-[#0A0A0A] border border-black/5 dark:border-amber-500/10 rounded-2xl p-8 md:p-10">
          <div className="flex items-start gap-4 mb-8">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0"><span className="text-black font-black text-lg">?</span></div>
            <div>
              <h3 className="text-lg font-black text-black dark:text-white uppercase tracking-tight">{t.lang === 'EN' ? "Don't see your question?" : 'Nie ma Twojego pytania?'}</h3>
              <p className="text-slate-500 text-xs mt-1">{t.lang === 'EN' ? 'Choose from the list or write your own — I will reply as soon as possible.' : 'Wybierz z listy lub napisz własne — odpiszę najszybciej jak to możliwe.'}</p>
            </div>
          </div>
          {sent ? (
            <div className="flex items-center justify-center gap-3 py-8 text-emerald-500 font-bold uppercase tracking-widest text-sm"><span className="text-2xl">✔</span>{t.lang === 'EN' ? 'Sent! I will reply soon.' : 'Wysłane! Odpiszę wkrótce.'}</div>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">{t.lang === 'EN' ? 'Choose a question' : 'Wybierz pytanie'}</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {faqs.map((faq, i) => (
                    <button key={i} onClick={() => { setSelectedQ(faq.q); setCustomQ(''); }} className={`text-left px-4 py-3 rounded-xl text-xs font-medium border transition-all ${selectedQ === faq.q ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'border-black/5 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-amber-500/30'}`}>{faq.q}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">{t.lang === 'EN' ? 'Or write your own' : 'Lub napisz własne'}</label>
                <textarea value={customQ} onChange={e => { setCustomQ(e.target.value); setSelectedQ(''); }} placeholder={t.lang === 'EN' ? 'Your question...' : 'Twoje pytanie...'} rows={3} className="w-full bg-slate-50 dark:bg-[#111] border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-black dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors resize-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">{t.lang === 'EN' ? 'Your email (to receive reply)' : 'Twój email (żeby odpisać)'}</label>
                <div className="flex gap-3">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t.lang === 'EN' ? 'email@example.com' : 'email@przykład.pl'} className="flex-grow bg-slate-50 dark:bg-[#111] border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-black dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors" />
                  <button onClick={handleSend} disabled={sending || (!selectedQ && !customQ) || !email} className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-black text-[10px] uppercase tracking-widest px-6 rounded-xl transition-all">{sending ? '...' : t.lang === 'EN' ? 'Send →' : 'Wyślij →'}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const HomeView = ({ t, onLoginRequest }) => {
  const [activeFeature, setActiveFeature] = useState(0);
  const features = t.lang === 'EN' ? ['AI Avatar Creation', 'Prompt Engineering', 'Workflow Automation', 'Live Coaching'] : ['Tworzenie Awatarów AI', 'Inżynieria Promptów', 'Automatyzacja Workflow', 'Live Coaching'];
  useEffect(() => { const fi = setInterval(() => setActiveFeature(p => (p + 1) % features.length), 4000); return () => clearInterval(fi); }, []);
  const scrollToPricing = () => { document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' }); };

  return (
    <div className="font-sans flex flex-col">
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-white dark:bg-black px-4 transition-colors duration-700">
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'linear-gradient(#f59e0b 1px,transparent 1px),linear-gradient(90deg,#f59e0b 1px,transparent 1px)',backgroundSize:'60px 60px'}}/>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"/>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-orange-500/10 rounded-full blur-[100px] pointer-events-none"/>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"/>
            {t.lang === 'EN' ? 'AI Education Platform' : 'Platforma Edukacji AI'}
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-black dark:text-white mb-6 leading-[0.95] tracking-tighter">
            {t.lang === 'EN' ? 'Learn AI.' : 'Naucz się AI.'}<br/>
            <span className="text-transparent bg-clip-text" style={{backgroundImage:'linear-gradient(135deg,#f59e0b,#fbbf24,#f97316)'}}>
              {t.lang === 'EN' ? 'Without wasting money.' : 'Bez marnowania pieniędzy.'}
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-4 leading-relaxed">
            {t.lang === 'EN' ? 'Tutorials, live sessions and AI tools — everything you need to create videos, avatars and automations. Step by step, without expensive extras.' : 'Tutoriale, live sesje i narzędzia AI — wszystko czego potrzebujesz żeby tworzyć filmy, awatary i automatyzacje. Krok po kroku, bez drogich dodatków.'}
          </p>
          <p className="text-amber-600 dark:text-amber-400 text-sm font-bold uppercase tracking-widest mb-10">
            {t.lang === 'EN' ? '✔ For complete beginners · No experience needed' : '✔ Dla kompletnych początkujących · Zero doświadczenia'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button onClick={scrollToPricing} className="group relative px-10 py-4 bg-amber-500 text-black font-black text-sm uppercase tracking-widest rounded-xl overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(245,158,11,0.4)]">
              <span className="relative z-10">{t.lang === 'EN' ? '🚀 See Plans & Pricing' : '🚀 Zobacz plany i ceny'}</span>
              <div className="absolute inset-0 bg-amber-400 translate-y-full group-hover:translate-y-0 transition-transform duration-300"/>
            </button>
            <button onClick={() => document.getElementById('historia')?.scrollIntoView({behavior:'smooth'})} className="px-10 py-4 border border-black/10 dark:border-white/10 text-black dark:text-white font-bold text-sm uppercase tracking-widest rounded-xl hover:border-amber-500/50 transition-all">
              {t.lang === 'EN' ? 'Our Story →' : 'Nasza Historia →'}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-8 max-w-sm mx-auto border-t border-black/10 dark:border-white/10 pt-8">
            {[{n:'100+',l:t.lang==='EN'?'Videos':'Filmów'},{n:'3x',l:t.lang==='EN'?'Live/week':'Live/tydz.'},{n:'1M+',l:t.lang==='EN'?'Views':'Wyświetleń'}].map(s => (
              <div key={s.n} className="text-center">
                <div className="text-2xl font-black text-amber-500">{s.n}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 cursor-pointer group" onClick={() => document.getElementById('historia')?.scrollIntoView({behavior:'smooth'})}>
          <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold group-hover:text-amber-500 transition-colors">{t.lang === 'EN' ? 'Scroll to discover' : 'Przewiń i odkryj więcej'}</p>
          <div className="flex flex-col items-center gap-1">
            <ChevronDown className="w-6 h-6 text-amber-500 animate-bounce"/>
            <ChevronDown className="w-6 h-6 text-amber-500/50 animate-bounce" style={{animationDelay:'0.2s'}}/>
          </div>
        </div>
      </section>

      <section id="historia" className="bg-slate-50 dark:bg-black py-20 px-4 transition-colors duration-700">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden border border-black/5 dark:border-amber-500/10 bg-white dark:bg-[#0A0A0A] px-8 py-12 md:px-16">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-2xl"/>
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-8">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"/>
                {t.lang === 'EN' ? 'Our Story' : 'Nasza Historia'}
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-black dark:text-white uppercase tracking-tighter mb-6 leading-tight">
                {t.lang === 'EN' ? 'Why AI Flow Academy?' : 'Dlaczego AI Flow Academy?'}
              </h2>
              <div className="space-y-4 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                <p>{t.lang === 'EN' ? 'Like many people — I started with an investment in ready-made solutions.' : 'Jak wiele osób — zacząłem od inwestycji w gotowe rozwiązania.'}</p>
                <p>{t.lang === 'EN' ? 'It turned out to be a good lesson. Most things can be done yourself — cheaper, and often better.' : 'Okazała się to dobra lekcja. Większość rzeczy można zrobić samemu — taniej, a często lepiej.'}</p>
                <p className="text-black dark:text-white font-bold">{t.lang === 'EN' ? 'From that lesson, AI Flow Academy was born.' : 'Z tej lekcji powstała AI Flow Academy.'}</p>
                <div className="pt-2 space-y-2">
                  {[t.lang==='EN'?'🎬 Create AI videos and avatars without expensive apps':'🎬 Tworzyć filmy i awatary AI bez drogich aplikacji', t.lang==='EN'?'🛠 Use tools that are free or almost free':'🛠 Używać narzędzi które są dostępne za darmo lub prawie za darmo', t.lang==='EN'?'⚡ Automate work to save hours every week':'⚡ Automatyzować pracę tak żeby oszczędzać godziny tygodniowo'].map((item,i) => (<div key={i} className="flex items-start gap-3"><span className="text-sm">{item}</span></div>))}
                </div>
                <p className="pt-2">{t.lang === 'EN' ? 'The result: profiles with over a million views. Built without big budgets — just knowledge and the right tools.' : 'Efekt: profile z ponad milionem wyświetleń. Zbudowane bez wielkich budżetów — tylko z wiedzą i odpowiednimi narzędziami.'}</p>
              </div>
              <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5 flex items-center justify-between flex-wrap gap-4">
                <p className="text-xs text-slate-500 italic">— Damian, AI Flow Academy</p>
                <div className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em]">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"/>
                  {t.lang === 'EN' ? 'First tutorials coming soon' : 'Pierwsze tutoriale już wkrótce'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FAQSection t={t} />

      <section className="bg-slate-50 dark:bg-[#050505] py-24 px-4 border-t border-black/5 dark:border-white/5 transition-colors duration-700">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-black dark:text-white uppercase tracking-tighter text-center mb-16">{t.lang === 'EN' ? 'What you get' : 'Co otrzymujesz'}<span className="text-amber-500">.</span></h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[{icon:'🎬',title:t.lang==='EN'?'VOD Library':'Baza VOD',desc:t.lang==='EN'?'100+ expert videos on demand':'100+ filmów eksperckich na żądanie'},{icon:'⚡',title:t.lang==='EN'?'Live Coaching':'Live Coaching',desc:t.lang==='EN'?'3x per week with Damian':'3x w tygodniu z Damianem'},{icon:'🧠',title:'Prompt Builder',desc:t.lang==='EN'?'Professional AI prompt studio':'Profesjonalne studio promptów AI'},{icon:'👥',title:t.lang==='EN'?'Community':'Społeczność',desc:t.lang==='EN'?'Private members group':'Zamknięta grupa członków'}].map(card => (
              <div key={card.title} className="group p-6 bg-white dark:bg-black border border-black/5 dark:border-white/5 rounded-2xl hover:border-amber-500/30 hover:bg-amber-500/5 transition-all duration-300 cursor-default">
                <div className="text-3xl mb-4">{card.icon}</div>
                <h3 className="text-black dark:text-white font-bold text-sm uppercase tracking-tight mb-2">{card.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing-section" className="bg-white dark:bg-black py-24 px-4 border-t border-black/5 dark:border-white/5 transition-colors duration-700">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"/>{t.lang === 'EN' ? 'Pricing' : 'Cennik'}
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-black dark:text-white uppercase tracking-tighter">{t.lang === 'EN' ? 'Choose your plan' : 'Wybierz swój plan'}<span className="text-amber-500">.</span></h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { plan:'basic', name:t.lang==='EN'?'Basic':'Podstawowy', price:'49', period:t.lang==='EN'?'/week':'/tydz.', desc:t.lang==='EN'?'Access to video tutorials library':'Dostęp do biblioteki tutoriali wideo', features:[t.lang==='EN'?'✔ Full video library':'✔ Pełna biblioteka wideo',t.lang==='EN'?'✔ AI tools directory':'✔ Katalog narzędzi AI',t.lang==='EN'?'✔ Avatar builder':'✔ Kreator awatarów',t.lang==='EN'?'✘ Live sessions':'✘ Live sesje',t.lang==='EN'?'✘ Community':'✘ Społeczność'], highlight:false },
              { plan:'monthly', name:'Pro', price:'199', period:t.lang==='EN'?'/month':'/mies.', desc:t.lang==='EN'?'Full access + live coaching':'Pełny dostęp + live coaching', features:[t.lang==='EN'?'✔ Full video library':'✔ Pełna biblioteka wideo',t.lang==='EN'?'✔ AI tools directory':'✔ Katalog narzędzi AI',t.lang==='EN'?'✔ Avatar builder':'✔ Kreator awatarów',t.lang==='EN'?'✔ 3x live/week with Damian':'✔ Live 3x/tydz. z Damianem',t.lang==='EN'?'✔ Private community':'✔ Zamknięta społeczność'], highlight:true },
              { plan:'annual', name:t.lang==='EN'?'Annual':'Roczny', price:'1899', period:t.lang==='EN'?'/year':'/rok', desc:t.lang==='EN'?'Pro plan — best value':'Plan Pro — najlepsza wartość', features:[t.lang==='EN'?'✔ Everything in Pro':'✔ Wszystko z Pro',t.lang==='EN'?'✔ Best value':'✔ Najlepsza cena',t.lang==='EN'?'✔ Priority support':'✔ Priorytetowe wsparcie',t.lang==='EN'?'✔ Early access to new content':'✔ Wczesny dostęp do treści',t.lang==='EN'?'✔ Cancel anytime':'✔ Anuluj w dowolnym momencie'], highlight:false },
            ].map(({ plan, name, price, period, desc, features, highlight }) => (
              <div key={plan} className={`relative rounded-2xl p-8 border transition-all ${highlight ? 'border-amber-500 bg-amber-500/5 shadow-[0_0_40px_rgba(245,158,11,0.1)]' : 'border-black/5 dark:border-white/5 bg-white dark:bg-[#0A0A0A]'}`}>
                {highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full">{t.lang === 'EN' ? 'Most Popular' : 'Najpopularniejszy'}</div>}
                <div className="mb-6">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">{name}</p>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-4xl font-black text-black dark:text-white">{price}</span>
                    <span className="text-sm text-slate-500 mb-1">PLN{period}</span>
                  </div>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
                <div className="space-y-2 mb-8">
                  {features.map((f, i) => (<p key={i} className={`text-xs ${f.startsWith('✔') ? 'text-black dark:text-white' : 'text-slate-400'}`}>{f}</p>))}
                </div>
                <PricingButton plan={plan} t={t} highlight={highlight} />
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-slate-400 mt-8">{t.lang === 'EN' ? '🔒 Secure payment via Stripe. Cancel anytime.' : '🔒 Bezpieczna płatność przez Stripe. Anuluj w dowolnym momencie.'}</p>
        </div>
      </section>
    </div>
  );
};

const TutorialsView = ({ t, user, onLoginRequest }) => {
  const isLoggedIn = user && !user.isAnonymous;
  const YOUTUBE_VIDEO_ID = "1_1oHwOZMe4";
  const videos = [
    { id:1, title:t.lang==='EN'?'Introduction to AI Avatars':'Wprowadzenie do Awatarów AI', duration:'12:34', thumb:`https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/maxresdefault.jpg`, ytId:YOUTUBE_VIDEO_ID },
    { id:2, title:t.lang==='EN'?'Prompt Engineering Basics':'Podstawy Inżynierii Promptów', duration:'18:21', thumb:`https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/maxresdefault.jpg`, ytId:YOUTUBE_VIDEO_ID },
    { id:3, title:t.lang==='EN'?'Workflow Automation':'Automatyzacja Workflow', duration:'24:05', thumb:`https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/maxresdefault.jpg`, ytId:YOUTUBE_VIDEO_ID },
    { id:4, title:t.lang==='EN'?'Advanced AI Techniques':'Zaawansowane Techniki AI', duration:'31:12', thumb:`https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/maxresdefault.jpg`, ytId:YOUTUBE_VIDEO_ID },
  ];
  const [activeVideo, setActiveVideo] = useState(videos[0]);

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-700 font-sans px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-4">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"/>{t.lang === 'EN' ? 'Video Library' : 'Biblioteka Wideo'}
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-black dark:text-white uppercase tracking-tighter">{t.nav_tutorials}</h1>
        </div>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="relative rounded-2xl overflow-hidden aspect-video border border-black/5 dark:border-white/5 bg-black">
              {isLoggedIn ? (
                <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${activeVideo.ytId}?autoplay=1&controls=1&rel=0`} title={activeVideo.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full absolute inset-0"/>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                  <img src={activeVideo.thumb} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20"/>
                  <div className="absolute inset-0 bg-black/80"/>
                  <div className="relative z-10">
                    <Lock className="w-12 h-12 text-amber-500 mx-auto mb-4"/>
                    <h3 className="text-white font-black text-xl uppercase tracking-tighter mb-2">{t.lang === 'EN' ? 'Members Only' : 'Tylko dla Członków'}</h3>
                    <p className="text-white/40 text-sm mb-6">{t.lang === 'EN' ? 'Log in to watch all videos' : 'Zaloguj się aby oglądać wszystkie filmy'}</p>
                    <button onClick={onLoginRequest} className="bg-amber-500 hover:bg-amber-400 text-black font-black text-[11px] uppercase tracking-widest px-6 py-3 rounded-xl transition-all hover:scale-105">{t.lang === 'EN' ? 'Log In / Register' : 'Zaloguj / Zarejestruj'}</button>
                  </div>
                </div>
              )}
            </div>
            <h2 className="text-black dark:text-white font-black text-lg mt-4 uppercase tracking-tight">{activeVideo.title}</h2>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 mb-2">{t.lang === 'EN' ? 'All Videos' : 'Wszystkie Filmy'}</h3>
            {videos.map(video => (
              <button key={video.id} onClick={() => setActiveVideo(video)} className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all border ${activeVideo.id === video.id ? 'border-amber-500/50 bg-amber-500/10' : 'border-black/5 dark:border-white/5 hover:border-amber-500/30 bg-white dark:bg-black'}`}>
                <div className="relative w-20 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-900">
                  <img src={video.thumb} alt="" className="w-full h-full object-cover opacity-70"/>
                  <div className="absolute inset-0 flex items-center justify-center">{isLoggedIn ? <Play className="w-4 h-4 text-white"/> : <Lock className="w-3 h-3 text-amber-500"/>}</div>
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

const StudioProView = ({ t, user, onLoginRequest, onNavigate }) => {
  const isLoggedIn = user && !user.isAnonymous;
  const tools = [
    { name:'Pika Labs', category:t.lang==='EN'?'Video Generation':'Generowanie Wideo', desc:t.lang==='EN'?'Generate stunning AI videos from text or images. Free tier available.':'Generuj niesamowite filmy AI z tekstu lub zdjęć. Darmowy tier dostępny.', free:t.lang==='EN'?'150 credits/month free':'150 kredytów/mies. za darmo', link:'https://pika.art', icon:'🎬', color:'from-purple-500/20 to-pink-500/20', border:'border-purple-500/20' },
    { name:'Leonardo AI', category:t.lang==='EN'?'Image Generation':'Generowanie Obrazów', desc:t.lang==='EN'?'Professional AI image generation. Midjourney alternative.':'Profesjonalne generowanie obrazów AI. Alternatywa dla Midjourney.', free:t.lang==='EN'?'150 tokens/day free':'150 tokenów/dzień za darmo', link:'https://leonardo.ai', icon:'🎨', color:'from-amber-500/20 to-orange-500/20', border:'border-amber-500/20' },
    { name:'D-ID', category:t.lang==='EN'?'AI Avatars':'Awatary AI', desc:t.lang==='EN'?'Create talking AI avatars from photos.':'Twórz mówiące awatary AI ze zdjęć.', free:t.lang==='EN'?'5 free videos/month':'5 darmowych filmów/mies.', link:'https://www.d-id.com', icon:'🧑‍💻', color:'from-blue-500/20 to-cyan-500/20', border:'border-blue-500/20' },
    { name:'Murf AI', category:t.lang==='EN'?'Voice Generation':'Generowanie Głosu', desc:t.lang==='EN'?'Convert text to natural-sounding speech. 120+ voices.':'Zamień tekst na naturalny głos. 120+ głosów.', free:t.lang==='EN'?'10 min audio free':'10 min audio za darmo', link:'https://murf.ai', icon:'🎙️', color:'from-green-500/20 to-emerald-500/20', border:'border-green-500/20' },
    { name:'CapCut AI', category:t.lang==='EN'?'Video Editing':'Edycja Wideo', desc:t.lang==='EN'?'AI-powered video editor with auto-captions and effects.':'Edytor wideo z AI — auto-napisy i efekty.', free:t.lang==='EN'?'Mostly free':'Przeważnie darmowy', link:'https://www.capcut.com', icon:'✂️', color:'from-red-500/20 to-pink-500/20', border:'border-red-500/20' },
    { name:'ElevenLabs', category:t.lang==='EN'?'Voice Generation':'Generowanie Głosu', desc:t.lang==='EN'?'The most realistic AI voices. Perfect for ads and courses.':'Najbardziej realistyczne głosy AI. Idealne do reklam i kursów.', free:t.lang==='EN'?'$5/mo — huge amount of audio':'$5/mies. — ogromna ilość nagrań', link:'https://elevenlabs.io', icon:'🎧', color:'from-violet-500/20 to-purple-500/20', border:'border-violet-500/20' },
    { name:'Grok Imagine', category:t.lang==='EN'?'Image & Video AI':'Obrazy i Wideo AI', desc:t.lang==='EN'?'xAI image and video generator. Unlimited images with SuperGrok.':'Generator obrazów i filmów AI od xAI. Nieograniczone obrazy z SuperGrok.', free:t.lang==='EN'?'Free: ~10 videos/day':'Free: ~10 filmów/dzień', link:'https://grok.com', icon:'🤖', color:'from-sky-500/20 to-blue-500/20', border:'border-sky-500/20' },
    { name:t.lang==='EN'?'Avatar Builder':'Kreator Awatarów', category:t.lang==='EN'?'Prompt Generator':'Generator Promptów', desc:t.lang==='EN'?'Our built-in avatar prompt creator.':'Nasz wbudowany kreator promptów do awatarów.', free:t.lang==='EN'?'100% free — built into AI Flow Academy':'100% darmowy — wbudowany w AI Flow Academy', link:'internal:avatar-builder', icon:'👑', color:'from-amber-500/20 to-yellow-500/20', border:'border-amber-500/30' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-700 font-sans px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-4">
            <Sparkles className="w-3 h-3"/>{t.lang === 'EN' ? 'AI Toolkit' : 'Zestaw Narzędzi AI'}
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-black dark:text-white uppercase tracking-tighter mb-4">Studio Pro</h1>
          <p className="text-slate-500 max-w-xl mx-auto text-sm">{t.lang === 'EN' ? 'Curated collection of the best AI tools — with tutorials showing exactly how to use them.' : 'Wyselekcjonowana kolekcja najlepszych narzędzi AI — z tutorialami jak używać ich profesjonalnie.'}</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map(tool => (
            <div key={tool.name} className={`relative rounded-2xl p-6 border bg-gradient-to-br ${tool.color} ${tool.border} flex flex-col group hover:scale-[1.02] transition-all duration-300`}>
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">{tool.icon}</div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-full">{tool.category}</span>
              </div>
              <h3 className="text-black dark:text-white font-black text-xl mb-2">{tool.name}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed mb-4 flex-grow">{tool.desc}</p>
              <div className="flex items-center gap-1 mb-4"><Check className="w-3 h-3 text-emerald-500 flex-shrink-0"/><span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{tool.free}</span></div>
              <div className="flex gap-2">
                {tool.link.startsWith('internal:') ? (
                  <button onClick={() => onNavigate(tool.link.replace('internal:',''))} className="flex-grow py-2.5 bg-amber-500 text-black font-black text-[10px] uppercase tracking-widest rounded-xl text-center hover:bg-amber-400 transition-all">{t.lang === 'EN' ? 'Open Tool →' : 'Otwórz →'}</button>
                ) : (
                  <a href={tool.link} target="_blank" rel="noopener noreferrer" className="flex-grow py-2.5 bg-black dark:bg-white text-white dark:text-black font-black text-[10px] uppercase tracking-widest rounded-xl text-center hover:bg-amber-500 dark:hover:bg-amber-500 dark:hover:text-black transition-all">{t.lang === 'EN' ? 'Open Tool →' : 'Otwórz →'}</a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AvatarBuilderView = ({ t, user, onLoginRequest }) => {
  const isLoggedIn = user && !user.isAnonymous;
  if (!isLoggedIn) return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center px-4 font-sans">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-6">🔒</div>
        <h2 className="text-2xl font-black text-black dark:text-white uppercase tracking-tighter mb-3">
          {t.lang === 'EN' ? 'Login Required' : 'Kreator tylko dla zalogowanych użytkowników!'}
        </h2>
        <p className="text-slate-500 text-sm mb-8">
          {t.lang === 'EN' ? 'Log in for free to access the Avatar Builder.' : 'Zaloguj się bezpłatnie aby korzystać z Kreatora Awatarów.'}
        </p>
        <button onClick={onLoginRequest} className="bg-amber-500 hover:bg-amber-400 text-black font-black text-[11px] uppercase tracking-widest px-8 py-4 rounded-xl transition-all hover:scale-105">
          {t.lang === 'EN' ? 'Log In / Register →' : 'Zaloguj się / Zarejestruj →'}
        </button>
      </div>
    </div>
  );
  const [copied, setCopied] = useState(false);
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
    const parts = ["full body shot", subject, bodyType, breastSize, lowerAnatomy !== 'none' ? lowerAnatomy : '', bodyHair !== 'none' ? bodyHair : '', faceSelect, "stunning detailed eyes", `${hairLength} ${hairColor} ${hairStyle}`, topClothing, bottomClothing, legwear !== 'none' ? legwear : '', shoes, "wearing luxury pearl drop earrings", "cat eyes, sharp winged eyeliner", bgSelect, "photorealistic, 8k resolution", 'masterpiece, high-end fashion photography, ultra-detailed, sharp focus, cinematic lighting'];
    return parts.filter(p => p && p.trim() !== '').join(', ');
  };

  const handleCopy = () => { navigator.clipboard.writeText(generatePrompt()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };
  const sectionClass = "bg-white dark:bg-[#0A0A0A] border border-black/10 dark:border-[#222] p-5 rounded-2xl mb-6 transition-all duration-500";
  const labelClass = "block text-[9px] uppercase tracking-widest text-slate-500 mb-1.5 font-bold";
  const inputClass = "w-full bg-slate-100 dark:bg-[#121212] border border-black/10 dark:border-[#333] px-3 py-2 text-xs dark:text-white focus:border-amber-500 focus:outline-none transition-all rounded-lg appearance-none";
  const headerClass = "text-xs font-bold tracking-widest text-black dark:text-amber-500 mb-5 flex items-center gap-2 border-b border-black/10 dark:border-[#222] pb-3 uppercase";

  return (
    <div className="pb-20 p-4 md:p-8 bg-slate-50 dark:bg-black transition-colors duration-700 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-4"><Crown className="w-3 h-3"/>Prompt Studio — Edition Limitée</div>
          <h1 className="text-3xl md:text-4xl font-black text-black dark:text-white uppercase tracking-tighter">{t.lang === 'EN' ? 'Avatar Builder' : 'Kreator Awatarów'}</h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className={sectionClass}>
              <h2 className={headerClass}><PersonStanding className="w-4 h-4"/> I. Sylwetka & Anatomia</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[{label:'Podmiot',value:subject,set:setSubject,opts:[['1girl, beautiful woman','1 Kobieta'],['1boy, handsome man','1 Mężczyzna'],['2girls, beautiful women','2 Kobiety'],['1boy and 1girl, couple','Para']]},{label:'Sylwetka',value:bodyType,set:setBodyType,opts:[['slim and toned body','Szczupła'],['curvy, hourglass figure','Klepsydra'],['athletic, muscular body','Atletyczna']]},{label:'Biust',value:breastSize,set:setBreastSize,opts:[['small breasts','Mały'],['medium breasts','Średni'],['large heavy breasts','Duży']]},{label:'Dół',value:lowerAnatomy,set:setLowerAnatomy,opts:[['none','Standard'],['noticeable crotch bulge','Bulge (M)'],['cameltoe','Cameltoe (K)']]},{label:'Owłosienie',value:bodyHair,set:setBodyHair,opts:[['none','Gładkie'],['light body hair','Lekkie'],['hairy body','Mocne']]}].map(f => (
                  <div key={f.label}><label className={labelClass}>{f.label}</label><div className="relative"><select value={f.value} onChange={e => f.set(e.target.value)} className={inputClass}>{f.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/></div></div>
                ))}
              </div>
            </div>
            <div className={sectionClass}>
              <h2 className={headerClass}><User className="w-4 h-4"/> II. Twarz & Włosy</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[{label:'Fryzura',value:hairStyle,set:setHairStyle,opts:[['elegant updo hair, wedding style, revealing ears and earrings','Upięcie ślubne'],['high bun hair, sleek look','Wysoki kok'],['tied in a ponytail','Kucyk']]},{label:'Kolor',value:hairColor,set:setHairColor,opts:[['blonde','Blond'],['brunette','Brązowe'],['black','Czarne'],['red','Rude']]},{label:'Długość',value:hairLength,set:setHairLength,opts:[['short','Krótkie'],['long','Długie']]},{label:'Twarz',value:faceSelect,set:setFaceSelect,opts:[['detailed symmetrical face, sharp features, natural skin','Klasyczna'],['cute face, freckles','Piegi']]}].map(f => (
                  <div key={f.label}><label className={labelClass}>{f.label}</label><div className="relative"><select value={f.value} onChange={e => f.set(e.target.value)} className={inputClass}>{f.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/></div></div>
                ))}
              </div>
            </div>
            <div className={sectionClass}>
              <h2 className={headerClass}><Shirt className="w-4 h-4"/> III. Ubranie & Tło</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[{label:'Góra',value:topClothing,set:setTopClothing,opts:[['casual white t-shirt','T-shirt'],['suit jacket, formal','Marynarka'],['bikini top','Bikini'],['cocktail dress, elegant','Sukienka']]},{label:'Dół',value:bottomClothing,set:setBottomClothing,opts:[['blue denim jeans','Jeansy'],['mini skirt','Mini'],['elegant trousers','Spodnie']]},{label:'Obuwie',value:shoes,set:setShoes,opts:[['elegant high heels, stilettos','Szpilki'],['modern sneakers','Sportowe'],['barefoot','Boso']]},{label:'Nogi',value:legwear,set:setLegwear,opts:[['none','Gołe'],['pantyhose','Rajstopy'],['stockings with lace','Pończochy']]}].map(f => (
                  <div key={f.label}><label className={labelClass}>{f.label}</label><div className="relative"><select value={f.value} onChange={e => f.set(e.target.value)} className={inputClass}>{f.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/></div></div>
                ))}
              </div>
              <div className="mt-4"><label className={labelClass}>Tło</label><div className="relative"><select value={bgSelect} onChange={e => setBgSelect(e.target.value)} className={inputClass}>{[['luxurious mansion interior, marble floors','Rezydencja'],['tropical beach, golden sand, ocean waves','Plaża'],['modern city street, neon lights at night','Miasto nocą'],['professional studio, white background','Studio'],['forest, natural light, bokeh','Las']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/></div></div>
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-white dark:bg-[#0A0A0A] border border-black/10 dark:border-[#333] p-6 rounded-2xl">
                <h2 className="text-[10px] font-bold tracking-widest mb-4 border-b border-black/10 dark:border-[#333] pb-2 text-black dark:text-amber-500 uppercase">Prompt</h2>
                <div className="bg-slate-100 dark:bg-[#121212] p-4 min-h-[200px] text-black dark:text-white font-mono text-[10px] leading-relaxed break-words border border-black/10 dark:border-[#222] mb-4 rounded-xl">
                  <span className="text-amber-500 font-bold">{`> `}</span>{generatePrompt()}
                </div>
                <button onClick={handleCopy} className={`w-full py-3 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all ${copied ? 'bg-emerald-500 text-black' : 'bg-black dark:bg-amber-500 text-white dark:text-black hover:bg-amber-500 hover:text-black'}`}>{copied ? '✔ Skopiowano!' : 'Kopiuj Prompt'}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ImpressumView = ({ setCurrentView, lang }) => (
  <div className="min-h-screen bg-white dark:bg-black p-6 md:p-16 font-sans transition-colors duration-500">
    <div className="max-w-3xl mx-auto">
      <button onClick={() => setCurrentView('home')} className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-8 flex items-center gap-2 hover:gap-3 transition-all">← {lang === 'EN' ? 'Back' : 'Powrót'}</button>
      <h1 className="text-3xl font-extrabold uppercase tracking-tighter text-black dark:text-white mb-10 border-b border-black dark:border-[#222] pb-6">Impressum</h1>
      <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        <div><h2 className="font-bold uppercase text-[10px] tracking-widest text-amber-600 dark:text-amber-500 mb-2">Angaben gemäß § 5 TMG</h2><p>DDC — Dienstleistungen Damian Chlad<br />Garteler Weg 38<br />27711 Osterholz-Scharmbeck<br />Deutschland</p></div>
        <div><h2 className="font-bold uppercase text-[10px] tracking-widest text-amber-600 dark:text-amber-500 mb-2">Kontakt</h2><p>Telefon: +49 151 66396941<br />E-Mail: info@loveaiflow.com</p></div>
      </div>
    </div>
  </div>
);

const DatenschutzView = ({ setCurrentView, lang }) => (
  <div className="min-h-screen bg-white dark:bg-black p-6 md:p-16 font-sans transition-colors duration-500">
    <div className="max-w-3xl mx-auto">
      <button onClick={() => setCurrentView('home')} className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-8 flex items-center gap-2 hover:gap-3 transition-all">← {lang === 'EN' ? 'Back' : 'Powrót'}</button>
      <h1 className="text-3xl font-extrabold uppercase tracking-tighter text-black dark:text-white mb-10 border-b border-black dark:border-[#222] pb-6">{lang === 'EN' ? 'Privacy Policy' : 'Datenschutzerklärung / Polityka Prywatności'}</h1>
      <div className="space-y-8 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        <div><h2 className="font-bold uppercase text-[10px] tracking-widest text-amber-600 dark:text-amber-500 mb-2">1. Administrator</h2><p>DDC — Dienstleistungen Damian Chlad, Garteler Weg 38, 27711 Osterholz-Scharmbeck<br />E-Mail: info@loveaiflow.com</p></div>
        <div><h2 className="font-bold uppercase text-[10px] tracking-widest text-amber-600 dark:text-amber-500 mb-2">2. {lang === 'EN' ? 'Data We Collect' : 'Jakie dane zbieramy'}</h2><p>{lang === 'EN' ? 'We collect email addresses provided voluntarily via our newsletter form and technical data via cookies.' : 'Zbieramy adresy e-mail podawane dobrowolnie oraz dane techniczne poprzez pliki cookie.'}</p></div>
      </div>
    </div>
  </div>
);

const RegulaminView = ({ setCurrentView, lang }) => (
  <div className="min-h-screen bg-white dark:bg-black p-6 md:p-16 font-sans transition-colors duration-500">
    <div className="max-w-3xl mx-auto">
      <button onClick={() => setCurrentView('home')} className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-8 flex items-center gap-2 hover:gap-3 transition-all">← {lang === 'EN' ? 'Back' : 'Powrót'}</button>
      <h1 className="text-3xl font-extrabold uppercase tracking-tighter text-black dark:text-white mb-10 border-b border-black dark:border-[#222] pb-6">{lang === 'EN' ? 'Terms & Conditions' : 'Regulamin'}</h1>
      <div className="space-y-8 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        <div><h2 className="font-bold uppercase text-[10px] tracking-widest text-amber-600 dark:text-amber-500 mb-2">1. {lang === 'EN' ? 'Provider' : 'Usługodawca'}</h2><p>DDC — Dienstleistungen Damian Chlad, Garteler Weg 38, 27711 Osterholz-Scharmbeck. E-Mail: info@loveaiflow.com</p></div>
        <div><h2 className="font-bold uppercase text-[10px] tracking-widest text-amber-600 dark:text-amber-500 mb-2">2. {lang === 'EN' ? 'Cancellation' : 'Rezygnacja'}</h2><p>{lang === 'EN' ? 'Cancel anytime by email: info@loveaiflow.com. Access continues until end of paid period.' : 'Rezygnacja w dowolnym momencie przez e-mail: info@loveaiflow.com.'}</p></div>
      </div>
    </div>
  </div>
);

export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState('PL');
  const [cookiesAccepted, setCookiesAccepted] = useState(() => localStorage.getItem('cookies') === '1');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSent, setNewsletterSent] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const t = { ...translations[lang], lang };
  const isLoggedIn = user && !user.isAnonymous;

  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("Auth error:", err));
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const visited = sessionStorage.getItem('visited');
    if (!visited) {
      sessionStorage.setItem('visited', '1');
      addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'visits'), { date: new Date().toISOString(), ua: navigator.userAgent.substring(0, 100), lang: navigator.language }).catch(() => {});
    }
  }, []);

  const handleCookies = (accepted) => { setCookiesAccepted(true); if (accepted) localStorage.setItem('cookies', '1'); };
  const handleNewsletter = async (e) => {
    e.preventDefault();
    if (!newsletterEmail || !user) return;
    try { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'newsletter'), { email: newsletterEmail, date: new Date().toISOString(), consent: true }); setNewsletterSent(true); setNewsletterEmail(''); } catch (err) { console.error(err); }
  };

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-white dark:bg-black transition-colors duration-700 font-sans selection:bg-amber-500 selection:text-black">
        <nav className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-4 font-sans transition-colors duration-300" style={{background: isDarkMode ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.90)', backdropFilter:'blur(20px)', borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)'}}>
          <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('home')}>
              <img src="/logo.png" alt="AI Flow" className="h-8 w-auto" />
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl transition-colors" style={{background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)'}}>
                {[['home', t.nav_academy], ['tutorials', t.nav_tutorials], ['prompt-builder', t.nav_studio], ['avatar-builder', t.lang === 'EN' ? 'Avatar Builder' : 'Kreator']].map(([view, label]) => (
                  <button key={view} onClick={() => setCurrentView(view)} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${currentView === view ? 'bg-amber-500 text-black' : isDarkMode ? 'text-white/40 hover:text-white/80' : 'text-black/40 hover:text-black/80'}`}>{label}</button>
                ))}
              </div>
              <LangSwitcher lang={lang} setLang={setLang} />
              {isLoggedIn ? (
                <button onClick={() => signOut(auth)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-emerald-500/10" style={{border:'1px solid rgba(52,211,153,0.3)'}}>
                  <User className="w-4 h-4" /><span className="hidden sm:block">{user.email?.split('@')[0] || 'Konto'}</span>
                </button>
              ) : (
                <button onClick={() => setShowLogin(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all">
                  <User className="w-4 h-4" /><span className="hidden sm:block">{lang === 'EN' ? 'Log In' : 'Zaloguj'}</span>
                </button>
              )}
              <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${isDarkMode ? 'text-white/40 hover:text-amber-400' : 'text-black/40 hover:text-amber-500'}`} style={{border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)'}}>
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </nav>
        <main className="pt-16">
          {currentView === 'home' && <HomeView t={t} onLoginRequest={() => setShowLogin(true)} />}
          {currentView === 'tutorials' && <TutorialsView t={t} user={user} onLoginRequest={() => setShowLogin(true)} />}
          {currentView === 'prompt-builder' && <StudioProView t={t} user={user} onLoginRequest={() => setShowLogin(true)} onNavigate={setCurrentView} />}
          {currentView === 'avatar-builder' && <AvatarBuilderView t={t} user={user} onLoginRequest={() => setShowLogin(true)} />}
          {currentView === 'impressum' && <ImpressumView setCurrentView={setCurrentView} lang={lang} />}
          {currentView === 'datenschutz' && <DatenschutzView setCurrentView={setCurrentView} lang={lang} />}
          {currentView === 'regulamin' && <RegulaminView setCurrentView={setCurrentView} lang={lang} />}
        </main>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} lang={lang} />}
        <footer className="bg-black border-t font-sans" style={{borderColor:'rgba(255,255,255,0.06)'}}>
          <div className="max-w-[1400px] mx-auto px-6 py-16 flex flex-col gap-12">
            <div className="flex flex-col md:flex-row justify-between gap-12">
              <div className="max-w-xs">
                <img src="/logo.png" alt="AI Flow" className="h-8 w-auto mb-4" />
                <p className="text-[11px] text-white/30 leading-relaxed">{lang === 'EN' ? 'Professional AI education platform for creators, coaches and entrepreneurs.' : 'Profesjonalna platforma edukacji AI dla twórców, coachów i przedsiębiorców.'}</p>
              </div>
              <div className="max-w-sm w-full">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-white mb-1">{lang === 'EN' ? 'Stay updated' : 'Bądź na bieżąco'}</p>
                <p className="text-[10px] text-white/30 mb-4">{lang === 'EN' ? 'Marketing updates from AI Flow Academy.' : 'Aktualizacje marketingowe od AI Flow Academy.'}</p>
                {newsletterSent ? (
                  <p className="text-emerald-400 font-bold text-[11px] uppercase tracking-widest">✔ {lang === 'EN' ? 'Thank you!' : 'Dziękujemy!'}</p>
                ) : (
                  <form onSubmit={handleNewsletter} className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input type="email" required placeholder={lang === 'EN' ? 'Email address' : 'Adres email'} value={newsletterEmail} onChange={e => setNewsletterEmail(e.target.value)} className="flex-grow bg-white/5 border px-3 py-2.5 text-xs text-white outline-none focus:border-amber-500 transition-colors rounded-lg" style={{borderColor:'rgba(255,255,255,0.1)'}} />
                      <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] uppercase tracking-widest px-4 rounded-lg transition-colors">{lang === 'EN' ? 'Join' : 'Dołącz'}</button>
                    </div>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" required className="mt-0.5 accent-amber-500" />
                      <span className="text-[9px] text-white/25 leading-relaxed">{lang === 'EN' ? 'I agree to marketing communications. ' : 'Zgadzam się na komunikaty marketingowe. '}<button type="button" onClick={() => setCurrentView('datenschutz')} className="text-amber-500 underline">{lang === 'EN' ? 'Privacy Policy' : 'Polityka Prywatności'}</button></span>
                    </label>
                  </form>
                )}
              </div>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>
              <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold">{t.footer_copy}</p>
              <div className="flex items-center gap-6">
                {[['impressum','Impressum'],['datenschutz',lang==='EN'?'Privacy':'Datenschutz'],['regulamin',lang==='EN'?'Terms':'Regulamin']].map(([view,label]) => (
                  <button key={view} onClick={() => setCurrentView(view)} className="text-[9px] text-white/20 uppercase tracking-widest font-bold hover:text-amber-500 transition-colors">{label}</button>
                ))}
              </div>
            </div>
          </div>
        </footer>
        {!cookiesAccepted && (
          <div className="fixed bottom-0 left-0 right-0 z-50 p-4 font-sans" style={{background:'rgba(0,0,0,0.95)',backdropFilter:'blur(20px)',borderTop:'1px solid rgba(245,158,11,0.2)'}}>
            <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center gap-4 justify-between">
              <p className="text-[11px] text-white/50 leading-relaxed max-w-2xl">
                🍪 {lang === 'EN' ? 'We use cookies and collect emails for contact and marketing. By continuing you accept our ' : 'Używamy cookies i zbieramy emaile w celach kontaktowych i marketingowych. Kontynuując akceptujesz naszą '}
                <button onClick={() => setCurrentView('datenschutz')} className="text-amber-500 underline font-bold">{lang === 'EN' ? 'Privacy Policy' : 'Politykę Prywatności'}</button>.
              </p>
              <div className="flex gap-3 flex-shrink-0">
                <button onClick={() => handleCookies(true)} className="bg-amber-500 text-black font-black text-[10px] uppercase tracking-widest px-6 py-2 rounded-lg hover:bg-amber-400 transition-colors">{lang === 'EN' ? 'Accept' : 'Akceptuję'}</button>
                <button onClick={() => handleCookies(false)} className="text-white/40 font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg hover:text-white/60 transition-colors" style={{border:'1px solid rgba(255,255,255,0.1)'}}>{lang === 'EN' ? 'Reject' : 'Odrzuć'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
