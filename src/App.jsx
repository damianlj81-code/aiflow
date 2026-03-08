// 🎾 Damian odbija, Claude odbija, i tak se chłopaki grają.
// Ten plik miał być pushowany godzinę temu... tydzień później... a jeszcze to.
// Built with zero programming experience & maximum chaos. loveaiflow.com
import React, { useState, useEffect, useRef } from 'react';
import {
  Check, Zap, X, Play, Lock, ChevronDown, Youtube,
  CreditCard, Building2, Sun, Moon, User, Mountain,
  Eye, Scissors, Shirt, Footprints, PersonStanding,
  Crown, Sparkles, Key, Save, Trash2, PlusCircle,
  ChevronLeft, ChevronRight, ArrowLeft
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
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
const STRIPE_PRO_LINK = 'https://buy.stripe.com/cNiaEWbCF6aj7V63jI8bS01'; // 199 PLN miesiecznie
const STRIPE_STARTER_LINK = 'https://buy.stripe.com/14A28qcGJ56fdfq5rQ8bS05'; // 30 PLN miesiecznie
const STRIPE_ANNUAL_LINK = 'https://buy.stripe.com/7sYfZg7mpgOX2AM5rQ8bS06'; // 1899 PLN rocznie
const STRIPE_PRO_LINK_TEST = 'https://buy.stripe.com/dRm6oGeOR6aj3EQcUi8bS04'; // 2 PLN test admin
const ADMIN_EMAIL = 'damianlj@live.com';
const stripeLink = (baseUrl, uid, email) => { const base = email === ADMIN_EMAIL ? STRIPE_PRO_LINK_TEST : baseUrl; return uid ? `${base}?client_reference_id=${uid}` : base; };

const getSubscriptionStatus = (data) => {
  if (!data || (!data.pro && !data.starter)) return { active: false, reason: 'no_plan' };
  const expiryDate = data.expiresAt?.seconds
    ? new Date(data.expiresAt.seconds * 1000)
    : data.expiresAt ? new Date(data.expiresAt) : null;
  const now = new Date();
  if (!expiryDate || now > expiryDate) return { active: false, reason: 'expired', date: expiryDate };
  if (data.paymentFailed) return { active: true, warning: 'payment_failed', date: expiryDate };
  return { active: true, reason: 'ok', date: expiryDate };
};

async function getTokenData(db, uid) {
  const ref = doc(db, 'artifacts', appId, 'public', 'data', 'tokens', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { tokens: TOKENS_FREE, used: 0, createdAt: new Date().toISOString(), pro: false, starter: false });
    return { tokens: TOKENS_FREE, isPro: false, isStarter: false, isExpired: false, paymentFailed: false, daysLeft: null, plan: null };
  }
  const data = snap.data();
  const now = new Date();
  const expiresAt = data.expiresAt?.seconds
    ? new Date(data.expiresAt.seconds * 1000)
    : data.expiresAt ? new Date(data.expiresAt) : null;
  const isExpired = expiresAt ? now > expiresAt : false;
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))) : null;
  const isPro = data.pro === true && !isExpired;
  const isStarter = data.starter === true && !isExpired;
  return {
    tokens: data.tokens || 0,
    isPro,
    isStarter,
    isExpired,
    daysLeft,
    paymentFailed: data.paymentFailed === true,
    plan: data.plan || null,
  };
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
  // Sprawdź czy pro jest aktywne (nie wygasłe)
  if (data.pro === true) {
    const expiresAt = data.expiresAt?.seconds
      ? new Date(data.expiresAt.seconds * 1000)
      : data.expiresAt ? new Date(data.expiresAt) : null;
    if (!expiresAt || new Date() < expiresAt) return true;
    // Pro wygasło — traktuj jako free
  }
  if (data.starter === true) {
    const expiresAt = data.expiresAt?.seconds
      ? new Date(data.expiresAt.seconds * 1000)
      : data.expiresAt ? new Date(data.expiresAt) : null;
    if (!expiresAt || new Date() < expiresAt) return true;
  }
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
    footer_copy: '© 2026 DDC Ai Flow',
    lang: 'PL',
  },
  EN: {
    nav_academy: 'Academy',
    nav_tutorials: 'Tutorials',
    nav_studio: 'Studio Pro',
    home_tagline: 'The art of creating visions of the future.',
    home_pricing_title: 'Premium Subscription',
    footer_copy: '© 2026 DDC Ai Flow',
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

const LoginModal = ({ onClose, lang, onRegulamin }) => {
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
        {mode === 'register' && (
          <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 mt-3 leading-relaxed px-2">
            {lang === 'EN'
              ? <>By creating an account you accept our <button onClick={() => { if (onClose) onClose(); if (onRegulamin) onRegulamin(); }} className="text-amber-500 hover:underline font-bold">Terms of Service</button> and <button onClick={() => { if (onClose) onClose(); if (onRegulamin) onRegulamin(); }} className="text-amber-500 hover:underline font-bold">Privacy Policy</button>, including the terms of use for AI tools.</>
              : <>Zakładając konto akceptujesz <button onClick={() => { if (onClose) onClose(); if (onRegulamin) onRegulamin(); }} className="text-amber-500 hover:underline font-bold">Regulamin</button> oraz <button onClick={() => { if (onClose) onClose(); if (onRegulamin) onRegulamin(); }} className="text-amber-500 hover:underline font-bold">Politykę Prywatności</button> serwisu, w tym warunki korzystania z narzędzi AI.</>
            }
          </p>
        )}
      </div>
    </div>
  );
};

// =========================================================================
// PRICING BUTTON
// =========================================================================
const PricingButton = ({ plan, t, highlight, user, onLoginRequest }) => {
  const LINKS = {
    basic: STRIPE_STARTER_LINK,
    monthly: STRIPE_PRO_LINK,
    annual: STRIPE_ANNUAL_LINK,
  };
  return (
    <a
      href={user && !user.isAnonymous ? stripeLink(LINKS[plan], user.uid, user.email) : '#'}
      onClick={e => { if (!user || user.isAnonymous) { e.preventDefault(); onLoginRequest && onLoginRequest(); }}}
      target="_blank" rel="noopener noreferrer"
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

  const [easterEgg, setEasterEgg] = useState(false);

  const handleSend = async () => {
    if (!email || (!selectedQ && !customQ)) return;
    // 🎾 KOD DAN BROWNA — easter egg powered by Claude
    if (email.toLowerCase() === 'damian@claude.kabum') {
      setEasterEgg(true);
      return;
    }
    setSending(true);
    try {
      const res = await fetch('https://formspree.io/f/xkoqgrng', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, question: customQ || selectedQ }),
      });
      if (res.ok) setSent(true);
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
          {easterEgg ? (
            <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.95)',zIndex:9999,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'20px'}}>
              <div style={{fontFamily:'monospace',color:'#F5A623',fontSize:'13px',letterSpacing:'3px',textTransform:'uppercase',marginBottom:'12px',opacity:.5}}>🔐 KOD DAN BROWNA — powered by Claude</div>
              <div style={{fontFamily:'monospace',color:'#fff',fontSize:'28px',fontWeight:'bold',letterSpacing:'2px',marginBottom:'8px',textAlign:'center'}}>GRATULACJE.</div>
              <div style={{fontFamily:'monospace',color:'rgba(245,240,232,0.5)',fontSize:'11px',letterSpacing:'3px',textTransform:'uppercase',marginBottom:'32px',textAlign:'center'}}>Znalazłeś/aś kod.<br/>Nagroda? <span style={{color:'#F5A623'}}>damian@claude.kabum</span><br/>Nie działa. Ale byłeś/aś blisko.</div>
              <div style={{fontFamily:'monospace',color:'rgba(245,240,232,0.3)',fontSize:'10px',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'32px',textAlign:'center'}}>🎾 Damian odbija, Claude odbija,<br/>i tak se chłopaki grają.</div>
              <button onClick={() => setEasterEgg(false)} style={{background:'#F5A623',color:'#000',border:'none',fontFamily:'monospace',fontWeight:'bold',fontSize:'11px',letterSpacing:'4px',textTransform:'uppercase',padding:'12px 28px',cursor:'pointer'}}>ZAMKNIJ ×</button>
            </div>
          ) : sent ? (
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
                <label className="block text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-2">{t.lang === 'EN' ? '✉ Your email' : '✉ Twój email'}</label>
                <div className="flex gap-3">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t.lang === 'EN' ? 'your@email.com' : 'twoj@email.com'} className="flex-grow bg-slate-50 dark:bg-[#111] border border-black/10 dark:border-amber-500/20 rounded-xl px-4 py-3 text-sm text-black dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors" />
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
          <style>{`
            @keyframes lunaMove {
              0%   { text-shadow: -80px 16px 25px rgba(245,158,11,0), -40px 16px 45px rgba(245,158,11,0.65), 0px 16px 60px rgba(245,158,11,0.4), 40px 16px 35px rgba(245,158,11,0.1), 80px 16px 20px rgba(245,158,11,0); }
              25%  { text-shadow: -80px 16px 15px rgba(245,158,11,0), -40px 16px 20px rgba(245,158,11,0.1), 0px 16px 65px rgba(245,158,11,0.9), 40px 16px 20px rgba(245,158,11,0.1), 80px 16px 15px rgba(245,158,11,0); }
              50%  { text-shadow: -80px 16px 20px rgba(245,158,11,0), -40px 16px 20px rgba(245,158,11,0), 0px 16px 35px rgba(245,158,11,0.1), 40px 16px 45px rgba(245,158,11,0.65), 80px 16px 55px rgba(245,158,11,0.4), 120px 16px 25px rgba(245,158,11,0); }
              75%  { text-shadow: -80px 16px 15px rgba(245,158,11,0), -40px 16px 20px rgba(245,158,11,0.1), 0px 16px 65px rgba(245,158,11,0.9), 40px 16px 20px rgba(245,158,11,0.1), 80px 16px 15px rgba(245,158,11,0); }
              100% { text-shadow: -80px 16px 25px rgba(245,158,11,0), -40px 16px 45px rgba(245,158,11,0.65), 0px 16px 60px rgba(245,158,11,0.4), 40px 16px 35px rgba(245,158,11,0.1), 80px 16px 20px rgba(245,158,11,0); }
            }
          `}</style>
          <div style={{
            fontSize: 'clamp(1.6rem, 4vw, 3.2rem)',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            color: '#f59e0b',
            lineHeight: 1.0,
            marginBottom: '8px',
            animation: 'lunaMove 4s ease-in-out infinite',
          }}>
            {t.lang === 'EN' ? 'Create. Automate. Win.' : 'Twórz. Automatyzuj. Wygrywaj.'}
          </div>
          <p className="text-white/20 text-[10px] uppercase tracking-[0.25em] font-bold mb-10">
            Powered by <span className="text-amber-500/40">Claude AI</span> — Anthropic
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
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
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black text-black dark:text-white uppercase tracking-tighter leading-none mb-6">
            {t.lang === 'EN' ? 'Stop searching.' : 'Przestań szukać.'}<br/>
            <span className="text-amber-500">{t.lang === 'EN' ? 'Start creating.' : 'Zacznij tworzyć.'}</span>
          </h2>
          <p className="text-slate-500 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
            {t.lang === 'EN'
              ? 'AI tools, step-by-step tutorials and a community of people who get what you do.'
              : 'Kreatory AI, tutoriale krok po kroku i społeczność ludzi którzy ogarniają to co Ty.'}
          </p>
        </div>
      </section>

    </div>
  );
};


// =========================================================================
// TUTORIALS VIEW
// =========================================================================
const TutorialsView = ({ t, user, onLoginRequest, onNavigate }) => {
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
      if (snap.exists() && snap.data().list && snap.data().list.length > 0) {
        setTutorials(snap.data().list.map((t, i) => ({ ...t, id: i + 1 })));
      } else {
        setTutorials([
          { id:1, title_pl:'Wprowadzenie do Awatarów AI', title_en:'Introduction to AI Avatars', duration:'12:34', ytId:'1_1oHwOZMe4', naffyUrl:'https://naffy.io', vimeoUrl:'', price:'49' },
        ]);
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-700 font-sans px-3 sm:px-4 py-6 sm:py-12">
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

                  <div className="mt-auto flex flex-col gap-2">
                    {/* Przycisk Naffy — wymaga logowania */}
                    {isLoggedIn ? (
                      tut.naffyUrl ? (
                        <a href={tut.naffyUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-between px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-amber-500 hover:bg-amber-400 text-black transition-all">
                          <span>{t.lang === 'EN' ? 'Buy on Naffy' : 'Kup na Naffy'}</span>
                          <span>{tut.price ? `${tut.price} PLN` : '49 PLN'}</span>
                        </a>
                      ) : (
                        <div className="flex items-center justify-between px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-amber-500/10 border border-amber-500/30 text-amber-400/50 cursor-not-allowed">
                          <span>{t.lang === 'EN' ? 'Buy on Naffy' : 'Kup na Naffy'}</span>
                          <span>{t.lang === 'EN' ? 'Soon' : 'Wkrótce'}</span>
                        </div>
                      )
                    ) : (
                      <button onClick={onLoginRequest}
                        className="flex items-center justify-between px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-amber-500 hover:bg-amber-400 text-black transition-all">
                        <span>{t.lang === 'EN' ? 'Buy on Naffy' : 'Kup na Naffy'}</span>
                        <span>{t.lang === 'EN' ? 'Log in →' : 'Zaloguj →'}</span>
                      </button>
                    )}

                    {/* Przycisk Vimeo — tylko Pro */}
                    {isPro ? (
                      tut.vimeoUrl ? (
                        <a href={tut.vimeoUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-white/5 border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-all">
                          ▶ {t.lang === 'EN' ? 'Full tutorial' : 'Pełny instruktaż'}
                        </a>
                      ) : (
                        <div className="flex items-center justify-center px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-white/5 border border-amber-500/20 text-amber-400/50">
                          ✓ {t.lang === 'EN' ? 'Full tutorial — coming soon' : 'Pełny instruktaż — wkrótce'}
                        </div>
                      )
                    ) : (
                      <button onClick={isLoggedIn ? () => { if (typeof onNavigate === 'function') onNavigate('cennik'); } : onLoginRequest}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest border border-white/10 text-slate-600 hover:border-amber-500/20 hover:text-slate-500 transition-all">
                        🔒 {t.lang === 'EN' ? 'Full tutorial — Pro only' : 'Pełny instruktaż — tylko Pro'}
                      </button>
                    )}
                  </div>
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
            <button onClick={() => { if (typeof onNavigate === 'function') onNavigate('cennik'); }}
              className="whitespace-nowrap px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest bg-amber-500 hover:bg-amber-400 text-black transition-all shadow-lg shadow-amber-500/20">
              {t.lang === 'EN' ? 'See plans →' : 'Zobacz plany →'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};


// =========================================================================
// NEW: DODATKI VIEW - External tools grouped by category
// =========================================================================
const AplikacjeView = ({ t, user, onLoginRequest, onCreatorChange }) => {
  const [activeApp, setActiveApp] = useState(null);
  const openApp = (id) => { setActiveApp(id); if (onCreatorChange) onCreatorChange(id); };
  const closeApp = () => { setActiveApp(null); if (onCreatorChange) onCreatorChange(null); };

  const apps = [
    {
      id: 'avatar-builder',
      icon: '👑',
      title: t.lang === 'EN' ? 'Avatar Builder' : 'Kreator Awatarów',
      subtitle: t.lang === 'EN' ? 'AI Avatar Prompt Generator' : 'Generator Promptów Awatarów AI',
      desc: t.lang === 'EN' ? 'Create professional AI avatar prompts for Pika Labs & Leonardo AI.' : 'Twórz profesjonalne prompty do awatarów AI dla Pika Labs i Leonardo AI.',
      color: 'from-amber-500/20 via-yellow-500/10 to-orange-500/20',
      border: 'border-amber-500/30',
      glow: 'rgba(245,158,11,0.3)',
      badge: t.lang === 'EN' ? 'PROMPT STUDIO' : 'STUDIO PROMPTÓW',
    },
    {
      id: 'ad-builder',
      icon: '🎬',
      title: t.lang === 'EN' ? 'Product Ad Builder' : 'Kreator Reklam',
      subtitle: t.lang === 'EN' ? 'Cinematic Ad Prompt Generator' : 'Generator Promptów Reklam Filmowych',
      desc: t.lang === 'EN' ? 'Generate cinematic product ad prompts for stunning AI videos.' : 'Generuj kinowe prompty do reklam produktowych na potrzeby filmów AI.',
      color: 'from-purple-500/20 via-pink-500/10 to-blue-500/20',
      border: 'border-purple-500/30',
      glow: 'rgba(168,85,247,0.3)',
      badge: t.lang === 'EN' ? 'AD STUDIO' : 'STUDIO REKLAM',
    },
  ];

  const currentIdx = activeApp ? apps.findIndex(a => a.id === activeApp) : -1;

  const goNext = () => {
    if (currentIdx < apps.length - 1) setActiveApp(apps[currentIdx + 1].id);
  };
  const goPrev = () => {
    if (currentIdx > 0) setActiveApp(apps[currentIdx - 1].id);
  };

  // If an app is open, render it fullscreen with side arrows + bottom back button
  if (activeApp) {
    return (
      <div className="min-h-screen bg-white dark:bg-black transition-colors duration-700 relative">

        {/* LEFT arrow — fixed to left side, vertically centered */}
        {currentIdx > 0 && (
          <button
            onClick={goPrev}
            className="fixed left-2 md:left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2 group"
            style={{ filter: 'drop-shadow(0 0 16px rgba(245,158,11,0.6))' }}
          >
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110"
              style={{ background: 'rgba(245,158,11,0.15)', border: '2px solid rgba(245,158,11,0.5)', boxShadow: '0 0 30px rgba(245,158,11,0.3)' }}>
              <ChevronLeft className="w-6 h-6 md:w-8 md:h-8 text-amber-400" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-amber-400/70 hidden md:block">{apps[currentIdx - 1]?.icon}</span>
          </button>
        )}

        {/* RIGHT arrow — fixed to right side, vertically centered */}
        {currentIdx < apps.length - 1 && (
          <button
            onClick={goNext}
            className="fixed right-2 md:right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2 group"
            style={{ filter: 'drop-shadow(0 0 16px rgba(245,158,11,0.6))' }}
          >
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110"
              style={{ background: 'rgba(245,158,11,0.15)', border: '2px solid rgba(245,158,11,0.5)', boxShadow: '0 0 30px rgba(245,158,11,0.3)' }}>
              <ChevronRight className="w-6 h-6 md:w-8 md:h-8 text-amber-400" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-amber-400/70 hidden md:block">{apps[currentIdx + 1]?.icon}</span>
          </button>
        )}

        {/* Creator content */}
        {activeApp === 'avatar-builder' && <AvatarBuilderView t={t} user={user} onLoginRequest={onLoginRequest} />}
        {activeApp === 'ad-builder' && <ProductAdBuilderView t={t} user={user} onLoginRequest={onLoginRequest} />}

        {/* BACK BUTTON — fixed top left, always visible */}
        <div className="fixed top-20 left-4 z-50">
          <button
            onClick={closeApp}
            className="group flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 hover:scale-105"
            style={{
              background: 'rgba(10,10,10,0.95)',
              border: '2px solid rgba(245,158,11,0.5)',
              color: '#f59e0b',
              boxShadow: '0 0 20px rgba(245,158,11,0.2)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            {t.lang === 'EN' ? 'Back' : 'Powrót'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-700 font-sans px-3 sm:px-4 py-6 sm:py-12">
      <style>{`
        @keyframes float3d {
          0%, 100% { transform: perspective(600px) rotateX(8deg) rotateY(-2deg) translateY(0px); }
          50% { transform: perspective(600px) rotateX(4deg) rotateY(2deg) translateY(-8px); }
        }
        .card3d {
          transform: perspective(600px) rotateX(8deg) rotateY(-2deg);
          transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .card3d:hover {
          transform: perspective(600px) rotateX(2deg) rotateY(0deg) translateY(-12px) scale(1.02);
        }
      `}</style>
      <div className="max-w-5xl mx-auto">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-4">
            <Sparkles className="w-3 h-3" />
            {t.lang === 'EN' ? 'AI Applications' : 'Aplikacje AI'}
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-black dark:text-white uppercase tracking-tighter mb-4">
            {t.lang === 'EN' ? 'Aplikacje' : 'Aplikacje'}
          </h1>
          <p className="text-slate-500 max-w-lg mx-auto text-sm">
            {t.lang === 'EN' ? 'Professional AI prompt generators — click to open fullscreen creator.' : 'Profesjonalne generatory promptów AI — kliknij aby otworzyć kreator na pełnym ekranie.'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {apps.map((app) => (
            <button
              key={app.id}
              onClick={() => openApp(app.id)}
              className={`card3d relative rounded-3xl p-8 border bg-gradient-to-br ${app.color} ${app.border} text-left group cursor-pointer`}
              style={{ boxShadow: `0 20px 60px ${app.glow}, 0 4px 20px rgba(0,0,0,0.3)` }}
            >
              {/* Badge */}
              <div className="absolute top-4 right-4 text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-full"
                style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
                {app.badge}
              </div>
              {/* 3D Icon */}
              <div className="mb-6">
                <Icon3D emoji={app.icon} size="lg" />
              </div>
              {/* Content */}
              <h2 className="text-2xl font-black text-black dark:text-white uppercase tracking-tighter mb-1">{app.title}</h2>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500 mb-3">{app.subtitle}</p>
              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed mb-6">{app.desc}</p>
              {/* Open button */}
              <div className="flex items-center gap-2 text-amber-500 font-black text-[11px] uppercase tracking-widest group-hover:gap-3 transition-all">
                {t.lang === 'EN' ? 'Open Creator' : 'Otwórz Kreator'}
                <ChevronRight className="w-4 h-4" />
              </div>
              {/* Glow overlay on hover */}
              <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
                style={{ background: `radial-gradient(circle at 50% 0%, ${app.glow} 0%, transparent 70%)` }} />
            </button>
          ))}
        </div>

        {/* Navigation arrows between apps */}
        <div className="flex items-center justify-center gap-6 mt-12">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-600 text-[10px] font-bold uppercase tracking-widest">
            <div className="w-8 h-px bg-amber-500/30" />
            <span>{apps.length} {t.lang === 'EN' ? 'creators available' : 'kreatorów dostępnych'}</span>
            <div className="w-8 h-px bg-amber-500/30" />
          </div>
        </div>
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
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-700 font-sans px-3 sm:px-4 py-6 sm:py-12">
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

// =========================================================================
// AVATAR BUILDER — CHARACTER DEFAULTS
// =========================================================================
const defaultFemaleChar = () => ({
  type: 'female',
  // Sylwetka
  bodyType: 'slim and toned body',
  breastSize: 'medium breasts',
  lowerAnatomy: '',
  bodyHair: '',
  // Twarz
  face: 'detailed symmetrical face, sharp features, natural skin',
  eyes: 'stunning detailed eyes, natural makeup',
  // Włosy
  hairStyle: 'loose wavy hair, natural flow',
  hairColor: 'blonde',
  hairColorShade: 'warm golden blonde',
  hairTexture: 'straight',
  hairLength: 'long',
  // Makijaż
  makeupBase: '',
  makeupBrows: '',
  makeupEyeshadow: '',
  makeupLiner: '',
  makeupLashes: '',
  makeupLips: '',
  // Ubranie
  topClothing: 'casual white t-shirt',
  bottomClothing: 'blue denim jeans',
  shoes: 'elegant high heels, stilettos',
  legwear: '',
  accessories: '',
  // Tło
  bg: 'luxurious mansion interior, marble floors',
  // Ilość na zdjęciu
  shotCount: '1',
});

const defaultMaleChar = () => ({
  type: 'male',
  bodyType: 'athletic, muscular body',
  breastSize: '',
  lowerAnatomy: '',
  bodyHair: '',
  face: 'detailed symmetrical face, sharp jawline, masculine features',
  eyes: 'stunning detailed eyes',
  hairStyle: 'short textured hair, natural style',
  hairColor: 'brunette',
  hairColorShade: 'dark brown',
  hairTexture: 'straight',
  hairLength: 'short',
  makeupBase: '',
  makeupBrows: '',
  makeupEyeshadow: '',
  makeupLiner: '',
  makeupLashes: '',
  makeupLips: '',
  topClothing: 'fitted black t-shirt',
  bottomClothing: 'slim fit dark jeans',
  shoes: 'clean white sneakers',
  legwear: '',
  accessories: '',
  bg: 'luxurious mansion interior, marble floors',
  shotCount: '1',
});

const defaultGirlChar = () => ({
  type: 'girl',
  bodyType: 'slim petite body',
  breastSize: '',
  lowerAnatomy: '',
  bodyHair: '',
  face: 'cute round face, natural skin, child-like features',
  eyes: 'big expressive eyes',
  hairStyle: 'pigtails, playful style',
  hairColor: 'blonde',
  hairColorShade: 'warm golden blonde',
  hairTexture: 'straight',
  hairLength: 'medium',
  makeupBase: '',
  makeupBrows: '',
  makeupEyeshadow: '',
  makeupLiner: '',
  makeupLashes: '',
  makeupLips: '',
  topClothing: 'colorful casual top',
  bottomClothing: 'jeans',
  shoes: 'sneakers',
  legwear: '',
  accessories: '',
  bg: 'modern living room, stylish interior',
  shotCount: '1',
});

const defaultBoyChar = () => ({
  type: 'boy',
  bodyType: 'slim petite body',
  breastSize: '',
  lowerAnatomy: '',
  bodyHair: '',
  face: 'cute round face, natural skin, child-like features',
  eyes: 'big expressive eyes',
  hairStyle: 'short messy hair, casual style',
  hairColor: 'brunette',
  hairColorShade: 'dark brown',
  hairTexture: 'straight',
  hairLength: 'short',
  makeupBase: '',
  makeupBrows: '',
  makeupEyeshadow: '',
  makeupLiner: '',
  makeupLashes: '',
  makeupLips: '',
  topClothing: 'colorful casual t-shirt',
  bottomClothing: 'jeans',
  shoes: 'sneakers',
  legwear: '',
  accessories: '',
  bg: 'modern living room, stylish interior',
  shotCount: '1',
});

// Opcje per-płeć
const FEMALE_HAIR_STYLES = [
  ['', 'Brak'],
  ['elegant updo hair, wedding style, revealing ears', 'Upięcie ślubne'],
  ['high bun hair, sleek look', 'Wysoki kok'],
  ['low bun, romantic loose strands', 'Niski kok'],
  ['tied in a ponytail', 'Kucyk'],
  ['half up half down hairstyle', 'Pół-upięcie'],
  ['loose wavy hair, natural flow', 'Luźne fale'],
  ['straight sleek hair, glossy', 'Proste gładkie'],
  ['messy beach waves, tousled', 'Beach waves'],
  ['tight curly hair, voluminous', 'Kręcone'],
  ['loose curls, romantic style', 'Loki luźne'],
  ['braided hair, elegant', 'Warkocz'],
  ['side braid, casual', 'Warkocz boczny'],
  ['pixie cut, short and edgy', 'Pixie cut'],
  ['bob haircut, chin length', 'Bob'],
  ['lob haircut, shoulder length', 'Lob'],
];
const MALE_HAIR_STYLES = [
  ['', 'Brak'],
  ['short textured hair, natural style', 'Krótkie naturalne'],
  ['slicked back hair, polished look', 'Zaczesane'],
  ['messy bedhead hair, casual style', 'Rozczochrane'],
  ['buzz cut, clean and sharp', 'Buzz cut'],
  ['undercut hairstyle, modern', 'Undercut'],
  ['pompadour hairstyle', 'Pompadour'],
  ['crew cut', 'Crew cut'],
  ['medium length hair, wavy', 'Średnie falowane'],
  ['long hair, man bun', 'Man bun'],
];
const HAIR_COLORS = [
  ['', 'Brak'],
  ['blonde', 'Blond'],
  ['brunette', 'Brąz'],
  ['black', 'Czarne'],
  ['red hair', 'Rude'],
  ['auburn hair', 'Kasztanowe'],
  ['gray hair', 'Siwe/Srebrne'],
  ['platinum hair', 'Platynowe'],
  ['colored hair', 'Farbowane specjalne'],
];
const HAIR_SHADES = {
  blonde: [
    ['platinum blonde hair, icy white', 'Platynowy — lodowy biały'],
    ['icy ash blonde hair', 'Lodowy — popielaty'],
    ['pearl blonde hair, silver tones', 'Perłowy — srebrnawy'],
    ['ash blonde hair, cool tone', 'Popielaty blond — chłodny'],
    ['light golden blonde hair', 'Złoty jasny — słoneczny'],
    ['warm golden blonde hair', 'Złoty ciepły — miodowy'],
    ['honey blonde hair, warm', 'Miodowy — ciepły'],
    ['strawberry blonde hair, peachy', 'Truskawkowy — brzoskwiniowy'],
    ['dirty blonde hair, natural', 'Ciemny blond — naturalny'],
    ['dark blonde hair, sandy', 'Piaskowy ciemny — naturalny'],
  ],
  brunette: [
    ['light brown hair, natural', 'Jasny brąz — naturalny'],
    ['warm light brown hair, caramel', 'Karmelowy — ciepły jasny'],
    ['medium brown hair, classic', 'Średni brąz — klasyczny'],
    ['chestnut brown hair, warm', 'Kasztanowy — ciepły'],
    ['chocolate brown hair, rich', 'Czekoladowy — głęboki'],
    ['dark brown hair, deep', 'Ciemny brąz — głęboki'],
    ['espresso brown hair, very dark', 'Espresso — prawie czarny'],
  ],
  black: [
    ['soft black hair, natural', 'Miękka czerń — naturalna'],
    ['jet black hair, pure', 'Kruczoczarny — czysty'],
    ['blue-black hair, raven', 'Kruczy czarny — niebieskie refleksy'],
    ['black cherry hair, dark red tones', 'Czarna wiśnia — ciemnoczerwone refleksy'],
  ],
  'red hair': [
    ['light copper red hair, bright', 'Miedź jasna — intensywna'],
    ['bright copper red hair, vivid', 'Miedź intensywna — żywa'],
    ['classic red hair, natural ginger', 'Klasyczna ruda — naturalny imbir'],
    ['deep red hair, rich', 'Głęboka ruda — bogata'],
    ['dark auburn red hair', 'Ciemna ruda — ciepła'],
    ['fiery red hair, dramatic', 'Ognista — dramatyczna'],
  ],
  'auburn hair': [
    ['light auburn hair, warm brown-red', 'Jasny kasztan — ciepły brązowo-rudy'],
    ['warm auburn hair, classic', 'Ciepły kasztan — klasyczny'],
    ['dark auburn hair, deep', 'Ciemny kasztan — głęboki'],
    ['mahogany auburn, reddish brown', 'Mahoń — brązowo-czerwony'],
    ['burgundy auburn hair', 'Bordo — czerwono-bordowy'],
  ],
  'gray hair': [
    ['silver gray hair, elegant', 'Srebrne — eleganckie'],
    ['salt and pepper hair, natural', 'Sól i pieprz — naturalne'],
    ['white silver hair, platinum', 'Białe srebrne — platynowe'],
    ['steel gray hair, cool', 'Stalowe — zimne'],
  ],
  'platinum hair': [
    ['platinum silver hair, metallic', 'Platynowe srebrne — metaliczne'],
    ['icy white hair, very pale', 'Lodowate białe — bardzo blade'],
    ['pearl white hair, soft', 'Perłowe białe — miękkie'],
  ],
  'colored hair': [
    ['rose gold hair, pink tones', 'Różowe złoto — pastelowy róż'],
    ['pastel pink hair, soft', 'Pastelowy różowy — miękki'],
    ['vibrant pink hair, bold', 'Intensywny różowy — odważny'],
    ['pastel lavender hair', 'Lawendowy — pastelowy'],
    ['vivid purple hair, dramatic', 'Intensywny fiolet — dramatyczny'],
    ['teal blue hair, vivid', 'Turkusowy niebieski — żywy'],
    ['vivid blue hair, electric', 'Elektryczny niebieski'],
    ['silver with blue highlights', 'Srebrny z niebieskimi refleksami'],
    ['rainbow hair, multi-color', 'Tęczowe — wielokolorowe'],
  ],
  '': [['', 'Brak']],
};
const HAIR_TEXTURES = [
  ['', 'Brak'],
  ['straight', 'Proste'],
  ['wavy', 'Falowane'],
  ['curly', 'Kręcone'],
  ['coily', 'Bardzo kręcone'],
];
const HAIR_LENGTHS_FEMALE = [
  ['', 'Brak'],
  ['very short', 'Bardzo krótkie'],
  ['short', 'Krótkie'],
  ['medium length', 'Średnie'],
  ['long', 'Długie'],
  ['very long, reaching waist', 'Bardzo długie'],
];
const HAIR_LENGTHS_MALE = [
  ['', 'Brak'],
  ['very short, almost shaved', 'Bardzo krótkie'],
  ['short', 'Krótkie'],
  ['medium length', 'Średnie'],
];
const MAKEUP_BASE = [
  ['', 'Brak'],
  ['bare skin, no makeup, natural complexion', 'Brak — gołe'],
  ['very light tinted moisturizer, barely-there look', 'BB cream — ledwo widoczny'],
  ['light foundation, fresh dewy face', 'Lekki świeży'],
  ['full coverage matte foundation, porcelain finish', 'Matowy pełny'],
  ['dewy glowing skin, luminous glass skin effect', 'Glowing — szklana cera'],
  ['bronzed sun-kissed complexion, warm glow', 'Bronzowy — opalona'],
  ['contoured face, sharp cheekbones, sculpted', 'Konturowany — rzeźbiony'],
  ['porcelain pale skin, editorial makeup base', 'Porcelanowy — blady'],
];
const MAKEUP_BROWS = [
  ['', 'Brak'],
  ['natural barely-groomed brows', 'Naturalne — bez ingerencji'],
  ['lightly filled brows, soft definition', 'Delikatnie wypełnione'],
  ['medium arched brows, defined', 'Łukowe — wypełnione'],
  ['thick bold straight brows, strong', 'Grube proste — mocne'],
  ['sharp high-arched dramatic brows', 'Wysoko łukowe — dramatyczne'],
  ['microbladed brows, hair-stroke effect', 'Microblading — włoskowate'],
];
const MAKEUP_EYESHADOW = [
  ['', 'Brak'],
  ['no eyeshadow, bare lids', 'Brak — czyste powieki'],
  ['subtle neutral shadow, day look', 'Delikatny neutralny — dzienny'],
  ['soft warm brown crease shadow', 'Ciepły brązowy — miękki'],
  ['classic smoky eye, dark grey and black', 'Smoky — klasyczny szary'],
  ['deep black smoky eye, intense', 'Smoky — głęboki czarny'],
  ['brown smoky eye, warm tones', 'Smoky — brązowy ciepły'],
  ['golden shimmer eyeshadow, glam', 'Złoty shimmer — glamour'],
  ['bold colorful eyeshadow, editorial', 'Kolorowy — editorial'],
  ['cut crease, sharp definition', 'Cut crease — ostry'],
  ['halo eye, light center', 'Halo eye — jasny środek'],
];
const MAKEUP_LINER = [
  ['', 'Brak'],
  ['no eyeliner', 'Brak — bez kreski'],
  ['thin subtle lower lash line', 'Cienka dolna — subtelna'],
  ['thin upper liner, classic', 'Cienka górna — klasyczna'],
  ['medium black liner upper lid', 'Średnia czarna — górna'],
  ['thick bold liner upper lid', 'Gruba czarna — mocna'],
  ['sharp cat eye flick, winged', 'Kocie oko — skrzydełko'],
  ['dramatic long cat eye flick', 'Kocie oko — dramatyczne długie'],
  ['full upper and lower liner, smoky smudged', 'Góra i dół — zadymiona'],
  ['graphic liner, artistic shape', 'Graficzna — artystyczna'],
];
const MAKEUP_LASHES = [
  ['', 'Brak'],
  ['no lashes, natural', 'Brak — naturalne'],
  ['light mascara, subtle lift', 'Mascara — lekka'],
  ['full mascara, volumized natural lashes', 'Mascara — pełna objętość'],
  ['wispy false lashes, natural flutter', 'Sztuczne — wispy naturalne'],
  ['medium false lashes, defined volume', 'Sztuczne — średnie'],
  ['dramatic false lashes, full glam', 'Sztuczne — dramatyczne glamour'],
  ['mega volume false lashes, ultra dramatic', 'Sztuczne — mega objętość'],
  ['individual lash clusters, precise', 'Kępkowe — precyzyjne'],
];
const MAKEUP_LIPS = [
  ['', 'Brak'],
  ['bare lips, natural color', 'Gołe — bez niczego'],
  ['lip balm, sheer shine', 'Balsam — ledwo widoczny'],
  ['nude matte lips, your-lips-but-better', 'Nude matowe — naturalne'],
  ['nude glossy lips, plump look', 'Nude gloss — wypełnione'],
  ['pink soft lips, feminine', 'Różowe — delikatne'],
  ['pink glossy lips, juicy', 'Różowy gloss — soczysty'],
  ['coral lips, warm tone', 'Koralowe — ciepłe'],
  ['classic red lipstick, matte', 'Czerwone matowe — klasyczne'],
  ['glossy red lips, lacquered', 'Czerwone glossy — lakierowane'],
  ['deep berry lip color', 'Berry — jagodowe'],
  ['dark plum lipstick, gothic', 'Śliwkowe — gotyckie'],
  ['black cherry lips, very dark', 'Czarna wiśnia — bardzo ciemne'],
  ['brown nude lips, editorial', 'Brązowe nude — editorial'],
];
const FACE_OPTIONS_F = [
  ['', 'Brak'],
  ['detailed symmetrical face, sharp features, natural skin', 'Klasyczna'],
  ['cute face, freckles, girl-next-door', 'Piegi'],
  ['exotic facial features, high cheekbones', 'Egzotyczna'],
  ['round soft face, youthful appearance', 'Okrągła'],
  ['oval face, elegant proportions', 'Owalna'],
  ['strong jawline, model-like features', 'Modelka'],
];
const FACE_OPTIONS_M = [
  ['', 'Brak'],
  ['detailed symmetrical face, sharp jawline, masculine features', 'Wyrazista'],
  ['handsome face, strong brow, light stubble', 'Zarost'],
  ['clean shaven, fresh face, boy-next-door', 'Gładka'],
  ['rugged face, full beard', 'Broda pełna'],
  ['chiseled jawline, model-like features', 'Modelowy'],
];
const EYES_OPTIONS = [
  ['', 'Brak'],
  ['stunning detailed eyes, natural makeup', 'Naturalne'],
  ['blue eyes', 'Niebieskie'],
  ['green eyes', 'Zielone'],
  ['brown eyes', 'Brązowe'],
  ['hazel eyes', 'Piwne'],
  ['gray eyes', 'Szare'],
  ['almond-shaped eyes', 'Migdałowe'],
  ['wide round eyes', 'Okrągłe'],
];
const BODY_TYPES_F = [
  ['', 'Brak'],
  ['slim and toned body', 'Szczupła'],
  ['curvy, hourglass figure', 'Klepsydra'],
  ['athletic, muscular body', 'Atletyczna'],
  ['petite slim body', 'Drobna'],
  ['plus size, full figured', 'Plus size'],
];
const BODY_TYPES_M = [
  ['', 'Brak'],
  ['slim and toned body', 'Szczupła'],
  ['athletic, muscular body', 'Atletyczna'],
  ['broad shoulders, strong physique', 'Szeroki'],
  ['lean swimmer body', 'Pływak'],
  ['bodybuilder physique, very muscular', 'Kulturysta'],
];
const BODY_TYPES_KID = [
  ['', 'Brak'],
  ['slim petite body', 'Drobna'],
  ['average child build', 'Przeciętna'],
];
const BREAST_SIZES = [
  ['', 'Brak'],
  ['small breasts', 'Mały'],
  ['medium breasts', 'Średni'],
  ['large heavy breasts', 'Duży'],
];
const LOWER_ANATOMY = [
  ['', 'Brak'],
  ['noticeable crotch bulge', 'Bulge (M)'],
  ['cameltoe', 'Cameltoe (F)'],
];
const BODY_HAIR = [
  ['', 'Brak'],
  ['light body hair', 'Lekkie'],
  ['hairy body, natural', 'Mocne'],
  ['chest hair', 'Klatka'],
];
const TOP_CLOTHING_F = [
  ['', 'Brak'],
  ['casual white t-shirt', 'T-shirt'],
  ['elegant blouse', 'Bluzka'],
  ['crop top', 'Crop top'],
  ['suit jacket, formal', 'Marynarka'],
  ['bikini top', 'Bikini top'],
  ['cocktail dress, elegant', 'Sukienka koktajlowa'],
  ['long evening gown', 'Suknia wieczorowa'],
  ['mini dress', 'Mini sukienka'],
  ['sports bra', 'Sportowy biustonosz'],
  ['lingerie, lace bra', 'Bielizna'],
  ['strapless top', 'Bez ramiączek'],
  ['off-shoulder top', 'Odkryte ramiona'],
  ['turtleneck sweater', 'Golf'],
  ['leather jacket', 'Skórzana kurtka'],
];
const TOP_CLOTHING_M = [
  ['', 'Brak'],
  ['fitted black t-shirt', 'T-shirt'],
  ['casual shirt, unbuttoned collar', 'Koszula casual'],
  ['formal dress shirt', 'Koszula formalna'],
  ['suit jacket and tie', 'Garnitur'],
  ['hoodie, casual', 'Bluza'],
  ['leather jacket', 'Skórzana kurtka'],
  ['tank top, sleeveless', 'Tank top'],
  ['sports jersey', 'Koszulka sportowa'],
  ['polo shirt', 'Polo'],
];
const TOP_CLOTHING_KID = [
  ['', 'Brak'],
  ['colorful casual top', 'Kolorowy top'],
  ['t-shirt with print', 'T-shirt z nadrukiem'],
  ['dress', 'Sukienka'],
  ['school uniform', 'Mundurek'],
  ['sports outfit', 'Strój sportowy'],
];
const BOTTOM_CLOTHING_F = [
  ['', 'Brak'],
  ['blue denim jeans', 'Jeansy'],
  ['mini skirt', 'Mini spódnica'],
  ['midi skirt', 'Midi spódnica'],
  ['maxi skirt', 'Maxi spódnica'],
  ['elegant trousers', 'Spodnie eleganckie'],
  ['shorts, casual', 'Szorty'],
  ['leggings', 'Legginsy'],
  ['bikini bottom', 'Bikini dół'],
  ['bare legs, no pants', 'Gołe nogi'],
];
const BOTTOM_CLOTHING_M = [
  ['', 'Brak'],
  ['slim fit dark jeans', 'Jeansy slim'],
  ['casual chino trousers', 'Chino'],
  ['formal dress pants', 'Spodnie formalne'],
  ['shorts, casual', 'Szorty'],
  ['sweatpants', 'Dresy'],
  ['bare legs', 'Gołe nogi'],
];
const BOTTOM_CLOTHING_KID = [
  ['', 'Brak'],
  ['jeans', 'Jeansy'],
  ['shorts', 'Szorty'],
  ['skirt (girl)', 'Spódnica'],
  ['leggings', 'Legginsy'],
  ['sweatpants', 'Dresy'],
];
const SHOES_F = [
  ['', 'Brak'],
  ['elegant high heels, stilettos', 'Szpilki'],
  ['block heels', 'Słupek'],
  ['ankle boots, elegant', 'Botki'],
  ['knee-high boots', 'Kozaki'],
  ['modern sneakers', 'Sneakersy'],
  ['flat sandals', 'Sandały'],
  ['loafers, casual', 'Mokasyny'],
  ['barefoot', 'Boso'],
];
const SHOES_M = [
  ['', 'Brak'],
  ['clean white sneakers', 'Sneakersy'],
  ['leather oxford shoes', 'Oksfordy'],
  ['casual loafers', 'Mokasyny'],
  ['boots, rugged', 'Buty robocze'],
  ['dress shoes, formal', 'Formalne'],
  ['barefoot', 'Boso'],
];
const SHOES_KID = [
  ['', 'Brak'],
  ['sneakers', 'Tenisówki'],
  ['sandals', 'Sandały'],
  ['school shoes', 'Buty szkolne'],
  ['boots', 'Buciki'],
  ['barefoot', 'Boso'],
];
const LEGWEAR = [
  ['', 'Brak'],
  ['sheer pantyhose', 'Rajstopy'],
  ['stockings with lace top', 'Pończochy z koronką'],
  ['opaque black tights', 'Czarne rajstopy'],
  ['white socks', 'Białe skarpetki'],
  ['knee-high socks', 'Podkolanówki'],
];
const ACCESSORIES_F = [
  ['', 'Brak'],
  ['wearing pearl drop earrings', 'Perłowe kolczyki'],
  ['wearing diamond stud earrings', 'Kolczyki diamentowe'],
  ['wearing gold necklace', 'Złoty naszyjnik'],
  ['wearing luxury watch', 'Luksusowy zegarek'],
  ['wearing sunglasses', 'Okulary'],
  ['carrying designer handbag', 'Torebka designerska'],
  ['wearing bracelet', 'Bransoletka'],
];
const ACCESSORIES_M = [
  ['', 'Brak'],
  ['wearing luxury watch', 'Zegarek luksusowy'],
  ['wearing sunglasses', 'Okulary'],
  ['wearing chain necklace', 'Łańcuszek'],
  ['wearing cap', 'Czapka z daszkiem'],
  ['wearing rings', 'Pierścienie'],
];
const BACKGROUNDS = [
  ['', 'Brak'],
  ['luxurious mansion interior, marble floors', 'Rezydencja'],
  ['modern bedroom, elegant interior, soft lighting', 'Sypialnia'],
  ['modern bathroom, marble, luxury', 'Łazienka'],
  ['modern living room, stylish interior', 'Salon'],
  ['modern kitchen, luxury design', 'Kuchnia'],
  ['tropical beach, golden sand, ocean waves', 'Plaża'],
  ['Venice canal at night, romantic lights', 'Wenecja nocą'],
  ['Paris street at night, Eiffel Tower, romantic', 'Paryż nocą'],
  ['Tokyo street, neon lights at night', 'Tokio nocą'],
  ['modern city street, neon lights', 'Miasto nocą'],
  ['professional studio, white background', 'Studio białe'],
  ['professional studio, dark background', 'Studio ciemne'],
  ['forest, natural light, bokeh', 'Las'],
  ['swimming pool, luxury outdoor', 'Basen'],
  ['luxury hotel lobby', 'Hotel lobby'],
  ['gym, fitness center', 'Siłownia'],
  ['office, modern interior', 'Biuro'],
  ['cafe, cozy interior', 'Kawiarnia'],
  ['yacht deck, sea view', 'Jacht'],
];
const SHOT_COUNTS = [
  ['1', '1 osoba'],
  ['2', '2 osoby'],
  ['3', '3 osoby'],
];

// Generuje prompt dla jednej postaci
const buildCharPrompt = (ch) => {
  const shade = ch.hairColorShade || ch.hairColor;
  const parts = [
    ch.bodyType,
    ch.breastSize,
    ch.lowerAnatomy,
    ch.bodyHair,
    ch.face,
    ch.eyes,
    ch.hairLength ? `${ch.hairLength} hair` : '',
    shade,
    ch.hairTexture !== 'straight' ? ch.hairTexture : '',
    ch.hairStyle,
    ch.makeupBase,
    ch.makeupBrows,
    ch.makeupEyeshadow,
    ch.makeupLiner,
    ch.makeupLashes,
    ch.makeupLips,
    ch.customNote ? `additional details: ${ch.customNote}` : '',
    ch.topClothing,
    ch.bottomClothing,
    ch.legwear,
    ch.shoes,
    ch.accessories,
  ];
  return parts.filter(p => p && p.trim() !== '').join(', ');
};

// Komponent sekcji z dropdownami dla jednej postaci
const CharSection = ({ label, icon, fields }) => {
  const labelCls = "block text-[9px] uppercase tracking-widest text-slate-500 mb-1.5 font-bold";
  const inputCls = "w-full bg-slate-100 dark:bg-[#121212] border border-black/10 dark:border-[#333] px-3 py-2 text-[13px] dark:text-white focus:border-amber-500 focus:outline-none transition-all rounded-lg appearance-none";
  return (
    <div className="mb-4">
      <div className="text-[10px] font-bold tracking-widest text-amber-500 mb-3 flex items-center gap-1.5 uppercase">
        <span>{icon}</span>{label}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {fields.map(f => (
          <div key={f.label}>
            <label className={labelCls}>{f.label}</label>
            <div className="relative">
              <select value={f.value} onChange={e => f.set(e.target.value)} className={inputCls}>
                {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CharCard = ({ ch, idx, onChange, t }) => {
  const isMale = ch.type === 'male';
  const isKid = ch.type === 'girl' || ch.type === 'boy';
  const isBoy = ch.type === 'boy';
  const f = (key) => (val) => onChange(idx, key, val);

  const hairShadeOpts = HAIR_SHADES[ch.hairColor] || [['', 'Brak']];

  const typeLabels = { female: '👩 Kobieta', male: '👨 Mężczyzna', girl: '👧 Dziewczynka', boy: '👦 Chłopiec' };
  const typeColor = { female: 'rgba(236,72,153,0.2)', male: 'rgba(59,130,246,0.2)', girl: 'rgba(168,85,247,0.2)', boy: 'rgba(34,197,94,0.2)' };
  const typeBorder = { female: 'rgba(236,72,153,0.4)', male: 'rgba(59,130,246,0.4)', girl: 'rgba(168,85,247,0.4)', boy: 'rgba(34,197,94,0.4)' };

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: typeColor[ch.type], border: `1px solid ${typeBorder[ch.type]}` }}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-black uppercase tracking-widest text-white">{typeLabels[ch.type]} #{idx + 1}</span>
      </div>

      <CharSection label="Sylwetka & Anatomia" icon="🏃" fields={[
        { label: 'Sylwetka', value: ch.bodyType, set: f('bodyType'), opts: isMale ? BODY_TYPES_M : isKid ? BODY_TYPES_KID : BODY_TYPES_F },
        ...(!isMale && !isKid ? [{ label: 'Biust', value: ch.breastSize, set: f('breastSize'), opts: BREAST_SIZES }] : []),
        { label: 'Owłosienie', value: ch.bodyHair, set: f('bodyHair'), opts: BODY_HAIR },
        { label: 'Dół (anatomia)', value: ch.lowerAnatomy, set: f('lowerAnatomy'), opts: LOWER_ANATOMY },
      ]} />

      <CharSection label="Twarz & Oczy" icon="👁️" fields={[
        { label: 'Twarz', value: ch.face, set: f('face'), opts: isMale ? FACE_OPTIONS_M : FACE_OPTIONS_F },
        { label: 'Oczy', value: ch.eyes, set: f('eyes'), opts: EYES_OPTIONS },
      ]} />

      <CharSection label="Włosy" icon="💇" fields={[
        { label: 'Fryzura', value: ch.hairStyle, set: f('hairStyle'), opts: isMale ? MALE_HAIR_STYLES : FEMALE_HAIR_STYLES },
        { label: 'Kolor', value: ch.hairColor, set: (v) => { onChange(idx, 'hairColor', v); onChange(idx, 'hairColorShade', (HAIR_SHADES[v] || [['']])[0][0]); }, opts: HAIR_COLORS },
        { label: 'Odcień', value: ch.hairColorShade, set: f('hairColorShade'), opts: hairShadeOpts.length ? hairShadeOpts : [['', 'Brak']] },
        { label: 'Tekstura', value: ch.hairTexture, set: f('hairTexture'), opts: HAIR_TEXTURES },
        { label: 'Długość', value: ch.hairLength, set: f('hairLength'), opts: isMale ? HAIR_LENGTHS_MALE : HAIR_LENGTHS_FEMALE },
      ]} />

      {!isMale && !isKid && (
        <CharSection label="Makijaż" icon="💄" fields={[
          { label: 'Cera', value: ch.makeupBase, set: f('makeupBase'), opts: MAKEUP_BASE },
          { label: 'Brwi', value: ch.makeupBrows, set: f('makeupBrows'), opts: MAKEUP_BROWS },
          { label: 'Cień', value: ch.makeupEyeshadow, set: f('makeupEyeshadow'), opts: MAKEUP_EYESHADOW },
          { label: 'Kreska', value: ch.makeupLiner, set: f('makeupLiner'), opts: MAKEUP_LINER },
          { label: 'Rzęsy', value: ch.makeupLashes, set: f('makeupLashes'), opts: MAKEUP_LASHES },
          { label: 'Usta', value: ch.makeupLips, set: f('makeupLips'), opts: MAKEUP_LIPS },
        ]} />
      )}

      <CharSection label="Ubranie & Obuwie" icon="👗" fields={[
        { label: 'Góra', value: ch.topClothing, set: f('topClothing'), opts: isMale ? TOP_CLOTHING_M : isKid ? TOP_CLOTHING_KID : TOP_CLOTHING_F },
        { label: 'Dół', value: ch.bottomClothing, set: f('bottomClothing'), opts: isMale ? BOTTOM_CLOTHING_M : isKid ? BOTTOM_CLOTHING_KID : BOTTOM_CLOTHING_F },
        { label: 'Obuwie', value: ch.shoes, set: f('shoes'), opts: isMale ? SHOES_M : isKid ? SHOES_KID : SHOES_F },
        ...(!isMale ? [{ label: 'Nogi', value: ch.legwear, set: f('legwear'), opts: LEGWEAR }] : []),
        { label: 'Akcesoria', value: ch.accessories, set: f('accessories'), opts: isMale ? ACCESSORIES_M : ACCESSORIES_F },
      ]} />

      <div className="mb-2">
        <div className="text-[10px] font-bold tracking-widest text-amber-500 mb-3 flex items-center gap-1.5 uppercase"><span>🌄</span>Tło</div>
        <div className="relative">
          <select value={ch.bg} onChange={e => onChange(idx, 'bg', e.target.value)}
            className="w-full bg-slate-100 dark:bg-[#121212] border border-black/10 dark:border-[#333] px-3 py-2 text-[13px] dark:text-white focus:border-amber-500 focus:outline-none transition-all rounded-lg appearance-none">
            {BACKGROUNDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// DISCLAIMER MODAL — jednorazowy, zapamiętany w localStorage
// =========================================================================
const DisclaimerModal = ({ storageKey, onAccept }) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}>
      <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-2xl max-w-lg w-full p-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-3 py-1.5 rounded-full w-fit">
            ⚠️ Regulamin Kreatora
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">
            Przed skorzystaniem z Kreatora
          </h2>
        </div>

        {/* Treść */}
        <div className="text-[12px] text-white/60 leading-relaxed flex flex-col gap-3">
          <p>Niniejszy <strong className="text-white/90">Kreator</strong> (zwany dalej „Kreatorem") służy do generowania promptów pomocniczych przeznaczonych do użycia w zewnętrznych generatorach obrazów AI (m.in. Midjourney, Stable Diffusion, DALL-E i innych).</p>
          <p className="font-bold text-white/80">Korzystając z Kreatora akceptujesz, że:</p>
          <ul className="flex flex-col gap-2 pl-2">
            <li className="flex gap-2"><span className="text-amber-500 mt-0.5">→</span><span>Kreator generuje prompt tekstowy — nie tworzy gotowych obrazów ani nie gwarantuje konkretnego efektu wizualnego</span></li>
            <li className="flex gap-2"><span className="text-amber-500 mt-0.5">→</span><span>Wyniki generowania zależą wyłącznie od wybranego narzędzia AI, jego wersji i ustawień</span></li>
            <li className="flex gap-2"><span className="text-amber-500 mt-0.5">→</span><span>AI Flow Academy nie ponosi odpowiedzialności za treść, jakość ani zgodność wygenerowanych obrazów z oczekiwaniami</span></li>
            <li className="flex gap-2"><span className="text-amber-500 mt-0.5">→</span><span>Użytkownik korzysta z promptów i wygenerowanych materiałów na własną odpowiedzialność</span></li>
            <li className="flex gap-2"><span className="text-amber-500 mt-0.5">→</span><span>Wygenerowane materiały muszą być zgodne z regulaminem wybranego generatora AI oraz z obowiązującym prawem</span></li>
          </ul>
        </div>

        {/* Przycisk */}
        <button
          onClick={onAccept}
          className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-black text-[11px] uppercase tracking-widest rounded-xl transition-all">
          ✓ Akceptuję i korzystam z Kreatora
        </button>
        <p className="text-[10px] text-white/25 text-center -mt-3">Ta informacja nie pojawi się ponownie</p>
      </div>
    </div>
  );
};

const AvatarBuilderView = ({ t, user, onLoginRequest }) => {
  const isLoggedIn = user && !user.isAnonymous;
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(() => localStorage.getItem('aiflow_disclaimer_avatar') === '1');
  const handleAcceptDisclaimer = () => { localStorage.setItem('aiflow_disclaimer_avatar', '1'); setDisclaimerAccepted(true); };
  const [tokens, setTokens] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [isStarter, setIsStarter] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isLoggedIn && user?.uid) {
      setLoadingTokens(true);
      getTokenData(db, user.uid).then(({ tokens, isPro, isStarter }) => {
        setTokens(tokens); setIsPro(isPro); setIsStarter(isStarter); setLoadingTokens(false);
      }).catch(() => setLoadingTokens(false));
    } else { setTokens(null); setIsPro(false); setIsStarter(false); }
  }, [isLoggedIn, user?.uid]);

  const [characters, setCharacters] = useState([defaultFemaleChar()]);
  const [globalBg, setGlobalBg] = useState('luxurious mansion interior, marble floors');
  const [customNote, setCustomNote] = useState('');

  const PRESET_CONFIGS = [
    { label: '1 Kobieta', icon: '👩', fn: () => [defaultFemaleChar()] },
    { label: '2 Kobiety', icon: '👩👩', fn: () => [defaultFemaleChar(), defaultFemaleChar()] },
    { label: '3 Kobiety', icon: '👩👩👩', fn: () => [defaultFemaleChar(), defaultFemaleChar(), defaultFemaleChar()] },
    { label: '1 Mężczyzna', icon: '👨', fn: () => [defaultMaleChar()] },
    { label: '2 Mężczyzn', icon: '👨👨', fn: () => [defaultMaleChar(), defaultMaleChar()] },
    { label: 'Para', icon: '👫', fn: () => [defaultFemaleChar(), defaultMaleChar()] },
    { label: 'Para + Córka', icon: '👨‍👩‍👧', fn: () => [defaultFemaleChar(), defaultMaleChar(), defaultGirlChar()] },
    { label: 'Para + Syn', icon: '👨‍👩‍👦', fn: () => [defaultFemaleChar(), defaultMaleChar(), defaultBoyChar()] },
    { label: 'Dziewczynka', icon: '👧', fn: () => [defaultGirlChar()] },
    { label: 'Chłopiec', icon: '👦', fn: () => [defaultBoyChar()] },
  ];

  const handlePreset = (preset) => setCharacters(preset.fn());
  const handleCharChange = (idx, key, val) =>
    setCharacters(prev => prev.map((ch, i) => i === idx ? { ...ch, [key]: val } : ch));

  const generatePrompt = () => {
    const count = characters.length;
    const countLabel = count === 1 ? '1 person' : `${count} people`;
    const charParts = characters.map((ch, i) => {
      const p = buildCharPrompt(ch);
      return count > 1 ? `[Person ${i + 1}: ${p}]` : p;
    });
    return [
      `full body shot, ${countLabel}`,
      ...charParts,
      globalBg || 'studio background',
      'photorealistic, 8k resolution, masterpiece',
      'high-end fashion photography, ultra-detailed, sharp focus, cinematic lighting',
      'editorial style, tasteful, professional model shoot',
      customNote ? `additional details: ${customNote}` : '',
    ].filter(p => p && p.trim() !== '').join(', ');
  };

  const handleCopy = async () => {
    if (!isLoggedIn) { onLoginRequest && onLoginRequest(); return; }
    if (!isPro && !isStarter && tokens !== null && tokens <= 0) return;
    const ok = await useToken(db, user.uid);
    if (ok) {
      navigator.clipboard.writeText(generatePrompt());
      setCopied(true);
      if (!isPro && !isStarter) setTokens(prev => Math.max(0, (prev || 0) - 1));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const selCls = "w-full bg-[#0d0d0d] border border-[#2a2a2a] px-2 py-2 text-[12px] text-white focus:border-amber-500 focus:outline-none transition-all rounded-lg appearance-none cursor-pointer";
  const typeColors = { female: '#ec4899', male: '#3b82f6', girl: '#a855f7', boy: '#22c55e' };
  const typeLabels = { female: '👩 Kobieta', male: '👨 Mężczyzna', girl: '👧 Dziewczynka', boy: '👦 Chłopiec' };

  // Definicje sekcji — każda zawiera wiersze pól
  // Każdy wiersz: { key, label, getOpts(ch) }
  const SECTIONS = [
    {
      id: 'sylwetka', label: '🏃 Sylwetka', rows: [
        { key: 'bodyType', label: 'Sylwetka', getOpts: ch => ch.type === 'male' ? BODY_TYPES_M : (ch.type === 'girl' || ch.type === 'boy') ? BODY_TYPES_KID : BODY_TYPES_F },
        { key: 'breastSize', label: 'Biust', getOpts: ch => BREAST_SIZES, hide: ch => ch.type === 'male' || ch.type === 'girl' || ch.type === 'boy' },
        { key: 'bodyHair', label: 'Owłosienie', getOpts: () => BODY_HAIR },
        { key: 'lowerAnatomy', label: 'Dół (anatomia)', getOpts: () => LOWER_ANATOMY },
      ]
    },
    {
      id: 'twarz', label: '👁️ Twarz & Oczy', rows: [
        { key: 'face', label: 'Twarz', getOpts: ch => ch.type === 'male' || ch.type === 'boy' ? FACE_OPTIONS_M : FACE_OPTIONS_F },
        { key: 'eyes', label: 'Oczy', getOpts: () => EYES_OPTIONS },
      ]
    },
    {
      id: 'wlosy', label: '💇 Włosy', rows: [
        { key: 'hairStyle', label: 'Fryzura', getOpts: ch => ch.type === 'male' || ch.type === 'boy' ? MALE_HAIR_STYLES : FEMALE_HAIR_STYLES },
        { key: 'hairColor', label: 'Kolor', getOpts: () => HAIR_COLORS, onChange: (idx, val) => { handleCharChange(idx, 'hairColor', val); handleCharChange(idx, 'hairColorShade', (HAIR_SHADES[val] || [['']])[0][0]); } },
        { key: 'hairColorShade', label: 'Odcień', getOpts: ch => HAIR_SHADES[ch.hairColor] || [['', 'Brak']] },
        { key: 'hairTexture', label: 'Tekstura', getOpts: () => HAIR_TEXTURES },
        { key: 'hairLength', label: 'Długość', getOpts: ch => ch.type === 'male' || ch.type === 'boy' ? HAIR_LENGTHS_MALE : HAIR_LENGTHS_FEMALE },
      ]
    },
    {
      id: 'makijaz', label: '💄 Makijaż', rows: [
        { key: 'makeupBase', label: 'Cera', getOpts: () => MAKEUP_BASE, hide: ch => ch.type === 'male' || ch.type === 'boy' },
        { key: 'makeupBrows', label: 'Brwi', getOpts: () => MAKEUP_BROWS, hide: ch => ch.type === 'male' || ch.type === 'boy' },
        { key: 'makeupEyeshadow', label: 'Cień', getOpts: () => MAKEUP_EYESHADOW, hide: ch => ch.type === 'male' || ch.type === 'boy' },
        { key: 'makeupLiner', label: 'Kreska', getOpts: () => MAKEUP_LINER, hide: ch => ch.type === 'male' || ch.type === 'boy' },
        { key: 'makeupLashes', label: 'Rzęsy', getOpts: () => MAKEUP_LASHES, hide: ch => ch.type === 'male' || ch.type === 'boy' },
        { key: 'makeupLips', label: 'Usta', getOpts: () => MAKEUP_LIPS, hide: ch => ch.type === 'male' || ch.type === 'boy' },
      ]
    },
    {
      id: 'ubranie', label: '👗 Ubranie & Obuwie', rows: [
        { key: 'topClothing', label: 'Góra', getOpts: ch => ch.type === 'male' ? TOP_CLOTHING_M : (ch.type === 'girl' || ch.type === 'boy') ? TOP_CLOTHING_KID : TOP_CLOTHING_F },
        { key: 'bottomClothing', label: 'Dół', getOpts: ch => ch.type === 'male' ? BOTTOM_CLOTHING_M : (ch.type === 'girl' || ch.type === 'boy') ? BOTTOM_CLOTHING_KID : BOTTOM_CLOTHING_F },
        { key: 'shoes', label: 'Obuwie', getOpts: ch => ch.type === 'male' ? SHOES_M : (ch.type === 'girl' || ch.type === 'boy') ? SHOES_KID : SHOES_F },
        { key: 'legwear', label: 'Nogi', getOpts: () => LEGWEAR, hide: ch => ch.type === 'male' || ch.type === 'boy' },
        { key: 'accessories', label: 'Akcesoria', getOpts: ch => ch.type === 'male' ? ACCESSORIES_M : ACCESSORIES_F },
      ]
    },
    {
      id: 'tlo', label: '🌄 Tło', rows: [] // tło jest osobne — globalBg
    },
  ];

  return (
    <div className="relative pb-20 bg-black transition-colors duration-700 min-h-screen font-sans">
      {!disclaimerAccepted && <DisclaimerModal storageKey="aiflow_disclaimer_avatar" onAccept={handleAcceptDisclaimer} />}
      {/* Header */}
      <div className="px-4 pt-6 pb-4 max-w-[1800px] mx-auto">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
          <div>
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-3">
              <Crown className="w-3 h-3"/>Kreator Awatarów
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Avatar Builder</h1>
          </div>
          {isLoggedIn && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black ${isPro ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500' : isStarter ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400' : tokens > 0 ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500' : 'bg-red-500/10 border border-red-500/30 text-red-500'}`}>
              <span>{isPro ? '👑' : isStarter ? '⚡' : '🎟'}</span>
              {loadingTokens ? '...' : isPro ? 'All-in-one — nielimitowany' : isStarter ? 'Starter — nielimitowany' : `${tokens}/3 promptów demo`}
            </div>
          )}
        </div>

        {/* Presety */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESET_CONFIGS.map(preset => (
            <button key={preset.label} onClick={() => handlePreset(preset)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: 'rgba(255,255,255,0.7)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.2)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
            >{preset.icon} {preset.label}</button>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div className="px-4 max-w-[1800px] mx-auto flex gap-4" style={{ alignItems: 'flex-start' }}>

        {/* LEFT NAV — scroll anchors */}
        <div style={{ width: '140px', flexShrink: 0, position: 'sticky', top: '80px' }}>
          <div className="flex flex-col gap-1">
            {SECTIONS.map(sec => (
              <button key={sec.id}
                onClick={() => document.getElementById(`av-sec-${sec.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="w-full text-left px-3 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  color: 'rgba(255,255,255,0.5)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.5)'; e.currentTarget.style.color = '#f59e0b'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
              >
                {sec.label}
              </button>
            ))}
          </div>
        </div>

        {/* CENTER — wszystkie sekcje naraz */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {SECTIONS.map(sec => {
            // Tło — osobna sekcja
            if (sec.id === 'tlo') return (
              <div key="tlo" id="av-sec-tlo" className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#1f1f1f]">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">🌄 Tło sceny (wspólne dla wszystkich)</span>
                </div>
                <div className="p-4">
                  <div className="relative" style={{ maxWidth: '400px' }}>
                    <select value={globalBg} onChange={e => setGlobalBg(e.target.value)} className={selCls}>
                      {BACKGROUNDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/>
                  </div>
                </div>
              </div>
            );

            // Filtruj wiersze — pokaż tylko te gdzie przynajmniej jedna postać go ma
            const visibleRows = sec.rows.filter(row =>
              characters.some(ch => !row.hide || !row.hide(ch))
            );
            if (visibleRows.length === 0) return null;

            return (
              <div key={sec.id} id={`av-sec-${sec.id}`} className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl overflow-hidden">
                {/* Nagłówki kolumn — postacie */}
                <div className="grid border-b border-[#1f1f1f]" style={{ gridTemplateColumns: `120px repeat(${characters.length}, 1fr)` }}>
                  <div className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-amber-500">{sec.label}</div>
                  {characters.map((ch, idx) => (
                    <div key={idx} className="px-3 py-3 text-center border-l border-[#1f1f1f]">
                      <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: typeColors[ch.type] }}>
                        {typeLabels[ch.type]}
                      </span>
                      <span className="text-[10px] text-white/30 ml-1">#{idx + 1}</span>
                    </div>
                  ))}
                </div>

                {/* Wiersze — pola */}
                {visibleRows.map((row, ri) => (
                  <div key={row.key} className="grid border-b border-[#151515]" style={{ gridTemplateColumns: `120px repeat(${characters.length}, 1fr)`, background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    {/* Label */}
                    <div className="flex items-center px-3 py-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{row.label}</span>
                    </div>
                    {/* Dropdown per postać */}
                    {characters.map((ch, idx) => {
                      const isHidden = row.hide && row.hide(ch);
                      return (
                        <div key={idx} className="px-2 py-2 border-l border-[#151515]">
                          {isHidden ? (
                            <div className="h-9 flex items-center justify-center">
                              <span className="text-[10px] text-white/15">—</span>
                            </div>
                          ) : (
                            <div className="relative">
                              <select
                                value={ch[row.key] || ''}
                                onChange={e => {
                                  if (row.onChange) row.onChange(idx, e.target.value);
                                  else handleCharChange(idx, row.key, e.target.value);
                                }}
                                className={selCls}
                              >
                                {row.getOpts(ch).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                              </select>
                              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none"/>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* RIGHT — Prompt box sticky */}
        <div style={{ width: '260px', flexShrink: 0, position: 'sticky', top: '80px' }}>
          <div className="relative bg-[#0a0a0a] border border-[#1f1f1f] p-4 rounded-2xl">
            <h2 className="text-[10px] font-black tracking-widest mb-3 border-b border-[#1f1f1f] pb-2 text-amber-500 uppercase">Prompt</h2>
            <div className="relative">
              <div className="bg-[#060606] p-3 min-h-[200px] max-h-[55vh] overflow-y-auto text-white font-mono text-[10px] leading-relaxed break-words border border-[#1a1a1a] mb-4 rounded-xl">
                <span className="text-amber-500 font-bold">{"> "}</span>{generatePrompt()}
              </div>
              {!isLoggedIn && (
                <div className="absolute inset-0 mb-4 rounded-xl backdrop-blur-sm bg-black/80 flex flex-col items-center justify-center p-4 text-center cursor-pointer" onClick={onLoginRequest}>
                  <div className="text-3xl mb-2">🔒</div>
                  <p className="text-white font-black text-xs uppercase tracking-widest mb-1">Zaloguj się</p>
                  <p className="text-white/50 text-[10px] mb-3">3 prompty gratis</p>
                  <span className="bg-amber-500 text-black font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl">Zaloguj</span>
                </div>
              )}
              {isLoggedIn && !isPro && !isStarter && tokens !== null && tokens <= 0 && (
                <div className="absolute inset-0 mb-4 rounded-xl backdrop-blur-sm bg-black/80 flex flex-col items-center justify-center p-4 text-center">
                  <div className="text-3xl mb-2">💳</div>
                  <p className="text-white font-black text-xs uppercase tracking-widest mb-1">Brak promptów</p>
                  <a href={user ? stripeLink(STRIPE_STARTER_LINK, user.uid, user.email) : '#'}
                    target="_blank" rel="noopener noreferrer"
                    className="bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl transition-all mt-2">
                    Kup Plan →
                  </a>
                </div>
              )}
            </div>
            {/* Pole sugestii */}
            <div className="mt-4 mb-3 relative">
              <label className="block text-[9px] font-black uppercase tracking-widest text-amber-500 mb-2">
                ✏️ Twoje sugestie
              </label>
              <textarea
                value={customNote}
                onChange={e => { if (isLoggedIn && (isPro || isStarter || tokens > 0)) setCustomNote(e.target.value); }}
                placeholder={isLoggedIn ? "Dopisz cokolwiek... np. 'trzyma kieliszek wina', 'patrzy przez ramię', 'śmieje się'" : "Zaloguj się aby dodać sugestie..."}
                rows={3}
                className="w-full bg-[#060606] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-[11px] text-white placeholder-white/20 focus:border-amber-500 focus:outline-none resize-none transition-all"
                style={{ filter: (!isLoggedIn || (!isPro && !isStarter && tokens !== null && tokens <= 0)) ? 'blur(2px)' : 'none' }}
              />
              {!isLoggedIn && (
                <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center cursor-pointer gap-1" onClick={onLoginRequest}
                  style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(2px)' }}>
                  <span className="text-lg">🔒</span>
                  <span className="text-white font-black text-[9px] uppercase tracking-widest">Zaloguj się</span>
                </div>
              )}
              {isLoggedIn && !isPro && !isStarter && tokens !== null && tokens <= 0 && (
                <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-1"
                  style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(2px)' }}>
                  <span className="text-lg">💳</span>
                  <span className="text-white font-black text-[9px] uppercase tracking-widest">Brak tokenów</span>
                </div>
              )}
            </div>
            <button onClick={handleCopy}
              className={`w-full py-3 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all ${copied ? 'bg-emerald-500 text-black' : 'bg-amber-500 hover:bg-amber-400 text-black'}`}>
              {copied ? '✔ Skopiowano!' : isPro ? 'Kopiuj (∞)' : isStarter ? 'Kopiuj (∞)' : isLoggedIn && tokens > 0 ? `Kopiuj (${tokens}/3 🎟)` : 'Kopiuj Prompt →'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};


// =========================================================================
// PRODUCT AD BUILDER — DATA
// =========================================================================

const AD_CATEGORIES = [
  { id: 'kosmetyki', label: '🌸 Kosmetyki', color: '#ec4899' },
  { id: 'chemia', label: '🧴 Chemia domowa', color: '#f59e0b' },
  { id: 'napoje', label: '🥤 Napoje', color: '#3b82f6' },
  { id: 'jedzenie', label: '🍫 Jedzenie', color: '#22c55e' },
  { id: 'apteczne', label: '💊 Apteczne', color: '#a855f7' },
  { id: 'fashion', label: '👜 Fashion', color: '#f97316' },
];

const AD_FIELDS = {
  kosmetyki: {
    produkt: [['', 'Brak'], ['luksusowy flakon perfum, matowy czarny', 'Perfumy'], ['elegancki flakon perfum, transparentny', 'Perfumy transparentne'], ['krem do twarzy w białym słoiczku', 'Krem do twarzy'], ['serum w butelce z pipetą', 'Serum'], ['szminka w złotej oprawce', 'Szminka'], ['podkład w szklanej butelce', 'Podkład'], ['tusz do rzęs, elegancki', 'Mascara'], ['paleta cieni do powiek', 'Paleta cieni'], ['balsam do ust w złotym tubie', 'Balsam'], ['szampon w eleganckim flakonie', 'Szampon'], ['odżywka do włosów, premium', 'Odżywka']],
    material: [['', 'Brak'], ['szklany, premium', 'Szkło premium'], ['matowe szkło, frosted', 'Szkło matowe'], ['kryształ, transparentny', 'Kryształ'], ['czarny matowy plastik, luksusowy', 'Czarny mat'], ['złoto i szkło', 'Złoto i szkło'], ['różowe złoto, metaliczny', 'Różowe złoto'], ['marmur i złoto', 'Marmur i złoto']],
    kolor: [['', 'Brak'], ['czarny, matowy', 'Czarny mat'], ['złoty, błyszczący', 'Złoty'], ['biały, czysty', 'Biały'], ['różowy, delikatny', 'Różowy'], ['bordowy, elegancki', 'Bordowy'], ['transparentny', 'Transparentny'], ['srebrny, chromowany', 'Srebrny']],
    efekt: [['', 'Brak'], ['para i mgła unosząca się elegancko', 'Para i mgła'], ['złote drobinki i brokat unoszące się', 'Złoty brokat'], ['delikatne płatki kwiatów opadające', 'Płatki kwiatów'], ['krople wody na powierzchni', 'Krople wody'], ['refleksy i błyski światła', 'Refleksy światła'], ['lód i kryształy lodu', 'Lód i kryształy']],
    efekt2: [['', 'Brak'], ['eksplozja kolorowego proszku w slow motion', 'Eksplozja proszku'], ['odpryski wody w slow motion', 'Odpryski wody'], ['śnieg opadający delikatnie', 'Śnieg'], ['płomienie w tle', 'Ogień'], ['bąbelki powietrza', 'Bąbelki'], ['dym kolorowy', 'Kolorowy dym']],
    oswietlenie: [['', 'Brak'], ['złote ciepłe światło, golden hour', 'Golden hour'], ['dramatyczne studyjne, twarde cienie', 'Studyjne'], ['miękkie naturalne, rozproszone', 'Naturalne miękkie'], ['neonowe, cyberpunk', 'Neon'], ['zimne niebieskie, lodowe', 'Zimne niebieskie'], ['świece i ciepłe punktowe', 'Świece']],
    ruch: [['', 'Brak'], ['powolny obrót 360 stopni', '360° obrót'], ['delikatne kołysanie lewo-prawo', 'Kołysanie'], ['unoszenie się w górę i dół', 'Lewitacja'], ['zoom in powoli', 'Zoom in'], ['statyczny', 'Statyczny']],
    nastoj: [['', 'Brak'], ['luksusowy, premium, elegancki', 'Luksus'], ['romantyczny, zmysłowy', 'Romantyczny'], ['świeży, naturalny', 'Naturalny'], ['minimalistyczny, czysty', 'Minimalizm'], ['tajemniczy, mroczny', 'Mroczny']],
    tlo: [['', 'Brak'], ['ciemne studio, czarny gradient', 'Czarne studio'], ['białe czyste studio', 'Białe studio'], ['marmurowa posadzka, luksus', 'Marmur'], ['natura, zielone liście, bokeh', 'Natura'], ['ocean o zachodzie słońca', 'Ocean sunset'], ['nocne miasto, neon', 'Nocne miasto'], ['śnieg i góry', 'Zimowy krajobraz']],
  },
  chemia: {
    produkt: [['', 'Brak'], ['butelka Domestos, biała z niebieską etykietą', 'Domestos'], ['butelka płynu do naczyń, kolorowa', 'Płyn do naczyń'], ['opakowanie proszku do prania', 'Proszek do prania'], ['butelka płynu do płukania', 'Płyn do płukania'], ['spray do czyszczenia', 'Spray czyszczący'], ['tabletki do zmywarki w opakowaniu', 'Tabletki zmywarki'], ['odświeżacz powietrza', 'Odświeżacz powietrza'], ['żel do WC', 'Żel do WC'], ['środek do okien, spray', 'Środek do okien']],
    material: [['', 'Brak'], ['plastik HDPE, biały matowy', 'Plastik biały'], ['plastik kolorowy, błyszczący', 'Plastik kolorowy'], ['aluminium, matowe', 'Aluminium'], ['spray trigger, transparentny', 'Spray transparentny']],
    kolor: [['', 'Brak'], ['biały i niebieski', 'Biały/Niebieski'], ['żółty, energetyczny', 'Żółty'], ['zielony, świeży', 'Zielony'], ['pomarańczowy', 'Pomarańczowy'], ['czerwony, intensywny', 'Czerwony'], ['fioletowy', 'Fioletowy']],
    efekt: [['', 'Brak'], ['trysk płynu w slow motion', 'Trysk płynu'], ['bąbelki mydlane unoszące się', 'Bąbelki mydlane'], ['czysta lśniąca powierzchnia', 'Lśniąca powierzchnia'], ['krople wody na czystej szybie', 'Krople na szybie'], ['biała piana', 'Biała piana'], ['para i czystość', 'Para czystości']],
    efekt2: [['', 'Brak'], ['eksplozja czystości, czyste tło', 'Eksplozja czystości'], ['deszcz kropelek', 'Deszcz kropelek'], ['błyszcząca czysta podłoga w tle', 'Czysta podłoga'], ['bąbelki w wodzie', 'Bąbelki w wodzie']],
    oswietlenie: [['', 'Brak'], ['czyste białe studio', 'Białe studio'], ['jasne naturalne', 'Naturalne jasne'], ['dramatyczne punktowe', 'Punktowe'], ['zimne niebieskie, czyste', 'Zimne niebieskie']],
    ruch: [['', 'Brak'], ['powolny obrót 360 stopni', '360° obrót'], ['zoom in powoli', 'Zoom in'], ['statyczny', 'Statyczny'], ['kamera orbituje', 'Orbita kamery']],
    nastoj: [['', 'Brak'], ['czysty, higieniczny, świeży', 'Czysty i świeży'], ['energetyczny, silny', 'Silny i energetyczny'], ['naturalny, ekologiczny', 'Eko'], ['profesjonalny, skuteczny', 'Profesjonalny']],
    tlo: [['', 'Brak'], ['białe czyste studio', 'Białe studio'], ['nowoczesna łazienka, marmur', 'Łazienka'], ['nowoczesna kuchnia, czysta', 'Kuchnia'], ['jasne niebieskie tło', 'Niebieskie tło'], ['zielone tło, natura', 'Zielone tło']],
  },
  napoje: {
    produkt: [['', 'Brak'], ['butelka soku owocowego, szklana', 'Sok owocowy'], ['butelka mleka owocowego', 'Mleko owocowe'], ['puszka energy drink', 'Energy drink'], ['butelka wody mineralnej', 'Woda mineralna'], ['butelka wina, elegancka', 'Wino'], ['butelka piwa, szklana', 'Piwo'], ['smoothie w słoiku', 'Smoothie'], ['butelka cold brew coffee', 'Cold brew'], ['karton soku, premium', 'Karton soku'], ['butelka lemonady', 'Lemonade'], ['herbata w butelce', 'Herbata ice tea']],
    material: [['', 'Brak'], ['szkło transparentne', 'Szkło'], ['szkło matowe, frosted', 'Szkło matowe'], ['aluminium, puszka', 'Aluminium'], ['PET, transparentny', 'PET'], ['karton premium', 'Karton']],
    kolor: [['', 'Brak'], ['pomarańczowy, soczysty', 'Pomarańczowy'], ['czerwony, intensywny', 'Czerwony'], ['zielony, świeży', 'Zielony'], ['żółty, słoneczny', 'Żółty'], ['różowy, owoce leśne', 'Różowy'], ['transparentny', 'Transparentny'], ['niebieski, orzeźwiający', 'Niebieski'], ['fioletowy, winogronowy', 'Fioletowy']],
    efekt: [['', 'Brak'], ['eksplozja świeżych owoców wokół butelki', 'Eksplozja owoców'], ['krople wody spływające po butelce', 'Krople wody'], ['lód i kostki lodu wokół', 'Lód'], ['bąbelki unoszące się', 'Bąbelki'], ['plusk soku w slow motion', 'Plusk soku'], ['świeże owoce w tle', 'Świeże owoce']],
    efekt2: [['', 'Brak'], ['odpryski płynu w slow motion', 'Odpryski płynu'], ['eksplozja kolorowych owoców', 'Eksplozja owoców'], ['śnieg i lód', 'Śnieg i lód'], ['para i mgła', 'Para i mgła'], ['deszcz kropelek', 'Deszcz kropelek']],
    oswietlenie: [['', 'Brak'], ['naturalne słoneczne, letnie', 'Słoneczne letnie'], ['golden hour, ciepłe', 'Golden hour'], ['studyjne, czyste białe', 'Białe studio'], ['zimne niebieskie, orzeźwiające', 'Zimne niebieskie'], ['neonowe, nocne', 'Neon']],
    ruch: [['', 'Brak'], ['powolny obrót 360 stopni', '360° obrót'], ['lewitacja butelki', 'Lewitacja'], ['zoom in na etykietę', 'Zoom in'], ['statyczny', 'Statyczny'], ['kamera orbituje', 'Orbita kamery']],
    nastoj: [['', 'Brak'], ['świeży, naturalny, zdrowy', 'Świeży i zdrowy'], ['energetyczny, dynamiczny', 'Energetyczny'], ['luksusowy, premium', 'Luksus'], ['letni, wakacyjny', 'Letni'], ['orzeźwiający, lodowy', 'Orzeźwiający']],
    tlo: [['', 'Brak'], ['tropikalna plaża, palmy', 'Plaża tropikalna'], ['zielona łąka, natura', 'Łąka'], ['białe studio, czyste', 'Białe studio'], ['ocean, fale', 'Ocean'], ['letni ogród', 'Ogród'], ['kuchnia premium', 'Kuchnia'], ['czarne studio', 'Czarne studio']],
  },
  jedzenie: {
    produkt: [['', 'Brak'], ['tabliczka czekolady premium', 'Czekolada'], ['jogurt w eleganckim kubku', 'Jogurt'], ['masło w złotym opakowaniu', 'Masło'], ['chipsy w kolorowej torbie', 'Chipsy'], ['kawa w eleganckiej puszce', 'Kawa'], ['herbata w luksusowym pudełku', 'Herbata'], ['miód w szklanym słoiku', 'Miód'], ['dżem premium w słoiczku', 'Dżem'], ['makaron premium w opakowaniu', 'Makaron'], ['oliwa z oliwek w butelce', 'Oliwa'], ['ciastka w eleganckim pudełku', 'Ciastka']],
    material: [['', 'Brak'], ['karton premium, tłoczony', 'Karton premium'], ['szkło, słoik', 'Szkło'], ['metalowa puszka', 'Metal'], ['folia aluminiowa, błyszcząca', 'Folia'], ['papier kraft, eco', 'Kraft eco'], ['plastik transparentny', 'Plastik transparentny']],
    kolor: [['', 'Brak'], ['złoty, premium', 'Złoty'], ['brązowy, czekoladowy', 'Brązowy'], ['czerwony, intensywny', 'Czerwony'], ['zielony, naturalny', 'Zielony'], ['biały, czysty', 'Biały'], ['czarny, luksus', 'Czarny'], ['niebieski', 'Niebieski']],
    efekt: [['', 'Brak'], ['kawałki czekolady unoszące się', 'Kawałki czekolady'], ['roztopiona czekolada spływa', 'Roztopiona czekolada'], ['świeże składniki wokół', 'Świeże składniki'], ['ziarna kawy unoszące się', 'Ziarna kawy'], ['płatki i liście herbaty', 'Liście herbaty'], ['miód spływający', 'Spływający miód'], ['para z gorącego napoju', 'Para']],
    efekt2: [['', 'Brak'], ['eksplozja składników', 'Eksplozja składników'], ['krople wody', 'Krople wody'], ['złoty brokat', 'Złoty brokat'], ['dym i para', 'Dym i para']],
    oswietlenie: [['', 'Brak'], ['ciepłe domowe, przytulne', 'Ciepłe domowe'], ['golden hour', 'Golden hour'], ['naturalne okienne', 'Naturalne okienne'], ['studyjne, czyste', 'Studyjne'], ['świece, romantyczne', 'Świece']],
    ruch: [['', 'Brak'], ['powolny obrót 360 stopni', '360° obrót'], ['zoom in na produkt', 'Zoom in'], ['statyczny', 'Statyczny'], ['lewitacja', 'Lewitacja']],
    nastoj: [['', 'Brak'], ['premium, luksusowy', 'Luksus'], ['naturalny, zdrowy, organic', 'Naturalny organic'], ['przytulny, domowy', 'Domowy'], ['intensywny, bogaty smak', 'Intensywny'], ['delikatny, elegancki', 'Delikatny']],
    tlo: [['', 'Brak'], ['ciemne drewno, rustykalny', 'Drewno rustykal'], ['marmur biały', 'Marmur biały'], ['białe studio', 'Białe studio'], ['naturalne liście, zieleń', 'Zieleń'], ['kuchnia premium', 'Kuchnia'], ['czarne tło, luksus', 'Czarne tło']],
  },
  apteczne: {
    produkt: [['', 'Brak'], ['butelka suplementów, premium', 'Suplementy'], ['syrop w butelce szklanej', 'Syrop'], ['tabletki w blistrze', 'Tabletki'], ['krem leczniczy w tubie', 'Krem leczniczy'], ['spray do nosa', 'Spray do nosa'], ['opakowanie witamin', 'Witaminy'], ['żel na mięśnie, tuba', 'Żel na mięśnie'], ['krople do oczu', 'Krople do oczu'], ['plaster premium', 'Plastry']],
    material: [['', 'Brak'], ['szkło bursztynowe', 'Szkło bursztynowe'], ['biały plastik, apteczny', 'Biały plastik'], ['aluminium, czyste', 'Aluminium'], ['szkło transparentne', 'Szkło transparentne'], ['karton biały', 'Karton biały']],
    kolor: [['', 'Brak'], ['biały, czysty', 'Biały'], ['niebieski, medyczny', 'Niebieski'], ['zielony, naturalny', 'Zielony'], ['pomarańczowy', 'Pomarańczowy'], ['bursztynowy', 'Bursztynowy']],
    efekt: [['', 'Brak'], ['kryształy i czystość', 'Kryształy'], ['liście i zioła wokół', 'Zioła'], ['krople wody', 'Krople wody'], ['blask i czystość', 'Blask'], ['molekuły i nauka', 'Molekuły'], ['naturalne składniki', 'Naturalne składniki']],
    efekt2: [['', 'Brak'], ['eksplozja składników naturalnych', 'Eksplozja składników'], ['DNA i nauka', 'Wizualizacja DNA'], ['bąbelki', 'Bąbelki'], ['złoty blask', 'Złoty blask']],
    oswietlenie: [['', 'Brak'], ['czyste białe, kliniczne', 'Białe kliniczne'], ['naturalne ciepłe', 'Naturalne ciepłe'], ['niebieskie zimne', 'Niebieskie zimne'], ['punktowe, dramatyczne', 'Punktowe']],
    ruch: [['', 'Brak'], ['powolny obrót 360 stopni', '360° obrót'], ['zoom in', 'Zoom in'], ['statyczny', 'Statyczny'], ['lewitacja', 'Lewitacja']],
    nastoj: [['', 'Brak'], ['zaufany, medyczny', 'Medyczny'], ['naturalny, ziołowy', 'Naturalny'], ['nowoczesny, naukowy', 'Naukowy'], ['czysty, higieniczny', 'Czysty'], ['premium, luksusowy', 'Premium']],
    tlo: [['', 'Brak'], ['białe czyste studio', 'Białe studio'], ['niebieskie gradientowe', 'Niebieskie'], ['natura, zielone zioła', 'Natura ziołowa'], ['laboratorium, czyste', 'Laboratorium'], ['marmur biały', 'Marmur']],
  },
  fashion: {
    produkt: [['', 'Brak'], ['luksusowa torebka damska', 'Torebka'], ['eleganckie szpilki', 'Szpilki'], ['naszyjnik z diamentami', 'Naszyjnik'], ['luksusowy zegarek', 'Zegarek'], ['bransoletka złota', 'Bransoletka'], ['kolczyki diamentowe', 'Kolczyki'], ['okulary przeciwsłoneczne', 'Okulary'], ['elegancki portfel', 'Portfel'], ['pasek skórzany, luksusowy', 'Pasek'], ['buty sneakers, premium', 'Sneakersy']],
    material: [['', 'Brak'], ['skóra naturalna, gładka', 'Skóra gładka'], ['skóra pikowana, Chanel', 'Skóra pikowana'], ['skóra krokodyla', 'Krokodyl'], ['zamsz, matowy', 'Zamsz'], ['złoto 18k', 'Złoto 18k'], ['platyna', 'Platyna'], ['stal szlachetna', 'Stal szlachetna'], ['szkło szafirowe', 'Szkło szafirowe']],
    kolor: [['', 'Brak'], ['czarny, klasyczny', 'Czarny'], ['złoty, luksus', 'Złoty'], ['kremowy, beżowy', 'Kremowy'], ['burgundy, elegancki', 'Burgundy'], ['srebrny', 'Srebrny'], ['nude, delikatny', 'Nude'], ['biały', 'Biały'], ['różowe złoto', 'Różowe złoto']],
    efekt: [['', 'Brak'], ['złote drobinki unoszące się', 'Złoty brokat'], ['refleksy i błyski na skórze', 'Refleksy'], ['delikatne płatki kwiatów', 'Płatki kwiatów'], ['jedwab opadający', 'Jedwab'], ['diamentowe błyski', 'Diamenty'], ['para i mgła elegancka', 'Mgła']],
    efekt2: [['', 'Brak'], ['eksplozja złotego brokatu', 'Eksplozja brokatu'], ['konfetti złote', 'Złote konfetti'], ['płatki różane', 'Płatki różane'], ['lód i kryształy', 'Lód i kryształy']],
    oswietlenie: [['', 'Brak'], ['złote ciepłe, golden hour', 'Golden hour'], ['studyjne dramatyczne', 'Studyjne'], ['miękkie naturalne', 'Naturalne miękkie'], ['zimne niebieskie', 'Zimne'], ['neonowe', 'Neon']],
    ruch: [['', 'Brak'], ['powolny obrót 360 stopni', '360° obrót'], ['lewitacja', 'Lewitacja'], ['zoom in na detal', 'Zoom in detal'], ['statyczny', 'Statyczny'], ['kołysanie eleganckie', 'Kołysanie']],
    nastoj: [['', 'Brak'], ['luksusowy, premium', 'Luksus'], ['elegancki, wyrafinowany', 'Elegancja'], ['minimalistyczny', 'Minimalizm'], ['romantyczny', 'Romantyczny'], ['nowoczesny, edgy', 'Nowoczesny']],
    tlo: [['', 'Brak'], ['ciemne studio, czarny gradient', 'Czarne studio'], ['białe studio', 'Białe studio'], ['marmur i złoto', 'Marmur i złoto'], ['Paris, elegancja', 'Paryż'], ['luksusowe wnętrze', 'Luksusowe wnętrze'], ['nature, bokeh', 'Natura bokeh']],
  },
};

const AD_SECTION_DEFS = [
  { id: 'produkt', label: '📦 Produkt', fields: ['produkt', 'material', 'kolor'] },
  { id: 'efekty', label: '✨ Efekty', fields: ['efekt', 'efekt2'] },
  { id: 'swiatlo', label: '💡 Światło & Nastrój', fields: ['oswietlenie', 'nastoj'] },
  { id: 'ruch', label: '🎬 Ruch', fields: ['ruch'] },
  { id: 'tlo', label: '🌄 Tło', fields: ['tlo'] },
];

const defaultAdValues = (catId) => {
  const fields = AD_FIELDS[catId] || {};
  const result = {};
  Object.entries(fields).forEach(([key, opts]) => {
    result[key] = opts[1]?.[0] || '';
  });
  return result;
};

const buildAdPrompt = (catId, values) => {
  const f = (key) => values[key] || '';
  const parts = [
    'Cinematic product advertisement video',
    f('produkt') ? `product: ${f('produkt')}` : '',
    f('material') ? `material: ${f('material')}` : '',
    f('kolor') ? `color: ${f('kolor')}` : '',
    f('nastoj') ? `mood: ${f('nastoj')}` : '',
    f('efekt') ? `main effect: ${f('efekt')}` : '',
    f('efekt2') ? `additional effect: ${f('efekt2')}` : '',
    f('oswietlenie') ? `lighting: ${f('oswietlenie')}` : '',
    f('ruch') ? `camera motion: ${f('ruch')}` : '',
    f('tlo') ? `background: ${f('tlo')}` : '',
    'photorealistic, 8K, ultra-detailed, sharp focus',
    'high-end commercial photography, cinematic lighting, visual masterpiece',
  ];
  return parts.filter(p => p && p.trim() !== '').join(', ');
};

const ProductAdBuilderView = ({ t, user, onLoginRequest }) => {
  const isLoggedIn = user && !user.isAnonymous;
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(() => localStorage.getItem('aiflow_disclaimer_ad') === '1');
  const handleAcceptDisclaimer = () => { localStorage.setItem('aiflow_disclaimer_ad', '1'); setDisclaimerAccepted(true); };
  const [copied, setCopied] = useState(false);
  const [tokens, setTokens] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [isStarter, setIsStarter] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [category, setCategory] = useState('kosmetyki');


  const [values, setValues] = useState(() => defaultAdValues('kosmetyki'));

  useEffect(() => {
    if (isLoggedIn && user?.uid) {
      setLoadingTokens(true);
      getTokenData(db, user.uid).then(({ tokens, isPro, isStarter }) => {
        setTokens(tokens); setIsPro(isPro); setIsStarter(isStarter); setLoadingTokens(false);
      }).catch(() => setLoadingTokens(false));
    } else { setTokens(null); setIsPro(false); setIsStarter(false); }
  }, [isLoggedIn, user?.uid]);

  const handleCategoryChange = (catId) => {
    setCategory(catId);
    setValues(defaultAdValues(catId));
  };

  const handleValueChange = (key, val) => setValues(prev => ({ ...prev, [key]: val }));
  const generatePrompt = () => buildAdPrompt(category, values);

  const handleCopy = async () => {
    if (!isLoggedIn) { onLoginRequest && onLoginRequest(); return; }
    if (!isPro && !isStarter && tokens !== null && tokens <= 0) return;
    const ok = await useToken(db, user.uid);
    if (ok) {
      navigator.clipboard.writeText(generatePrompt());
      setCopied(true);
      if (!isPro && !isStarter) setTokens(prev => Math.max(0, (prev || 0) - 1));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const selCls = "w-full bg-[#0d0d0d] border border-[#2a2a2a] px-2 py-2 text-[12px] text-white focus:border-amber-500 focus:outline-none transition-all rounded-lg appearance-none cursor-pointer";
  const catFields = AD_FIELDS[category] || {};
  const activeCat = AD_CATEGORIES.find(c => c.id === category);

  return (
    <div className="relative pb-20 bg-black transition-colors duration-700 min-h-screen font-sans">
      {!disclaimerAccepted && <DisclaimerModal storageKey="aiflow_disclaimer_ad" onAccept={handleAcceptDisclaimer} />}
      <div className="px-4 pt-6 pb-4 max-w-[1800px] mx-auto">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
          <div>
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-3">
              <Sparkles className="w-3 h-3"/>Kreator Reklam
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Product Ad Builder</h1>
          </div>
          {isLoggedIn && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black ${isPro ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500' : isStarter ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400' : tokens > 0 ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500' : 'bg-red-500/10 border border-red-500/30 text-red-500'}`}>
              <span>{isPro ? '👑' : isStarter ? '⚡' : '🎟'}</span>
              {loadingTokens ? '...' : isPro ? 'All-in-one — nielimitowany' : isStarter ? 'Starter — nielimitowany' : `${tokens}/3 promptów demo`}
            </div>
          )}
        </div>

        {/* Kategorie produktów */}
        <div className="flex flex-wrap gap-2 mb-4">
          {AD_CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => handleCategoryChange(cat.id)}
              className="px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
              style={{
                background: category === cat.id ? cat.color : 'rgba(255,255,255,0.04)',
                border: `1px solid ${category === cat.id ? cat.color : 'rgba(255,255,255,0.1)'}`,
                color: category === cat.id ? '#000' : 'rgba(255,255,255,0.6)',
              }}>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main 3-col layout */}
      <div className="px-4 max-w-[1800px] mx-auto flex gap-4" style={{ alignItems: 'flex-start' }}>

        {/* LEFT NAV — scroll anchors */}
        <div style={{ width: '140px', flexShrink: 0, position: 'sticky', top: '80px' }}>
          <div className="flex flex-col gap-1">
            {AD_SECTION_DEFS.map(sec => (
              <button key={sec.id}
                onClick={() => document.getElementById(`ad-sec-${sec.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="w-full text-left px-3 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = activeCat?.color || '#f59e0b'; e.currentTarget.style.color = activeCat?.color || '#f59e0b'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
              >
                {sec.label}
              </button>
            ))}
          </div>
        </div>

        {/* CENTER — wszystkie sekcje naraz */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {AD_SECTION_DEFS.map(sec => {
            const fieldKeys = sec.fields.filter(fk => catFields[fk]);
            if (fieldKeys.length === 0) return null;
            const fieldLabels = { produkt: 'Produkt', material: 'Materiał', kolor: 'Kolor', efekt: 'Efekt główny', efekt2: 'Efekt dodatkowy', oswietlenie: 'Oświetlenie', nastoj: 'Nastrój', ruch: 'Ruch kamery', tlo: 'Tło' };
            return (
              <div key={sec.id} id={`ad-sec-${sec.id}`} className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#1f1f1f] flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: activeCat?.color }}>{sec.label}</span>
                  <span className="text-[10px] text-white/30 uppercase tracking-widest">{activeCat?.label}</span>
                </div>
                {fieldKeys.map((fk, ri) => {
                  const opts = catFields[fk] || [];
                  return (
                    <div key={fk} className="grid border-b border-[#151515]" style={{ gridTemplateColumns: '140px 1fr', background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                      <div className="flex items-center px-4 py-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{fieldLabels[fk] || fk}</span>
                      </div>
                      <div className="px-3 py-2 border-l border-[#151515]">
                        <div className="relative" style={{ maxWidth: '500px' }}>
                          <select value={values[fk] || ''} onChange={e => handleValueChange(fk, e.target.value)} className={selCls}>
                            {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none"/>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* RIGHT — Prompt sticky */}
        <div style={{ width: '260px', flexShrink: 0, position: 'sticky', top: '80px' }}>
          <div className="relative bg-[#0a0a0a] border border-[#1f1f1f] p-4 rounded-2xl">
            <h2 className="text-[10px] font-black tracking-widest mb-3 border-b border-[#1f1f1f] pb-2 text-amber-500 uppercase">Prompt</h2>
            <div className="relative">
              <div className="bg-[#060606] p-3 min-h-[200px] max-h-[55vh] overflow-y-auto text-white font-mono text-[10px] leading-relaxed break-words border border-[#1a1a1a] mb-4 rounded-xl">
                <span className="text-amber-500 font-bold">{"> "}</span>{generatePrompt()}
              </div>
              {!isLoggedIn && (
                <div className="absolute inset-0 mb-4 rounded-xl backdrop-blur-sm bg-black/80 flex flex-col items-center justify-center p-4 text-center cursor-pointer" onClick={onLoginRequest}>
                  <div className="text-3xl mb-2">🔒</div>
                  <p className="text-white font-black text-xs uppercase tracking-widest mb-1">Zaloguj się</p>
                  <p className="text-white/50 text-[10px] mb-3">3 prompty gratis</p>
                  <span className="bg-amber-500 text-black font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl">Zaloguj</span>
                </div>
              )}
              {isLoggedIn && !isPro && !isStarter && tokens !== null && tokens <= 0 && (
                <div className="absolute inset-0 mb-4 rounded-xl backdrop-blur-sm bg-black/80 flex flex-col items-center justify-center p-4 text-center">
                  <div className="text-3xl mb-2">💳</div>
                  <p className="text-white font-black text-xs uppercase tracking-widest mb-1">Brak promptów</p>
                  <a href={user ? stripeLink(STRIPE_STARTER_LINK, user.uid, user.email) : '#'}
                    target="_blank" rel="noopener noreferrer"
                    className="bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl transition-all mt-2">
                    Kup Plan →
                  </a>
                </div>
              )}
            </div>
            {/* Pole sugestii */}
            <div className="mt-4 mb-3 relative">
              <label className="block text-[9px] font-black uppercase tracking-widest text-amber-500 mb-2">
                ✏️ Twoje sugestie
              </label>
              <textarea
                value={customNote}
                onChange={e => { if (isLoggedIn && (isPro || isStarter || tokens > 0)) setCustomNote(e.target.value); }}
                placeholder={isLoggedIn ? "Dopisz cokolwiek... np. 'trzyma kieliszek wina', 'patrzy przez ramię', 'śmieje się'" : "Zaloguj się aby dodać sugestie..."}
                rows={3}
                className="w-full bg-[#060606] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-[11px] text-white placeholder-white/20 focus:border-amber-500 focus:outline-none resize-none transition-all"
                style={{ filter: (!isLoggedIn || (!isPro && !isStarter && tokens !== null && tokens <= 0)) ? 'blur(2px)' : 'none' }}
              />
              {!isLoggedIn && (
                <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center cursor-pointer gap-1" onClick={onLoginRequest}
                  style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(2px)' }}>
                  <span className="text-lg">🔒</span>
                  <span className="text-white font-black text-[9px] uppercase tracking-widest">Zaloguj się</span>
                </div>
              )}
              {isLoggedIn && !isPro && !isStarter && tokens !== null && tokens <= 0 && (
                <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-1"
                  style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(2px)' }}>
                  <span className="text-lg">💳</span>
                  <span className="text-white font-black text-[9px] uppercase tracking-widest">Brak tokenów</span>
                </div>
              )}
            </div>
            <button onClick={handleCopy}
              className={`w-full py-3 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all ${copied ? 'bg-emerald-500 text-black' : 'bg-amber-500 hover:bg-amber-400 text-black'}`}>
              {copied ? '✔ Skopiowano!' : isPro ? 'Kopiuj (∞)' : isStarter ? 'Kopiuj (∞)' : isLoggedIn && tokens > 0 ? `Kopiuj (${tokens}/3 🎟)` : 'Kopiuj Prompt →'}
            </button>
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
  const STRIPE_STARTER = 'https://buy.stripe.com/14A28qcGJ56fdfq5rQ8bS05'; // 30 PLN starter
  const STRIPE_ALLINONE_MONTHLY = 'https://buy.stripe.com/cNiaEWbCF6aj7V63jI8bS01';
  const STRIPE_ALLINONE_ANNUAL = 'https://buy.stripe.com/7sYfZg7mpgOX2AM5rQ8bS06'; // 1899 PLN rocznie

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-700 font-sans px-3 sm:px-4 py-6 sm:py-12">
      <style>{`
        .price-card { transform: perspective(800px) rotateX(4deg); transition: all 0.4s cubic-bezier(0.23,1,0.32,1); height: 100%; }
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

        <div className="grid md:grid-cols-3 gap-6 items-stretch">

          {/* PLAN 1 — Starter */}
          <div className="price-card relative rounded-3xl p-8 border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/5 flex flex-col"
            style={{boxShadow:'0 20px 60px rgba(245,158,11,0.2), 0 0 40px rgba(245,158,11,0.08)'}}
            onMouseEnter={e=>e.currentTarget.style.boxShadow='0 30px 80px rgba(245,158,11,0.35), 0 0 60px rgba(245,158,11,0.15)'}
            onMouseLeave={e=>e.currentTarget.style.boxShadow='0 20px 60px rgba(245,158,11,0.2), 0 0 40px rgba(245,158,11,0.08)'}>
            <div className="text-5xl mb-4" style={{filter:'drop-shadow(0 8px 16px rgba(245,158,11,0.4))',transform:'perspective(200px) rotateX(10deg)'}}>⚡</div>
            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-500 mb-2">Starter</div>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-5xl font-black text-black dark:text-white">30</span>
              <span className="text-sm text-slate-400 mb-2">PLN/{t.lang==='EN'?'mo':'mies.'}</span>
            </div>
            <p className="text-slate-400 text-xs mb-2">{t.lang==='EN'?'Unlimited AI prompts for avatars & ads':'Nielimitowane prompty AI do awatarów i reklam'}</p>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 mb-5">
              <p className="text-amber-400 text-[10px] font-black uppercase tracking-widest">{t.lang==='EN'?'✨ Perfect for creators':'✨ Idealny dla twórców'}</p>
              <p className="text-white/50 text-[10px] mt-0.5">{t.lang==='EN'?'Virtual AI characters & product ads':'Wirtualne postacie AI i reklamy produktów'}</p>
            </div>
            <div className="space-y-2 mb-8 flex-grow">
              {[
                t.lang==='EN'?'✔ Kreator Awatarów AI (unlimited)':'✔ Kreator Awatarów AI (bez limitu)',
                t.lang==='EN'?'✔ Kreator Reklam AI (unlimited)':'✔ Kreator Reklam Produktowych (bez limitu)',
                t.lang==='EN'?'✔ Unlimited prompts':'✔ Nielimitowane prompty',
                t.lang==='EN'?'✘ Tutorials (All-in-one only)':'✘ Tutoriale (tylko All-in-one)'
              ].map((f,i)=>(
                <p key={i} className={`text-xs ${f.startsWith('✔') ? 'text-black dark:text-white' : 'text-slate-500'}`}>{f}</p>
              ))}
            </div>
            <a href={user && !user.isAnonymous ? stripeLink(STRIPE_STARTER, user.uid, user.email) : '#'}
              onClick={e => { if (!user || user.isAnonymous) { e.preventDefault(); onLoginRequest(); }}}
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
            <a href={user && !user.isAnonymous ? stripeLink(STRIPE_ALLINONE_MONTHLY, user.uid, user.email) : '#'}
              onClick={e => { if (!user || user.isAnonymous) { e.preventDefault(); onLoginRequest(); }}}
              target="_blank" rel="noopener noreferrer"
              className="block w-full py-3.5 font-black text-[11px] uppercase tracking-widest rounded-xl text-center bg-amber-500 hover:bg-amber-400 text-black transition-all shadow-lg shadow-amber-500/30">
              {t.lang==='EN'?'Get All-in-one →':'Wybierz All-in-one →'}
            </a>
          </div>

          {/* PLAN 3 — All-in-one Roczny */}
          <div className="price-card relative rounded-3xl p-8 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 flex flex-col"
            style={{boxShadow:'0 20px 60px rgba(34,197,94,0.2), 0 0 40px rgba(34,197,94,0.08)'}}
            onMouseEnter={e=>e.currentTarget.style.boxShadow='0 30px 80px rgba(34,197,94,0.35), 0 0 60px rgba(34,197,94,0.15)'}
            onMouseLeave={e=>e.currentTarget.style.boxShadow='0 20px 60px rgba(34,197,94,0.2), 0 0 40px rgba(34,197,94,0.08)'}>
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
            <a href={user && !user.isAnonymous ? stripeLink(STRIPE_ALLINONE_ANNUAL, user.uid, user.email) : '#'}
              onClick={e => { if (!user || user.isAnonymous) { e.preventDefault(); onLoginRequest(); }}}
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

const RegulaminView = ({ setCurrentView, lang }) => {
  const [activeTab, setActiveTab] = useState('regulamin');
  const S = ({ children }) => <section className="space-y-3">{children}</section>;
  const H = ({ n, children }) => <h2 className="font-black uppercase text-[10px] tracking-widest text-amber-500 mb-3 mt-8 border-b border-amber-500/20 pb-2">{n}. {children}</h2>;
  const P = ({ children }) => <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{children}</p>;

  const tabs = [
    { id: 'regulamin', label: lang === 'EN' ? 'Terms & Tools' : 'Regulamin & Narzędzia' },
    { id: 'impressum', label: 'Impressum' },
    { id: 'datenschutz', label: lang === 'EN' ? 'Privacy Policy' : 'Polityka Prywatności' },
    { id: 'kontakt', label: lang === 'EN' ? 'Contact' : 'Kontakt' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black p-6 md:p-16 font-sans transition-colors duration-500">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => setCurrentView('home')} className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-8 flex items-center gap-2 hover:gap-3 transition-all">← {lang === 'EN' ? 'Back' : 'Powrót'}</button>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-10">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
              style={{
                background: activeTab === tab.id ? '#f59e0b' : 'transparent',
                border: activeTab === tab.id ? '1px solid #f59e0b' : '1px solid rgba(100,100,100,0.3)',
                color: activeTab === tab.id ? '#000' : '',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* REGULAMIN */}
        {activeTab === 'regulamin' && (
          <div className="space-y-2">
            <h1 className="text-3xl font-black uppercase tracking-tighter text-black dark:text-white mb-2">
              {lang === 'EN' ? 'Terms & Conditions' : 'Regulamin serwisu i narzędzi'}
            </h1>
            <P>Ostatnia aktualizacja: {new Date().toLocaleDateString('pl-PL')}</P>

            <H n="1">{lang === 'EN' ? 'General' : 'Postanowienia ogólne'}</H>
            <P>Niniejszy regulamin określa zasady korzystania z serwisu AI Flow Academy dostępnego pod adresem loveaiflow.com, prowadzonego przez DDC — Dienstleistungen Damian Chlad, Garteler Weg 38, 27711 Osterholz-Scharmbeck, Niemcy.</P>

            <H n="2">{lang === 'EN' ? 'Services' : 'Zakres usług'}</H>
            <P>Serwis oferuje dostęp do materiałów edukacyjnych z zakresu AI, narzędzi do generowania promptów (Kreator Awatarów, Kreator Reklam) oraz społeczności. Dostęp do pełnych funkcji wymaga rejestracji i wykupienia planu Pro (29 PLN/miesiąc).</P>

            <H n="3">{lang === 'EN' ? 'AI Tools — Disclaimer' : 'Narzędzia AI — Zastrzeżenia'}</H>
            <P>Kreatory promptów (zwane dalej „Narzędziami") generują tekstowe instrukcje pomocnicze przeznaczone do użycia w zewnętrznych generatorach obrazów AI. Rejestrując konto i korzystając z Narzędzi użytkownik akceptuje, że:</P>
            <ul className="list-none space-y-2 mt-2">
              {[
                'Narzędzia generują prompt tekstowy — nie tworzą gotowych obrazów ani nie gwarantują konkretnego efektu wizualnego',
                'Wyniki generowania zależą wyłącznie od wybranego zewnętrznego narzędzia AI, jego wersji i ustawień',
                'AI Flow Academy nie ponosi odpowiedzialności za treść, jakość ani zgodność wygenerowanych obrazów z oczekiwaniami użytkownika',
                'Użytkownik korzysta z promptów i wygenerowanych materiałów na własną odpowiedzialność oraz zgodnie z regulaminem wybranego generatora AI',
                'Wygenerowane materiały muszą być zgodne z obowiązującym prawem, w tym z prawem autorskim i prawem Unii Europejskiej',
                'Zabrania się generowania treści nielegalnych, naruszających prawa osób trzecich lub sprzecznych z dobrymi obyczajami',
              ].map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="text-amber-500 mt-0.5 shrink-0">→</span><span>{item}</span>
                </li>
              ))}
            </ul>

            <H n="4">{lang === 'EN' ? 'Subscription & Payments' : 'Subskrypcja i płatności'}</H>
            <P>Plan Pro kosztuje 29 PLN brutto miesięcznie. Płatności obsługuje Stripe. Subskrypcja odnawia się automatycznie. Użytkownik może anulować w dowolnym momencie przez portal klienta Stripe lub wysyłając e-mail na info@loveaiflow.com. Dostęp pozostaje aktywny do końca opłaconego okresu.</P>

            <H n="5">{lang === 'EN' ? 'Right of Withdrawal (EU/DE)' : 'Prawo odstąpienia (UE/DE)'}</H>
            <P>Zgodnie z prawem UE i przepisami niemieckimi (§ 312g BGB), użytkownik ma prawo odstąpić od umowy w ciągu 14 dni od jej zawarcia bez podania przyczyny. Prawo to wygasa z chwilą rozpoczęcia korzystania z usług cyfrowych za wyraźną zgodą użytkownika. Aby skorzystać z prawa odstąpienia, prosimy o kontakt: info@loveaiflow.com.</P>

            <H n="6">{lang === 'EN' ? 'Liability' : 'Odpowiedzialność'}</H>
            <P>DDC — Dienstleistungen Damian Chlad nie ponosi odpowiedzialności za treści generowane przez zewnętrzne narzędzia AI, przerwy w działaniu usług zewnętrznych (Stripe, Firebase, generatory AI) ani za szkody wynikające z nieprawidłowego użycia Narzędzi.</P>

            <H n="7">{lang === 'EN' ? 'Governing Law' : 'Prawo właściwe'}</H>
            <P>Niniejszy regulamin podlega prawu niemieckiemu. Wszelkie spory będą rozstrzygane przez sądy właściwe dla siedziby usługodawcy (Osterholz-Scharmbeck, Niemcy).</P>
          </div>
        )}

        {/* IMPRESSUM */}
        {activeTab === 'impressum' && (
          <div className="space-y-2">
            <h1 className="text-3xl font-black uppercase tracking-tighter text-black dark:text-white mb-6">Impressum</h1>
            <P>Angaben gemäß § 5 TMG (Telemediengesetz)</P>

            <H n="1">Anbieter</H>
            <P><strong>DDC — Dienstleistungen Damian Chlad</strong><br/>
            Garteler Weg 38<br/>
            27711 Osterholz-Scharmbeck<br/>
            Deutschland</P>

            <H n="2">Kontakt</H>
            <P>E-Mail: info@loveaiflow.com<br/>
            Website: loveaiflow.com</P>

            <H n="3">Gewerbeanmeldung</H>
            <P>Eingetragenes Gewerbe gemäß § 14 GewO.<br/>
            Zuständige Behörde: Landkreis Osterholz</P>

            <H n="4">Umsatzsteuer</H>
            <P>Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).</P>

            <H n="5">Streitschlichtung</H>
            <P>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr. Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</P>

            <H n="6">Haftungsausschluss</H>
            <P>Die Inhalte dieser Website wurden mit größtmöglicher Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte kann keine Gewähr übernommen werden. Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.</P>
          </div>
        )}

        {/* DATENSCHUTZ */}
        {activeTab === 'datenschutz' && (
          <div className="space-y-2">
            <h1 className="text-3xl font-black uppercase tracking-tighter text-black dark:text-white mb-2">
              {lang === 'EN' ? 'Privacy Policy' : 'Polityka Prywatności / Datenschutzerklärung'}
            </h1>
            <P>Ostatnia aktualizacja: {new Date().toLocaleDateString('pl-PL')}</P>

            <H n="1">{lang === 'EN' ? 'Controller' : 'Administrator danych'}</H>
            <P>DDC — Dienstleistungen Damian Chlad, Garteler Weg 38, 27711 Osterholz-Scharmbeck. E-Mail: info@loveaiflow.com</P>

            <H n="2">{lang === 'EN' ? 'Data collected' : 'Zbierane dane'}</H>
            <P>Zbieramy następujące dane: adres e-mail (przy rejestracji), dane logowania Google (przy logowaniu przez Google), dane płatności (obsługiwane wyłącznie przez Stripe — nie przechowujemy danych kart), logi aktywności (Firebase Analytics).</P>

            <H n="3">{lang === 'EN' ? 'Purpose & Legal basis' : 'Cel i podstawa prawna'}</H>
            <P>Dane przetwarzamy w celu: realizacji umowy (art. 6 ust. 1 lit. b RODO), obsługi płatności (Stripe), zapewnienia bezpieczeństwa serwisu. Podstawą prawną jest wykonanie umowy oraz uzasadniony interes administratora.</P>

            <H n="4">{lang === 'EN' ? 'Third parties' : 'Podmioty trzecie'}</H>
            <P>Dane przekazujemy: Firebase/Google (hosting, auth, baza danych), Stripe (płatności). Wszystkie podmioty działają zgodnie z RODO/GDPR.</P>

            <H n="5">{lang === 'EN' ? 'Your rights' : 'Twoje prawa'}</H>
            <P>Masz prawo do: dostępu do danych, sprostowania, usunięcia („prawo do bycia zapomnianym"), ograniczenia przetwarzania, przenoszenia danych, sprzeciwu. Aby skorzystać z praw, skontaktuj się: info@loveaiflow.com</P>

            <H n="6">{lang === 'EN' ? 'Retention' : 'Okres przechowywania'}</H>
            <P>Dane przechowujemy przez czas trwania umowy oraz wymagany przez prawo (np. dane księgowe — 10 lat zgodnie z prawem niemieckim). Po tym czasie dane są usuwane.</P>

            <H n="7">{lang === 'EN' ? 'Complaints' : 'Skargi'}</H>
            <P>Masz prawo złożyć skargę do organu nadzorczego. W Niemczech: Der Landesbeauftragte für den Datenschutz Niedersachsen (www.lfd.niedersachsen.de).</P>
          </div>
        )}

        {/* KONTAKT */}
        {activeTab === 'kontakt' && (
          <div className="space-y-2">
            <h1 className="text-3xl font-black uppercase tracking-tighter text-black dark:text-white mb-6">
              {lang === 'EN' ? 'Contact' : 'Kontakt'}
            </h1>

            <div className="grid gap-4 mt-6">
              {[
                { icon: '🏢', label: lang === 'EN' ? 'Company' : 'Firma', value: 'DDC — Dienstleistungen Damian Chlad' },
                { icon: '📍', label: lang === 'EN' ? 'Address' : 'Adres', value: 'Garteler Weg 38, 27711 Osterholz-Scharmbeck, Deutschland' },
                { icon: '✉️', label: 'E-Mail', value: 'info@loveaiflow.com' },
                { icon: '🌐', label: 'Website', value: 'loveaiflow.com' },
              ].map(item => (
                <div key={item.label} className="flex gap-4 p-4 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#1f1f1f] rounded-xl">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">{item.label}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest mb-1">
                {lang === 'EN' ? 'Response time' : 'Czas odpowiedzi'}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {lang === 'EN' ? 'We respond to all inquiries within 2 business days.' : 'Odpowiadamy na wszystkie zapytania w ciągu 2 dni roboczych.'}
              </p>
            </div>
          </div>
        )}

        <div className="mt-16 pt-8 border-t border-slate-200 dark:border-[#1f1f1f]">
          <p className="text-[10px] text-slate-400 dark:text-slate-600">© {new Date().getFullYear()} DDC — Dienstleistungen Damian Chlad · loveaiflow.com</p>
        </div>
      </div>
    </div>
  );
};


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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalPaymentFailed, setGlobalPaymentFailed] = useState(false);
  const [globalDaysLeft, setGlobalDaysLeft] = useState(null);
  const [globalSubscriptionData, setGlobalSubscriptionData] = useState(null);
  const [userData, setUserData] = useState(null);

  const t = { ...translations[lang], lang };
  const isLoggedIn = user && !user.isAnonymous;

  // Prosta funkcja strażnik — sprawdza pro + datę wygaśnięcia
  const hasActivePro = () => {
    if (!userData?.pro) return false;
    if (userData?.expiresAt?.seconds) return new Date() < new Date(userData.expiresAt.seconds * 1000);
    if (typeof userData?.expiresAt === 'string') return new Date() < new Date(userData.expiresAt);
    return true; // stary rekord bez daty
  };

  const hasActiveStarter = () => {
    if (!userData?.starter) return false;
    if (userData?.expiresAt?.seconds) return new Date() < new Date(userData.expiresAt.seconds * 1000);
    if (typeof userData?.expiresAt === 'string') return new Date() < new Date(userData.expiresAt);
    return true;
  };

  // Sprawdzenie statusu subskrypcji na podstawie globalnych danych
  const checkSubscription = () => {
    const data = globalSubscriptionData;
    if (!data || (!data.isPro && !data.isStarter)) return { active: false, status: 'free' };
    if (data.isExpired) return { active: false, status: 'expired' };
    if (globalPaymentFailed) return { active: true, status: 'warning' };
    return { active: true, status: 'active', plan: data.plan, daysLeft: data.daysLeft };
  };

  // New nav items: Academy → Aplikacje → Dodatki → Tutoriale
  const handleNavigate = (view) => { setCurrentView(view); setMobileMenuOpen(false); };
  const navItems = [
    { id: 'home', label: t.lang === 'EN' ? 'Academy' : 'Academy' },
    { id: 'aplikacje', label: 'Aplikacje' },
    { id: 'dodatki', label: 'Dodatki' },
    { id: 'tutorials', label: t.nav_tutorials },
    { id: 'cennik', label: t.lang === 'EN' ? 'Pricing' : 'Cennik' },
  ];


  useEffect(() => {
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u && !u.isAnonymous) {
        // onSnapshot — reaguje na zmiany w Firestore w czasie rzeczywistym
        const tokenRef = doc(db, 'artifacts', appId, 'public', 'data', 'tokens', u.uid);
        onSnapshot(tokenRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setUserData(data);
            const expiresAt = data.expiresAt?.seconds
              ? new Date(data.expiresAt.seconds * 1000)
              : data.expiresAt ? new Date(data.expiresAt) : null;
            const isExpired = expiresAt ? new Date() > expiresAt : false;
            const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24))) : null;
            const isPro = data.pro === true && !isExpired;
            const isStarter = data.starter === true && !isExpired;
            setGlobalPaymentFailed(data.paymentFailed === true);
            setGlobalDaysLeft(daysLeft);
            setGlobalSubscriptionData({ isPro, isStarter, plan: data.plan, isExpired, daysLeft });
          }
        });
      } else {
        setUserData(null);
        setGlobalPaymentFailed(false);
        setGlobalDaysLeft(null);
        // Brak auto-logowania anonimowego — użytkownik musi się zalogować ręcznie
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
      <div className="min-h-screen bg-white dark:bg-black transition-colors duration-700 font-sans selection:bg-amber-500 selection:text-black" style={{overflowX:'hidden',maxWidth:'100vw'}}>

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
              {/* Desktop nav */}
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
                    {currentView === id && id !== 'tutorials' && (
                      <span className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-1 h-1 bg-amber-400 rounded-full"
                        style={{ boxShadow: '0 0 6px rgba(245,158,11,0.8)' }} />
                    )}
                  </button>
                ))}
              </div>
              {/* Mobile hamburger */}
              <div className="sm:hidden relative">
                <button
                  onClick={() => setMobileMenuOpen(prev => !prev)}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${isDarkMode ? 'text-white/70 hover:text-amber-400' : 'text-black/70 hover:text-amber-500'}`}
                  style={{border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)'}}>
                  <span className="font-black text-lg">{mobileMenuOpen ? '✕' : '☰'}</span>
                </button>
                {mobileMenuOpen && (
                  <div className="absolute right-0 top-12 w-48 rounded-2xl overflow-hidden z-50 shadow-2xl"
                    style={{background: isDarkMode ? '#0f0f0f' : '#fff', border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'}}>
                    {navItems.map(({ id, label }) => (
                      <button key={id} onClick={() => { setCurrentView(id); setMobileMenuOpen(false); }}
                        className={`w-full text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                          currentView === id ? 'bg-amber-500 text-black' : isDarkMode ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-black/60 hover:text-black hover:bg-black/5'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="hidden sm:block"><LangSwitcher lang={lang} setLang={setLang} /></div>

              {isLoggedIn ? (
                <div className="flex items-center gap-2">
                  {user?.email === ADMIN_EMAIL && (
                    <button onClick={() => setCurrentView('admin')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-amber-400 text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-amber-500/10"
                      style={{border:'1px solid rgba(245,158,11,0.3)'}}>
                      ⚙
                    </button>
                  )}
                  <div className="flex flex-col items-end gap-0.5">
                    <button onClick={() => signOut(auth)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-emerald-500/10"
                      style={{border:'1px solid rgba(52,211,153,0.3)'}}>
                      <User className="w-4 h-4" /><span className="hidden sm:block">{user.email?.split('@')[0] || 'Konto'}</span>
                    </button>
                    {globalSubscriptionData?.isPro && !globalSubscriptionData?.isExpired && (
                      <span className="text-[8px] font-black uppercase tracking-widest text-amber-500">
                        👑 Pro {globalSubscriptionData.plan === 'annual' ? '· Roczny' : ''}
                      </span>
                    )}
                    {globalSubscriptionData?.isStarter && !globalSubscriptionData?.isExpired && (
                      <span className="text-[8px] font-black uppercase tracking-widest text-blue-400">
                        ⚡ Starter
                      </span>
                    )}
                    {globalSubscriptionData?.isExpired && (
                      <span className="text-[8px] font-black uppercase tracking-widest text-red-400 cursor-pointer" onClick={() => setCurrentView('cennik')}>
                        ✕ Wygasła — odnów →
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowLogin(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all">
                  <User className="w-4 h-4" /><span className="hidden sm:block">{lang === 'EN' ? 'Log In' : 'Zaloguj'}</span>
                </button>
              )}

              <button onClick={() => setIsDarkMode(!isDarkMode)}
                className={`hidden sm:flex w-9 h-9 items-center justify-center rounded-xl transition-colors ${isDarkMode ? 'text-white/40 hover:text-amber-400' : 'text-black/40 hover:text-amber-500'}`}
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

          {/* Paywall — subskrypcja wygasła */}
          {isLoggedIn && checkSubscription().status === 'expired' && currentView !== 'cennik' && currentView !== 'home' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md" style={{top:'64px'}}>
              <div className="max-w-md w-full mx-4 p-8 rounded-2xl border border-white/10 bg-black text-center" style={{boxShadow:'0 0 60px rgba(245,158,11,0.15)'}}>
                <div className="text-4xl mb-4">⏰</div>
                <h2 className="text-white font-black text-xl uppercase tracking-widest mb-2">
                  {lang === 'EN' ? 'Subscription Expired' : 'Subskrypcja wygasła'}
                </h2>
                <p className="text-white/50 text-sm mb-6">
                  {lang === 'EN' ? 'Renew your plan to continue using AI Flow Academy.' : 'Odnów plan aby dalej korzystać z AI Flow Academy.'}
                </p>
                <button onClick={() => setCurrentView('cennik')}
                  className="block w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-widest rounded-xl transition-all">
                  {lang === 'EN' ? 'See Plans →' : 'Zobacz plany →'}
                </button>
              </div>
            </div>
          )}

          {currentView === 'home' && <HomeView t={t} user={user} onLoginRequest={() => setShowLogin(true)} />}
          {currentView === 'aplikacje' && <AplikacjeView t={t} user={user} onLoginRequest={() => setShowLogin(true)} onCreatorChange={setActiveCreator} />}
          {currentView === 'dodatki' && <DodatkiView t={t} onNavigate={setCurrentView} />}
          {currentView === 'tutorials' && <TutorialsView t={t} user={user} onLoginRequest={() => setShowLogin(true)} onNavigate={setCurrentView} />}
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

        {showLogin && <LoginModal onClose={() => setShowLogin(false)} lang={lang} onRegulamin={() => setCurrentView('regulamin')} />}

        {/* Banner ostrzegawczy — nieudana płatność */}
        {isLoggedIn && globalPaymentFailed && (
          <div className="fixed top-16 left-0 right-0 z-40 bg-red-600 text-white text-center text-xs font-black uppercase tracking-widest py-2 px-4" style={{boxShadow:'0 4px 20px rgba(239,68,68,0.4)'}}>
            ⚠ {lang === 'EN' ? 'Payment failed — update your card to keep access' : 'Płatność nieudana — zaktualizuj kartę aby zachować dostęp'}
          </div>
        )}



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
// pornola, biznes znaczy. 🏆
