// TextCreator.jsx v2 — Kreator Napisów AI
// AI Flow Academy | loveaiflow.com
// Litery po przekątnej, podgląd 9:16 / 16:9

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Copy, Check, Lock, Sparkles, LogOut } from 'lucide-react';

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth, onAuthStateChanged,
  signInWithPopup, GoogleAuthProvider,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut
} from 'firebase/auth';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, increment
} from 'firebase/firestore';

// ─── Firebase ─────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCkwadV6OAvNW8NASmZ6qYh7zKV1xBLnss",
  authDomain: "aiflow-academy.firebaseapp.com",
  projectId: "aiflow-academy",
  storageBucket: "aiflow-academy.firebasestorage.app",
  messagingSenderId: "397056782057",
  appId: "1:397056782057:web:8eb4ff5bd4fcbc7f0aca78",
};
const fbApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const APP_ID = 'aiflow_academy';
const STRIPE_MONTHLY = 'https://buy.stripe.com/bJedR8ayBgOX5MY9I68bS0a';
const MAX_PORTRAIT  = 6;
const MAX_LANDSCAPE = 10;

// ─── Token helpers ────────────────────────────────────────────────────────────
async function getTextTokenData(uid) {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'tokens', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      tokens: 5, tokens_avatar: 1, tokens_ad: 1,
      tokens_lifestyle: 1, tokens_film: 2, tokens_text: 1,
      used: 0, createdAt: new Date().toISOString(), pro: false, starter: false
    });
    return { tokensText: 1, isPro: false };
  }
  const data = snap.data();
  const expiresAt = data.expiresAt?.seconds
    ? new Date(data.expiresAt.seconds * 1000)
    : data.expiresAt ? new Date(data.expiresAt) : null;
  const isExpired = expiresAt ? new Date() > expiresAt : false;
  const isPro = (data.pro === true || data.starter === true) && !isExpired;
  if (data.tokens_text === undefined) {
    await updateDoc(ref, { tokens_text: 1 });
    return { tokensText: 1, isPro };
  }
  return { tokensText: data.tokens_text ?? 0, isPro };
}

async function useTextToken(uid) {
  const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'tokens', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;
  const data = snap.data();
  const expiresAt = data.expiresAt?.seconds
    ? new Date(data.expiresAt.seconds * 1000)
    : data.expiresAt ? new Date(data.expiresAt) : null;
  const isExpired = expiresAt ? new Date() > expiresAt : false;
  if ((data.pro === true || data.starter === true) && !isExpired) return true;
  if ((data.tokens_text ?? 0) <= 0) return false;
  await updateDoc(ref, { tokens_text: increment(-1), used: increment(1) });
  return true;
}

// ─── Style liter ──────────────────────────────────────────────────────────────
const STYLES = [
  { id: 'floral',    emoji: '🌸', label: 'Kwiatowy',          desc: 'róże, piwonie, lilie',     color: '#f9a8d4',
    prompt: 'made entirely of roses, peonies, and lilies in full bloom, petals and leaves forming every curve, photorealistic macro photography, soft pink and white florals, green stems intertwining, dewdrops on petals' },
  { id: 'bulb',      emoji: '💡', label: 'Żarówki świąteczne',desc: 'lampki, drut, blask',       color: '#fbbf24',
    prompt: 'constructed from glowing vintage Edison filament bulbs and copper wire, warm golden bokeh, festive string lights wrapping each curve, soft glowing halos, retro holiday atmosphere' },
  { id: 'botanical', emoji: '🍃', label: 'Botaniczny',        desc: 'liście, gałęzie, rośliny', color: '#86efac',
    prompt: 'formed from intertwining botanical elements — fern fronds, eucalyptus branches, tropical leaves, moss and wildflowers, lush green palette with golden hour light filtering through' },
  { id: 'crystal',   emoji: '💎', label: 'Kryształowy',       desc: 'szkło, diament, pryzmat',  color: '#93c5fd',
    prompt: 'sculpted from pure crystal and faceted diamond-cut glass, internal light refractions creating rainbow caustics, translucent icy-blue and violet hues, ultra-sharp reflections, luxury jewellery photography lighting' },
  { id: 'lava',      emoji: '🔥', label: 'Lawa / Ogień',      desc: 'magma, płomienie, żar',    color: '#f97316',
    prompt: 'forged from molten lava and roaring fire, glowing orange-red magma cracks, dark volcanic rock texture, embers and sparks floating upward, dramatic rim lighting, infernal energy' },
  { id: 'ice',       emoji: '🧊', label: 'Lodowy',            desc: 'lód, szron, śnieg',        color: '#bae6fd',
    prompt: 'carved from transparent glacial ice, frosted crystalline texture with deep arctic-blue internal glow, snowflake micro-crystals, ice splinter details, cold breath fog, cryogenic atmosphere' },
  { id: 'choco',     emoji: '🍫', label: 'Czekoladowy',       desc: 'mleczna czekolada, kakao', color: '#a16207',
    prompt: 'sculpted from glossy milk chocolate with velvety matte cocoa powder texture, smooth ganache sheen, chocolate drips, caramel highlight on edges, artisan confectionery photography' },
  { id: 'moss',      emoji: '🌿', label: 'Mech / Leśny',      desc: 'mech, las, natura',        color: '#4ade80',
    prompt: 'completely covered in lush forest moss and tiny mushrooms, lichen textures, embedded acorns and pine needles, soft dappled forest light, earthy woodland macro photography' },
  { id: 'gold',      emoji: '✨', label: 'Złoty luksusowy',   desc: '24k złoto, blask, luksus', color: '#f59e0b',
    prompt: 'cast in solid 24-karat gold with mirror-polished surface, intricate engraved filigree detailing, dramatic studio specular highlights, dark velvet background, ultra-high-end product photography' },
];

// ─── Tła ─────────────────────────────────────────────────────────────────────
const BACKGROUNDS = [
  { id: 'white',  label: 'Białe studio',      prompt: 'clean white studio background, soft diffused light',                       preview: 'linear-gradient(135deg,#fff,#f0f0f0)' },
  { id: 'black',  label: 'Czarne eleganckie', prompt: 'deep black elegant background, dramatic chiaroscuro lighting',               preview: 'linear-gradient(135deg,#111,#2a2a2a)' },
  { id: 'pastel', label: 'Pastelowe',         prompt: 'soft pastel blurred background in complementary hues',                      preview: 'linear-gradient(135deg,#fce7f3,#ddd6fe,#bfdbfe)' },
  { id: 'marble', label: 'Marmur',            prompt: 'luxurious white Carrara marble surface with subtle grey veining',           preview: 'linear-gradient(135deg,#f5f5f5,#d4d4d4)' },
  { id: 'wood',   label: 'Drewno',            prompt: 'warm rustic oak wood planks with natural grain texture',                    preview: 'linear-gradient(135deg,#92400e,#b45309)' },
];

// ─── Prompt builder ───────────────────────────────────────────────────────────
function buildPrompt(text, style, bg, format) {
  const letters = text.trim().toUpperCase().split('');
  const isMulti = letters.length > 1;
  const arrangement = format === 'portrait'
    ? 'arranged diagonally from upper-left to lower-right, stacked vertically, each letter slightly offset to the right on its own horizontal level, filling the vertical 9:16 frame'
    : 'arranged diagonally from upper-left to lower-right along a horizontal axis, each letter slightly lower than the previous, filling the wide 16:9 horizontal frame';
  const subject = isMulti
    ? `the letters ${letters.join(', ')} spelling "${text.toUpperCase()}", ${arrangement}`
    : `a single large letter "${text.toUpperCase()}" centered and filling the frame`;
  const ar = format === 'portrait' ? '--ar 9:16' : '--ar 16:9';
  return `Photorealistic 3D render of ${subject}, each letter ${style.prompt}, placed on ${bg.prompt}. Every letter is clearly legible and three-dimensional. ${format === 'portrait' ? 'Vertical portrait' : 'Wide horizontal'} composition. Shot with 85mm macro lens, studio product photography. No text overlay, no watermark. Ultra-detailed, 8K resolution, ${ar} --style raw --v 6.1`;
}

// ─── Canvas: podgląd liter po przekątnej ─────────────────────────────────────
const LCOLORS = ['#f59e0b','#fb923c','#f472b6','#a78bfa','#34d399','#60a5fa','#4ade80','#e879f9','#facc15','#f87171'];

function LetterCanvas({ text, format }) {
  const ref = useRef(null);

  const draw = useCallback(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const portrait = format === 'portrait';
    // Wymiary proporcjonalne do formatu
    const W = portrait ? 198 : 352;
    const H = portrait ? 352 : 198;
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Tło
    ctx.fillStyle = '#0c0c0c';
    ctx.fillRect(0, 0, W, H);
    // Ramka amber
    ctx.strokeStyle = 'rgba(245,158,11,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

    const letters = text.toUpperCase().replace(/\s/g, '').split('').filter(Boolean);

    if (!letters.length) {
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.font = '500 12px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('wpisz tekst…', W / 2, H / 2);
      return;
    }

    const n = letters.length;
    const cellSize = portrait
      ? Math.min(W * 0.72, (H * 0.84) / n)
      : Math.min(H * 0.72, (W * 0.84) / n);
    const fontSize = Math.max(14, Math.floor(cellSize * 0.74));

    ctx.font = `900 ${fontSize}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (portrait) {
      // Pionowo: każda litera nieco w prawo
      const totalH = n * cellSize;
      const startY  = (H - totalH) / 2 + cellSize / 2;
      const xSwing  = Math.min(W * 0.32, fontSize * (n - 1) * 0.28);
      const startX  = W / 2 - xSwing / 2;

      letters.forEach((letter, i) => {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const x = n === 1 ? W / 2 : startX + t * xSwing;
        const y = startY + i * cellSize;
        const col = LCOLORS[i % LCOLORS.length];
        // halo
        ctx.save(); ctx.globalAlpha = 0.13; ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(x, y, fontSize * 0.54, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        // cień
        ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#000';
        ctx.fillText(letter, x + 1.5, y + 2); ctx.restore();
        // litera
        ctx.fillStyle = col; ctx.globalAlpha = 1;
        ctx.fillText(letter, x, y);
      });
    } else {
      // Poziomo: każda litera nieco niżej
      const totalW = n * cellSize;
      const startX  = (W - totalW) / 2 + cellSize / 2;
      const ySwing  = Math.min(H * 0.32, fontSize * (n - 1) * 0.28);
      const startY  = H / 2 - ySwing / 2;

      letters.forEach((letter, i) => {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const x = startX + i * cellSize;
        const y = n === 1 ? H / 2 : startY + t * ySwing;
        const col = LCOLORS[i % LCOLORS.length];
        ctx.save(); ctx.globalAlpha = 0.13; ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(x, y, fontSize * 0.54, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#000';
        ctx.fillText(letter, x + 1.5, y + 2); ctx.restore();
        ctx.fillStyle = col; ctx.globalAlpha = 1;
        ctx.fillText(letter, x, y);
      });
    }

    // Label formatu
    ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#fbbf24';
    ctx.font = '600 10px system-ui'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText(portrait ? '9:16' : '16:9', W - 8, H - 7); ctx.restore();
  }, [text, format]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <canvas ref={ref} style={{ borderRadius: '10px', display: 'block', maxWidth: '100%' }} />
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function TextCreator() {
  const [user, setUser]             = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [tokenData, setTokenData]   = useState({ tokensText: 0, isPro: false });
  const [loadingTok, setLoadingTok] = useState(false);

  const [text, setText]               = useState('');
  const [format, setFormat]           = useState('portrait');
  const [selStyle, setSelStyle]       = useState(null);
  const [selBg, setSelBg]             = useState(null);
  const [prompt, setPrompt]           = useState('');
  const [generating, setGenerating]   = useState(false);
  const [copied, setCopied]           = useState(false);
  const [error, setError]             = useState('');

  const [showLogin, setShowLogin]     = useState(false);
  const [loginMode, setLoginMode]     = useState('login');
  const [loginEmail, setLoginEmail]   = useState('');
  const [loginPwd, setLoginPwd]       = useState('');
  const [loginErr, setLoginErr]       = useState('');
  const [loginLoad, setLoginLoad]     = useState(false);

  const promptRef = useRef(null);
  const maxChars  = format === 'portrait' ? MAX_PORTRAIT : MAX_LANDSCAPE;
  const trimmed   = text.trim();

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u); setLoadingAuth(false);
      if (u) { setLoadingTok(true); setTokenData(await getTextTokenData(u.uid)); setLoadingTok(false); }
    });
  }, []);

  useEffect(() => {
    if (trimmed.length > maxChars) setText(t => t.slice(0, maxChars));
  }, [format]);

  const canGen = trimmed.length >= 1 && trimmed.length <= maxChars && selStyle && selBg && !generating;

  async function handleGenerate() {
    if (!canGen) return;
    setError('');
    if (!user) { setShowLogin(true); return; }
    setGenerating(true);
    const ok = await useTextToken(user.uid);
    if (!ok) { setError('Brak tokenów. Wykup plan Pro.'); setGenerating(false); return; }
    setTokenData(await getTextTokenData(user.uid));
    setPrompt(buildPrompt(text, selStyle, selBg, format));
    setGenerating(false);
    setTimeout(() => promptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  async function handleGoogle() {
    setLoginLoad(true); setLoginErr('');
    try { await signInWithPopup(auth, googleProvider); setShowLogin(false); }
    catch (e) { if (e.code !== 'auth/popup-closed-by-user') setLoginErr('Błąd Google.'); }
    setLoginLoad(false);
  }

  async function handleEmail(e) {
    e.preventDefault(); setLoginLoad(true); setLoginErr('');
    try {
      if (loginMode === 'register') await createUserWithEmailAndPassword(auth, loginEmail, loginPwd);
      else await signInWithEmailAndPassword(auth, loginEmail, loginPwd);
      setShowLogin(false);
    } catch (err) {
      const m = { 'auth/email-already-in-use':'Email zajęty.','auth/wrong-password':'Złe hasło.','auth/user-not-found':'Brak konta.','auth/weak-password':'Min. 6 znaków.' };
      setLoginErr(m[err.code] || 'Błąd. Spróbuj ponownie.');
    }
    setLoginLoad(false);
  }

  if (loadingAuth) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* NAV — identyczny styl jak App.jsx */}
      <nav className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <a href="/"><img src="/logo.png" alt="AI Flow" className="h-8 w-auto" /></a>

          {/* Menu główne */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: 'Academy', href: '/#academy' },
              { label: 'Aplikacje', href: '/#aplikacje' },
              { label: 'Aplikacje 2', href: '/#aplikacje2', active: true },
              { label: 'Dodatki', href: '/#dodatki' },
              { label: 'Tutoriale', href: '/#tutorials' },
              { label: 'Cennik', href: '/#cennik' },
            ].map(item => (
              <a key={item.label} href={item.href}
                className="px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all"
                style={{
                  background: item.active ? 'rgba(245,158,11,0.15)' : 'transparent',
                  color: item.active ? '#f59e0b' : 'rgba(255,255,255,0.5)',
                  border: item.active ? '1px solid rgba(245,158,11,0.3)' : '1px solid transparent',
                }}>
                {item.label}
              </a>
            ))}
          </div>

          {/* Prawa strona — user */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                    {user.email?.split('@')[0]}
                  </span>
                  {tokenData.isPro
                    ? <span className="text-[9px] text-amber-400 uppercase tracking-widest">PRO · Aktywny</span>
                    : <span className="text-[9px] text-white/25 uppercase tracking-widest">{loadingTok ? '…' : tokenData.tokensText} token{tokenData.tokensText !== 1 ? 'y' : ''}</span>
                  }
                </div>
                <button onClick={() => signOut(auth)}
                  className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/60 uppercase tracking-widest transition-colors px-3 py-2 rounded-lg"
                  style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  <LogOut className="w-3 h-3" /> Wyloguj
                </button>
              </>
            ) : (
              <button onClick={() => setShowLogin(true)}
                className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all"
                style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}>
                Zaloguj się
              </button>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        <div className="md:hidden flex items-center gap-1 px-4 pb-2 overflow-x-auto">
          {[
            { label: 'Academy', href: '/' },
            { label: 'Aplikacje', href: '/#aplikacje' },
            { label: 'Napisy ✦', href: '#', active: true },
            { label: 'Dodatki', href: '/#dodatki' },
            { label: 'Tutoriale', href: '/#tutorials' },
            { label: 'Cennik', href: '/#cennik' },
          ].map(item => (
            <a key={item.label} href={item.href}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
              style={{
                background: item.active ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                color: item.active ? '#f59e0b' : 'rgba(255,255,255,0.4)',
                border: item.active ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.06)',
              }}>
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      {/* HERO */}
      <div className="max-w-5xl mx-auto px-4 pt-12 pb-6 text-center">
        <div className="text-5xl mb-4" style={{ filter: 'drop-shadow(0 0 30px rgba(245,158,11,0.5))' }}>✍️</div>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter mb-2">
          Kreator <span style={{ color: '#f59e0b' }}>Napisów</span>
        </h1>
        <p className="text-white/40 text-sm max-w-md mx-auto">
          Generuj prompty do artystycznych liter — wklej do Midjourney, Ideogram lub Kling
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-24 space-y-10">

        {/* KROK 1: FORMAT + TEKST */}
        <Section step="1" title="Format i tekst">

          {/* Format buttons */}
          <div className="flex gap-3 mb-6">
            {[
              { id: 'portrait',  emoji: '📱', label: '9:16 Pionowy',  sub: 'TikTok / Reels · max 6 znaków' },
              { id: 'landscape', emoji: '🖥️', label: '16:9 Poziomy',  sub: 'YouTube / desktop · max 10 znaków' },
            ].map(f => (
              <button key={f.id} onClick={() => setFormat(f.id)}
                className="flex-1 py-3 px-4 rounded-xl flex items-center gap-3 transition-all text-left"
                style={{
                  background: format === f.id ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${format === f.id ? 'rgba(245,158,11,0.45)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                <span className="text-xl leading-none">{f.emoji}</span>
                <div className="min-w-0">
                  <div className="text-xs font-black uppercase tracking-wider text-white">{f.label}</div>
                  <div className="text-[10px] text-white/35 truncate">{f.sub}</div>
                </div>
                {format === f.id && (
                  <div className="ml-auto w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: '#f59e0b' }}>
                    <Check className="w-2.5 h-2.5 text-black" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Canvas + Input obok siebie */}
          <div className="flex flex-col sm:flex-row gap-6 items-start">

            {/* Podgląd canvas */}
            <div className="flex-shrink-0 flex flex-col items-center gap-2">
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Podgląd układu</p>
              <LetterCanvas text={text} format={format} />
            </div>

            {/* Input */}
            <div className="flex-1 flex flex-col gap-4 justify-center" style={{ paddingTop: '1.5rem' }}>
              <label className="block text-[10px] uppercase tracking-[0.25em] font-black text-white/50 mb-1">
                Wpisz tekst
              </label>
              <input
                type="text"
                maxLength={maxChars}
                placeholder={format === 'portrait' ? 'np. A, Ania, LOVE' : 'np. AIFLOW, SUMMER'}
                value={text}
                onChange={e => setText(e.target.value.replace(/[^a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9]/g, '').slice(0, maxChars))}
                className="w-full bg-white/5 border rounded-xl px-5 py-4 text-3xl font-black uppercase text-center text-white outline-none transition-all"
                style={{
                  letterSpacing: '0.25em',
                  borderColor: trimmed ? 'rgba(245,158,11,0.45)' : 'rgba(255,255,255,0.1)',
                  boxShadow: trimmed ? '0 0 20px rgba(245,158,11,0.08)' : 'none',
                }}
              />
              <div className="flex justify-between px-1">
                <p className="text-white/25 text-[10px]">
                  {format === 'portrait' ? '1 litera / inicjał / imię (max 6)' : 'Imię, słowo lub fraza (max 10)'}
                </p>
                <span className="text-white/25 text-[10px] font-bold">{trimmed.length}/{maxChars}</span>
              </div>
              {trimmed.length > 1 && (
                <div className="rounded-xl p-3 text-[10px] text-amber-400/60 leading-relaxed"
                  style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)' }}>
                  {format === 'portrait'
                    ? `${trimmed.length} liter · układ pionowy po przekątnej, każda lekko w prawo`
                    : `${trimmed.length} liter · układ poziomy po przekątnej, każda lekko niżej`}
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* KROK 2: STYL */}
        <Section step="2" title="Styl litery">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {STYLES.map(s => (
              <button key={s.id} onClick={() => setSelStyle(s)}
                className="relative p-4 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: selStyle?.id === s.id ? `${s.color}14` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${selStyle?.id === s.id ? s.color + '55' : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: selStyle?.id === s.id ? `0 0 18px ${s.color}1a` : 'none',
                }}>
                <div className="text-2xl mb-1">{s.emoji}</div>
                <div className="text-xs font-black uppercase tracking-wider text-white">{s.label}</div>
                <div className="text-[10px] text-white/35 mt-0.5">{s.desc}</div>
                {selStyle?.id === s.id && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: s.color }}>
                    <Check className="w-2.5 h-2.5 text-black" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </Section>

        {/* KROK 3: TŁO */}
        <Section step="3" title="Tło">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {BACKGROUNDS.map(bg => (
              <button key={bg.id} onClick={() => setSelBg(bg)}
                className="p-3 rounded-xl text-left transition-all hover:scale-[1.02]"
                style={{
                  background: selBg?.id === bg.id ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${selBg?.id === bg.id ? 'rgba(245,158,11,0.45)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                <div className="w-full h-8 rounded-md mb-2" style={{ background: bg.preview, border: '1px solid rgba(255,255,255,0.06)' }} />
                <div className="text-[10px] font-black uppercase tracking-wider text-white">{bg.label}</div>
              </button>
            ))}
          </div>
        </Section>

        {/* GENERUJ */}
        <div className="text-center space-y-4">
          {error && (
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
              <Lock className="w-4 h-4 flex-shrink-0" />
              {error}
              <a href={STRIPE_MONTHLY} target="_blank" rel="noopener noreferrer"
                className="ml-2 text-amber-400 font-black underline text-xs uppercase tracking-widest whitespace-nowrap">
                Kup Pro →
              </a>
            </div>
          )}

          <button onClick={handleGenerate} disabled={!canGen}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all"
            style={{
              background: canGen ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'rgba(255,255,255,0.05)',
              color: canGen ? '#000' : 'rgba(255,255,255,0.2)',
              boxShadow: canGen ? '0 0 40px rgba(245,158,11,0.3),0 8px 20px rgba(245,158,11,0.15)' : 'none',
              cursor: canGen ? 'pointer' : 'not-allowed',
            }}>
            {generating
              ? <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> Generuję…</>
              : <><Sparkles className="w-4 h-4" /> Generuj prompt
                  {!tokenData.isPro && user && (
                    <span className="ml-1 text-[10px] opacity-60 font-normal normal-case tracking-normal">
                      ({loadingTok ? '…' : tokenData.tokensText} tok.)
                    </span>
                  )}
                </>}
          </button>

          {!user && (
            <p className="text-white/25 text-xs">
              Zaloguj się aby generować —{' '}
              <button onClick={() => setShowLogin(true)} className="text-amber-400 underline">kliknij tutaj</button>
            </p>
          )}
        </div>

        {/* WYNIK */}
        {prompt && (
          <div ref={promptRef} className="rounded-2xl p-6 space-y-4"
            style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] font-black text-amber-400">Gotowy prompt</p>
                <p className="text-[10px] text-white/30 mt-0.5">Wklej do Midjourney, Ideogram lub Kling</p>
              </div>
              <button onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                style={{
                  background: copied ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                  border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
                  color: copied ? '#4ade80' : '#fbbf24',
                }}>
                {copied ? <><Check className="w-3 h-3" /> Skopiowano</> : <><Copy className="w-3 h-3" /> Kopiuj</>}
              </button>
            </div>
            <p className="text-white/70 text-sm leading-relaxed font-mono bg-black/30 rounded-xl p-4 select-all"
              style={{ wordBreak: 'break-word' }}>
              {prompt}
            </p>
            <div className="flex flex-wrap gap-2 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <Tag emoji={format === 'portrait' ? '📱' : '🖥️'} label={format === 'portrait' ? '9:16' : '16:9'} />
              <Tag emoji="✍️" label={text.toUpperCase()} />
              <Tag emoji={selStyle.emoji} label={selStyle.label} />
              <Tag emoji="🖼️" label={selBg.label} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { name: 'Midjourney', url: 'https://midjourney.com', emoji: '🎨' },
                { name: 'Ideogram',   url: 'https://ideogram.ai',    emoji: '🔤' },
                { name: 'Kling AI',   url: 'https://kling.ai',       emoji: '🎬' },
              ].map(t => (
                <a key={t.name} href={t.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                  <span>{t.emoji}</span> {t.name}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* PRO BANNER */}
        {user && !tokenData.isPro && (
          <div className="rounded-2xl p-6 text-center"
            style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.08),rgba(217,119,6,0.04))', border: '1px solid rgba(245,158,11,0.15)' }}>
            <p className="text-[10px] uppercase tracking-[0.3em] font-black text-amber-400 mb-1">AI Flow Pro</p>
            <p className="text-white font-black text-lg mb-1">Generuj bez limitu</p>
            <p className="text-white/40 text-xs mb-4">Kreator Napisów + Avatar + Reklama + Lifestyle + Film Builder</p>
            <a href={STRIPE_MONTHLY} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all"
              style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#000', boxShadow: '0 0 30px rgba(245,158,11,0.3)' }}>
              <Sparkles className="w-4 h-4" /> 89 PLN / miesiąc
            </a>
          </div>
        )}
      </div>

      {/* LOGIN MODAL */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50"
          onClick={() => setShowLogin(false)}>
          <div className="bg-[#0A0A0A] rounded-2xl p-8 w-full max-w-sm border border-white/10 shadow-2xl relative"
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors">✕</button>
            <img src="/logo.png" alt="AI Flow" className="h-7 w-auto mb-5" />
            <h2 className="text-lg font-black uppercase tracking-tighter text-white mb-1">
              {loginMode === 'login' ? 'Witaj ponownie' : 'Utwórz konto'}
            </h2>
            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-6">
              {loginMode === 'login' ? 'Zaloguj się aby generować' : 'Dołącz do AI Flow Academy'}
            </p>
            <button onClick={handleGoogle} disabled={loginLoad}
              className="w-full flex items-center justify-center gap-3 py-3 border-2 rounded-xl font-bold text-sm text-white hover:border-amber-500 transition-all mb-4 disabled:opacity-50"
              style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Kontynuuj przez Google
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <span className="text-[10px] text-white/20 uppercase font-bold">lub</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            </div>
            <form onSubmit={handleEmail} className="space-y-3">
              <input type="email" required placeholder="Adres email" value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                className="w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-amber-500 transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
              <input type="password" required placeholder="Hasło (min. 6 znaków)" value={loginPwd}
                onChange={e => setLoginPwd(e.target.value)}
                className="w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-amber-500 transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
              {loginErr && <p className="text-red-400 text-xs font-bold">{loginErr}</p>}
              <button type="submit" disabled={loginLoad}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl uppercase text-[10px] tracking-widest transition-all disabled:opacity-50">
                {loginLoad ? '…' : loginMode === 'login' ? 'Zaloguj się' : 'Utwórz konto'}
              </button>
            </form>
            <button onClick={() => setLoginMode(m => m === 'login' ? 'register' : 'login')}
              className="w-full mt-4 text-[10px] text-white/25 hover:text-white/50 transition-colors uppercase tracking-widest">
              {loginMode === 'login' ? 'Nie masz konta? Zarejestruj się' : 'Masz już konto? Zaloguj się'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Section({ step, title, children }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-black flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
          {step}
        </div>
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white/80">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Tag({ emoji, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
      {emoji} {label}
    </span>
  );
}
