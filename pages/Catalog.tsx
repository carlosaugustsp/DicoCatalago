
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

  // Estados da Busca Visual IA
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

  // Lógica de ativação de câmera
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
      setCameraError("Câmera bloqueada. Permita o acesso nas configurações do seu navegador.");
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

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{
          parts: [
            { text: "Você é um catálogo inteligente da Dicompel. Analise este componente elétrico e retorne um JSON com: type (ex: tomada, interruptor), color (cor predominante), amperage (se houver), line (qual linha Dicompel parece ser) e description (descrição curta técnica)." },
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
      
      // LÓGICA DE BUSCA INTELIGENTE (Matching com Banco Supabase)
      const searchKeywords = `${parsed.description} ${parsed.type} ${parsed.line}`
        .toLowerCase()
        .split(' ')
        .filter(word => word.length > 2);

      const match = products.map(p => {
        const prodString = `${p.description} ${p.code} ${p.line} ${p.category}`.toLowerCase();
        let score = 0;
        searchKeywords.forEach(word => { if (prodString.includes(word)) score++; });
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
      console.error("Erro IA:", err);
      alert("Não foi possível analisar esta imagem. Tente focar melhor no produto.");
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

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Catálogo Dicompel</h2>
            <p className="text-slate-600 text-sm">Pesquisa Inteligente e IA Vision.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="primary" size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 border-none shadow-lg" onClick={() => setShowVisualSearch(true)}>
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
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute inset-y-0 left-3 h-5 w-5 text-slate-400 my-auto" />
              <input type="text" className="block w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:outline-none bg-white border-slate-200" placeholder="Buscar produtos por código ou nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20"><div className="loader"></div></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.slice(0, visibleCount).map(product => (
                <div key={product.id} className="bg-white rounded-xl shadow-sm border flex flex-col h-full overflow-hidden group hover:shadow-md transition-all">
                  <div className="relative pt-[100%] bg-slate-50">
                    <img src={product.imageUrl} alt={product.description} className="absolute inset-0 w-full h-full object-contain p-2" />
                    <button onClick={() => setSelectedProductForInfo(product)} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-sm hover:bg-blue-600 hover:text-white transition-all"><Info className="h-4 w-4" /></button>
                  </div>
                  <div className="p-4 flex-grow flex flex-col">
                    <span className="text-[10px] font-bold text-blue-600 uppercase mb-1">{product.line}</span>
                    <h3 className="text-xs font-bold text-slate-900 mb-2 line-clamp-2">{product.description}</h3>
                    <div className="mt-auto pt-2 border-t">
                      <Button variant={addedIds.includes(product.id) ? "secondary" : "primary"} className="w-full text-[10px] h-9" onClick={() => handleAddToCart(product)} disabled={addedIds.includes(product.id)}>
                        {addedIds.includes(product.id) ? <Check className="h-3.5 w-3.5 mr-1.5"/> : <Plus className="h-3.5 w-3.5 mr-1.5"/>}
                        {addedIds.includes(product.id) ? "No Carrinho" : "Adicionar"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* MODAL PESQUISA VISUAL IA */}
      {showVisualSearch && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 z-[3000]">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-xl w-full overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-black text-slate-900 uppercase">Busca por Imagem (IA)</h3>
              <button onClick={() => setShowVisualSearch(false)} className="text-slate-300 hover:text-slate-900"><X className="h-8 w-8" /></button>
            </div>
            <div className="p-8 flex flex-col items-center gap-6 min-h-[450px]">
              {isAnalyzing ? (
                <div className="text-center py-20">
                   <div className="loader mb-6 border-blue-500"></div>
                   <p className="font-black text-slate-600 animate-pulse uppercase">Analisando Componente...</p>
                </div>
              ) : (
                <>
                  <div className="relative w-full aspect-square bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800">
                    {cameraError ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-red-400 p-10 text-center">
                         <AlertCircle className="h-10 w-10 mb-4" />
                         <p className="text-xs font-bold">{cameraError}</p>
                         <Button size="sm" variant="outline" className="mt-4" onClick={startCamera}>Tentar Novamente</Button>
                      </div>
                    ) : (
                      <>
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        <canvas ref={canvasRef} className="hidden" />
                        {cameraStream && (
                          <button onClick={capturePhoto} className="absolute bottom-8 left-1/2 -translate-x-1/2 h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-blue-500 active:scale-95 transition-all">
                            <Sparkles className="h-6 w-6 text-blue-600" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  <div className="w-full grid grid-cols-2 gap-4">
                    <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl hover:bg-blue-50 transition-all">
                       <ImageIcon className="h-6 w-6 text-slate-400 mb-2" />
                       <span className="text-[10px] font-black uppercase text-slate-500">Galeria</span>
                       <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                             const reader = new FileReader();
                             reader.onloadend = () => analyzeImage(reader.result as string);
                             reader.readAsDataURL(file);
                          }
                       }} />
                    </button>
                    <button onClick={startCamera} className="flex flex-col items-center justify-center p-6 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all">
                       <Camera className="h-6 w-6 mb-2" />
                       <span className="text-[10px] font-black uppercase">Câmera</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* POPUP RESULTADO IA (FOTO + INFORMAÇÕES DO PRODUTO) */}
      {aiSearchResult && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[4000]">
           <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-4xl w-full overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="flex flex-col md:flex-row">
                 {/* Lado da Foto Capturada */}
                 <div className="md:w-1/2 bg-slate-100 flex items-center justify-center p-8 border-b md:border-b-0 md:border-r">
                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-xl border-4 border-white">
                       <img src={aiSearchResult.capturedImage} className="w-full h-full object-cover" alt="Sua Foto" />
                       <div className="absolute top-4 left-4 bg-blue-600 text-white text-[9px] font-black uppercase px-2 py-1 rounded">Capturado por você</div>
                    </div>
                 </div>

                 {/* Lado das Informações do Banco de Dados */}
                 <div className="md:w-1/2 p-10 flex flex-col justify-between">
                    <div>
                       <div className="flex justify-between items-start mb-6">
                          <div>
                             <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">IA Encontrou um Match</h4>
                             <h3 className="text-2xl font-black text-slate-900 leading-tight mt-1">
                                {aiSearchResult.product ? aiSearchResult.product.description : aiSearchResult.aiData.description}
                             </h3>
                          </div>
                          <button onClick={() => setAiSearchResult(null)} className="text-slate-300 hover:text-slate-900"><X className="h-8 w-8"/></button>
                       </div>

                       <div className="space-y-4 mb-8">
                          <div className="flex justify-between border-b border-slate-50 pb-2">
                             <span className="text-[10px] font-black text-slate-400 uppercase">Linha / Modelo:</span>
                             <span className="text-xs font-bold text-slate-900 uppercase">{aiSearchResult.product?.line || aiSearchResult.aiData.line}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-50 pb-2">
                             <span className="text-[10px] font-black text-slate-400 uppercase">Cor Identificada:</span>
                             <span className="text-xs font-bold text-slate-900 uppercase">{aiSearchResult.aiData.color}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-50 pb-2">
                             <span className="text-[10px] font-black text-slate-400 uppercase">Categoria:</span>
                             <span className="text-xs font-bold text-slate-900 uppercase">{aiSearchResult.product?.category || aiSearchResult.aiData.type}</span>
                          </div>
                       </div>

                       {aiSearchResult.product ? (
                          <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-start gap-3 mb-6">
                             <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                             <div>
                                <p className="text-[10px] text-green-700 font-black uppercase">Item em Estoque</p>
                                <p className="text-xs text-green-600 font-medium">Este produto corresponde ao catálogo oficial Dicompel.</p>
                             </div>
                          </div>
                       ) : (
                          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex items-start gap-3 mb-6">
                             <AlertCircle className="h-5 w-5 text-orange-600 shrink-0" />
                             <div>
                                <p className="text-[10px] text-orange-700 font-black uppercase">Sugestão Técnica</p>
                                <p className="text-xs text-orange-600 font-medium">Identificamos o tipo de peça, mas não encontramos o código exato no estoque.</p>
                             </div>
                          </div>
                       )}
                    </div>

                    <div className="flex flex-col gap-3">
                       {aiSearchResult.product && (
                          <Button size="lg" className="w-full h-16 font-black uppercase shadow-xl" onClick={() => { handleAddToCart(aiSearchResult.product!); setAiSearchResult(null); }}>
                             ADICIONAR AO CARRINHO
                          </Button>
                       )}
                       <Button variant="outline" className="w-full h-14 font-black uppercase text-[10px]" onClick={() => setAiSearchResult(null)}>
                          VOLTAR AO CATÁLOGO
                       </Button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

// Ícone CheckCircle que faltou importar
const CheckCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
