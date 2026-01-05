
import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { productService } from '../services/api';
import { Search, Info, Check, Plus, Layers, Grid, ShoppingCart, FileText, X, ChevronRight, HelpCircle, Eye, ArrowLeft, ArrowRight, Camera, Upload, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '../components/Button';
import { GoogleGenAI } from "@google/genai";

interface CatalogProps {
  addToCart: (product: Product) => void;
}

interface AIResult {
  type: string;
  color: string;
  amperage: string;
  line: string;
  description: string;
  tags: string[];
}

export const Catalog: React.FC<CatalogProps> = ({ addToCart }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'novara'>('general');
  const [visibleCount, setVisibleCount] = useState(24);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Estados da Pesquisa Visual
  const [showVisualSearch, setShowVisualSearch] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [novaraStep, setNovaraStep] = useState<1 | 2>(1);
  const [selectedPlates, setSelectedPlates] = useState<{product: Product, qty: number}[]>([]);
  const [selectedModules, setSelectedModules] = useState<{product: Product, qty: number}[]>([]);
  const [selectedProductForInfo, setSelectedProductForInfo] = useState<Product | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLine, setSelectedLine] = useState<string>('all');
  const [selectedAmperage, setSelectedAmperage] = useState<string>('all');

  const [novaraSearch, setNovaraSearch] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (activeTab === 'general') {
      filterProducts();
    }
  }, [searchTerm, selectedCategory, selectedLine, selectedAmperage, products, activeTab, aiResult]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 24);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
  }, [filteredProducts, activeTab, visibleCount]);

  const loadProducts = async () => {
    try {
      const data = await productService.getAll();
      setProducts(data || []);
      setFilteredProducts(data || []);
    } catch (e) {
      console.error("Erro ao carregar catálogo:", e);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    const allProds = products || [];
    let result = [...allProds];

    if (aiResult) {
      const typeLower = aiResult.type.toLowerCase();
      const colorLower = aiResult.color.toLowerCase();
      const lineLower = aiResult.line.toLowerCase();

      result = result.filter(p => {
        const desc = p.description.toLowerCase();
        const cat = p.category.toLowerCase();
        const line = p.line.toLowerCase();
        
        const matchesType = desc.includes(typeLower) || cat.includes(typeLower);
        const matchesColor = p.colors?.some(c => c.toLowerCase().includes(colorLower)) || desc.includes(colorLower);
        const matchesLine = line.includes(lineLower) || desc.includes(lineLower);

        return matchesType || matchesColor || matchesLine;
      });
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => 
        (p.code || '').toLowerCase().includes(lower) ||
        (p.description || '').toLowerCase().includes(lower) ||
        (p.reference || '').toLowerCase().includes(lower)
      );
    }
    if (selectedCategory !== 'all') result = result.filter(p => p.category === selectedCategory);
    if (selectedLine !== 'all') result = result.filter(p => p.line === selectedLine);
    if (selectedAmperage !== 'all') result = result.filter(p => p.amperage === selectedAmperage);
    
    setFilteredProducts(result);
    setVisibleCount(24);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Não foi possível acessar a câmera.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const analyzeImage = async (base64Data: string) => {
    setIsAnalyzing(true);
    setAiResult(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              { text: "Você é um especialista técnico em componentes elétricos da Dicompel. Analise a imagem fornecida e identifique: 1. Tipo (Tomada, Interruptor ou Conjunto). 2. Características: Cor, Amperagem (se visível), Estilo (ex: Novara, Classic). 3. Detalhes de acabamento. Responda APENAS em formato JSON com o seguinte esquema: { \"type\": \"string\", \"color\": \"string\", \"amperage\": \"string\", \"line\": \"string\", \"description\": \"string\", \"tags\": [\"string\"] }" },
              { inlineData: { mimeType: 'image/jpeg', data: base64Data.split(',')[1] } }
            ]
          }
        ]
      });

      const text = response.text || "{}";
      const cleanedJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed: AIResult = JSON.parse(cleanedJson);
      setAiResult(parsed);
      setShowVisualSearch(false);
      stopCamera();
    } catch (err) {
      console.error("Erro na análise da IA:", err);
      alert("Erro ao analisar a imagem. Tente novamente.");
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
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        analyzeImage(dataUrl);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        analyzeImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    setAddedIds(prev => [...prev, product.id]);
    setTimeout(() => setAddedIds(prev => prev.filter(id => id !== product.id)), 1500);
  };

  const isPlateProduct = (p: Product) => {
    if (!p) return false;
    const text = [p.category, p.subcategory, p.description].filter(Boolean).map(s => String(s)).join(' ').toLowerCase();
    return (text.includes('placa') || text.includes('suporte') || text.includes('espelho')) && !text.includes('módulo');
  };

  const isModuleProduct = (p: Product) => {
    if (!p) return false;
    const text = [p.category, p.subcategory, p.description].filter(Boolean).map(s => String(s)).join(' ').toLowerCase();
    return text.includes('módulo');
  };

  const getNovaraProducts = () => {
    let novaraItems = (products || []).filter(p => 
      (p.line || '').toLowerCase().includes('novara') || 
      (p.description || '').toLowerCase().includes('novara')
    );
    
    if (novaraStep === 1) {
      novaraItems = novaraItems.filter(p => isPlateProduct(p));
    } else {
      novaraItems = novaraItems.filter(p => isModuleProduct(p));
    }

    if (novaraSearch) {
      const lower = novaraSearch.toLowerCase();
      novaraItems = novaraItems.filter(p => (p.code || '').toLowerCase().includes(lower) || (p.description || '').toLowerCase().includes(lower));
    }
    return novaraItems;
  };

  const categories = ['all', ...Array.from(new Set((products || []).map(p => p.category).filter(Boolean)))];
  const lines = ['all', ...Array.from(new Set((products || []).map(p => p.line).filter(Boolean)))];
  const amperages = ['all', '10A', '20A'];

  const filterInputStyle = "bg-white text-slate-900 border-slate-200 placeholder-slate-400 focus:ring-blue-500 focus:border-blue-500 shadow-sm";

  const toggleNovaraItem = (product: Product, type: 'plate' | 'module') => {
    const setter = type === 'plate' ? setSelectedPlates : setSelectedModules;
    setter(prev => {
      const ex = prev.find(m => m.product.id === product.id);
      if (ex) {
        return prev.map(m => m.product.id === product.id ? {...m, qty: m.qty + 1} : m);
      }
      return [...prev, {product, qty: 1}];
    });
  };

  const removeNovaraItem = (id: string, type: 'plate' | 'module') => {
    const setter = type === 'plate' ? setSelectedPlates : setSelectedModules;
    setter(prev => prev.filter(m => m.product.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Catálogo Dicompel</h2>
            <p className="text-slate-600 text-sm">Qualidade e tecnologia em componentes elétricos.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" size="sm" onClick={() => setShowHelp(true)}>
              <HelpCircle className="h-4 w-4 mr-2" /> Ajuda
            </Button>
            <Button variant="primary" size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 border-none shadow-lg shadow-blue-100" onClick={() => { setShowVisualSearch(true); startCamera(); }}>
              <Camera className="h-4 w-4 mr-2" /> Pesquisa Visual IA
            </Button>
          </div>
        </div>

        <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-full md:w-auto self-start border border-slate-200">
          <button onClick={() => setActiveTab('general')} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'general' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            Catálogo Geral
          </button>
          <button onClick={() => { setActiveTab('novara'); if (selectedPlates.length === 0) setNovaraStep(1); }} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'novara' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            Monte sua Novara
          </button>
        </div>
      </div>

      {activeTab === 'general' && (
        <>
          {aiResult && (
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-xl text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-indigo-900 uppercase">Filtro de IA Ativo</h4>
                  <p className="text-xs text-indigo-700 font-bold">Identificado: {aiResult.description} ({aiResult.color}, {aiResult.line})</p>
                </div>
              </div>
              <button onClick={() => setAiResult(null)} className="text-[10px] font-black uppercase text-indigo-500 hover:text-indigo-800 bg-white px-4 py-2 rounded-lg border border-indigo-100 transition-all">Limpar IA</button>
            </div>
          )}

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute inset-y-0 left-3 h-5 w-5 text-slate-400 my-auto" />
              <input type="text" className={`block w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:outline-none ${filterInputStyle}`} placeholder="Buscar produtos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <select className={`block flex-1 sm:w-44 pl-3 pr-8 py-2 border rounded-lg text-sm focus:outline-none ${filterInputStyle}`} value={selectedLine} onChange={(e) => setSelectedLine(e.target.value)}>
                <option value="all">Linhas</option>
                {lines.filter(l => l !== 'all').map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <select className={`block flex-1 sm:w-44 pl-3 pr-8 py-2 border rounded-lg text-sm focus:outline-none ${filterInputStyle}`} value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                <option value="all">Categorias</option>
                {categories.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className={`block flex-1 sm:w-40 pl-3 pr-8 py-2 border rounded-lg text-sm focus:outline-none ${filterInputStyle}`} value={selectedAmperage} onChange={(e) => setSelectedAmperage(e.target.value)}>
                <option value="all">Amperagem</option>
                {amperages.filter(a => a !== 'all').map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20"><div className="loader"></div></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {filteredProducts.slice(0, visibleCount).map(product => (
                <div key={product.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-100 flex flex-col h-full overflow-hidden group">
                  <div className="relative pt-[100%] bg-slate-50">
                    <img src={product.imageUrl} alt={product.description} className="absolute inset-0 w-full h-full object-contain p-2 group-hover:scale-105 transition-transform" loading="lazy" />
                    
                    {product.amperage && (
                      <div className={`absolute top-2 left-2 px-2 py-0.5 rounded shadow-sm text-[10px] font-black text-white z-10 ${
                        product.amperage === '20A' 
                        ? 'bg-red-600' 
                        : 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-blue-600'
                      }`}>
                        {product.amperage}
                      </div>
                    )}

                    <button 
                      onClick={() => setSelectedProductForInfo(product)}
                      className="absolute top-2 right-2 bg-white/90 hover:bg-blue-600 hover:text-white p-1.5 rounded-full shadow-sm transition-all border border-slate-100 z-10"
                      title="Detalhes Técnicos"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                    <span className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">{product.code}</span>
                  </div>
                  <div className="p-3 md:p-4 flex-grow flex flex-col">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[9px] md:text-[10px] font-bold text-blue-600 uppercase tracking-wider">{product.line}</span>
                    </div>
                    <h3 className="text-xs md:text-sm font-bold text-slate-900 mb-1 line-clamp-2 leading-tight h-8 md:h-10">{product.description}</h3>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase truncate">Ref: {product.reference}</p>
                      <button onClick={() => setSelectedProductForInfo(product)} className="text-[10px] text-blue-500 font-black hover:underline uppercase tracking-tighter">Ver Detalhes</button>
                    </div>
                    <div className="mt-auto pt-2 border-t border-slate-50">
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

      {/* Modal Pesquisa Visual */}
      {showVisualSearch && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 z-[3000]">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-xl w-full overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg">
                  <Camera className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase">IA Vision Dicompel</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Identificação Instantânea de Produtos</p>
                </div>
              </div>
              <button onClick={() => { setShowVisualSearch(false); stopCamera(); }} className="text-slate-300 hover:text-slate-900 transition-colors p-2">
                <X className="h-8 w-8" />
              </button>
            </div>

            <div className="flex-grow p-8 flex flex-col items-center gap-6">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="loader mb-6 border-slate-100 border-t-blue-600"></div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] animate-pulse">Consultando Especialista IA...</h4>
                  <p className="text-xs text-slate-400 mt-2">Analisando texturas, cores e modelosDicompel.</p>
                </div>
              ) : (
                <>
                  <div className="relative w-full aspect-square bg-slate-900 rounded-[2rem] overflow-hidden border-4 border-slate-100 shadow-inner group">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    <div className="absolute inset-0 border-[20px] border-slate-900/40 pointer-events-none"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/50 rounded-3xl pointer-events-none">
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500"></div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500"></div>
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500"></div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500"></div>
                    </div>

                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
                       <button onClick={capturePhoto} className="h-20 w-20 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-blue-500 active:scale-95 transition-all">
                          <div className="h-14 w-14 bg-blue-600 rounded-full flex items-center justify-center text-white">
                             <Sparkles className="h-8 w-8" />
                          </div>
                       </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 w-full">
                    <label className="flex flex-col items-center justify-center gap-2 p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-slate-100 transition-all group">
                       <Upload className="h-6 w-6 text-slate-400 group-hover:text-blue-600" />
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Subir Foto</span>
                       <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    </label>
                    <div className="p-6 bg-blue-50 border-2 border-blue-100 rounded-3xl flex flex-col items-center justify-center text-center gap-2">
                       <AlertCircle className="h-6 w-6 text-blue-400" />
                       <p className="text-[9px] font-bold text-blue-600 leading-tight">Posicione o produto no centro para melhor resultado.</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Outros modais mantidos */}
      {activeTab === 'novara' && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
             <div className="bg-slate-900 text-white p-6 rounded-2xl mb-4 flex flex-col sm:flex-row items-center justify-between shadow-xl gap-4">
                <div>
                   <h3 className="text-lg font-bold">Passo {novaraStep}: {novaraStep === 1 ? 'Escolha suas Placas' : 'Selecione os Módulos'}</h3>
                   <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mt-1">
                      {novaraStep === 1 ? 'Somente placas e suportes' : 'Somente módulos técnicos'}
                   </p>
                </div>
                <div className="flex items-center gap-3">
                   <button 
                    onClick={() => setNovaraStep(1)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-all ${novaraStep === 1 ? 'bg-blue-600 text-white ring-4 ring-blue-900/50' : 'bg-slate-800 text-slate-500'}`}
                   >
                     1
                   </button>
                   <div className="w-6 h-0.5 bg-slate-800"></div>
                   <button 
                    disabled={selectedPlates.length === 0}
                    onClick={() => setNovaraStep(2)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-all ${novaraStep === 2 ? 'bg-blue-600 text-white ring-4 ring-blue-900/50' : 'bg-slate-800 text-slate-500'} ${selectedPlates.length === 0 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                   >
                     2
                   </button>
                </div>
             </div>

             <div className="bg-white p-3 rounded-xl border border-slate-200 mb-4 flex gap-2">
                <Search className="h-5 w-5 text-slate-400 my-auto ml-2"/>
                <input type="text" className="w-full px-2 py-2 text-sm focus:outline-none text-slate-900" placeholder={`Pesquisar ${novaraStep === 1 ? 'placas' : 'módulos'}...`} value={novaraSearch} onChange={(e) => setNovaraSearch(e.target.value)} />
             </div>

             <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
               {getNovaraProducts().map(product => {
                 const isPlate = isPlateProduct(product);
                 const isInKit = (isPlate ? selectedPlates : selectedModules).find(m => m.product.id === product.id);
                 
                 return (
                   <div key={product.id} className={`bg-white border rounded-xl overflow-hidden hover:border-blue-500 transition-all ${isInKit ? 'ring-2 ring-blue-600 shadow-lg' : 'shadow-sm'} flex flex-col`}>
                     <div className="relative pt-[100%] bg-slate-50">
                        <img src={product.imageUrl} className="absolute inset-0 w-full h-full object-contain p-3" alt="" />
                        
                        {product.amperage && (
                          <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded shadow-sm text-[8px] font-black text-white z-10 ${
                            product.amperage === '20A' 
                            ? 'bg-red-600' 
                            : 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-blue-600'
                          }`}>
                            {product.amperage}
                          </div>
                        )}

                        <button onClick={() => setSelectedProductForInfo(product)} className="absolute bottom-2 right-2 bg-white/80 p-1.5 rounded-lg border shadow-sm hover:bg-white z-10"><Info className="h-4 w-4 text-slate-500"/></button>
                        <span className="absolute top-2 right-2 bg-slate-900/90 text-white text-[9px] px-2 py-0.5 rounded font-black uppercase z-10">{product.code}</span>
                     </div>
                     <div className="p-3 flex-grow flex flex-col">
                        <h4 className="font-bold text-[11px] text-slate-800 line-clamp-2 min-h-[32px] mb-3 leading-tight">{product.description}</h4>
                        <div className="mt-auto">
                           <Button size="sm" className="w-full text-[10px] font-black" onClick={() => toggleNovaraItem(product, isPlate ? 'plate' : 'module')}>
                              {isInKit ? `+ ADICIONAR (X${isInKit.qty + 1})` : '+ ADICIONAR AO KIT'}
                           </Button>
                        </div>
                     </div>
                   </div>
                 );
               })}
             </div>

             {novaraStep === 1 && selectedPlates.length > 0 && (
                <div className="mt-8 flex justify-center">
                   <Button size="lg" className="px-10 h-14 font-black uppercase tracking-widest gap-2 shadow-2xl shadow-blue-100" onClick={() => setNovaraStep(2)}>
                      PRÓXIMO PASSO: ESCOLHER MÓDULOS <ArrowRight className="h-5 w-5"/>
                   </Button>
                </div>
             )}
          </div>

          <div className="w-full lg:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col h-fit sticky top-24 overflow-hidden">
             <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <Layers className="h-5 w-5 text-blue-500"/>
                   <h3 className="font-bold text-sm uppercase tracking-widest">Resumo do Kit</h3>
                </div>
                {(selectedPlates.length > 0 || selectedModules.length > 0) && <button onClick={() => { setSelectedPlates([]); setSelectedModules([]); setNovaraStep(1); }} className="text-[10px] text-blue-400 hover:text-white underline font-black">REINICIAR</button>}
             </div>
             <div className="p-6 space-y-6">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">PLACAS / SUPORTES ({selectedPlates.reduce((a,b) => a+b.qty, 0)})</p>
                   <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                      {selectedPlates.length > 0 ? selectedPlates.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-100 shadow-sm group">
                           <div className="flex items-center gap-3 min-w-0">
                              <span className="bg-blue-600 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-lg">{item.qty}</span>
                              <div className="truncate">
                                 <p className="text-[10px] font-bold text-slate-700 truncate">{item.product.description}</p>
                                 <p className="text-[8px] font-black text-slate-400">{item.product.code}</p>
                              </div>
                           </div>
                           <button onClick={() => removeNovaraItem(item.product.id, 'plate')} className="text-slate-300 hover:text-red-500 transition-colors p-1"><X className="h-3 w-3"/></button>
                        </div>
                      )) : (
                        <p className="text-xs text-slate-400 italic bg-slate-50 p-5 rounded-xl text-center border border-dashed border-slate-200">Escolha as placas no Passo 1</p>
                      )}
                   </div>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">MÓDULOS ({selectedModules.reduce((a,b) => a+b.qty, 0)})</p>
                   <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                      {selectedModules.length > 0 ? selectedModules.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-100 shadow-sm group">
                           <div className="flex items-center gap-3 min-w-0">
                              <span className="bg-slate-900 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-lg">{item.qty}</span>
                              <div className="truncate">
                                 <p className="text-[10px] font-bold text-slate-700 truncate">{item.product.description}</p>
                                 <p className="text-[8px] font-black text-slate-400">{item.product.code}</p>
                              </div>
                           </div>
                           <button onClick={() => removeNovaraItem(item.product.id, 'module')} className="text-slate-300 hover:text-red-500 transition-colors p-1"><X className="h-3 w-3"/></button>
                        </div>
                      )) : (
                        <p className="text-center py-6 text-[11px] text-slate-400 border border-dashed rounded-xl bg-slate-50">Selecione os módulos no Passo 2</p>
                      )}
                   </div>
                </div>
             </div>
             <div className="p-6 bg-slate-50 border-t border-slate-200">
                <Button 
                  className="w-full h-12 text-xs font-black uppercase tracking-widest" 
                  disabled={selectedPlates.length === 0} 
                  onClick={() => {
                     selectedPlates.forEach(m => { for(let i=0; i<m.qty; i++) addToCart(m.product); });
                     selectedModules.forEach(m => { for(let i=0; i<m.qty; i++) addToCart(m.product); });
                     alert("Conjunto Novara adicionado ao carrinho!");
                     setSelectedPlates([]); setSelectedModules([]); setNovaraStep(1); setActiveTab('general');
                  }}
                >
                  ADICIONAR KIT AO CARRINHO
                </Button>
             </div>
          </div>
        </div>
      )}

      {selectedProductForInfo && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 z-[2000]">
           <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-300 border border-white/20">
              <div className="relative h-56 bg-slate-50 flex items-center justify-center p-8 border-b border-slate-100">
                 <button onClick={() => setSelectedProductForInfo(null)} className="absolute top-6 right-6 bg-white/90 hover:bg-white p-2.5 rounded-2xl shadow-md text-slate-400 hover:text-slate-900 transition-all">
                    <X className="h-6 w-6"/>
                 </button>
                 <img src={selectedProductForInfo.imageUrl} className="h-full object-contain drop-shadow-lg" alt=""/>
              </div>
              <div className="p-10">
                 <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-3 py-1 rounded-full uppercase tracking-widest">{selectedProductForInfo.line}</span>
                    <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase tracking-widest">{selectedProductForInfo.category}</span>
                    {selectedProductForInfo.amperage && (
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest text-white ${
                        selectedProductForInfo.amperage === '20A' 
                        ? 'bg-red-600' 
                        : 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-blue-600'
                      }`}>
                        {selectedProductForInfo.amperage}
                      </span>
                    )}
                 </div>
                 <h3 className="text-2xl font-black text-slate-900 leading-tight mb-6">{selectedProductForInfo.description}</h3>
                 
                 <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">CÓDIGO INTERNO</p>
                       <p className="text-sm font-bold text-slate-800">{selectedProductForInfo.code}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">REFERÊNCIA</p>
                       <p className="text-sm font-bold text-slate-800">{selectedProductForInfo.reference}</p>
                    </div>
                 </div>

                 <div className="mb-8">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-blue-500"/> Especificações Técnicas</p>
                    {selectedProductForInfo.details ? (
                      <div className="text-sm text-slate-600 bg-slate-50 p-5 rounded-2xl border border-slate-100 leading-relaxed whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                        {selectedProductForInfo.details}
                      </div>
                    ) : (
                       <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl text-center">Nenhuma especificação técnica detalhada disponível para este item.</p>
                    )}
                 </div>

                 <Button className="w-full h-16 font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100" onClick={() => { handleAddToCart(selectedProductForInfo); setSelectedProductForInfo(null); }}>
                    ADICIONAR AO CARRINHO
                 </Button>
              </div>
           </div>
        </div>
      )}

      {showHelp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1000]">
           <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
              <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                 <div>
                    <h3 className="text-xl font-bold">Fluxo de Pedido</h3>
                    <p className="text-xs text-blue-400 font-bold uppercase tracking-widest mt-1">Siga os passos corretamente</p>
                 </div>
                 <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-white transition-colors">
                    <X className="h-8 w-8"/>
                 </button>
              </div>
              <div className="p-10 space-y-10">
                 <div className="flex gap-5">
                    <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black flex-shrink-0 shadow-lg shadow-blue-100">1</div>
                    <div>
                       <h4 className="font-bold text-slate-900 uppercase text-sm tracking-widest">Seleção de Itens</h4>
                       <p className="text-sm text-slate-500 mt-1">Explore o catálogo ou use o montador para criar conjuntos personalizados.</p>
                    </div>
                 </div>
                 <div className="flex gap-5">
                    <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black flex-shrink-0 shadow-lg shadow-blue-100">2</div>
                    <div>
                       <h4 className="font-bold text-slate-900 uppercase text-sm tracking-widest">Revisão no Carrinho</h4>
                       <p className="text-sm text-slate-500 mt-1">Confira quantidades e produtos antes de prosseguir.</p>
                    </div>
                 </div>
                 <div className="flex gap-5">
                    <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black flex-shrink-0 shadow-lg shadow-blue-100">3</div>
                    <div>
                       <h4 className="font-bold text-slate-900 uppercase text-sm tracking-widest">Envio ao Representante</h4>
                       <p className="text-sm text-slate-500 mt-1">Identifique-se e escolha o representante que irá faturar o seu pedido.</p>
                    </div>
                 </div>
                 <div className="flex gap-5">
                    <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black flex-shrink-0 shadow-lg shadow-blue-100">4</div>
                    <div>
                       <h4 className="font-bold text-slate-900 uppercase text-sm tracking-widest">Finalização Comercial</h4>
                       <p className="text-sm text-slate-500 mt-1">O representante entrará em contato para negociar condições de pagamento e entrega.</p>
                    </div>
                 </div>
                 <Button className="w-full h-16 text-sm font-black uppercase tracking-widest mt-4 shadow-xl" onClick={() => setShowHelp(false)}>ENTENDI, VAMOS LÁ!</Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
