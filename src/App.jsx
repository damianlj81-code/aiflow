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
        {mode === 'register' && (
          <p className="text-center text-[10px] text-slate-500 mt-3 leading-relaxed px-2">
            {lang === 'EN'
              ? <>By creating an account you accept the <a href="/regulamin" target="_blank" className="text-amber-500 hover:underline font-bold">Terms & Conditions</a> and <a href="/datenschutz" target="_blank" className="text-amber-500 hover:underline font-bold">Privacy Policy</a>, including AI tools terms.</>
              : <>Tworzac konto akceptujesz <a href="/regulamin" target="_blank" className="text-amber-500 hover:underline font-bold">Regulamin</a> oraz <a href="/datenschutz" target="_blank" className="text-amber-500 hover:underline font-bold">Polityke Prywatnosci</a>, w tym warunki korzystania z narzedzi AI.</>}
          </p>
        )}
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
    {
      id: 'lifestyle-builder',
      icon: '🛥️',
      title: t.lang === 'EN' ? 'Lifestyle Builder' : 'Kreator Lifestyle',
      subtitle: t.lang === 'EN' ? 'Luxury Lifestyle Prompt Generator' : 'Generator Promptów Lifestyle AI',
      desc: t.lang === 'EN' ? 'Create luxury lifestyle prompts — yacht, jet, penthouse.' : 'Twórz prompty lifestyle — jacht, jet, penthouse.',
      color: 'from-cyan-500/20 via-teal-500/10 to-emerald-500/20',
      border: 'border-cyan-500/30',
      glow: 'rgba(6,182,212,0.3)',
      badge: t.lang === 'EN' ? 'LIFESTYLE STUDIO' : 'STUDIO LIFESTYLE',
    },
    {
      id: 'film-builder',
      icon: '🎬',
      title: t.lang === 'EN' ? 'Film Builder' : 'Kreator Filmów',
      subtitle: t.lang === 'EN' ? 'AI Film Prompt Generator' : 'Generator Promptów Filmowych AI',
      desc: t.lang === 'EN' ? 'Create 3-frame renovation prompts — ruin to modern. For VEO 3, Kling AI, Runway.' : 'Twórz prompty renowacji — ruina do nowoczesnego. Dla VEO 3, Kling AI, Runway.',
      color: 'from-orange-500/20 via-red-500/10 to-yellow-500/20',
      border: 'border-orange-500/30',
      glow: 'rgba(249,115,22,0.3)',
      badge: t.lang === 'EN' ? 'FILM STUDIO' : 'STUDIO FILMÓW',
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
        {activeApp === 'lifestyle-builder' && <LifestyleBuilderView t={t} user={user} onLoginRequest={onLoginRequest} />}
        {activeApp === 'film-builder' && <FilmBuilderView t={t} user={user} onLoginRequest={onLoginRequest} />}

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
// AVATAR BUILDER VIEW — Kreator Awatarow
// =========================================================================
// =========================================================================
// AVATAR BUILDER VIEW — Multi-Character
// =========================================================================

const CHARACTER_DEFAULTS_F = {
  subject: '1girl, beautiful woman',
  bodyType: 'slim and toned body',
  breastSize: 'medium breasts',
  skinTone: 'fair skin',
  hairStyle: 'loose wavy hair, natural flow',
  hairColor: 'blonde',
  hairLength: 'long',
  faceSelect: 'detailed symmetrical face, sharp features, natural skin',
  makeupStyle: 'cat eyes, sharp winged eyeliner, subtle nude lips',
  lipColor: 'nude',
  jewelry: 'wearing luxury pearl drop earrings',
  nails: 'none',
  tattoo: 'none',
  topClothing: 'casual white t-shirt',
  bottomClothing: 'blue denim jeans',
  legwear: '',
  shoes: 'elegant high heels, stilettos',
};

const CHARACTER_DEFAULTS_M = {
  subject: '1boy, handsome man',
  bodyType: 'athletic, muscular body',
  breastSize: '',
  skinTone: 'fair skin',
  hairStyle: 'short textured hair, natural style',
  hairColor: 'brunette',
  hairLength: 'short',
  faceSelect: 'detailed symmetrical face, sharp jawline, masculine features',
  makeupStyle: 'none',
  lipColor: 'nude',
  jewelry: 'none',
  nails: 'none',
  tattoo: 'none',
  topClothing: 'casual white t-shirt',
  bottomClothing: 'slim fit trousers',
  legwear: '',
  shoes: 'clean white sneakers',
};

const CharacterCard = ({ char, idx, onChange, t }) => {
  const isMale = char.subject.includes('1boy') && !char.subject.includes('1girl');
  const isBikini = char.topClothing.includes('bikini') || char.topClothing.includes('swimwear') || char.bottomClothing.includes('bikini') || char.bottomClothing.includes('swimwear');
  const isLingerie = char.topClothing.includes('lingerie') || char.topClothing.includes('bra') || char.topClothing.includes('corset') || char.bottomClothing.includes('thong') || char.bottomClothing.includes('lingerie');

  const set = (key) => (val) => onChange(idx, key, val);

  const labelClass = 'block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1';
  const inputClass = 'w-full bg-slate-100 dark:bg-[#111] border border-black/10 dark:border-[#1a1a1a] rounded-lg px-2.5 py-2 text-xs text-black dark:text-white focus:outline-none focus:border-amber-500 transition-colors appearance-none pr-6';

  const Sel = ({ k, opts }) => (
    <div className="relative">
      <select value={char[k]} onChange={e => set(k)(e.target.value)} className={inputClass}>
        {opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none"/>
    </div>
  );

  const colors = ['border-amber-500/60','border-blue-500/60','border-purple-500/60','border-green-500/60'];
  const labels = ['Postac 1','Postac 2','Postac 3','Postac 4'];

  return (
    <div className={`bg-white dark:bg-[#0a0a0a] border ${colors[idx]} rounded-2xl p-4`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">{labels[idx]}</span>
        <div className="flex gap-2">
          <button onClick={() => onChange(idx, '__reset_f')} className="text-[9px] text-slate-600 hover:text-amber-500 uppercase tracking-wider font-bold">F</button>
          <button onClick={() => onChange(idx, '__reset_m')} className="text-[9px] text-slate-600 hover:text-blue-500 uppercase tracking-wider font-bold">M</button>
        </div>
      </div>

      {/* Plec i sylwetka */}
      <div className="mb-3">
        <label className={labelClass}>{t.lang==='EN'?'Subject':'Postac'}</label>
        <Sel k="subject" opts={[['1girl, beautiful woman',t.lang==='EN'?'Woman':'Kobieta'],['1boy, handsome man',t.lang==='EN'?'Man':'Mezczyzna']]}/>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className={labelClass}>{t.lang==='EN'?'Build':'Sylwetka'}</label>
          <Sel k="bodyType" opts={isMale?[['slim and toned body','Slim'],['athletic, muscular body','Atletyczna'],['broad shoulders, strong physique','Szeroki']]:[['slim and toned body','Slim'],['curvy, hourglass figure','Klepsydra'],['athletic, muscular body','Atletyczna'],['petite, delicate frame','Drobna']]}/>
        </div>
        <div>
          <label className={labelClass}>{t.lang==='EN'?'Skin':'Karnacja'}</label>
          <Sel k="skinTone" opts={[['fair skin','Jasna'],['light skin','Swietlista'],['medium skin, tan','Opalone'],['dark skin','Ciemna'],['ebony skin','Hebanowa']]}/>
        </div>
      </div>

      {/* Wlosy */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className={labelClass}>{t.lang==='EN'?'Hair Color':'Kolor wlosow'}</label>
          <Sel k="hairColor" opts={[['blonde','Blond'],['brunette','Brazowe'],['black','Czarne'],['red','Rude'],['platinum blonde','Platynowe'],['silver','Srebrne'],['pink','Rozowe'],['auburn','Kasztanowe']]}/>
        </div>
        <div>
          <label className={labelClass}>{t.lang==='EN'?'Hairstyle':'Fryzura'}</label>
          <Sel k="hairStyle" opts={isMale?[['short textured hair, natural style','Krotkie'],['slicked back hair, polished look','Zaczesane'],['messy bedhead hair, casual style','Rozczochrane'],['buzz cut, clean and sharp','Na jeza']]:[['loose wavy hair, natural flow','Luzne fale'],['elegant updo hair, wedding style, revealing ears and earrings','Upiecie'],['high bun hair, sleek look','Kok'],['tied in a ponytail','Kucyk'],['straight silky hair, flowing down','Proste'],['voluminous curly hair','Krecone']]}/>
        </div>
        <div>
          <label className={labelClass}>{t.lang==='EN'?'Length':'Dlugosc'}</label>
          <Sel k="hairLength" opts={isMale?[['short','Krotkie'],['medium length','Srednie']]:[['short','Krotkie'],['medium length','Srednie'],['long','Dlugie'],['very long, down to waist','Bardzo dlugie']]}/>
        </div>
        <div>
          <label className={labelClass}>{t.lang==='EN'?'Face':'Twarz'}</label>
          <Sel k="faceSelect" opts={isMale?[['detailed symmetrical face, sharp jawline, masculine features','Wyrazista'],['handsome face, strong brow, stubble beard','Zarost'],['clean shaven, fresh face, boy-next-door','Gładka']]:[['detailed symmetrical face, sharp features, natural skin','Klasyczna'],['cute face, freckles, girl-next-door','Piegi'],['model face, high cheekbones, editorial','Modelki'],['mature elegant face, refined features','Dojrzala']]}/>
        </div>
      </div>

      {/* Makijaz (tylko kobieta) */}
      {!isMale && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className={labelClass}>Makijaz</label>
            <Sel k="makeupStyle" opts={[['cat eyes, sharp winged eyeliner, subtle nude lips','Cat eyes'],['smoky eyes, heavy dark eyeshadow','Smoky eyes'],['natural makeup, no-makeup look, barely there','Naturalny'],['bold colorful eyeshadow, editorial makeup','Bold editorial'],['no makeup, bare skin','Bez makijazu']]}/>
          </div>
          <div>
            <label className={labelClass}>{t.lang==='EN'?'Lip Color':'Usta'}</label>
            <Sel k="lipColor" opts={[['nude','Nude'],['red lips','Czerwone'],['pink lips','Rozowe'],['berry, dark lips','Burgund'],['glossy lips','Brokatowe']]}/>
          </div>
          <div>
            <label className={labelClass}>{t.lang==='EN'?'Jewelry':'Bizuteria'}</label>
            <Sel k="jewelry" opts={[['wearing luxury pearl drop earrings','Perły'],['wearing diamond stud earrings','Brylanty'],['wearing gold necklace, elegant','Naszyjnik'],['wearing chandelier earrings, crystal','Zwisajace'],['none','Brak']]}/>
          </div>
          <div>
            <label className={labelClass}>{t.lang==='EN'?'Nails':'Paznokcie'}</label>
            <Sel k="nails" opts={[['none','Naturalne'],['long red acrylic nails','Dlugie czerwone'],['french manicure, elegant','French'],['short nude nails, clean','Krotkie nude'],['long nude acrylics, coffin shape','Dlugie nude']]}/>
          </div>
        </div>
      )}

      {/* Ubranie */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className={labelClass}>{t.lang==='EN'?'Top':'Gora'}</label>
          <Sel k="topClothing" opts={isMale?[['casual white t-shirt','T-shirt'],['suit jacket, formal','Marynarka'],['open shirt, casual','Koszula'],['tank top, athletic','Bezrekawnik'],['luxury polo shirt','Polo']]:[['casual white t-shirt','T-shirt'],['suit jacket, formal','Marynarka'],['bikini top, swimwear','Bikini top'],['sexy lingerie bra, lace','Biustonosz'],['sexy corset, lingerie','Gorset'],['cocktail dress, elegant','Sukienka'],['off-shoulder top, elegant','Off-shoulder'],['crop top, casual','Crop top']]}/>
        </div>
        <div>
          <label className={labelClass}>{t.lang==='EN'?'Bottom':'Dol'}</label>
          <Sel k="bottomClothing" opts={isMale?[['slim fit trousers','Spodnie slim'],['jeans, casual denim','Jeansy'],['shorts, casual','Szorty'],['suit trousers, formal','Formalne']]:[['blue denim jeans','Jeansy'],['mini skirt','Mini'],['elegant trousers','Spodnie'],['midi skirt, elegant','Midi'],['bikini bottom, swimwear','Bikini dol'],['thong, lingerie','Stringi'],['shorts, casual','Szorty'],['bare legs, no pants','Gole nogi']]}/>
        </div>
        <div>
          <label className={labelClass}>{t.lang==='EN'?'Shoes':'Obuwie'}</label>
          <Sel k="shoes" opts={isMale?[['clean white sneakers','Sneakersy'],['oxford leather shoes','Oxfordy'],['chelsea boots','Chelsea'],['barefoot','Boso']]:[['elegant high heels, stilettos','Szpilki'],['modern sneakers','Sportowe'],['ankle boots, elegant','Ankle boots'],['platform heels','Koturny'],['barefoot','Boso']]}/>
        </div>
        {!isMale && (
          <div>
            <label className={labelClass}>{t.lang==='EN'?'Legwear':'Nogi'}</label>
            <Sel k="legwear" opts={[['','Brak'],['pantyhose','Rajstopy'],['stockings with lace','Ponczoch'],['fishnet stockings','Siateczka']]}/>
          </div>
        )}
      </div>

      {/* Tatuaz */}
      <div>
        <label className={labelClass}>{t.lang==='EN'?'Tattoo':'Tatuaz'}</label>
        <Sel k="tattoo" opts={[['none','Brak'],['small delicate tattoo on wrist','Nadgarstek'],['sleeve tattoo, arm','Rekaw'],['back tattoo, large','Plecy'],['neck tattoo, small','Szyja'],['leg tattoo','Noga']]}/>
      </div>
    </div>
  );
};

const AvatarBuilderView = ({ t, user, onLoginRequest }) => {
  const isLoggedIn = user && !user.isAnonymous;
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

  useEffect(() => {
    if (!isLoggedIn) {
      const noRight = e => e.preventDefault();
      const noF12 = e => { if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key)) || (e.ctrlKey && e.key === 'U')) e.preventDefault(); };
      document.addEventListener('contextmenu', noRight);
      document.addEventListener('keydown', noF12);
      return () => { document.removeEventListener('contextmenu', noRight); document.removeEventListener('keydown', noF12); };
    }
  }, [isLoggedIn]);

  const canGenerate = isPro || isStarter || (tokens !== null && tokens > 0);

  // Liczba postaci
  const [charCount, setCharCount] = useState(1);
  const [characters, setCharacters] = useState([
    { ...CHARACTER_DEFAULTS_F },
    { ...CHARACTER_DEFAULTS_F, hairColor: 'brunette' },
    { ...CHARACTER_DEFAULTS_F, hairColor: 'black' },
    { ...CHARACTER_DEFAULTS_F, hairColor: 'red' },
  ]);

  // Wspolne ustawienia
  const [pose, setPose] = useState('confident standing pose');
  const [bgSelect, setBgSelect] = useState('professional studio, white background');
  const [photoStyle, setPhotoStyle] = useState('hyperrealistic photography, DSLR, 8K resolution, sharp focus, real skin texture');

  const handleCharChange = (idx, key, val) => {
    if (key === '__reset_f') {
      setCharacters(prev => prev.map((c, i) => i === idx ? { ...CHARACTER_DEFAULTS_F } : c));
      return;
    }
    if (key === '__reset_m') {
      setCharacters(prev => prev.map((c, i) => i === idx ? { ...CHARACTER_DEFAULTS_M } : c));
      return;
    }
    setCharacters(prev => prev.map((c, i) => i === idx ? { ...c, [key]: val } : c));
  };

  const buildCharPrompt = (char) => {
    const isMale = char.subject.includes('1boy') && !char.subject.includes('1girl');
    const isBikini = char.topClothing.includes('bikini') || char.topClothing.includes('swimwear') || char.bottomClothing.includes('bikini') || char.bottomClothing.includes('swimwear');
    const isLingerie = char.topClothing.includes('lingerie') || char.topClothing.includes('bra') || char.topClothing.includes('corset') || char.bottomClothing.includes('thong') || char.bottomClothing.includes('lingerie');
    const isBareLegsFix = char.bottomClothing.includes('bare legs') || char.bottomClothing.includes('no pants');

    const clothingSuffix = isBikini || isLingerie
      ? 'intimate areas fully covered, no nudity, tasteful'
      : isBareLegsFix
      ? 'bare legs only, intimate areas fully covered, no nudity'
      : 'fully clothed, no nudity, tasteful';

    const autoBra = (!isMale && char.breastSize === 'large heavy breasts' && !isBikini && !char.topClothing.includes('dress')) ? 'wearing proper bra' : '';

    return [
      char.subject,
      char.bodyType,
      (!isMale && (isBikini || isLingerie)) ? char.breastSize : '',
      autoBra,
      char.skinTone,
      char.faceSelect,
      'stunning detailed eyes',
      `${char.hairLength} ${char.hairColor} ${char.hairStyle}`,
      !isMale ? char.makeupStyle : '',
      !isMale ? `${char.lipColor} lips` : '',
      !isMale ? char.jewelry : '',
      (!isMale && char.nails !== 'none') ? char.nails : '',
      char.topClothing,
      char.bottomClothing,
      char.legwear !== '' ? char.legwear : '',
      char.shoes,
      char.tattoo !== 'none' ? char.tattoo : '',
      clothingSuffix,
    ].filter(Boolean).join(', ');
  };

  const generatePrompt = async () => {
    if (!canGenerate) return;
    const ok = await useToken(db, user.uid);
    if (!ok) return;
    setTokens(prev => (prev !== null ? prev - 1 : null));

    const activeChars = characters.slice(0, charCount);
    const charPrompts = activeChars.map((c, i) => charCount === 1 ? buildCharPrompt(c) : `(${buildCharPrompt(c)})`);

    const subjectLine = charCount === 1
      ? charPrompts[0]
      : `${charCount === 2 ? '2girls' : charCount === 3 ? '3girls' : '4girls'}, ${charPrompts.join(', ')}`;

    const finalPrompt = [
      'full body shot',
      subjectLine,
      pose,
      bgSelect,
      photoStyle,
      'masterpiece, high-end fashion photography, ultra-detailed, sharp focus, cinematic lighting',
    ].filter(Boolean).join(', ');

    navigator.clipboard.writeText(finalPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const sectionClass = 'bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-[#1a1a1a] rounded-2xl p-5 mb-4';
  const headerClass = 'text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500 mb-4 flex items-center gap-2';
  const labelClass = 'block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5';
  const inputClass = 'w-full bg-slate-100 dark:bg-[#111] border border-black/10 dark:border-[#222] rounded-xl px-3 py-2.5 text-sm text-black dark:text-white focus:outline-none focus:border-amber-500 transition-colors appearance-none pr-8';

  return (
    <div className="min-h-screen bg-white dark:bg-black font-sans pb-16">
      <div className="max-w-6xl mx-auto px-4 pt-8">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-4">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"/>
            {t.lang==='EN' ? 'AI Avatar Generator' : 'Generator Awatarow AI'}
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-black dark:text-white uppercase tracking-tighter mb-2">
            {t.lang==='EN' ? 'Avatar Builder' : 'Kreator Awatarow'}<span className="text-amber-500">.</span>
          </h1>
          <p className="text-slate-500 text-sm mb-4">
            {t.lang==='EN' ? 'Build each character separately — combine into one prompt.' : 'Kazda postac osobno — jeden gotowy prompt.'}
          </p>

          {/* Liczba postaci */}
          <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-[#0a0a0a] border border-black/10 dark:border-[#222] rounded-2xl p-1">
            {[1,2,3,4].map(n => (
              <button key={n} onClick={() => setCharCount(n)}
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${charCount === n ? 'bg-amber-500 text-black' : 'text-slate-500 hover:text-white'}`}>
                {n} {n === 1 ? (t.lang==='EN'?'char':'postac') : (t.lang==='EN'?'chars':'postacie')}
              </button>
            ))}
          </div>
        </div>

        {/* Karty postaci */}
        <div className={`grid gap-4 mb-6 ${charCount === 1 ? 'grid-cols-1 max-w-xl mx-auto' : charCount === 2 ? 'grid-cols-1 sm:grid-cols-2' : charCount === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
          {Array.from({ length: charCount }).map((_, i) => (
            <CharacterCard key={i} char={characters[i]} idx={i} onChange={handleCharChange} t={t} />
          ))}
        </div>

        {/* Wspolne ustawienia */}
        <div className={sectionClass}>
          <p className={headerClass}><span className="text-base">🎬</span> {t.lang==='EN' ? 'Shared settings' : 'Wspolne ustawienia'}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>{t.lang==='EN'?'Pose':'Poza'}</label>
              <div className="relative">
                <select value={pose} onChange={e => setPose(e.target.value)} className={inputClass}>
                  {[['confident standing pose','Stojaca'],['sitting pose, elegant','Siedzaca'],['dynamic walking pose','Krocząca'],['looking over shoulder pose','Przez ramie'],['leaning against wall, casual','Oparta o sciane'],['lying down, editorial','Lezaca']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/>
              </div>
            </div>
            <div>
              <label className={labelClass}>{t.lang==='EN'?'Background':'Tlo'}</label>
              <div className="relative">
                <select value={bgSelect} onChange={e => setBgSelect(e.target.value)} className={inputClass}>
                  {[['professional studio, white background','Studio biale'],['dark studio, black background','Studio czarne'],['luxurious mansion interior, marble floors','Rezydencja'],['modern bedroom, elegant interior, soft lighting','Sypialnia'],['tropical beach, golden sand, ocean waves','Plaża'],['Venice canal at night, romantic lights','Wenecja'],['Paris street at night, Eiffel Tower','Paryż'],['Tokyo street, neon lights at night','Tokio neon'],['forest, natural light, bokeh','Las'],['modern city rooftop, skyline','Dach']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/>
              </div>
            </div>
            <div>
              <label className={labelClass}>{t.lang==='EN'?'Photo Style':'Styl'}</label>
              <div className="relative">
                <select value={photoStyle} onChange={e => setPhotoStyle(e.target.value)} className={inputClass}>
                  {[
                    ['hyperrealistic photography, DSLR, 8K resolution, sharp focus, real skin texture','Hyperrealistyczny (DSLR 8K)'],
                    ['photorealistic, professional photography','Fotorealistyczny'],
                    ['cinematic film still, movie quality, dramatic lighting','Kinowy (film still)'],
                    ['editorial fashion photography, Vogue style','Editorial / Vogue'],
                    ['digital fashion illustration, stylized, detailed artwork','Ilustracja cyfrowa'],
                    ['anime style, highly detailed, studio ghibli quality','Anime'],
                    ['3D render, octane render, hyperreal','Render 3D'],
                    ['oil painting, classical art, museum quality','Obraz olejny'],
                  ].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/>
              </div>
            </div>
          </div>
        </div>

        {/* Generuj */}
        <div className="flex flex-col items-center gap-3">
          {!isLoggedIn ? (
            <button onClick={onLoginRequest} className="px-10 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-sm rounded-2xl transition-all">
              {t.lang==='EN' ? 'Log in to generate' : 'Zaloguj sie aby generowac'}
            </button>
          ) : !canGenerate ? (
            <div className="text-center">
              <p className="text-slate-500 text-sm mb-3">{t.lang==='EN' ? 'No tokens left.' : 'Brak tokenow. Przejdz na plan Starter.'}</p>
              <a href={`https://buy.stripe.com/14A28qcGJ56fdfq5rQ8bS05?client_reference_id=${user?.uid || ''}&prefilled_email=${encodeURIComponent(user?.email || '')}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-block px-10 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-sm rounded-2xl transition-all shadow-lg shadow-amber-500/20">
                {t.lang==='EN' ? 'Get Starter — 30 PLN/mo' : 'Kup Starter — 30 PLN/mies'}
              </a>
            </div>
          ) : (
            <button onClick={generatePrompt} className={`px-10 py-4 font-black uppercase tracking-widest text-sm rounded-2xl transition-all shadow-lg ${copied ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'}`}>
              {copied ? (t.lang==='EN' ? 'Copied! Paste in your AI generator' : 'Skopiowano! Wklej do generatora AI') : (t.lang==='EN' ? 'Generate & Copy Prompt' : 'Generuj i Kopiuj Prompt')}
            </button>
          )}
          {isLoggedIn && !isPro && !isStarter && tokens !== null && (
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">
              {t.lang==='EN' ? `${tokens} free generations remaining` : `Pozostalo ${tokens} darmowych generacji`}
            </p>
          )}
        </div>

      </div>
    </div>
  );
};


// =========================================================================
// PRODUCT AD BUILDER VIEW — Kreator Reklam Produktowych
// =========================================================================
const ProductAdBuilderView = ({ t, user, onLoginRequest }) => {
  const isLoggedIn = user && !user.isAnonymous;
  const [copied, setCopied] = useState(false);
  const [tokens, setTokens] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [isStarter, setIsStarter] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState(false);

  useEffect(() => {
    if (isLoggedIn && user?.uid) {
      setLoadingTokens(true);
      getTokenData(db, user.uid).then(({ tokens, isPro, isStarter }) => {
        setTokens(tokens);
        setIsPro(isPro);
        setIsStarter(isStarter);
        setLoadingTokens(false);
      }).catch(() => setLoadingTokens(false));
    } else {
      setTokens(null); setIsPro(false); setIsStarter(false);
    }
  }, [user]);

  const canGenerate = isPro || isStarter || (tokens !== null && tokens > 0);

  // --- Stan kreatora ---
  const [productName, setProductName] = useState('');
  const [generator, setGenerator] = useState('kling');
  const [scene, setScene] = useState('levitation');
  const [effect, setEffect] = useState('water_splash');
  const [lighting, setLighting] = useState('golden_hour');
  const [camera, setCamera] = useState('orbit_360');
  const [background, setBackground] = useState('black_studio');
  const [mood, setMood] = useState('luxury');
  const [speed, setSpeed] = useState('slow_motion');

  const GENERATORS = [
    { value: 'kling', label: 'Kling AI' },
    { value: 'runway', label: 'Runway Gen-4' },
    { value: 'midjourney', label: 'Midjourney' },
    { value: 'veo', label: 'Veo 3' },
  ];

  const SCENES = [
    { value: 'levitation', label: t.lang==='EN'?'Levitation':'Lewitacja', desc: t.lang==='EN'?'Product floats and rotates in space':'Produkt unosi sie i obraca w przestrzeni' },
    { value: 'explosion', label: t.lang==='EN'?'Powder Explosion':'Eksplozja proszku', desc: t.lang==='EN'?'Colorful powder burst around product':'Kolorowy proch wybucha wokol produktu' },
    { value: 'assembly', label: t.lang==='EN'?'Mid-air Assembly':'Skladanie w powietrzu', desc: t.lang==='EN'?'Product assembles from parts flying in':'Produkt sklada sie z czesci lecacych z roznych stron' },
    { value: 'splash', label: t.lang==='EN'?'Water Splash':'Plusk wody', desc: t.lang==='EN'?'Product emerges from or lands in water':'Produkt wyłania sie z wody lub wpada do niej' },
    { value: 'reveal', label: t.lang==='EN'?'Cinematic Reveal':'Odkrycie kinowe', desc: t.lang==='EN'?'Dramatic slow reveal from darkness':'Dramatyczne, wolne odkrycie z ciemnosci' },
    { value: 'ugc', label: 'UGC Style', desc: t.lang==='EN'?'Natural handheld authentic look':'Naturalne, recznie trzymana kamera, autentyczny klimat' },
  ];

  const EFFECTS = [
    { value: 'water_splash', label: t.lang==='EN'?'Water Splash':'Plusk wody' },
    { value: 'ice_crystals', label: t.lang==='EN'?'Ice & Crystals':'Lod i krysztaly' },
    { value: 'gold_glitter', label: t.lang==='EN'?'Gold Glitter':'Zloty brokat' },
    { value: 'mist_steam', label: t.lang==='EN'?'Mist & Steam':'Mgla i para' },
    { value: 'powder_burst', label: t.lang==='EN'?'Powder Burst':'Eksplozja proszku' },
    { value: 'fire_sparks', label: t.lang==='EN'?'Fire & Sparks':'Ogien i iskry' },
    { value: 'petals', label: t.lang==='EN'?'Flower Petals':'Platki kwiatow' },
    { value: 'none', label: t.lang==='EN'?'None':'Brak efektu' },
  ];

  const LIGHTINGS = [
    { value: 'golden_hour', label: 'Golden Hour' },
    { value: 'dramatic_studio', label: t.lang==='EN'?'Dramatic Studio':'Studyjne dramatyczne' },
    { value: 'soft_natural', label: t.lang==='EN'?'Soft Natural':'Miekkie naturalne' },
    { value: 'neon_cyberpunk', label: 'Neon / Cyberpunk' },
    { value: 'cold_blue', label: t.lang==='EN'?'Cold Blue Ice':'Zimne niebieskie' },
    { value: 'candle_warm', label: t.lang==='EN'?'Warm Candles':'Cieplo swiec' },
  ];

  const CAMERAS = [
    { value: 'orbit_360', label: t.lang==='EN'?'Orbit 360°':'Orbit 360°' },
    { value: 'slow_zoom', label: t.lang==='EN'?'Slow Zoom In':'Wolny zoom' },
    { value: 'top_down', label: t.lang==='EN'?'Top Down':'Z gory' },
    { value: 'tracking', label: t.lang==='EN'?'Tracking Shot':'Tracking' },
    { value: 'static', label: t.lang==='EN'?'Static':'Statyczna' },
    { value: 'handheld', label: t.lang==='EN'?'Handheld':'Z reki (UGC)' },
  ];

  const BACKGROUNDS = [
    { value: 'black_studio', label: t.lang==='EN'?'Black Studio':'Czarne studio' },
    { value: 'white_studio', label: t.lang==='EN'?'White Studio':'Biale studio' },
    { value: 'marble_luxury', label: t.lang==='EN'?'Marble Luxury':'Marmur i luksus' },
    { value: 'ocean_sunset', label: t.lang==='EN'?'Ocean Sunset':'Ocean o zachodzie' },
    { value: 'snow_mountains', label: t.lang==='EN'?'Snow & Mountains':'Snieg i gory' },
    { value: 'night_city_neon', label: t.lang==='EN'?'Night City Neon':'Nocne miasto neon' },
    { value: 'forest_bokeh', label: t.lang==='EN'?'Forest Bokeh':'Las z bokeh' },
    { value: 'deep_space', label: t.lang==='EN'?'Deep Space':'Kosmos' },
  ];

  const MOODS = [
    { value: 'luxury', label: t.lang==='EN'?'Luxury Premium':'Luksus i premium' },
    { value: 'fresh_natural', label: t.lang==='EN'?'Fresh Natural':'Swiezos i natura' },
    { value: 'energetic', label: t.lang==='EN'?'Energetic':'Energetyczny' },
    { value: 'romantic', label: t.lang==='EN'?'Romantic':'Romantyczny' },
    { value: 'minimal_clean', label: t.lang==='EN'?'Minimal Clean':'Minimalizm' },
    { value: 'dark_noir', label: 'Dark Noir' },
  ];

  const SPEEDS = [
    { value: 'slow_motion', label: t.lang==='EN'?'Ultra Slow Motion':'Ultra slow motion' },
    { value: 'normal', label: t.lang==='EN'?'Normal':'Normalnie' },
    { value: 'speed_ramp', label: 'Speed Ramp (slow → fast)' },
    { value: 'dynamic', label: t.lang==='EN'?'Dynamic Fast':'Dynamicznie' },
  ];

  const SCENE_PROMPTS = {
    levitation: 'product levitating and slowly rotating in mid-air, elegant floating motion',
    explosion: 'product surrounded by an explosion of colorful powder in dramatic slow motion, particles swirling',
    assembly: 'product assembles in mid-air from its components flying in from different directions, dramatic slow motion',
    splash: 'product dramatically splashing out of water, ultra slow motion water droplets frozen in air',
    reveal: 'cinematic slow reveal of product emerging from complete darkness, dramatic spotlight',
    ugc: 'authentic UGC-style handheld shot of product, natural lighting, relatable and real',
  };

  const EFFECT_PROMPTS = {
    water_splash: 'water droplets and splashes in ultra slow motion surrounding the product',
    ice_crystals: 'ice crystals and frost forming around the product, cold frozen atmosphere',
    gold_glitter: 'golden glitter particles and gold dust floating and swirling around the product',
    mist_steam: 'elegant mist and steam rising gracefully around the product',
    powder_burst: 'colorful powder explosion burst in slow motion around the product',
    fire_sparks: 'fire and sparks surrounding the product, dramatic fiery atmosphere',
    petals: 'delicate flower petals falling and floating around the product',
    none: '',
  };

  const LIGHTING_PROMPTS = {
    golden_hour: 'golden hour warm cinematic lighting, soft sunset glow',
    dramatic_studio: 'dramatic hard studio lighting, sharp shadows, high contrast',
    soft_natural: 'soft diffused natural light, gentle and flattering',
    neon_cyberpunk: 'neon cyberpunk lighting, vivid colors, night city reflections',
    cold_blue: 'cold blue icy lighting, winter atmosphere, sharp and clean',
    candle_warm: 'warm candle light, intimate and cozy golden tones',
  };

  const CAMERA_PROMPTS = {
    orbit_360: 'camera slowly orbiting 360 degrees around the product, sweeping orbital shot',
    slow_zoom: 'slow cinematic push-in zoom toward the product, building anticipation',
    top_down: 'overhead top-down shot, elegant bird\'s eye view of the product',
    tracking: 'smooth tracking shot following the product\'s motion',
    static: 'static locked-off shot, all movement in the product and effects',
    handheld: 'handheld camera with subtle natural movement, authentic feel',
  };

  const BG_PROMPTS = {
    black_studio: 'pure black studio background, infinite darkness',
    white_studio: 'clean minimal white studio background, seamless',
    marble_luxury: 'luxurious marble floor and background, high-end interior',
    ocean_sunset: 'calm ocean at golden hour sunset, warm horizon glow',
    snow_mountains: 'snowy mountain landscape, winter scenery, cold crisp air',
    night_city_neon: 'rain-soaked city street at night, neon reflections, cyberpunk atmosphere',
    forest_bokeh: 'lush green forest with beautiful bokeh, natural depth',
    deep_space: 'deep outer space, stars and nebula, infinite cosmos',
  };

  const MOOD_PROMPTS = {
    luxury: 'luxurious, premium, aspirational, high-end fashion photography aesthetic',
    fresh_natural: 'fresh, natural, organic, clean and pure aesthetic',
    energetic: 'energetic, dynamic, powerful, athletic and bold',
    romantic: 'romantic, sensual, soft and dreamy aesthetic',
    minimal_clean: 'minimalist, clean, modern and understated',
    dark_noir: 'dark noir, mysterious, moody and dramatic',
  };

  const SPEED_PROMPTS = {
    slow_motion: 'ultra slow motion, every detail captured in breathtaking slowness',
    normal: 'smooth natural motion, fluid and elegant',
    speed_ramp: 'speed ramp effect, starts ultra slow then accelerates to full speed',
    dynamic: 'fast dynamic motion, energetic and powerful',
  };

  const GENERATOR_PREFIX = {
    kling: '',
    runway: 'Cinematic product advertisement video. ',
    midjourney: '/imagine prompt: ',
    veo: '',
  };

  const GENERATOR_SUFFIX = {
    kling: ', 4K ultra HD, photorealistic, professional product commercial',
    runway: ', photorealistic, 4K, commercial grade, masterpiece',
    midjourney: ' --ar 9:16 --style raw --v 6.1',
    veo: ', photorealistic 4K video, professional product advertisement, cinematic quality',
  };

  const PRODUCT_BLACKLIST = [
    'dildo','dild0','dlido','dlldo','vibrator','vibrat0r','sex toy','masturbator',
    'fleshlight','butt plug','anal','penis','p3nis','vagina','vag1na',
    'gun','pistol','rifle','weapon','bomb','explosiv','grenade',
    'cocaine','heroin','meth','drug','weed','marijuana','cannabis',
    'porn','p0rn','adult toy','erotic','nude','naked',
  ];

  // Levenshtein distance - blokuj tez literowki
  const levenshtein = (a, b) => {
    const m = a.length, n = b.length;
    const dp = Array.from({length: m+1}, (_, i) => Array.from({length: n+1}, (_, j) => i===0?j:j===0?i:0));
    for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
      dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1] : 1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
    return dp[m][n];
  };

  const isProductBlocked = (name) => {
    const lower = name.toLowerCase().trim();
    // Sprawdz dokladne dopasowanie
    if (PRODUCT_BLACKLIST.some(w => lower.includes(w))) return true;
    // Sprawdz podobne slowa (max 1 literowka dla slow 5+ znakow)
    const words = lower.split(/\s+/);
    return words.some(word =>
      word.length >= 4 && PRODUCT_BLACKLIST.some(blocked =>
        blocked.length >= 4 && levenshtein(word, blocked) <= 1
      )
    );
  };

  const generatePrompt = () => {
    if (!productName.trim()) return t.lang==='EN' ? 'Enter your product name above.' : 'Wpisz nazwe produktu powyzej.';
    if (isProductBlocked(productName)) return '⛔ Ten produkt nie jest dozwolony w kreatorze reklam.';

    const parts = [
      SCENE_PROMPTS[scene],
      `The product is: ${productName.trim()}`,
      EFFECT_PROMPTS[effect],
      LIGHTING_PROMPTS[lighting],
      CAMERA_PROMPTS[camera],
      BG_PROMPTS[background],
      MOOD_PROMPTS[mood],
      SPEED_PROMPTS[speed],
    ].filter(Boolean);

    return GENERATOR_PREFIX[generator] + parts.join(', ') + GENERATOR_SUFFIX[generator];
  };

  const prompt = generatePrompt();

  const handleCopy = async () => {
    if (!productName.trim() || isProductBlocked(productName) || !canGenerate) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const labelClass = 'block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5';
  const inputClass = 'w-full bg-slate-100 dark:bg-[#111] border border-black/10 dark:border-[#222] rounded-xl px-3 py-2.5 text-sm text-black dark:text-white focus:outline-none focus:border-amber-500 transition-colors appearance-none pr-8';
  const sectionClass = 'bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-[#1a1a1a] rounded-2xl p-5 mb-4';
  const headerClass = 'text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500 mb-4 flex items-center gap-2';

  return (
    <div className="min-h-screen bg-white dark:bg-black font-sans pb-16">
      <div className="max-w-5xl mx-auto px-4 pt-8">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-4">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"/>
            {t.lang==='EN' ? 'AI Product Ad Generator' : 'Generator Reklam Produktowych AI'}
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-black dark:text-white uppercase tracking-tighter mb-2">
            {t.lang==='EN' ? 'Product Ad' : 'Kreator Reklam'}<span className="text-amber-500">.</span>
          </h1>
          <p className="text-slate-500 text-sm">
            {t.lang==='EN'
              ? 'Describe your product, choose effects — get a cinematic prompt for Kling, Runway, or Midjourney.'
              : 'Opisz swoj produkt, wybierz efekty — dostaniesz gotowy prompt do Kling, Runway lub Midjourney.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* LEFT — Controls */}
          <div className="lg:col-span-2 space-y-4">

            {/* Produkt + Generator */}
            <div className={sectionClass}>
              <p className={headerClass}>&#127775; {t.lang==='EN' ? '1. Your Product' : '1. Twoj Produkt'}</p>
              <div className="mb-4">
                <label className={labelClass}>{t.lang==='EN' ? 'Product name / description' : 'Nazwa lub opis produktu'}</label>
                <input
                  type="text"
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  placeholder={t.lang==='EN' ? 'e.g. black leather stiletto heels, model X2' : 'np. czarne szpilki skorzane model X2, perfumy Noir...'}
                  className="w-full bg-slate-100 dark:bg-[#111] border border-black/10 dark:border-[#222] rounded-xl px-4 py-3 text-sm text-black dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div>
                <label className={labelClass}>{t.lang==='EN' ? 'Target AI Generator' : 'Generator AI'}</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {GENERATORS.map(g => (
                    <button key={g.value} onClick={() => setGenerator(g.value)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${generator === g.value ? 'bg-amber-500 border-amber-500 text-black' : 'bg-slate-200 dark:bg-[#111] border-black/10 dark:border-[#222] text-slate-600 dark:text-slate-400 hover:border-amber-500/50'}`}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Scena */}
            <div className={sectionClass}>
              <p className={headerClass}>&#127916; {t.lang==='EN' ? '2. Scene Type' : '2. Typ sceny'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SCENES.map(s => (
                  <button key={s.value} onClick={() => setScene(s.value)}
                    className={`text-left p-3 rounded-xl border transition-all ${scene === s.value ? 'bg-amber-500/10 border-amber-500 text-white' : 'bg-slate-100 dark:bg-[#111] border-black/10 dark:border-[#222] text-slate-600 dark:text-slate-400 hover:border-amber-500/30'}`}>
                    <div className="text-xs font-bold uppercase tracking-wider mb-0.5">{s.label}</div>
                    <div className="text-[10px] text-slate-500">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Efekty + Oswietlenie */}
            <div className={sectionClass}>
              <p className={headerClass}>&#10024; {t.lang==='EN' ? '3. Effects & Lighting' : '3. Efekty i oswietlenie'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t.lang==='EN' ? 'Special Effect' : 'Efekt specjalny'}</label>
                  <div className="relative">
                    <select value={effect} onChange={e => setEffect(e.target.value)} className={inputClass}>
                      {EFFECTS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>{t.lang==='EN' ? 'Lighting' : 'Oswietlenie'}</label>
                  <div className="relative">
                    <select value={lighting} onChange={e => setLighting(e.target.value)} className={inputClass}>
                      {LIGHTINGS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/>
                  </div>
                </div>
              </div>
            </div>

            {/* Kamera + Tlo + Nastoj + Speed */}
            <div className={sectionClass}>
              <p className={headerClass}>&#127909; {t.lang==='EN' ? '4. Camera, Background & Mood' : '4. Kamera, tlo i nastoj'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t.lang==='EN' ? 'Camera Movement' : 'Ruch kamery'}</label>
                  <div className="relative">
                    <select value={camera} onChange={e => setCamera(e.target.value)} className={inputClass}>
                      {CAMERAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>{t.lang==='EN' ? 'Background' : 'Tlo'}</label>
                  <div className="relative">
                    <select value={background} onChange={e => setBackground(e.target.value)} className={inputClass}>
                      {BACKGROUNDS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>{t.lang==='EN' ? 'Mood' : 'Nastoj'}</label>
                  <div className="relative">
                    <select value={mood} onChange={e => setMood(e.target.value)} className={inputClass}>
                      {MOODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>{t.lang==='EN' ? 'Speed' : 'Predkosc'}</label>
                  <div className="relative">
                    <select value={speed} onChange={e => setSpeed(e.target.value)} className={inputClass}>
                      {SPEEDS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — Prompt output */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <div className="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-[#1a1a1a] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500">
                    {t.lang==='EN' ? 'Your Prompt' : 'Twoj Prompt'}
                  </span>
                  <span className="text-[10px] text-slate-600 uppercase font-bold">{GENERATORS.find(g=>g.value===generator)?.label}</span>
                </div>

                <div className={`bg-slate-50 dark:bg-black rounded-xl p-4 mb-4 min-h-[200px] border relative overflow-hidden ${isProductBlocked(productName) ? 'border-red-800' : 'border-[#222]'}`}>
                  {!canGenerate && isLoggedIn ? (
                    <>
                      <p className="text-xs leading-relaxed text-slate-600 select-none pointer-events-none" style={{filter:'blur(4px)'}}>
                        {'Cinematic product advertisement. The product emerges from darkness surrounded by particle effects and dramatic lighting. Camera slowly orbits 360 degrees. Golden hour warm tones. Ultra slow motion capture. Professional commercial grade quality. 4K resolution masterpiece.'}
                      </p>
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl">
                        <span className="text-2xl mb-2">🔒</span>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-center px-4">
                          {t.lang==='EN' ? 'Unlock to see your prompt' : 'Odblokuj aby zobaczyc prompt'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className={`text-xs leading-relaxed ${isProductBlocked(productName) ? 'text-red-400' : productName.trim() ? 'text-slate-300' : 'text-slate-600 italic'}`}>
                      {canGenerate ? prompt : ''}
                    </p>
                  )}
                </div>

                {!isLoggedIn ? (
                  <button onClick={onLoginRequest}
                    className="w-full py-3 rounded-xl bg-amber-500 text-black font-black text-sm uppercase tracking-wider hover:bg-amber-400 transition-colors">
                    {t.lang==='EN' ? 'Log in to copy' : 'Zaloguj sie aby skopiowac'}
                  </button>
                ) : !canGenerate ? (
                  <div className="text-center py-2">
                    <p className="text-xs text-slate-500 mb-3">{t.lang==='EN' ? 'No tokens left.' : 'Brak tokenow. Przejdz na plan Starter.'}</p>
                    <a href={`https://buy.stripe.com/14A28qcGJ56fdfq5rQ8bS05?client_reference_id=${user?.uid || ''}&prefilled_email=${encodeURIComponent(user?.email || '')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="block w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-wider text-center transition-colors">
                      {t.lang==='EN' ? 'Get Starter — 30 PLN/mo' : 'Kup Starter — 30 PLN/mies'}
                    </a>
                  </div>
                ) : (
                  <button onClick={handleCopy}
                    className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${copied ? 'bg-green-500 text-white' : 'bg-amber-500 hover:bg-amber-400 text-black'}`}>
                    {copied ? (t.lang==='EN' ? 'Copied!' : 'Skopiowano!') : (t.lang==='EN' ? 'Copy Prompt' : 'Kopiuj Prompt')}
                  </button>
                )}

                {isLoggedIn && !isPro && !isStarter && tokens !== null && (
                  <p className="text-center text-[10px] text-slate-600 mt-2">
                    {t.lang==='EN' ? `${tokens} free copies left` : `Pozostalo ${tokens} darmowych kopii`}
                  </p>
                )}

                {/* Hint */}
                <div className="mt-4 p-3 bg-slate-100 dark:bg-[#111] rounded-xl border border-black/10 dark:border-[#1a1a1a]">
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    {t.lang==='EN'
                      ? 'Tip: Upload your product photo to Kling or Runway, then paste this prompt as the motion/style description.'
                      : 'Tip: Wgraj zdjecie swojego produktu do Kling lub Runway, a nastepnie wklej ten prompt jako opis ruchu i stylu.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};


// =========================================================================
// LIFESTYLE BUILDER VIEW — Kreator Lifestyle AI
// =========================================================================
const LifestyleBuilderView = ({ t, user, onLoginRequest }) => {
  const [copied, setCopied] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [isStarter, setIsStarter] = useState(false);
  const [tokens, setTokens] = useState(null);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const isLoggedIn = !!user;
  useEffect(() => {
    if (user?.uid) {
      getTokenData(db, user.uid).then(({ tokens, isPro, isStarter }) => {
        setTokens(tokens); setIsPro(isPro); setIsStarter(isStarter); setLoadingTokens(false);
      });
    }
  }, [user]);
  const canGenerate = isPro || isStarter || (tokens !== null && tokens > 0);
















  const [weekMode, setWeekMode] = useState(false);
  const [facePrompt, setFacePrompt] = useState('');
  const [place, setPlace]       = useState('luxury yacht');
  const [country, setCountry]   = useState('Monaco');
  const [time, setTime]         = useState('golden sunset');
  const [weather, setWeather]   = useState('clear sky');
  const [camera, setCamera]     = useState('cinematic wide shot');

  // Postac 1
  const [gender1, setGender1]   = useState('male');
  const [activity1, setActivity1] = useState('standing confidently');
  const [outfit1, setOutfit1]   = useState('luxury suit');
  const [mood1, setMood1]       = useState('luxury calm');
  const [status1, setStatus1]   = useState('young millionaire');

  // Postac 2 (para)
  const [pairMode, setPairMode] = useState(false);
  const [gender2, setGender2]   = useState('female');
  const [activity2, setActivity2] = useState('relaxing in sun');
  const [outfit2, setOutfit2]   = useState('minimal triangle bikini, beach fashion');
  const [mood2, setMood2]       = useState('romantic atmosphere');
  const [status2, setStatus2]   = useState('Hollywood A-list celebrity');

  const sectionClass = 'bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-[#1a1a1a] rounded-2xl p-5 mb-4';
  const headerClass  = 'text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500 mb-4 flex items-center gap-2';
  const labelClass   = 'block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5';
  const inputClass   = 'w-full bg-slate-100 dark:bg-[#111] border border-black/10 dark:border-[#222] rounded-xl px-3 py-2.5 text-sm text-black dark:text-white focus:outline-none focus:border-amber-500 transition-colors appearance-none pr-8';

  const Sel = ({ label, value, set, opts }) => (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <select value={value} onChange={e => set(e.target.value)} className={inputClass}>
          {opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/>
      </div>
    </div>
  );

  const OPTS_MALE = {
    activity: [
      ['standing confidently', t.lang==='EN'?'Standing confidently':'Stoi pewnie'],
      ['drinking whiskey', t.lang==='EN'?'Drinking whiskey':'Pije whiskey'],
      ['working on laptop', t.lang==='EN'?'Working on laptop':'Pracuje na laptopie'],
      ['walking slowly', t.lang==='EN'?'Walking':'Idzie powoli'],
      ['steering yacht', t.lang==='EN'?'Steering yacht':'Steruje jachtem'],
      ['making a phone call', t.lang==='EN'?'On the phone':'Rozmawia przez telefon'],
      ['watching the horizon', t.lang==='EN'?'Watching horizon':'Patrzy w horyzont'],
      ['celebrating with champagne', t.lang==='EN'?'Celebrating':'Świętuje szampanem'],
      ['sitting relaxed', t.lang==='EN'?'Relaxing':'Siedzi zrelaksowany'],
    ],
    outfit: [
      ['luxury suit', t.lang==='EN'?'Luxury suit':'Luksusowy garnitur'],
      ['white linen shirt, open collar', t.lang==='EN'?'Linen shirt':'Lniana koszula'],
      ['summer casual outfit', t.lang==='EN'?'Summer casual':'Letni casual'],
      ['elegant all-black outfit', t.lang==='EN'?'All black':'Elegancki czarny'],
      ['designer streetwear', t.lang==='EN'?'Streetwear':'Streetwear premium'],
      ['black tuxedo', t.lang==='EN'?'Tuxedo':'Smoking'],
      ['business casual outfit', t.lang==='EN'?'Business casual':'Biznesowy casual'],
      ['swim shorts, beach style', t.lang==='EN'?'Beach shorts':'Szorty plażowe'],
    ],
  };
  const OPTS_FEMALE = {
    activity: [
      ['relaxing in sun', t.lang==='EN'?'Relaxing in sun':'Relaksuje się'],
      ['standing confidently', t.lang==='EN'?'Standing confidently':'Stoi pewnie'],
      ['walking slowly', t.lang==='EN'?'Walking':'Idzie powoli'],
      ['celebrating with champagne', t.lang==='EN'?'Celebrating':'Świętuje szampanem'],
      ['watching the horizon', t.lang==='EN'?'Watching horizon':'Patrzy w horyzont'],
      ['lying on deck, sunbathing', t.lang==='EN'?'Sunbathing':'Opala się na pokładzie'],
      ['dancing elegantly', t.lang==='EN'?'Dancing':'Tańczy elegancko'],
      ['drinking cocktail', t.lang==='EN'?'Drinking cocktail':'Pije koktajl'],
      ['posing for camera', t.lang==='EN'?'Posing':'Pozuje do zdjęcia'],
    ],
    outfit: [
      ['minimal triangle bikini, beach fashion', t.lang==='EN'?'Bikini':'Skąpe bikini'],
      ['metallic shiny mini dress, elegant fashion', t.lang==='EN'?'Shiny mini':'Błyszcząca mini'],
      ['luxury designer suit', t.lang==='EN'?'Luxury suit':'Luksusowy garnitur'],
      ['elegant black evening dress', t.lang==='EN'?'Black evening dress':'Czarna wieczorowa'],
      ['summer white linen dress', t.lang==='EN'?'White linen dress':'Biała lniana sukienka'],
      ['one piece swimsuit, elegant', t.lang==='EN'?'Swimsuit':'Kostium kąpielowy'],
      ['chic casual summer outfit', t.lang==='EN'?'Summer chic':'Letni chic'],
      ['business casual elegant', t.lang==='EN'?'Business casual':'Biznesowy elegancki'],
    ],
  };
  const STATUS_OPTS_M = [
    ['young millionaire', t.lang==='EN'?'Young Millionaire':'Młody milioner'],
    ['Hollywood A-list celebrity', t.lang==='EN'?'Hollywood Celebrity':'Gwiazdor Hollywood'],
    ['global influencer', t.lang==='EN'?'Global Influencer':'Globalny influencer'],
    ['music superstar on tour', t.lang==='EN'?'Music Superstar':'Supergwiazda muzyki'],
    ['retired champion athlete', t.lang==='EN'?'Champion Athlete':'Mistrz sportu'],
    ['mafia boss', t.lang==='EN'?'Mafia Boss':'Szef mafii'],
    ['tech entrepreneur', t.lang==='EN'?'Tech Entrepreneur':'Szef korpo'],
    ['travel icon', t.lang==='EN'?'Travel Icon':'Ikona podróży'],
    ['CEO in vacation mode', t.lang==='EN'?'CEO on Vacation':'Szef na urlopie'],
    ['mysterious stranger', t.lang==='EN'?'Mysterious Stranger':'Tajemniczy nieznajomy'],
  ];
  const STATUS_OPTS_F = [
    ['young millionaire', t.lang==='EN'?'Young Millionaire':'Młoda milionerka'],
    ['Hollywood A-list celebrity', t.lang==='EN'?'Hollywood Celebrity':'Gwiazda Hollywood'],
    ['global influencer', t.lang==='EN'?'Global Influencer':'Globalna influencerka'],
    ['music superstar on tour', t.lang==='EN'?'Music Superstar':'Supergwiazda muzyki'],
    ['retired champion athlete', t.lang==='EN'?'Champion Athlete':'Mistrzyni sportu'],
    ['mafia boss', t.lang==='EN'?'Mafia Boss':'Szefowa mafii'],
    ['tech entrepreneur', t.lang==='EN'?'Tech Entrepreneur':'Szefowa korpo'],
    ['travel icon', t.lang==='EN'?'Travel Icon':'Ikona podróży'],
    ['CEO in vacation mode', t.lang==='EN'?'CEO on Vacation':'Szefowa na urlopie'],
    ['mysterious stranger', t.lang==='EN'?'Mysterious Stranger':'Tajemnicza nieznajoma'],
  ];
  const MOOD_OPTS = [
    ['luxury calm', t.lang==='EN'?'Luxury Calm':'Luksusowy spokój'],
    ['dominant power', t.lang==='EN'?'Dominant Power':'Dominująca siła'],
    ['freedom', t.lang==='EN'?'Freedom':'Wolność'],
    ['mysterious vibe', t.lang==='EN'?'Mysterious Vibe':'Tajemnicza aura'],
    ['romantic atmosphere', t.lang==='EN'?'Romantic':'Romantyczna atmosfera'],
    ['winner energy', t.lang==='EN'?'Winner Energy':'Energia zwycięzcy'],
    ['untouchable confidence', t.lang==='EN'?'Confidence':'Niezachwiana pewność'],
    ['melancholic sophistication', t.lang==='EN'?'Melancholic':'Melancholijna elegancja'],
  ];

  const buildChar = (gender, status, activity, outfit, mood) => {
    const g = gender === 'male' ? 'man' : 'woman';
    return `${status} ${g}, ${activity}, wearing ${outfit}, ${mood} mood`;
  };

  const buildPrompt = () => {
    const face = facePrompt.trim();
    const char1 = buildChar(gender1, status1, activity1, outfit1, mood1);
    const char2 = pairMode ? buildChar(gender2, status2, activity2, outfit2, mood2) : null;
    const scene = pairMode
      ? `${char1} and ${char2}`
      : char1;
    const base = `Ultra realistic cinematic scene, ${scene}, on a ${place} at ${country}. Time: ${time}, weather: ${weather}. Luxury lifestyle photography, depth of field, sharp focus, 4K, dramatic lighting. Camera: ${camera}. editorial style, tasteful, professional model shoot.`;
    return face ? `${face}, ${base}` : base;
  };

  const buildWeek = () => {
    const char1 = buildChar(gender1, status1, activity1, outfit1, mood1);
    const char2 = pairMode ? buildChar(gender2, status2, activity2, outfit2, mood2) : null;
    const who = pairMode ? `${char1} and ${char2}` : char1;
    return [
      `Day 1: ${who} arriving in ${country} by helicopter, ${place}, ${time}.`,
      `Day 2: Morning coffee on ${place} deck, ${weather}, ${mood1} mood.`,
      `Day 3: Adventure near cliffs, ${camera}.`,
      `Day 4: Luxury night party with city lights.`,
      `Day 5: Solo sunset reflection, ${outfit1}.`,
      `Day 6: Business call on laptop with ocean view.`,
      `Day 7: Elegant walk leaving ${place}, ${country}.`,
    ].join('\n');
  };

  const generatePrompt = async () => {
    if (!isLoggedIn) { onLoginRequest(); return; }
    if (!canGenerate) return;
    const ok = await useToken(db, user.uid);
    if (!ok) return;
    const text = weekMode ? buildWeek() : buildPrompt();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black font-sans pb-16">
      <div className="max-w-6xl mx-auto px-4 pt-8">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-4">
            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"/>
            {t.lang==='EN' ? 'Lifestyle AI Generator' : 'Generator Lifestyle AI'}
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-black dark:text-white uppercase tracking-tighter mb-2">
            {t.lang==='EN' ? 'Lifestyle Builder' : 'Kreator Lifestyle'}<span className="text-amber-500">.</span>
          </h1>
          <p className="text-slate-500 text-sm mb-4">
            {t.lang==='EN' ? 'Luxury lifestyle prompts — single shot or full week plan.' : 'Prompty lifestyle — pojedyncze zdjęcie lub plan na cały tydzień.'}
          </p>

          {/* Tryb */}
          <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-[#0a0a0a] border border-black/10 dark:border-[#222] rounded-2xl p-1">
            {[false, true].map(w => (
              <button key={String(w)} onClick={() => setWeekMode(w)}
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${weekMode === w ? 'bg-amber-500 text-black' : 'text-slate-500 hover:text-black dark:hover:text-white'}`}>
                {w ? (t.lang==='EN' ? '📅 Week Plan' : '📅 Plan Tygodnia') : (t.lang==='EN' ? '📸 Single Shot' : '📸 Pojedynczy')}
              </button>
            ))}
          </div>
        </div>

        {/* Sekcje opcji */}
        <div className="max-w-3xl mx-auto">
          <div className={sectionClass}>
            <p className={headerClass}><span className="text-base">👤</span> {t.lang==='EN' ? 'Face / Character (optional)' : 'Twarz / Postać (opcjonalnie)'}</p>
            <textarea
              value={facePrompt}
              onChange={e => setFacePrompt(e.target.value)}
              placeholder={t.lang==='EN' ? 'Paste your avatar face prompt here (from Avatar Builder)...' : 'Wklej tutaj prompt twarzy z Kreatora Awatarów...'}
              rows={3}
              className="w-full bg-slate-100 dark:bg-[#111] border border-black/10 dark:border-[#222] rounded-xl px-3 py-2.5 text-sm text-black dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors resize-none font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1.5">💡 {t.lang==='EN' ? 'Leave empty to generate without face — or paste from Avatar Builder for a complete scene' : 'Zostaw puste jeśli chcesz bez twarzy — lub wklej z Kreatora Awatarów dla pełnej sceny'}</p>
          </div>
          <div className={sectionClass}>
            <p className={headerClass}><span className="text-base">🌍</span> {t.lang==='EN' ? 'Location & Time' : 'Lokalizacja i Czas'}</p>
            <div className="grid grid-cols-2 gap-3">
              <Sel label={t.lang==='EN'?'Place':'Miejsce'} value={place} set={setPlace} opts={[
                ['luxury yacht','Luxury Yacht'],['private jet','Private Jet'],['penthouse','Penthouse'],
                ['beach villa','Beach Villa'],['mountain resort','Mountain Resort'],['night city rooftop','City Rooftop'],
                ['exclusive restaurant','Restauracja'],['private island','Prywatna wyspa'],['Formula 1 paddock','F1 Paddock'],
              ]}/>
              <Sel label={t.lang==='EN'?'Country':'Kraj'} value={country} set={setCountry} opts={[
                ['Monaco','Monaco'],['Italian coast','Włochy'],['Dubai','Dubai'],['Bali','Bali'],
                ['Maldives','Malediwy'],['Swiss Alps','Alpy'],['Saint-Tropez','Saint-Tropez'],
                ['Santorini Greece','Santoryn'],['Tokyo Japan','Tokio'],['Paris France','Paryż'],
              ]}/>
              <Sel label={t.lang==='EN'?'Time of Day':'Pora Dnia'} value={time} set={setTime} opts={[
                ['sunrise','Wschód słońca'],['morning','Poranek'],['golden sunset','Złoty zachód'],
                ['blue hour','Blue hour'],['night','Noc'],['magic hour','Magic hour'],
              ]}/>
              <Sel label={t.lang==='EN'?'Weather':'Pogoda'} value={weather} set={setWeather} opts={[
                ['clear sky','Bezchmurne niebo'],['light wind','Lekki wiatr'],['dramatic clouds','Dramatyczne chmury'],
                ['tropical humidity','Tropikalna wilgoć'],['soft fog','Delikatna mgła'],['golden haze','Złota poświata'],
              ]}/>
            </div>
          </div>

          <div className={sectionClass}>
            <div className="flex items-center justify-between mb-4">
              <p className={headerClass} style={{marginBottom:0}}><span className="text-base">🎭</span> {t.lang==='EN' ? 'Character & Style' : 'Postać i Styl'}</p>
              {/* Para toggle */}
              <button onClick={() => setPairMode(p => !p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${pairMode ? 'bg-amber-500 border-amber-500 text-black' : 'border-black/10 dark:border-[#333] text-slate-500 hover:border-amber-500/50'}`}>
                {pairMode ? '👫 Para' : '👤 1 osoba'}
              </button>
            </div>

            {/* POSTAC 1 */}
            <div className="mb-4">
              {pairMode && <p className="text-[9px] font-black uppercase tracking-widest text-amber-500 mb-2">Osoba 1</p>}
              {/* Plec 1 */}
              <div className="flex gap-2 mb-3">
                {[['male','👨 Mężczyzna'],['female','👩 Kobieta']].map(([v,l]) => (
                  <button key={v} onClick={() => { setGender1(v); setOutfit1(v==='male' ? 'luxury suit' : 'minimal triangle bikini, beach fashion'); setActivity1(v==='male' ? 'standing confidently' : 'relaxing in sun'); }}
                    className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${gender1===v ? 'bg-amber-500 border-amber-500 text-black' : 'border-black/10 dark:border-[#333] text-slate-500 hover:border-amber-500/50'}`}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Sel label="Status" value={status1} set={setStatus1} opts={gender1==='male' ? STATUS_OPTS_M : STATUS_OPTS_F}/>
                <Sel label={t.lang==='EN'?'Activity':'Aktywność'} value={activity1} set={setActivity1} opts={gender1==='male' ? OPTS_MALE.activity : OPTS_FEMALE.activity}/>
                <Sel label={t.lang==='EN'?'Outfit':'Strój'} value={outfit1} set={setOutfit1} opts={gender1==='male' ? OPTS_MALE.outfit : OPTS_FEMALE.outfit}/>
                <Sel label={t.lang==='EN'?'Mood':'Nastrój'} value={mood1} set={setMood1} opts={MOOD_OPTS}/>
              </div>
            </div>

            {/* POSTAC 2 — tylko w trybie para */}
            {pairMode && (
              <div className="border-t border-black/5 dark:border-white/5 pt-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-cyan-500 mb-2">Osoba 2</p>
                {/* Plec 2 */}
                <div className="flex gap-2 mb-3">
                  {[['male','👨 Mężczyzna'],['female','👩 Kobieta']].map(([v,l]) => (
                    <button key={v} onClick={() => { setGender2(v); setOutfit2(v==='male' ? 'luxury suit' : 'minimal triangle bikini, beach fashion'); setActivity2(v==='male' ? 'standing confidently' : 'relaxing in sun'); }}
                      className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${gender2===v ? 'bg-cyan-500 border-cyan-500 text-black' : 'border-black/10 dark:border-[#333] text-slate-500 hover:border-cyan-500/50'}`}>
                      {l}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Sel label="Status" value={status2} set={setStatus2} opts={gender2==='male' ? STATUS_OPTS_M : STATUS_OPTS_F}/>
                  <Sel label={t.lang==='EN'?'Activity':'Aktywność'} value={activity2} set={setActivity2} opts={gender2==='male' ? OPTS_MALE.activity : OPTS_FEMALE.activity}/>
                  <Sel label={t.lang==='EN'?'Outfit':'Strój'} value={outfit2} set={setOutfit2} opts={gender2==='male' ? OPTS_MALE.outfit : OPTS_FEMALE.outfit}/>
                  <Sel label={t.lang==='EN'?'Mood':'Nastrój'} value={mood2} set={setMood2} opts={MOOD_OPTS}/>
                </div>
              </div>
            )}
          </div>

          <div className={sectionClass}>
            <p className={headerClass}><span className="text-base">🎥</span> {t.lang==='EN' ? 'Camera' : 'Kamera'}</p>
            <div className="grid grid-cols-2 gap-3">
              <Sel label={t.lang==='EN'?'Camera Shot':'Ujęcie'} value={camera} set={setCamera} opts={[
                ['cinematic wide shot',t.lang==='EN'?'Cinematic wide':'Szerokie kinowe'],['close portrait',t.lang==='EN'?'Close portrait':'Portret z bliska'],
                ['low angle power shot',t.lang==='EN'?'Low angle power':'Ujęcie z dołu'],['aerial drone view',t.lang==='EN'?'Aerial drone':'Dron z góry'],
                ['over shoulder shot',t.lang==='EN'?'Over shoulder':'Przez ramię'],['dutch angle',t.lang==='EN'?'Dutch angle':'Skośne ujęcie'],
                ['tracking shot',t.lang==='EN'?'Tracking shot':'Śledzące'],['extreme close up face',t.lang==='EN'?'Extreme close up':'Zbliżenie twarzy'],
              ]}/>
            </div>
          </div>

          {/* Podgląd planu tygodnia */}
          {weekMode && (
            <div className={sectionClass}>
              <p className={headerClass}><span className="text-base">📅</span> Podgląd planu tygodnia</p>
              <div className="space-y-2">
                {buildWeek().split('\n').map((day, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="text-amber-500 font-black text-xs w-12 flex-shrink-0 pt-0.5">Dzień {i+1}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{day.replace("Day " + (i+1) + ": ", "")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generuj */}
          <div className="flex flex-col items-center gap-3 mt-4">
            {!isLoggedIn ? (
              <button onClick={onLoginRequest} className="px-10 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-sm rounded-2xl transition-all">
                {t.lang==='EN' ? 'Log in to generate' : 'Zaloguj się aby generować'}
              </button>
            ) : !canGenerate ? (
              <div className="text-center">
                <p className="text-slate-500 text-sm mb-3">{t.lang==='EN' ? 'No tokens left.' : 'Brak tokenów. Przejdź na plan Starter.'}</p>
                <a href={`https://buy.stripe.com/14A28qcGJ56fdfq5rQ8bS05?client_reference_id=${user?.uid || ''}&prefilled_email=${encodeURIComponent(user?.email || '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-block px-10 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-sm rounded-2xl transition-all shadow-lg shadow-amber-500/20">
                  {t.lang==='EN' ? 'Get Starter — 30 PLN/mo' : 'Kup Starter — 30 PLN/mies'}
                </a>
              </div>
            ) : (
              <button onClick={generatePrompt} className={`px-10 py-4 font-black uppercase tracking-widest text-sm rounded-2xl transition-all shadow-lg ${copied ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'}`}>
                {copied ? (t.lang==='EN' ? 'Copied! Paste in your AI generator' : 'Skopiowano! Wklej do generatora AI') : (t.lang==='EN' ? 'Generate & Copy Prompt' : 'Generuj i Kopiuj Prompt')}
              </button>
            )}
            {isLoggedIn && !isPro && !isStarter && tokens !== null && (
              <p className="text-[10px] text-slate-600 uppercase tracking-widest">
                {t.lang==='EN' ? `${tokens} free generations remaining` : `Pozostało ${tokens} darmowych generacji`}
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

// =========================================================================
// =========================================================================
// FILM BUILDER VIEW — Kreator Filmów AI (3 klatki renowacji)
// =========================================================================
const FilmBuilderView = ({ t, user, onLoginRequest }) => {
  const [copied, setCopied] = useState(null);
  const [loadingFrame, setLoadingFrame] = useState(null);
  const [animPrompts, setAnimPrompts] = useState({ anim12: null, anim23: null });
  const [framePrompts, setFramePrompts] = useState({ f1: null, f2: null, f3: null });
  const WORKER_URL = 'https://aiflow-film-prompt.47y85nfm6p.workers.dev';
  const [isPro, setIsPro] = useState(false);
  const [isStarter, setIsStarter] = useState(false);
  const [tokens, setTokens] = useState(null);
  const isLoggedIn = !!user;
  useEffect(() => {
    if (user?.uid) {
      getTokenData(db, user.uid).then(({ tokens, isPro, isStarter }) => {
        setTokens(tokens); setIsPro(isPro); setIsStarter(isStarter);
      });
    }
  }, [user]);
  const canGenerate = isPro || isStarter || (tokens !== null && tokens > 0);

  const [buildingType, setBuildingType] = useState('single family house');
  const [archStyle, setArchStyle]       = useState('modern minimalist');
  const [location, setLocation]         = useState('suburban area');
  const [timeOfDay, setTimeOfDay]       = useState('golden hour');
  const [camera, setCamera]             = useState('wide establishing shot');
  const [generator, setGenerator]       = useState('VEO 3');

  const sectionClass = 'bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-[#1a1a1a] rounded-2xl p-5 mb-4';
  const headerClass  = 'text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500 mb-4 flex items-center gap-2';
  const labelClass   = 'block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5';
  const inputClass   = 'w-full bg-slate-100 dark:bg-[#111] border border-black/10 dark:border-[#222] rounded-xl px-3 py-2.5 text-sm text-black dark:text-white focus:outline-none focus:border-amber-500 transition-colors appearance-none pr-8';

  const Sel = ({ label, value, set, opts }) => (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <select value={value} onChange={e => set(e.target.value)} className={inputClass}>
          {opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/>
      </div>
    </div>
  );

  const BASE = `${buildingType}, ${location}, ${timeOfDay} lighting, ${camera}, same angle same composition, photorealistic, 8K, cinematic`;

  const prompts = {
    1: `Abandoned ruined ${BASE}. Crumbling walls, broken windows, overgrown vegetation, peeling paint, structural decay, neglected facade, weathered materials, dramatic deterioration.`,
    2: `Same ${BASE}. Mid-renovation construction site, scaffolding covering half the building, workers visible, mix of old decay and new materials, construction machinery, half-demolished walls revealing new structure, transition state between old and new.`,
    3: `Fully renovated modern ${archStyle} ${BASE}. Brand new facade, fresh materials, landscaped garden, clean lines, new windows, perfect condition, architectural excellence, luxury finish.`,
  };

  // Generowanie wszystkich 3 klatek naraz przez Gemini
  const handleGenerateFrames = async () => {
    if (!isLoggedIn) { onLoginRequest(); return; }
    if (!canGenerate) return;
    setLoadingFrame('frames');
    setFramePrompts({ f1: null, f2: null, f3: null });
    try {
      const [r1, r2, r3] = await Promise.all([
        fetch(`${WORKER_URL}/generate-film-prompt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ buildingType, archStyle, location, timeOfDay, camera, generator, frame: '1' }) }),
        fetch(`${WORKER_URL}/generate-film-prompt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ buildingType, archStyle, location, timeOfDay, camera, generator, frame: '2' }) }),
        fetch(`${WORKER_URL}/generate-film-prompt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ buildingType, archStyle, location, timeOfDay, camera, generator, frame: '3' }) }),
      ]);
      const [d1, d2, d3] = await Promise.all([r1.json(), r2.json(), r3.json()]);
      const ok = await useToken(db, user.uid);
      if (ok) setFramePrompts({ f1: d1.prompt || '', f2: d2.prompt || '', f3: d3.prompt || '' });
    } catch (err) { console.error('Worker error:', err); }
    finally { setLoadingFrame(null); }
  };

  // Kopiowanie klatki
  const handleCopy = async (frame) => {
    const key = `f${frame}`;
    const text = framePrompts[key];
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(frame);
    setTimeout(() => setCopied(null), 2500);
  };

  // Generowanie obu promptów animacji przez Gemini naraz
  const handleGenerateAnims = async () => {
    if (!isLoggedIn) { onLoginRequest(); return; }
    if (!canGenerate) return;
    setLoadingFrame('anims');
    setAnimPrompts({ anim12: null, anim23: null });
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${WORKER_URL}/generate-film-prompt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ buildingType, archStyle, location, timeOfDay, camera, generator, frame: 'anim12' }),
        }),
        fetch(`${WORKER_URL}/generate-film-prompt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ buildingType, archStyle, location, timeOfDay, camera, generator, frame: 'anim23' }),
        }),
      ]);
      const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
      // Zużywamy 1 token za oba prompty
      const ok = await useToken(db, user.uid);
      if (ok) {
        setAnimPrompts({ anim12: d1.prompt || '', anim23: d2.prompt || '' });
      }
    } catch (err) {
      console.error('Worker error:', err);
    } finally {
      setLoadingFrame(null);
    }
  };

  // Kopiowanie wygenerowanego promptu animacji
  const handleCopyAnim = async (key) => {
    const text = animPrompts[key];
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2500);
  };

  const FRAME_COLORS = {
    1: { bg: 'bg-red-500/10 border-red-500/30', btn: 'bg-red-500 hover:bg-red-400', label: 'text-red-400', icon: '🏚️' },
    2: { bg: 'bg-orange-500/10 border-orange-500/30', btn: 'bg-orange-500 hover:bg-orange-400', label: 'text-orange-400', icon: '🏗️' },
    3: { bg: 'bg-green-500/10 border-green-500/30', btn: 'bg-green-500 hover:bg-green-400', label: 'text-green-400', icon: '🏡' },
  };

  const FRAME_LABELS = {
    1: t.lang === 'EN' ? 'Frame 1 — Ruin' : 'Klatka 1 — Ruina',
    2: t.lang === 'EN' ? 'Frame 2 — In Progress' : 'Klatka 2 — W trakcie',
    3: t.lang === 'EN' ? 'Frame 3 — Renovated' : 'Klatka 3 — Po renowacji',
  };

  const FILM_HINT = t.lang === 'EN'
    ? 'Generate animation 1→2, then 2→3 and merge into one film.'
    : 'Generuj animację 1→2, następnie 2→3 i połącz w jeden film.';

  return (
    <div className="min-h-screen bg-white dark:bg-black font-sans pb-16">
      <div className="max-w-4xl mx-auto px-4 pt-8">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-4">
            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"/>
            {t.lang === 'EN' ? 'AI Film Generator' : 'Generator Filmów AI'}
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-black dark:text-white uppercase tracking-tighter mb-2">
            {t.lang === 'EN' ? 'Film Builder' : 'Kreator Filmów'}<span className="text-amber-500">.</span>
          </h1>
          <p className="text-slate-500 text-sm mb-2">
            {t.lang === 'EN' ? 'Ruin → In progress → Renovated. 3 frames, 2 animations, 1 viral film.' : 'Ruina → W trakcie → Gotowy. 3 klatki, 2 animacje, 1 wiralowy film.'}
          </p>
          <p className="text-[10px] text-amber-500/60 uppercase tracking-widest">{FILM_HINT}</p>
        </div>

        {/* Opcje */}
        <div className="max-w-3xl mx-auto">
          <div className={sectionClass}>
            <p className={headerClass}><span className="text-base">🏗️</span> {t.lang === 'EN' ? 'Building & Location' : 'Budynek i Lokacja'}</p>
            <div className="grid grid-cols-2 gap-3">
              <Sel label={t.lang === 'EN' ? 'Building Type' : 'Typ budynku'} value={buildingType} set={setBuildingType} opts={[
                ['single family house', t.lang === 'EN' ? 'Family House' : 'Dom jednorodzinny'],
                ['apartment building', t.lang === 'EN' ? 'Apartment Block' : 'Kamienica'],
                ['beachfront villa', t.lang === 'EN' ? 'Beach Villa' : 'Willa plażowa'],
                ['industrial warehouse', t.lang === 'EN' ? 'Warehouse' : 'Magazyn/Fabryka'],
                ['historic townhouse', t.lang === 'EN' ? 'Townhouse' : 'Kamienica historyczna'],
                ['commercial building', t.lang === 'EN' ? 'Commercial' : 'Budynek komercyjny'],
                ['country farmhouse', t.lang === 'EN' ? 'Farmhouse' : 'Wiejski dom'],
              ]}/>
              <Sel label={t.lang === 'EN' ? 'Architecture Style' : 'Styl po renowacji'} value={archStyle} set={setArchStyle} opts={[
                ['modern minimalist', t.lang === 'EN' ? 'Modern Minimalist' : 'Nowoczesny minimalizm'],
                ['luxury contemporary', t.lang === 'EN' ? 'Luxury Contemporary' : 'Luksusowy współczesny'],
                ['scandinavian', t.lang === 'EN' ? 'Scandinavian' : 'Skandynawski'],
                ['mediterranean', t.lang === 'EN' ? 'Mediterranean' : 'Śródziemnomorski'],
                ['industrial loft', t.lang === 'EN' ? 'Industrial Loft' : 'Industrialny loft'],
                ['art deco', t.lang === 'EN' ? 'Art Deco' : 'Art Deco'],
                ['eco sustainable', t.lang === 'EN' ? 'Eco Sustainable' : 'Eko / Zielony'],
              ]}/>
              <Sel label={t.lang === 'EN' ? 'Location' : 'Lokacja'} value={location} set={setLocation} opts={[
                ['suburban area', t.lang === 'EN' ? 'Suburbs' : 'Przedmieścia'],
                ['city center', t.lang === 'EN' ? 'City Center' : 'Centrum miasta'],
                ['beachfront', t.lang === 'EN' ? 'Beachfront' : 'Przy plaży'],
                ['mountain area', t.lang === 'EN' ? 'Mountains' : 'W górach'],
                ['countryside', t.lang === 'EN' ? 'Countryside' : 'Wieś'],
                ['mediterranean coast', t.lang === 'EN' ? 'Mediterranean' : 'Wybrzeże śródziemnomorskie'],
              ]}/>
              <Sel label={t.lang === 'EN' ? 'Time of Day' : 'Pora dnia'} value={timeOfDay} set={setTimeOfDay} opts={[
                ['golden hour', t.lang === 'EN' ? 'Golden Hour' : 'Złota godzina'],
                ['blue hour dusk', t.lang === 'EN' ? 'Blue Hour' : 'Blue hour'],
                ['bright midday', t.lang === 'EN' ? 'Midday' : 'Południe'],
                ['overcast day', t.lang === 'EN' ? 'Overcast' : 'Pochmurny dzień'],
                ['dramatic sunset', t.lang === 'EN' ? 'Sunset' : 'Zachód słońca'],
              ]}/>
            </div>
          </div>

          <div className={sectionClass}>
            <p className={headerClass}><span className="text-base">🎥</span> {t.lang === 'EN' ? 'Camera & Generator' : 'Kamera i Generator'}</p>
            <div className="grid grid-cols-2 gap-3">
              <Sel label={t.lang === 'EN' ? 'Camera Angle' : 'Ujęcie'} value={camera} set={setCamera} opts={[
                ['wide establishing shot', t.lang === 'EN' ? 'Wide establishing' : 'Szerokie ogólne'],
                ['front elevation view', t.lang === 'EN' ? 'Front view' : 'Widok z frontu'],
                ['low angle dramatic', t.lang === 'EN' ? 'Low angle' : 'Ujęcie z dołu'],
                ['aerial drone view', t.lang === 'EN' ? 'Aerial drone' : 'Dron z góry'],
                ['45 degree angle', t.lang === 'EN' ? '45° angle' : 'Pod kątem 45°'],
              ]}/>
              <Sel label={t.lang === 'EN' ? 'AI Generator' : 'Generator AI'} value={generator} set={setGenerator} opts={[
                ['VEO 3', 'VEO 3'],
                ['Kling AI', 'Kling AI'],
                ['Runway Gen-4', 'Runway Gen-4'],
                ['Luma Dream Machine', 'Luma Dream Machine'],
              ]}/>
            </div>
          </div>

          {/* PRZYCISK GENERUJ 3 KLATKI */}
          <div className="mb-4">
            {!isLoggedIn ? (
              <button onClick={onLoginRequest} className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-wider transition-all shadow-lg">
                {t.lang === 'EN' ? 'Log in to generate' : 'Zaloguj się aby generować'}
              </button>
            ) : !canGenerate ? (
              <a href={`https://buy.stripe.com/14A28qcGJ56fdfq5rQ8bS05?client_reference_id=${user?.uid || ''}`}
                target="_blank" rel="noopener noreferrer"
                className="block w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-wider transition-all text-center shadow-lg">
                {t.lang === 'EN' ? 'Get Starter — 30 PLN/mo' : 'Kup Starter — 30 PLN/mies'}
              </a>
            ) : (
              <button onClick={handleGenerateFrames} disabled={loadingFrame === 'frames'}
                className={`w-full py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-lg ${loadingFrame === 'frames' ? 'bg-slate-500 cursor-wait text-white' : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'}`}>
                {loadingFrame === 'frames' ? '⏳ Gemini generuje 3 klatki...' : (t.lang === 'EN' ? '✦ Generate All 3 Frames' : '✦ Generuj 3 Klatki (spójny budynek)')}
              </button>
            )}
          </div>

          {/* 3 KLATKI */}
          <div className="space-y-3 mb-6">
            {[1, 2, 3].map(frame => {
              const fc = FRAME_COLORS[frame];
              const isCopied = copied === frame;
              const generatedText = framePrompts[`f${frame}`];
              return (
                <div key={frame} className={`border rounded-2xl p-4 ${fc.bg}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{fc.icon}</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${fc.label}`}>{FRAME_LABELS[frame]}</span>
                    </div>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider">{generator}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3 font-mono min-h-[40px]">
                    {generatedText || (t.lang === 'EN' ? 'Click "Generate All 3 Frames" above...' : 'Kliknij "Generuj 3 Klatki" powyżej...')}
                  </p>
                  <button onClick={() => handleCopy(frame)} disabled={!generatedText}
                    className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all text-white ${isCopied ? 'bg-green-500' : generatedText ? fc.btn : 'bg-slate-600 cursor-not-allowed opacity-50'}`}>
                    {isCopied ? '✓ Skopiowano!' : (t.lang === 'EN' ? `Copy Frame ${frame}` : `Kopiuj Klatkę ${frame}`)}
                  </button>
                </div>
              );
            })}
          </div>

          {/* PROMPTY ANIMACJI */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"/>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">🎬 {t.lang === 'EN' ? 'Animation Prompts' : 'Prompty Animacji'}</p>
              <div className="h-px flex-1 bg-gradient-to-r from-amber-500/30 via-transparent to-transparent"/>
            </div>
            <p className="text-[10px] text-slate-500 text-center mb-4 leading-relaxed">
              {t.lang === 'EN'
                ? 'Generate both animation prompts with AI, then copy each one into ' + generator + '.'
                : 'Wygeneruj oba prompty animacji przez AI, następnie skopiuj każdy do ' + generator + '.'}
            </p>

            {/* PRZYCISK GENERUJ OBA */}
            <div className="mb-4">
              {!isLoggedIn ? (
                <button onClick={onLoginRequest} className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-wider transition-all">
                  {t.lang === 'EN' ? 'Log in to generate' : 'Zaloguj się aby generować'}
                </button>
              ) : !canGenerate ? (
                <a href={`https://buy.stripe.com/14A28qcGJ56fdfq5rQ8bS05?client_reference_id=${user?.uid || ''}`}
                  target="_blank" rel="noopener noreferrer"
                  className="block w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-wider transition-all text-center">
                  {t.lang === 'EN' ? 'Get Starter — 30 PLN/mo' : 'Kup Starter — 30 PLN/mies'}
                </a>
              ) : (
                <button onClick={handleGenerateAnims} disabled={loadingFrame === 'anims'}
                  className={`w-full py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-lg ${loadingFrame === 'anims' ? 'bg-slate-500 cursor-wait text-white' : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'}`}>
                  {loadingFrame === 'anims' ? '⏳ Gemini generuje prompty animacji...' : (t.lang === 'EN' ? '✦ Generate Animation Prompts' : '✦ Generuj Prompty Animacji')}
                </button>
              )}
            </div>

            {/* KARTA ANIMACJA 1→2 */}
            <div className="border border-orange-500/30 bg-orange-500/5 rounded-2xl p-4 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🏚️→🏗️</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                  {t.lang === 'EN' ? 'Animation 1→2 (Ruin → Construction)' : 'Animacja 1→2 (Ruina → Budowa)'}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-3 bg-black/10 dark:bg-white/5 rounded-xl px-3 py-2">
                {['1','2'].map((n,i) => (
                  <React.Fragment key={n}>
                    {i > 0 && <span className="text-slate-400 text-xs">+</span>}
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                      <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-black text-[8px] text-slate-600 dark:text-slate-300">{n}</span>
                      {t.lang === 'EN' ? 'Frame' : 'Klatka'} {n}
                    </div>
                  </React.Fragment>
                ))}
              </div>
              <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3 font-mono min-h-[40px]">
                {animPrompts.anim12 || (t.lang === 'EN' ? 'Click "Generate" above to create prompt...' : 'Kliknij "Generuj" powyżej aby stworzyć prompt...')}
              </p>
              <button onClick={() => handleCopyAnim('anim12')} disabled={!animPrompts.anim12}
                className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all text-white ${copied === 'anim12' ? 'bg-green-500' : animPrompts.anim12 ? 'bg-orange-500 hover:bg-orange-400' : 'bg-slate-600 cursor-not-allowed opacity-50'}`}>
                {copied === 'anim12' ? '✓ Skopiowano!' : (t.lang === 'EN' ? 'Copy Animation 1→2' : 'Kopiuj Animację 1→2')}
              </button>
            </div>

            {/* KARTA ANIMACJA 2→3 */}
            <div className="border border-green-500/30 bg-green-500/5 rounded-2xl p-4 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🏗️→🏡</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-green-400">
                  {t.lang === 'EN' ? 'Animation 2→3 (Construction → Finished)' : 'Animacja 2→3 (Budowa → Gotowy)'}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-3 bg-black/10 dark:bg-white/5 rounded-xl px-3 py-2">
                {['2','3'].map((n,i) => (
                  <React.Fragment key={n}>
                    {i > 0 && <span className="text-slate-400 text-xs">+</span>}
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                      <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-black text-[8px] text-slate-600 dark:text-slate-300">{n}</span>
                      {t.lang === 'EN' ? 'Frame' : 'Klatka'} {n}
                    </div>
                  </React.Fragment>
                ))}
              </div>
              <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3 font-mono min-h-[40px]">
                {animPrompts.anim23 || (t.lang === 'EN' ? 'Click "Generate" above to create prompt...' : 'Kliknij "Generuj" powyżej aby stworzyć prompt...')}
              </p>
              <button onClick={() => handleCopyAnim('anim23')} disabled={!animPrompts.anim23}
                className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all text-white ${copied === 'anim23' ? 'bg-green-500' : animPrompts.anim23 ? 'bg-green-500 hover:bg-green-400' : 'bg-slate-600 cursor-not-allowed opacity-50'}`}>
                {copied === 'anim23' ? '✓ Skopiowano!' : (t.lang === 'EN' ? 'Copy Animation 2→3' : 'Kopiuj Animację 2→3')}
              </button>
            </div>
          </div>

          {/* Wskazówka */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 text-center">
            <p className="text-[10px] text-amber-500/70 uppercase tracking-widest font-bold mb-1">💡 {t.lang === 'EN' ? 'Final step' : 'Ostatni krok'}</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t.lang === 'EN'
                ? 'Merge both animations in CapCut / Premiere → viral renovation film ready! 🎬'
                : 'Połącz obie animacje w CapCut / Premiere → wiralowy film renowacji gotowy! 🎬'}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

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


const LegalH = ({ children }) => <h2 style={{fontWeight:800,fontSize:'10px',textTransform:'uppercase',letterSpacing:'0.2em',color:'#f59e0b',marginBottom:'8px',marginTop:'28px'}}>{children}</h2>;
const LegalP = ({ children }) => <p style={{fontSize:'14px',lineHeight:'1.75',marginBottom:'8px'}}>{children}</p>;
const LegalBack = ({ setCurrentView, lang }) => <button onClick={() => setCurrentView('home')} className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-8 flex items-center gap-2 hover:gap-3 transition-all">← {lang === 'EN' ? 'Back' : 'Powrót'}</button>;

const ImpressumView = ({ setCurrentView, lang }) => (
  <div className="min-h-screen bg-white dark:bg-black p-6 md:p-16 font-sans transition-colors duration-500">
    <div className="max-w-3xl mx-auto text-slate-700 dark:text-slate-300">
      <LegalBack setCurrentView={setCurrentView} lang={lang} />
      <h1 className="text-3xl font-extrabold uppercase tracking-tighter text-black dark:text-white mb-10 border-b border-black dark:border-[#222] pb-6">Impressum</h1>
      <LegalP>Angaben gemäß § 5 TMG (Telemediengesetz)</LegalP>
      <LegalH>Anbieter</LegalH>
      <LegalP><strong>DDC — Dienstleistungen Damian Chlad</strong><br/>Garteler Weg 38<br/>27711 Osterholz-Scharmbeck<br/>Deutschland</LegalP>
      <LegalH>Kontakt</LegalH>
      <LegalP>Telefon: +49 151 66396941<br/>E-Mail: info@loveaiflow.com<br/>Website: loveaiflow.com</LegalP>
      <LegalH>Gewerbeanmeldung</LegalH>
      <LegalP>Eingetragenes Gewerbe gemäß § 14 GewO. Zuständige Behörde: Landkreis Osterholz.</LegalP>
      <LegalH>Umsatzsteuer</LegalH>
      <LegalP>Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).</LegalP>
      <LegalH>Streitschlichtung</LegalH>
      <LegalP>Die EU-Kommission stellt eine Plattform zur Online-Streitbeilegung bereit: https://ec.europa.eu/consumers/odr. Wir sind nicht verpflichtet, an einem Schlichtungsverfahren teilzunehmen.</LegalP>
    </div>
  </div>
);

const DatenschutzView = ({ setCurrentView, lang }) => (
  <div className="min-h-screen bg-white dark:bg-black p-6 md:p-16 font-sans transition-colors duration-500">
    <div className="max-w-3xl mx-auto text-slate-700 dark:text-slate-300">
      <LegalBack setCurrentView={setCurrentView} lang={lang} />
      <h1 className="text-3xl font-extrabold uppercase tracking-tighter text-black dark:text-white mb-10 border-b border-black dark:border-[#222] pb-6">{lang === 'EN' ? 'Privacy Policy' : 'Polityka Prywatnosci / Datenschutz'}</h1>
      <LegalH>1. {lang === 'EN' ? 'Controller' : 'Administrator'}</LegalH>
      <LegalP>DDC — Dienstleistungen Damian Chlad, Garteler Weg 38, 27711 Osterholz-Scharmbeck. E-Mail: info@loveaiflow.com</LegalP>
      <LegalH>2. {lang === 'EN' ? 'Data collected' : 'Zbierane dane'}</LegalH>
      <LegalP>{lang === 'EN' ? 'We collect: email address (registration), Google login data (OAuth), payment data handled exclusively by Stripe, activity logs (Firebase Analytics).' : 'Zbieramy: adres e-mail (rejestracja), dane logowania Google (OAuth), dane platnosci obslugiwane wylacznie przez Stripe, logi aktywnosci (Firebase Analytics).'}</LegalP>
      <LegalH>3. {lang === 'EN' ? 'Legal basis' : 'Podstawa prawna'}</LegalH>
      <LegalP>{lang === 'EN' ? 'Data is processed to perform the contract (Art. 6(1)(b) GDPR) and for legitimate interests of the controller.' : 'Dane przetwarzamy na podstawie art. 6 ust. 1 lit. b RODO (wykonanie umowy) oraz uzasadnionego interesu administratora.'}</LegalP>
      <LegalH>4. {lang === 'EN' ? 'Third parties' : 'Podmioty trzecie'}</LegalH>
      <LegalP>{lang === 'EN' ? 'Firebase/Google (hosting, auth, database), Stripe (payments). All comply with GDPR.' : 'Firebase/Google (hosting, auth, baza danych), Stripe (platnosci). Wszyscy dzialaja zgodnie z RODO.'}</LegalP>
      <LegalH>5. {lang === 'EN' ? 'Your rights' : 'Twoje prawa'}</LegalH>
      <LegalP>{lang === 'EN' ? 'Access, rectification, erasure, restriction, portability, objection. Contact: info@loveaiflow.com' : 'Dostep, sprostowanie, usuniecie, ograniczenie, przenosnosc, sprzeciw. Kontakt: info@loveaiflow.com'}</LegalP>
      <LegalH>6. {lang === 'EN' ? 'Supervisory authority' : 'Organ nadzorczy'}</LegalH>
      <LegalP>{lang === 'EN' ? 'Der Landesbeauftragte fur den Datenschutz Niedersachsen (www.lfd.niedersachsen.de)' : 'Der Landesbeauftragte fur den Datenschutz Niedersachsen (www.lfd.niedersachsen.de)'}</LegalP>
    </div>
  </div>
);

const RegulaminView = ({ setCurrentView, lang }) => (
  <div className="min-h-screen bg-white dark:bg-black p-6 md:p-16 font-sans transition-colors duration-500">
    <div className="max-w-3xl mx-auto text-slate-700 dark:text-slate-300">
      <LegalBack setCurrentView={setCurrentView} lang={lang} />
      <h1 className="text-3xl font-extrabold uppercase tracking-tighter text-black dark:text-white mb-10 border-b border-black dark:border-[#222] pb-6">{lang === 'EN' ? 'Terms & Conditions' : 'Regulamin serwisu'}</h1>
      <LegalH>1. {lang === 'EN' ? 'Provider' : 'Uslugodawca'}</LegalH>
      <LegalP>DDC — Dienstleistungen Damian Chlad, Garteler Weg 38, 27711 Osterholz-Scharmbeck, Niemcy. E-Mail: info@loveaiflow.com</LegalP>
      <LegalH>2. {lang === 'EN' ? 'Services' : 'Zakres uslug'}</LegalH>
      <LegalP>{lang === 'EN' ? 'AI Flow Academy offers educational materials, AI prompt generators (Avatar Builder, Ad Builder), and community access. Full access requires registration and a Pro plan (29 PLN/month).' : 'AI Flow Academy oferuje materialy edukacyjne z zakresu AI, generatory promptow (Kreator Awatarow, Kreator Reklam) oraz spolecznosc. Pelny dostep wymaga rejestracji i planu Pro (29 PLN/miesiac).'}</LegalP>
      <LegalH>3. {lang === 'EN' ? 'AI Tools disclaimer' : 'Zastrzezenia dot. narzedzi AI'}</LegalH>
      <LegalP>{lang === 'EN' ? 'The prompt generators create text instructions for external AI image generators. AI Flow Academy does not guarantee specific visual results. Users are solely responsible for generated content and must comply with applicable laws and the terms of the chosen AI generator.' : 'Kreatory generuja prompty tekstowe do zewnetrznych generatorow obrazow AI. AI Flow Academy nie gwarantuje konkretnych efektow wizualnych. Uzytkownik korzysta z narzedzi na wlasna odpowiedzialnosc i musi przestrzegac obowiazujacego prawa oraz regulaminu wybranego generatora AI.'}</LegalP>
      <LegalH>4. {lang === 'EN' ? 'Subscription' : 'Subskrypcja'}</LegalH>
      <LegalP>{lang === 'EN' ? 'Pro plan: 29 PLN/month, billed via Stripe, auto-renewing. Cancel anytime by email: info@loveaiflow.com. Access continues until end of paid period.' : 'Plan Pro: 29 PLN/miesiac, platnosc przez Stripe, odnawia sie automatycznie. Rezygnacja w dowolnym momencie: info@loveaiflow.com. Dostep aktywny do konca oplaconego okresu.'}</LegalP>
      <LegalH>5. {lang === 'EN' ? 'Withdrawal right (EU/DE)' : 'Prawo odstapienia (UE/DE)'}</LegalH>
      <LegalP>{lang === 'EN' ? 'You may withdraw from the contract within 14 days (§ 312g BGB). This right expires upon commencement of digital services with your explicit consent. To withdraw: info@loveaiflow.com.' : 'Prawo odstapienia od umowy przysluguje w ciagu 14 dni (§ 312g BGB). Wygasa z chwila rozpoczecia korzystania z uslug cyfrowych za zgoda uzytkownika. Aby odstapic: info@loveaiflow.com.'}</LegalP>
      <LegalH>6. {lang === 'EN' ? 'Governing law' : 'Prawo wlasciwe'}</LegalH>
      <LegalP>{lang === 'EN' ? 'German law applies. Disputes shall be resolved by courts in Osterholz-Scharmbeck, Germany.' : 'Stosuje sie prawo niemieckie. Spory rozstrzygaja sady wlasciwe dla Osterholz-Scharmbeck, Niemcy.'}</LegalP>
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

  const inputCls = "w-full bg-slate-100 dark:bg-[#111] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-black dark:text-white text-xs focus:border-amber-500 focus:outline-none transition-colors";
  const labelCls = "block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1";

  return (
    <div className="min-h-screen bg-white dark:bg-black font-sans px-4 py-12">
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
          {currentView === 'lifestyle-builder' && <LifestyleBuilderView t={t} user={user} onLoginRequest={() => setShowLogin(true)} />}
          {currentView === 'film-builder' && <FilmBuilderView t={t} user={user} onLoginRequest={() => setShowLogin(true)} />}
          {currentView === 'admin' && user?.email === ADMIN_EMAIL && <AdminView setCurrentView={setCurrentView} lang={lang} user={user} />}
          {currentView === 'impressum' && <ImpressumView setCurrentView={setCurrentView} lang={lang} />}
          {currentView === 'datenschutz' && <DatenschutzView setCurrentView={setCurrentView} lang={lang} />}
          {currentView === 'regulamin' && <RegulaminView setCurrentView={setCurrentView} lang={lang} />}
        </main>

        {showLogin && <LoginModal onClose={() => setShowLogin(false)} lang={lang} />}

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
