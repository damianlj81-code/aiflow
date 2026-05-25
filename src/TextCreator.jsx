// TextCreator.jsx — Hub Aplikacje 2
// AI Flow Academy | loveaiflow.com
// Kreatory: Napisy, Kolorowanki, Koszulki — z systemem tokenów i Firebase Auth

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Copy, Check, Sparkles, ArrowLeft, ChevronRight } from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, runTransaction } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCkwadV6OAvNW8NASmZ6qYh7zKV1xBLnss",
  authDomain: "aiflow-academy.firebaseapp.com",
  projectId: "aiflow-academy",
  storageBucket: "aiflow-academy.firebasestorage.app",
  messagingSenderId: "397056782057",
  appId: "1:397056782057:web:8eb4ff5bd4fcbc7f0aca78",
};

const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
const appId = 'aiflow_academy';
const STRIPE_MONTHLY = 'https://buy.stripe.com/bJe00icGJgOX6R22fE8bS0c';
const STRIPE_ANNUAL  = 'https://buy.stripe.com/cNieVc369buD3EQ07w8bS0d';

// ─── TOKEN FUNCTIONS ──────────────────────────────────────────────────────────
async function getTokenData(uid) {
  if (!uid) return null;
  const ref = doc(db, 'artifacts', appId, 'public', 'data', 'tokens', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    const now = new Date();
    const expiresAt = data.expiresAt?.seconds
      ? new Date(data.expiresAt.seconds * 1000)
      : data.expiresAt ? new Date(data.expiresAt) : null;
    const isExpired = expiresAt ? now > expiresAt : false;
    const isPro = (data.pro === true || data.starter === true) && !isExpired;
    return { ...data, isPro };
  } else {
    const newData = { uid, tokens_text: 1, tokens_coloring: 1, tokens_merch: 1, tokens_viral: 1, pro: false, used: 0, createdAt: new Date().toISOString() };
    await setDoc(ref, newData);
    return { ...newData, isPro: false };
  }
}

async function useCreatorToken(uid, creatorKey) {
  const ref = doc(db, 'artifacts', appId, 'public', 'data', 'tokens', uid);
  try {
    return await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists()) return false;
      const data = snap.data();
      if (data.pro === true || data.starter === true) return true;
      const field = `tokens_${creatorKey}`;
      const currentTokens = data[field] ?? 0;
      if (currentTokens <= 0) return false;
      transaction.update(ref, { [field]: increment(-1), used: increment(1) });
      return true;
    });
  } catch (e) {
    console.error('Transaction failed:', e);
    return false;
  }
}

// ─── NAV ─────────────────────────────────────────────────────────────────────
function Nav({ user, onLogin, onLogout }) {
  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-4"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between">
          <a href="/"><img src="/logo.png" alt="AI Flow" className="h-8 w-auto" /></a>
          <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {[
              { label: 'Academy',     href: '/' },
              { label: 'Aplikacje',   href: '/?view=aplikacje' },
              { label: 'Aplikacje 2', href: '/text.html',       active: true },
              { label: 'Dodatki',     href: '/?view=dodatki' },
              { label: 'Tutoriale',   href: '/?view=tutorials' },
              { label: 'Cennik',      href: '/?view=cennik' },
            ].map(item => (
              <a key={item.label} href={item.href}
                className="relative px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                style={{ background: item.active ? '#f59e0b' : 'transparent', color: item.active ? '#000' : 'rgba(255,255,255,0.4)' }}>
                {item.label}
                {item.active && <span className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-1 h-1 bg-amber-400 rounded-full" style={{ boxShadow: '0 0 6px rgba(245,158,11,0.8)' }} />}
              </a>
            ))}
          </div>
          <div className="sm:hidden">
            <a href="/" className="w-9 h-9 flex items-center justify-center rounded-xl text-white/70" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>☰</a>
          </div>
          {user && !user.isAnonymous ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:block text-[10px] text-white/40 font-bold truncate max-w-[120px]">{user.email || user.displayName}</span>
              <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 rounded-xl text-black text-[10px] font-black uppercase tracking-widest transition-all" style={{ background: '#f59e0b' }}>
                Wyloguj
              </button>
            </div>
          ) : (
            <button onClick={onLogin} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span className="hidden sm:block">Zaloguj</span>
            </button>
          )}
        </div>
      </nav>
      <div style={{ height: '64px' }} />
    </>
  );
}

// ─── SHARED OUTPUT ────────────────────────────────────────────────────────────
function PromptOutput({ prompt, onRegenerate, color = '#f59e0b', id = 'prompt-out' }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    catch { const el = document.getElementById(id); if (el) { const r = document.createRange(); r.selectNode(el); window.getSelection().removeAllRanges(); window.getSelection().addRange(r); } }
  }
  return (
    <div className="rounded-2xl p-6 space-y-4" style={{ background: `${color}08`, border: `1px solid ${color}33` }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] font-black" style={{ color }}>Gotowy prompt</p>
          <p className="text-[10px] text-white/30 mt-0.5">Kliknij w pole aby zaznaczyć lub użyj przycisku</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {onRegenerate && (
            <button onClick={onRegenerate} className="flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest"
              style={{ background: `${color}15`, border: `1px solid ${color}44`, color }}>
              🎲 Nowa losowa
            </button>
          )}
          <button onClick={copy} className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all"
            style={{ background: copied ? 'rgba(34,197,94,0.15)' : `${color}15`, border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : color + '44'}`, color: copied ? '#4ade80' : color }}>
            {copied ? <><Check className="w-3.5 h-3.5" /> Skopiowano!</> : <><Copy className="w-3.5 h-3.5" /> Kopiuj prompt</>}
          </button>
        </div>
      </div>
      <textarea id={id} readOnly value={prompt} onClick={e => e.target.select()}
        className="w-full text-white/70 text-sm leading-relaxed font-mono rounded-xl p-4 resize-none outline-none cursor-text"
        style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', minHeight: '120px' }} />
    </div>
  );
}

function Step({ n, title, color = '#f59e0b', children }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-black flex-shrink-0"
          style={{ background: `linear-gradient(135deg,${color},${color}cc)` }}>{n}</div>
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white/80">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// =========================================================================
// KREATOR 1 — NAPISY
// =========================================================================
const TEXT_STYLES = [
  { id: 'floral',    emoji: '🌸', label: 'Kwiatowy',           desc: 'róże, piwonie, lilie',          color: '#f9a8d4', prompt: 'made entirely of roses, peonies, and lilies in full bloom, petals and leaves forming every curve of the letter, photorealistic macro photography, soft pink and white florals, green stems intertwining, dewdrops on petals, butterflies landing on petals' },
  { id: 'bulb',      emoji: '💡', label: 'Żarówki świąteczne', desc: 'lampki, drut, blask',            color: '#fbbf24', prompt: 'constructed from glowing vintage Edison filament bulbs and copper wire, warm golden bokeh lights in background, festive string lights wrapping each curve of the letter, soft glowing halos around each bulb, retro holiday atmosphere' },
  { id: 'botanical', emoji: '🍃', label: 'Botaniczny',         desc: 'liście, gałęzie, rośliny',      color: '#86efac', prompt: 'formed from intertwining botanical elements — fern fronds, eucalyptus branches, tropical leaves, moss and tiny wildflowers, lush green palette with golden hour light filtering through' },
  { id: 'crystal',   emoji: '💎', label: 'Kryształowy',        desc: 'szkło, diament, pryzmat',       color: '#93c5fd', prompt: 'sculpted from pure crystal and faceted diamond-cut glass, internal light refractions creating rainbow caustics, translucent icy-blue and violet hues, ultra-sharp reflections, luxury jewellery photography lighting' },
  { id: 'lava',      emoji: '🔥', label: 'Lawa / Ogień',       desc: 'magma, płomienie, żar',         color: '#f97316', prompt: 'forged from molten lava and roaring fire, glowing orange-red magma cracks along every surface, dark volcanic rock texture beneath, embers and sparks floating upward, dramatic rim lighting' },
  { id: 'ice',       emoji: '🧊', label: 'Lodowy',             desc: 'lód, szron, śnieg',             color: '#bae6fd', prompt: 'carved from transparent glacial ice, frosted crystalline texture with deep arctic-blue internal glow, snowflake micro-crystals on surface, ice splinter details, cold breath fog surrounding' },
  { id: 'choco',     emoji: '🍫', label: 'Czekoladowy',        desc: 'mleczna czekolada, kakao',      color: '#a16207', prompt: 'sculpted from glossy milk chocolate with velvety matte cocoa powder texture, smooth ganache sheen, chocolate drips flowing down edges, caramel highlight on curves' },
  { id: 'moss',      emoji: '🌿', label: 'Mech / Leśny',       desc: 'mech, las, natura',             color: '#4ade80', prompt: 'completely covered in lush green forest moss and tiny mushrooms, lichen textures across entire surface, embedded acorns and pine needles, soft dappled forest light' },
  { id: 'gold',      emoji: '✨', label: 'Złoty luksusowy',    desc: '24k złoto, blask, luksus',      color: '#f59e0b', prompt: 'cast in solid 24-karat gold with mirror-polished surface, intricate engraved filigree detailing, dramatic studio specular highlights, dark velvet background' },
  { id: 'redstone',  emoji: '🪨', label: 'Czerwony kamień',    desc: 'czerwony granit, czarny marmur',color: '#ef4444', prompt: 'sculpted from deep crimson red granite stone with rough natural texture, placed on polished black marble surface, dramatic spotlight from above, luxury stone carving' },
  { id: 'whatsapp',  emoji: '💬', label: 'WhatsApp / Neon',    desc: 'jaskrawa zieleń, neon glow',    color: '#22c55e', prompt: 'made of vibrant neon green glowing material, bright electric green luminescent surface like neon sign, strong green glow radiating outward, dark black background, cyberpunk energy' },
  { id: 'subscribe', emoji: '🔴', label: 'Subskrybuj',         desc: 'czerwony YouTube, biały blask', color: '#dc2626', prompt: 'bold bright red glossy material like YouTube subscribe button, smooth lacquered red surface with white reflections, clean modern design, pure white background' },
  { id: 'carpet',    emoji: '🪵', label: 'Dywanowy',           desc: 'perski dywan, białe litery',    color: '#a78bfa', prompt: 'letters formed from ornate Persian carpet texture with intricate floral patterns in deep red, navy and gold, white fluffy letters standing out against rich carpet background' },
];

const TEXT_BGS = [
  { id: 'white',       label: 'Białe studio',      prompt: 'clean white studio background, soft diffused professional light',               preview: 'linear-gradient(135deg,#fff,#f0f0f0)' },
  { id: 'black',       label: 'Czarne eleganckie', prompt: 'deep black elegant background, dramatic chiaroscuro lighting',                   preview: 'linear-gradient(135deg,#111,#2a2a2a)' },
  { id: 'pastel',      label: 'Pastelowe',         prompt: 'soft pastel blurred background in complementary hues, dreamy bokeh',             preview: 'linear-gradient(135deg,#fce7f3,#ddd6fe,#bfdbfe)' },
  { id: 'marble',      label: 'Marmur biały',      prompt: 'luxurious white Carrara marble surface with subtle grey veining',               preview: 'linear-gradient(135deg,#f5f5f5,#d4d4d4)' },
  { id: 'blackmarble', label: 'Marmur czarny',     prompt: 'polished black marble surface with subtle gold and grey veining',               preview: 'linear-gradient(135deg,#1a1a1a,#2d2d2d)' },
  { id: 'wood',        label: 'Drewno',            prompt: 'warm rustic oak wood planks with natural grain texture, soft side lighting',     preview: 'linear-gradient(135deg,#92400e,#b45309)' },
  { id: 'neon',        label: 'Neon / Cyber',      prompt: 'dark cyberpunk background with neon grid lines, deep black with purple and cyan neon glow accents', preview: 'linear-gradient(135deg,#0a0a1a,#1a0a2e)' },
];

const LCOLORS = ['#f59e0b','#fb923c','#f472b6','#a78bfa','#34d399','#60a5fa','#4ade80','#e879f9','#facc15','#f87171'];

function LetterCanvas({ text, format }) {
  const ref = useRef(null);
  const draw = useCallback(() => {
    const canvas = ref.current; if (!canvas) return;
    const portrait = format === 'portrait';
    const W = portrait ? 198 : 352, H = portrait ? 352 : 198;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0c0c0c'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(245,158,11,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
    const letters = text.toUpperCase().replace(/\s/g, '').split('').filter(Boolean);
    if (!letters.length) { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.font = '500 12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('wpisz tekst…', W / 2, H / 2); return; }
    const n = letters.length;
    const cellSize = portrait ? Math.min(W * 0.72, (H * 0.84) / n) : Math.min(H * 0.72, (W * 0.84) / n);
    const fontSize = Math.max(14, Math.floor(cellSize * 0.74));
    ctx.font = `900 ${fontSize}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (portrait) {
      const totalH = n * cellSize, startY = (H - totalH) / 2 + cellSize / 2;
      const xSwing = Math.min(W * 0.32, fontSize * (n - 1) * 0.28), startX = W / 2 - xSwing / 2;
      letters.forEach((letter, i) => {
        const tv = n === 1 ? 0.5 : i / (n - 1), x = n === 1 ? W / 2 : startX + tv * xSwing, y = startY + i * cellSize, col = LCOLORS[i % LCOLORS.length];
        ctx.save(); ctx.globalAlpha = 0.13; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, fontSize * 0.54, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#000'; ctx.fillText(letter, x + 1.5, y + 2); ctx.restore();
        ctx.fillStyle = col; ctx.globalAlpha = 1; ctx.fillText(letter, x, y);
      });
    } else {
      const totalW = n * cellSize, startX = (W - totalW) / 2 + cellSize / 2;
      const ySwing = Math.min(H * 0.32, fontSize * (n - 1) * 0.28), startY = H / 2 - ySwing / 2;
      letters.forEach((letter, i) => {
        const tv = n === 1 ? 0.5 : i / (n - 1), x = startX + i * cellSize, y = n === 1 ? H / 2 : startY + tv * ySwing, col = LCOLORS[i % LCOLORS.length];
        ctx.save(); ctx.globalAlpha = 0.13; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, fontSize * 0.54, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#000'; ctx.fillText(letter, x + 1.5, y + 2); ctx.restore();
        ctx.fillStyle = col; ctx.globalAlpha = 1; ctx.fillText(letter, x, y);
      });
    }
    ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#fbbf24'; ctx.font = '600 10px system-ui'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(portrait ? '9:16' : '16:9', W - 8, H - 7); ctx.restore();
  }, [text, format]);
  React.useEffect(() => { draw(); }, [draw]);
  return <canvas ref={ref} style={{ borderRadius: '10px', display: 'block', maxWidth: '100%' }} />;
}

function NapisyView({ onBack, user, onConsumeToken, tokenData, onPaywall }) {
  const [text, setText] = useState('');
  const [format, setFormat] = useState('portrait');
  const [selStyle, setSelStyle] = useState(null);
  const [selBg, setSelBg] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const promptRef = useRef(null);
  const maxChars = format === 'portrait' ? 6 : 10;
  const trimmed = text.trim();
  const canGen = trimmed.length >= 1 && selStyle && selBg && !isGenerating;

  React.useEffect(() => { if (trimmed.length > maxChars) setText(t => t.slice(0, maxChars)); }, [format]);

  async function handleGenerate() {
    if (!canGen) return;
    setIsGenerating(true);
    try {
    const letters = trimmed.toUpperCase().split('');
    const isMulti = letters.length > 1;
    const arr = format === 'portrait' ? 'arranged diagonally from upper-left to lower-right, stacked vertically, each letter slightly offset to the right' : 'arranged diagonally from upper-left to lower-right along a horizontal axis, each letter slightly lower';
    const subject = isMulti ? `the letters ${letters.join(', ')} spelling "${trimmed.toUpperCase()}", ${arr}` : `a single large decorative letter "${trimmed.toUpperCase()}" centered`;
    const ar = format === 'portrait' ? '--ar 9:16' : '--ar 16:9';
    setPrompt(`Photorealistic 3D render of ${subject}, each letter ${selStyle.prompt}, placed on ${selBg.prompt}. Every letter is clearly legible and three-dimensional. Shot with 85mm macro lens, studio product photography. No text overlay, no watermark. Ultra-detailed, 8K resolution, ${ar} --style raw --v 6.1`);
      await onConsumeToken?.();
      setTimeout(() => promptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    } catch(e) { console.error(e); }
    finally { setIsGenerating(false); }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pb-24">
      <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-amber-400 transition-colors mb-6 pt-6">
        <ArrowLeft className="w-4 h-4" /> Powrót
      </button>
      <div className="text-center mb-10">
        <div className="text-5xl mb-4" style={{ filter: 'drop-shadow(0 0 30px rgba(245,158,11,0.5))' }}>✍️</div>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-2 text-white">Kreator <span style={{ color: '#f59e0b' }}>Napisów</span></h1>
        <p className="text-white/40 text-sm">Generuj prompty do artystycznych liter — wklej do swojego generatora AI</p>
      </div>
      <div className="space-y-10">
        <Step n="1" title="Format i tekst">
          <div className="flex gap-3 mb-6">
            {[{ id: 'portrait', emoji: '📱', label: '9:16 Pionowy', sub: 'TikTok / Reels · max 6' }, { id: 'landscape', emoji: '🖥️', label: '16:9 Poziomy', sub: 'YouTube · max 10' }].map(f => (
              <button key={f.id} onClick={() => setFormat(f.id)} className="flex-1 py-3 px-4 rounded-xl flex items-center gap-3 text-left transition-all"
                style={{ background: format === f.id ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${format === f.id ? 'rgba(245,158,11,0.45)' : 'rgba(255,255,255,0.08)'}` }}>
                <span className="text-xl">{f.emoji}</span>
                <div><div className="text-xs font-black uppercase text-white">{f.label}</div><div className="text-[10px] text-white/35">{f.sub}</div></div>
                {format === f.id && <div className="ml-auto w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#f59e0b' }}><Check className="w-2.5 h-2.5 text-black" /></div>}
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="flex-shrink-0 flex flex-col items-center gap-2">
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Podgląd</p>
              <LetterCanvas text={text} format={format} />
            </div>
            <div className="flex-1 pt-6">
              <input type="text" maxLength={maxChars} placeholder="np. A, Ania, LOVE" value={text}
                onChange={e => setText(e.target.value.replace(/[^a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9]/g, '').slice(0, maxChars))}
                className="w-full bg-white/5 border rounded-xl px-5 py-4 text-3xl font-black uppercase text-center text-white outline-none transition-all"
                style={{ letterSpacing: '0.25em', borderColor: trimmed ? 'rgba(245,158,11,0.45)' : 'rgba(255,255,255,0.1)' }} />
              <div className="flex justify-between px-1 mt-2">
                <p className="text-white/25 text-[10px]">1 litera / inicjał / imię</p>
                <span className="text-white/25 text-[10px] font-bold">{trimmed.length}/{maxChars}</span>
              </div>
            </div>
          </div>
        </Step>
        <Step n="2" title="Styl litery">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TEXT_STYLES.map(s => (
              <button key={s.id} onClick={() => setSelStyle(s)} className="relative p-4 rounded-xl text-left transition-all hover:scale-[1.02]"
                style={{ background: selStyle?.id === s.id ? `${s.color}14` : 'rgba(255,255,255,0.03)', border: `1px solid ${selStyle?.id === s.id ? s.color + '55' : 'rgba(255,255,255,0.08)'}` }}>
                <div className="text-2xl mb-1">{s.emoji}</div>
                <div className="text-xs font-black uppercase text-white">{s.label}</div>
                <div className="text-[10px] text-white/35">{s.desc}</div>
                {selStyle?.id === s.id && <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: s.color }}><Check className="w-2.5 h-2.5 text-black" /></div>}
              </button>
            ))}
          </div>
        </Step>
        <Step n="3" title="Tło">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TEXT_BGS.map(bg => (
              <button key={bg.id} onClick={() => setSelBg(bg)} className="p-3 rounded-xl text-left transition-all hover:scale-[1.02]"
                style={{ background: selBg?.id === bg.id ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selBg?.id === bg.id ? 'rgba(245,158,11,0.45)' : 'rgba(255,255,255,0.08)'}` }}>
                <div className="w-full h-8 rounded-md mb-2" style={{ background: bg.preview }} />
                <div className="text-[10px] font-black uppercase text-white">{bg.label}</div>
              </button>
            ))}
          </div>
        </Step>
        <div className="text-center">
          <button onClick={handleGenerate} disabled={!canGen} className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all"
            style={{ background: canGen ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'rgba(255,255,255,0.05)', color: canGen ? '#000' : 'rgba(255,255,255,0.2)', cursor: canGen ? 'pointer' : 'not-allowed', boxShadow: canGen ? '0 0 40px rgba(245,158,11,0.3)' : 'none' }}>
            <Sparkles className="w-4 h-4" /> {isGenerating ? 'Generowanie...' : 'Generuj prompt'}
          </button>
        </div>
        {prompt && <div ref={promptRef}><PromptOutput prompt={prompt} color="#f59e0b" id="text-prompt" /></div>}

        {/* ── GALERIA PRZYKŁADÓW ── */}
        <div className="mt-12 mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 mb-4 text-center">✦ Przykładowe rezultaty</p>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide justify-center">
            {['/examples/napis1.jpg','/examples/napis2.jpg','/examples/napis3.jpg'].map((src, i) => (
              <div key={i} className="flex-shrink-0 snap-start w-36 h-52 md:w-44 md:h-64 rounded-2xl overflow-hidden border border-white/10"
                style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                <img src={src} alt={`Przykład napisu ${i+1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" onError={e => e.currentTarget.parentElement.style.display="none"} />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// =========================================================================
// KREATOR 2 — KOLOROWANKI
// =========================================================================
const COL_CATS = [
  { id: 'dino', emoji: '🦖', label: 'Dinozaury', group: 'dzieci', prompts: [
    'a fierce T-Rex roaring in a jungle clearing','a friendly Triceratops eating plants in a prehistoric forest',
    'a group of baby dinosaurs hatching from eggs near a volcano','a Brachiosaurus reaching for leaves in a swamp at sunrise',
    'a Stegosaurus walking through a volcanic landscape','a Pterodactyl flying over a prehistoric sea with islands below',
    'a Velociraptor running through tall ferns in dense jungle','a Diplodocus in a river surrounded by palm trees',
    'a T-Rex and Triceratops facing each other on a cliff edge','a baby dinosaur playing in a waterfall pool',
    'a dinosaur family sheltering under giant fern leaves during rain','a Spinosaurus fishing in a prehistoric river',
    'dinosaur eggs in a nest surrounded by tropical flowers','a Ankylosaurus walking through a field of giant mushrooms',
    'a dinosaur herd crossing a vast prehistoric plain at sunset','a Pterodactyl nest on a rocky cliff with chicks',
    'a young dinosaur exploring a cave with glowing crystals','a T-Rex looking at its reflection in a still lake',
    'dinosaurs grazing near an erupting volcano','a dinosaur footprint trail leading through mud to a jungle'
  ]},
  { id: 'pets', emoji: '🐶', label: 'Zwierzęta domowe', group: 'dzieci', prompts: [
    'a fluffy puppy playing with a ball in a sunny garden','a kitten sleeping in a cozy basket by a fireplace',
    'a rabbit hopping through a flower meadow at springtime','a hamster running on a wheel with a smile',
    'a parrot sitting on a branch by an open window','a goldfish swimming in a bowl with colorful pebbles and plants',
    'a guinea pig eating a carrot in a grassy yard','a dog fetching a stick in a park with a pond',
    'a cat chasing a butterfly in a garden','a puppy and kitten napping together in a cozy bed',
    'a rabbit sitting in a field of daisies','a dog splashing in a puddle on a rainy day',
    'a cat watching birds through a window','a hamster exploring a cardboard maze',
    'a puppy dressed in a tiny raincoat walking in rain','a kitten playing with a ball of yarn by a window',
    'a dog and its owner walking in an autumn park','a cat sitting on a rooftop watching the sunset',
    'a rabbit family in a burrow decorated with flowers','a puppy meeting a baby duck by a pond'
  ]},
  { id: 'wild', emoji: '🦁', label: 'Dzikie zwierzęta', group: 'dzieci', prompts: [
    'a lion sitting proudly on a rock at golden sunset','an elephant spraying water with its trunk in a river',
    'a giraffe eating leaves from a tall acacia tree on the savanna','a zebra running across the African savanna at dawn',
    'a polar bear walking on arctic ice with northern lights above','a dolphin jumping out of ocean waves near a coral reef',
    'a wolf howling at the full moon in a snowy forest','a tiger hiding in tall grass by a jungle river',
    'a cheetah running across an open plain at full speed','a gorilla sitting in a rainforest clearing eating fruit',
    'a panda eating bamboo in a misty mountain forest','a kangaroo with a joey in its pouch in the Australian outback',
    'a bear catching fish in a mountain stream','a fox family playing outside their den in autumn forest',
    'a herd of elephants walking to a waterhole at sunset','a leopard resting on a tree branch in the savanna',
    'a rhinoceros walking through tall African grass','a hippo yawning in a river with birds on its back',
    'a snow leopard climbing rocky mountain terrain','a family of lions resting in the shade of an acacia tree'
  ]},
  { id: 'ocean', emoji: '🌊', label: 'Ocean', group: 'dzieci', prompts: [
    'a colorful clownfish swimming near sea anemones in a coral reef','a sea turtle gliding through a vibrant coral reef',
    'an octopus hiding between rocks on the ocean floor','a whale swimming in the deep ocean with sunlight filtering down',
    'a seahorse floating near underwater plants and coral','tropical fish in a vibrant coral reef with sea fans',
    'a crab walking on a sandy ocean floor near starfish','a jellyfish drifting through the open sea glowing softly',
    'a manta ray gliding over a coral reef','a school of colorful fish swimming around a sunken ship',
    'a dolphin family playing in ocean waves at sunset','a narwhal swimming through icy arctic waters',
    'a lobster walking along the ocean floor among seaweed','an anglerfish in the deep dark ocean with bioluminescent light',
    'a sea otter floating on its back cracking a shell','a baby whale with its mother near the ocean surface',
    'a starfish and hermit crab on a sandy seafloor','a barracuda swimming through a school of silver fish',
    'an underwater cave with glowing coral and curious fish','a seal playing with kelp in a sunny coastal ocean'
  ]},
  { id: 'birds', emoji: '🦜', label: 'Ptaki', group: 'dzieci', prompts: [
    'a colorful parrot perched on a tropical branch with flowers','an owl sitting on a tree branch at night under stars',
    'a flamingo standing in shallow water at tropical sunset','a peacock spreading its magnificent tail feathers in a garden',
    'a hummingbird hovering near a hibiscus flower','a penguin family walking on snow with icebergs behind',
    'an eagle soaring above mountain peaks with clouds below','a swan gliding on a calm lake at sunrise',
    'a toucan perched in a rainforest tree with colorful beak','a puffin standing on a rocky sea cliff',
    'a kingfisher diving into a clear stream after a fish','a robin sitting on a snow-covered branch in winter',
    'a crane dancing in a misty Japanese landscape','a woodpecker knocking on a tree in an autumn forest',
    'a flock of starlings forming a murmuration at sunset','a baby duck following its mother on a pond',
    'a hawk sitting on a fence post in a farm landscape','an albatross soaring over stormy ocean waves',
    'a blue jay sitting in a snow-covered pine tree','a parrot eating fruit in a colorful tropical jungle'
  ]},
  { id: 'insects', emoji: '🦋', label: 'Owady / Motyle', group: 'dzieci', prompts: [
    'a beautiful butterfly landing on a sunflower in a meadow','a ladybug climbing a green leaf with dewdrops',
    'a bee collecting nectar from a lavender flower','a dragonfly hovering above a lily pond',
    'a caterpillar crawling on a branch with leaves','ants carrying food pieces to their underground nest',
    'a firefly glowing in a dark forest at night','a grasshopper sitting in a summer meadow at golden hour',
    'a praying mantis on a rose petal in a garden','a hercules beetle on a tropical tree trunk',
    'butterflies of different colors flying in a flower garden','a moth resting on a moonlit flower at night',
    'a bee inside a flower gathering pollen','a spider building its web between garden flowers at dawn',
    'a cicada singing on a tree bark in summer','a stag beetle on a mossy log in a forest',
    'a swarm of butterflies over a wildflower meadow','a caterpillar building its cocoon on a branch',
    'a group of fireflies lighting up a dark forest clearing','a butterfly emerging from its chrysalis on a sunny branch'
  ]},
  { id: 'dragons', emoji: '🐉', label: 'Smoki / Fantasy', group: 'mlodzież', prompts: [
    'a majestic dragon perched on a castle tower breathing fire at night','a young dragon learning to fly over a mountain valley at sunset',
    'a water dragon emerging from a misty lake with lily pads','an ice dragon in a frozen tundra under northern lights',
    'a forest dragon curled around an ancient tree in a magical forest','a dragon and a knight facing each other in a meadow',
    'a dragon hatchling breaking out of a golden egg in a cave','a dragon soaring above storm clouds with lightning around it',
    'a small friendly dragon playing with village children near a well','a dragon sleeping on a mountain of treasure in a cave',
    'a sea dragon swimming through deep ocean waters with bioluminescence','a fire dragon perched on a volcano crater at night',
    'twin dragons flying together above a fantasy city','a dragon racing a phoenix across a sky full of stars',
    'a crystal dragon in an enchanted ice cave with glowing walls','a dragon protecting a fairy tale castle from invaders',
    'a baby dragon chasing butterflies in a magical garden','a dragon resting by a waterfall in a hidden valley',
    'a shadow dragon emerging from storm clouds above a dark forest','a golden dragon coiled around an ancient temple pillar'
  ]},
  { id: 'mermaids', emoji: '🧜', label: 'Syreny / Bajki', group: 'mlodzież', prompts: [
    'a mermaid sitting on a rock watching the sunset over the ocean','a mermaid exploring a sunken shipwreck with treasure',
    'a mermaid swimming gracefully with a pod of dolphins','a mermaid discovering a glowing treasure chest on the seafloor',
    'a mermaid and a sea horse in a magical underwater garden','a mermaid combing her hair on a moonlit beach with stars',
    'mermaids dancing around a coral castle in deep water','a mermaid rescuing a sailor from a stormy ocean',
    'a mermaid reading a book in an underwater library','a mermaid playing with baby sea turtles in shallow water',
    'a mermaid and a dolphin jumping together over a wave','a mermaid sleeping in a giant clamshell surrounded by pearls',
    'a mermaid exploring a cave filled with glowing sea creatures','a group of mermaids celebrating under a full moon',
    'a mermaid feeding colorful fish in a coral reef garden','a mermaid and a whale swimming together in the deep ocean',
    'a mermaid braiding seaweed into her hair on a reef','a baby mermaid learning to swim near her mother',
    'a mermaid watching fireworks from below the ocean surface','a mermaid tending to a garden of sea flowers on the ocean floor'
  ]},
  { id: 'cars', emoji: '🚗', label: 'Samochody klasyczne', group: 'mlodzież', prompts: [
    'a vintage 1960s muscle car on an open highway at sunset','a classic 1950s convertible parked on a beach with palm trees',
    'a retro racing car speeding on a track with crowd watching','an old-school pickup truck on a dusty desert country road',
    'a classic sports car in a mountain hairpin turn at dusk','a vintage hot rod at a retro car show under lights',
    'a 1970s van with psychedelic paint job on a forest road','a classic European sports car on a cobblestone European street',
    'a vintage ambulance parked outside an old hospital building','a classic fire truck racing through a rainy city street',
    'a 1940s gangster car parked outside an art deco building','a vintage VW beetle on a flower-lined countryside road',
    'a classic Mustang parked by a drive-in cinema at night','a retro race car in a garage surrounded by trophies',
    'a 1950s diner with classic cars parked outside','a classic car crossing a wooden bridge over a stream',
    'a vintage convertible driving along a coastal cliff road','a 1960s muscle car doing a burnout at a drag race',
    'a classic car being restored in a vintage workshop','a retro car show with dozens of classic cars at a fairground'
  ]},
  { id: 'space', emoji: '🚀', label: 'Kosmos', group: 'mlodzież', prompts: [
    'a rocket launching into space with fire and smoke trails','an astronaut floating in space with Earth below and stars',
    'a space station orbiting Earth with solar panels extended','an alien planet with two moons and strange glowing plants',
    'a Mars rover exploring a rocky red landscape with distant mountains','a black hole with swirling galaxy and light bending around it',
    'astronauts planting a flag on the Moon with Earth rising','a spaceship flying through an asteroid field near a nebula',
    'an alien city on a distant planet under a purple sky','a comet flying past Earth visible from space',
    'a space telescope floating in orbit capturing a nebula','an astronaut on a spacewalk repairing a satellite',
    'a futuristic colony on Mars with domed habitats and rovers','a giant alien creature floating in space near a galaxy',
    'planets aligned in a solar system with asteroid belt visible','a wormhole opening in space with ships passing through',
    'a space battle between futuristic starships near a planet','an astronaut discovering an alien artifact on an unknown planet',
    'a star being born in a colorful nebula cloud','a futuristic spaceport on the moon with ships landing and taking off'
  ]},
  { id: 'castles', emoji: '🏰', label: 'Zamki / Rycerze', group: 'mlodzież', prompts: [
    'a medieval knight in full armor on horseback in a forest','a princess in a tower window of a fairy tale castle',
    'a dragon attacking a medieval castle with fire at night','a wizard in a tower room surrounded by spell books and potions',
    'a medieval village market outside castle walls on a sunny day','a knight fighting a giant ogre in a dark enchanted forest',
    'a royal banquet hall filled with knights and nobles','a castle siege with catapults and archers on the walls',
    'a sword in a stone in a magical clearing in a forest','a jousting tournament outside a grand medieval castle',
    'a dwarf blacksmith forging armor in a mountain workshop','an elf archer in an ancient forest city in the treetops',
    'a mage casting a spell on a clifftop overlooking a kingdom','a dragon guarding castle gates while a hero approaches',
    'a royal coronation ceremony in a cathedral with stained glass','a map room in a castle with battle plans on a large table',
    'a knight crossing a drawbridge over a moat at dawn','a magical forest with fairies and glowing mushrooms near a castle',
    'a shipwreck of a pirate vessel on a rocky coast near a lighthouse','a medieval fair with acrobats and musicians outside castle walls'
  ]},
  { id: 'mandala', emoji: '🔮', label: 'Mandala', group: 'dorośli', prompts: [
    'an intricate geometric mandala with perfect circular symmetry','a floral mandala with lotus petals and delicate ornamental patterns',
    'a celestial mandala with stars moons and planets in symmetry','a nature mandala with leaves vines and flowers in perfect balance',
    'a tribal mandala with bold geometric shapes and dots','a butterfly mandala where wings form perfect bilateral symmetry',
    'an ocean mandala with waves shells and fish in circular pattern','a sacred geometry mandala with overlapping circles and triangles',
    'a detailed peacock mandala with feathers in circular symmetry','a snowflake-inspired mandala with intricate crystalline patterns',
    'a sun mandala with rays flowers and geometric details','a moon mandala with stars and crescent shapes in circular design',
    'a tree of life mandala with roots and branches in symmetry','an elephant mandala with decorative patterns and ornamental details',
    'a dragon mandala coiled into a perfect circular shape','a Celtic knot mandala with interlocking endless patterns',
    'a lotus flower mandala with many layers of petals','a zentangle-style mandala with complex repeating micro-patterns',
    'a fox mandala with flowing tail forming the outer circle','a wolf mandala with moon and forest elements in symmetry'
  ]},
  { id: 'flowers', emoji: '🌸', label: 'Kwiaty / Botanika', group: 'dorośli', prompts: [
    'a detailed botanical illustration of roses in full bloom with leaves','a wreath of wildflowers daisies poppies and cornflowers',
    'a tropical bouquet with hibiscus bird of paradise and orchids','a Victorian-style floral arrangement in an ornate vase',
    'a field of lavender stretching to the horizon with bees','a close-up of a sunflower with intricate detailed petals and seeds',
    'cherry blossom branches with delicate petals falling in wind','a garden scene with roses climbing a stone arch',
    'a detailed drawing of a water lily on a calm pond','a bouquet of wildflowers tied with a ribbon on a wooden table',
    'a succulent garden with many varieties of plants','an intricate honeysuckle vine climbing a garden fence',
    'a detailed peony bloom with layered petals and stamens','a window box overflowing with geraniums and trailing ivy',
    'a field of tulips in spring with windmill in background','a botanical study of an exotic orchid with detailed roots',
    'a wreath of autumn leaves berries and dried flowers','a trailing wisteria covering a stone wall in full bloom',
    'a detailed drawing of a cactus garden in a desert landscape','a moonlit garden with night-blooming flowers and fireflies'
  ]},
  { id: 'arch', emoji: '🏛️', label: 'Architektura', group: 'dorośli', prompts: [
    'the Eiffel Tower at sunset with intricate lattice ironwork detail','a beautiful Victorian house with ornate gingerbread trim',
    'a Moroccan riad courtyard with intricate tilework and fountain','a Japanese pagoda surrounded by cherry blossoms and koi pond',
    'a Gothic cathedral with detailed flying buttresses and rose window','a cozy cottage in an English country garden with roses',
    'a Mediterranean village perched on a cliff above the sea','a futuristic city skyline with flowing organic architecture',
    'the Colosseum in Rome with detailed arches and columns','a Gaudi-inspired building with flowing organic decorative forms',
    'a treehouse village connected by rope bridges in tall trees','a lighthouse on a rocky cliff with stormy waves below',
    'a Russian onion-domed church in a winter landscape with snow','an Art Nouveau cafe facade with ornate ironwork and glass',
    'a Byzantine cathedral interior with mosaics and arches','an ancient Greek temple on a hillside at golden hour',
    'a traditional Japanese tea house in a zen garden','a castle ruin overgrown with ivy and wildflowers',
    'a famous bridge like Brooklyn or Golden Gate in detailed line art','a traditional Moroccan souk marketplace with arched passages'
  ]},
  { id: 'christmas', emoji: '🎄', label: 'Boże Narodzenie', group: 'święta', prompts: [
    'Santa Claus in his sleigh with reindeer flying over a snowy village at night','a decorated Christmas tree with ornaments gifts and star on top',
    'a cozy Christmas scene with fireplace stockings and snow outside','elves in Santa workshop making and wrapping colorful toys',
    'a snowman family in a winter landscape with scarves and hats','children opening presents on Christmas morning by the tree',
    'a Christmas market with stalls lanterns and snow falling','a nativity scene with Mary Joseph and baby Jesus with shepherds',
    'reindeer grazing in a snowy magical forest at night','a gingerbread house with candy cane decorations and snow',
    'carolers singing outside a decorated Victorian house in snow','a child leaving cookies and milk out for Santa at night',
    'Santa delivering presents down a chimney in a cozy home','a winter village scene with ice skating pond and Christmas lights',
    'Christmas morning breakfast table with family and decorations','a snowy Christmas forest with deer and falling snowflakes',
    'Mrs Claus baking Christmas cookies in a cozy kitchen','a Christmas ornament collection hanging on branches',
    'a magical Christmas morning with snow falling outside the window','children building a snowman in a Christmas-decorated yard'
  ]},
  { id: 'easter', emoji: '🐣', label: 'Wielkanoc', group: 'święta', prompts: [
    'a basket filled with decorated Easter eggs and spring flowers','a cute Easter bunny delivering colorful eggs in a meadow',
    'children on an Easter egg hunt in a blooming spring garden','a baby chick hatching from a decorated Easter egg in grass',
    'a spring landscape with tulips daffodils and Easter decorations','an Easter table with decorated eggs flowers and spring branches',
    'a bunny family celebrating Easter in a meadow with flowers','traditional Easter basket with bread eggs and spring herbs',
    'Easter eggs hidden in a garden with flowers and butterflies','a spring nest with colorful Easter eggs and baby chicks',
    'a decorated Easter egg with intricate folk art patterns','bunnies painting Easter eggs in a colorful spring workshop',
    'a spring forest scene with Easter eggs hanging from branches','children making Easter egg decorations at a table',
    'a lamb in a spring meadow with Easter flowers','an Easter parade with flowers baskets and spring decorations',
    'a willow branch with Easter eggs hanging as decoration','a sunrise Easter morning scene with flowers and crosses',
    'a rabbit warren decorated for Easter with tiny eggs and flowers','spring birds building a nest near Easter decorated branches'
  ]},
  { id: 'halloween', emoji: '🎃', label: 'Halloween', group: 'święta', prompts: [
    'a haunted house on a hill under a full moon with bats flying','trick-or-treaters in costumes at a spooky decorated door',
    'a witch flying on a broomstick over a dark spooky forest','pumpkins carved with various expressions on a porch with candles',
    'a graveyard scene at night with ghosts tombstones and fog','a black cat sitting on a fence under a harvest moon',
    'a spooky forest with gnarled trees glowing eyes and fog','children at a Halloween party with costumes and decorations',
    'a cauldron bubbling with potion in a witch workshop','a skeleton dancing in a moonlit graveyard with lanterns',
    'a haunted mansion with ghosts in every window at night','jack-o-lanterns lined up on a porch in a foggy night',
    'a werewolf howling at the full moon on a hilltop','a vampire in a cape standing at a castle door at night',
    'a Halloween candy haul spread out with classic decorations','a spooky hayride through a dark cornfield at night',
    'a Frankenstein monster walking through a thunderstorm','a spider web covering a haunted house entrance with giant spider',
    'Halloween night with all monsters gathered in a full moon scene','trick or treat bags and candy with Halloween decorations'
  ]},
  { id: 'valentine', emoji: '❤️', label: 'Walentynki', group: 'święta', prompts: [
    'a romantic couple in a garden surrounded by red roses at sunset','a heart-shaped box of chocolates with roses and ribbons',
    'a couple sharing a meal at a candlelit restaurant table','love letters and flowers arranged with hearts on a table',
    'two swans forming a heart shape on a calm lake at dawn','a cozy scene with hot chocolate and candles by a fireplace',
    'a teddy bear holding a heart in a flower-filled garden','a romantic picnic in a park with hearts flowers and champagne',
    'Cupid flying over a city shooting arrows with hearts','a bouquet of roses being presented in a romantic gesture',
    'a couple dancing in a garden under fairy lights at night','heart-shaped balloons floating in a decorated room',
    'a love letter being written by candlelight with roses nearby','two hearts carved into a tree trunk in a romantic forest',
    'a romantic bridge over a canal with padlocks and hearts','a couple watching a sunset from a hilltop holding hands',
    'a Valentine cookie and cake display with hearts and flowers','a romantic boat ride on a lake with rose petals in water',
    'a cat and dog in tiny Valentine costumes with hearts','a cozy winter Valentine scene with hot cocoa and heart cookies'
  ]},
  { id: 'newyear', emoji: '🎆', label: 'Nowy Rok', group: 'święta', prompts: [
    'fireworks exploding over a city skyline at midnight celebration','people celebrating New Year in a city square with confetti',
    'a champagne toast with fireworks visible through a window','a clock showing midnight surrounded by party decorations and balloons',
    'a Times Square style New Year celebration with crowds and lights','a family watching fireworks from a snowy hilltop together',
    'a New Year party table with glasses champagne and countdown clock','couples dancing at an elegant New Year Eve gala with chandeliers',
    'a cozy home New Year celebration with friends around a table','sparklers being held up in the dark creating light trails',
    'a child watching their first New Year fireworks in awe','a harbor with boats celebrating New Year with fireworks over water',
    'a masked ball New Year Eve party with elegant costumes','a quiet New Year scene of a snowy village at midnight',
    'a New Year resolution being written in a journal by candlelight','a festive New Year parade through a decorated city street',
    'people releasing paper lanterns into a dark New Year sky','a rooftop New Year party overlooking a city at midnight',
    'a New Year countdown clock in a town square with crowds','fireworks reflected in a calm lake on New Year night'
  ]},
];

const COL_DIFF = [
  { id: 'tiny',   emoji: '👶', label: 'Maluszki (1-3 l.)',  desc: 'Bardzo grube linie',    prompt: 'very simple thick bold black outlines only, minimal details, designed for toddlers ages 1-3, large simple shapes, no tiny details, no shading, no gray fills, pure black lines on white background only' },
  { id: 'kids',   emoji: '🧒', label: 'Dzieci (4-8 l.)',    desc: 'Grube linie',            prompt: 'simple thick black outlines only, basic details, designed for young children ages 4-8, clear shapes, no shading, no gray fills, pure black lines on white background only' },
  { id: 'junior', emoji: '🧑', label: 'Młodzież (9-12 l.)', desc: 'Średnie linie',          prompt: 'medium weight black outlines only, moderate detail level, designed for children ages 9-12, no shading, no gray fills, no gradients, pure black lines on white background only, coloring book style' },
  { id: 'teen',   emoji: '🧑‍🎓', label: 'Nastolatki (12-15 l.)', desc: 'Cienkie linie',   prompt: 'fine detailed black outlines only, intricate details, designed for teenagers ages 12-15, absolutely no shading, no gray fills, no gradients, pure crisp black lines on white background, professional coloring book style' },
];

const COL_GROUPS = [
  { id: 'all', label: 'Wszystkie' }, { id: 'dzieci', label: 'Dla dzieci' },
  { id: 'mlodzież', label: 'Młodzież' }, { id: 'dorośli', label: 'Dorośli' }, { id: 'święta', label: 'Święta' },
];

const GENERATORS = [
  { id: 'flux',      label: 'Flux',      emoji: '⚡' },
  { id: 'mj',        label: 'Midjourney',emoji: '🎨' },
  { id: 'ideogram',  label: 'Ideogram',  emoji: '🔤' },
  { id: 'firefly',   label: 'Firefly',   emoji: '🔥' },
];

function KolorowankaView({ onBack, user, onConsumeToken, tokenData, onPaywall }) {
  const [selCat, setSelCat] = useState(null);
  const [selDiff, setSelDiff] = useState(null);
  const [group, setGroup] = useState('all');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selGenerator, setSelGenerator] = useState('flux');
  const promptRef = useRef(null);
  const filtered = group === 'all' ? COL_CATS : COL_CATS.filter(c => c.group === group);
  const canGen = selCat && selDiff && !isGenerating;

  function buildColoringPrompt(scene) {
    const base = `Black and white coloring book page illustration of ${scene}. ${selDiff.prompt}.`;
    switch(selGenerator) {
      case 'flux':
        return `${base} Clean black outlines only, pure white background, no shading, no gray fills, no gradients, coloring book style, print-ready.`;
      case 'mj':
        return `${base} Pure white background, clean crisp black lines only, no grey shading, no color fills, no gradients, no shadows — only black outlines on white background. Professional coloring book style, print-ready for 8.5x11 inch KDP page. --ar 3:4 --style raw --v 6.1`;
      case 'ideogram':
        return `${base} Coloring book page, thick black outlines, pure white background, no color, no shading, no gradients, black and white only, KDP ready, 8.5x11.`;
      case 'firefly':
        return `${base} Line art only, black outlines on white background, no color fills, no shading, no gradients, coloring book illustration style, print ready.`;
      default:
        return base;
    }
  }

  async function handleGenerate() {
    if (!canGen) return;
    setIsGenerating(true);
    try {
      const scene = selCat.prompts[Math.floor(Math.random() * selCat.prompts.length)];
      setPrompt(buildColoringPrompt(scene));
      await onConsumeToken?.();
      setTimeout(() => promptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    } catch(e) { console.error(e); }
    finally { setIsGenerating(false); }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pb-24">
      <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-purple-400 transition-colors mb-6 pt-6">
        <ArrowLeft className="w-4 h-4" /> Powrót
      </button>
      <div className="text-center mb-10">
        <div className="text-5xl mb-4" style={{ filter: 'drop-shadow(0 0 30px rgba(167,139,250,0.5))' }}>🎨</div>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-2 text-white">Kreator <span style={{ color: '#a78bfa' }}>Kolorowanek</span></h1>
        <p className="text-white/40 text-sm">Prompty kolorowanek gotowe do druku na Amazon KDP</p>
        <p className="text-[10px] text-white/25 mt-2">✅ Każdy prompt = unikalna losowa scena &nbsp;·&nbsp; ✅ Gotowe na KDP 8.5x11</p>
      </div>
      <div className="space-y-10">
        <Step n="1" title="Wybierz kategorię" color="#a78bfa">
          <div className="flex flex-wrap gap-2 mb-4">
            {COL_GROUPS.map(g => (
              <button key={g.id} onClick={() => setGroup(g.id)} className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
                style={{ background: group === g.id ? '#a78bfa' : 'rgba(167,139,250,0.1)', color: group === g.id ? '#000' : '#a78bfa', border: `1px solid ${group === g.id ? '#a78bfa' : 'rgba(167,139,250,0.3)'}` }}>
                {g.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map(cat => (
              <button key={cat.id} onClick={() => setSelCat(cat)} className="relative p-4 rounded-xl text-left transition-all hover:scale-[1.02]"
                style={{ background: selCat?.id === cat.id ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selCat?.id === cat.id ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.08)'}` }}>
                <div className="text-2xl mb-1">{cat.emoji}</div>
                <div className="text-xs font-black uppercase text-white">{cat.label}</div>
                <div className="text-[9px] text-white/30 mt-0.5">{cat.prompts.length} scen</div>
                {selCat?.id === cat.id && <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#a78bfa' }}><Check className="w-2.5 h-2.5 text-black" /></div>}
              </button>
            ))}
          </div>
        </Step>
        <Step n="2" title="Poziom trudności" color="#a78bfa">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {COL_DIFF.map(d => (
              <button key={d.id} onClick={() => setSelDiff(d)} className="p-3 rounded-xl text-left transition-all hover:scale-[1.02]"
                style={{ background: selDiff?.id === d.id ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selDiff?.id === d.id ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.08)'}` }}>
                <div className="text-xl mb-1">{d.emoji}</div>
                <div className="text-[10px] font-black uppercase text-white leading-tight">{d.label}</div>
                <div className="text-[9px] text-white/30 mt-1">{d.desc}</div>
              </button>
            ))}
          </div>
        </Step>
        <div className="text-center space-y-4">
          <div>
            <p className="text-[10px] text-white/30 mb-3 uppercase tracking-widest font-bold">Wybierz generator</p>
            <div className="flex gap-2 justify-center flex-wrap">
              {GENERATORS.map(g => (
                <button key={g.id} onClick={() => setSelGenerator(g.id)}
                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  style={{ background: selGenerator === g.id ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selGenerator === g.id ? 'rgba(167,139,250,0.6)' : 'rgba(255,255,255,0.08)'}`, color: selGenerator === g.id ? '#a78bfa' : 'rgba(255,255,255,0.3)' }}>
                  {g.emoji} {g.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-white/30">Każde kliknięcie = unikalna losowa scena 🎲</p>
          <button onClick={handleGenerate} disabled={!canGen} className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all"
            style={{ background: canGen ? 'linear-gradient(135deg,#a78bfa,#7c3aed)' : 'rgba(255,255,255,0.05)', color: canGen ? '#fff' : 'rgba(255,255,255,0.2)', cursor: canGen ? 'pointer' : 'not-allowed', boxShadow: canGen ? '0 0 40px rgba(167,139,250,0.3)' : 'none' }}>
            <Sparkles className="w-4 h-4" /> {isGenerating ? 'Generowanie...' : 'Generuj prompt 🎲'}
          </button>
        </div>
        {prompt && (
          <div ref={promptRef}>
            <PromptOutput prompt={prompt} onRegenerate={handleGenerate} color="#a78bfa" id="col-prompt" />
            <div className="mt-4 rounded-xl p-4 text-[10px] text-white/40" style={{ background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.1)' }}>
              💡 <strong style={{ color: '#a78bfa' }}>KDP tip:</strong> Minimum 24 strony. Każda ilustracja + pusta strona = 2 strony. 30 ilustracji = 60 stron. Rozmiar: 8,5 x 11 cali, 300 DPI.
            </div>
          </div>
        )}

        {/* ── GALERIA PRZYKŁADÓW ── */}
        <div className="mt-12 mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 mb-4 text-center">✦ Przykładowe rezultaty</p>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide justify-center">
            {['/examples/kolorowanki1.jpg','/examples/kolorowanki2.jpg','/examples/kolorowanki3.jpg'].map((src, i) => (
              <div key={i} className="flex-shrink-0 snap-start w-36 h-52 md:w-44 md:h-64 rounded-2xl overflow-hidden border border-white/10"
                style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                <img src={src} alt={`Przykład kolorowanki ${i+1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" onError={e => e.currentTarget.parentElement.style.display="none"} />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// =========================================================================
// KREATOR 3 — KOSZULKI
// =========================================================================
const MERCH_CATS = [
  { id: 'gaming',  emoji: '🎮', label: 'Gaming',          prompts: ['a retro pixel art controller with lightning bolts','a fierce dragon wrapped around a gaming headset','a skull made of circuit boards and controllers','a space warrior holding a laser sword in neon glow','an epic battle between robots in a cyber city','a wolf wearing headphones gaming in a neon room','a vintage arcade machine with fire and lightning','a cat wearing sunglasses with controller and neon background'] },
  { id: 'gym',     emoji: '💪', label: 'Gym / Fitness',   prompts: ['a fierce lion lifting weights with motivational text space','a roaring bear with crossed dumbbells and fire','a muscular gorilla in gym pose with chains','an eagle with spread wings above crossed kettlebells','a wolf howling at moon with barbell silhouette','skull with dumbbells and roses tattoo style','a tiger breaking through chains in gym setting','a Viking warrior lifting a boulder'] },
  { id: 'moto',    emoji: '🏍️', label: 'Motocykle',       prompts: ['a classic motorcycle skull with flames and roses','an eagle wings spread over a chopper motorcycle','a wolf riding motorcycle through a stormy night','a detailed biker skull with wings and chain','a vintage motorcycle with rose and lightning bolt','a bear on motorcycle in mountain landscape silhouette','a phoenix rising from a burning motorcycle','a skeleton biker in cowboy hat on chopper'] },
  { id: 'music',   emoji: '🎸', label: 'Muzyka / Rock',   prompts: ['an electric guitar wrapped in flames with skull head','a roaring lion wearing headphones with music notes','a skeleton playing guitar in spotlight on stage','a wolf howling with musical notes and electric guitar','a vintage microphone with roses and lightning bolt','a crow sitting on a broken guitar with moon background','a tattoo style guitar with flowers and skulls','a bear DJ at turntables with neon lights'] },
  { id: 'cats',    emoji: '🐱', label: 'Koty / Cute',     prompts: ['a cute cat wearing sunglasses with pizza slices','a funny cat astronaut floating in space','a cat wizard casting spells with magical stars','a kitten sleeping in a coffee cup with hearts','a cat playing guitar on a crescent moon','a cat detective with magnifying glass noir style','a fluffy cat sitting on a pile of books','a cat superhero flying over city skyline'] },
  { id: 'dogs',    emoji: '🐕', label: 'Psy / Cute',      prompts: ['a golden retriever wearing sunglasses at the beach','a funny bulldog wearing a crown on a throne','a dog astronaut floating in space with paw prints','a dachshund wrapped in a hot dog bun','a husky howling at northern lights in winter','a puppy wearing chef hat cooking','a dog detective with pipe and magnifying glass','a Labrador surfing a wave at tropical beach'] },
  { id: 'nature',  emoji: '🌿', label: 'Natura / Boho',   prompts: ['a sun and moon face with botanical frame of wildflowers','a mountain landscape with pine trees in geometric triangle','a wolf silhouette howling at moon in forest','a deer in enchanted forest with floral mandala frame','a hummingbird with tropical flowers in boho style','a bear paw with mountain and pine tree inside','crystals and wildflowers in a circular mandala','a whale swimming through cosmic starfield with moon'] },
  { id: 'skulls',  emoji: '💀', label: 'Skulls / Gothic', prompts: ['a sugar skull with intricate floral patterns Day of Dead style','a skull with roses and butterfly wings gothic style','a crowned skull with snake and roses rock style','a geometric skull with galaxy inside and star frame','a skull made entirely of roses and vines','a Viking skull helmet with ravens and Norse runes','a skull with headphones and music notes','a skull butterfly with detailed wing patterns'] },
  { id: 'vintage', emoji: '🎭', label: 'Vintage / Retro', prompts: ['a vintage hot air balloon over mountains retro poster style','a retro 1950s diner scene with classic car and neon sign','a vintage travel poster style adventure mountain landscape','a classic boxing poster with retro typography','a vintage circus poster with elephant and acrobat','a retro space age rocket ship with atomic style','a classic western sheriff badge with eagle and stars','a vintage botanical illustration of tropical plants'] },
  { id: 'funny',   emoji: '😂', label: 'Humor / Memy',    prompts: ['a grumpy cat face with I hate Mondays text space','a confused dog face with Why? expression comic style','a pizza slice wearing sunglasses on beach vacation','tacos doing karate with flames and action lines','a coffee cup with superhero cape saving the morning','a sloth hanging from branch with motivational quote space','a dinosaur doing yoga poses on yoga mat','a bear holding a giant fish trophy with champion ribbon'] },
  { id: 'xmas_m',  emoji: '🎄', label: 'Boże Narodzenie', prompts: ['a cute reindeer with Santa hat and scarf','Santa skull in holiday style with candy canes','a gnome with Christmas hat holding gift bag','a bear in ugly Christmas sweater with hot cocoa','a vintage Christmas poster style with snow village','a cat wearing Christmas hat with ornaments','a retro Christmas label with pine wreath','a snowman skull with top hat gothic style'] },
  { id: 'halo_m',  emoji: '🎃', label: 'Halloween',       prompts: ['a cat witch on broomstick with full moon silhouette','a cute pumpkin ghost with bat wings','a skull with witch hat and poison bottle','a black cat with Halloween moon and bats','a sugar skull pumpkin hybrid with floral pattern','a werewolf howling at full moon vintage style','a haunted house with bats and moon silhouette','a skeleton witch stirring cauldron with stars'] },
];

const MERCH_STYLES = [
  { id: 'vintage',   emoji: '🎭', label: 'Vintage / Retro',  prompt: 'vintage retro illustration style, aged texture, limited color palette, old-school graphic design' },
  { id: 'minimal',   emoji: '⚡', label: 'Minimalistyczny',  prompt: 'clean minimalist design, simple bold shapes, flat design, modern style' },
  { id: 'bold',      emoji: '💥', label: 'Bold / Grunge',    prompt: 'bold grunge style, rough textures, distressed edges, aggressive graphic design' },
  { id: 'tattoo',    emoji: '⚔️', label: 'Tattoo / Flash',   prompt: 'traditional tattoo flash art style, bold black outlines, classic tattoo imagery' },
  { id: 'cute',      emoji: '🥰', label: 'Cute / Kawaii',    prompt: 'cute kawaii cartoon style, soft rounded shapes, adorable expressions, chibi proportions' },
  { id: 'geometric', emoji: '🔷', label: 'Geometryczny',     prompt: 'geometric low-poly design style, sharp angular shapes, modern graphic art' },
];

const MERCH_TEXT_SUGGESTIONS = {
  gaming:  ['Game Over', 'Insert Coin', 'Level Up', 'Player One', 'Respawning...', 'GG EZ', 'No Sleep Till GG'],
  gym:     ['No Pain No Gain', 'Beast Mode', 'Lift Heavy', 'Train Hard', 'Never Skip Leg Day', 'Eat Sleep Lift'],
  moto:    ['Born to Ride', 'Live to Ride', 'Full Throttle', 'No Cage', 'Ride or Die', 'Freedom on Wheels'],
  music:   ['Rock Never Dies', 'Turn It Up', 'Feel the Beat', 'Born to Rock', 'Play Loud', 'Sound Is Life'],
  cats:    ['Cat Mode On', 'Purrfect', 'Nap Champion', 'Cat Lady', 'Feed Me', 'I Work for Treats'],
  dogs:    ['Good Boy', 'Dog Dad', 'Woof Gang', 'Adopt Don\'t Shop', 'Dog Mom', 'Treat Yourself'],
  nature:  ['Into the Wild', 'Leave No Trace', 'Stay Wild', 'Go Outside', 'Wander More', 'Nature Heals'],
  skulls:  ['Live Fast', 'Memento Mori', 'Death Before Decaf', 'Born Wild', 'No Fear', 'Carpe Diem'],
  vintage: ['Est. 1969', 'Made in the 70s', 'Retro Vibes', 'Old School', 'Classic Never Dies', 'Vintage Soul'],
  funny:   ['Send Help', 'Monday Survivor', 'Powered by Coffee', 'Adulting is Hard', 'Nope', 'I\'m Fine'],
  xmas_m:  ['Ho Ho Ho', 'Santa\'s Favorite', 'Merry Everything', 'Tis the Season', 'Naughty List 2024'],
  halo_m:  ['Trick or Treat', 'Spooky Season', 'Boo!', 'Creep It Real', 'Stay Spooky', 'Basic Witch'],
};

function KoszulkaView({ onBack, user, onConsumeToken, tokenData, onPaywall }) {
  const [selCat, setSelCat] = useState(null);
  const [selStyle, setSelStyle] = useState(null);
  const [customText, setCustomText] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const promptRef = useRef(null);
  const canGen = selCat && selStyle && !isGenerating;

  function randomText() {
    const suggestions = selCat ? (MERCH_TEXT_SUGGESTIONS[selCat.id] || MERCH_TEXT_SUGGESTIONS.funny) : MERCH_TEXT_SUGGESTIONS.funny;
    setCustomText(suggestions[Math.floor(Math.random() * suggestions.length)]);
  }

  async function handleGenerate() {
    if (!canGen) return;
    setIsGenerating(true);
    try {
      const scene = selCat.prompts[Math.floor(Math.random() * selCat.prompts.length)];
      const textPart = customText.trim() ? `, with the text "${customText.trim()}" in bold typography` : '';
      setPrompt(`T-shirt graphic design of ${scene}${textPart}. ${selStyle.prompt}. IMPORTANT: transparent background, isolated graphic, no background, print-ready for direct garment printing (DTG), high contrast, works on both light and dark fabric, vector-style clean edges. Professional merchandise design, Amazon Merch on Demand ready. --ar 1:1 --style raw --v 6.1`);
      await onConsumeToken?.();
      setTimeout(() => promptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    } catch(e) { console.error(e); }
    finally { setIsGenerating(false); }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pb-24">
      <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-cyan-400 transition-colors mb-6 pt-6">
        <ArrowLeft className="w-4 h-4" /> Powrót
      </button>
      <div className="text-center mb-10">
        <div className="text-5xl mb-4" style={{ filter: 'drop-shadow(0 0 30px rgba(34,211,238,0.5))' }}>👕</div>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-2 text-white">Kreator <span style={{ color: '#22d3ee' }}>Koszulek</span></h1>
        <p className="text-white/40 text-sm">Grafiki gotowe do druku — Amazon Merch, Redbubble, Printful</p>
        <p className="text-[10px] text-white/25 mt-2">✅ Przezroczyste tło &nbsp;·&nbsp; ✅ Amazon Merch ready &nbsp;·&nbsp; ✅ PL / EN / DE</p>
      </div>
      <div className="space-y-10">
        <Step n="1" title="Wybierz kategorię" color="#22d3ee">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {MERCH_CATS.map(cat => (
              <button key={cat.id} onClick={() => setSelCat(cat)} className="relative p-4 rounded-xl text-left transition-all hover:scale-[1.02]"
                style={{ background: selCat?.id === cat.id ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selCat?.id === cat.id ? 'rgba(34,211,238,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
                <div className="text-2xl mb-1">{cat.emoji}</div>
                <div className="text-xs font-black uppercase text-white">{cat.label}</div>
                <div className="text-[9px] text-white/30 mt-0.5">{cat.prompts.length} grafik</div>
                {selCat?.id === cat.id && <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#22d3ee' }}><Check className="w-2.5 h-2.5 text-black" /></div>}
              </button>
            ))}
          </div>
        </Step>
        <Step n="2" title="Styl grafiki" color="#22d3ee">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {MERCH_STYLES.map(s => (
              <button key={s.id} onClick={() => setSelStyle(s)} className="relative p-4 rounded-xl text-left transition-all hover:scale-[1.02]"
                style={{ background: selStyle?.id === s.id ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selStyle?.id === s.id ? 'rgba(34,211,238,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
                <div className="text-2xl mb-1">{s.emoji}</div>
                <div className="text-xs font-black uppercase text-white">{s.label}</div>
                {selStyle?.id === s.id && <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#22d3ee' }}><Check className="w-2.5 h-2.5 text-black" /></div>}
              </button>
            ))}
          </div>
        </Step>
        <Step n="3" title="Tekst (opcjonalnie)" color="#22d3ee">
          <div className="flex gap-2">
            <input type="text" maxLength={40} placeholder="np. Stay Wild, Level Up, Send Help..." value={customText}
              onChange={e => setCustomText(e.target.value)}
              className="flex-1 bg-white/5 border rounded-xl px-5 py-3 text-sm font-bold text-white outline-none transition-all"
              style={{ borderColor: customText ? 'rgba(34,211,238,0.45)' : 'rgba(255,255,255,0.1)' }} />
            <button onClick={randomText} title="Losuj tekst"
              className="px-4 py-3 rounded-xl font-black text-lg transition-all hover:scale-105"
              style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)' }}>
              🎲
            </button>
          </div>
          <p className="text-[9px] text-white/25 mt-2">Zostaw puste jeśli nie chcesz tekstu na koszulce</p>
        </Step>
        <div className="text-center space-y-2">
          <p className="text-[10px] text-white/30">Każde kliknięcie = unikalny losowy design 🎲</p>
          <button onClick={handleGenerate} disabled={!canGen} className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all"
            style={{ background: canGen ? 'linear-gradient(135deg,#22d3ee,#0891b2)' : 'rgba(255,255,255,0.05)', color: canGen ? '#000' : 'rgba(255,255,255,0.2)', cursor: canGen ? 'pointer' : 'not-allowed', boxShadow: canGen ? '0 0 40px rgba(34,211,238,0.3)' : 'none' }}>
            <Sparkles className="w-4 h-4" /> {isGenerating ? 'Generowanie...' : 'Generuj prompt 🎲'}
          </button>
        </div>
        {prompt && (
          <div ref={promptRef}>
            <PromptOutput prompt={prompt} onRegenerate={handleGenerate} color="#22d3ee" id="merch-prompt" />
            <div className="mt-4 rounded-xl p-4 text-[10px] text-white/40" style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.1)' }}>
              💡 <strong style={{ color: '#22d3ee' }}>Merch tip:</strong> Usuń tło w remove.bg lub Adobe Express. Wgraj PNG na Amazon Merch, Redbubble lub Printful. Zalecane: 4500 x 5400px, 300 DPI.
            </div>
          </div>
        )}

        {/* ── GALERIA PRZYKŁADÓW ── */}
        <div className="mt-12 mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 mb-4 text-center">✦ Przykładowe rezultaty</p>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide justify-center">
            {['/examples/koszulka1.jpg','/examples/koszulka2.jpg','/examples/koszulka3.jpg'].map((src, i) => (
              <div key={i} className="flex-shrink-0 snap-start w-36 h-52 md:w-44 md:h-64 rounded-2xl overflow-hidden border border-white/10"
                style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                <img src={src} alt={`Przykład koszulki ${i+1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" onError={e => e.currentTarget.parentElement.style.display="none"} />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// =========================================================================
// MENU GŁÓWNE
// =========================================================================
// =========================================================================
// KREATOR 4 — VIRAL MERCH
// =========================================================================

const VIRAL_CHARACTERS = [
  { id: 'dad',       emoji: '👨', label: 'Tata',        prompt: 'grumpy middle-aged dad in bathrobe and slippers, messy hair, holding coffee mug' },
  { id: 'mom',       emoji: '👩', label: 'Mama',        prompt: 'tired mom in cozy robe, hair in messy bun, holding wine glass' },
  { id: 'grandpa',   emoji: '👴', label: 'Dziadek',     prompt: 'retired old man with suspenders, reading glasses pushed up, thumbs up pose' },
  { id: 'grandma',   emoji: '👵', label: 'Babcia',      prompt: 'funny old grandma with curlers in hair, apron, hands on hips' },
  { id: 'son',       emoji: '👦', label: 'Syn',         prompt: 'teenage boy with headphones around neck, hoodie, cool slouchy pose' },
  { id: 'daughter',  emoji: '👧', label: 'Córka',       prompt: 'teenage girl with ponytail, phone in hand, sassy attitude pose' },
  { id: 'brother',   emoji: '🧑', label: 'Brat',        prompt: 'young man in casual streetwear, arms crossed, smirking expression' },
  { id: 'sister',    emoji: '👩‍🦱', label: 'Siostra',    prompt: 'young woman in trendy outfit, hand on hip, confident pose' },
  { id: 'worker',    emoji: '👷', label: 'Pracownik',   prompt: 'exhausted office worker with loosened tie, bags under eyes, holding stack of papers' },
  { id: 'retiree',   emoji: '🧓', label: 'Emeryt',      prompt: 'happy retiree in casual clothes, big grin, flexing one arm showing muscles' },
  { id: 'boss',      emoji: '💼', label: 'Szef',        prompt: 'pompous boss in expensive suit, finger pointing, smug expression' },
  { id: 'chef',      emoji: '👨‍🍳', label: 'Kucharz',   prompt: 'cartoon chef with tall white hat, holding wooden spoon, cheerful expression' },
  { id: 'cat',       emoji: '🐱', label: 'Kot',         prompt: 'grumpy cartoon cat in business suit, arms crossed, judging expression' },
  { id: 'chicken',   emoji: '🐔', label: 'Kurczak',     prompt: 'funny cartoon chicken in work uniform, messy feathers, tired expression' },
];

const VIRAL_STYLES = [
  { id: 'graffiti',  emoji: '🎨', label: 'Graffiti',     prompt: 'graffiti cartoon illustration style, dripping paint letters, urban street art, bold outlines, spray paint texture, transparent background' },
  { id: 'retro',     emoji: '🕹️', label: 'Retro Vintage', prompt: 'retro vintage illustration style, distressed texture, old school graphic design, limited color palette, aged worn look, transparent background' },
  { id: 'bold',      emoji: '💥', label: 'Bold Statement', prompt: 'bold minimalist graphic design, thick black outlines, high contrast, clean vector style, strong typography, transparent background' },
  { id: 'cartoon',   emoji: '😂', label: 'Cartoon',       prompt: 'funny cartoon comic style, exaggerated features, bright colors, clean outlines, humorous illustration, transparent background' },
  { id: 'parody',    emoji: '🏷️', label: 'Brand Parody',  prompt: 'parody brand logo style, clean vector design, professional logo aesthetic, simple iconic design, transparent background' },
];

const VIRAL_TEXTS_PL = [
  'Pracuje w Biedrze', 'Nie zaczepiaj przed kawą', 'Emerytura jest bliżej niż myślisz',
  'Nic nie muszę, jestem na emeryturze', 'Proszę nie wkurwiać Tatusia', 'Dzień dobry, że tak sobie zażartuję',
  'Trudno jest być najlepszym, ale ktoś musi', 'Nie mam dziś nastroju', 'Powered by Coffee and Regrets',
  'Oficjalnie najfajniejszy tata na świecie', 'Mama wiedziała lepiej', 'Szef ma zawsze rację',
  'Poniedziałek powinien być nielegalny', 'Pracuję żeby żyć, nie żyję żeby pracować',
];

const VIRAL_TEXTS_EN = [
  'Retired, Not Expired', 'World\'s Okayest Dad', 'I Survived Monday',
  'Coffee Before Talkie', 'Not a Morning Person', 'Professional Napper',
  'I Work Hard So My Cat Can Have a Better Life', 'Adulting is Hard',
  'Currently Pretending to Work', 'Born to Nap, Forced to Work',
  'Life is Short, Eat the Pizza', 'I\'m Not Lazy, I\'m Energy Efficient',
];

const VIRAL_TEXTS_DE = [
  'Ich bin im Ruhestand, nicht im Sterben', 'Montag sollte verboten sein',
  'Kaffee ist mein Seelentier', 'Weltbester Papa', 'Nicht vor dem Kaffee reden',
  'Ich arbeite nur um meine Katze zu ernähren', 'Rentner: Jeden Tag Wochenende',
  'Professioneller Faulenzer', 'Ich bin nicht faul, ich spare Energie',
];

function ViralMerchView({ onBack, user, onConsumeToken, tokenData, onPaywall }) {
  const [selChar, setSelChar] = useState(null);
  const [selStyle, setSelStyle] = useState(null);
  const [customText, setCustomText] = useState('');
  const [lang, setLang] = useState('pl');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const promptRef = useRef(null);
  const canGen = selChar && selStyle && !isGenerating;

  function randomText() {
    const list = lang === 'pl' ? VIRAL_TEXTS_PL : lang === 'en' ? VIRAL_TEXTS_EN : VIRAL_TEXTS_DE;
    setCustomText(list[Math.floor(Math.random() * list.length)]);
  }

  async function handleGenerate() {
    if (!user) { onPaywall(); return; }
    if (!tokenData) return;
    const hasAccess = tokenData?.isPro || (tokenData?.tokens_viral ?? 0) > 0;
    if (!hasAccess) { onPaywall(); return; }
    if (!canGen) return;
    setIsGenerating(true);
    try {
      const textPart = customText.trim() ? `, with bold text saying "${customText.trim()}"` : '';
      const langNote = lang === 'pl' ? ' Text in Polish language.' : lang === 'de' ? ' Text in German language.' : '';
      setPrompt(`T-shirt graphic design featuring ${selChar.prompt}${textPart}.${langNote} ${selStyle.prompt}. Print-ready for DTG printing, works on both light and dark fabric, high contrast, Amazon Merch on Demand ready. --ar 1:1 --style raw --v 6.1`);
      await onConsumeToken?.();
      setTimeout(() => promptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    } catch(e) { console.error(e); }
    finally { setIsGenerating(false); }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pb-24">
      <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-rose-400 transition-colors mb-6 pt-6">
        <ArrowLeft className="w-4 h-4" /> Powrót
      </button>
      <div className="text-center mb-10">
        <div className="text-5xl mb-4" style={{ filter: 'drop-shadow(0 0 30px rgba(244,63,94,0.5))' }}>🔥</div>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-2 text-white">Viral <span style={{ color: '#f43f5e' }}>Merch</span></h1>
        <p className="text-white/40 text-sm">Personalizowane grafiki które się sprzedają — tata, mama, emeryt i więcej</p>
      </div>

      <div className="space-y-8">
        {/* KROK 1 — POSTAĆ */}
        <Step n="1" title="Wybierz postać" color="#f43f5e">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {VIRAL_CHARACTERS.map(c => (
              <button key={c.id} onClick={() => setSelChar(c)}
                className="relative p-3 rounded-xl text-center transition-all hover:scale-[1.02]"
                style={{ background: selChar?.id === c.id ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selChar?.id === c.id ? 'rgba(244,63,94,0.5)' : 'rgba(255,255,255,0.08)'}` }}>
                <div className="text-2xl mb-1">{c.emoji}</div>
                <div className="text-[9px] font-black uppercase text-white leading-tight">{c.label}</div>
                {selChar?.id === c.id && <div className="absolute top-1 right-1 w-3 h-3 rounded-full flex items-center justify-center" style={{ background: '#f43f5e' }}><Check className="w-2 h-2 text-white" /></div>}
              </button>
            ))}
          </div>
        </Step>

        {/* KROK 2 — STYL */}
        <Step n="2" title="Styl grafiki" color="#f43f5e">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {VIRAL_STYLES.map(s => (
              <button key={s.id} onClick={() => setSelStyle(s)}
                className="p-3 rounded-xl text-left transition-all hover:scale-[1.02]"
                style={{ background: selStyle?.id === s.id ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selStyle?.id === s.id ? 'rgba(244,63,94,0.5)' : 'rgba(255,255,255,0.08)'}` }}>
                <div className="text-xl mb-1">{s.emoji}</div>
                <div className="text-[10px] font-black uppercase text-white leading-tight">{s.label}</div>
              </button>
            ))}
          </div>
        </Step>

        {/* KROK 3 — TEKST */}
        <Step n="3" title="Crazy tekst" color="#f43f5e">
          <div className="flex gap-2 mb-3">
            {[['pl','🇵🇱 PL'],['en','🇬🇧 EN'],['de','🇩🇪 DE']].map(([id,label]) => (
              <button key={id} onClick={() => setLang(id)}
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                style={{ background: lang === id ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${lang === id ? 'rgba(244,63,94,0.5)' : 'rgba(255,255,255,0.08)'}`, color: lang === id ? '#f43f5e' : 'rgba(255,255,255,0.4)' }}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" maxLength={60} placeholder="np. Pracuje w Biedrze, Nie zaczepiaj przed kawą..."
              value={customText} onChange={e => setCustomText(e.target.value)}
              className="flex-1 bg-white/5 border rounded-xl px-5 py-3 text-sm font-bold text-white outline-none transition-all"
              style={{ borderColor: customText ? 'rgba(244,63,94,0.45)' : 'rgba(255,255,255,0.1)' }} />
            <button onClick={randomText} title="Losuj tekst"
              className="px-4 py-3 rounded-xl font-black text-lg transition-all hover:scale-105"
              style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)' }}>
              🎲
            </button>
          </div>
          <p className="text-[9px] text-white/25 mt-2">Zostaw puste jeśli chcesz samą grafikę bez tekstu</p>
        </Step>

        {/* GENERUJ */}
        <div className="text-center space-y-2">
          <p className="text-[10px] text-white/30">Każda kombinacja = unikalny viral design 🔥</p>
          <button onClick={handleGenerate} disabled={!canGen}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all"
            style={{ background: canGen ? 'linear-gradient(135deg,#f43f5e,#e11d48)' : 'rgba(255,255,255,0.05)', color: canGen ? '#fff' : 'rgba(255,255,255,0.2)', cursor: canGen ? 'pointer' : 'not-allowed', boxShadow: canGen ? '0 0 40px rgba(244,63,94,0.3)' : 'none' }}>
            <Sparkles className="w-4 h-4" /> {isGenerating ? 'Generowanie...' : 'Generuj Viral Prompt 🔥'}
          </button>
        </div>

        {prompt && (
          <div ref={promptRef}>
            <PromptOutput prompt={prompt} onRegenerate={handleGenerate} color="#f43f5e" id="viral-prompt" />
          </div>
        )}
      </div>
    </div>
  );
}

const TOOLS = [
  { id: 'napisy',     emoji: '✍️', label: 'Kreator Napisów',    subtitle: 'Generator Promptów Napisów AI',    desc: 'Artystyczne litery — kwiaty, ogień, lód, złoto i więcej.',          color: '#f59e0b', badge: 'TEXT STUDIO',     glow: 'rgba(245,158,11,0.3)',   border: '#f59e0b44' },
  { id: 'kolorowanki',emoji: '🎨', label: 'Kreator Kolorowanek', subtitle: 'Generator Kolorowanek AI',         desc: 'Prompty kolorowanek dla dzieci i dorosłych — gotowe na Amazon KDP.', color: '#a78bfa', badge: 'COLORING STUDIO', glow: 'rgba(167,139,250,0.3)', border: '#a78bfa44' },
  { id: 'koszulki',   emoji: '👕', label: 'Kreator Koszulek',   subtitle: 'Generator Grafik na Koszulki AI',  desc: 'Grafiki na koszulki i bluzy — Amazon Merch, Redbubble, Printful.',   color: '#22d3ee', badge: 'MERCH STUDIO',    glow: 'rgba(34,211,238,0.3)',  border: '#22d3ee44' },
  { id: 'viral',      emoji: '🔥', label: 'Viral Merch',        subtitle: 'Personalizowane grafiki viral',    desc: 'Tata, mama, emeryt, pracownik — crazy tekst który się sprzedaje.',   color: '#f43f5e', badge: 'VIRAL STUDIO',    glow: 'rgba(244,63,94,0.3)',   border: '#f43f5e44' },
];

function MainMenu({ onSelect, loadingTokens }) {
  return (
    <div className="min-h-screen bg-black px-3 sm:px-4 py-6 sm:py-12">
      <style>{`
        .c3d { transform: perspective(600px) rotateX(8deg) rotateY(-2deg); transition: all 0.4s cubic-bezier(0.23,1,0.32,1); }
        .c3d:hover { transform: perspective(600px) rotateX(2deg) rotateY(0deg) translateY(-12px) scale(1.02); }
        .c3d-off { transform: perspective(600px) rotateX(8deg) rotateY(-2deg); opacity: 0.45; }
      `}</style>
      <div className="max-w-5xl mx-auto">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-4">
            <Sparkles className="w-3 h-3" /> Aplikacje AI
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-4">
            Aplikacje <span className="text-amber-500">2</span>
          </h1>
          <p className="text-white/40 max-w-lg mx-auto text-sm">Profesjonalne generatory promptów AI — kliknij aby otworzyć kreator.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {TOOLS.map((tool, i) => (
            <button key={i}
              onClick={() => tool.id && onSelect(tool.id)}
              className={`${tool.id ? 'c3d' : 'c3d-off'} relative rounded-3xl p-8 border bg-gradient-to-br text-left group ${tool.id ? 'cursor-pointer' : 'cursor-default'}`}
              style={{
                background: `linear-gradient(135deg,${tool.color}20,${tool.color}08)`,
                borderColor: tool.border,
                boxShadow: tool.id ? `0 20px 60px ${tool.glow}, 0 4px 20px rgba(0,0,0,0.3)` : '0 4px 20px rgba(0,0,0,0.15)',
              }}>
              <div className="absolute top-4 right-4 text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-full"
                style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
                {tool.badge}
              </div>
              <div className="mb-6 text-6xl" style={{ filter: tool.id ? `drop-shadow(0 4px 12px ${tool.color}50)` : 'none' }}>{tool.emoji}</div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">{tool.label}</h2>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: tool.color }}>{tool.subtitle}</p>
              <p className="text-white/40 text-xs leading-relaxed mb-6">{tool.desc}</p>
              {tool.id && (
                <div className="flex items-center gap-2 font-black text-[11px] uppercase tracking-widest group-hover:gap-3 transition-all" style={{ color: tool.color }}>
                  {loadingTokens ? '⏳ Ładowanie...' : <>Otwórz Kreator <ChevronRight className="w-4 h-4" /></>}
                </div>
              )}
              {tool.id && (
                <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${tool.glow} 0%, transparent 70%)` }} />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PAYWALL ─────────────────────────────────────────────────────────────────
function PaywallOverlay({ onLogin, isLoggedIn }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="max-w-md w-full rounded-3xl p-8 text-center space-y-6" style={{ background: '#0f0f0f', border: '1px solid rgba(245,158,11,0.3)', boxShadow: '0 0 60px rgba(245,158,11,0.15)' }}>
        <div className="text-5xl">🔒</div>
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">
            {isLoggedIn ? 'Wykorzystałeś darmowy token' : 'Zaloguj się aby kontynuować'}
          </h2>
          <p className="text-white/40 text-sm">
            {isLoggedIn
              ? 'Darmowy prompt został wykorzystany. Kup plan Pro żeby generować bez limitów.'
              : 'Zaloguj się aby otrzymać 1 darmowy prompt w każdym kreatorze.'}
          </p>
        </div>
        {isLoggedIn ? (
          <div className="space-y-3">
            <a href={STRIPE_MONTHLY} target="_blank" rel="noopener noreferrer"
              className="block w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-black transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 0 30px rgba(245,158,11,0.3)' }}>
              Pro 79 zł / miesiąc
            </a>
            <a href={STRIPE_ANNUAL} target="_blank" rel="noopener noreferrer"
              className="block w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white/70 transition-all hover:text-white"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              Pro 799 zł / rok — oszczędzasz 149 zł
            </a>
          </div>
        ) : (
          <button onClick={onLogin} className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-black transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 0 30px rgba(245,158,11,0.3)' }}>
            Zaloguj przez Google
          </button>
        )}
        <p className="text-white/20 text-[10px]">1 darmowy prompt w każdym kreatorze po zalogowaniu</p>
      </div>
    </div>
  );
}

// =========================================================================
// GŁÓWNY KOMPONENT
// =========================================================================
export default function App2() {
  const [view, setView] = useState('menu');
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [tokenData, setTokenData] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallCreator, setPaywallCreator] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => setLoadingAuth(false), 5000); // max 5s
    const unsub = onAuthStateChanged(auth, async (u) => {
      clearTimeout(timeout);
      setUser(u);
      if (u) {
        const data = await getTokenData(u.uid);
        setTokenData(data);
      } else {
        setTokenData(null);
      }
      setLoadingAuth(false);
    });
    return () => { unsub(); clearTimeout(timeout); };
  }, []);

  async function handleLogin() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const data = await getTokenData(result.user.uid);
      setTokenData(data);
      return data; // zwracamy data żeby można było użyć od razu
    } catch (e) { console.error(e); }
  }

  async function handleLogout() {
    await signOut(auth);
    setTokenData(null);
    setView('menu');
  }

  function handleSelectCreator(id) {
    if (!user) { setPaywallCreator(id); setShowPaywall(true); return; }
    if (!tokenData) return; // jeszcze ładuje tokeny — czekamy
    const tokenKey = { napisy: 'text', kolorowanki: 'coloring', koszulki: 'merch', viral: 'viral' }[id];
    const hasAccess = tokenData?.isPro || (tokenData[`tokens_${tokenKey}`] ?? 0) > 0;
    if (hasAccess) { setView(id); return; }
    setPaywallCreator(id); setShowPaywall(true);
  }

  async function consumeToken(creatorKey) {
    if (!user) return;
    if (tokenData?.isPro) return; // Pro — nie odejmujemy
    await useCreatorToken(user.uid, creatorKey);
    const updated = await getTokenData(user.uid);
    setTokenData(updated);
  }

  if (loadingAuth) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-amber-400 text-sm font-black uppercase tracking-widest animate-pulse">Ładowanie...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Nav user={user} onLogin={handleLogin} onLogout={handleLogout} />
      {showPaywall && (
        <PaywallOverlay
          isLoggedIn={!!user}
          onLogin={async () => {
            const data = await handleLogin();
            if (!data) return;
            setShowPaywall(false);
            if (paywallCreator) {
              const tokenKey = { napisy: 'text', kolorowanki: 'coloring', koszulki: 'merch', viral: 'viral' }[paywallCreator];
              const hasAccess = data.isPro || (data[`tokens_${tokenKey}`] ?? 0) > 0;
              if (hasAccess) setView(paywallCreator);
            }
          }}
        />
      )}
      {view === 'menu'        && <MainMenu onSelect={handleSelectCreator} loadingTokens={user && !tokenData} />}
      {view === 'napisy'      && <NapisyView     onBack={() => setView('menu')} user={user} onConsumeToken={() => consumeToken('text')}     tokenData={tokenData} onPaywall={() => setShowPaywall(true)} />}
      {view === 'kolorowanki' && <KolorowankaView onBack={() => setView('menu')} user={user} onConsumeToken={() => consumeToken('coloring')} tokenData={tokenData} onPaywall={() => setShowPaywall(true)} />}
      {view === 'koszulki'    && <KoszulkaView   onBack={() => setView('menu')} user={user} onConsumeToken={() => consumeToken('merch')}    tokenData={tokenData} onPaywall={() => setShowPaywall(true)} />}
      {view === 'viral'       && <ViralMerchView  onBack={() => setView('menu')} user={user} onConsumeToken={() => consumeToken('viral')}    tokenData={tokenData} onPaywall={() => setShowPaywall(true)} />}
    </div>
  );
}
