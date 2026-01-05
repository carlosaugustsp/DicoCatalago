
import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { productService } from '../services/api';
import { Search, Info, Check, Plus, Layers, HelpCircle, Camera, Upload, Sparkles, AlertCircle, X, ArrowRight, ShoppingCart, Settings2, BookOpen, Key, Globe, MousePointer2, ExternalLink, RefreshCcw, ShieldCheck, Package, Image as ImageIcon, Filter, ChevronDown } from 'lucide-react';
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

interface AISearchResult {
  capturedImage: string;
  product: Product | null;
  aiData: AIResult;
}

export const Catalog: React.FC<CatalogProps> = ({ addToCart }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'novara'>('general');
  const [visibleCount, setVisibleCount] = useState(24);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Estados da Busca Visual IA
  const [showVisualSearch, setShowVisualSearch] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [aiSearchResult, setAiSearchResult] = useState<AISearchResult | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedProductForInfo, setSelectedProductForInfo] = useState<Product | null>(null);

  // Estados de Filtro
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLine, setSelectedLine] = useState<string>('all');
  
  const [novaraSearch, setNovaraSearch] = useState('');
  const [novaraStep, setNovaraStep] = useState<1 | 2>(1);
  const [selectedPlates, setSelectedPlates] = useState<{product: Product, qty: number}[]>([]);
  const [selectedModules, setSelectedModules] = useState<{product: Product, qty: number}[]>([]);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (showVisualSearch) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [showVisualSearch]);

  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(console.error);
      };
    }
  }, [cameraStream]);

  useEffect(() => {
    if (activeTab === 'general') filterProducts();
  }, [searchTerm, selectedCategory, selectedLine, products, activeTab]);

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
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1080 } } 
      });
      setCameraStream(stream);
    } catch (err: any) {
      setCameraError("Acesso à câmera negado. Por favor, permita o acesso para usar a Pesquisa Visual.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const resizeImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 800;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    });
  };

  const analyzeImage = async (base64Data: string) => {
    setIsAnalyzing(true);
    try {
      const optimizedImage = await resizeImage(base64Data);
      const rawBase64 = optimizedImage.split(',')[1];

      // Inicialização da IA com a chave de ambiente
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{
          parts: [
            { text: "Você é um especialista em componentes elétricos da Dicompel. Identifique este produto e retorne um JSON com: type (tipo: tomada, interruptor, etc), color (cor aproximada), amperage (se visível: 10A ou 20A), line (qual linha Dicompel: Novara, Classic, etc) e description (descrição técnica simplificada)." },
            { inlineData: { mimeType: 'image/jpeg', data: rawBase64 } }
          ]
        }],
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

      const parsed: AIResult = JSON.parse(response.text || "{}");
      
      // Lógica de Matching Aprimorada para Produção
      const keywords = `${parsed.description} ${parsed.type} ${parsed.line} ${parsed.amperage}`
        .toLowerCase()
        .split(' ')
        .filter(k => k.length > 2);

      const match = products.map(p => {
        const pStr = `${p.description} ${p.code} ${p.line} ${p.category} ${p.amperage}`.toLowerCase();
        let score = 0;
        keywords.forEach(k => { if (pStr.includes(k)) score++; });
        return { product: p, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.product || null;

      setAiSearchResult({
        capturedImage: optimizedImage,
        product: match,
        aiData: parsed
      });
      
      setShowVisualSearch(false);
      stopCamera();
    } catch (err) {
      console.error("Erro na análise IA:", err);
      alert("Erro ao identificar produto. Tente uma foto mais nítida.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        analyzeImage(canvasRef.current.toDataURL('image/jpeg', 0.9));
      }
    }
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    setAddedIds(prev => [...prev, product.id]);
    setTimeout(() => setAddedIds(prev => prev.filter(id => id !== product.id)), 1500);
  };

  // Extração de Categorias e Linhas Únicas para os Filtros
  const categories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
  const lines = Array.from(new Set(products.map(p => p.line))).filter(Boolean);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Catálogo Dicompel</h2>
            <p className="text-slate-600 text-sm">Design, Inovação e Inteligência Artificial.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="primary" size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 border-none shadow-lg shadow-blue-100" onClick={() => setShowVisualSearch(true)}>
              <Camera className="h-4 w-4 mr-2" /> Pesquisa Visual IA
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
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-6">
            <div className="relative flex-grow">
              <Search className="absolute inset-y-0 left-3 h-5 w-5 text-slate-400 my-auto" />
              <input type="text" className="block w-full pl-10 pr-3 py-3 border rounded-xl text-sm focus:outline-none bg-slate-50 border-slate-200" placeholder="Código, Nome ou Referência..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="relative">
                  <Filter className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold appearance-none focus:ring-2 focus:ring-blue-500">
                     <option value="all">Todas as Categorias</option>
                     {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
               </div>
               <div className="relative">
                  <Layers className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <select value={selectedLine} onChange={(e) => setSelectedLine(e.target.value)} className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold appearance-none focus:ring-2 focus:ring-blue-500">
                     <option value="all">Todas as Linhas</option>
                     {lines.map(line => <option key={line} value={line}>{line}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
               </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20"><div className="loader"></div></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.slice(0, visibleCount).map(product => (
                <div key={product.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-100 flex flex-col h-full overflow-hidden group">
                  <div className="relative pt-[100%] bg-slate-50 flex items-center justify-center">
                    <img src={product.imageUrl} alt={product.description} className="absolute inset-0 w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500" />
                    
                    {/* Botão de Info com texto agora mais visível */}
                    <button onClick={() => setSelectedProductForInfo(product)} className="absolute top-3 right-3 bg-white/95 p-2 rounded-full shadow-lg hover:bg-blue-600 hover:text-white transition-all transform active:scale-90"><Info className="h-5 w-5" /></button>
                    
                    {/* Etiqueta de Código */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1">
                      <span className="bg-slate-900/90 text-white text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-widest shadow-sm">{product.code}</span>
                      {product.amperage && (
                        <span className="bg-blue-600 text-white text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-widest shadow-sm">{product.amperage}</span>
                      )}
                    </div>
                  </div>
                  <div className="p-5 flex-grow flex flex-col">
                    <span className="text-[10px] font-black text-blue-600 uppercase mb-2 tracking-widest">{product.line}</span>
                    <h3 className="text-xs font-bold text-slate-800 mb-4 line-clamp-2 leading-relaxed min-h-[2.5rem]">{product.description}</h3>
                    
                    <div className="mt-auto space-y-2">
                      <Button variant="outline" size="sm" className="w-full text-[10px] font-black uppercase tracking-widest border-slate-200 group-hover:bg-slate-50" onClick={() => setSelectedProductForInfo(product)}>
                         <Info className="h-3.5 w-3.5 mr-2"/> Detalhes
                      </Button>
                      <Button variant={addedIds.includes(product.id) ? "secondary" : "primary"} className="w-full text-[10px] h-10 font-black uppercase" onClick={() => handleAddToCart(product)} disabled={addedIds.includes(product.id)}>
                        {addedIds.includes(product.id) ? <Check className="h-4 w-4 mr-2"/> : <Plus className="h-4 w-4 mr-2"/>}
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

      {/* MODAL PESQUISA VISUAL IA */}
      {showVisualSearch && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 z-[3000]">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-xl w-full overflow-hidden flex flex-col relative animate-in zoom-in-95">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50">
               <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">IA Vision Dicompel</h3>
               <button onClick={() => setShowVisualSearch(false)} className="text-slate-300 hover:text-slate-900 transition-colors"><X className="h-8 w-8" /></button>
            </div>
            <div className="p-8 flex flex-col items-center gap-6 min-h-[450px]">
              {isAnalyzing ? (
                <div className="text-center py-20 flex flex-col items-center">
                   <div className="loader mb-6 border-blue-500"></div>
                   <p className="font-black text-slate-600 animate-pulse uppercase tracking-[0.2em]">Escaneando Produto...</p>
                </div>
              ) : (
                <>
                  <div className="relative w-full aspect-square bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-slate-800">
                    {cameraError ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-red-400 p-10 text-center">
                         <AlertCircle className="h-12 w-12 mb-4" />
                         <p className="text-[10px] font-black uppercase">{cameraError}</p>
                         <Button size="sm" variant="outline" className="mt-6 border-red-500/50" onClick={startCamera}>Tentar Novamente</Button>
                      </div>
                    ) : (
                      <>
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        <canvas ref={canvasRef} className="hidden" />
                        {cameraStream && (
                          <button onClick={capturePhoto} className="absolute bottom-8 left-1/2 -translate-x-1/2 h-20 w-20 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-blue-500 active:scale-90 transition-all">
                            <Sparkles className="h-8 w-8 text-blue-600" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  <div className="w-full grid grid-cols-2 gap-4">
                    <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[1.5rem] hover:bg-blue-50 hover:border-blue-200 transition-all group">
                       <ImageIcon className="h-8 w-8 text-slate-400 group-hover:text-blue-500" />
                       <span className="text-[10px] font-black uppercase text-slate-500 group-hover:text-blue-600">Abrir Galeria</span>
                       <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                             const reader = new FileReader();
                             reader.onloadend = () => analyzeImage(reader.result as string);
                             reader.readAsDataURL(file);
                          }
                       }} />
                    </button>
                    <button onClick={startCamera} className="flex flex-col items-center justify-center gap-3 p-6 bg-blue-600 text-white rounded-[1.5rem] hover:bg-blue-700 transition-all shadow-lg">
                       <Camera className="h-8 w-8" />
                       <span className="text-[10px] font-black uppercase">Ativar Câmera</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* POPUP DE RESULTADO IA (FOTO CAPTURADA + PRODUTO ENCONTRADO) */}
      {aiSearchResult && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 z-[4000]">
           <div className="bg-white rounded-[3rem] shadow-2xl max-w-4xl w-full overflow-hidden animate-in zoom-in-95 duration-500">
              <div className="flex flex-col md:flex-row">
                 {/* Lado da Foto Capturada */}
                 <div className="md:w-1/2 bg-slate-100 p-8 flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-200">
                    <div className="relative w-full aspect-square rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white">
                       <img src={aiSearchResult.capturedImage} className="w-full h-full object-cover" alt="Captura" />
                       <div className="absolute bottom-4 left-4 bg-blue-600 text-white text-[9px] font-black uppercase px-3 py-1 rounded-full">Sua Captura</div>
                    </div>
                 </div>

                 {/* Lado da Identificação */}
                 <div className="md:w-1/2 p-12 flex flex-col justify-between">
                    <div>
                       <div className="flex justify-between items-start mb-8">
                          <div>
                             <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2">IA Vision Match</h4>
                             <h3 className="text-2xl font-black text-slate-900 leading-tight">
                                {aiSearchResult.product ? aiSearchResult.product.description : aiSearchResult.aiData.description}
                             </h3>
                          </div>
                          <button onClick={() => setAiSearchResult(null)} className="text-slate-300 hover:text-slate-900 transition-colors"><X className="h-8 w-8"/></button>
                       </div>

                       <div className="grid grid-cols-2 gap-4 mb-8">
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <span className="text-[9px] font-black text-slate-400 uppercase">Linha Sugerida</span>
                             <p className="text-xs font-bold text-slate-800 uppercase mt-1">{aiSearchResult.product?.line || aiSearchResult.aiData.line}</p>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <span className="text-[9px] font-black text-slate-400 uppercase">Amperagem</span>
                             <p className="text-xs font-bold text-slate-800 uppercase mt-1">{aiSearchResult.product?.amperage || aiSearchResult.aiData.amperage || 'N/A'}</p>
                          </div>
                       </div>

                       {aiSearchResult.product ? (
                          <div className="bg-green-50 p-5 rounded-2xl border border-green-100 flex items-start gap-4 mb-10">
                             <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />
                             <div>
                                <p className="text-[10px] text-green-700 font-black uppercase">Produto Encontrado</p>
                                <p className="text-xs text-green-600/80 font-medium">Este item corresponde ao catálogo Dicompel e pode ser adicionado agora.</p>
                             </div>
                          </div>
                       ) : (
                          <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 flex items-start gap-4 mb-10">
                             <AlertCircle className="h-6 w-6 text-orange-600 shrink-0" />
                             <div>
                                <p className="text-[10px] text-orange-700 font-black uppercase">Sugestão Dicompel</p>
                                <p className="text-xs text-orange-600/80 font-medium">Identificamos as características, mas o código exato não foi mapeado automaticamente.</p>
                             </div>
                          </div>
                       )}
                    </div>

                    <div className="flex flex-col gap-3">
                       {aiSearchResult.product && (
                          <Button size="lg" className="w-full h-16 font-black uppercase shadow-xl shadow-blue-100 tracking-widest" onClick={() => { handleAddToCart(aiSearchResult.product!); setAiSearchResult(null); }}>
                             ADICIONAR AO CARRINHO
                          </Button>
                       )}
                       <Button variant="outline" className="w-full h-14 font-black uppercase text-[10px] border-slate-200" onClick={() => setAiSearchResult(null)}>
                          FECHAR E BUSCAR NOVAMENTE
                       </Button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL DETALHES DO PRODUTO (INFORMAÇÃO) */}
      {selectedProductForInfo && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[2000]">
           <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-xl w-full overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="relative h-72 bg-slate-50 flex items-center justify-center p-12 border-b">
                 <button onClick={() => setSelectedProductForInfo(null)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-900 bg-white p-2 rounded-full shadow-sm transition-all"><X className="h-6 w-6"/></button>
                 <img src={selectedProductForInfo.imageUrl} className="h-full object-contain" alt=""/>
              </div>
              <div className="p-10">
                 <div className="flex justify-between items-start mb-6">
                    <div>
                       <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2 block">{selectedProductForInfo.line}</span>
                       <h3 className="text-2xl font-black text-slate-900">{selectedProductForInfo.description}</h3>
                    </div>
                    {selectedProductForInfo.amperage && (
                       <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase">{selectedProductForInfo.amperage}</span>
                    )}
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4 mb-8 text-[11px] font-bold uppercase tracking-wider">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                       <span className="text-slate-400 block mb-1">CÓDIGO:</span>
                       <span className="text-slate-900">{selectedProductForInfo.code}</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                       <span className="text-slate-400 block mb-1">REFERÊNCIA:</span>
                       <span className="text-slate-900">{selectedProductForInfo.reference}</span>
                    </div>
                 </div>

                 {selectedProductForInfo.details && (
                    <div className="mb-8 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Descrição Técnica:</p>
                       <p className="text-sm text-slate-600 leading-relaxed">{selectedProductForInfo.details}</p>
                    </div>
                 )}

                 <Button className="w-full h-16 font-black uppercase tracking-widest shadow-xl shadow-blue-100" onClick={() => { handleAddToCart(selectedProductForInfo); setSelectedProductForInfo(null); }}>
                    ADICIONAR AO CARRINHO
                 </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const CheckCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
