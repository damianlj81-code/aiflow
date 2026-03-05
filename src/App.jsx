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

  const t = {
    lang: lang,
    pricing: lang === 'EN' ? 'Pricing' : 'Cennik',
    login: lang === 'EN' ? 'Login' : 'Zaloguj się',
    logout: lang === 'EN' ? 'Logout' : 'Wyloguj'
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        onSnapshot(doc(db, 'users', u.uid), (d) => setUserData(d.data()));
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleCookies = (accept) => {
    setCookiesAccepted(true);
    if (accept) localStorage.setItem('cookies_pref', 'all');
  };
return (
    <div className={isDark ? 'dark bg-zinc-950 text-white' : 'bg-white text-black'}>
      <main className="min-h-screen font-sans selection:bg-amber-500 selection:text-black">
        
        {/* Kontener na widoki */}
        <div className="pt-32 px-6 max-w-7xl mx-auto">
           {currentView === 'home' && (
             <div className="text-center py-20">
               <h1 className="text-6xl font-black italic tracking-tighter uppercase mb-4">AI FLOW ACADEMY</h1>
               <p className="text-white/40 font-bold uppercase tracking-[0.3em] text-[10px]">Opanuj przyszłość generowania</p>
             </div>
           )}
           {/* Tutaj możesz dodać resztę swoich widoków */}
        </div>

        {/* --- MODAL LOGOWANIA --- */}
        {showAuthModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-zinc-900 border border-white/10 p-8 rounded-[32px] w-full max-w-md relative">
              <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
              
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">AI FLOW</h2>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-2">Logowanie do platformy</p>
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
{/* --- COOKIES BAR --- */}
        {!cookiesAccepted && (
          <div className="fixed bottom-0 left-0 right-0 z-[1000] p-6 font-sans" style={{background:'rgba(0,0,0,0.95)', backdropFilter:'blur(20px)', borderTop:'1px solid rgba(245,158,11,0.2)'}}>
            <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center gap-6 justify-between">
              <p className="text-[11px] text-white/50 leading-relaxed max-w-2xl">
                🍪 {lang === 'EN' ? 'We use cookies and collect emails for contact and marketing. By continuing you accept our ' : 'Używamy cookies i zbieramy emaile w celach kontaktowych i marketingowych. Kontynuując akceptujesz naszą '}
                <button onClick={() => setCurrentView('datenschutz')} className="text-amber-500 underline font-bold">{lang === 'EN' ? 'Privacy Policy' : 'Politykę Prywatności'}</button>.
              </p>
              <div className="flex gap-3 flex-shrink-0">
                <button onClick={() => handleCookies(true)} className="bg-amber-500 text-black font-black text-[10px] uppercase tracking-widest px-6 py-2 rounded-lg hover:bg-amber-400 transition-colors">{lang === 'EN' ? 'Accept' : 'Akceptuję'}</button>
                <button onClick={() => handleCookies(false)} className="text-white/40 font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg hover:text-white/60 transition-colors">X</button>
              </div>
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
      </main>
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
        className="w-full bg-zinc-900 border border-white/5 rounded-xl px-5 py-4 text-xs font-bold focus:border-amber-500 outline-none transition-all text-white"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input 
        type="password" 
        placeholder="HASŁO" 
        className="w-full bg-zinc-900 border border-white/5 rounded-xl px-5 py-4 text-xs font-bold focus:border-amber-500 outline-none transition-all text-white"
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
