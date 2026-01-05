
import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { productService } from '../services/api';
import { Search, Info, Check, Plus, Layers, HelpCircle, Camera, Upload, Sparkles, AlertCircle, X, ArrowRight, ShoppingCart, Settings2, BookOpen, Key, Globe, MousePointer2, ExternalLink, RefreshCcw, ShieldCheck, Package, Image as ImageIcon } from 'lucide-react';
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

  // Estados da Busca Visual
  const [showVisualSearch, setShowVisualSearch] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [aiSearchResult, setAiSearchResult] = useState<AISearchResult | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showHelp, setShowHelp] = useState(false);
  const [selectedProductForInfo, setSelectedProductForInfo] = useState<Product | null>(null);

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

  // Monitora abertura do modal para ligar a câmera
  useEffect(() => {
    if (showVisualSearch) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [showVisualSearch]);

  // Vincula o stream ao elemento de vídeo assim que ele estiver disponível
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(e => console.error("Erro autoplay:", e));
    }
  }, [cameraStream, showVisualSearch]);

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
      const constraints = { 
        video: { 
          facingMode: 'environment', 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        } 
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
    } catch (err: any) {
      console.error("Erro ao acessar câmera:", err);
      setCameraError("Acesso à câmera negado ou não suportado por este navegador.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const resizeImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
        }
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
    });
  };

  const analyzeImage = async (base64Data: string) => {
    setIsAnalyzing(true);
    try {
      const optimizedImage = await resizeImage(base64Data);
      const rawBase64 = optimizedImage.split(',')[1];
      if (!rawBase64) throw new Error("Erro na imagem.");

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{
          parts: [
            { text: "Você é um técnico Dicompel. Identifique este componente. Retorne JSON: type, color, amperage, line, description." },
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
      
      const match = products.find(p => {
        const desc = p.description.toLowerCase();
        const code = p.code.toLowerCase();
        const term = (parsed.description || parsed.type || "").toLowerCase();
        return term && (desc.includes(term) || code.includes(term));
      });

      setAiSearchResult({
        capturedImage: optimizedImage,
        product: match || null,
        aiData: parsed
      });
      
      setShowVisualSearch(false);
      stopCamera();
    } catch (err) {
      console.error("Erro IA:", err);
      alert("Falha na análise. Tente novamente com mais luz.");
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
        analyzeImage(canvasRef.current.toDataURL('image/jpeg', 0.9));
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => analyzeImage(reader.result as string);
      reader.readAsDataURL(file);
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
            <p className="text-slate-600 text-sm">IA Vision e Tecnologia Elétrica.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="primary" size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 border-none shadow-lg shadow-blue-100" onClick={() => setShowVisualSearch(true)}>
              <Camera className="h-4 w-4 mr-2" /> Pesquisa Visual IA
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowHelp(true)}>
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
              <input type="text" className="block w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:outline-none bg-white border-slate-200" placeholder="Buscar produtos por código, nome ou referência..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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

      {/* MODAL PESQUISA VISUAL IA */}
      {showVisualSearch && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 z-[3000] no-print">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-xl w-full overflow-hidden flex flex-col relative animate-in zoom-in-95">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-900 uppercase">IA Vision Dicompel</h3>
              <button onClick={() => setShowVisualSearch(false)} className="text-slate-300 hover:text-slate-900"><X className="h-8 w-8" /></button>
            </div>
            
            <div className="p-8 flex flex-col items-center gap-6 min-h-[400px]">
              {isAnalyzing ? (
                <div className="text-center py-20 flex flex-col items-center">
                   <div className="loader mb-6 border-blue-500"></div>
                   <p className="font-black text-slate-600 animate-pulse uppercase tracking-widest">Identificando Componente...</p>
                </div>
              ) : (
                <>
                  <div className="relative w-full aspect-square bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-slate-800">
                    {cameraError ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-red-400 p-10 text-center">
                         <AlertCircle className="h-12 w-12 mb-4" />
                         <p className="text-xs font-bold uppercase">{cameraError}</p>
                         <Button size="sm" variant="outline" className="mt-4" onClick={startCamera}>Tentar Novamente</Button>
                      </div>
                    ) : (
                      <>
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          muted 
                          className="w-full h-full object-cover"
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        
                        {cameraStream && (
                          <button 
                            onClick={capturePhoto} 
                            className="absolute bottom-8 left-1/2 -translate-x-1/2 h-20 w-20 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-blue-500 active:scale-95 transition-all z-10"
                          >
                            <Sparkles className="h-8 w-8 text-blue-600" />
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="w-full grid grid-cols-2 gap-4">
                    <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[1.5rem] hover:bg-blue-50 transition-all group">
                       <ImageIcon className="h-8 w-8 text-slate-400 group-hover:text-blue-500" />
                       <span className="text-[10px] font-black uppercase text-slate-500 group-hover:text-blue-600">Galeria</span>
                       <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    </button>
                    
                    <button onClick={startCamera} className="flex flex-col items-center justify-center gap-3 p-6 bg-blue-600 text-white rounded-[1.5rem] hover:bg-blue-700 transition-all shadow-lg">
                       <Camera className="h-8 w-8" />
                       <span className="text-[10px] font-black uppercase">Ativar Câmera</span>
                    </button>
                  </div>
                </>
              )}
            </div>
            
            <div className="p-4 bg-slate-50 text-center border-t">
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Powered by Gemini AI - Production Mode</p>
            </div>
          </div>
        </div>
      )}

      {/* POPUP RESULTADO IA (FOTO + INFO) */}
      {aiSearchResult && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[4000] no-print">
           <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-4xl w-full overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="flex flex-col md:flex-row">
                 {/* Lado da Foto Capturada */}
                 <div className="md:w-1/2 bg-slate-100 flex items-center justify-center p-6 border-b md:border-b-0 md:border-r">
                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-lg border-4 border-white">
                       <img src={aiSearchResult.capturedImage} className="w-full h-full object-cover" alt="Captura IA" />
                       <div className="absolute top-4 left-4 bg-blue-600 text-white text-[9px] font-black uppercase px-2 py-1 rounded shadow">Sua Foto</div>
                    </div>
                 </div>

                 {/* Lado das Informações */}
                 <div className="md:w-1/2 p-10 flex flex-col justify-between">
                    <div>
                       <div className="flex justify-between items-start mb-6">
                          <div>
                             <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Identificado pela IA</h4>
                             <h3 className="text-2xl font-black text-slate-900 leading-tight mt-1">{aiSearchResult.product ? aiSearchResult.product.description : aiSearchResult.aiData.description}</h3>
                          </div>
                          <button onClick={() => setAiSearchResult(null)} className="text-slate-300 hover:text-slate-900 transition-colors"><X className="h-8 w-8"/></button>
                       </div>

                       <div className="space-y-4 mb-8">
                          <div className="flex justify-between border-b border-slate-100 pb-2">
                             <span className="text-[10px] font-black text-slate-400 uppercase">Linha:</span>
                             <span className="text-xs font-bold text-slate-900 uppercase">{aiSearchResult.product?.line || aiSearchResult.aiData.line || 'Dicompel'}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-2">
                             <span className="text-[10px] font-black text-slate-400 uppercase">Tipo:</span>
                             <span className="text-xs font-bold text-slate-900 uppercase">{aiSearchResult.product?.category || aiSearchResult.aiData.type || 'Componente'}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-2">
                             <span className="text-[10px] font-black text-slate-400 uppercase">Cor Sugerida:</span>
                             <span className="text-xs font-bold text-slate-900 uppercase">{aiSearchResult.aiData.color || 'Ver Foto'}</span>
                          </div>
                       </div>

                       {aiSearchResult.product ? (
                          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                             <p className="text-[10px] text-blue-700 font-black uppercase mb-1 flex items-center"><Check className="h-3 w-3 mr-1"/> Item Correspondente Encontrado</p>
                             <p className="text-xs text-blue-600 font-medium">Este item existe no catálogo e pode ser adicionado diretamente.</p>
                          </div>
                       ) : (
                          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-6">
                             <p className="text-[10px] text-orange-700 font-black uppercase mb-1 flex items-center"><AlertCircle className="h-3 w-3 mr-1"/> Item Não Mapeado</p>
                             <p className="text-xs text-orange-600 font-medium">A IA identificou as características, mas não encontramos o código exato no estoque local.</p>
                          </div>
                       )}
                    </div>

                    <div className="flex flex-col gap-3">
                       {aiSearchResult.product && (
                          <Button size="lg" className="w-full h-16 font-black uppercase tracking-widest shadow-xl shadow-blue-100" onClick={() => { handleAddToCart(aiSearchResult.product!); setAiSearchResult(null); }}>
                             ADICIONAR AO CARRINHO
                          </Button>
                       )}
                       <Button variant="outline" className="w-full h-14 font-black uppercase text-[10px] border-slate-200" onClick={() => setAiSearchResult(null)}>
                          FECHAR E CONTINUAR BUSCANDO
                       </Button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {selectedProductForInfo && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[2000] no-print">
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
