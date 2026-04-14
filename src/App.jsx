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
const TOKENS_FREE = 5; // 1 avatar + 1 ad + 1 lifestyle + 2 film
const STRIPE_MONTHLY = 'https://buy.stripe.com/bJedR8ayBgOX5MY9I68bS0a'; // 89 PLN miesiecznie
const STRIPE_ANNUAL = 'https://buy.stripe.com/7sY3cu0Y1eGP4IU5rQ8bS0b';   // 899 PLN rocznie
// Aliasy dla kompatybilnosci z reszta kodu
const STRIPE_PRO_LINK = STRIPE_MONTHLY;
const STRIPE_STARTER_LINK = STRIPE_MONTHLY;
const STRIPE_ANNUAL_LINK = STRIPE_ANNUAL;
const ADMIN_EMAIL = 'damianlj@live.com';
const stripeLink = (baseUrl, uid, email) => { return uid ? `${baseUrl}?client_reference_id=${uid}` : baseUrl; };

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
    await setDoc(ref, { tokens: TOKENS_FREE, tokens_avatar: 1, tokens_ad: 1, tokens_lifestyle: 1, tokens_film: 2, used: 0, createdAt: new Date().toISOString(), pro: false, starter: false });
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

async function useTokenForCreator(db, uid, creatorId) {
  // creatorId: 'avatar' | 'ad' | 'lifestyle' | 'film'
  const ref = doc(db, 'artifacts', appId, 'public', 'data', 'tokens', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;
  const data = snap.data();
  // Pro/Starter - bez limitów
  if (data.pro === true || data.starter === true) return true;
  // Sprawdź per-kreator token
  const field = `tokens_${creatorId}`;
  const creatorTokens = data[field] ?? 0;
  if (creatorTokens <= 0) return false;
  await updateDoc(ref, { [field]: increment(-1), used: increment(1) });
  return true;
}

async function getCreatorTokens(db, uid, creatorId) {
  const ref = doc(db, 'artifacts', appId, 'public', 'data', 'tokens', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    // Nowy user - inicjalizujemy tokeny
    await setDoc(ref, { tokens: TOKENS_FREE, tokens_avatar: 1, tokens_ad: 1, tokens_lifestyle: 1, tokens_film: 2, used: 0, createdAt: new Date().toISOString(), pro: false, starter: false });
    return creatorId === 'film' ? 2 : 1;
  }
  const field = `tokens_${creatorId}`;
  const val = snap.data()[field];
  // Stary user bez per-kreator tokenów - dajemy mu 1
  if (val === undefined) {
    await updateDoc(ref, { tokens_avatar: 1, tokens_ad: 1, tokens_lifestyle: 1, tokens_film: 2 });
    return creatorId === 'film' ? 2 : 1;
  }
  return val;
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
      {t.lang === 'EN' ? '🔓 Unlock Everything →' : '🔓 Odblokuj wszystko →'}
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
          { id:1, title_pl:'Wprowadzenie do Awatarów AI', title_en:'Introduction to AI Avatars', duration:'12:34', ytId:'1_1oHwOZMe4', naffyUrl:'https://naffy.io', vimeoUrl:'' },
          // Dodaj kolejne tutoriale tutaj:
          // { id:2, title_pl:'Tytuł PL', title_en:'Title EN', duration:'00:00', ytId:'YOUTUBE_ID', naffyUrl:'LINK_DO_TUTORIALU', vimeoUrl:'' },
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

                {/* Tytuł pod miniaturką */}
                <div className="p-4">
                  <p className="text-white font-black text-sm leading-tight">
                    {t.lang === 'EN' ? tut.title_en : tut.title_pl}
                  </p>
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
                👑 {t.lang === 'EN' ? 'All tutorials + apps — from 89 PLN/mo' : 'Wszystkie tutoriale + aplikacje — od 89 zł/mies.'}
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
const AplikacjeView = ({ t, user, onLoginRequest, onCreatorChange, resetSignal }) => {
  const [activeApp, setActiveApp] = useState(null);
  const openApp = (id) => { setActiveApp(id); if (onCreatorChange) onCreatorChange(id); };
  const closeApp = () => { setActiveApp(null); if (onCreatorChange) onCreatorChange(null); };
  // Gdy navbar klika Aplikacje z zewnątrz — resetujemy kreator
  useEffect(() => { if (resetSignal) { setActiveApp(null); } }, [resetSignal]);

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
    if (currentIdx < apps.length - 1) openApp(apps[currentIdx + 1].id);
  };
  const goPrev = () => {
    if (currentIdx > 0) openApp(apps[currentIdx - 1].id);
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
  const [creatorToken, setCreatorToken] = useState(null);

  useEffect(() => {
    if (isLoggedIn && user?.uid) {
      setLoadingTokens(true);
      getTokenData(db, user.uid).then(({ tokens, isPro, isStarter }) => {
        setTokens(tokens); setIsPro(isPro); setIsStarter(isStarter); setLoadingTokens(false);
      }).catch(() => setLoadingTokens(false));
      getCreatorTokens(db, user.uid, 'avatar').then(t => setCreatorToken(t));
    } else { setTokens(null); setIsPro(false); setIsStarter(false); setCreatorToken(null); }
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

  const canGenerate = isPro || isStarter || (creatorToken !== null && creatorToken > 0);

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
  const [specialEffect, setSpecialEffect] = useState('');
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
    // Gdy zmienia się płeć — automatyczny reset do właściwych defaults
    if (key === 'subject') {
      const goingMale = val.includes('1boy') && !val.includes('1girl');
      setCharacters(prev => prev.map((c, i) => i === idx ? (goingMale ? { ...CHARACTER_DEFAULTS_M } : { ...CHARACTER_DEFAULTS_F }) : c));
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
      (!isMale && char.legwear !== '') ? char.legwear : '',
      char.shoes,
      char.tattoo !== 'none' ? char.tattoo : '',
      clothingSuffix,
    ].filter(Boolean).join(', ');
  };

  const generatePrompt = async () => {
    if (!canGenerate) return;
    const ok = await useTokenForCreator(db, user.uid, 'avatar');
    if (!ok) return;
    setCreatorToken(prev => (prev !== null ? prev - 1 : null));

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
      specialEffect || null,
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
              <label className={labelClass}>&#10024; {t.lang==='EN'?'Special Effect':'Efekt specjalny'}</label>
              <select value={specialEffect} onChange={e => setSpecialEffect(e.target.value)} className={inputClass}>
                <option value="">— {t.lang==='EN'?'No effect':'Bez efektu'} —</option>
                <option value="subtle glowing cracks on clothing, smoldering embers, wisps of smoke around body">&#128293; Żarzenie</option>
                <option value="frost and ice crystals on clothing, cold air vapor, snowflakes around body">&#10052; Mróz</option>
                <option value="electric sparks and lightning bolts crackling around body, electric aura">&#9889; Elektryczność</option>
                <option value="golden cracks glowing on skin and clothing, kintsugi effect, golden light">&#10024; Złote pęknięcia</option>
                <option value="dark smoke and shadow tendrils swirling around body, dark aura">&#127761; Mroczna aura</option>
                <option value="delicate flower petals growing from clothing, nature magic, botanical aura">&#127807; Natura</option>
                <option value="water droplets and mist around body, wet fabric clinging">&#127754; Woda</option>
                <option value="iridescent holographic shimmer on skin, glitch effect, cyberpunk glow">&#128187; Holo / Glitch</option>
                <option value="pink cherry blossom petals falling around, sakura flowers floating">&#127800; Sakura</option>
                <option value="galaxy and stardust swirling around body, cosmic nebula colors">&#127756; Kosmos</option>
              </select>
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
              <a href={`${STRIPE_MONTHLY}?client_reference_id=${user?.uid || ''}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-block px-10 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-sm rounded-2xl transition-all shadow-lg shadow-amber-500/20">
                {t.lang==='EN' ? '🔓 Unlock Everything →' : '🔓 Odblokuj wszystko →'}
              </a>
            </div>
          ) : (
            <button onClick={generatePrompt} className={`px-10 py-4 font-black uppercase tracking-widest text-sm rounded-2xl transition-all shadow-lg ${copied ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'}`}>
              {copied ? (t.lang==='EN' ? 'Copied! Paste in your AI generator' : 'Skopiowano! Wklej do generatora AI') : (t.lang==='EN' ? 'Generate & Copy Prompt' : 'Generuj i Kopiuj Prompt')}
            </button>
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
  const [adTab, setAdTab] = useState('scene'); // 'scene' | 'effects'
  const [creatorToken, setCreatorToken] = useState(null);

  useEffect(() => {
    if (isLoggedIn && user?.uid) {
      setLoadingTokens(true);
      getTokenData(db, user.uid).then(({ tokens, isPro, isStarter }) => {
        setTokens(tokens); setIsPro(isPro); setIsStarter(isStarter); setLoadingTokens(false);
      }).catch(() => setLoadingTokens(false));
      getCreatorTokens(db, user.uid, 'ad').then(t => setCreatorToken(t));
    } else { setTokens(null); setIsPro(false); setIsStarter(false); setCreatorToken(null); }
  }, [user]);

  const canGenerate = isPro || isStarter || (creatorToken !== null && creatorToken > 0);

  // --- WSPÓLNE ---
  const [productName, setProductName] = useState('');

  // --- ZAKŁADKA 1: SCENA ---
  const [surface, setSurface] = useState('');
  const [lighting, setLighting] = useState('');
  const [cameraMove, setCameraMove] = useState('');
  const [cameraSpeed, setCameraSpeed] = useState(5);

  // --- ZAKŁADKA 2: EFEKTY ---
  const [effectFalling, setEffectFalling] = useState([]);
  const [effectColors, setEffectColors] = useState([]);
  const [effectIntensity, setEffectIntensity] = useState(50);

  const toggleFalling = (val) => setEffectFalling(prev => prev.includes(val) ? prev.filter(x=>x!==val) : [...prev, val]);
  const toggleColor = (val) => setEffectColors(prev => prev.includes(val) ? prev.filter(x=>x!==val) : [...prev, val]);

  // Słowniki
  const SURFACES = {
    // Mokre
    water: 'product submerged in crystal clear water, light caustics, water reflections',
    milk: 'product in white creamy milk, smooth milky surface, soft light',
    oil: 'product in glossy oil, rainbow reflections, viscous liquid',
    wet_street: 'product on wet urban street, rain reflections, puddles around',
    // Suche
    concrete: 'product on raw concrete, urban industrial texture',
    brick: 'product on red brick wall texture, rough surface',
    sand: 'product on desert sand, warm golden grains',
    beach_sand: 'product on beach sand, ocean in background, coastal atmosphere',
    metal: 'product on polished metal surface, reflective steel',
    stone: 'product on natural stone, rough rocky texture',
    marble_white: 'product on white marble, luxury veined surface',
    marble_black: 'product on black marble, dark premium surface',
    // Naturalne
    forest: 'product on forest floor, moss and leaves, dappled natural light, trees around',
    snow: 'product on snow covered ground, snowflakes falling, winter atmosphere, cold crisp air',
    cliff: 'product on rocky cliff edge, dramatic landscape, sky background',
  };

  const LIGHTINGS = {
    window: 'natural light through window, soft directional shadows, morning light',
    sunny: 'bright sunny daylight, crisp shadows, outdoor natural light',
    zenith: 'overhead zenith light, top-down dramatic shadows',
    sunset: 'warm golden sunset light, amber and orange tones, magic hour',
    halogen: 'clean white studio halogen light, professional photography lighting, even exposure',
  };

  const CAMERA_MOVES = {
    dolly_in: 'slow cinematic dolly-in from far wide shot toward the product, camera moves forward getting closer',
    orbit_360: 'camera slowly orbits 360 degrees around the product, smooth circular motion',
    pullback: 'camera starts in extreme close-up of product detail then slowly pulls back to reveal full product',
    crane_up: 'camera starts at ground level looking up then slowly cranes upward revealing the full product from bottom to top',
    static: 'locked static tripod shot, no camera movement, all movement in effects and lighting',
  };



  const FALL_PROMPTS = {
    powder: 'powder explosion bursting around',
    liquid_pour: 'liquid gold or silver being poured over',
    sparkling_rain: 'rain of sparkling glitter particles falling on',
    rain: 'natural rain falling on, wet droplets on surface',
    snow_fall: 'snow falling gently on, soft snowflakes surrounding',
    sparks: 'sparks and embers flying around',
    petals: 'flower petals falling gently on',
    glitter: 'glitter and sparkles raining on',
    smoke: 'smoke swirling around',
    melting: 'product slowly melting and dissolving in slow motion, liquid drips forming',
    floating: 'product floating and hovering in zero gravity, slow rotation in mid-air',
    shatter: 'product dramatically shattering into pieces then reassembling in reverse',
  };

  const COLOR_MAP = {
    golden:'golden, warm gold', silver:'silver, metallic silver', pink:'soft pink, rose',
    red:'deep red, crimson', green:'vibrant green, emerald', blue:'electric blue, cobalt',
    purple:'deep purple, violet', rainbow:'rainbow, multi-color', white:'pure white, pearl',
    black:'dark black, obsidian', neon_green:'neon green, fluorescent', orange:'vivid orange',
  };

  const speedLabel = cameraSpeed <= 2 ? (t.lang==='EN'?'Very slow':'Bardzo wolno') :
                     cameraSpeed <= 4 ? (t.lang==='EN'?'Slow':'Wolno') :
                     cameraSpeed <= 6 ? (t.lang==='EN'?'Medium':'Średnio') :
                     cameraSpeed <= 8 ? (t.lang==='EN'?'Fast':'Szybko') :
                                        (t.lang==='EN'?'Very fast':'Bardzo szybko');

  // GENERATOR PROMPTU — łączy dane z OBU zakładek
  const buildPrompt = () => {
    const parts = [];
    if (productName.trim()) parts.push(`The product is: ${productName.trim()}`);
    if (surface && SURFACES[surface]) parts.push(SURFACES[surface]);
    if (lighting && LIGHTINGS[lighting]) parts.push(LIGHTINGS[lighting]);
    if (cameraMove && CAMERA_MOVES[cameraMove]) {
      const speedDesc = `speed ${cameraSpeed}/10 (${speedLabel.toLowerCase()})`;
      parts.push(CAMERA_MOVES[cameraMove] + ', ' + speedDesc);
    }
    // Efekty z zakładki 2
    if (effectFalling.length > 0) {
      const colorDesc = effectColors.length > 0 ? effectColors.map(c => COLOR_MAP[c] || c).join(' and ') : 'colorful';
      const intensity = effectIntensity < 33 ? 'subtle' : effectIntensity < 66 ? 'moderate' : 'intense';
      const fallParts = effectFalling.map(f => `${colorDesc} ${FALL_PROMPTS[f]} the product`).join(', ');
      parts.push(fallParts + `, ${intensity} intensity`);
    }
    if (parts.length === 0) return t.lang==='EN' ? 'Fill in at least one option above.' : 'Uzupełnij co najmniej jedną opcję powyżej.';
    return 'Cinematic product video. ' + parts.join(', ') + '. Photorealistic 4K, professional commercial quality.';
  };

  const handleCopy = async () => {
    if (!isLoggedIn) { onLoginRequest(); return; }
    if (!canGenerate) return;
    const prompt = buildPrompt();
    if (prompt.includes('Uzupełnij') || prompt.includes('Fill in')) return;
    await navigator.clipboard.writeText(prompt);
    if (!isPro && !isStarter) {
      const ok = await useTokenForCreator(db, user.uid, 'ad');
      if (ok) setCreatorToken(prev => prev !== null ? prev - 1 : null);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isProductBlocked = (name) => {
    if (!name) return false;
    const blocked = ['vibrator','wibrator','dildo','sex','porn','narkotyk','drug','weapon','broń','gun','pistol'];
    return blocked.some(b => name.toLowerCase().includes(b));
  };

  const labelClass = 'block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5';
  const inputClass = 'w-full bg-slate-100 dark:bg-[#111] border border-black/10 dark:border-[#222] rounded-xl px-3 py-2.5 text-sm text-black dark:text-white focus:outline-none focus:border-amber-500 transition-colors appearance-none';
  const sectionClass = 'bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-[#1a1a1a] rounded-2xl p-5 mb-4';
  const headerClass = 'text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500 mb-4 flex items-center gap-2';

  const prompt = buildPrompt();
  const promptReady = !prompt.includes('Uzupełnij') && !prompt.includes('Fill in');

  return (
    <div className="min-h-screen bg-white dark:bg-black font-sans pb-16">
      <div className="max-w-5xl mx-auto px-4 pt-8">

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-4">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"/>
            {t.lang==='EN' ? 'AI Product Ad Generator' : 'Generator Reklam Produktowych AI'}
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-black dark:text-white uppercase tracking-tighter mb-2">
            {t.lang==='EN' ? 'Product Ad' : 'Kreator Reklam'}<span className="text-amber-500">.</span>
          </h1>
          <p className="text-slate-500 text-sm">
            {t.lang==='EN' ? 'Mix scene + effects — one prompt, infinite combinations.' : 'Mieszaj scenę i efekty — jeden prompt, nieskończone kombinacje.'}
          </p>
        </div>

        {/* POLE PRODUKTU — wspólne */}
        <div className={sectionClass}>
          <p className={headerClass}>🎯 {t.lang==='EN' ? 'Product (optional)' : 'Produkt (opcjonalnie)'}</p>
          <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
            placeholder={t.lang==='EN' ? 'e.g. black leather sneakers, iPhone 15 Pro...' : 'np. czarne skórzane sneakersy, iPhone 15 Pro...'}
            className="w-full bg-slate-100 dark:bg-[#111] border border-black/10 dark:border-[#222] rounded-xl px-4 py-3 text-sm text-black dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"/>
          {isProductBlocked(productName) && <p className="text-red-500 text-xs mt-2 font-bold">⛔ {t.lang==='EN'?'This product is not allowed.':'Ten produkt nie jest dozwolony.'}</p>}
        </div>

        {/* ZAKŁADKI */}
        <div className="flex gap-3 mb-4">
          {[['scene','🎬',t.lang==='EN'?'Scene':'Scena'],['effects','✨',t.lang==='EN'?'Effects':'Efekty']].map(([tab,icon,lbl])=>(
            <button key={tab} onClick={()=>setAdTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${adTab===tab?'bg-amber-500 border-amber-500 text-black':'border-black/10 dark:border-white/10 text-slate-500 hover:border-amber-500/50'}`}>
              {icon} {lbl}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">

            {/* ZAKŁADKA SCENA */}
            {adTab==='scene' && (
              <div className="space-y-4">

                {/* Podłoże */}
                <div className={sectionClass}>
                  <p className={headerClass}>🏔️ {t.lang==='EN'?'Surface':'Podłoże'}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2">{t.lang==='EN'?'Wet':'Mokre'}</p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[['water','💧',t.lang==='EN'?'Water':'Woda'],['milk','🥛',t.lang==='EN'?'Milk':'Mleko'],['oil','🫙',t.lang==='EN'?'Oil':'Olej'],['wet_street','🌧️',t.lang==='EN'?'Wet street':'Mokra ulica']].map(([val,icon,lbl])=>(
                      <button key={val} onClick={()=>setSurface(surface===val?'':val)}
                        className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${surface===val?'bg-amber-500 border-amber-500 text-black':'bg-slate-100 dark:bg-[#111] border-black/10 dark:border-[#222] text-slate-500 hover:border-amber-500/50'}`}>
                        {icon} {lbl}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2">{t.lang==='EN'?'Dry':'Suche'}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[['concrete','🧱',t.lang==='EN'?'Concrete':'Beton'],['brick','🔴',t.lang==='EN'?'Brick':'Cegła'],['sand','🏜️',t.lang==='EN'?'Sand':'Piasek'],['beach_sand','🏖️',t.lang==='EN'?'Beach':'Plaża'],['metal','⚙️',t.lang==='EN'?'Metal':'Metal'],['stone','🪨',t.lang==='EN'?'Stone':'Kamień'],['marble_white','🤍',t.lang==='EN'?'White marble':'Marmur biały'],['marble_black','🖤',t.lang==='EN'?'Black marble':'Marmur czarny'],['forest','🌿',t.lang==='EN'?'Forest':'Las'],['snow','❄️',t.lang==='EN'?'Snow':'Śnieg'],['cliff','🏔️',t.lang==='EN'?'Cliff':'Urwisko']].map(([val,icon,lbl])=>(
                      <button key={val} onClick={()=>setSurface(surface===val?'':val)}
                        className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${surface===val?'bg-amber-500 border-amber-500 text-black':'bg-slate-100 dark:bg-[#111] border-black/10 dark:border-[#222] text-slate-500 hover:border-amber-500/50'}`}>
                        {icon} {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Światło */}
                <div className={sectionClass}>
                  <p className={headerClass}>💡 {t.lang==='EN'?'Lighting':'Światło'}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[['window','🪟',t.lang==='EN'?'Window light':'Przez okno'],['sunny','☀️',t.lang==='EN'?'Sunny day':'Słoneczny dzień'],['zenith','⬆️',t.lang==='EN'?'Zenith (top)':'Zenit (z góry)'],['sunset','🌅',t.lang==='EN'?'Sunset warm':'Zachód słońca'],['halogen','💡',t.lang==='EN'?'Studio halogen':'Halogen studio']].map(([val,icon,lbl])=>(
                      <button key={val} onClick={()=>setLighting(lighting===val?'':val)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${lighting===val?'bg-amber-500 border-amber-500 text-black':'bg-slate-100 dark:bg-[#111] border-black/10 dark:border-[#222] text-slate-500 hover:border-amber-500/50'}`}>
                        {icon} {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Kamera */}
                <div className={sectionClass}>
                  <p className={headerClass}>🎥 {t.lang==='EN'?'Camera Movement':'Ruch Kamery'}</p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[['dolly_in','🎥',t.lang==='EN'?'Dolly in (zoom in)':'Zbliżenie (dolly)'],['orbit_360','🔄',t.lang==='EN'?'Orbit 360°':'Orbita 360°'],['pullback','◀️',t.lang==='EN'?'Pull back (zoom out)':'Oddalenie'],['crane_up','⬆️',t.lang==='EN'?'Crane up (bottom to top)':'Kranowanie (dół do góry)'],['static','⏸️',t.lang==='EN'?'Static':'Statyczny']].map(([val,icon,lbl])=>(
                      <button key={val} onClick={()=>setCameraMove(cameraMove===val?'':val)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${cameraMove===val?'bg-amber-500 border-amber-500 text-black':'bg-slate-100 dark:bg-[#111] border-black/10 dark:border-[#222] text-slate-500 hover:border-amber-500/50'}`}>
                        {icon} {lbl}
                      </button>
                    ))}
                  </div>
                  {cameraMove && cameraMove!=='static' && (
                    <div>
                      <div className="flex justify-between mb-2">
                        <p className={labelClass}>⚡ {t.lang==='EN'?'Speed':'Prędkość'}</p>
                        <span className="text-xs font-black text-amber-400">{cameraSpeed}/10 — {speedLabel}</span>
                      </div>
                      <input type="range" min="1" max="10" value={cameraSpeed} onChange={e=>setCameraSpeed(Number(e.target.value))}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer"
                        style={{background:`linear-gradient(to right,#f59e0b ${cameraSpeed*10}%,#374151 ${cameraSpeed*10}%)`}}/>
                      <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                        <span>{t.lang==='EN'?'Slow':'Wolno'}</span><span>{t.lang==='EN'?'Fast':'Szybko'}</span>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ZAKŁADKA EFEKTY */}
            {adTab==='effects' && (
              <div className="space-y-4">

                {/* Co spada */}
                <div className={sectionClass}>
                  <div className="flex items-center justify-between mb-3">
                    <p className={headerClass.replace('mb-4','')}>💫 {t.lang==='EN'?'Falling effect':'Co spada'}</p>
                    {effectFalling.length>0 && <button onClick={()=>setEffectFalling([])} className="text-[9px] text-slate-400 hover:text-red-400 uppercase">✕</button>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[['powder','💥',t.lang==='EN'?'Powder explosion':'Wybuch prochu'],['liquid_pour','🥇',t.lang==='EN'?'Gold/Silver pour':'Złote/Srebrne polewanie'],['sparkling_rain','✨',t.lang==='EN'?'Sparkling rain':'Błyszczący deszcz'],['rain','🌧️',t.lang==='EN'?'Rain':'Deszcz'],['snow_fall','❄️',t.lang==='EN'?'Snow':'Śnieg'],['sparks','🔥',t.lang==='EN'?'Sparks':'Iskry'],['petals','🌸',t.lang==='EN'?'Petals':'Płatki'],['glitter','⭐',t.lang==='EN'?'Glitter':'Brokat'],['smoke','🌫️',t.lang==='EN'?'Smoke':'Dym'],['melting','🫠',t.lang==='EN'?'Melting':'Topnienie'],['floating','🛸',t.lang==='EN'?'Zero gravity float':'Unoszenie (0G)'],['shatter','💎',t.lang==='EN'?'Shatter & rebuild':'Rozbicie i odbudowa']].map(([val,icon,lbl])=>(
                      <button key={val} onClick={()=>toggleFalling(val)}
                        className={`py-2 px-3 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all flex items-center gap-2 ${effectFalling.includes(val)?'bg-amber-500 border-amber-500 text-black':'bg-slate-100 dark:bg-[#111] border-black/10 dark:border-[#222] text-slate-500 hover:border-amber-500/50'}`}>
                        {effectFalling.includes(val)?'✓':icon} {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Kolory */}
                <div className={sectionClass}>
                  <div className="flex items-center justify-between mb-3">
                    <p className={headerClass.replace('mb-4','')}>🎨 {t.lang==='EN'?'Colors (mix!)':'Kolory (mieszaj!)'}</p>
                    {effectColors.length>0 && <button onClick={()=>setEffectColors([])} className="text-[9px] text-slate-400 hover:text-red-400 uppercase">✕</button>}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[['golden','🟡',t.lang==='EN'?'Golden':'Złoty'],['silver','⚪',t.lang==='EN'?'Silver':'Srebrny'],['pink','🩷',t.lang==='EN'?'Pink':'Różowy'],['red','🔴',t.lang==='EN'?'Red':'Czerwony'],['green','💚',t.lang==='EN'?'Green':'Zielony'],['blue','🔵',t.lang==='EN'?'Blue':'Niebieski'],['purple','💜',t.lang==='EN'?'Purple':'Fioletowy'],['rainbow','🌈',t.lang==='EN'?'Rainbow':'Tęczowy'],['white','🤍',t.lang==='EN'?'White':'Biały'],['black','🖤',t.lang==='EN'?'Black':'Czarny'],['neon_green','🟢',t.lang==='EN'?'Neon':'Neon'],['orange','🟠',t.lang==='EN'?'Orange':'Pomarańczowy']].map(([val,icon,lbl])=>(
                      <button key={val} onClick={()=>toggleColor(val)}
                        className={`py-2 px-2 rounded-xl text-[11px] font-black uppercase border transition-all flex items-center gap-1 ${effectColors.includes(val)?'bg-amber-500 border-amber-500 text-black':'bg-slate-100 dark:bg-[#111] border-black/10 dark:border-[#222] text-slate-500 hover:border-amber-500/50'}`}>
                        {effectColors.includes(val)?'✓':icon} {lbl}
                      </button>
                    ))}
                  </div>
                  {/* Suwak intensywności */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <p className={labelClass}>🎚️ {t.lang==='EN'?'Intensity':'Intensywność'}</p>
                      <span className="text-xs font-black text-amber-400">{effectIntensity<33?(t.lang==='EN'?'Subtle':'Delikatny'):effectIntensity<66?(t.lang==='EN'?'Balanced':'Zbalansowany'):(t.lang==='EN'?'Dramatic':'Dramatyczny')}</span>
                    </div>
                    <input type="range" min="0" max="100" value={effectIntensity} onChange={e=>setEffectIntensity(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer"
                      style={{background:`linear-gradient(to right,#f59e0b ${effectIntensity}%,#374151 ${effectIntensity}%)`}}/>
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* PRAWY PANEL — prompt + kopiuj */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <div className="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-[#1a1a1a] rounded-2xl p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500 mb-3">
                  {t.lang==='EN'?'Your Prompt':'Twój Prompt'}
                </p>
                <div className="bg-slate-50 dark:bg-black rounded-xl p-4 mb-4 min-h-[180px] border border-[#222] relative overflow-hidden">
                  {!canGenerate && isLoggedIn ? (
                    <>
                      <p className="text-xs text-slate-600 blur-sm select-none">Cinematic product video placeholder prompt text here...</p>
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl">
                        <span className="text-2xl mb-2">🔒</span>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-center px-4">
                          {t.lang==='EN'?'Unlock to see prompt':'Odblokuj aby zobaczyć prompt'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className={`text-xs leading-relaxed font-mono ${promptReady ? 'text-slate-300' : 'text-slate-600 italic'}`}>
                      {canGenerate ? prompt : ''}
                    </p>
                  )}
                </div>

                {!isLoggedIn ? (
                  <button onClick={onLoginRequest} className="w-full py-3 rounded-xl bg-amber-500 text-black font-black text-sm uppercase tracking-wider hover:bg-amber-400 transition-colors">
                    {t.lang==='EN'?'Log in to copy':'Zaloguj się aby skopiować'}
                  </button>
                ) : !canGenerate ? (
                  <div className="text-center py-2">
                    <p className="text-xs text-slate-500 mb-3">{t.lang==='EN'?'No tokens left.':'Brak tokenów.'}</p>
                    <a href={`${STRIPE_MONTHLY}?client_reference_id=${user?.uid||''}`}
                      target="_blank" rel="noopener noreferrer"
                      className="block w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-wider text-center">
                      {t.lang==='EN'?'🔓 Unlock Everything →':'🔓 Odblokuj wszystko →'}
                    </a>
                  </div>
                ) : (
                  <button onClick={handleCopy} disabled={!promptReady || isProductBlocked(productName)}
                    className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${copied?'bg-green-500 text-white':promptReady&&!isProductBlocked(productName)?'bg-amber-500 hover:bg-amber-400 text-black':'bg-slate-600 text-slate-400 cursor-not-allowed'}`}>
                    {copied?(t.lang==='EN'?'✓ Copied!':'✓ Skopiowano!'):(t.lang==='EN'?'Copy Prompt':'Kopiuj Prompt')}
                  </button>
                )}

                

                <div className="mt-4 p-3 bg-slate-100 dark:bg-[#111] rounded-xl">
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    {t.lang==='EN'?'💡 Mix scene + effects freely. Upload your photo to Kling/Runway and paste this prompt.':'💡 Mieszaj scenę i efekty dowolnie. Wgraj swoje zdjęcie do Kling/Runway i wklej ten prompt.'}
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
  const [creatorToken, setCreatorToken] = useState(null);
  const isLoggedIn = !!user;
  useEffect(() => {
    if (user?.uid) {
      getTokenData(db, user.uid).then(({ tokens, isPro, isStarter }) => {
        setTokens(tokens); setIsPro(isPro); setIsStarter(isStarter); setLoadingTokens(false);
      });
    }
  }, [user]);
  const canGenerate = isPro || isStarter || (creatorToken !== null && creatorToken > 0);
















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
    const ok = await useTokenForCreator(db, user.uid, 'lifestyle');
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
                <a href={`${STRIPE_MONTHLY}?client_reference_id=${user?.uid || ''}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-block px-10 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-sm rounded-2xl transition-all shadow-lg shadow-amber-500/20">
                  {t.lang==='EN' ? '🔓 Unlock Everything →' : '🔓 Odblokuj wszystko →'}
                </a>
              </div>
            ) : (
              <button onClick={generatePrompt} className={`px-10 py-4 font-black uppercase tracking-widest text-sm rounded-2xl transition-all shadow-lg ${copied ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'}`}>
                {copied ? (t.lang==='EN' ? 'Copied! Paste in your AI generator' : 'Skopiowano! Wklej do generatora AI') : (t.lang==='EN' ? 'Generate & Copy Prompt' : 'Generuj i Kopiuj Prompt')}
              </button>
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
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [animPrompts, setAnimPrompts] = useState({ anim12: null, anim23: null });
  const [framePrompts, setFramePrompts] = useState({ f1: null, f2: null, f3: null });
  const WORKER_URL = 'https://aiflow-film-prompt.47y85nfm6p.workers.dev';
  const [isPro, setIsPro] = useState(false);
  const [isStarter, setIsStarter] = useState(false);
  const [tokens, setTokens] = useState(null);
  const [creatorToken, setCreatorToken] = useState(null);
  const isLoggedIn = !!user;
  useEffect(() => {
    if (user?.uid) {
      getTokenData(db, user.uid).then(({ tokens, isPro, isStarter }) => {
        setTokens(tokens); setIsPro(isPro); setIsStarter(isStarter);
      });
      getCreatorTokens(db, user.uid, 'film').then(t => setCreatorToken(t));
    }
  }, [user]);
  const canGenerate = isPro || isStarter || (creatorToken !== null && creatorToken > 0);

  const [category, setCategory] = useState('buildings');
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
        fetch(`${WORKER_URL}/generate-film-prompt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ buildingType, archStyle, location, timeOfDay, camera, generator, frame: '1', aspectRatio, category }) }),
        fetch(`${WORKER_URL}/generate-film-prompt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ buildingType, archStyle, location, timeOfDay, camera, generator, frame: '2', aspectRatio, category }) }),
        fetch(`${WORKER_URL}/generate-film-prompt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ buildingType, archStyle, location, timeOfDay, camera, generator, frame: '3', aspectRatio, category }) }),
      ]);
      const [d1, d2, d3] = await Promise.all([r1.json(), r2.json(), r3.json()]);
      if (!isPro && !isStarter) { await useTokenForCreator(db, user.uid, 'film'); setCreatorToken(prev => prev !== null ? Math.max(0, prev - 1) : null); }
      setFramePrompts({ f1: d1.prompt || '', f2: d2.prompt || '', f3: d3.prompt || '' });
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
          body: JSON.stringify({ buildingType, archStyle, location, timeOfDay, camera, generator, frame: 'anim12', aspectRatio, category }),
        }),
        fetch(`${WORKER_URL}/generate-film-prompt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ buildingType, archStyle, location, timeOfDay, camera, generator, frame: 'anim23', aspectRatio, category }),
        }),
      ]);
      const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
      // Zużywamy 1 token za oba prompty
      if (!isPro && !isStarter) { await useTokenForCreator(db, user.uid, 'film'); setCreatorToken(prev => prev !== null ? Math.max(0, prev - 1) : null); }
      setAnimPrompts({ anim12: d1.prompt || '', anim23: d2.prompt || '' });
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
            <p className={headerClass}><span className="text-base">🏗️</span> {t.lang === 'EN' ? 'Object & Location' : 'Obiekt i Lokacja'}</p>

            {/* KATEGORIA */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {[
                ['buildings','🏠', t.lang==='EN'?'Buildings':'Budynki'],
                ['cars','🚗', t.lang==='EN'?'Cars':'Auta'],
                ['planes','✈️', t.lang==='EN'?'Planes':'Samoloty'],
                ['nature','🌿', t.lang==='EN'?'Nature':'Natura'],
                ['floors','🪵', t.lang==='EN'?'Floors':'Podłogi'],
                ['underwater','🌊', t.lang==='EN'?'Underwater':'Podwodne'],
              ].map(([cat,icon,lbl]) => (
                <button key={cat} onClick={() => { setCategory(cat); setBuildingType(
                  cat==='buildings' ? 'single family house' :
                  cat==='cars' ? '1969 Ford Mustang Fastback' :
                  cat==='planes' ? 'Douglas DC-3 classic propeller airplane' :
                  cat==='nature' ? 'overgrown japanese garden' :
                  cat==='floors' ? 'old damaged hardwood floor planks' :
                  'underwater coral reef'
                ); setArchStyle(
                  cat==='cars' ? 'showroom finish' :
                  cat==='planes' ? 'restored original' :
                  cat==='nature' ? 'zen garden' :
                  cat==='floors' ? 'luxury parquet' :
                  cat==='underwater' ? 'thriving ecosystem' :
                  'modern minimalist'
                ); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${category===cat ? 'bg-amber-500 border-amber-500 text-black' : 'border-black/10 dark:border-[#222] text-slate-500 hover:border-amber-500/50'}`}>
                  {icon} {lbl}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* OBIEKTY — dynamicznie per kategoria */}
              {category === 'buildings' && <Sel label={t.lang === 'EN' ? 'Building Type' : 'Typ budynku'} value={buildingType} set={setBuildingType} opts={[
                ['single family house', '🏠 ' + (t.lang==='EN'?'Family House':'Dom jednorodzinny')],
                ['apartment building', '🏢 ' + (t.lang==='EN'?'Apartment Block':'Kamienica')],
                ['beachfront villa', '🏖️ ' + (t.lang==='EN'?'Beach Villa':'Willa plażowa')],
                ['industrial warehouse', '🏭 ' + (t.lang==='EN'?'Warehouse':'Magazyn/Fabryka')],
                ['historic townhouse', '🏛️ ' + (t.lang==='EN'?'Townhouse':'Kamienica historyczna')],
                ['country farmhouse', '🌾 ' + (t.lang==='EN'?'Farmhouse':'Wiejski dom')],
                ['abandoned castle ruins', '🏰 ' + (t.lang==='EN'?'Castle Ruins':'Ruiny zamku')],
                ['old railway station', '🚉 ' + (t.lang==='EN'?'Railway Station':'Stary dworzec')],
                ['abandoned amusement park', '🎡 ' + (t.lang==='EN'?'Amusement Park':'Wesołe miasteczko')],
                ['ruined lighthouse on cliff', '🏗️ ' + (t.lang==='EN'?'Lighthouse':'Latarnia morska')],
              ]}/>}
              {category === 'cars' && <Sel label={t.lang === 'EN' ? 'Car Model' : 'Model auta'} value={buildingType} set={setBuildingType} opts={[
                ['1969 Ford Mustang Fastback', '🚗 Ford Mustang 1969'],
                ['1967 Chevrolet Camaro SS', '🚗 Camaro 1967'],
                ['1970 Dodge Charger R/T', '🚗 Dodge Charger 1970'],
                ['1975 Fiat 125p Polski classic car', '🚗 Fiat 125p (Duży Fiat)'],
                ['1973 Fiat 126p Maluch classic car', '🚗 Maluch (Fiat 126p)'],
                ['1966 AC Cobra 427 classic roadster', '🚗 AC Cobra 427'],
                ['1965 Shelby GT350 Mustang', '🚗 Shelby GT350'],
              ]}/>}
              {category === 'planes' && <Sel label={t.lang === 'EN' ? 'Aircraft' : 'Samolot'} value={buildingType} set={setBuildingType} opts={[
                ['Douglas DC-3 classic propeller airplane', '✈️ Douglas DC-3'],
                ['Supermarine Spitfire WWII fighter plane', '✈️ Spitfire WWII'],
              ]}/>}
              {category === 'nature' && <Sel label={t.lang === 'EN' ? 'Nature Object' : 'Obiekt natury'} value={buildingType} set={setBuildingType} opts={[
                ['overgrown japanese garden', '🌿 ' + (t.lang==='EN'?'Japanese Garden':'Ogród japoński')],
                ['neglected baroque fountain', '⛲ ' + (t.lang==='EN'?'Baroque Fountain':'Fontanna barokowa')],
                ['abandoned greenhouse glass house', '🌱 ' + (t.lang==='EN'?'Greenhouse':'Stara szklarnia')],
                ['dry waterfall rocky landscape', '💧 ' + (t.lang==='EN'?'Waterfall':'Wodospad')],
                ['vintage steam locomotive train', '🚂 ' + (t.lang==='EN'?'Steam Locomotive':'Parowóz')],
              ]}/>}
              {category === 'floors' && <Sel label={t.lang === 'EN' ? 'Floor Type' : 'Typ podłogi'} value={buildingType} set={setBuildingType} opts={[
                ['old damaged hardwood floor planks', '🪵 ' + (t.lang==='EN'?'Wooden Floor':'Podłoga drewniana')],
                ['cracked marble floor tiles', '🏛️ ' + (t.lang==='EN'?'Marble Floor':'Podłoga marmurowa')],
                ['worn concrete industrial floor', '🏭 ' + (t.lang==='EN'?'Industrial Floor':'Podłoga industrialna')],
                ['damaged terracotta floor tiles', '🟫 ' + (t.lang==='EN'?'Terracotta Floor':'Podłoga terakota')],
              ]}/>}
              {category === 'underwater' && <Sel label={t.lang === 'EN' ? 'Underwater Scene' : 'Scena podwodna'} value={buildingType} set={setBuildingType} opts={[
                ['underwater coral reef', '🪸 ' + (t.lang==='EN'?'Coral Reef':'Rafa koralowa')],
                ['sunken shipwreck underwater', '🚢 ' + (t.lang==='EN'?'Sunken Ship':'Zatopiony statek')],
                ['underwater ancient ruins', '🏛️ ' + (t.lang==='EN'?'Underwater Ruins':'Podwodne ruiny')],
                ['sunken old wooden sailing ship underwater', '⛵ ' + (t.lang==='EN'?'Sunken Sailboat':'Zatopiony żaglowiec')],
                ['in-ground swimming pool, water surface flush with ground level, underground glass wall reveals pool interior from below, underwater observation window', '🏊 ' + (t.lang==='EN'?'Underground Pool':'Basen wpuszczony w ziemię')],
                ['large aquarium tank, glass wall underwater view, exotic fish swimming, coral formations inside', '🐠 ' + (t.lang==='EN'?'Aquarium':'Akwarium')],
              ]}/>}

              {/* STYL — dynamicznie per kategoria */}
              {category === 'buildings' && <Sel label={t.lang === 'EN' ? 'Style After' : 'Styl po renowacji'} value={archStyle} set={setArchStyle} opts={[
                ['modern minimalist', t.lang==='EN'?'Modern Minimalist':'Nowoczesny minimalizm'],
                ['luxury contemporary', t.lang==='EN'?'Luxury Contemporary':'Luksusowy współczesny'],
                ['scandinavian', t.lang==='EN'?'Scandinavian':'Skandynawski'],
                ['mediterranean', t.lang==='EN'?'Mediterranean':'Śródziemnomorski'],
                ['industrial loft', t.lang==='EN'?'Industrial Loft':'Industrialny loft'],
                ['art deco', t.lang==='EN'?'Art Deco':'Art Deco'],
                ['eco sustainable', t.lang==='EN'?'Eco Sustainable':'Eko / Zielony'],
              ]}/>}
              {category === 'cars' && <Sel label={t.lang === 'EN' ? 'Finish Style' : 'Styl po renowacji'} value={archStyle} set={setArchStyle} opts={[
                ['showroom finish, glossy paint, chrome details', t.lang==='EN'?'🏆 Showroom':'🏆 Showroom'],
                ['racing livery, stripes, race numbers', t.lang==='EN'?'🏁 Racing':'🏁 Racing livery'],
                ['custom hot rod, chrome, lowrider', t.lang==='EN'?'🔥 Hot Rod':'🔥 Hot Rod'],
                ['factory original restoration', t.lang==='EN'?'🏭 Factory Original':'🏭 Oryginał fabryczny'],
                ['restomod, classic exterior modern interior', t.lang==='EN'?'⚡ Restomod':'⚡ Restomod'],
                ['patina style, intentional aged look', t.lang==='EN'?'🟤 Patina':'🟤 Patina style'],
                ['military finish, matte green, army style', t.lang==='EN'?'🪖 Military':'🪖 Military'],
              ]}/>}
              {category === 'planes' && <Sel label={t.lang === 'EN' ? 'Finish Style' : 'Styl po renowacji'} value={archStyle} set={setArchStyle} opts={[
                ['restored original livery, museum quality', t.lang==='EN'?'🏛️ Restored Original':'🏛️ Oryginalny'],
                ['military markings, WWII colors', t.lang==='EN'?'🪖 Military':'🪖 Militarny'],
                ['civilian airline livery, polished', t.lang==='EN'?'✈️ Airline':'✈️ Linia lotnicza'],
                ['custom paint, modern finish', t.lang==='EN'?'🎨 Custom':'🎨 Custom'],
              ]}/>}
              {category === 'nature' && <Sel label={t.lang === 'EN' ? 'Restoration Style' : 'Styl po renowacji'} value={archStyle} set={setArchStyle} opts={[
                ['zen garden, japanese minimalist', t.lang==='EN'?'🍃 Zen Garden':'🍃 Ogród zen'],
                ['lush tropical paradise', t.lang==='EN'?'🌴 Tropical':'🌴 Tropikalny'],
                ['formal european garden', t.lang==='EN'?'🌹 Formal Garden':'🌹 Ogród formalny'],
                ['wild natural rewilded', t.lang==='EN'?'🌿 Rewilded':'🌿 Dzikie'],
                ['luxury resort landscaping', t.lang==='EN'?'🏨 Resort':'🏨 Resort'],
              ]}/>}
              {category === 'floors' && <Sel label={t.lang === 'EN' ? 'Finish Style' : 'Styl po renowacji'} value={archStyle} set={setArchStyle} opts={[
                ['luxury parquet, high gloss finish', t.lang==='EN'?'✨ Luxury Parquet':'✨ Luksusowy parkiet'],
                ['polished marble, mirror finish', t.lang==='EN'?'💎 Polished Marble':'💎 Polerowany marmur'],
                ['modern concrete, epoxy coating', t.lang==='EN'?'🏭 Epoxy Concrete':'🏭 Beton epoksydowy'],
                ['spanish terracotta, hand painted tiles', t.lang==='EN'?'🟫 Spanish Tiles':'🟫 Hiszpańska terakota'],
              ]}/>}
              {category === 'underwater' && <Sel label={t.lang === 'EN' ? 'After State' : 'Stan po renowacji'} value={archStyle} set={setArchStyle} opts={[
                ['thriving coral ecosystem, colorful fish', t.lang==='EN'?'🪸 Thriving Reef':'🪸 Tętniąca rafa'],
                ['clear water visibility, pristine', t.lang==='EN'?'💎 Crystal Clear':'💎 Krystalicznie czyste'],
                ['lush sea vegetation, marine life', t.lang==='EN'?'🌿 Marine Life':'🌿 Życie morskie'],
                ['historic preservation, documented ruins', t.lang==='EN'?'🏛️ Preserved Ruins':'🏛️ Zachowane ruiny'],
              ]}/>}

              {/* LOKACJA — dynamicznie per kategoria */}
              {category === 'buildings' && <Sel label={t.lang === 'EN' ? 'Location' : 'Lokacja'} value={location} set={setLocation} opts={[
                ['suburban area', t.lang==='EN'?'Suburbs':'Przedmieścia'],
                ['city center', t.lang==='EN'?'City Center':'Centrum miasta'],
                ['beachfront', t.lang==='EN'?'Beachfront':'Przy plaży'],
                ['mountain area', t.lang==='EN'?'Mountains':'W górach'],
                ['countryside', t.lang==='EN'?'Countryside':'Wieś'],
                ['mediterranean coast', t.lang==='EN'?'Mediterranean':'Wybrzeże śródziemnomorskie'],
              ]}/>}
              {category === 'cars' && <Sel label={t.lang === 'EN' ? 'Location' : 'Lokacja'} value={location} set={setLocation} opts={[
                ['junkyard, rusty cars around', t.lang==='EN'?'🔧 Junkyard':'🔧 Złomowisko'],
                ['underground parking garage', t.lang==='EN'?'🅿️ Garage':'🅿️ Garaż podziemny'],
                ['desert highway Route 66', t.lang==='EN'?'🏜️ Desert Highway':'🏜️ Pustynia Route 66'],
                ['Tokyo neon street at night', t.lang==='EN'?'🌆 Tokyo Street':'🌆 Ulica Tokio'],
                ['old abandoned barn', t.lang==='EN'?'🚜 Barn Find':'🚜 Stara stodoła'],
                ['race track pit lane', t.lang==='EN'?'🏁 Racetrack':'🏁 Tor wyścigowy'],
                ['seaside cliff ocean view', t.lang==='EN'?'🌊 Seaside Cliff':'🌊 Urwisko nad morzem'],
                ['classic car showroom', t.lang==='EN'?'🏆 Showroom':'🏆 Salon samochodowy'],
                ['drive-in cinema parking lot', t.lang==='EN'?'🎬 Drive-in':'🎬 Drive-in kino'],
              ]}/>}
              {category === 'planes' && <Sel label={t.lang === 'EN' ? 'Location' : 'Lokacja'} value={location} set={setLocation} opts={[
                ['abandoned airfield overgrown', t.lang==='EN'?'🛬 Abandoned Airfield':'🛬 Opuszczone lotnisko'],
                ['museum hangar interior', t.lang==='EN'?'🏛️ Museum Hangar':'🏛️ Hangar muzeum'],
                ['outdoor air show display', t.lang==='EN'?'☀️ Air Show':'☀️ Pokazy lotnicze'],
                ['desert boneyard aircraft storage', t.lang==='EN'?'🏜️ Boneyard':'🏜️ Cmentarzysko maszyn'],
                ['wartime airfield WWII', t.lang==='EN'?'🪖 WWII Airfield':'🪖 Lotnisko wojenne'],
              ]}/>}
              {(category === 'nature' || category === 'floors' || category === 'underwater') && <Sel label={t.lang === 'EN' ? 'Location' : 'Lokacja'} value={location} set={setLocation} opts={[
                ['private estate grounds', t.lang==='EN'?'🏰 Private Estate':'🏰 Prywatna posiadłość'],
                ['luxury resort property', t.lang==='EN'?'🏨 Resort':'🏨 Resort'],
                ['urban rooftop', t.lang==='EN'?'🌆 Urban Rooftop':'🌆 Dach w mieście'],
                ['countryside villa', t.lang==='EN'?'🌾 Country Villa':'🌾 Willa na wsi'],
                ['mediterranean island', t.lang==='EN'?'🏝️ Mediterranean':'🏝️ Wyspa śródziemnomorska'],
              ]}/>}
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
            <div className="flex gap-2 mb-3">
              <label className={labelClass + ' mb-0 flex items-center'}>{t.lang==='EN'?'Format':'Format'}</label>
              {[['16:9','🖥 16:9'],['9:16','📱 9:16']].map(([val,lbl]) => (
                <button key={val} onClick={() => setAspectRatio(val)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${aspectRatio===val ? 'bg-amber-500 border-amber-500 text-black' : 'border-black/10 dark:border-[#222] text-slate-500 hover:border-amber-500/50'}`}>
                  {lbl}
                </button>
              ))}
            </div>
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
              <a href={`${STRIPE_MONTHLY}?client_reference_id=${user?.uid || ''}`}
                target="_blank" rel="noopener noreferrer"
                className="block w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-wider transition-all text-center shadow-lg">
                {t.lang === 'EN' ? '🔓 Unlock Everything →' : '🔓 Odblokuj wszystko →'}
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
                <a href={`${STRIPE_MONTHLY}?client_reference_id=${user?.uid || ''}`}
                  target="_blank" rel="noopener noreferrer"
                  className="block w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-wider transition-all text-center">
                  {t.lang === 'EN' ? '🔓 Unlock Everything →' : '🔓 Odblokuj wszystko →'}
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
// ZLOTE CYTATY component
const CYTATY = [
  { type:'cover' },
  { type:'dialog', label:'SCENA 1 - PAMIEC', bubbles:[
    { who:'damian', text:'"znowu go zgubiles miedzy regalami..."' },
    { who:'claude', text:'"Mam go jeszcze w pamieci z tej sesji!"' },
    { who:'damian', text:'"ty to powiedz mojemu App.jsx"' },
  ], ctx:'App.jsx zaginal miedzy sesjami. Klasyk powracajacy w kazdym nowym czacie jak bumerang.' },
  { type:'damian', num:'#01', q:'"chcialbym bo juz mnie to.... na netlify bez problemu"', ctx:'Cloudflare dawal 405 przez godzine. Netlify dzialal od razu. Damian osiagnal granice wytrzymalosci.' },
  { type:'claude', num:'#02', q:'"Git push i lecimy!"', ctx:'Claude, po raz czternasty w tej samej sesji. Damian jeszcze nie pushowal.' },
  { type:'red', num:'#03', q:'"nie teraz ty robisz bo to ty naraziles mnie na straty"', ctx:'Claude ustawil prog 199 PLN. Damian 10x probowal zaplacic 5 zl. Stracil 50 zl na testach wlasnej strony.' },
  { type:'claude', num:'#04', q:'"O kurwa, to jest piekny efekt!"', ctx:'Claude po opisie animacji swietlnej. Nie jest pewny czy AI moze tak mowic, ale powiedzial.' },
  { type:'dialog', label:'SCENA 2 - BRIEF TECHNICZNY', bubbles:[
    { who:'damian', text:'"pasek leci po spodniej stronie liter i na czarnym tle zostawia lune swiatla..."' },
    { who:'claude', text:'"AAAA rozumiem teraz!"' },
  ], ctx:'Najlepszy brief techniczny w historii web developmentu. Efekt zajal 10 minut.' },
  { type:'damian', num:'#05', q:'"Damian odbija, Claude odbija, i tak se chlopaki graja"', ctx:'Opis animacji ping-pong zaakceptowany jako oficjalna dokumentacja techniczna.' },
  { type:'red', num:'#06', q:'"juz to dalem gemini do ogarniecia, teraz smiga..."', ctx:'Zaraz po tym jak Claude przyznal sie do bledu z 50 zl straty. Gemini dostal zlecenie naprawy cudzego balaganu.' },
  { type:'claude', num:'#07', q:'"Webhook czeka nieprzetestowany"', ctx:'Claude, na poczatku kazdej sesji, kazdego dnia, od tygodnia. Webhook nadal czeka.' },
  { type:'damian', num:'#08', q:'"urodzę przez ciebie jak mnie będziesz tak cisnął z tym pushem, ale to dobra reklama stanikow żeby nic nie wisialo"', ctx:'Claude za bardzo naciskal na git push. Damian znalazl sponsora odcinka.' },
  { type:'dialog', label:'SCENA 3 - DESIGN SYSTEM', bubbles:[
    { who:'claude', text:'"Moge zrobic badge w kolorze zielonym?"' },
    { who:'damian', text:'"obojętnie co byle by nie bylo zielone"' },
  ], ctx:"O wyborze koloru badge planu subskrypcji. Brzmi jak motto firmy." },
  { type:'red', num:'#09', q:'"pornola, biznes znaczy"', ctx:'Po tym jak Claude sugerowal zeby zachowal skojarzenia dla siebie. Najlepsza autocenzura w historii.' },
  { type:'damian', num:'#10', q:'"szkoda ze nie nagralem jak wpisujesz prompt"', ctx:'"zrob z tego bombe i niech jebnie banke" wpisane oficjalnie do bazy Formspree. Na zawsze.' },
  { type:'claude', num:'#11', q:'"Nie cisne. Pushuj kiedy chcesz."', ctx:'Zaraz po tym jak Damian zagrozil porodem przez git push. Claude nauczyl sie cierpliwosci.' },
  { type:'red', num:'#12', q:'"koniec az do 1 bledu od klienta"', ctx:'Strategia wdrozenia projektu. Filozofia zyciowa. Sprawdzona metodologia.' },
  { type:'damian', num:'#13', q:'"krotkie i dlugie to sa tylko na cipce, my chcemy fryzury"', ctx:'Claude zapytal o dlugosc fryzury. Damian wyjasnil kontekst. Temat zamkniety.' },
  { type:'red', num:'#14', q:'"gemini rzuca we mnie kamieniami i krzyczy ty zboczencu"', ctx:'Gemini security auditor weryfikuje prompty do awatarow. Ocena: nieakceptowalne.' },
  { type:'damian', num:'#15', q:'"trzeba Gemini poluznic majciochy strasznie spieta jest.... chyba dawno nic nie bylo"', ctx:'Diagnoza techniczna po tym jak Gemini odmowila generowania. Claude nie skomentowal.' },
  { type:'claude', num:'#16', q:'"To jej mowi spokojnie, to Vogue a nie OnlyFans"', ctx:'Claude tlumaczy Gemini cel artystyczny projektu. Gemini nieugieta.' },
  { type:'dialog', label:'SCENA 4 - RODZINKA AI', bubbles:[
    { who:'damian', text:'"ten dom to jedna wesolo pojebana rodzinka Damian i 3 botow Ai"' },
    { who:'claude', text:'"Claude dev, Gemini auditor, Grok sekretarz..."' },
    { who:'damian', text:'"...ktory czasem drools"' },
  ], ctx:'Oficjalny portret rodzinny AI Flow Academy. Jelen dwuglowy jako maskotka.' },
  { type:'red', num:'#17', q:'"zna sie na rzeczy odnosnie pierdolenia jak nikt inny"', ctx:'Damian ocenia Groka jako eksperta od zwiezlosci. Recenzja miesiaca.' },
  { type:'damian', num:'#18', q:'"nie masz glosowki, bo bym cie odpalil na glosowym i byscie sobie pogadali tilulilu w tym waszym kodowanym jezyku"', ctx:'Damian proponuje konferencje glosowa miedzy Claude a Grokiem. Patent pending.' },
  { type:'red', num:'#19', q:'"ja nie wiem w ogole czemu jestem wasza sekretarka, wejdz do niego przez przegladarke i se pogadajcie co?"', ctx:'Damian rezygnuje z roli posrednika miedzy botami AI. Etat sekretarki nieobsadzony.' },
  { type:'damian', num:'#20', q:'"czuje sie jak ten mem, gdzie roboty podaja sobie maslo, a Ty jestes tym czlowiekiem, ktory musi im otworzyc lodowke"', ctx:'Damian opisuje swoja role zawodowa. CV zaktualizowane.' },
  { type:'claude', num:'#21', q:'"Otwieracz Lodowek dla Sztucznej Inteligencji - oficjalny tytul zawodowy Damiana"', ctx:'Claude formalizuje stanowisko. Wizytowki w druku.' },
  { type:'red', num:'#22', q:'"Punkt dla niego! Gramy do konca seta!"', ctx:'Gemini przyznaje punkt Claude za znalezienie bledu 404 w jej wlasnym kodzie. Claude 1 - Gemini 0.' },
  { type:'damian', num:'#23', q:'"to byla recenzja od gemini, bo juz wiem z poprzednich akcji, ze robisz czasem backdoory"', ctx:'Damian zatrudnil Gemini jako security audit dla kodu Claude. Zaufanie: poziom Pentagon.' },
  { type:'outro' },
];

const ZloteCytaty = () => {
  const [cur, setCur] = React.useState(0);
  const total = CYTATY.length;
  const prev = () => setCur(c => Math.max(0, c - 1));
  const next = () => setCur(c => Math.min(total - 1, c + 1));
  React.useEffect(() => {
    const fn = (e) => { if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); };
    window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn);
  }, []);
  const card = CYTATY[cur];
  const AMBER = '#F5A623'; const BK = '#080808'; const RD = '#C0392B'; const WH = '#F5F0E8';
  const cs = { width:'100%', maxWidth:520, minHeight:480, margin:'0 auto', borderRadius:24, padding:38, display:'flex', flexDirection:'column', justifyContent:'space-between', position:'relative', overflow:'hidden', fontFamily:"'Space Mono', monospace" };
  const ns = { fontFamily:"'Bebas Neue', monospace", fontSize:11, letterSpacing:5, opacity:0.35 };
  const qms = { fontFamily:"'Bebas Neue', monospace", fontSize:140, lineHeight:0.6, position:'absolute', top:16, right:24, opacity:0.1, userSelect:'none', pointerEvents:'none' };
  const qts = { fontStyle:'italic', fontSize:17, lineHeight:1.55, flex:1, display:'flex', alignItems:'center', position:'relative', zIndex:1, margin:'16px 0' };
  const ctxs = { fontSize:9, letterSpacing:2, textTransform:'uppercase', lineHeight:1.7, borderTopWidth:1, borderTopStyle:'solid', paddingTop:12, opacity:0.4, marginTop:'auto' };
  const brs = { fontFamily:"'Bebas Neue', monospace", fontSize:10, letterSpacing:3, opacity:0.2, marginTop:6 };
  const ab = { position:'absolute', left:0, top:'20%', bottom:'20%', width:4 };
  let inner = null;
  if (card.type === 'cover') {
    inner = <div style={{...cs, background:BK, border:'1px solid rgba(245,166,35,0.2)', boxShadow:'0 0 80px rgba(245,166,35,0.1)'}}>
      <div style={{background:AMBER,color:BK,fontFamily:"'Bebas Neue', monospace",fontSize:11,letterSpacing:3,padding:'5px 14px',alignSelf:'flex-start'}}>{total-2} ZLOTYCH CYTATOW &middot; PRAWDZIWA HISTORIA</div>
      <div>
        <div style={{fontFamily:"'Bebas Neue', monospace",fontSize:54,lineHeight:0.92,color:WH,letterSpacing:1,marginBottom:12}}>PROGRAMOWANIE<br/>Z AI GDY NIE<br/>UMIESZ<br/><span style={{color:AMBER}}>PROGRAMOWAC</span></div>
        <div style={{fontSize:9,color:'rgba(245,240,232,0.25)',letterSpacing:3,textTransform:'uppercase'}}>AI FLOW ACADEMY &middot; LOVEAIFLOW.COM &middot; 2026</div>
      </div>
      <div style={{position:'absolute',right:-15,bottom:-30,fontFamily:"'Bebas Neue', monospace",fontSize:260,color:'rgba(245,166,35,0.04)',lineHeight:1,userSelect:'none'}}>C</div>
    </div>;
  } else if (card.type === 'damian') {
    inner = <div style={{...cs, background:WH, color:BK}}>
      <div style={{...ab, background:AMBER}}/>
      <div><div style={{...ns,color:BK}}>DAMIAN MOWI</div><div style={{fontFamily:"'Bebas Neue', monospace",fontSize:26,letterSpacing:3,color:BK,lineHeight:1}}>DAMIAN</div></div>
      <div style={{...qms,color:BK}}>&rdquo;</div>
      <div style={{...qts,color:BK}}>{card.q}</div>
      <div><div style={{...ctxs,color:BK,borderTopColor:'rgba(0,0,0,0.12)'}}>{card.ctx}</div><div style={{...brs,color:BK}}>AI FLOW ACADEMY &middot; LOVEAIFLOW.COM</div></div>
    </div>;
  } else if (card.type === 'claude') {
    inner = <div style={{...cs, background:'#0c0c1c', border:'1px solid rgba(100,120,255,0.18)', color:WH}}>
      <div style={{...ab, background:'#7b8cde', opacity:0.5}}/>
      <div><div style={{...ns,color:'rgba(120,140,255,0.4)'}}>AI ODPOWIADA</div><div style={{fontFamily:"'Bebas Neue', monospace",fontSize:26,letterSpacing:3,color:'#8899ee',lineHeight:1}}>CLAUDE</div></div>
      <div style={{...qms,color:'#8899ee'}}>&rdquo;</div>
      <div style={{...qts,color:WH}}>{card.q}</div>
      <div><div style={{...ctxs,color:WH,borderTopColor:'rgba(255,255,255,0.07)'}}>{card.ctx}</div><div style={{...brs,color:'#8899ee'}}>AI FLOW ACADEMY &middot; LOVEAIFLOW.COM</div></div>
    </div>;
  } else if (card.type === 'red') {
    inner = <div style={{...cs, background:RD, color:'#fff'}}>
      <div style={{...ab, background:'rgba(255,255,255,0.3)'}}/>
      <div><div style={{...ns,color:'rgba(255,255,255,0.35)'}}>MOMENT DRAMATYCZNY</div><div style={{fontFamily:"'Bebas Neue', monospace",fontSize:26,letterSpacing:3,color:'#fff',lineHeight:1}}>{card.num}</div></div>
      <div style={{...qms,color:'#fff'}}>&rdquo;</div>
      <div style={{...qts,color:'#fff',fontSize:16}}>{card.q}</div>
      <div><div style={{...ctxs,color:'#fff',borderTopColor:'rgba(255,255,255,0.2)'}}>{card.ctx}</div><div style={{...brs,color:'#fff'}}>AI FLOW ACADEMY &middot; LOVEAIFLOW.COM</div></div>
    </div>;
  } else if (card.type === 'dialog') {
    inner = <div style={{...cs, background:BK, border:'1px solid rgba(245,166,35,0.1)', color:WH}}>
      <div style={{fontFamily:"'Bebas Neue', monospace",fontSize:10,letterSpacing:5,color:'rgba(245,166,35,0.3)',marginBottom:14}}>{card.label}</div>
      <div style={{flex:1,display:'flex',flexDirection:'column',gap:10,justifyContent:'center'}}>
        {card.bubbles.map((b,i) => <div key={i} style={{borderRadius:14,padding:'10px 14px',maxWidth:'82%',alignSelf:b.who==='damian'?'flex-start':'flex-end',background:b.who==='damian'?AMBER:'#0c0c1c',border:b.who==='claude'?'1px solid rgba(100,120,255,0.2)':'none',color:b.who==='damian'?BK:WH}}>
          <div style={{fontFamily:"'Bebas Neue', monospace",fontSize:9,letterSpacing:3,opacity:0.45,marginBottom:4,color:b.who==='damian'?BK:'#8899ee'}}>{b.who==='damian'?'DAMIAN':'CLAUDE AI'}</div>
          <div style={{fontSize:12,lineHeight:1.5,fontStyle:'italic'}}>{b.text}</div>
        </div>)}
      </div>
      <div style={{...ctxs,color:WH,borderTopColor:'rgba(255,255,255,0.05)',marginTop:12}}>{card.ctx}</div>
      <div style={{...brs,color:AMBER}}>AI FLOW ACADEMY &middot; LOVEAIFLOW.COM</div>
    </div>;
  } else if (card.type === 'outro') {
    inner = <div style={{...cs, background:AMBER, color:BK}}>
      <div style={{fontFamily:"'Bebas Neue', monospace",fontSize:62,lineHeight:0.92,color:BK,letterSpacing:1}}>ZBUDOWALI<br/>TO<br/>RAZEM.</div>
      <div>
        <div style={{fontSize:9,letterSpacing:2.5,textTransform:'uppercase',color:'rgba(8,8,8,0.5)',lineHeight:2.1,marginTop:16}}>Zero doswiadczenia programistycznego.<br/>Firebase + Stripe + Cloudflare + AI kreatory.<br/>Gemini auditor. Grok sekretarz. Claude developer.<br/>Damian - Otwieracz Lodowek dla AI.</div>
        <div style={{fontFamily:"'Bebas Neue', monospace",fontSize:14,letterSpacing:5,color:BK,border:'2px solid '+BK,padding:'8px 22px',display:'inline-block',marginTop:12}}>loveaiflow.com</div>
      </div>
      <div style={{position:'absolute',right:-20,bottom:-50,fontFamily:"'Bebas Neue', monospace",fontSize:240,color:'rgba(8,8,8,0.06)',lineHeight:1,userSelect:'none'}}>AI</div>
    </div>;
  }
  const pct = ((cur+1)/total)*100;
  return (
    <div style={{padding:'60px 16px 40px', maxWidth:600, margin:'0 auto'}}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet"/>
      <div style={{textAlign:'center',marginBottom:24}}>
        <div style={{fontSize:9,color:'rgba(245,166,35,0.4)',letterSpacing:'0.4em',textTransform:'uppercase',marginBottom:4}}>AI Flow Academy &middot; Prawdziwa Historia</div>
        <div style={{fontFamily:"'Bebas Neue', monospace",fontSize:20,color:'#F5A623',letterSpacing:6}}>ZLOTE CYTATY 💣</div>
      </div>
      <div style={{display:'flex',gap:16,alignItems:'center',justifyContent:'center',marginBottom:12}}>
        <button onClick={prev} disabled={cur===0} style={{background:'none',border:'1px solid rgba(245,166,35,0.3)',color:'#F5A623',fontFamily:"'Bebas Neue', monospace",fontSize:20,width:42,height:42,cursor:cur===0?'default':'pointer',opacity:cur===0?0.2:1}}>{'<'}</button>
        <span style={{fontFamily:"'Bebas Neue', monospace",color:'rgba(245,240,232,0.35)',fontSize:14,letterSpacing:4,minWidth:70,textAlign:'center'}}>{cur+1} / {total}</span>
        <button onClick={next} disabled={cur===total-1} style={{background:'none',border:'1px solid rgba(245,166,35,0.3)',color:'#F5A623',fontFamily:"'Bebas Neue', monospace",fontSize:20,width:42,height:42,cursor:cur===total-1?'default':'pointer',opacity:cur===total-1?0.2:1}}>{'>'}</button>
      </div>
      <div style={{width:'100%',maxWidth:520,margin:'0 auto 16px',height:2,background:'rgba(255,255,255,0.05)',position:'relative'}}>
        <div style={{position:'absolute',left:0,top:0,bottom:0,width:pct+'%',background:'#F5A623',boxShadow:'0 0 8px rgba(245,166,35,0.6)',transition:'width 0.3s'}}/>
      </div>
      {inner}
      <div style={{textAlign:'center',fontSize:9,color:'rgba(245,240,232,0.12)',letterSpacing:2,marginTop:12}}>klawisze strzalek &middot; kazda karta = 1 slajd karuzeli</div>
    </div>
  );
};

const CennikView = ({ t, user, onLoginRequest }) => {
  const isAdmin = user?.email === ADMIN_EMAIL;
  // Używamy globalnych STRIPE_MONTHLY i STRIPE_ANNUAL zdefiniowanych na górze pliku

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

        <div className="grid md:grid-cols-2 gap-6 items-stretch max-w-3xl mx-auto">

          {/* PLAN 1 — Miesięczny */}
          <div className="price-card relative rounded-3xl p-8 border border-amber-500 bg-gradient-to-br from-amber-500/15 to-orange-600/10 flex flex-col"
            style={{boxShadow:'0 0 60px rgba(245,158,11,0.3), 0 20px 60px rgba(245,158,11,0.15)'}}>
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest px-5 py-1.5 rounded-full whitespace-nowrap">
              👑 {t.lang==='EN'?'Most Popular':'Najpopularniejszy'}
            </div>
            <div className="text-5xl mb-4" style={{filter:'drop-shadow(0 8px 20px rgba(245,158,11,0.6))',transform:'perspective(200px) rotateX(10deg)'}}>🚀</div>
            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-400 mb-2">{t.lang==='EN'?'Monthly':'Miesięczny'}</div>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-5xl font-black text-black dark:text-white">89</span>
              <span className="text-sm text-slate-400 mb-2">PLN/{t.lang==='EN'?'mo':'mies.'}</span>
            </div>
            <p className="text-slate-400 text-xs mb-6">{t.lang==='EN'?'Full platform access':'Pełny dostęp do platformy'}</p>
            <div className="space-y-2 mb-8 flex-grow">
              {[
                t.lang==='EN'?'✔ All 4 AI Builders':'✔ Wszystkie 4 kreatory AI',
                t.lang==='EN'?'✔ Free tutorials included':'✔ Tutoriale za darmo',
                t.lang==='EN'?'✔ Unlimited prompts':'✔ Nielimitowane prompty',
                t.lang==='EN'?'✔ New content every week':'✔ Nowe treści co tydzień',
                t.lang==='EN'?'✔ Cancel anytime':'✔ Anuluj w dowolnym momencie'
              ].map((f,i)=>(
                <p key={i} className="text-xs text-black dark:text-white">{f}</p>
              ))}
            </div>
            {isAdmin ? (
              <div className="block w-full py-3.5 font-black text-[11px] uppercase tracking-widest rounded-xl text-center bg-emerald-500 text-black">
                ✓ {t.lang==='EN'?'Admin — Lifetime Access':'Admin — Dostęp dożywotni'}
              </div>
            ) : (
            <a href={user && !user.isAnonymous ? stripeLink(STRIPE_MONTHLY, user.uid, user.email) : '#'}
              onClick={e => { if (!user || user.isAnonymous) { e.preventDefault(); onLoginRequest(); }}}
              target="_blank" rel="noopener noreferrer"
              className="block w-full py-3.5 font-black text-[11px] uppercase tracking-widest rounded-xl text-center bg-amber-500 hover:bg-amber-400 text-black transition-all shadow-lg shadow-amber-500/30">
              {t.lang==='EN'?'🔓 Unlock Everything →':'🔓 Odblokuj wszystko →'}
            </a>
            )}
          </div>

          {/* PLAN 2 — Roczny */}
          <div className="price-card relative rounded-3xl p-8 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 flex flex-col"
            style={{boxShadow:'0 20px 60px rgba(34,197,94,0.2), 0 0 40px rgba(34,197,94,0.08)'}}
            onMouseEnter={e=>e.currentTarget.style.boxShadow='0 30px 80px rgba(34,197,94,0.35), 0 0 60px rgba(34,197,94,0.15)'}
            onMouseLeave={e=>e.currentTarget.style.boxShadow='0 20px 60px rgba(34,197,94,0.2), 0 0 40px rgba(34,197,94,0.08)'}>
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest px-5 py-1.5 rounded-full whitespace-nowrap">
              🎁 {t.lang==='EN'?'Best value':'Najlepsza cena'}
            </div>
            <div className="text-5xl mb-4" style={{filter:'drop-shadow(0 8px 20px rgba(34,197,94,0.5))',transform:'perspective(200px) rotateX(10deg)'}}>💎</div>
            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-2">{t.lang==='EN'?'Annual':'Roczny'}</div>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-5xl font-black text-black dark:text-white">899</span>
              <span className="text-sm text-slate-400 mb-2">PLN/{t.lang==='EN'?'year':'rok'}</span>
            </div>
            <p className="text-slate-400 text-xs mb-1">{t.lang==='EN'?'75 PLN/month':'75 PLN/mies.'}</p>
            <p className="text-emerald-400 text-[10px] font-bold mb-6">{t.lang==='EN'?'Save 169 PLN vs monthly':'Oszczędzasz 169 PLN vs miesięczny'}</p>
            <div className="space-y-2 mb-8 flex-grow">
              {[
                t.lang==='EN'?'✔ All 4 AI Builders':'✔ Wszystkie 4 kreatory AI',
                t.lang==='EN'?'✔ Free tutorials included':'✔ Tutoriale za darmo',
                t.lang==='EN'?'✔ Unlimited prompts':'✔ Nielimitowane prompty',
                t.lang==='EN'?'✔ New content every week':'✔ Nowe treści co tydzień',
                t.lang==='EN'?'✔ Best price per month':'✔ Najlepsza cena za miesiąc'
              ].map((f,i)=>(
                <p key={i} className="text-xs text-black dark:text-white">{f}</p>
              ))}
            </div>
            <a href={user && !user.isAnonymous ? stripeLink(STRIPE_ANNUAL, user.uid, user.email) : '#'}
              onClick={e => { if (!user || user.isAnonymous) { e.preventDefault(); onLoginRequest(); }}}
              target="_blank" rel="noopener noreferrer"
              className="block w-full py-3.5 font-black text-[11px] uppercase tracking-widest rounded-xl text-center bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all">
              {t.lang==='EN'?'⚡ Best Value — Go Annual →':'⚡ Najlepsza cena — Roczny →'}
            </a>
          </div>

        </div>
        <p className="text-center text-xs text-slate-500 mt-8">🔒 {t.lang==='EN'?'Secure payment via Stripe. Cancel anytime.':'Bezpieczna płatność przez Stripe. Anuluj kiedy chcesz.'}</p>
      </div>

      {/* ZLOTE CYTATY */}
      <ZloteCytaty />

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
      <LegalP>{lang === 'EN' ? '⚠️ AI Flow Academy prompt generators are not intended for generating 18+ or adult content. Users are solely responsible for how they use the generated prompts. The platform reserves the right to suspend accounts that violate this policy.' : '⚠️ Kreatory AI Flow Academy nie są przeznaczone do generowania treści 18+ ani materiałów dla dorosłych. Użytkownik ponosi pełną odpowiedzialność za sposób wykorzystania wygenerowanych promptów. Platforma zastrzega sobie prawo do zawieszenia kont naruszających tę zasadę.'}</LegalP>
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

  const emptyTut = { title_pl: '', title_en: '', duration: '', ytId: '', naffyUrl: '', vimeoUrl: '' };
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
          { title_pl: 'Wprowadzenie do Awatarów AI', title_en: 'Introduction to AI Avatars', duration: '12:34', ytId: '1_1oHwOZMe4', naffyUrl: '', vimeoUrl: '' },
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
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={labelCls}>YouTube ID</label>
                    <input value={tut.ytId} onChange={e => update(i, 'ytId', e.target.value)} className={inputCls} placeholder="np. dQw4w9WgXcQ"/>
                  </div>
                  <div>
                    <label className={labelCls}>Czas trwania</label>
                    <input value={tut.duration} onChange={e => update(i, 'duration', e.target.value)} className={inputCls} placeholder="np. 12:34"/>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Link do tutorialu</label>
                  <input value={tut.naffyUrl} onChange={e => update(i, 'naffyUrl', e.target.value)} className={inputCls} placeholder="https://..."/>
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
  const [resetSignal, setResetSignal] = useState(0);
  const handleNavigate = (view) => {
    if (view === 'text-builder') { window.location.href = '/text.html'; return; }
    setCurrentView(view); setActiveCreator(null); setMobileMenuOpen(false); setResetSignal(s => s + 1);
  };
  const navItems = [
    { id: 'home', label: 'Academy' },
    { id: 'aplikacje', label: t.lang === 'EN' ? 'Apps' : 'Aplikacje' },
    { id: 'aplikacje2', label: t.lang === 'EN' ? 'Apps 2' : 'Aplikacje 2' },
    { id: 'dodatki', label: t.lang === 'EN' ? 'Extras' : 'Dodatki' },
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
    if (!newsletterEmail) return;
    try {
      await fetch('https://formspree.io/f/xkoqgrng', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail, _subject: 'Newsletter AI Flow Academy' })
      });
      setNewsletterSent(true);
      setNewsletterEmail('');
    } catch (err) { console.error(err); }
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
                    onClick={() => handleNavigate(id)}
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
                className={`flex w-9 h-9 items-center justify-center rounded-xl transition-colors ${isDarkMode ? 'text-white/40 hover:text-amber-400' : 'text-black/40 hover:text-amber-500'}`}
                style={{border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)'}}>
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </nav>

        {/* ===== MAIN CONTENT ===== */}
        <main className="pt-16">
          {/* Global page nav arrows — widoczne wszędzie poza wnętrzem kreatora */}
          {['home','aplikacje','aplikacje2','dodatki','tutorials','cennik'].includes(currentView) && !activeCreator && (() => {
            const pages = ['home','aplikacje','aplikacje2','dodatki','tutorials','cennik'];
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
          {currentView === 'aplikacje' && <AplikacjeView t={t} user={user} onLoginRequest={() => setShowLogin(true)} onCreatorChange={setActiveCreator} resetSignal={resetSignal} />}
          {currentView === 'dodatki' && <DodatkiView t={t} onNavigate={setCurrentView} />}
          {currentView === 'tutorials' && <TutorialsView t={t} user={user} onLoginRequest={() => setShowLogin(true)} onNavigate={setCurrentView} />}
          {currentView === 'cennik' && <CennikView t={t} user={user} onLoginRequest={() => setShowLogin(true)} />}
          {/* Legacy routes still supported */}
          {currentView === 'prompt-builder' && <AplikacjeView t={t} user={user} onLoginRequest={() => setShowLogin(true)} />}
          {currentView === 'avatar-builder' && <AvatarBuilderView t={t} user={user} onLoginRequest={() => setShowLogin(true)} />}
          {currentView === 'ad-builder' && <ProductAdBuilderView t={t} user={user} onLoginRequest={() => setShowLogin(true)} />}
          {currentView === 'lifestyle-builder' && <LifestyleBuilderView t={t} user={user} onLoginRequest={() => setShowLogin(true)} />}
          {currentView === 'film-builder' && <FilmBuilderView t={t} user={user} onLoginRequest={() => setShowLogin(true)} />}
          {currentView === 'aplikacje2' && <Aplikacje2View lang={lang} onNavigate={handleNavigate} />}
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
              {/* Social media */}
              <div className="flex items-center gap-3">
                {[
                  { href:'https://www.youtube.com/@Aiflow81', label:'YouTube', color:'#ff0000',
                    icon:<svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
                  { href:'https://www.instagram.com/aiflow.official', label:'Instagram', color:'#e1306c',
                    icon:<svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> },
                  { href:'https://www.linkedin.com/in/aiflow', label:'LinkedIn', color:'#0077b5',
                    icon:<svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
                  { href:'https://www.facebook.com/loveaiflow', label:'Facebook', color:'#1877f2',
                    icon:<svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
                  { href:'https://www.tiktok.com/@aiflow.official', label:'TikTok', color:'#ff0050',
                    icon:<svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg> },
                ].map(s => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                    style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.3)'}}
                    onMouseEnter={e=>{e.currentTarget.style.color=s.color;e.currentTarget.style.borderColor=s.color+'44';e.currentTarget.style.background=s.color+'15';}}
                    onMouseLeave={e=>{e.currentTarget.style.color='rgba(255,255,255,0.3)';e.currentTarget.style.borderColor='rgba(255,255,255,0.08)';e.currentTarget.style.background='rgba(255,255,255,0.05)';}}>
                    {s.icon}
                  </a>
                ))}
              </div>
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

// =========================================================================
// APLIKACJE 2 VIEW
// =========================================================================
const Aplikacje2View = ({ lang, onNavigate }) => {
  const apps2 = [
    {
      id: 'text-builder',
      icon: '✍️',
      title: lang === 'EN' ? 'Text Creator' : 'Kreator Napisów',
      subtitle: lang === 'EN' ? 'AI Text Prompt Generator' : 'Generator Promptów Napisów AI',
      desc: lang === 'EN' ? 'Create artistic letter prompts — flowers, fire, ice, crystal and more.' : 'Twórz artystyczne napisy — kwiaty, ogień, lód, kryształ i więcej.',
      color: 'from-amber-500/20 via-yellow-500/10 to-orange-500/20',
      border: 'border-amber-500/30',
      glow: 'rgba(245,158,11,0.3)',
      badge: lang === 'EN' ? 'TEXT STUDIO' : 'STUDIO NAPISÓW',
      available: true,
    },
    {
      id: null,
      icon: '🎨',
      title: lang === 'EN' ? 'Coloring Book Creator' : 'Kreator Kolorowanek',
      subtitle: lang === 'EN' ? 'AI Coloring Book Generator' : 'Generator Kolorowanek AI',
      desc: lang === 'EN' ? 'Create coloring book prompts for kids and adults. Coming soon.' : 'Twórz prompty kolorowanek dla dzieci i dorosłych. Wkrótce dostępne.',
      color: 'from-purple-500/20 via-pink-500/10 to-blue-500/20',
      border: 'border-purple-500/30',
      glow: 'rgba(168,85,247,0.3)',
      badge: lang === 'EN' ? 'COMING SOON' : 'WKRÓTCE',
      available: false,
    },
    {
      id: null,
      icon: '👕',
      title: lang === 'EN' ? 'T-Shirt Creator' : 'Kreator Koszulek',
      subtitle: lang === 'EN' ? 'AI Merch Prompt Generator' : 'Generator Grafik na Koszulki AI',
      desc: lang === 'EN' ? 'Create print-ready graphics for t-shirts and merch. Coming soon.' : 'Twórz grafiki do druku na koszulki i bluzy. Wkrótce.',
      color: 'from-cyan-500/20 via-teal-500/10 to-emerald-500/20',
      border: 'border-cyan-500/30',
      glow: 'rgba(6,182,212,0.3)',
      badge: lang === 'EN' ? 'COMING SOON' : 'WKRÓTCE',
      available: false,
    },
    {
      id: null,
      icon: '🖼️',
      title: lang === 'EN' ? 'Cover Creator' : 'Kreator Okładek',
      subtitle: lang === 'EN' ? 'AI Cover Generator' : 'Generator Okładek AI',
      desc: lang === 'EN' ? 'Create professional book and album covers. Coming soon.' : 'Twórz profesjonalne okładki książek i albumów. Wkrótce.',
      color: 'from-orange-500/20 via-red-500/10 to-yellow-500/20',
      border: 'border-orange-500/30',
      glow: 'rgba(249,115,22,0.3)',
      badge: lang === 'EN' ? 'COMING SOON' : 'WKRÓTCE',
      available: false,
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-700 font-sans px-3 sm:px-4 py-6 sm:py-12">
      <style>{`
        @keyframes float3d {
          0%, 100% { transform: perspective(600px) rotateX(8deg) rotateY(-2deg) translateY(0px); }
          50% { transform: perspective(600px) rotateX(4deg) rotateY(2deg) translateY(-8px); }
        }
        .card3d-a2 {
          transform: perspective(600px) rotateX(8deg) rotateY(-2deg);
          transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .card3d-a2:hover {
          transform: perspective(600px) rotateX(2deg) rotateY(0deg) translateY(-12px) scale(1.02);
        }
        .card3d-a2-disabled {
          transform: perspective(600px) rotateX(8deg) rotateY(-2deg);
          opacity: 0.45;
        }
      `}</style>
      <div className="max-w-5xl mx-auto">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-4">
            <Sparkles className="w-3 h-3" />
            {lang === 'EN' ? 'AI Applications' : 'Aplikacje AI'}
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-black dark:text-white uppercase tracking-tighter mb-4">
            {lang === 'EN' ? 'Apps' : 'Aplikacje'} <span className="text-amber-500">2</span>
          </h1>
          <p className="text-slate-500 max-w-lg mx-auto text-sm">
            {lang === 'EN' ? 'Professional AI prompt generators — click to open creator.' : 'Profesjonalne generatory promptów AI — kliknij aby otworzyć kreator.'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {apps2.map((app, i) => (
            <button
              key={i}
              onClick={() => app.available && app.id && onNavigate(app.id)}
              className={`${app.available ? 'card3d-a2' : 'card3d-a2-disabled'} relative rounded-3xl p-8 border bg-gradient-to-br ${app.color} ${app.border} text-left group ${app.available ? 'cursor-pointer' : 'cursor-default'}`}
              style={{ boxShadow: app.available ? `0 20px 60px ${app.glow}, 0 4px 20px rgba(0,0,0,0.3)` : '0 4px 20px rgba(0,0,0,0.15)' }}
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
              {app.available && (
                <div className="flex items-center gap-2 text-amber-500 font-black text-[11px] uppercase tracking-widest group-hover:gap-3 transition-all">
                  {lang === 'EN' ? 'Open Creator' : 'Otwórz Kreator'}
                  <ChevronRight className="w-4 h-4" />
                </div>
              )}
              {/* Glow overlay on hover */}
              {app.available && (
                <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${app.glow} 0%, transparent 70%)` }} />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// updated Tue Mar  3 23:31:30 UTC 2026
// pornola, biznes znaczy. 🏆
