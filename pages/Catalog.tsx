
import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { productService } from '../services/api';
import { Search, Info, Check, Plus, Layers, HelpCircle, Camera, Upload, Sparkles, AlertCircle, X, ArrowRight, ShoppingCart, Settings2, BookOpen, Key, Globe, MousePointer2, ExternalLink, RefreshCcw, ShieldCheck, Package } from 'lucide-react';
import { Button } from '../components/Button';
import { GoogleGenAI, Type } from "@google/genai";

interface CatalogProps {
  addToCart: (product: Product) => void;
}

interface AIResult {
  type: string;
  color: string;
  amperage: string;
  line: string;
  description: string;
}

export const Catalog: React.FC<CatalogProps> = ({ addToCart }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'novara'>('general');
  const [visibleCount, setVisibleCount] = useState(24);
  const observerTarget = useRef<HTMLDivElement>(null);

  const [showVisualSearch, setShowVisualSearch] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [showHelp, setShowHelp] = useState(false);
  const [helpTab, setHelpTab] = useState<'usage' | 'api'>('usage');

  const [novaraStep, setNovaraStep] = useState<1 | 2>(1);
  const [selectedPlates, setSelectedPlates] = useState<{product: Product, qty: number}[]>([]);
  const [selectedModules, setSelectedModules] = useState<{product: Product, qty: number}[]>([]);
  const [selectedProductForInfo, setSelectedProductForInfo] = useState<Product | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLine, setSelectedLine] = useState<string>('all');
  const [novaraSearch, setNovaraSearch] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (activeTab === 'general') filterProducts();
  }, [searchTerm, selectedCategory, selectedLine, products, activeTab, aiResult]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisibleCount((prev) => prev + 24);
      },
      { threshold: 0.1, rootMargin: '100px' }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
  }, [filteredProducts, activeTab, visibleCount]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getAll();
      setProducts(data || []);
      setFilteredProducts(data || []);
    } catch (e) {
      console.error("Erro ao carregar catálogo:", e);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    const allProds = products || [];
    let result = [...allProds];

    if (aiResult) {
      const typeLower = aiResult.type?.toLowerCase() || "";
      const lineLower = aiResult.line?.toLowerCase() || "";
      result = result.filter(p => {
        const desc = p.description.toLowerCase();
        return desc.includes(typeLower) || p.line.toLowerCase().includes(lineLower);
      });
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.code.toLowerCase().includes(lower) ||
        p.description.toLowerCase().includes(lower) ||
        p.reference.toLowerCase().includes(lower)
      );
    }
    if (selectedCategory !== 'all') result = result.filter(p => p.category === selectedCategory);
    if (selectedLine !== 'all') result = result.filter(p => p.line === selectedLine);
    
    setFilteredProducts(result);
    setVisibleCount(24);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setCameraStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Acesso à câmera negado ou indisponível.");
      setShowVisualSearch(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  // Improved image analysis following GenAI guidelines
  const analyzeImage = async (base64Data: string) => {
    setIsAnalyzing(true);
    setAiResult(null);
    
    try {
      // Use process.env.API_KEY directly as per guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Using gemini-3-pro-preview for visual recognition and complex reasoning
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
          parts: [
            { text: "Identifique o componente elétrico Dicompel na foto. Retorne JSON: type, color, amperage, line, description." },
            { inlineData: { mimeType: 'image/jpeg', data: base64Data.split(',')[1] } }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              color: { type: Type.STRING },
              amperage: { type: Type.STRING },
              line: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["type", "color", "amperage", "line", "description"]
          }
        }
      });

      // Extract text from property (not method call)
      const parsed: AIResult = JSON.parse(response.text || "{}");
      setAiResult(parsed);
      
      const match = products.find(p => {
        const desc = p.description.toLowerCase();
        return (parsed.type && desc.includes(parsed.type.toLowerCase())) && (parsed.line && p.line.toLowerCase().includes(parsed.line.toLowerCase()));
      }) || products.find(p => p.description.toLowerCase().includes((parsed.description || "").toLowerCase().split(' ')[0]));

      setShowVisualSearch(false);
      stopCamera();

      if (match) setSelectedProductForInfo(match);
      else alert("IA identificou: " + (parsed.description || "Componente") + ". Não encontramos correspondência exata.");
      
    } catch (err: any) {
      console.error("Erro na análise IA:", err);
      alert("Falha na IA. Verifique as configurações da API_KEY.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        analyzeImage(canvasRef.current.toDataURL('image/jpeg', 0.8));
      }
    }
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    setAddedIds(prev => [...prev, product.id]);
    setTimeout(() => setAddedIds(prev => prev.filter(id => id !== product.id)), 1500);
  };

  const getNovaraProducts = () => {
    if (!products || products.length === 0) return [];
    const novaraProds = products.filter(p => 
      (p.line || '').toLowerCase() === 'novara' || 
      (p.description || '').toLowerCase().includes('novara')
    );
    let result = novaraProds.filter(p => {
      const desc = (p.description || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const isPlate = (cat.includes('placa') || desc.includes('placa')) && !desc.includes('módulo') && !desc.includes('modulo');
      return novaraStep === 1 ? isPlate : !isPlate;
    });
    if (novaraSearch) {
      const lower = novaraSearch.toLowerCase();
      result = result.filter(p => (p.code || '').toLowerCase().includes(lower) || (p.description || '').toLowerCase().includes(lower));
    }
    return result;
  };

  const toggleNovaraItem = (product: Product, type: 'plate' | 'module') => {
    const setState = type === 'plate' ? setSelectedPlates : setSelectedModules;
    setState(prev => {
      const ex = prev.find(i => i.product.id === product.id);
      return ex ? prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i) : [...prev, { product, qty: 1 }];
    });
  };

  const removeNovaraItem = (id: string, type: 'plate' | 'module') => {
    const setState = type === 'plate' ? setSelectedPlates : setSelectedModules;
    setState(prev => prev.filter(i => i.product.id !== id));
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Catálogo Dicompel</h2>
            <p className="text-slate-600 text-sm">Design e tecnologia em componentes elétricos.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="primary" size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 border-none shadow-lg shadow-blue-100" onClick={() => { setShowVisualSearch(true); startCamera(); }}>
              <Camera className="h-4 w-4 mr-2" /> Pesquisa Visual IA
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setShowHelp(true); setHelpTab('usage'); }}>
               <HelpCircle className="h-4 w-4 mr-2" /> Ajuda
            </Button>
          </div>
        </div>

        <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-full md:w-auto self-start border border-slate-200">
          <button onClick={() => setActiveTab('general')} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'general' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            Catálogo Geral
          </button>
          <button onClick={() => { setActiveTab('novara'); setNovaraStep(1); }} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'novara' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            Monte sua Novara
          </button>
        </div>
      </div>

      {activeTab === 'general' && (
        <>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute inset-y-0 left-3 h-5 w-5 text-slate-400 my-auto" />
              <input type="text" className="block w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:outline-none bg-white border-slate-200" placeholder="Buscar produtos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20"><div className="loader"></div></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.slice(0, visibleCount).map(product => (
                <div key={product.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border flex flex-col h-full overflow-hidden group">
                  <div className="relative pt-[100%] bg-slate-50">
                    <img src={product.imageUrl} alt={product.description} className="absolute inset-0 w-full h-full object-contain p-2" />
                    <button onClick={() => setSelectedProductForInfo(product)} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-sm hover:bg-blue-600 hover:text-white transition-all"><Info className="h-4 w-4" /></button>
                    <span className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">{product.code}</span>
                  </div>
                  <div className="p-4 flex-grow flex flex-col">
                    <span className="text-[10px] font-bold text-blue-600 uppercase mb-1">{product.line}</span>
                    <h3 className="text-xs font-bold text-slate-900 mb-2 line-clamp-2 h-8">{product.description}</h3>
                    <div className="mt-auto pt-2 border-t">
                      <Button variant={addedIds.includes(product.id) ? "secondary" : "primary"} className="w-full text-[10px] h-9" onClick={() => handleAddToCart(product)} disabled={addedIds.includes(product.id)}>
                        {addedIds.includes(product.id) ? <Check className="h-3.5 w-3.5 mr-1.5"/> : <Plus className="h-3.5 w-3.5 mr-1.5"/>}
                        {addedIds.includes(product.id) ? "No Carrinho" : "Adicionar"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={observerTarget} className="h-10 col-span-full"></div>
            </div>
          )}
        </>
      )}

      {showHelp && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[5000] animate-in fade-in duration-300">
           <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-100">
              <div className="p-6 border-b flex flex-col gap-4 bg-slate-50">
                 <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-slate-900 text-white rounded-xl shadow-lg"><BookOpen className="h-5 w-5" /></div>
                       <h3 className="text-lg font-black text-slate-900 uppercase">Suporte Dicompel</h3>
                    </div>
                    <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-slate-900 p-2"><X className="h-6 w-6"/></button>
                 </div>
              </div>
              <div className="flex-grow overflow-y-auto p-8 space-y-4">
                <div className="text-sm text-slate-600 leading-relaxed">
                   <p>O catálogo permite navegar entre as linhas Dicompel. Você pode gerar orçamentos prévios selecionando os itens.</p>
                   <p className="mt-4">Se precisar de ajuda com um modelo, use o botão <strong>Pesquisa Visual IA</strong> para identificar o componente via foto.</p>
                   <p className="mt-4">A IA Vision processa as características visuais para sugerir o item correspondente no nosso estoque.</p>
                </div>
              </div>
              <div className="p-6 border-t"><Button className="w-full" onClick={() => setShowHelp(false)}>ENTENDI</Button></div>
           </div>
        </div>
      )}

      {showVisualSearch && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 z-[3000]">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-xl w-full overflow-hidden flex flex-col relative animate-in zoom-in-95">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-900 uppercase">IA Vision Dicompel</h3>
              <button onClick={() => { setShowVisualSearch(false); stopCamera(); }} className="text-slate-300 hover:text-slate-900"><X className="h-8 w-8" /></button>
            </div>
            <div className="p-8 flex flex-col items-center gap-6">
              {isAnalyzing ? (
                <div className="text-center py-20"><div className="loader mb-4"></div><p className="font-bold text-slate-400">ANALISANDO...</p></div>
              ) : (
                <div className="relative w-full aspect-square bg-slate-900 rounded-[2rem] overflow-hidden">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <canvas ref={canvasRef} className="hidden" />
                  <button onClick={capturePhoto} className="absolute bottom-8 left-1/2 -translate-x-1/2 h-20 w-20 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-blue-500 active:scale-95">
                    <Sparkles className="h-8 w-8 text-blue-600" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedProductForInfo && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[2000]">
           <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="relative h-64 bg-slate-50 flex items-center justify-center p-12 border-b">
                 <button onClick={() => setSelectedProductForInfo(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900"><X className="h-6 w-6"/></button>
                 <img src={selectedProductForInfo.imageUrl} className="h-full object-contain" alt=""/>
              </div>
              <div className="p-10">
                 <h3 className="text-2xl font-black text-slate-900 mb-6">{selectedProductForInfo.description}</h3>
                 <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
                    <p className="font-bold text-slate-400 uppercase">CÓD: {selectedProductForInfo.code}</p>
                    <p className="font-bold text-slate-400 uppercase text-right">LINHA: {selectedProductForInfo.line}</p>
                 </div>
                 <Button className="w-full h-16" onClick={() => { handleAddToCart(selectedProductForInfo); setSelectedProductForInfo(null); }}>ADICIONAR AO CARRINHO</Button>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'novara' && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
             <div className="bg-slate-900 text-white p-6 rounded-2xl mb-4 flex justify-between items-center shadow-xl">
                <div>
                   <h3 className="text-lg font-bold">Passo {novaraStep}: {novaraStep === 1 ? 'Escolha as Placas' : 'Escolha os Módulos'}</h3>
                   <p className="text-[10px] text-blue-400 font-black uppercase mt-1">Série Novara - Design Italiano</p>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => setNovaraStep(1)} className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-all ${novaraStep === 1 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>1</button>
                   <button onClick={() => selectedPlates.length > 0 && setNovaraStep(2)} className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-all ${novaraStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>2</button>
                </div>
             </div>
             
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
               {getNovaraProducts().map(product => {
                 const isInKit = (novaraStep === 1 ? selectedPlates : selectedModules).find(m => m.product.id === product.id);
                 return (
                   <div key={product.id} className={`bg-white border-2 rounded-2xl overflow-hidden hover:border-blue-500 transition-all flex flex-col ${isInKit ? 'border-blue-600 shadow-lg' : 'border-slate-100'}`}>
                      <div className="relative pt-[100%] bg-slate-50">
                         <img src={product.imageUrl} className="absolute inset-0 w-full h-full object-contain p-4" alt="" />
                      </div>
                      <div className="p-4 flex-grow flex flex-col">
                         <h4 className="font-bold text-xs text-slate-800 mb-4 h-10 line-clamp-2">{product.description}</h4>
                         <Button size="sm" className="w-full text-[10px] font-black" onClick={() => toggleNovaraItem(product, novaraStep === 1 ? 'plate' : 'module')}>
                           {isInKit ? `+ ADICIONAR (X${isInKit.qty + 1})` : '+ SELECIONAR'}
                         </Button>
                      </div>
                   </div>
                 );
               })}
             </div>
          </div>
          <div className="w-full lg:w-96 bg-white rounded-3xl shadow-2xl border h-fit sticky top-24 overflow-hidden">
             <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
                <h3 className="font-bold text-sm uppercase">Resumo do Kit</h3>
                {(selectedPlates.length > 0 || selectedModules.length > 0) && <button onClick={() => { setSelectedPlates([]); setSelectedModules([]); setNovaraStep(1); }} className="text-[10px] text-blue-400 font-black">LIMPAR</button>}
             </div>
             <div className="p-6 space-y-6">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-3">PLACAS ({selectedPlates.reduce((a,b) => a+b.qty, 0)})</p>
                   <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedPlates.map(it => (
                        <div key={it.product.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-[11px] font-bold border">
                           <span className="truncate flex-1 pr-2">{it.qty}x {it.product.description}</span>
                           <button onClick={() => removeNovaraItem(it.product.id, 'plate')}><X className="h-4 w-4 text-red-500"/></button>
                        </div>
                      ))}
                   </div>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-3">MÓDULOS ({selectedModules.reduce((a,b) => a+b.qty, 0)})</p>
                   <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedModules.map(it => (
                        <div key={it.product.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-[11px] font-bold border">
                           <span className="truncate flex-1 pr-2">{it.qty}x {it.product.description}</span>
                           <button onClick={() => removeNovaraItem(it.product.id, 'module')}><X className="h-4 w-4 text-red-500"/></button>
                        </div>
                      ))}
                   </div>
                </div>
                {novaraStep === 1 ? (
                   <Button className="w-full h-14" disabled={selectedPlates.length === 0} onClick={() => setNovaraStep(2)}>IR PARA MÓDULOS <ArrowRight className="h-4 w-4 ml-2"/></Button>
                ) : (
                   <Button className="w-full h-14 bg-blue-600" disabled={selectedPlates.length === 0} onClick={() => {
                      selectedPlates.forEach(m => { for(let i=0; i<m.qty; i++) addToCart(m.product); });
                      selectedModules.forEach(m => { for(let i=0; i<m.qty; i++) addToCart(m.product); });
                      setSelectedPlates([]); setSelectedModules([]); setNovaraStep(1); setActiveTab('general');
                      alert("Kit Novara adicionado ao carrinho!");
                   }}>FINALIZAR KIT</Button>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
