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

// --- KONFIGURACJA SYSTEMOWA ---
const ADMIN_EMAIL = 'damianlj@live.com';
const STRIPE_STARTER = 'https://buy.stripe.com/14A28qcGJ56fdfq5rQ8bS05'; // 30 PLN
const STRIPE_PRO = 'https://buy.stripe.com/cNiaEWbCF6aj7V63jI8bS01';    // 199 PLN
const STRIPE_ANNUAL = 'https://buy.stripe.com/7sYfZg7mpgOX2AM5rQ8bS06'; // 1899 PLN
const STRIPE_TEST_ADMIN = 'https://buy.stripe.com/dRm6oGeOR6aj3EQcUi8bS04'; // 2 PLN (DLA CIEBIE)

const stripeLink = (baseUrl, uid, email) => {
  const url = new URL(baseUrl);
  url.searchParams.append('client_reference_id', uid);
  url.searchParams.append('prefilled_email', email || '');
  return url.toString();
};

const PricingButton = ({ plan, t, highlight, user, onLoginRequest }) => {
  const LINKS = {
    basic: STRIPE_STARTER,
    monthly: STRIPE_PRO,
    annual: STRIPE_ANNUAL
  };

  const finalLink = user?.email === ADMIN_EMAIL ? STRIPE_TEST_ADMIN : LINKS[plan];

  return (
    <a 
      href={user ? stripeLink(finalLink, user.uid, user.email) : '#'} 
      onClick={(e) => { if(!user) { e.preventDefault(); onLoginRequest(); } }}
      target="_blank" 
      rel="noopener noreferrer"
      className={`block w-full py-3.5 font-black text-[11px] uppercase tracking-widest rounded-xl transition-all text-center ${highlight ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20' : 'bg-black dark:bg-white text-white dark:text-black hover:bg-amber-500 hover:text-black'}`}
    >
      {t.lang === 'EN' ? 'Get Access →' : 'Uzyskaj dostęp →'}
    </a>
  );
};
export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('home');
  const [lang, setLang] = useState('PL');
  const [isDark, setIsDark] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNotification, setShowNotification] = useState(null);
  const [cookiesAccepted, setCookiesAccepted] = useState(false);

  // --- LOGIKA UPRAWNIEŃ (CHIRURGICZNA NAPRAWA) ---
  // Sprawdzamy co użytkownik ma w bazie danych (pole 'plan')
  const hasAppAccess = userData?.plan === 'basic' || userData?.plan === 'monthly' || userData?.plan === 'annual' || user?.email === ADMIN_EMAIL;
  const hasFullAccess = userData?.plan === 'monthly' || userData?.plan === 'annual' || user?.email === ADMIN_EMAIL;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const userRef = doc(db, 'users', u.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setUserData(snap.data());
        } else {
          // Jeśli nowy użytkownik, tworzymy mu profil 'free'
          const newData = { 
            email: u.email, 
            plan: 'free', 
            tokens: 0, 
            createdAt: new Date().toISOString() 
          };
          await setDoc(userRef, newData);
          setUserData(newData);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Automatyczne odświeżanie danych przy powrocie ze Stripe
  useEffect(() => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      const unsub = onSnapshot(userRef, (snap) => {
        if (snap.exists()) setUserData(snap.data());
      });
      return () => unsub();
    }
  }, [user]);

  const t = {
    lang,
    home: lang === 'EN' ? 'Home' : 'Start',
    apps: lang === 'EN' ? 'Apps' : 'Aplikacje',
    tutorials: lang === 'EN' ? 'Tutorials' : 'Tutoriale',
    pricing: lang === 'EN' ? 'Pricing' : 'Cennik',
    login: lang === 'EN' ? 'Login' : 'Logowanie'
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentView('home');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-amber-500"></div>
      </div>
    );
  }

  // --- RENDEROWANIE TREŚCI ---
  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return (
          <div className="space-y-20 pb-20">
            {/* Hero Section - bez zmian */}
            <section className="relative pt-20 pb-32 overflow-hidden">
               <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                  <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tighter italic uppercase leading-none">
                    AI <span className="text-amber-500">Flow</span><br/>Academy
                  </h1>
                  <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
                    {lang === 'EN' ? 'Master the art of AI generation.' : 'Opanuj sztukę generowania AI od podstaw.'}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button onClick={() => setCurrentView('pricing')} className="bg-amber-500 text-black px-10 py-5 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-amber-500/20">
                      {lang === 'EN' ? 'Get Started' : 'Zacznij teraz'}
                    </button>
                  </div>
               </div>
            </section>
          </div>
        );
case 'apps':
        return (
          <div className="relative pt-10">
            {/* BLOKADA DLA NIEZALOGOWANYCH LUB BEZ PAKIETU STARTER */}
            {!hasAppAccess && (
              <div className="absolute inset-0 z-50 backdrop-blur-md bg-black/60 flex flex-col items-center justify-center rounded-3xl p-8 text-center min-h-[500px]">
                <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <Lock className="w-10 h-10 text-amber-500" />
                </div>
                <h2 className="text-3xl font-black uppercase italic text-white mb-4">Dostęp zablokowany</h2>
                <p className="text-white/60 mb-8 max-w-md font-medium">
                  {user 
                    ? 'Twoja subskrypcja nie obejmuje sekcji Aplikacji. Wykup pakiet Starter lub PRO.' 
                    : 'Zaloguj się i wykup dostęp, aby korzystać z generatorów AI.'}
                </p>
                <button onClick={() => user ? setCurrentView('pricing') : setShowAuthModal(true)} className="bg-amber-500 text-black font-black px-10 py-4 rounded-2xl uppercase tracking-tighter hover:scale-105 transition-all">
                  {user ? 'Sprawdź Cennik' : 'Zaloguj się / Rejestracja'}
                </button>
              </div>
            )}
            {/* Tutaj Twój oryginalny kod generatorów/aplikacji... */}
            <div className={`grid md:grid-cols-2 gap-8 ${!hasAppAccess ? 'blur-xl opacity-20 pointer-events-none' : ''}`}>
               {/* Twoja lista narzędzi AI z App.jsx */}
            </div>
          </div>
        );

      case 'tutorials':
        return (
          <div className="pt-10 space-y-12">
            <h2 className="text-4xl font-black italic uppercase italic tracking-tighter">Tutoriale i Masterclass</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
               {/* Przykładowa karta tutorialu - filmy demo są widoczne zawsze */}
               <div className="bg-zinc-900 rounded-3xl overflow-hidden border border-white/5 p-4">
                  <div className="aspect-video bg-black rounded-2xl mb-4 overflow-hidden relative">
                    {/* Miejsce na Youtube Demo */}
                    <div className="absolute inset-0 flex items-center justify-center">
                       <Play className="w-12 h-12 text-amber-500 opacity-50" />
                    </div>
                  </div>
                  <h3 className="font-black uppercase mb-2">Techniki Generowania Obrazu</h3>
                  
                  {/* PRZYCISK DO PEŁNEJ WERSJI - BLOKADA LOGICZNA */}
                  {hasFullAccess ? (
                    <button className="w-full bg-white text-black py-3 rounded-xl font-black uppercase text-[10px]">Oglądaj pełny materiał</button>
                  ) : (
                    <button onClick={() => setCurrentView('pricing')} className="w-full bg-amber-500/10 text-amber-500 border border-amber-500/20 py-3 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2">
                      <Lock className="w-3 h-3" /> Wymagany Pakiet PRO
                    </button>
                  )}
               </div>
            </div>
          </div>
        );

      case 'pricing':
        return (
          <div className="pt-20 pb-40">
            <div className="text-center mb-20">
              <h2 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter mb-6 underline decoration-amber-500/30">Cennik i pakiety</h2>
              <p className="text-white/50 font-medium">Wybierz plan dopasowany do Twoich potrzeb.</p>
            </div>

            {/* MLECZNA SZYBA NA CENNIKU DLA NIEZALOGOWANYCH */}
            <div className="relative max-w-6xl mx-auto">
              {!user && (
                <div className="absolute inset-0 z-50 backdrop-blur-lg bg-black/40 flex flex-col items-center justify-center rounded-[40px] border border-white/10 p-10 text-center">
                  <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mb-6">
                    <Lock className="w-8 h-8 text-amber-500" />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-widest text-white mb-4 italic">ZALOGUJ SIĘ, ABY KUPIĆ</h3>
                  <p className="text-white/60 mb-8 max-w-sm">Dostęp do cennika i płatności jest możliwy wyłącznie dla zalogowanych użytkowników.</p>
                  <button onClick={() => setShowAuthModal(true)} className="bg-amber-500 text-black font-black px-12 py-5 rounded-2xl uppercase text-[12px] hover:scale-105 transition-all shadow-xl shadow-amber-500/20">
                    Logowanie / Rejestracja
                  </button>
                </div>
              )}

              <div className={`grid md:grid-cols-3 gap-8 ${!user ? 'blur-md pointer-events-none' : ''}`}>
                {/* PAKIET STARTER (30 PLN) */}
                <div className="bg-zinc-900/50 p-10 rounded-[40px] border border-white/5 flex flex-col">
                  <h3 className="text-2xl font-black mb-2 uppercase italic tracking-tighter">Starter</h3>
                  <div className="text-4xl font-black mb-6 italic tracking-tighter">30 PLN<span className="text-[10px] text-white/40 uppercase"> / mies</span></div>
                  <ul className="space-y-4 mb-10 flex-grow">
                    <li className="flex items-center gap-3 text-xs font-bold text-white/70"><Check className="w-4 h-4 text-amber-500" /> Dostęp do Aplikacji</li>
                    <li className="flex items-center gap-3 text-xs font-bold text-white/30"><X className="w-4 h-4" /> Tutoriale i Masterclass</li>
                  </ul>
                  <PricingButton plan="basic" t={t} user={user} onLoginRequest={() => setShowAuthModal(true)} />
                </div>

                {/* PAKIET PRO (199 PLN) */}
                <div className="bg-white p-10 rounded-[40px] border-4 border-amber-500 flex flex-col relative scale-105">
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[10px] font-black uppercase px-6 py-2 rounded-full">Najpopularniejszy</div>
                  <h3 className="text-2xl font-black mb-2 uppercase italic tracking-tighter text-black">PRO</h3>
                  <div className="text-4xl font-black mb-6 italic tracking-tighter text-black">199 PLN<span className="text-[10px] text-black/40 uppercase"> / mies</span></div>
                  <ul className="space-y-4 mb-10 flex-grow">
                    <li className="flex items-center gap-3 text-xs font-bold text-black"><Check className="w-4 h-4 text-amber-500" /> Wszystkie Aplikacje</li>
                    <li className="flex items-center gap-3 text-xs font-bold text-black"><Check className="w-4 h-4 text-amber-500" /> Wszystkie Tutoriale</li>
                  </ul>
                  <PricingButton plan="monthly" t={t} highlight={true} user={user} onLoginRequest={() => setShowAuthModal(true)} />
                </div>

                {/* PAKIET ANNUAL (1899 PLN) */}
                <div className="bg-zinc-900/50 p-10 rounded-[40px] border border-white/5 flex flex-col">
                  <h3 className="text-2xl font-black mb-2 uppercase italic tracking-tighter">Roczny</h3>
                  <div className="text-4xl font-black mb-6 italic tracking-tighter text-black">1899 PLN<span className="text-[10px] text-white/40 uppercase"> / rok</span></div>
                  <ul className="space-y-4 mb-10 flex-grow">
                    <li className="flex items-center gap-3 text-xs font-bold text-white/70"><Check className="w-4 h-4 text-amber-500" /> Wszystko w pakiecie PRO</li>
default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'bg-black text-white' : 'bg-zinc-50 text-black'} font-sans`}>
      
      {/* --- HEADER / NAWIGACJA --- */}
      <nav className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-xl border-b border-white/5 bg-black/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div 
            onClick={() => setCurrentView('home')} 
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center rotate-3 group-hover:rotate-12 transition-transform shadow-lg shadow-amber-500/20">
              <Zap className="w-6 h-6 text-black fill-black" />
            </div>
            <span className="font-black text-xl italic tracking-tighter uppercase">AI FLOW</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => setCurrentView('apps')} className={`text-[10px] font-black uppercase tracking-widest hover:text-amber-500 transition-colors ${currentView === 'apps' ? 'text-amber-500' : 'text-white/60'}`}>{t.apps}</button>
            <button onClick={() => setCurrentView('tutorials')} className={`text-[10px] font-black uppercase tracking-widest hover:text-amber-500 transition-colors ${currentView === 'tutorials' ? 'text-amber-500' : 'text-white/60'}`}>{t.tutorials}</button>
            <button onClick={() => setCurrentView('pricing')} className={`text-[10px] font-black uppercase tracking-widest hover:text-amber-500 transition-colors ${currentView === 'pricing' ? 'text-amber-500' : 'text-white/60'}`}>{t.pricing}</button>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <div className="text-[10px] font-black uppercase text-amber-500 italic tracking-tighter">
                    {userData?.plan?.toUpperCase() || 'FREE'} PLAN
                  </div>
                  <div className="text-[9px] font-bold text-white/40">{user.email}</div>
                </div>
                <button onClick={handleLogout} className="w-10 h-10 bg-zinc-900 border border-white/5 rounded-xl flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/20 transition-all text-red-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)} 
                className="bg-white text-black px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-500 transition-all"
              >
                {t.login}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* --- GŁÓWNA TREŚĆ --- */}
      <main className="max-w-7xl mx-auto px-6 pt-32 min-h-screen">
        {renderContent()}
      </main>

      {/* --- MODAL LOGOWANIA (NAPRAWIONY) --- */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-2xl bg-black/80">
          <div className="bg-zinc-950 border border-white/10 w-full max-w-md p-10 rounded-[40px] relative shadow-2xl">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center rotate-6 mx-auto mb-6">
                <Lock className="w-8 h-8 text-black" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none mb-2">Panel Dostępu</h2>
              <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest">Witaj w AI Flow Academy</p>
            </div>

            <AuthForm 
              onSuccess={() => setShowAuthModal(false)} 
              lang={lang} 
              t={t}
              db={db}
              auth={auth}
            />
          </div>
        </div>
      )}

      {/* --- STOPKA --- */}
      <footer className="mt-40 border-t border-white/5 py-20 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-8 opacity-50 grayscale hover:grayscale-0 transition-all">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-black fill-black" />
            </div>
            <span className="font-black text-sm italic tracking-tighter uppercase text-white">AI FLOW</span>
          </div>
          <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">&copy; 2025 AI Flow Academy. Wszystkie prawa zastrzeżone.</p>
        </div>
      </footer>
    </div>
  );
}

// --- POMOCNICZY KOMPONENT FORMULARZA ---
function AuthForm({ onSuccess, lang, t, db, auth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', res.user.uid), {
          email,
          plan: 'free',
          tokens: 0,
          createdAt: new Date().toISOString()
        });
      }
      onSuccess();
    } catch (err) {
      setError(err.message.includes('auth/user-not-found') ? 'Użytkownik nie istnieje.' : 'Błąd autoryzacji.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold rounded-xl text-center">{error}</div>}
      <input 
        type="email" 
        placeholder="EMAIL" 
        className="w-full bg-zinc-900 border border-white/5 rounded-xl px-5 py-4 text-xs font-bold focus:border-amber-500 outline-none transition-all"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input 
        type="password" 
        placeholder="HASŁO" 
        className="w-full bg-zinc-900 border border-white/5 rounded-xl px-5 py-4 text-xs font-bold focus:border-amber-500 outline-none transition-all"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button className="w-full bg-amber-500 text-black py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-[1.02] transition-all">
        {isLogin ? 'Zaloguj się' : 'Zarejestruj się'}
      </button>
      <button 
        type="button"
        onClick={() => setIsLogin(!isLogin)} 
        className="w-full text-white/40 text-[9px] font-black uppercase tracking-widest mt-4 hover:text-white transition-colors"
      >
        {isLogin ? 'Nie masz konta? Załóż je tutaj' : 'Masz już konto? Zaloguj się'}
      </button>
    </form>
  );
}