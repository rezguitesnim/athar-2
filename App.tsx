
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Layout } from './components/Layout';
import { GeminiService } from './services/geminiService';
import { AnalysisResult, HistoryItem } from './types';
import { ResultCard } from './components/ResultCard';
import { stopSpeech } from './speech';

const compressImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1024;
      const MAX_HEIGHT = 1024;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(base64Str);
  });
};

const ARCHAEOLOGICAL_INFO = {
  ar: [
    "حجر رشيد كان المفتاح لفك رموز الهيروغليفية عام 1822.",
    "الكتابة المسمارية هي أقدم نظام كتابة في العالم، بدأت في سومر.",
    "خط التيفيناغ الأمازيغي يعود لآلاف السنين وهو أحد أقدم الأبجديات.",
    "المصريون القدماء استخدموا أكثر من 700 رمز هيروغليفي.",
    "نقش نقش رستم في إيران يروي انتصارات الساسانيين بلغات متعددة.",
    "الأبجدية الفينيقية هي الأصل لمعظم الأبجديات المعاصرة.",
    "مخطوطات البحر الميت هي أقدم النسخ المكتشفة من نصوص توراتية.",
    "مسلة حمورابي تحتوي على واحدة من أقدم مجموعات القوانين في التاريخ.",
    "الخط الكوفي هو أحد أقدم أشكال الخط العربي وتطور في العراق.",
    "نقوش البتراء النبطية تُظهر تطوراً لغوياً فريداً بين الآرامية والعربية.",
    "حجر باليرمو يسجل أحداث الأسرات المصرية الأولى بدقة مذهلة.",
    "لوح الشكوى إلى إيا-ناصر هو أقدم شكوى عملاء مسجلة في التاريخ.",
    "نقش تيما في السعودية يعكس الروابط التجارية القديمة.",
    "أقدم استخدام للصفر كرقم سُجل في الهند القديمة.",
    "الهيروغليفية تطورت عبر آلاف السنين ولم تكن ثابتة."
  ],
  en: [
    "The Rosetta Stone was the key to deciphering Hieroglyphs in 1822.",
    "Cuneiform is the world's oldest writing system, originating in Sumer.",
    "Tifinagh script dates back millennia and is still used today.",
    "Ancient Egyptians used over 700 hieroglyphic signs.",
    "The Behistun Inscription is the Rosetta Stone of Cuneiform.",
    "The Phoenician alphabet is the mother of most modern alphabets.",
    "The Dead Sea Scrolls contain some of the oldest known biblical texts.",
    "Hammurabi's Code is one of the oldest deciphered writings.",
    "Kufic is the oldest calligraphic form of various Arabic scripts.",
    "The Epic of Gilgamesh is the oldest surviving work of literature.",
    "The Cyrus Cylinder is considered the first charter of human rights.",
    "Linear B revealed an early form of Greek in 1952.",
    "Maya script was the only fully developed writing system of Pre-Columbian Americas.",
    "The Complaint Tablet to Ea-nasir is the oldest known customer complaint.",
    "Ancient Indus Valley script remains a great unsolved mystery."
  ],
  fr: [
    "La pierre de Rosette a permis de déchiffrer les hiéroglyphes en 1822.",
    "Le cunéiforme est le plus ancien système d'écriture au monde.",
    "L'écriture amazighe Tifinagh remonte à des millénaires.",
    "Les anciens Égyptiens utilisaient plus de 700 signes hiéroglyphiques.",
    "L'inscription de Behistun est la pierre de Rosette du cunéiforme.",
    "L'alphabet phénicien est l'ancêtre des alphabets modernes.",
    "Les manuscrits de la mer Morte sont les plus anciens textes bibliques.",
    "Le Code de Hammurabi est l'un des plus anciens recueils de lois.",
    "Le Kufi est la plus ancienne forme calligraphique de l'arabe.",
    "L'Épopée de Gilgamesh est la plus ancienne œuvre littéraire connue.",
    "Le Cylindre de Cyrus est la première charte des droits de l'homme.",
    "Le Linéaire B a révélé une forme archaïque de grec en 1952.",
    "L'écriture maya était le seul système complet d'Amérique précolombienne.",
    "La tablette d'Ea-nasir est la plus ancienne plainte écrite connue.",
    "L'écriture de l'Indus reste l'un des grands mystères non résolus."
  ]
};

const UI = {
  ar: { 
    scan: "تحليل النقش", history: "أرشيف الاستكشاف", empty: "الأرشيف فارغ", fact: "معلومة تاريخية",
    scannerTitle: "ماسح الآثار الذكي", tapToScan: "اضغط لمسح الأثر", decrypting: "جاري فك التشفير...",
    systemReady: "النظام جاهز للاستقبال", error: "حدث خطأ في الاتصال. يرجى التأكد من جودة الصورة."
  },
  en: { 
    scan: "Analyze Inscription", history: "Discovery Archive", empty: "Archive is empty", fact: "Historical Fact",
    scannerTitle: "A.I. Artifact Scanner", tapToScan: "Tap to Scan Artifact", decrypting: "Decrypting...",
    systemReady: "System Ready for Input", error: "Connection error. Please provide a clear image."
  },
  fr: { 
    scan: "Analyser l'inscription", history: "Archives", empty: "Archives vides", fact: "Fait Historique",
    scannerTitle: "Scanner d'Artefacts IA", tapToScan: "Appuyez pour scanner", decrypting: "Déchiffrement...",
    systemReady: "Système prêt", error: "Erreur de connexion. Veuillez fournir une image claire."
  }
};

const App: React.FC = () => {
  const [uiLang, setUiLang] = useState<'ar' | 'en' | 'fr'>('ar');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [factIndex, setFactIndex] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = UI[uiLang];

  useEffect(() => {
    document.documentElement.lang = uiLang;
    document.body.dir = uiLang === 'ar' ? 'rtl' : 'ltr';
    const saved = localStorage.getItem('athar_v13_pro');
    if (saved) setHistory(JSON.parse(saved));
  }, [uiLang]);

  useEffect(() => {
    if (result) stopSpeech();
  }, [uiLang, result]);

  // منطق اختيار الحقائق بشكل عشوائي وغير متكرر
  useEffect(() => {
    if (loading) {
      const facts = ARCHAEOLOGICAL_INFO[uiLang];
      const interval = setInterval(() => {
        setFactIndex(prev => {
          let next;
          do {
            next = Math.floor(Math.random() * facts.length);
          } while (next === prev && facts.length > 1);
          return next;
        });
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [loading, uiLang]);

  const onFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);
    stopSpeech();

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const originalB64 = event.target?.result as string;
        const compressedB64 = await compressImage(originalB64);
        setSelectedImage(compressedB64);
        
        const service = new GeminiService();
        const base64Data = compressedB64.split(',')[1];
        const analysis = await service.analyzeInscription(base64Data);
        
        setResult(analysis);

        setHistory(prev => {
          const updated = [{ id: Date.now().toString(), timestamp: Date.now(), img: compressedB64, res: analysis }, ...prev.slice(0, 11)];
          localStorage.setItem('athar_v13_pro', JSON.stringify(updated));
          return updated;
        });
      } catch (err) {
        console.error(err);
        alert(t.error);
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  }, [t.error]);

  const renderedHistory = useMemo(() => (
    history.map((h) => (
      <div key={h.id} className="history-card" onClick={() => { 
        setSelectedImage(h.img); 
        setResult(h.res);
        stopSpeech();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}>
        <img src={h.img} className="history-img" alt="Log" loading="lazy" />
        <div className="overflow-hidden">
          <div className="text-[11px] font-bold text-secondary truncate mb-1">{h.res.detectedLanguage}</div>
          <div className="text-[10px] opacity-40 truncate italic leading-relaxed">"{h.res.translations[uiLang]}"</div>
        </div>
      </div>
    ))
  ), [history, uiLang]);

  return (
    <Layout lang={uiLang} onLangChange={setUiLang}>
      <div className="app-container">
        <aside className="space-y-8">
          <section className={`section-card ${loading ? 'loading' : ''}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary">{t.scannerTitle}</h2>
              <i className="fas fa-microchip text-secondary/30"></i>
            </div>
            
            <div className="scanner-frame camera-preview" onClick={() => fileInputRef.current?.click()}>
              <div className="laser-line"></div>
              {selectedImage ? (
                <img src={selectedImage} alt="Artifact" className="animate-fade-up" />
              ) : (
                <div className="text-center opacity-30 px-6">
                  <i className="fas fa-camera-retro text-5xl mb-6 text-secondary"></i>
                  <p className="text-[10px] font-bold uppercase tracking-widest">{t.tapToScan}</p>
                </div>
              )}
            </div>

            <input type="file" ref={fileInputRef} onChange={onFileUpload} accept="image/*" className="hidden" capture="environment" />

            <button className="btn-primary" disabled={loading} onClick={() => fileInputRef.current?.click()}>
              {loading ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-magnifying-glass-chart"></i>}
              {loading ? t.decrypting : t.scan}
            </button>
          </section>
        </aside>

        <section id="output" className="relative">
          {loading ? (
            <div className="section-card flex flex-col items-center justify-center min-h-[400px] text-center border-dashed border-2 border-secondary/10">
              <div className="w-16 h-16 border-t-2 border-secondary rounded-full animate-spin mb-10 shadow-[0_0_20px_rgba(197,160,89,0.1)]"></div>
              <div className="max-w-md animate-fade-up">
                <span className="text-[10px] uppercase font-black text-secondary tracking-[0.4em] mb-4 block">{t.fact}</span>
                <p className="text-xl italic opacity-70 leading-relaxed">"{ARCHAEOLOGICAL_INFO[uiLang][factIndex]}"</p>
              </div>
            </div>
          ) : result ? (
            <ResultCard result={result} imageUrl={selectedImage!} uiLang={uiLang} />
          ) : (
            <div className="section-card flex flex-col items-center justify-center min-h-[400px] opacity-10 border-dashed border-2 border-white/5">
              <i className="fas fa-scroll text-[12rem] mb-10 text-secondary"></i>
              <p className="text-sm uppercase font-black tracking-[0.6em]">{t.systemReady}</p>
            </div>
          )}
        </section>
      </div>

      <section className="section-card !p-8 mt-12 animate-fade-up">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-secondary mb-8 border-b border-white/5 pb-5">
          <i className="fas fa-book-atlas mr-3"></i> {t.history}
        </h3>
        <div className="history-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {history.length > 0 ? renderedHistory : (
            <div className="col-span-full text-center py-10 opacity-10">
              <p className="text-[11px] uppercase font-black tracking-widest">{t.empty}</p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default App;
