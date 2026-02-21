import React, { useState, useEffect, useRef } from 'react';
import { 
  Check, Star, Shield, Zap, X, Play, Lock, ChevronDown, Youtube, 
  HelpCircle, Video, Calendar, Clock, CreditCard, Landmark, Megaphone, 
  AlertCircle, Building2, Copy, Settings2, Image as ImageIcon, Camera, 
  Sun, Moon, Info, User, Frame, Mountain, Eye, Scissors, Shirt, Footprints, 
  PersonStanding, Ruler, Crown, LayoutDashboard, Sparkles, Gem, Paintbrush
} from 'lucide-react';

// =========================================================================
// WIDOK 1: GŁÓWNA PLATFORMA (VOD)
// =========================================================================
const HomeView = () => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showIban, setShowIban] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  
  const pricingRef = useRef(null);
  const DEMO_LIMIT_SECONDS = 15; 
  // TWÓJ FILM O AWATARACH (ID: 1_1oHwOZMe4)
  const YOUTUBE_VIDEO_ID = "1_1oHwOZMe4"; 

  useEffect(() => {
    let interval;
    if (isVideoActive && !isLocked) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= DEMO_LIMIT_SECONDS - 1) {
            setIsVideoActive(false); 
            setIsLocked(true);       
            return DEMO_LIMIT_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isVideoActive, isLocked]);

  const handlePlayDemo = () => { if (!isLocked) setIsVideoActive(true); };
  const scrollToPricing = () => { pricingRef.current?.scrollIntoView({ behavior: 'smooth' }); };
  const handlePurchase = (planName) => { setSelectedPlan(planName); setIsModalOpen(true); setShowIban(false); };
  const closeModal = () => { setIsModalOpen(false); setSelectedPlan(null); };

  return (
    <div className="font-sans flex flex-col pb-20">
      <div className="pt-10 pb-16 px-4 bg-slate-50 dark:bg-black transition-colors duration-500">
        <div className="max-w-4xl mx-auto text-center mb-8 font-sans">
          <div className="flex items-center justify-center gap-2 mb-2 text-red-600 font-bold uppercase text-[10px]">
            <Youtube className="w-5 h-5" /> VOD Academy Preview
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight text-slate-900 dark:text-[#E5E0D8]">
            AI FLOW ACADEMY
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-lg italic font-serif">
            "Sztuka tworzenia wizji przyszłości."
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-black rounded-2xl overflow-hidden shadow-2xl relative aspect-video border border-slate-200 dark:border-[#1A1A1A]">
          {!isVideoActive && !isLocked && progress === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop')] bg-cover bg-center text-center px-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div>
              <button onClick={handlePlayDemo} className="relative z-10 w-20 h-20 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-transform hover:scale-105 shadow-[0_0_40px_rgba(220,38,38,0.6)]">
                <Play className="w-10 h-10 ml-1" />
              </button>
              <p className="relative z-10 text-white mt-6 font-bold tracking-widest text-xs uppercase">Odtwórz Demo: Wirtualne Awatary</p>
            </div>
          )}
          {isVideoActive && (
            <div className="absolute inset-0 w-full h-full bg-black">
              <iframe 
                width="100%" 
                height="100%" 
                src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&mute=1&controls=1`} 
                title="YouTube video player" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowFullScreen 
                className="w-full h-full"
              ></iframe>
            </div>
          )}
          {isLocked && (
            <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500 font-sans">
              <Lock className="w-12 h-12 text-amber-500 mb-4" />
              <h2 className="text-xl md:text-3xl font-bold text-white mb-3 uppercase tracking-tighter">Osiągnięto limit podglądu</h2>
              <button onClick={scrollToPricing} className="bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 px-8 rounded-xl transition-all transform hover:-translate-y-1 mt-4 uppercase text-[10px] tracking-widest">
                Odblokuj Pełną Wiedzę
              </button>
            </div>
          )}
        </div>
      </div>

      <div ref={pricingRef} className="pt-16 pb-20 px-4 bg-white dark:bg-[#050505] transition-colors duration-500 font-sans">
        <div className="max-w-5xl mx-auto flex flex-col items-center">
          <h2 className="text-3xl font-bold mb-12 text-slate-900 dark:text-[#E5E0D8] uppercase tracking-tighter">Subskrypcja Premium</h2>
          <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
            <div className="bg-slate-50 dark:bg-[#0A0A0A] rounded-3xl p-8 border border-slate-200 dark:border-[#1A1A1A] flex flex-col">
              <h3 className="text-xl font-bold mb-4 dark:text-white uppercase">Abonament Miesięczny</h3>
              <div className="text-4xl font-extrabold mb-6 dark:text-white">199 PLN <span className="text-sm text-slate-500 font-normal">/ msc</span></div>
              <ul className="space-y-4 mb-8 flex-grow">
                {['Baza VOD', 'Live Coaching 3x/tydz', 'Prompt Builder Pro', 'Zamknięta Grupa'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm dark:text-slate-300"><Check className="w-4 h-4 text-emerald-500" /> {f}</li>
                ))}
              </ul>
              <button onClick={() => handlePurchase('Miesięczny')} className="w-full py-4 bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-xl uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-colors">Wybieram</button>
            </div>
            <div className="bg-slate-900 dark:bg-black rounded-3xl p-8 border border-amber-500/30 shadow-2xl relative scale-105 flex flex-col">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Najlepszy Wybór</div>
              <h3 className="text-xl font-bold mb-4 text-white uppercase">Plan Roczny VIP</h3>
              <div className="text-4xl font-extrabold mb-6 text-white">150 PLN <span className="text-sm text-slate-400 font-normal">/ msc</span></div>
              <ul className="space-y-4 mb-8 flex-grow">
                {['Wszystko w Pro', 'Gwarancja stałej ceny', 'Bonusy VIP', 'Certyfikat Eksperta'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-200"><Check className="w-4 h-4 text-amber-500" /> {f}</li>
                ))}
              </ul>
              <button onClick={() => handlePurchase('Roczny')} className="w-full py-4 bg-amber-500 text-black font-bold rounded-xl uppercase text-[10px] tracking-widest shadow-lg hover:bg-amber-400 transition-colors">Wybieram Roczny</button>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-white dark:bg-[#0A0A0A] rounded-2xl p-8 max-w-md w-full border dark:border-[#1A1A1A] relative shadow-2xl">
            <button onClick={closeModal} className="absolute top-4 right-4 dark:text-white hover:rotate-90 transition-transform"><X /></button>
            <h3 className="text-2xl font-bold mb-2 text-center dark:text-[#E5E0D8] uppercase tracking-tighter">Finalizacja</h3>
            <p className="text-center text-[10px] text-slate-500 uppercase tracking-widest mb-6 font-bold">Pakiet: <span className="text-amber-500">{selectedPlan}</span></p>
            <div className="space-y-4">
              <button className="w-full p-4 border rounded-xl flex items-center gap-4 dark:bg-black dark:border-[#1A1A1A] dark:text-white hover:border-amber-500 transition-colors group text-left">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#111] flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform"><CreditCard className="w-6 h-6" /></div>
                <div><div className="font-bold text-sm">Płatność Automatyczna</div><div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">BLIK, Karta, Apple Pay</div></div>
              </button>
              <button onClick={() => setShowIban(!showIban)} className="w-full p-4 border rounded-xl flex items-center gap-4 dark:bg-black dark:border-[#1A1A1A] dark:text-white hover:border-slate-400 transition-colors group text-left">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#111] flex items-center justify-center text-slate-400"><Building2 className="w-6 h-6" /></div>
                <div className="flex-grow"><div className="font-bold text-sm">Przelew Tradycyjny</div><div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Konta Sparkasse / Volksbank</div></div>
                <ChevronDown className={showIban ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {showIban && (
                <div className="p-4 bg-slate-50 dark:bg-[#111] rounded-xl text-[11px] space-y-3 dark:text-slate-300 font-mono border dark:border-[#222] animate-in slide-in-from-top-2">
                  <div className="flex justify-between border-b border-slate-200 dark:border-[#222] pb-1 font-mono"><span>IBAN (DE):</span><span className="text-amber-500 font-bold">DE89 3704 0044 0532 0130 00</span></div>
                  <div className="flex justify-between font-bold font-mono"><span>Do zapłaty:</span><span className="text-white">{selectedPlan === 'Roczny' ? '1800 PLN / ~420 EUR' : '199 PLN / ~46 EUR'}</span></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// WIDOK 2: KREATOR PROMPTÓW (Najbogatsza Wersja - Edition Limitée)
// =========================================================================
const PromptBuilderView = () => {
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
  const [jewelry, setJewelry] = useState('wearing luxury pearl drop earrings');
  const [makeup, setMakeup] = useState('cat eyes, sharp winged eyeliner');
  const [shoes, setShoes] = useState('elegant high heels, stilettos');
  const [shoeDetail, setShoeDetail] = useState('none');
  const [topClothing, setTopClothing] = useState('casual white t-shirt');
  const [bottomClothing, setBottomClothing] = useState('blue denim jeans');
  const [legwear, setLegwear] = useState('none');
  const [bgSelect, setBgSelect] = useState('luxurious mansion interior, marble floors');
  const [style, setStyle] = useState('photorealistic, 8k resolution');

  const generatePrompt = () => {
    const finalShoes = shoeDetail !== 'none' ? `${shoes} with ${shoeDetail}` : shoes;
    const parts = [
      "full body shot", subject, bodyType, breastSize, 
      lowerAnatomy !== 'none' ? lowerAnatomy : '',
      bodyHair !== 'none' ? bodyHair : '',
      faceSelect, "stunning detailed eyes", 
      `${hairLength} ${hairColor} ${hairStyle}`, 
      topClothing, bottomClothing, 
      legwear !== 'none' ? legwear : '',
      finalShoes, jewelry, makeup,
      bgSelect, style, 'masterpiece, high-end fashion photography, ultra-detailed, sharp focus, cinematic lighting'
    ];
    return parts.filter(part => part && part.trim() !== '').join(', ');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatePrompt()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const sectionClass = "bg-[#FCFBF9] dark:bg-[#0A0A0A] border border-black dark:border-[#222] p-5 relative shadow-[4px_4px_0px_#5E626B] dark:shadow-none mb-6 transition-all duration-500 font-sans";
  const labelClass = "block text-[9px] uppercase tracking-widest text-[#5E626B] dark:text-[#888] mb-1.5 font-bold";
  // POLE WYBORU Z SZARYM TŁEM (ZGODNIE Z PROŚBĄ)
  const inputClass = "w-full bg-[#EBECEF] dark:bg-[#121212] border border-black dark:border-[#333] px-3 py-2 text-xs dark:text-[#E5E0D8] focus:border-amber-600 focus:outline-none transition-all font-bold";
  const headerClass = "text-xs font-serif italic tracking-widest text-black dark:text-amber-500 mb-5 flex items-center gap-2 border-b border-black dark:border-[#222] pb-3 uppercase";

  return (
    <div className="pb-20 p-2 md:p-8 bg-[#F4EFE6] dark:bg-black transition-colors duration-700 min-h-screen">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8 font-sans">
        <div className="lg:col-span-3">
          <div className="mb-10 flex items-center justify-between border-b border-black dark:border-[#222] pb-6">
            <h1 className="text-3xl font-serif text-black dark:text-white flex items-center gap-3">
              <Crown className="w-8 h-8 text-amber-600 dark:text-amber-500" />
              PROMPT STUDIO <span className="text-[10px] bg-amber-500 text-black px-2 py-1 ml-2 font-bold uppercase tracking-widest relative -top-1">Edition Limitée</span>
            </h1>
          </div>

          <div className={sectionClass}>
            <h2 className={headerClass}><PersonStanding className="w-4 h-4" /> I. Form & Anatomy</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div><label className={labelClass}>Podmiot</label><select value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass}>
                  <option value="1girl, beautiful woman">1 Kobieta</option>
                  <option value="1boy, handsome man">1 Mężczyzna</option>
                  <option value="2girls, beautiful women">2 Kobiety</option>
                  <option value="1boy and 1girl, couple">Para (K+M)</option>
              </select></div>
              <div><label className={labelClass}>Sylwetka</label><select value={bodyType} onChange={(e) => setBodyType(e.target.value)} className={inputClass}>
                  <option value="slim and toned body">Szczupła</option>
                  <option value="curvy, hourglass figure">Klepsydra</option>
                  <option value="athletic, muscular body">Atletyczna</option>
              </select></div>
              <div><label className={labelClass}>Biust</label><select value={breastSize} onChange={(e) => setBreastSize(e.target.value)} className={inputClass}>
                  <option value="small breasts">Mały</option>
                  <option value="medium breasts">Średni</option>
                  <option value="large heavy breasts">Duży</option>
              </select></div>
              <div><label className={labelClass}>Dół anatomia</label><select value={lowerAnatomy} onChange={(e) => setLowerAnatomy(e.target.value)} className={inputClass}>
                  <option value="none">Standard</option>
                  <option value="noticeable crotch bulge">Bulge (M)</option>
                  <option value="cameltoe">Cameltoe (K)</option>
              </select></div>
              <div><label className={labelClass}>Owłosienie</label><select value={bodyHair} onChange={(e) => setBodyHair(e.target.value)} className={inputClass}>
                  <option value="none">Gładkie</option>
                  <option value="light body hair">Lekkie</option>
                  <option value="hairy body">Mocne</option>
              </select></div>
            </div>
          </div>

          {/* DALSZA CZĘŚĆ KREATORA... */}
          <div className={sectionClass}>
            <h2 className={headerClass}><User className="w-4 h-4" /> II. Visage & Hair</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><label className={labelClass}>Fryzura</label><select value={hairStyle} onChange={(e) => setHairStyle(e.target.value)} className={inputClass}>
                  <option value="elegant updo hair, wedding style">Upięcie ślubne</option>
                  <option value="high bun hair, sleek look">Wysoki kok</option>
                  <option value="tied in a ponytail">Kucyk</option>
              </select></div>
              <div><label className={labelClass}>Kolor</label><select value={hairColor} onChange={(e) => setHairColor(e.target.value)} className={inputClass}>
                  <option value="blonde">Blond</option>
                  <option value="brunette">Brązowe</option>
                  <option value="black">Czarne</option>
              </select></div>
              <div><label className={labelClass}>Długość</label><select value={hairLength} onChange={(e) => setHairLength(e.target.value)} className={inputClass}>
                  <option value="short">Krótkie</option>
                  <option value="long">Długie</option>
              </select></div>
              <div><label className={labelClass}>Twarz</label><select value={faceSelect} onChange={(e) => setFaceSelect(e.target.value)} className={inputClass}>
                  <option value="detailed symmetrical face">Klasyczna</option>
                  <option value="cute face, freckles">Piegi</option>
              </select></div>
            </div>
          </div>

          <div className={sectionClass}>
            <h2 className={headerClass}><Shirt className="w-4 h-4" /> III. Haute Couture</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><label className={labelClass}>Góra</label><select value={topClothing} onChange={(e) => setTopClothing(e.target.value)} className={inputClass}>
                  <option value="casual white t-shirt">T-shirt</option>
                  <option value="suit jacket, formal">Marynarka</option>
                  <option value="bikini top">Bikini</option>
              </select></div>
              <div><label className={labelClass}>Dół</label><select value={bottomClothing} onChange={(e) => setBottomClothing(e.target.value)} className={inputClass}>
                  <option value="blue denim jeans">Jeansy</option>
                  <option value="mini skirt">Mini</option>
              </select></div>
              <div><label className={labelClass}>Obuwie</label><select value={shoes} onChange={(e) => setShoes(e.target.value)} className={inputClass}>
                  <option value="elegant high heels">Szpilki</option>
                  <option value="modern sneakers">Sportowe</option>
                  <option value="barefoot">Boso</option>
              </select></div>
              <div><label className={labelClass}>Nogi</label><select value={legwear} onChange={(e) => setLegwear(e.target.value)} className={inputClass}>
                  <option value="none">Gołe</option>
                  <option value="pantyhose">Rajstopy</option>
                  <option value="stockings with lace">Pończochy</option>
              </select></div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-10 font-sans">
            <div className="bg-[#FCFBF9] dark:bg-[#0A0A0A] border border-black dark:border-[#333] p-6 shadow-[8px_8px_0px_#5E626B] dark:shadow-none transition-colors duration-500">
              <h2 className="text-[10px] font-bold uppercase tracking-widest mb-4 border-b border-black dark:border-[#333] pb-2 dark:text-amber-500 uppercase">Kompilacja Promptu</h2>
              {/* TŁO PROMPTU DOPASOWANE DO POLI WYBORU (#EBECEF) */}
              <div className="bg-[#EBECEF] dark:bg-[#121212] p-5 min-h-[220px] text-black dark:text-[#E5E0D8] font-mono text-[11px] leading-relaxed break-words border border-black dark:border-[#222] mb-6 shadow-inner">
                <span className="text-amber-600 dark:text-amber-500 font-bold select-none">{`> `}</span>{generatePrompt()}
                <span className="animate-pulse text-amber-500 font-bold">|</span>
              </div>
              <button onClick={handleCopy} className={`w-full py-4 font-bold text-[10px] uppercase tracking-widest border border-black dark:border-amber-500 transition-all ${copied ? 'bg-emerald-500 text-black shadow-none' : 'bg-black dark:bg-[#1A1A1A] text-amber-500 hover:bg-amber-500 hover:text-black shadow-[4px_4px_0px_black] dark:shadow-none'}`}>
                {copied ? 'Copied!' : 'Export Prompt'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [currentView, setCurrentView] = useState('prompt-builder');
  const [isDarkMode, setIsDarkMode] = useState(true);

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-white dark:bg-black transition-colors duration-700 font-sans selection:bg-amber-500 selection:text-black">
        <nav className="bg-slate-900 dark:bg-[#050505] border-b border-slate-800 dark:border-[#1A1A1A] sticky top-0 z-50 h-16 flex items-center px-4 font-sans">
          <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('home')}>
              <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center shadow-lg"><Zap className="w-5 h-5 text-black" /></div>
              <span className="text-white font-bold text-lg hidden sm:block tracking-tight uppercase">AI FLOW</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-slate-800 dark:bg-[#121212] p-1 rounded-xl border border-slate-700 dark:border-[#222]">
                <button onClick={() => setCurrentView('home')} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${currentView === 'home' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Academy</button>
                <button onClick={() => setCurrentView('prompt-builder')} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${currentView === 'prompt-builder' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/10' : 'text-amber-500/70 font-bold'}`}>Studio Pro</button>
              </div>
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 dark:bg-[#121212] text-amber-400 border border-slate-700 hover:scale-110 transition-transform">
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </nav>
        <main>{currentView === 'home' ? <HomeView /> : <PromptBuilderView />}</main>
        
        <footer className="bg-slate-50 dark:bg-[#050505] py-10 border-t border-slate-200 dark:border-[#111] transition-colors duration-500 font-sans">
           <div className="max-w-[1400px] mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-[9px] text-slate-500 dark:text-slate-600 uppercase tracking-widest font-bold">© 2026 Damian L. J. - Professional AI Suite</p>
           </div>
        </footer>
      </div>
    </div>
  );
}