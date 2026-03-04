import React, { useState, useEffect, useRef } from 'react';
import {
  Check, Zap, X, Play, Lock, ChevronDown, Youtube,
  CreditCard, Building2, Sun, Moon, User, Mountain,
  Eye, Scissors, Shirt, Footprints, PersonStanding,
  Crown, Sparkles, Key, Save, Trash2, PlusCircle,
  ChevronLeft, ChevronRight, ArrowLeft
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCkwadV6OAvNW8NASmZ6qYh7zKV1xBLnss",
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
googleProvider.setCustomParameters({ prompt: 'select_account' });
const appId = "aiflow_academy";

const getYTId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// =========================================================================
// TOKEN SYSTEM
// =========================================================================
const TOKENS_FREE = 3;
const STRIPE_PRO_LINK = 'https://buy.stripe.com/cNiaEWbCF6aj7V63jI8bS01'; // 29 PLN miesiecznie
const STRIPE_PRO_LINK_TEST = 'https://buy.stripe.com/dRm6oGeOR6aj3EQcUi8bS04'; // 2 PLN test admin
const ADMIN_EMAIL = 'damianlj@live.com';
const stripeLink = (baseUrl, uid, email) => { const base = email === ADMIN_EMAIL ? STRIPE_PRO_LINK_TEST : baseUrl; return uid ? `${base}?client_reference_id=${uid}` : base; };

async function getTokenData(db, uid) {
  const ref = doc(db, 'artifacts', appId, 'public', 'data', 'tokens', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { tokens: TOKENS_FREE, used: 0, createdAt: new Date().toISOString(), pro: false });
    return { tokens: TOKENS_FREE, isPro: false };
  }
  const data = snap.data();
  return { tokens: data.tokens, isPro: data.pro === true };
}

async function getTokens(db, uid) {
  const { tokens } = await getTokenData(db, uid);
  return tokens;
}

async function useToken(db, uid) {
  const ref = doc(db, 'artifacts', appId, 'public', 'data', 'tokens', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { tokens: TOKENS_FREE - 1, used: 1, createdAt: new Date().toISOString(), pro: false });
    return true;
  }
  const data = snap.data();
  if (data.pro === true) return true;
  if (data.tokens <= 0) return false;
  await updateDoc(ref, { tokens: increment(-1), used: increment(1) });
  return true;
}

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

// =========================================================================
// GLOWING ARROW COMPONENT
// =========================================================================
const GlowArrow = ({ direction = 'right', onClick, className = '' }) => (
  <button
    onClick={onClick}
    className={`relative group flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 hover:scale-110 ${className}`}
    style={{
      background: 'rgba(245,158,11,0.1)',
      border: '1px solid rgba(245,158,11,0.3)',
      boxShadow: '0 0 20px rgba(245,158,11,0.15)',
    }}
  >
    <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      style={{ boxShadow: '0 0 30px rgba(245,158,11,0.5)', background: 'rgba(245,158,11,0.15)' }} />
    {direction === 'left' ? (
      <ChevronLeft className="w-5 h-5 text-amber-400 relative z-10" />
    ) : (
      <ChevronRight className="w-5 h-5 text-amber-400 relative z-10" />
    )}
  </button>
);

// =========================================================================
// 3D ICON COMPONENT
// =========================================================================
const Icon3D = ({ emoji, size = 'md' }) => {
  const sizes = { sm: 'text-3xl', md: 'text-5xl', lg: 'text-7xl' };
  return (
    <div className={`${sizes[size]} select-none`}
      style={{
        filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4)) drop-shadow(0 2px 4px rgba(245,158,11,0.3))',
        transform: 'perspective(200px) rotateX(10deg)',
        display: 'inline-block',
      }}>
      {emoji}
    </div>
  );
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
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) onClose();
    } catch (e) {
      if (e.code === 'auth/popup-blocked') {
        setError(lang === 'EN' ? 'Popup blocked. Allow popups for this site.' : 'Popup zablokowany. Zezwól na popup dla tej strony.');
      } else if (e.code !== 'auth/popup-closed-by-user') {
        setError(errorMsg(e.code));
      }
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
// PRICING BUTTON
// =========================================================================
const PricingButton = ({ plan, t, highlight }) => {
  const LINKS = {
    basic: 'https://buy.stripe.com/cNiaEWbCF6aj7V63jI8bS01', // 29 PLN
    monthly: 'https://buy.stripe.com/cNiaEWbCF6aj7V63jI8bS01', // 29 PLN
    annual: 'https://buy.stripe.com/9B6cN4eOR8ir1wIcUi8bS02', // 1899 PLN rocznie
  };
  return (
    <a href={LINKS[plan]} target="_blank" rel="noopener noreferrer"
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


// =========================================================================
// HOME VIEW
// =========================================================================
const HomeView = ({ t, user, onLoginRequest }) => {
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

    </div>
  );
};


// =========================================================================
// TUTORIALS VIEW
// =========================================================================
const TutorialsView = ({ t, user, onLoginRequest }) => {
  const isLoggedIn = user && !user.isAnonymous;
  const [isPro, setIsPro] = useState(false);
  const [loadingPro, setLoadingPro] = useState(true);

  useEffect(() => {
    if (isLoggedIn && user?.uid) {
      getTokenData(db, user.uid).then(({ isPro: p }) => { setIsPro(p); setLoadingPro(false); });
    } else { setLoadingPro(false); }
  }, [isLoggedIn, user]);

  const [tutorials, setTutorials] = useState([]);

  useEffect(() => {
    getDoc(doc(db, 'artifacts', 'aiflow_academy', 'public', 'data', 'config', 'tutorials')).then(snap => {
      if (snap.exists() && snap.data().list) {
        setTutorials(snap.data().list.map((t, i) => ({ ...t, id: i + 1 })));
      } else {
        setTutorials([
          { id:1, title_pl:'Wprowadzenie do Awatarów AI', title_en:'Introduction to AI Avatars', duration:'12:34', ytId:'1_1oHwOZMe4', naffyUrl:'https://naffy.io', vimeoUrl:'', price:'49' },
          { id:2, title_pl:'Podstawy Inżynierii Promptów', title_en:'Prompt Engineering Basics', duration:'18:21', ytId:'1_1oHwOZMe4', naffyUrl:'https://naffy.io', vimeoUrl:'', price:'49' },
        ]);
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-700 font-sans px-4 py-12">
      <style>{`
        .tut-card {
          transform: perspective(600px) rotateX(6deg) rotateY(-1deg);
          transition: all 0.4s cubic-bezier(0.23,1,0.32,1);
          box-shadow: 0 16px 50px rgba(0,0,0,0.5);
        }
        .tut-card:hover {
          transform: perspective(600px) rotateX(1deg) rotateY(0deg) translateY(-10px) scale(1.02);
          box-shadow: 0 0 50px rgba(245,158,11,0.25), 0 30px 70px rgba(0,0,0,0.6);
        }
        .play-btn { transition: transform 0.2s, box-shadow 0.2s; }
        .tut-card:hover .play-btn { transform: scale(1.2); box-shadow: 0 0 30px rgba(245,158,11,0.7); }
      `}</style>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-4">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"/>
            {t.lang === 'EN' ? 'Video Library' : 'Biblioteka Wideo'}
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-black dark:text-white uppercase tracking-tighter mb-4">
            {t.lang === 'EN' ? 'Tutorials' : 'Tutoriale'}<span className="text-amber-500">.</span>
          </h1>
          <p className="text-slate-500 text-sm max-w-xl mx-auto">
            {t.lang === 'EN'
              ? 'Buy individual tutorials or unlock everything with All-in-one subscription.'
              : 'Kup pojedynczy tutorial lub odblokuj wszystko abonamentem All-in-one.'}
          </p>
          {isLoggedIn && !loadingPro && isPro && (
            <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm font-black bg-amber-500/10 border border-amber-500/30 text-amber-500">
              👑 {t.lang === 'EN' ? 'All-in-one — full access' : 'All-in-one — masz dostęp do wszystkiego'}
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {tutorials.map(tut => {
            const ytUrl = `https://www.youtube.com/watch?v=${tut.ytId}`;
            const thumb = `https://img.youtube.com/vi/${tut.ytId}/maxresdefault.jpg`;
            return (
              <div key={tut.id} className="tut-card rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a0a] flex flex-col">

                {/* Miniatura YouTube */}
                <a href={ytUrl} target="_blank" rel="noopener noreferrer"
                  className="relative block overflow-hidden"
                  style={{aspectRatio:'16/9'}}>
                  <img src={thumb} alt={tut.title_pl} className="w-full h-full object-cover opacity-70 hover:opacity-100 transition-opacity duration-300"/>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="play-btn w-14 h-14 rounded-full flex items-center justify-center"
                      style={{background:'rgba(245,158,11,0.2)',border:'2px solid rgba(245,158,11,0.8)',backdropFilter:'blur(6px)'}}>
                      <Play className="w-6 h-6 text-amber-400 ml-1"/>
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">{tut.duration}</div>
                  <div className="absolute top-2 left-2 bg-red-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">YouTube</div>
                </a>

                {/* Info + przyciski */}
                <div className="p-5 flex flex-col flex-grow">
                  <p className="text-white font-black text-sm leading-tight mb-5">
                    {t.lang === 'EN' ? tut.title_en : tut.title_pl}
                  </p>

                  {isPro ? (
                    /* Pro user — Vimeo aktywny */
                    <div className="mt-auto flex flex-col gap-2">
                      {tut.vimeoUrl ? (
                        <a href={tut.vimeoUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-amber-500 hover:bg-amber-400 text-black transition-all">
                          ▶ {t.lang === 'EN' ? 'Watch now' : 'Oglądaj teraz'}
                        </a>
                      ) : (
                        <div className="flex items-center justify-center px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-amber-500/10 border border-amber-500/30 text-amber-400">
                          ✓ {t.lang === 'EN' ? 'In your plan' : 'W Twoim planie'}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Nie-Pro — Kup na Naffy + nieaktywny Vimeo */
                    <div className="mt-auto flex flex-col gap-2">
                      <a href={tut.naffyUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-between px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-amber-500 hover:bg-amber-400 text-black transition-all">
                        <span>{t.lang === 'EN' ? 'Buy now' : 'Kup teraz'}</span>
                        <span>{tut.price} PLN</span>
                      </a>
                      <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest border border-white/10 text-slate-600 cursor-not-allowed select-none">
                        🔒 {t.lang === 'EN' ? 'Watch — All-in-one only' : 'Oglądaj — tylko All-in-one'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA — tylko dla nie-Pro */}
        {!isPro && (
          <div className="rounded-2xl p-6 md:p-8 border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{boxShadow:'0 0 40px rgba(245,158,11,0.05)'}}>
            <div>
              <p className="text-white font-black text-sm uppercase tracking-tight mb-1">
                👑 {t.lang === 'EN' ? 'All tutorials + apps — from 199 PLN/mo' : 'Wszystkie tutoriale + aplikacje — od 199 zł/mies.'}
              </p>
              <p className="text-slate-500 text-xs">
                {t.lang === 'EN' ? 'One subscription. Everything included. Cancel anytime.' : 'Jeden abonament. Dostęp do wszystkiego. Anuluj kiedy chcesz.'}
              </p>
            </div>
            <a href={stripeLink(STRIPE_PRO_LINK, user?.uid, user?.email)} target="_blank" rel="noopener noreferrer"
              className="whitespace-nowrap px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest bg-amber-500 hover:bg-amber-400 text-black transition-all shadow-lg shadow-amber-500/20">
              {t.lang === 'EN' ? 'See plans →' : 'Włącz abonament →'}
            </a>
          </div>
        )}

      </div>
    </div>
  );
};


// =========================================================================
// NEW: DODATKI VIEW - External tools grouped by category
// =========================================================================
const DodatkiView = ({ t, onNavigate }) => {
  const [activeGroup, setActiveGroup] = useState('all');

  const toolGroups = {
    video: {
      label: t.lang === 'EN' ? '🎬 Video' : '🎬 Video',
      color: 'from-purple-500/20 to-pink-500/20',
      border: 'border-purple-500/20',
      accent: '#a855f7',
      tools: [
        { name:'Pika Labs', desc:t.lang==='EN'?'Generate stunning AI videos from text or images.':'Generuj filmy AI z tekstu lub zdjęć.', free:t.lang==='EN'?'150 credits/month':'150 kredytów/mies.', link:'https://pika.art', icon:'🎬' },
        { name:'CapCut AI', desc:t.lang==='EN'?'AI-powered video editor with auto-captions.':'Edytor wideo z AI i auto-napisami.', free:t.lang==='EN'?'Mostly free':'Przeważnie darmowy', link:'https://www.capcut.com', icon:'✂️' },
        { name:'Grok Imagine', desc:t.lang==='EN'?'xAI image and video generator.':'Generator obrazów i wideo od xAI.', free:t.lang==='EN'?'~10 videos/day':'~10 filmów/dzień', link:'https://grok.com', icon:'🤖' },
      ]
    },
    graphics: {
      label: t.lang === 'EN' ? '🎨 Graphics' : '🎨 Grafika',
      color: 'from-amber-500/20 to-orange-500/20',
      border: 'border-amber-500/20',
      accent: '#f59e0b',
      tools: [
        { name:'Leonardo AI', desc:t.lang==='EN'?'Professional AI image generation.':'Profesjonalne generowanie obrazów AI.', free:t.lang==='EN'?'150 tokens/day':'150 tokenów/dzień', link:'https://leonardo.ai', icon:'🎨' },
      ]
    },
    audio: {
      label: t.lang === 'EN' ? '🎙️ Audio' : '🎙️ Audio',
      color: 'from-green-500/20 to-emerald-500/20',
      border: 'border-green-500/20',
      accent: '#22c55e',
      tools: [
        { name:'Murf AI', desc:t.lang==='EN'?'Convert text to natural-sounding speech. 120+ voices.':'Zamień tekst na naturalny głos. 120+ głosów.', free:t.lang==='EN'?'10 min audio free':'10 min audio za darmo', link:'https://murf.ai', icon:'🎙️' },
        { name:'ElevenLabs', desc:t.lang==='EN'?'The most realistic AI voices.':'Najbardziej realistyczne głosy AI.', free:t.lang==='EN'?'$5/mo — huge amount':'$5/mies. — ogromna ilość', link:'https://elevenlabs.io', icon:'🎧' },
      ]
    },
    avatars: {
      label: t.lang === 'EN' ? '🧑‍💻 Avatars' : '🧑‍💻 Awatary',
      color: 'from-blue-500/20 to-cyan-500/20',
      border: 'border-blue-500/20',
      accent: '#3b82f6',
      tools: [
        { name:'D-ID', desc:t.lang==='EN'?'Create talking AI avatars from photos.':'Twórz mówiące awatary AI ze zdjęć.', free:t.lang==='EN'?'5 free videos/month':'5 darmowych filmów/mies.', link:'https://www.d-id.com', icon:'🧑‍💻' },
      ]
    },
  };

  const allTools = Object.entries(toolGroups).flatMap(([groupId, group]) =>
    group.tools.map(tool => ({ ...tool, groupId, groupLabel: group.label, groupAccent: group.accent, color: group.color, border: group.border }))
  );

  const displayTools = activeGroup === 'all' ? allTools : (toolGroups[activeGroup]?.tools.map(t => ({ ...t, groupId: activeGroup, groupAccent: toolGroups[activeGroup].accent, color: toolGroups[activeGroup].color, border: toolGroups[activeGroup].border })) || []);

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-700 font-sans px-4 py-12">
      <style>{`
        @keyframes float3d-tool {
          0%, 100% { transform: perspective(600px) rotateX(8deg) rotateY(-1deg) translateY(0px); }
          50% { transform: perspective(600px) rotateX(4deg) rotateY(1deg) translateY(-6px); }
        }
        .tool-card {
          transform: perspective(600px) rotateX(8deg) rotateY(-1deg);
          transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
          box-shadow: 0 16px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .tool-card:hover {
          transform: perspective(600px) rotateX(2deg) rotateY(0deg) translateY(-10px) scale(1.02);
          box-shadow: 0 30px 70px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1);
        }
      `}</style>
      <div className="max-w-6xl mx-auto">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-4">
            <Zap className="w-3 h-3" />
            {t.lang === 'EN' ? 'External Tools' : 'Narzędzia Zewnętrzne'}
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-black dark:text-white uppercase tracking-tighter mb-4">
            Dodatki
          </h1>
          <p className="text-slate-500 max-w-lg mx-auto text-sm">
            {t.lang === 'EN' ? 'Curated AI tools grouped by category — with free tier info.' : 'Wyselekcjonowane narzędzia AI pogrupowane według kategorii — z informacją o darmowych tierach.'}
          </p>
        </div>

        {/* 3D Filter tabs */}
        <div className="flex flex-wrap gap-4 justify-center mb-14">
          {[
            { key: 'all', label: t.lang === 'EN' ? 'All Tools' : 'Wszystkie', icon: '⚡', grad: 'linear-gradient(135deg,rgba(245,158,11,0.25),rgba(234,88,12,0.15))', border: 'rgba(245,158,11,0.4)', glow: 'rgba(245,158,11,0.3)' },
            { key: 'video', label: 'Video', icon: '🎬', grad: 'linear-gradient(135deg,rgba(168,85,247,0.25),rgba(236,72,153,0.15))', border: 'rgba(168,85,247,0.4)', glow: 'rgba(168,85,247,0.3)' },
            { key: 'graphics', label: t.lang === 'EN' ? 'Graphics' : 'Grafika', icon: '🎨', grad: 'linear-gradient(135deg,rgba(245,158,11,0.25),rgba(234,88,12,0.15))', border: 'rgba(245,158,11,0.4)', glow: 'rgba(245,158,11,0.3)' },
            { key: 'audio', label: 'Audio', icon: '🎙️', grad: 'linear-gradient(135deg,rgba(34,197,94,0.25),rgba(16,185,129,0.15))', border: 'rgba(34,197,94,0.4)', glow: 'rgba(34,197,94,0.3)' },
            { key: 'avatars', label: t.lang === 'EN' ? 'Avatars' : 'Awatary', icon: '🧑‍💻', grad: 'linear-gradient(135deg,rgba(59,130,246,0.25),rgba(6,182,212,0.15))', border: 'rgba(59,130,246,0.4)', glow: 'rgba(59,130,246,0.3)' },
          ].map(({ key, label, icon, grad, border, glow }) => {
            const isActive = activeGroup === key;
            return (
              <button
                key={key}
                onClick={() => setActiveGroup(key)}
                style={{
                  background: isActive ? 'rgba(245,158,11,1)' : grad,
                  border: `2px solid ${isActive ? 'rgba(245,158,11,1)' : border}`,
                  boxShadow: isActive
                    ? `0 0 30px ${glow}, 0 15px 35px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)`
                    : '0 12px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)',
                  transform: isActive
                    ? 'perspective(500px) rotateX(0deg) translateY(-6px) scale(1.05)'
                    : 'perspective(500px) rotateX(8deg)',
                  transition: 'all 0.35s cubic-bezier(0.23,1,0.32,1)',
                  color: isActive ? '#000' : 'rgba(255,255,255,0.8)',
                }}
                className="px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest"
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.transform = 'perspective(500px) rotateX(2deg) translateY(-4px) scale(1.02)'; e.currentTarget.style.color = '#fff'; }}}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.transform = 'perspective(500px) rotateX(8deg)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}}
              >
                <span style={{marginRight:'6px'}}>{icon}</span>{label}
              </button>
            );
          })}
        </div>

        {/* Tools grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayTools.map((tool, i) => (
            <a
              key={`${tool.name}-${i}`}
              href={tool.link}
              target="_blank"
              rel="noopener noreferrer"
              className={`tool-card relative rounded-2xl p-6 border bg-gradient-to-br ${tool.color} ${tool.border} flex flex-col group`}
              style={{ boxShadow: `0 20px 60px ${tool.groupAccent}40, 0 4px 20px rgba(0,0,0,0.3)` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl" style={{ filter: `drop-shadow(0 4px 8px ${tool.groupAccent}60)` }}>{tool.icon}</div>
                <span className="text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-full"
                  style={{ background: `${tool.groupAccent}20`, border: `1px solid ${tool.groupAccent}40`, color: tool.groupAccent }}>
                  {tool.groupLabel}
                </span>
              </div>
              <h3 className="text-black dark:text-white font-black text-xl mb-2">{tool.name}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed mb-4 flex-grow">{tool.desc}</p>
              <div className="flex items-center gap-1 mb-4">
                <Check className="w-3 h-3 text-emerald-500 flex-shrink-0"/>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{tool.free}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 group-hover:gap-2 transition-all flex items-center gap-1">
                  {t.lang === 'EN' ? 'Open Tool' : 'Otwórz'}
                  <ChevronRight className="w-3 h-3" />
                </span>
              </div>
              {/* Glow overlay — identyczny jak w Aplikacjach */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
                style={{ background: `radial-gradient(circle at 50% 0%, ${tool.groupAccent}60 0%, transparent 70%)` }} />
            </a>
          ))}
        </div>


      </div>
    </div>
  );
};

const AvatarBuilderView = ({ t, user, onLoginRequest }) => {
  const isLoggedIn = user && !user.isAnonymous;
  const [clicked, setClicked] = useState(false);
  const [tokens, setTokens] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState(false);

  useEffect(() => {
    if (isLoggedIn && user?.uid) {
      setLoadingTokens(true);
      getTokenData(db, user.uid).then(({ tokens, isPro }) => {
        setTokens(tokens);
        setIsPro(isPro);
        setLoadingTokens(false);
      }).catch(() => setLoadingTokens(false));
    } else {
      setTokens(null);
      setIsPro(false);
    }
  }, [isLoggedIn, user?.uid]);

  useEffect(() => {
    if (!isLoggedIn) {
      const noRight = e => e.preventDefault();
      const noF12 = e => { if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key)) || (e.ctrlKey && e.key === 'U')) e.preventDefault(); };
      document.addEventListener('contextmenu', noRight);
      document.addEventListener('keydown', noF12);
      return () => { document.removeEventListener('contextmenu', noRight); document.removeEventListener('keydown', noF12); };
    }
  }, [isLoggedIn]);
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

  const handleCopy = async () => {
    if (!isLoggedIn) { setClicked(true); return; }
    if (!isPro && tokens <= 0) return;
    const ok = await useToken(db, user.uid);
    if (ok) {
      navigator.clipboard.writeText(generatePrompt());
      setCopied(true);
      if (!isPro) setTokens(prev => prev - 1);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const sectionClass = "bg-white dark:bg-[#0A0A0A] border border-black/10 dark:border-[#222] p-5 rounded-2xl mb-6 transition-all duration-500";
  const labelClass = "block text-[9px] uppercase tracking-widest text-slate-500 mb-1.5 font-bold";
  const inputClass = "w-full bg-slate-100 dark:bg-[#121212] border border-black/10 dark:border-[#333] px-3 py-2 text-[13px] dark:text-white focus:border-amber-500 focus:outline-none transition-all rounded-lg appearance-none";
  const headerClass = "text-xs font-bold tracking-widest text-black dark:text-amber-500 mb-5 flex items-center gap-2 border-b border-black/10 dark:border-[#222] pb-3 uppercase";

  return (
    <div className="relative pb-20 p-4 md:p-8 bg-slate-50 dark:bg-black transition-colors duration-700 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-4"><Crown className="w-3 h-3"/>Prompt Studio — Edition Limitée</div>
            <h1 className="text-3xl md:text-4xl font-black text-black dark:text-white uppercase tracking-tighter">{t.lang === 'EN' ? 'Avatar Builder' : 'Kreator Awatarów'}</h1>
          </div>
          {isLoggedIn && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black ${isPro ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500' : tokens > 0 ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500' : 'bg-red-500/10 border border-red-500/30 text-red-500'}`}>
              <span>{isPro ? '👑' : '🎟'}</span>
              {loadingTokens ? '...' : isPro ? 'Pro — nielimitowany' : `${tokens}/3 ${t.lang === 'EN' ? 'demo prompts' : 'promptów demo'}`}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className={sectionClass}>
              <h2 className={headerClass}><PersonStanding className="w-4 h-4"/> {t.lang==='EN'?'I. Physique & Anatomy':'I. Sylwetka & Anatomia'}</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[{label:t.lang==='EN'?'Subject':'Podmiot',value:subject,set:setSubject,opts:[['1girl, beautiful woman', t.lang==='EN'?'1 Woman':'1 Kobieta'],['1boy, handsome man', t.lang==='EN'?'1 Man':'1 Mężczyzna'],['2girls, beautiful women', t.lang==='EN'?'2 Women':'2 Kobiety'],['1boy and 1girl, couple', t.lang==='EN'?'Couple':'Para']]},{label:t.lang==='EN'?'Build':'Sylwetka',value:bodyType,set:setBodyType,opts:[['slim and toned body', t.lang==='EN'?'Slim':'Szczupła'],['curvy, hourglass figure', t.lang==='EN'?'Curvy':'Klepsydra'],['athletic, muscular body', t.lang==='EN'?'Athletic':'Atletyczna']]},{label:t.lang==='EN'?'Bust':'Biust',value:breastSize,set:setBreastSize,opts:[['small breasts', t.lang==='EN'?'Small':'Mały'],['medium breasts', t.lang==='EN'?'Medium':'Średni'],['large heavy breasts', t.lang==='EN'?'Large':'Duży']]},{label:'Dół',value:lowerAnatomy,set:setLowerAnatomy,opts:[['none','Standard'],['noticeable crotch bulge','Bulge (M)'],['cameltoe','Cameltoe (F)']]},{label:t.lang==='EN'?'Body Hair':'Owłosienie',value:bodyHair,set:setBodyHair,opts:[['none', t.lang==='EN'?'Smooth':'Gładkie'],['light body hair', t.lang==='EN'?'Light':'Lekkie'],['hairy body', t.lang==='EN'?'Heavy':'Mocne']]}].map(f => (
                  <div key={f.label}><label className={labelClass}>{f.label}</label><div className="relative"><select value={f.value} onChange={e => f.set(e.target.value)} className={inputClass}>{f.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/></div></div>
                ))}
              </div>
            </div>
            <div className={sectionClass}>
              <h2 className={headerClass}><User className="w-4 h-4"/> {t.lang==='EN'?'II. Face & Hair':'II. Twarz & Włosy'}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[{label:t.lang==='EN'?'Hairstyle':'Fryzura',value:hairStyle,set:setHairStyle,opts:[['elegant updo hair, wedding style, revealing ears and earrings', t.lang==='EN'?'Wedding updo':'Upięcie ślubne'],['high bun hair, sleek look', t.lang==='EN'?'High bun':'Wysoki kok'],['tied in a ponytail', t.lang==='EN'?'Ponytail':'Kucyk']]},{label:t.lang==='EN'?'Color':'Kolor',value:hairColor,set:setHairColor,opts:[['blonde', t.lang==='EN'?'Blonde':'Blond'],['brunette', t.lang==='EN'?'Brunette':'Brązowe'],['black', t.lang==='EN'?'Black':'Czarne'],['red', t.lang==='EN'?'Red':'Rude']]},{label:t.lang==='EN'?'Length':'Długość',value:hairLength,set:setHairLength,opts:[['short', t.lang==='EN'?'Short':'Krótkie'],['long', t.lang==='EN'?'Long':'Długie']]},{label:t.lang==='EN'?'Face':'Twarz',value:faceSelect,set:setFaceSelect,opts:[['detailed symmetrical face, sharp features, natural skin', t.lang==='EN'?'Classic':'Klasyczna'],['cute face, freckles', t.lang==='EN'?'Freckles':'Piegi']]}].map(f => (
                  <div key={f.label}><label className={labelClass}>{f.label}</label><div className="relative"><select value={f.value} onChange={e => f.set(e.target.value)} className={inputClass}>{f.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/></div></div>
                ))}
              </div>
            </div>
            <div className={sectionClass}>
              <h2 className={headerClass}><Shirt className="w-4 h-4"/> {t.lang==='EN'?'III. Clothing & Background':'III. Ubranie & Tło'}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[{label:t.lang==='EN'?'Top':'Góra',value:topClothing,set:setTopClothing,opts:[['casual white t-shirt','T-shirt'],['suit jacket, formal','Marynarka'],['bikini top','Bikini'],['cocktail dress, elegant','Sukienka']]},{label:t.lang==='EN'?'Bottom':'Dół',value:bottomClothing,set:setBottomClothing,opts:[['blue denim jeans',t.lang==='EN'?'Jeans':'Jeansy'],['mini skirt',t.lang==='EN'?'Mini skirt':'Mini'],['elegant trousers',t.lang==='EN'?'Trousers':'Spodnie'],['bare legs, no pants',t.lang==='EN'?'Bare legs':'Gołe nogi']]},{label:t.lang==='EN'?'Shoes':'Obuwie',value:shoes,set:setShoes,opts:[['elegant high heels, stilettos','Szpilki'],['modern sneakers','Sportowe'],['barefoot','Boso']]},{label:t.lang==='EN'?'Legwear':'Nogi',value:legwear,set:setLegwear,opts:[['',t.lang==='EN'?'None':'Brak'],['pantyhose',t.lang==='EN'?'Tights':'Rajstopy'],['stockings with lace',t.lang==='EN'?'Stockings':'Pończochy']]}].map(f => (
                  <div key={f.label}><label className={labelClass}>{f.label}</label><div className="relative"><select value={f.value} onChange={e => f.set(e.target.value)} className={inputClass}>{f.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/></div></div>
                ))}
              </div>
              <div className="mt-4"><label className={labelClass}>Tło</label><div className="relative"><select value={bgSelect} onChange={e => setBgSelect(e.target.value)} className={inputClass}>{[['luxurious mansion interior, marble floors',t.lang==='EN'?'Mansion':'Rezydencja'],['modern bedroom, elegant interior, soft lighting',t.lang==='EN'?'Bedroom':'Sypialnia'],['modern bathroom, marble, luxury',t.lang==='EN'?'Bathroom':'Łazienka'],['modern living room, stylish interior',t.lang==='EN'?'Living Room':'Salon'],['modern kitchen, luxury design',t.lang==='EN'?'Kitchen':'Kuchnia'],['tropical beach, golden sand, ocean waves',t.lang==='EN'?'Beach':'Plaża'],['Venice canal at night, romantic lights',t.lang==='EN'?'Venice night':'Wenecja nocą'],['Paris street at night, Eiffel Tower, romantic',t.lang==='EN'?'Paris night':'Paryż nocą'],['Tokyo street, neon lights at night',t.lang==='EN'?'Tokyo night':'Tokio nocą'],['modern city street, neon lights at night',t.lang==='EN'?'City night':'Miasto nocą'],['professional studio, white background',t.lang==='EN'?'Studio':'Studio'],['forest, natural light, bokeh',t.lang==='EN'?'Forest':'Las']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/></div></div>
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="relative bg-white dark:bg-[#0A0A0A] border border-black/10 dark:border-[#333] p-6 rounded-2xl">
                <h2 className="text-[10px] font-bold tracking-widest mb-4 border-b border-black/10 dark:border-[#333] pb-2 text-black dark:text-amber-500 uppercase">Prompt</h2>
                <div className="relative">
                  <div className="bg-slate-100 dark:bg-[#121212] p-4 min-h-[200px] text-black dark:text-white font-mono text-[10px] leading-relaxed break-words border border-black/10 dark:border-[#222] mb-4 rounded-xl">
                    <span className="text-amber-500 font-bold">{"> "}</span>{generatePrompt()}
                  </div>
                  {/* Lock overlay — niezalogowany, zawsze widoczny */}
                  {!isLoggedIn && (
                    <div className="absolute inset-0 mb-4 rounded-xl backdrop-blur-sm bg-black/70 flex flex-col items-center justify-center p-4 text-center cursor-pointer" onClick={onLoginRequest}>
                      <div className="text-3xl mb-3">🔒</div>
                      <p className="text-white font-black text-xs uppercase tracking-widest mb-1">{t.lang === 'EN' ? 'Log in to copy' : 'Zaloguj się aby skopiować'}</p>
                      <p className="text-white/60 text-[10px] mb-3">{t.lang === 'EN' ? 'Free · 3 prompts included' : 'Bezpłatnie · 3 prompty gratis'}</p>
                      <span className="bg-amber-500 text-black font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl">{t.lang === 'EN' ? 'Log In / Register' : 'Zaloguj / Zarejestruj'}</span>
                    </div>
                  )}
                  {/* Lock overlay — zawsze gdy tokeny = 0 */}
                  {isLoggedIn && !isPro && tokens !== null && tokens <= 0 && (
                    <div className="absolute inset-0 mb-4 rounded-xl backdrop-blur-sm bg-black/70 flex flex-col items-center justify-center p-4 text-center">
                      <div className="text-3xl mb-3">💳</div>
                      <p className="text-white font-black text-xs uppercase tracking-widest mb-1">{t.lang === 'EN' ? 'No prompts left' : 'Brak promptów'}</p>
                      <p className="text-white/60 text-[10px] mb-3">{t.lang === 'EN' ? 'Upgrade to Pro — 29 PLN/mo' : 'Kup Pro — 29 zł/mies.'}</p>
                      <a href={stripeLink(STRIPE_PRO_LINK, user?.uid, user?.email)} target="_blank" rel="noopener noreferrer" className="bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl transition-all">
                        {t.lang === 'EN' ? 'Go Pro →' : 'Kup Pro →'}
                      </a>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleCopy}
                  className={`w-full py-3 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all ${copied ? 'bg-emerald-500 text-black' : 'bg-black dark:bg-amber-500 text-white dark:text-black hover:bg-amber-500 hover:text-black'}`}
                >
                  {copied ? '✔ Skopiowano!' : isPro ? `${t.lang === 'EN' ? 'Copy Prompt' : 'Kopiuj Prompt'} (∞ Pro)` : isLoggedIn && tokens > 0 ? `${t.lang === 'EN' ? 'Copy Prompt' : 'Kopiuj Prompt'} (${tokens}/3 🎟)` : t.lang === 'EN' ? 'Copy Prompt →' : 'Kopiuj Prompt →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


const ProductAdBuilderView = ({ t, user, onLoginRequest }) => {
  const isLoggedIn = user && !user.isAnonymous;
  const [clicked, setClicked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tokens, setTokens] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState(false);

  // Load tokens when user logs in
  useEffect(() => {
    if (isLoggedIn && user?.uid) {
      setLoadingTokens(true);
      getTokenData(db, user.uid).then(({ tokens, isPro }) => {
        setTokens(tokens);
        setIsPro(isPro);
        setLoadingTokens(false);
      }).catch(() => setLoadingTokens(false));
    } else {
      setTokens(null);
      setIsPro(false);
    }
  }, [isLoggedIn, user?.uid]);

  // Category
  const [category, setCategory] = useState('perfumy');

  // Produkt
  const [product, setProduct] = useState('luksusowy flakon perfum, matowy czarny');
  const [productColor, setProductColor] = useState('matowy czarny');
  const [material, setMaterial] = useState('szklany, premium');

  // Efekty
  const [effect, setEffect] = useState('para i mgła unosząca się elegancko wokół');
  const [splashEffect, setSplashEffect] = useState('eksplozja kolorowego proszku w slow motion');
  const [lighting, setLighting] = useState('złote ciepłe światło, golden hour, zachód słońca');

  // Ruch
  const [rotation, setRotation] = useState('powolny obrót 360 stopni, sweeping orbit kamery');
  const [levitation, setLevitation] = useState('unoszenie się w górę i dół, eleganckie i płynne');
  const [speed, setSpeed] = useState('wolno i elegancko, ultra slow motion');

  // Tło i styl
  const [bg, setBg] = useState('spokojny ocean o zachodzie słońca, golden hour');
  const [style, setStyle] = useState('fotorealistyczny, 8K, kinowy');
  const [mood, setMood] = useState('luksusowy, premium, elegancki');

  const CATEGORIES = {
    perfumy: { label: t.lang==='EN'?'🌸 Perfume/Cosmetics':'🌸 Perfumy/Kosmetyki', product: 'luksusowy flakon perfum, matowy czarny', material: 'szklany, premium' },
    torebka: { label: t.lang==='EN'?'👜 Handbag':'👜 Torebka', product: 'luksusowa torebka damska', material: 'skóra naturalna, gładka' },
    buty: { label: t.lang==='EN'?'👠 Heels/Shoes':'👠 Szpilki/Buty', product: 'eleganckie szpilki damskie, wysokie obcasy', material: 'skóra lakierowana' },
    bizuteria: { label: t.lang==='EN'?'💎 Jewelry':'💎 Biżuteria', product: 'luksusowy naszyjnik z diamentami', material: 'złoto 18k, błyszczący' },
    zegarek: { label: t.lang==='EN'?'⌚ Watch':'⌚ Zegarek', product: 'luksusowy zegarek męski', material: 'stal szlachetna, szkło szafirowe' },
    napoj: { label: t.lang==='EN'?'🥤 Drink/Bottle':'🥤 Napój/Butelka', product: 'elegancka butelka szklana z napojem', material: 'szkło przezroczyste' },
  };

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    const c = CATEGORIES[cat];
    setProduct(c.product);
    setMaterial(c.material);
  };

  const generatePrompt = () => {
    const productDesc = category === 'torebka' 
      ? `${product}, ${material}, kolor: ${productColor}`
      : category === 'buty'
      ? `${product}, ${material}, kolor: ${productColor}`
      : category === 'bizuteria'
      ? `${product}, ${material}, kolor: ${productColor}`
      : `${product}, ${material}, kolor: ${productColor}`;

    return [
      'Cinematic product advertisement',
      `of a ${mood} ${productDesc}`,
      `${effect},`,
      `${splashEffect !== 'brak' ? `suddenly enhanced by a ${splashEffect},` : ''}`,
      `The product ${levitation}.`,
      `Background: ${bg},`,
      `bathed in ${lighting}.`,
      `The camera executes a ${rotation}.`,
      `${style}, cinematic lighting, visual masterpiece, ultra-detailed, sharp focus, high-end commercial photography, ${mood} mood.`
    ].filter(p => p.trim()).join(' ');
  };

  const handleCopy = async () => {
    if (!isLoggedIn) { setClicked(true); return; }
    if (!isPro && tokens <= 0) return;
    const ok = await useToken(db, user.uid);
    if (ok) {
      navigator.clipboard.writeText(generatePrompt());
      setCopied(true);
      if (!isPro) setTokens(prev => prev - 1);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sectionClass = "bg-white dark:bg-[#0A0A0A] border border-black/10 dark:border-[#222] p-5 rounded-2xl mb-6 transition-all duration-500 font-sans";
  const labelClass = "block text-[9px] uppercase tracking-widest text-slate-500 mb-1.5 font-bold";
  const inputClass = "w-full bg-slate-100 dark:bg-[#121212] border border-black/10 dark:border-[#333] px-3 py-2 text-[13px] dark:text-white focus:border-amber-500 focus:outline-none transition-all rounded-lg appearance-none";
  const headerClass = "text-xs font-bold tracking-widest text-black dark:text-amber-500 mb-5 flex items-center gap-2 border-b border-black/10 dark:border-[#222] pb-3 uppercase";

  return (
    <div className="relative pb-20 p-4 md:p-8 bg-slate-50 dark:bg-black transition-colors duration-700 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-4"><Sparkles className="w-3 h-3"/>Ad Prompt Studio</div>
            <h1 className="text-3xl md:text-4xl font-black text-black dark:text-white uppercase tracking-tighter">{t.lang === 'EN' ? 'Product Ad Builder' : 'Kreator Reklam Produktowych'}</h1>
          </div>
          {isLoggedIn && (
            <div className="flex flex-col items-end gap-2">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black ${isPro ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500' : tokens > 0 ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500' : 'bg-red-500/10 border border-red-500/30 text-red-500'}`}>
                <span>{isPro ? '👑' : '🎟'}</span>
                {loadingTokens ? '...' : isPro ? 'Pro — nielimitowany' : `${tokens}/3 ${t.lang === 'EN' ? 'demo prompts' : 'promptów demo'}`}
              </div>

            </div>
          )}
        </div>

        {/* Category selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(CATEGORIES).map(([key, val]) => (
            <button key={key} onClick={e => { e.stopPropagation(); handleCategoryChange(key); }} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${category === key ? 'bg-amber-500 text-black border-amber-500' : 'border-black/10 dark:border-white/10 text-black dark:text-white hover:border-amber-500/50'}`}>
              {val.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className={sectionClass}>
              <h2 className={headerClass}><span className="text-lg">📦</span> I. Produkt</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  {label:'Opis produktu',value:product,set:setProduct,opts:
                    category === 'torebka' ? [['luksusowa torebka damska','Torebka klasyczna'],['kopertówka wieczorowa, mała','Kopertówka'],['shopperka, duża pojemna torba','Shopperka'],['plecak damski, elegancki','Plecak'],['saszetka, mini bag','Saszetka']] :
                    category === 'buty' ? [['eleganckie szpilki damskie, wysokie obcasy','Szpilki klasyczne'],['sandały na platformie, letnie','Sandały na platformie'],['botki damskie, za kostkę','Botki'],['kozaki damskie, za kolano','Kozaki'],['mokasyny damskie, płaskie','Mokasyny']] :
                    category === 'bizuteria' ? [['luksusowy naszyjnik z diamentami','Naszyjnik'],['pierścionek zaręczynowy z brylantem','Pierścionek'],['kolczyki wiszące, kryształy','Kolczyki'],['bransoletka tenisowa, diamenty','Bransoletka'],['broszka, vintage style','Broszka']] :
                    category === 'zegarek' ? [['luksusowy zegarek męski','Zegarek męski'],['zegarek damski, elegancki','Zegarek damski'],['smartwatch premium','Smartwatch'],['zegarek vintage, klasyczny','Zegarek vintage']] :
                    category === 'napoj' ? [['elegancka butelka szklana z napojem','Butelka szklana'],['puszka aluminiowa, nowoczesna','Puszka'],['butelka sportowa, premium','Butelka sportowa'],['karafka z napojem, luksusowa','Karafka']] :
                    [['luksusowy flakon perfum, matowy czarny','Flakon perfum'],['butelka kosmetyczna, elegancka','Butelka kosmetyczna'],['pudełko kosmetyczne, premium','Pudełko kosmetyczne'],['słoik z kremem, luksusowy','Słoik kremu']]
                  },
                  {label:t.lang==='EN'?'Color':'Kolor',value:productColor,set:setProductColor,opts:[['matowy czarny',t.lang==='EN'?'Matte Black':'Czarny mat'],['błyszczący złoty',t.lang==='EN'?'Shiny Gold':'Złoty'],['perłowy biały',t.lang==='EN'?'Pearl White':'Perłowy biały'],['głęboka czerwień',t.lang==='EN'?'Deep Red':'Czerwony'],['szampański beż',t.lang==='EN'?'Champagne':'Szampański'],['srebrny metaliczny',t.lang==='EN'?'Silver':'Srebrny'],['granatowy głęboki',t.lang==='EN'?'Navy Blue':'Granatowy'],['burgund, wino',t.lang==='EN'?'Burgundy':'Burgund']]},
                  {label:'Materiał',value:material,set:setMaterial,opts:
                    category === 'torebka' ? [['natural leather, smooth',t.lang==='EN'?'Smooth leather':'Skóra gładka'],['quilted leather, Chanel style',t.lang==='EN'?'Quilted leather':'Skóra pikowana'],['crocodile leather, exotic',t.lang==='EN'?'Crocodile':'Skóra krokodyla'],['suede, matte',t.lang==='EN'?'Suede':'Zamsz'],['fabric, premium canvas',t.lang==='EN'?'Fabric':'Tkanina'],['patent leather, lacquered',t.lang==='EN'?'Patent leather':'Patent/Lakier']] :
                    category === 'buty' ? [['skóra lakierowana','Lakierowana'],['skóra naturalna, matowa','Skóra naturalna'],['zamsz','Zamsz'],['satyna, wieczorowa','Satyna'],['patent, błyszcząca','Patent']] :
                    category === 'bizuteria' ? [['złoto 18k, błyszczący','Złoto 18k'],['platyna, lustrzany połysk','Platyna'],['srebro 925, polerowane','Srebro 925'],['różowe złoto, delikatne','Różowe złoto'],['tytan, nowoczesny','Tytan']] :
                    [['glass, premium',t.lang==='EN'?'Premium glass':'Szkło premium'],['metallic, chrome',t.lang==='EN'?'Chrome metal':'Metal chromowany'],['matte, concrete texture',t.lang==='EN'?'Matte concrete':'Matowy beton'],['crystal, transparent',t.lang==='EN'?'Crystal':'Kryształ']]
                  },
                ].map(f => (
                  <div key={f.label}><label className={labelClass}>{f.label}</label><div className="relative"><select value={f.value} onChange={e => { e.stopPropagation(); f.set(e.target.value); }} className={inputClass}>{f.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/></div></div>
                ))}
              </div>
            </div>

            <div className={sectionClass}>
              <h2 className={headerClass}><span className="text-lg">💧</span> II. Efekty i Oświetlenie</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  {label:t.lang==='EN'?'Main Effect':'Efekt główny',value:effect,set:setEffect,opts:[['para i mgła unosząca się elegancko wokół',t.lang==='EN'?'Steam & Mist':'Para i mgła'],['krople wody spływające powoli po powierzchni',t.lang==='EN'?'Water Drops':'Krople wody'],['lód i kryształy lodu otaczające produkt',t.lang==='EN'?'Ice & Crystals':'Lód i kryształy'],['złote drobinki i brokat unoszące się',t.lang==='EN'?'Gold Glitter':'Złoty brokat'],['delikatne płatki kwiatów opadające',t.lang==='EN'?'Flower Petals':'Płatki kwiatów'],['refleksy i błyski światła na powierzchni',t.lang==='EN'?'Light Reflections':'Refleksy światła']]},
                  {label:t.lang==='EN'?'Extra Effect':'Efekt dodatkowy',value:splashEffect,set:setSplashEffect,opts:[['eksplozja kolorowego proszku w slow motion',t.lang==='EN'?'Powder Explosion':'Eksplozja proszku'],['brak',t.lang==='EN'?'None':'Brak'],['odpryski wody w slow motion',t.lang==='EN'?'Water Splash':'Odpryski wody'],['śnieg i płatki śniegu opadające',t.lang==='EN'?'Snow':'Śnieg'],['płomienie i ogień w tle',t.lang==='EN'?'Fire':'Ogień'],['bąbelki powietrza unoszące się',t.lang==='EN'?'Bubbles':'Bąbelki']]},
                  {label:t.lang==='EN'?'Lighting':'Oświetlenie',value:lighting,set:setLighting,opts:[['złote ciepłe światło, golden hour, zachód słońca','Golden hour'],['dramatyczne studyjne, twarde cienie',t.lang==='EN'?'Studio Dramatic':'Studyjne'],['miękkie naturalne, rozproszone',t.lang==='EN'?'Soft Natural':'Naturalne miękkie'],['neonowe, cyberpunk, nocne miasto','Neon'],['zimne niebieskie, lodowe, zimowe',t.lang==='EN'?'Cold Blue':'Zimne niebieskie'],['świece i ciepłe punktowe',t.lang==='EN'?'Candles':'Świece']]},
                ].map(f => (
                  <div key={f.label}><label className={labelClass}>{f.label}</label><div className="relative"><select value={f.value} onChange={e => { e.stopPropagation(); f.set(e.target.value); }} className={inputClass}>{f.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/></div></div>
                ))}
              </div>
            </div>

            <div className={sectionClass}>
              <h2 className={headerClass}><span className="text-lg">🎬</span> III. Ruch, Kamera i Nastrój</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {label:t.lang==='EN'?'Rotation':'Obrót',value:rotation,set:setRotation,opts:[['powolny obrót 360 stopni, sweeping orbit kamery','360° sweeping orbit'],['delikatne kołysanie lewo-prawo',t.lang==='EN'?'Gentle Sway':'Kołysanie'],['kamera orbituje wokół produktu',t.lang==='EN'?'Camera Orbit':'Orbita kamery'],['statyczny, bez ruchu',t.lang==='EN'?'Static':'Statyczny'],['zoom in powoli na produkt','Zoom in']]},
                  {label:t.lang==='EN'?'Product Motion':'Ruch produktu',value:levitation,set:setLevitation,opts:[['unoszenie się w górę i dół, eleganckie i płynne','Levitation'],['brak ruchu produktu',t.lang==='EN'?'None':'Brak'],['delikatne drżenie, jak oddech',t.lang==='EN'?'Breathing':'Oddech'],['obrót produktu w miejscu',t.lang==='EN'?'Spin in place':'Obrót w miejscu']]},
                  {label:t.lang==='EN'?'Speed':'Prędkość',value:speed,set:setSpeed,opts:[['wolno i elegancko, ultra slow motion','Ultra slow motion'],['normalnie, płynnie',t.lang==='EN'?'Normal':'Normalnie'],['dynamicznie i szybko',t.lang==='EN'?'Dynamic':'Dynamicznie'],['ramping speed, od slow do fast','Speed ramp']]},
                  {label:t.lang==='EN'?'Mood':'Nastrój',value:mood,set:setMood,opts:[['luksusowy, premium, elegancki',t.lang==='EN'?'Luxury':'Luksus'],['świeży, naturalny, organiczny',t.lang==='EN'?'Natural':'Naturalny'],['energetyczny, dynamiczny, sportowy',t.lang==='EN'?'Sporty':'Sportowy'],['romantyczny, zmysłowy, delikatny',t.lang==='EN'?'Romantic':'Romantyczny'],['minimalistyczny, czysty',t.lang==='EN'?'Minimal':'Minimalizm'],['tajemniczy, mroczny, noir','Noir']]},
                ].map(f => (
                  <div key={f.label}><label className={labelClass}>{f.label}</label><div className="relative"><select value={f.value} onChange={e => { e.stopPropagation(); f.set(e.target.value); }} className={inputClass}>{f.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/></div></div>
                ))}
              </div>
              <div className="mt-4"><label className={labelClass}>Tło</label><div className="relative"><select value={bg} onChange={e => { e.stopPropagation(); setBg(e.target.value); }} className={inputClass}><option value="spokojny ocean o zachodzie słońca, golden hour">{t.lang==='EN'?'Ocean Sunset':'Ocean o zachodzie słońca'}</option><option value="ciemne studyjne tło, czarny gradient">{t.lang==='EN'?'Black Studio':'Czarne studio'}</option><option value="białe czyste minimalistyczne studio">{t.lang==='EN'?'White Studio':'Białe studio'}</option><option value="marmurowa posadzka, luksusowe wnętrze">{t.lang==='EN'?'Marble Luxury':'Marmur i luksus'}</option><option value="natura, zielone liście, bokeh">{t.lang==='EN'?'Nature Bokeh':'Natura z bokeh'}</option><option value="nocne miasto, neon, deszcz">{t.lang==='EN'?'Night City':'Nocne miasto'}</option><option value="śnieg i góry, zimowy krajobraz">{t.lang==='EN'?'Winter Landscape':'Zimowy krajobraz'}</option></select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/></div></div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="relative bg-white dark:bg-[#0A0A0A] border border-black/10 dark:border-[#333] p-6 rounded-2xl">
                <h2 className="text-[10px] font-bold uppercase tracking-widest mb-4 border-b border-black/10 dark:border-[#333] pb-2 text-black dark:text-amber-500">Prompt</h2>
                <div className="relative">
                  {/* Prompt always visible */}
                  <div className="bg-slate-100 dark:bg-[#121212] p-4 min-h-[200px] text-black dark:text-white font-mono text-[10px] leading-relaxed break-words border border-black/10 dark:border-[#222] mb-4 rounded-xl">
                    <span className="text-amber-500 font-bold">{"> "}</span>{generatePrompt()}
                  </div>
                  {/* Lock — only after clicking copy when not logged in */}
                  {!isLoggedIn && (
                    <div className="absolute inset-0 mb-4 rounded-xl backdrop-blur-sm bg-black/70 flex flex-col items-center justify-center p-4 text-center cursor-pointer" onClick={onLoginRequest}>
                      <div className="text-3xl mb-3">🔒</div>
                      <p className="text-white font-black text-xs uppercase tracking-widest mb-1">{t.lang === 'EN' ? 'Log in to copy' : 'Zaloguj się aby skopiować'}</p>
                      <p className="text-white/60 text-[10px] mb-3">{t.lang === 'EN' ? 'Free · 3 prompts included' : 'Bezpłatnie · 3 prompty gratis'}</p>
                      <span className="bg-amber-500 text-black font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl">{t.lang === 'EN' ? 'Log In / Register' : 'Zaloguj / Zarejestruj'}</span>
                    </div>
                  )}
                  {/* Lock — when logged in but tokens exhausted and tried to copy */}
                  {isLoggedIn && !isPro && tokens !== null && tokens <= 0 && (
                    <div className="absolute inset-0 mb-4 rounded-xl backdrop-blur-sm bg-black/70 flex flex-col items-center justify-center p-4 text-center">
                      <div className="text-3xl mb-3">💳</div>
                      <p className="text-white font-black text-xs uppercase tracking-widest mb-1">{t.lang === 'EN' ? 'No prompts left' : 'Brak promptów'}</p>
                      <p className="text-white/60 text-[10px] mb-3">{t.lang === 'EN' ? 'Upgrade to Pro — 29 PLN/mo' : 'Kup Pro — 29 zł/mies.'}</p>
                      <a href={stripeLink(STRIPE_PRO_LINK, user?.uid, user?.email)} target="_blank" rel="noopener noreferrer" className="bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl transition-all">
                        {t.lang === 'EN' ? 'Go Pro →' : 'Kup Pro →'}
                      </a>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleCopy}
                  className={`w-full py-3 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all ${copied ? 'bg-emerald-500 text-black' : 'bg-black dark:bg-amber-500 text-white dark:text-black hover:bg-amber-500 hover:text-black'}`}
                >
                  {copied ? '✔ Skopiowano!' : isPro ? `Kopiuj Prompt (∞ Pro)` : isLoggedIn && tokens > 0 ? `Kopiuj Prompt (${tokens}/3 🎟)` : t.lang === 'EN' ? 'Copy Prompt →' : 'Kopiuj Prompt →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// CENNIK VIEW
// =========================================================================
const CennikView = ({ t, user, onLoginRequest }) => {
  const STRIPE_STARTER = 'https://buy.stripe.com/cNiaEWbCF6aj7V63jI8bS01';
  const STRIPE_ALLINONE_MONTHLY = 'https://buy.stripe.com/cNiaEWbCF6aj7V63jI8bS01';
  const STRIPE_ALLINONE_ANNUAL = 'https://buy.stripe.com/9B6cN4eOR8ir1wIcUi8bS02';

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-700 font-sans px-4 py-12">
      <style>{`
        .price-card { transform: perspective(800px) rotateX(4deg); transition: all 0.4s cubic-bezier(0.23,1,0.32,1); }
        .price-card:hover { transform: perspective(800px) rotateX(0deg) translateY(-12px) scale(1.02); }
      `}</style>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"/>
            {t.lang === 'EN' ? 'Pricing' : 'Cennik'}
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-black dark:text-white uppercase tracking-tighter mb-4">
            {t.lang === 'EN' ? 'Choose your plan' : 'Wybierz swój plan'}<span className="text-amber-500">.</span>
          </h1>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">
            {t.lang === 'EN' ? "Start free. Upgrade when you're ready." : 'Zacznij za darmo. Rozbuduj kiedy chcesz.'}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-start">

          {/* PLAN 1 — Starter */}
          <div className="price-card relative rounded-3xl p-8 border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/5 flex flex-col"
            style={{boxShadow:'0 20px 60px rgba(245,158,11,0.15)'}}>
            <div className="text-5xl mb-4" style={{filter:'drop-shadow(0 8px 16px rgba(245,158,11,0.4))',transform:'perspective(200px) rotateX(10deg)'}}>⚡</div>
            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-500 mb-2">Starter</div>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-5xl font-black text-black dark:text-white">30</span>
              <span className="text-sm text-slate-400 mb-2">PLN/{t.lang==='EN'?'mo':'mies.'}</span>
            </div>
            <p className="text-slate-400 text-xs mb-6">{t.lang==='EN'?'Access to AI creator apps':'Dostęp do aplikacji AI'}</p>
            <div className="space-y-2 mb-8 flex-grow">
              {['✔ Avatar Builder','✔ Product Ad Builder',
                t.lang==='EN'?'✔ Unlimited prompts':'✔ Nielimitowane prompty',
                t.lang==='EN'?'✘ Tutorials':'✘ Tutoriale'
              ].map((f,i)=>(
                <p key={i} className={`text-xs ${f.startsWith('✔') ? 'text-black dark:text-white' : 'text-slate-500'}`}>{f}</p>
              ))}
            </div>
            <a href={user ? stripeLink(STRIPE_STARTER, user.uid, user.email) : '#'}
              onClick={e => { if (!user) { e.preventDefault(); onLoginRequest(); }}}
              target="_blank" rel="noopener noreferrer"
              className="block w-full py-3.5 font-black text-[11px] uppercase tracking-widest rounded-xl text-center bg-amber-500/20 border border-amber-500/40 text-amber-500 hover:bg-amber-500 hover:text-black transition-all">
              {t.lang==='EN'?'Get Starter →':'Wybierz Starter →'}
            </a>
          </div>

          {/* PLAN 2 — All-in-one Miesięczny HIGHLIGHT */}
          <div className="price-card relative rounded-3xl p-8 border border-amber-500 bg-gradient-to-br from-amber-500/15 to-orange-600/10 flex flex-col"
            style={{boxShadow:'0 0 60px rgba(245,158,11,0.3), 0 20px 60px rgba(245,158,11,0.15)'}}>
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest px-5 py-1.5 rounded-full whitespace-nowrap">
              👑 {t.lang==='EN'?'Most Popular':'Najpopularniejszy'}
            </div>
            <div className="text-5xl mb-4" style={{filter:'drop-shadow(0 8px 20px rgba(245,158,11,0.6))',transform:'perspective(200px) rotateX(10deg)'}}>🚀</div>
            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-400 mb-2">All-in-one</div>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-5xl font-black text-black dark:text-white">199</span>
              <span className="text-sm text-slate-400 mb-2">PLN/{t.lang==='EN'?'mo':'mies.'}</span>
            </div>
            <p className="text-slate-400 text-xs mb-6">{t.lang==='EN'?'Full platform access':'Pełny dostęp do platformy'}</p>
            <div className="space-y-2 mb-8 flex-grow">
              {['✔ Avatar Builder + Ad Builder',
                t.lang==='EN'?'✔ All tutorials included':'✔ Wszystkie tutoriale w cenie',
                t.lang==='EN'?'✔ Unlimited prompts':'✔ Nielimitowane prompty',
                t.lang==='EN'?'✔ New content every week':'✔ Nowe treści co tydzień',
                t.lang==='EN'?'✔ Cancel anytime':'✔ Anuluj w dowolnym momencie'
              ].map((f,i)=>(
                <p key={i} className="text-xs text-black dark:text-white">{f}</p>
              ))}
            </div>
            <a href={user ? stripeLink(STRIPE_ALLINONE_MONTHLY, user.uid, user.email) : '#'}
              onClick={e => { if (!user) { e.preventDefault(); onLoginRequest(); }}}
              target="_blank" rel="noopener noreferrer"
              className="block w-full py-3.5 font-black text-[11px] uppercase tracking-widest rounded-xl text-center bg-amber-500 hover:bg-amber-400 text-black transition-all shadow-lg shadow-amber-500/30">
              {t.lang==='EN'?'Get All-in-one →':'Wybierz All-in-one →'}
            </a>
          </div>

          {/* PLAN 3 — All-in-one Roczny */}
          <div className="price-card relative rounded-3xl p-8 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 flex flex-col"
            style={{boxShadow:'0 20px 60px rgba(34,197,94,0.1)'}}>
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest px-5 py-1.5 rounded-full whitespace-nowrap">
              🎁 {t.lang==='EN'?'2 months FREE':'2 miesiące GRATIS'}
            </div>
            <div className="text-5xl mb-4" style={{filter:'drop-shadow(0 8px 20px rgba(34,197,94,0.5))',transform:'perspective(200px) rotateX(10deg)'}}>💎</div>
            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-2">All-in-one Roczny</div>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-5xl font-black text-black dark:text-white">1899</span>
              <span className="text-sm text-slate-400 mb-2">PLN/{t.lang==='EN'?'year':'rok'}</span>
            </div>
            <p className="text-slate-400 text-xs mb-1">{t.lang==='EN'?'10 months + 2 free':'10 miesięcy + 2 gratis'}</p>
            <p className="text-emerald-400 text-[10px] font-bold mb-6">{t.lang==='EN'?'Save 498 PLN vs monthly':'Oszczędzasz 489 PLN vs miesięczny'}</p>
            <div className="space-y-2 mb-8 flex-grow">
              {['✔ Avatar Builder + Ad Builder',
                t.lang==='EN'?'✔ All tutorials included':'✔ Wszystkie tutoriale w cenie',
                t.lang==='EN'?'✔ Unlimited prompts':'✔ Nielimitowane prompty',
                t.lang==='EN'?'✔ New content every week':'✔ Nowe treści co tydzień',
                t.lang==='EN'?'✔ Best price per month':'✔ Najlepsza cena za miesiąc'
              ].map((f,i)=>(
                <p key={i} className="text-xs text-black dark:text-white">{f}</p>
              ))}
            </div>
            <a href={user ? stripeLink(STRIPE_ALLINONE_ANNUAL, user.uid, user.email) : '#'}
              onClick={e => { if (!user) { e.preventDefault(); onLoginRequest(); }}}
              target="_blank" rel="noopener noreferrer"
              className="block w-full py-3.5 font-black text-[11px] uppercase tracking-widest rounded-xl text-center bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all">
              {t.lang==='EN'?'Get Annual →':'Wybierz Roczny →'}
            </a>
          </div>

        </div>
        <p className="text-center text-xs text-slate-500 mt-8">🔒 {t.lang==='EN'?'Secure payment via Stripe. Cancel anytime.':'Bezpieczna płatność przez Stripe. Anuluj kiedy chcesz.'}</p>
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


// =========================================================================
// MAIN APP - Redesigned Navigation: Academy → Aplikacje → Dodatki → Tutoriale
// =========================================================================
// =========================================================================
// ADMIN VIEW
// =========================================================================
const AdminView = ({ setCurrentView, lang, user }) => {
  const appId2 = "aiflow_academy";
  const tutorialsRef = (db2) => doc(db2, 'artifacts', appId2, 'public', 'data', 'config', 'tutorials');

  const emptyTut = { title_pl: '', title_en: '', duration: '', ytId: '', naffyUrl: '', vimeoUrl: '', price: '49' };
  const [tutorials, setTutorials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getDoc(tutorialsRef(db)).then(snap => {
      if (snap.exists() && snap.data().list) {
        setTutorials(snap.data().list);
      } else {
        setTutorials([
          { title_pl: 'Wprowadzenie do Awatarów AI', title_en: 'Introduction to AI Avatars', duration: '12:34', ytId: '1_1oHwOZMe4', naffyUrl: 'https://naffy.io', vimeoUrl: '', price: '49' },
          { title_pl: 'Podstawy Inżynierii Promptów', title_en: 'Prompt Engineering Basics', duration: '18:21', ytId: '1_1oHwOZMe4', naffyUrl: 'https://naffy.io', vimeoUrl: '', price: '49' },
        ]);
      }
      setLoading(false);
    });
  }, []);

  const update = (i, field, val) => {
    setTutorials(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t));
  };

  const addTut = () => setTutorials(prev => [...prev, { ...emptyTut }]);
  const removeTut = (i) => setTutorials(prev => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    await setDoc(tutorialsRef(db), { list: tutorials });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputCls = "w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-500 focus:outline-none transition-colors";
  const labelCls = "block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1";

  return (
    <div className="min-h-screen bg-black font-sans px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-4">
              ⚙ Panel Admina
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Zarządzanie Tutorialami</h1>
            <p className="text-slate-500 text-xs mt-1">Zmiany zapisują się w Firestore i od razu pojawiają na stronie.</p>
          </div>
          <button onClick={() => setCurrentView('home')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-white/50 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all">
            <ArrowLeft className="w-4 h-4" /> Wróć
          </button>
        </div>

        {loading ? (
          <div className="text-slate-500 text-sm">Ładowanie...</div>
        ) : (
          <div className="space-y-6">
            {tutorials.map((tut, i) => (
              <div key={i} className="bg-[#0a0a0a] border border-white/8 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-amber-500 font-black text-xs uppercase tracking-widest">Tutorial #{i + 1}</span>
                  <button onClick={() => removeTut(i)}
                    className="text-red-500/60 hover:text-red-400 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Usuń
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={labelCls}>Tytuł PL</label>
                    <input value={tut.title_pl} onChange={e => update(i, 'title_pl', e.target.value)} className={inputCls} placeholder="Tytuł po polsku"/>
                  </div>
                  <div>
                    <label className={labelCls}>Title EN</label>
                    <input value={tut.title_en} onChange={e => update(i, 'title_en', e.target.value)} className={inputCls} placeholder="Title in English"/>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className={labelCls}>YouTube ID</label>
                    <input value={tut.ytId} onChange={e => update(i, 'ytId', e.target.value)} className={inputCls} placeholder="np. dQw4w9WgXcQ"/>
                  </div>
                  <div>
                    <label className={labelCls}>Czas trwania</label>
                    <input value={tut.duration} onChange={e => update(i, 'duration', e.target.value)} className={inputCls} placeholder="np. 12:34"/>
                  </div>
                  <div>
                    <label className={labelCls}>Cena (PLN)</label>
                    <input value={tut.price} onChange={e => update(i, 'price', e.target.value)} className={inputCls} placeholder="49"/>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Link Naffy</label>
                  <input value={tut.naffyUrl} onChange={e => update(i, 'naffyUrl', e.target.value)} className={inputCls} placeholder="https://naffy.io/..."/>
                  <label className={labelCls}>Vimeo URL (dla Pro)</label>
                  <input value={tut.vimeoUrl || ''} onChange={e => update(i, 'vimeoUrl', e.target.value)} className={inputCls} placeholder="https://vimeo.com/..."/>
                </div>
                {/* Preview miniaturki */}
                {tut.ytId && (
                  <div className="mt-4 flex items-center gap-3">
                    <img src={`https://img.youtube.com/vi/${tut.ytId}/mqdefault.jpg`} className="w-24 h-14 rounded-lg object-cover border border-white/10" alt="thumb"/>
                    <a href={`https://www.youtube.com/watch?v=${tut.ytId}`} target="_blank" rel="noopener noreferrer"
                      className="text-amber-400 text-[10px] font-bold uppercase tracking-widest hover:underline">
                      ▶ Podgląd na YouTube
                    </a>
                  </div>
                )}
              </div>
            ))}

            <button onClick={addTut}
              className="w-full py-4 rounded-2xl border-2 border-dashed border-white/10 text-white/30 hover:border-amber-500/40 hover:text-amber-500/60 font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2">
              <PlusCircle className="w-4 h-4" /> Dodaj tutorial
            </button>

            <button onClick={save} disabled={saving}
              className={`w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${saved ? 'bg-emerald-500 text-black' : 'bg-amber-500 hover:bg-amber-400 text-black'}`}
              style={{boxShadow: '0 0 30px rgba(245,158,11,0.3)'}}>
              {saving ? 'Zapisywanie...' : saved ? '✓ Zapisano!' : 'Zapisz zmiany →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeCreator, setActiveCreator] = useState(null);
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState('PL');
  const [cookiesAccepted, setCookiesAccepted] = useState(() => localStorage.getItem('cookies') === '1');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSent, setNewsletterSent] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const t = { ...translations[lang], lang };
  const isLoggedIn = user && !user.isAnonymous;

  // New nav items: Academy → Aplikacje → Dodatki → Tutoriale
  const navItems = [
    { id: 'home', label: t.lang === 'EN' ? 'Academy' : 'Academy' },
    { id: 'aplikacje', label: 'Aplikacje' },
    { id: 'dodatki', label: 'Dodatki' },
    { id: 'tutorials', label: t.nav_tutorials },
    { id: 'cennik', label: t.lang === 'EN' ? 'Pricing' : 'Cennik' },
  ];


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        // Small delay gives Firebase time to resolve Google session before falling back to anonymous
        setTimeout(() => {
          if (!auth.currentUser) {
            signInAnonymously(auth).catch(err => console.error('Auth error:', err));
          }
        }, 1500);
      }
    });
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

        {/* ===== NAV ===== */}
        <nav className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-4 font-sans transition-colors duration-300"
          style={{
            background: isDarkMode ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.90)',
            backdropFilter: 'blur(20px)',
            borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)'
          }}>
          <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('home')}>
              <img src="/logo.png" alt="AI Flow" className="h-8 w-auto" />
            </div>

            {/* Main nav - NEW STRUCTURE */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl transition-colors"
                style={{
                  background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)'
                }}>
                {navItems.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setCurrentView(id)}
                    className={`relative px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-200 ${
                      currentView === id
                        ? 'bg-amber-500 text-black'
                        : isDarkMode
                        ? 'text-white/40 hover:text-white/80'
                        : 'text-black/40 hover:text-black/80'
                    }`}
                  >
                    {label}
                    {/* Glowing arrow indicator between tabs */}
                    {currentView === id && id !== 'tutorials' && (
                      <span className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-1 h-1 bg-amber-400 rounded-full"
                        style={{ boxShadow: '0 0 6px rgba(245,158,11,0.8)' }} />
                    )}
                  </button>
                ))}
              </div>

              <LangSwitcher lang={lang} setLang={setLang} />

              {isLoggedIn ? (
                <div className="flex items-center gap-2">
                  {user?.email === ADMIN_EMAIL && (
                    <button onClick={() => setCurrentView('admin')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-amber-400 text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-amber-500/10"
                      style={{border:'1px solid rgba(245,158,11,0.3)'}}>
                      ⚙
                    </button>
                  )}
                  <button onClick={() => signOut(auth)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-emerald-500/10"
                    style={{border:'1px solid rgba(52,211,153,0.3)'}}>
                    <User className="w-4 h-4" /><span className="hidden sm:block">{user.email?.split('@')[0] || 'Konto'}</span>
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowLogin(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all">
                  <User className="w-4 h-4" /><span className="hidden sm:block">{lang === 'EN' ? 'Log In' : 'Zaloguj'}</span>
                </button>
              )}

              <button onClick={() => setIsDarkMode(!isDarkMode)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${isDarkMode ? 'text-white/40 hover:text-amber-400' : 'text-black/40 hover:text-amber-500'}`}
                style={{border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)'}}>
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </nav>

        {/* ===== MAIN CONTENT ===== */}
        <main className="pt-16">
          {/* Global page nav arrows — widoczne wszędzie poza wnętrzem kreatora */}
          {['home','aplikacje','dodatki','tutorials','cennik'].includes(currentView) && !activeCreator && (() => {
            const pages = ['home','aplikacje','dodatki','tutorials','cennik'];
            const pidx = pages.indexOf(currentView);
            const prevP = pidx > 0 ? pages[pidx - 1] : null;
            const nextP = pidx < pages.length - 1 ? pages[pidx + 1] : null;
            return (<>
              {prevP && (
                <button onClick={() => setCurrentView(prevP)} className="fixed left-2 md:left-4 top-1/2 -translate-y-1/2 z-40 group" style={{filter:'drop-shadow(0 0 16px rgba(245,158,11,0.5))'}}>
                  <div className="w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all group-hover:scale-110" style={{background:'rgba(245,158,11,0.12)',border:'2px solid rgba(245,158,11,0.4)',boxShadow:'0 0 24px rgba(245,158,11,0.2)'}}>
                    <ChevronLeft className="w-5 h-5 md:w-7 md:h-7 text-amber-400" />
                  </div>
                </button>
              )}
              {nextP && (
                <button onClick={() => setCurrentView(nextP)} className="fixed right-2 md:right-4 top-1/2 -translate-y-1/2 z-40 group" style={{filter:'drop-shadow(0 0 16px rgba(245,158,11,0.5))'}}>
                  <div className="w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all group-hover:scale-110" style={{background:'rgba(245,158,11,0.12)',border:'2px solid rgba(245,158,11,0.4)',boxShadow:'0 0 24px rgba(245,158,11,0.2)'}}>
                    <ChevronRight className="w-5 h-5 md:w-7 md:h-7 text-amber-400" />
                  </div>
                </button>
              )}
            </>);
          })()}

          {currentView === 'home' && <HomeView t={t} user={user} onLoginRequest={() => setShowLogin(true)} />}
          {currentView === 'aplikacje' && <AplikacjeView t={t} user={user} onLoginRequest={() => setShowLogin(true)} onCreatorChange={setActiveCreator} />}
          {currentView === 'dodatki' && <DodatkiView t={t} onNavigate={setCurrentView} />}
          {currentView === 'tutorials' && <TutorialsView t={t} user={user} onLoginRequest={() => setShowLogin(true)} />}
          {currentView === 'cennik' && <CennikView t={t} user={user} onLoginRequest={() => setShowLogin(true)} />}
          {/* Legacy routes still supported */}
          {currentView === 'prompt-builder' && <AplikacjeView t={t} user={user} onLoginRequest={() => setShowLogin(true)} />}
          {currentView === 'avatar-builder' && <AvatarBuilderView t={t} user={user} onLoginRequest={() => setShowLogin(true)} />}
          {currentView === 'ad-builder' && <ProductAdBuilderView t={t} user={user} onLoginRequest={() => setShowLogin(true)} />}
          {currentView === 'admin' && user?.email === ADMIN_EMAIL && <AdminView setCurrentView={setCurrentView} lang={lang} user={user} />}
          {currentView === 'impressum' && <ImpressumView setCurrentView={setCurrentView} lang={lang} />}
          {currentView === 'datenschutz' && <DatenschutzView setCurrentView={setCurrentView} lang={lang} />}
          {currentView === 'regulamin' && <RegulaminView setCurrentView={setCurrentView} lang={lang} />}
        </main>

        {showLogin && <LoginModal onClose={() => setShowLogin(false)} lang={lang} />}

        {/* ===== FOOTER ===== */}
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

        {/* ===== COOKIES ===== */}
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

// updated Tue Mar  3 23:31:30 UTC 2026
