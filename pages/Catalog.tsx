
import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { productService } from '../services/api';
import { Search, Info, Check, Plus, Layers, HelpCircle, Camera, Upload, Sparkles, AlertCircle, X, ArrowRight, ShoppingCart, Settings2, BookOpen, Key, Globe, MousePointer2, ExternalLink, RefreshCcw, ShieldCheck } from 'lucide-react';
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

  // Estados da Pesquisa Visual
  const [showVisualSearch, setShowVisualSearch] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Estado de Ajuda
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
    if (activeTab === 'general') {
      filterProducts();
    }
  }, [searchTerm, selectedCategory, selectedLine, products, activeTab, aiResult]);

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
    // Verificação imediata da API KEY antes de ligar a câmera
    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
      setShowVisualSearch(false);
      setHelpTab('api');
      setShowHelp(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setCameraStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Acesso à câmera negado. Verifique as permissões do seu dispositivo.");
      setShowVisualSearch(false);
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
    
    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
      setShowVisualSearch(false);
      stopCamera();
      setHelpTab('api');
      setShowHelp(true);
      setIsAnalyzing(false);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { text: "Analise esta imagem de um produto Dicompel e identifique: Tipo de componente (Tomada, Interruptor, etc), Cor, Linha (Novara, Classic, etc). Retorne em formato JSON." },
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

      const parsed: AIResult = JSON.parse(response.text || "{}");
      setAiResult(parsed);
      
      const match = products.find(p => {
        const desc = p.description.toLowerCase();
        return (parsed.type && desc.includes(parsed.type.toLowerCase())) && (parsed.line && p.line.toLowerCase().includes(parsed.line.toLowerCase()));
      }) || products.find(p => p.description.toLowerCase().includes((parsed.description || "").toLowerCase().split(' ')[0]));

      setShowVisualSearch(false);
      stopCamera();

      if (match) {
        setSelectedProductForInfo(match);
      } else {
        alert("IA identificou: " + (parsed.description || "Produto Dicompel") + ". Filtros aplicados.");
      }
    } catch (err: any) {
      console.error("Erro IA:", err);
      alert("Erro na IA. Verifique se sua chave API_KEY está correta no Vercel.");
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
    const novaraProds = products.filter(p => p.line === 'Novara' || p.description.toLowerCase().includes('novara'));
    let result = novaraProds.filter(p => {
      const isPlate = (p.category.toLowerCase().includes('placa') || p.description.toLowerCase().includes('placa')) && !p.description.toLowerCase().includes('módulo');
      return novaraStep === 1 ? isPlate : !isPlate;
    });
    if (novaraSearch) {
      const lower = novaraSearch.toLowerCase();
      result = result.filter(p => p.code.toLowerCase().includes(lower) || p.description.toLowerCase().includes(lower));
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

  const linesList = ['all', ...Array.from(new Set(products.map(p => p.line).filter(Boolean)))];
  const categoriesList = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Catálogo Dicompel</h2>
            <p className="text-slate-600 text-sm">Design e tecnologia em componentes elétricos.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="primary" size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 border-none shadow-lg shadow-blue-100" onClick={() => { 
              setShowVisualSearch(true); 
              startCamera(); 
            }}>
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
              <input type="text" className="block w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:outline-none bg-white border-slate-200" placeholder="Buscar produtos por nome ou código..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <select className="block flex-1 sm:w-44 pl-3 pr-8 py-2 border rounded-lg text-sm focus:outline-none bg-white border-slate-200" value={selectedLine} onChange={(e) => setSelectedLine(e.target.value)}>
                <option value="all">Todas as Linhas</option>
                {linesList.filter(l => l !== 'all').map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <select className="block flex-1 sm:w-44 pl-3 pr-8 py-2 border rounded-lg text-sm focus:outline-none bg-white border-slate-200" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                <option value="all">Categorias</option>
                {categoriesList.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
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

      {/* MODAL DE AJUDA COM GUIA VERCEL DETALHADO */}
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
                 <div className="flex gap-2 p-1 bg-slate-200 rounded-xl">
                    <button onClick={() => setHelpTab('usage')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${helpTab === 'usage' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Manual de Uso</button>
                    <button onClick={() => setHelpTab('api')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${helpTab === 'api' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>Habilitar IA (Vercel)</button>
                 </div>
              </div>
              
              <div className="flex-grow overflow-y-auto p-8 space-y-10">
                 {helpTab === 'usage' ? (
                   <>
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                           <MousePointer2 className="h-5 w-5 text-blue-600"/>
                           <h4 className="font-black text-slate-800 uppercase text-sm">Navegação e Compra</h4>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col gap-4">
                           <p className="text-sm text-slate-600 leading-relaxed">Localize o produto no catálogo e use o botão <strong>"+ Adicionar"</strong>. Seus itens ficam salvos no carrinho localizado no menu superior.</p>
                           <div className="flex items-center justify-center p-4 bg-white rounded-xl border border-dashed">
                              <Button size="sm" className="w-40"><Plus className="h-4 w-4 mr-2"/> ADICIONAR</Button>
                           </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                           <Settings2 className="h-5 w-5 text-slate-800"/>
                           <h4 className="font-black text-slate-800 uppercase text-sm">Configurador Novara</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                              <span className="text-[10px] font-black text-blue-600 uppercase mb-2 block">PASSO 1</span>
                              <p className="text-xs text-blue-800 leading-relaxed">Escolha a <strong>Placa</strong> (modelo e cor) que servirá de base para seu conjunto.</p>
                           </div>
                           <div className="bg-blue-600 p-4 rounded-2xl shadow-lg">
                              <span className="text-[10px] font-black text-white/60 uppercase mb-2 block">PASSO 2</span>
                              <p className="text-xs text-white leading-relaxed">Adicione os <strong>Módulos</strong> (tomadas, botões) para completar sua placa personalizada.</p>
                           </div>
                        </div>
                    </section>
                   </>
                 ) : (
                   <section className="space-y-6">
                      <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl flex gap-3 mb-6">
                         <AlertCircle className="h-6 w-6 text-orange-500 flex-shrink-0" />
                         <p className="text-xs text-orange-800 font-bold leading-relaxed">A IA Vision exige uma chave configurada no seu painel da Vercel para funcionar. Siga os 3 passos abaixo:</p>
                      </div>

                      <div className="space-y-8">
                         <div className="flex gap-5">
                            <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black flex-shrink-0 shadow-lg">1</div>
                            <div className="flex-grow">
                               <p className="text-sm font-black text-slate-900 uppercase">Obter sua API KEY</p>
                               <p className="text-xs text-slate-500 mt-1 mb-3">Gere uma chave gratuita no Google AI Studio.</p>
                               <a href="https://aistudio.google.com/app/apikey" target="_blank" className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 transition-all">
                                  <Globe className="h-3 w-3" /> Abrir AI Studio <ExternalLink className="h-3 w-3" />
                               </a>
                            </div>
                         </div>
                         
                         <div className="flex gap-5">
                            <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black flex-shrink-0 shadow-lg">2</div>
                            <div className="flex-grow">
                               <p className="text-sm font-black text-slate-900 uppercase">Adicionar no Vercel</p>
                               <p className="text-xs text-slate-500 mt-1">Vá em <strong>Settings -> Environment Variables</strong>:</p>
                               <ul className="text-xs text-slate-600 mt-3 space-y-3 bg-slate-100 p-4 rounded-xl border">
                                  <li className="flex items-center gap-2"><strong>Key:</strong> <code className="bg-slate-200 px-2 py-0.5 rounded font-black">API_KEY</code></li>
                                  <li className="flex items-center gap-2 truncate"><strong>Value:</strong> <code className="bg-slate-200 px-2 py-0.5 rounded italic opacity-50">Sua-chave-copiada</code></li>
                               </ul>
                            </div>
                         </div>

                         <div className="flex gap-5 relative">
                            <div className="absolute -left-2 top-0 h-full w-0.5 bg-orange-200 -z-10"></div>
                            <div className="h-10 w-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-black flex-shrink-0 shadow-lg ring-4 ring-orange-100">3</div>
                            <div className="flex-grow">
                               <p className="text-sm font-black text-orange-600 uppercase">Passo Final: REDEPLOY</p>
                               <p className="text-xs text-slate-600 mt-1 leading-relaxed">As alterações no Vercel <strong>NÃO</strong> entram no ar automaticamente. Você deve forçar uma nova atualização:</p>
                               <div className="mt-4 space-y-2">
                                  <div className="flex items-center gap-3 bg-white p-3 rounded-xl border shadow-sm">
                                     <ShieldCheck className="h-4 w-4 text-green-500" />
                                     <span className="text-[11px] font-bold text-slate-700">Vá na aba <strong>Deployments</strong></span>
                                  </div>
                                  <div className="flex items-center gap-3 bg-orange-50 p-4 rounded-xl border border-orange-200">
                                     <RefreshCcw className="h-4 w-4 text-orange-500 animate-spin-slow" />
                                     <div>
                                        <span className="text-[11px] font-black text-orange-800 uppercase block">Clique em "REDEPLOY"</span>
                                        <span className="text-[9px] text-orange-600">Aguarde 1 minuto até o site atualizar.</span>
                                     </div>
                                  </div>
                               </div>
                            </div>
                         </div>
                      </div>
                   </section>
                 )}
              </div>

              <div className="p-6 bg-slate-50 border-t flex flex-col gap-3">
                 <Button className="w-full h-14 font-black uppercase tracking-widest" onClick={() => setShowHelp(false)}>ENTENDI, VOU ATUALIZAR</Button>
                 <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest">Dicompel Tecnologia • Suporte CRM</p>
              </div>
           </div>
        </div>
      )}

      {showVisualSearch && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 z-[3000]">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-xl w-full overflow-hidden flex flex-col relative animate-in zoom-in-95">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg"><Camera className="h-6 w-6" /></div>
                <div>
                   <h3 className="text-xl font-black text-slate-900 uppercase">IA Vision Dicompel</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detector de Modelos</p>
                </div>
              </div>
              <button onClick={() => { setShowVisualSearch(false); stopCamera(); }} className="text-slate-300 hover:text-slate-900 transition-colors p-2 rounded-xl hover:bg-slate-100"><X className="h-8 w-8" /></button>
            </div>
            <div className="flex-grow p-8 flex flex-col items-center gap-6">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="loader mb-6 border-slate-100 border-t-blue-600"></div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest animate-pulse">Analisando Imagem...</h4>
                  <p className="text-xs text-slate-400 mt-2">Identificando componentes Dicompel.</p>
                </div>
              ) : (
                <>
                  <div className="relative w-full aspect-square bg-slate-900 rounded-[2rem] overflow-hidden border-4 border-slate-100 shadow-2xl">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-0 border-[40px] border-slate-900/40 pointer-events-none"></div>
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                       <button onClick={capturePhoto} className="h-20 w-20 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-blue-500 active:scale-95 transition-all group">
                          <div className="h-14 w-14 bg-blue-600 group-hover:bg-blue-700 rounded-full flex items-center justify-center text-white transition-colors"><Sparkles className="h-7 w-7" /></div>
                       </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <label className="flex flex-col items-center justify-center gap-2 p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-slate-100 transition-all group">
                       <Upload className="h-6 w-6 text-slate-400 group-hover:text-blue-600" />
                       <span className="text-[10px] font-black text-slate-500 uppercase">Enviar Arquivo</span>
                       <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    </label>
                    <div className="p-6 bg-blue-50 border-2 border-blue-100 rounded-3xl flex flex-col items-center justify-center text-center gap-2">
                       <AlertCircle className="h-6 w-6 text-blue-400" />
                       <p className="text-[9px] font-bold text-blue-600">Foque bem no produto Dicompel.</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedProductForInfo && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[2000]">
           <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-100">
              <div className="relative h-64 bg-slate-50 flex items-center justify-center p-12 border-b border-slate-100">
                 <button onClick={() => setSelectedProductForInfo(null)} className="absolute top-6 right-6 bg-white/90 hover:bg-white p-3 rounded-2xl shadow-md text-slate-400 hover:text-slate-900 transition-all">
                    <X className="h-6 w-6"/>
                 </button>
                 <img src={selectedProductForInfo.imageUrl} className="h-full object-contain drop-shadow-2xl" alt=""/>
              </div>
              <div className="p-10">
                 <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-4 py-1.5 rounded-full uppercase tracking-widest">{selectedProductForInfo.line}</span>
                 </div>
                 <h3 className="text-2xl font-black text-slate-900 leading-tight mb-6">{selectedProductForInfo.description}</h3>
                 <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">CÓDIGO INTERNO</p>
                       <p className="text-sm font-bold text-slate-800">{selectedProductForInfo.code}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">REFERÊNCIA</p>
                       <p className="text-sm font-bold text-slate-800">{selectedProductForInfo.reference}</p>
                    </div>
                 </div>
                 <Button className="w-full h-16 font-black uppercase tracking-[0.2em]" onClick={() => { handleAddToCart(selectedProductForInfo); setSelectedProductForInfo(null); }}>ADICIONAR AO CARRINHO</Button>
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
                   <p className="text-[10px] text-blue-400 font-black uppercase mt-1 tracking-widest">Série Novara - Design Italiano</p>
                </div>
                <div className="flex items-center gap-3">
                   <button onClick={() => setNovaraStep(1)} className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-all ${novaraStep === 1 ? 'bg-blue-600 text-white ring-4 ring-blue-500/30' : 'bg-slate-800 text-slate-500'}`}>1</button>
                   <button onClick={() => selectedPlates.length > 0 && setNovaraStep(2)} className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-all ${novaraStep === 2 ? 'bg-blue-600 text-white ring-4 ring-blue-500/30' : 'bg-slate-800 text-slate-500'} ${selectedPlates.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>2</button>
                </div>
             </div>
             <div className="bg-white p-2 rounded-xl border border-slate-200 mb-4 flex gap-2">
                <Search className="h-5 w-5 text-slate-400 my-auto ml-2"/>
                <input type="text" className="w-full px-2 py-2 text-sm focus:outline-none" placeholder="Filtrar série Novara..." value={novaraSearch} onChange={(e) => setNovaraSearch(e.target.value)} />
             </div>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
               {getNovaraProducts().map(product => {
                 const isPlate = (product.category.toLowerCase().includes('placa') || product.description.toLowerCase().includes('placa')) && !product.description.toLowerCase().includes('módulo');
                 const isInKit = (isPlate ? selectedPlates : selectedModules).find(m => m.product.id === product.id);
                 return (
                   <div key={product.id} className={`bg-white border-2 rounded-2xl overflow-hidden hover:border-blue-500 transition-all flex flex-col ${isInKit ? 'border-blue-600 shadow-lg' : 'border-slate-100'}`}>
                     <div className="relative pt-[100%] bg-slate-50">
                        <img src={product.imageUrl} className="absolute inset-0 w-full h-full object-contain p-4" alt="" />
                        <span className="absolute top-3 right-3 bg-slate-900/90 text-white text-[10px] px-2 py-1 rounded-lg font-black uppercase">{product.code}</span>
                     </div>
                     <div className="p-4 flex-grow flex flex-col">
                        <h4 className="font-bold text-xs text-slate-800 line-clamp-2 min-h-[40px] mb-4 leading-tight">{product.description}</h4>
                        <Button size="sm" className="w-full text-[10px] font-black uppercase tracking-widest h-10" onClick={() => toggleNovaraItem(product, isPlate ? 'plate' : 'module')}>
                           {isInKit ? `+ ADICIONAR (X${isInKit.qty + 1})` : '+ ADICIONAR AO KIT'}
                        </Button>
                     </div>
                   </div>
                 );
               })}
             </div>
          </div>
          <div className="w-full lg:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 h-fit sticky top-24 overflow-hidden">
             <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <Layers className="h-5 w-5 text-blue-500"/>
                   <h3 className="font-bold text-sm uppercase tracking-widest">Resumo do Kit</h3>
                </div>
                {(selectedPlates.length > 0 || selectedModules.length > 0) && <button onClick={() => { setSelectedPlates([]); setSelectedModules([]); setNovaraStep(1); }} className="text-[10px] text-blue-400 font-black">LIMPAR</button>}
             </div>
             <div className="p-6 space-y-6">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">PLACAS ({selectedPlates.reduce((a,b) => a+b.qty, 0)})</p>
                   <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedPlates.map(it => (
                        <div key={it.product.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl text-[11px] font-bold border">
                           <span className="truncate flex-1 pr-2">{it.qty}x {it.product.description}</span>
                           <button onClick={() => removeNovaraItem(it.product.id, 'plate')}><X className="h-4 w-4 text-red-500"/></button>
                        </div>
                      ))}
                   </div>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">MÓDULOS ({selectedModules.reduce((a,b) => a+b.qty, 0)})</p>
                   <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedModules.map(it => (
                        <div key={it.product.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl text-[11px] font-bold border">
                           <span className="truncate flex-1 pr-2">{it.qty}x {it.product.description}</span>
                           <button onClick={() => removeNovaraItem(it.product.id, 'module')}><X className="h-4 w-4 text-red-500"/></button>
                        </div>
                      ))}
                   </div>
                </div>
                <Button className="w-full h-14 text-xs font-black uppercase tracking-widest" disabled={selectedPlates.length === 0} onClick={() => {
                   selectedPlates.forEach(m => { for(let i=0; i<m.qty; i++) addToCart(m.product); });
                   selectedModules.forEach(m => { for(let i=0; i<m.qty; i++) addToCart(m.product); });
                   setSelectedPlates([]); setSelectedModules([]); setNovaraStep(1); setActiveTab('general');
                   alert("Kit Novara adicionado ao carrinho!");
                }}>ADICIONAR KIT AO CARRINHO</Button>
             </div>
          </div>
        </div>
      )}
      
      <button 
        onClick={() => { setShowHelp(true); setHelpTab('usage'); }}
        className="fixed bottom-6 right-6 h-14 w-14 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group border border-slate-700"
      >
         <HelpCircle className="h-7 w-7" />
         <span className="absolute right-full mr-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-slate-700">Precisa de Ajuda?</span>
      </button>

      <div ref={observerTarget} className="h-1 col-span-full"></div>
    </div>
  );
};
