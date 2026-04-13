// TextCreator.jsx — wersja testowa (bez tokenów, bez logowania)
// AI Flow Academy | loveaiflow.com

import React, { useState, useRef, useCallback } from 'react';
import { Copy, Check, Sparkles } from 'lucide-react';

const MAX_PORTRAIT  = 6;
const MAX_LANDSCAPE = 10;

// ─── Style liter ──────────────────────────────────────────────────────────────
const STYLES = [
  { id: 'floral',    emoji: '🌸', label: 'Kwiatowy',           desc: 'róże, piwonie, lilie',     color: '#f9a8d4',
    prompt: 'made entirely of roses, peonies, and lilies in full bloom, petals and leaves forming every curve of the letter, photorealistic macro photography, soft pink and white florals, green stems intertwining, dewdrops on petals, butterflies landing on petals' },
  { id: 'bulb',      emoji: '💡', label: 'Żarówki świąteczne', desc: 'lampki, drut, blask',       color: '#fbbf24',
    prompt: 'constructed from glowing vintage Edison filament bulbs and copper wire, warm golden bokeh lights in background, festive string lights wrapping each curve of the letter, soft glowing halos around each bulb, retro holiday atmosphere' },
  { id: 'botanical', emoji: '🍃', label: 'Botaniczny',         desc: 'liście, gałęzie, rośliny', color: '#86efac',
    prompt: 'formed from intertwining botanical elements — fern fronds, eucalyptus branches, tropical leaves, moss and tiny wildflowers, lush green palette with golden hour light filtering through, nature illustration style' },
  { id: 'crystal',   emoji: '💎', label: 'Kryształowy',        desc: 'szkło, diament, pryzmat',  color: '#93c5fd',
    prompt: 'sculpted from pure crystal and faceted diamond-cut glass, internal light refractions creating rainbow caustics, translucent icy-blue and violet hues, ultra-sharp reflections, luxury jewellery photography lighting' },
  { id: 'lava',      emoji: '🔥', label: 'Lawa / Ogień',       desc: 'magma, płomienie, żar',    color: '#f97316',
    prompt: 'forged from molten lava and roaring fire, glowing orange-red magma cracks along every surface, dark volcanic rock texture beneath, embers and sparks floating upward, dramatic rim lighting, infernal energy radiating outward' },
  { id: 'ice',       emoji: '🧊', label: 'Lodowy',             desc: 'lód, szron, śnieg',        color: '#bae6fd',
    prompt: 'carved from transparent glacial ice, frosted crystalline texture with deep arctic-blue internal glow, snowflake micro-crystals on surface, ice splinter details, cold breath fog surrounding, cryogenic sci-fi atmosphere' },
  { id: 'choco',     emoji: '🍫', label: 'Czekoladowy',        desc: 'mleczna czekolada, kakao', color: '#a16207',
    prompt: 'sculpted from glossy milk chocolate with velvety matte cocoa powder texture, smooth ganache sheen, chocolate drips flowing down edges, caramel highlight on curves, artisan confectionery photography, warm studio light' },
  { id: 'moss',      emoji: '🌿', label: 'Mech / Leśny',       desc: 'mech, las, natura',        color: '#4ade80',
    prompt: 'completely covered in lush green forest moss and tiny mushrooms, lichen textures across entire surface, embedded acorns and pine needles, soft dappled forest light filtering through tree canopy, earthy woodland macro photography' },
  { id: 'gold',      emoji: '✨', label: 'Złoty luksusowy',    desc: '24k złoto, blask, luksus', color: '#f59e0b',
    prompt: 'cast in solid 24-karat gold with mirror-polished surface, intricate engraved filigree detailing across every face, dramatic studio specular highlights, dark velvet background, ultra-high-end luxury jewellery product photography' },
];

// ─── Tła ─────────────────────────────────────────────────────────────────────
const BACKGROUNDS = [
  { id: 'white',  label: 'Białe studio',      prompt: 'clean white studio background, soft diffused professional light',               preview: 'linear-gradient(135deg,#fff,#f0f0f0)' },
  { id: 'black',  label: 'Czarne eleganckie', prompt: 'deep black elegant background, dramatic chiaroscuro lighting',                   preview: 'linear-gradient(135deg,#111,#2a2a2a)' },
  { id: 'pastel', label: 'Pastelowe',         prompt: 'soft pastel blurred background in complementary hues, dreamy bokeh',             preview: 'linear-gradient(135deg,#fce7f3,#ddd6fe,#bfdbfe)' },
  { id: 'marble', label: 'Marmur',            prompt: 'luxurious white Carrara marble surface with subtle grey veining',               preview: 'linear-gradient(135deg,#f5f5f5,#d4d4d4)' },
  { id: 'wood',   label: 'Drewno',            prompt: 'warm rustic oak wood planks with natural grain texture, soft side lighting',     preview: 'linear-gradient(135deg,#92400e,#b45309)' },
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
    : `a single large decorative letter "${text.toUpperCase()}" centered and filling the frame`;
  const ar = format === 'portrait' ? '--ar 9:16' : '--ar 16:9';
  return `Photorealistic 3D render of ${subject}, each letter ${style.prompt}, placed on ${bg.prompt}. Every letter is clearly legible and three-dimensional with depth and volume. ${format === 'portrait' ? 'Vertical portrait' : 'Wide horizontal'} composition optimized for ${format === 'portrait' ? 'phone/TikTok/Reels' : 'desktop/YouTube'}. Shot with 85mm macro lens, f/2.8, studio product photography. No text overlay, no watermark, no background distractions. Ultra-detailed, 8K resolution, ${ar} --style raw --v 6.1`;
}

// ─── Canvas podgląd ───────────────────────────────────────────────────────────
const LCOLORS = ['#f59e0b','#fb923c','#f472b6','#a78bfa','#34d399','#60a5fa','#4ade80','#e879f9','#facc15','#f87171'];

function LetterCanvas({ text, format }) {
  const ref = useRef(null);

  const draw = useCallback(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const portrait = format === 'portrait';
    const W = portrait ? 198 : 352;
    const H = portrait ? 352 : 198;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0c0c0c';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(245,158,11,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

    const letters = text.toUpperCase().replace(/\s/g, '').split('').filter(Boolean);
    if (!letters.length) {
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.font = '500 12px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('wpisz tekst…', W / 2, H / 2);
      return;
    }

    const n = letters.length;
    const cellSize = portrait ? Math.min(W * 0.72, (H * 0.84) / n) : Math.min(H * 0.72, (W * 0.84) / n);
    const fontSize = Math.max(14, Math.floor(cellSize * 0.74));
    ctx.font = `900 ${fontSize}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    if (portrait) {
      const totalH = n * cellSize;
      const startY = (H - totalH) / 2 + cellSize / 2;
      const xSwing = Math.min(W * 0.32, fontSize * (n - 1) * 0.28);
      const startX = W / 2 - xSwing / 2;
      letters.forEach((letter, i) => {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const x = n === 1 ? W / 2 : startX + t * xSwing;
        const y = startY + i * cellSize;
        const col = LCOLORS[i % LCOLORS.length];
        ctx.save(); ctx.globalAlpha = 0.13; ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(x, y, fontSize * 0.54, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#000';
        ctx.fillText(letter, x + 1.5, y + 2); ctx.restore();
        ctx.fillStyle = col; ctx.globalAlpha = 1;
        ctx.fillText(letter, x, y);
      });
    } else {
      const totalW = n * cellSize;
      const startX = (W - totalW) / 2 + cellSize / 2;
      const ySwing = Math.min(H * 0.32, fontSize * (n - 1) * 0.28);
      const startY = H / 2 - ySwing / 2;
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

    ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#fbbf24';
    ctx.font = '600 10px system-ui'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText(portrait ? '9:16' : '16:9', W - 8, H - 7); ctx.restore();
  }, [text, format]);

  React.useEffect(() => { draw(); }, [draw]);

  return <canvas ref={ref} style={{ borderRadius: '10px', display: 'block', maxWidth: '100%' }} />;
}

// ─── Główny komponent ─────────────────────────────────────────────────────────
export default function TextCreator() {
  const [text, setText]         = useState('');
  const [format, setFormat]     = useState('portrait');
  const [selStyle, setSelStyle] = useState(null);
  const [selBg, setSelBg]       = useState(null);
  const [prompt, setPrompt]     = useState('');
  const [copied, setCopied]     = useState(false);

  const promptRef = useRef(null);
  const maxChars  = format === 'portrait' ? MAX_PORTRAIT : MAX_LANDSCAPE;
  const trimmed   = text.trim();
  const canGen    = trimmed.length >= 1 && trimmed.length <= maxChars && selStyle && selBg;

  function handleGenerate() {
    if (!canGen) return;
    const p = buildPrompt(text, selStyle, selBg, format);
    setPrompt(p);
    setTimeout(() => promptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }

  async function handleCopy() {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback — zaznacz tekst
      const el = document.getElementById('prompt-text');
      if (el) { const range = document.createRange(); range.selectNode(el); window.getSelection().removeAllRanges(); window.getSelection().addRange(range); }
    }
  }

  React.useEffect(() => {
    if (trimmed.length > maxChars) setText(t => t.slice(0, maxChars));
  }, [format]);

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* NAV */}
      <nav className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <a href="/"><img src="/logo.png" alt="AI Flow" className="h-8 w-auto" /></a>
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: 'Academy',     href: '/' },
              { label: 'Aplikacje',   href: '/#aplikacje' },
              { label: 'Dodatki',     href: '/#dodatki' },
              { label: 'Tutoriale',   href: '/#tutorials' },
              { label: 'Cennik',      href: '/#cennik' },
            ].map(item => (
              <a key={item.label} href={item.href}
                className="px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all"
                style={{ color: 'rgba(255,255,255,0.45)', border: '1px solid transparent' }}
                onMouseEnter={e => e.target.style.color = '#fff'}
                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.45)'}>
                {item.label}
              </a>
            ))}
          </div>
          {/* Mobile nav */}
          <div className="md:hidden flex items-center gap-1 overflow-x-auto">
            {[['/', '🏠'], ['/#aplikacje', 'Apki'], ['/#cennik', 'Cennik']].map(([href, label]) => (
              <a key={href} href={href}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {label}
              </a>
            ))}
          </div>
          <div className="flex-shrink-0">
            <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
              🧪 TESTOWY
            </span>
          </div>
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

        {/* KROK 1 */}
        <Section step="1" title="Format i tekst">
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

          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="flex-shrink-0 flex flex-col items-center gap-2">
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Podgląd układu</p>
              <LetterCanvas text={text} format={format} />
            </div>
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
                    ? `${trimmed.length} liter · układ pionowy po przekątnej`
                    : `${trimmed.length} liter · układ poziomy po przekątnej`}
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* KROK 2 */}
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

        {/* KROK 3 */}
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
        <div className="text-center">
          <button onClick={handleGenerate} disabled={!canGen}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all"
            style={{
              background: canGen ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'rgba(255,255,255,0.05)',
              color: canGen ? '#000' : 'rgba(255,255,255,0.2)',
              boxShadow: canGen ? '0 0 40px rgba(245,158,11,0.3),0 8px 20px rgba(245,158,11,0.15)' : 'none',
              cursor: canGen ? 'pointer' : 'not-allowed',
            }}>
            <Sparkles className="w-4 h-4" />
            Generuj prompt
          </button>
        </div>

        {/* WYNIK */}
        {prompt && (
          <div ref={promptRef} className="rounded-2xl p-6 space-y-4"
            style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.2)' }}>

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] font-black text-amber-400">Gotowy prompt</p>
                <p className="text-[10px] text-white/30 mt-0.5">Zaznacz i skopiuj, lub kliknij przycisk</p>
              </div>
              <button onClick={handleCopy}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all"
                style={{
                  background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                  border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : 'rgba(245,158,11,0.4)'}`,
                  color: copied ? '#4ade80' : '#fbbf24',
                  boxShadow: copied ? '0 0 20px rgba(34,197,94,0.15)' : '0 0 20px rgba(245,158,11,0.1)',
                }}>
                {copied ? <><Check className="w-3.5 h-3.5" /> Skopiowano!</> : <><Copy className="w-3.5 h-3.5" /> Kopiuj prompt</>}
              </button>
            </div>

            {/* Pole tekstowe — można zaznaczyć palcem/myszą */}
            <textarea
              id="prompt-text"
              readOnly
              value={prompt}
              onClick={e => e.target.select()}
              className="w-full text-white/80 text-sm leading-relaxed font-mono rounded-xl p-4 resize-none outline-none cursor-text"
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.08)',
                minHeight: '120px',
              }}
            />

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
                { name: 'NanoBanana', url: 'https://nanobanana.ai',   emoji: '🍌' },
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
      </div>
    </div>
  );
}

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
