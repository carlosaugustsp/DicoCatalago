
import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { productService } from '../services/api';
import { Search, Info, Check, Plus, Layers, HelpCircle, Camera, Upload, Sparkles, AlertCircle, X, ArrowRight, FileText, Key } from 'lucide-react';
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
  const [showHelp, setShowHelp] = useState(false);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'novara'>('general');
  const [visibleCount, setVisibleCount] = useState(24);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Estados da Pesquisa Visual e API Key
  const [showVisualSearch, setShowVisualSearch] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);
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
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    // Verifica se a função existe no ambiente (AI Studio Builder)
    if ((window as any).aistudio?.hasSelectedApiKey) {
      try {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } catch (e) {
        setHasApiKey(false);
      }
    }
  };

  const handleOpenSelectKey = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      // Assume sucesso imediato para melhorar UX
      setHasApiKey(true);
    } else {
      alert("A ferramenta de gerenciamento de chaves não está disponível neste navegador.");
    }
  };

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
      const typeLower = aiResult.type?.toLowerCase() || "";
      const colorLower = aiResult.color?.toLowerCase() || "";
      const lineLower = aiResult.line?.toLowerCase() || "";

      result = result.filter(p => {
        const desc = p.description.toLowerCase();
        const cat = p.category.toLowerCase();
        const line = p.line.toLowerCase();
        
        const matchesType = typeLower && (desc.includes(typeLower) || cat.includes(typeLower));
        const matchesColor = colorLower && (p.colors?.some(c => c.toLowerCase().includes(colorLower)) || desc.includes(colorLower));
        const matchesLine = lineLower && (line.includes(lineLower) || desc.includes(lineLower));

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
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1024 }, height: { ideal: 1024 } } 
      });
      setCameraStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Não foi possível acessar a câmera. Verifique as permissões do seu navegador.");
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
    try {
      // Cria nova instância para garantir o uso da chave recém selecionada
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { text: "Você é um especialista técnico em componentes elétricos da Dicompel. Analise a imagem e identifique o produto. Se for uma tomada ou interruptor, forneça: Tipo (ex: Tomada, Interruptor), Cor (ex: Branco, Preto), Linha (ex: Novara, Classic), Amperagem (ex: 10A, 20A). No campo description, forneça o nome mais provável do produto no banco de dados." },
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

      const text = response.text || "{}";
      const parsed: AIResult = JSON.parse(text);
      setAiResult(parsed);
      
      // Busca aprimorada: tenta encontrar o produto exato
      const matchedProduct = products.find(p => {
        const d = p.description.toLowerCase();
        const l = p.line.toLowerCase();
        
        const lineMatch = parsed.line ? l.includes(parsed.line.toLowerCase()) : false;
        const typeMatch = parsed.type ? (d.includes(parsed.type.toLowerCase()) || p.category.toLowerCase().includes(parsed.type.toLowerCase())) : false;
        const colorMatch = parsed.color ? (p.colors.some(c => c.toLowerCase().includes(parsed.color.toLowerCase())) || d.includes(parsed.color.toLowerCase())) : false;

        return lineMatch && typeMatch && colorMatch;
      }) || products.find(p => {
        // Fallback: se não achar tudo, busca por palavras-chave da descrição sugerida pela IA
        const keywords = (parsed.description || "").toLowerCase().split(' ').filter(k => k.length > 3);
        return keywords.some(k => p.description.toLowerCase().includes(k));
      });

      setShowVisualSearch(false);
      stopCamera();

      // Se encontrou o produto, abre o popup imediatamente
      if (matchedProduct) {
        setSelectedProductForInfo(matchedProduct);
      } else {
        alert(`IA identificou: ${parsed.description}. Filtrando catálogo para você.`);
      }

    } catch (err: any) {
      console.error("Erro na análise da IA:", err);
      if (err.message?.includes("entity was not found") || err.message?.includes("API key")) {
        setHasApiKey(false);
        alert("Erro de autenticação: Clique no botão 'Ativar IA' para configurar sua chave de API.");
      } else {
        alert("Erro ao analisar imagem. Verifique sua conexão e tente novamente.");
      }
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

  const isPlateProduct = (p: Product) => {
    const text = [p.category, p.subcategory, p.description].join(' ').toLowerCase();
    return (text.includes('placa') || text.includes('suporte') || text.includes('espelho')) && !text.includes('módulo');
  };

  const isModuleProduct = (p: Product) => {
    return [p.category, p.subcategory, p.description].join(' ').toLowerCase().includes('módulo');
  };

  const getNovaraProducts = () => {
    let items = products.filter(p => (p.line || '').toLowerCase().includes('novara') || (p.description || '').toLowerCase().includes('novara'));
    if (novaraStep === 1) items = items.filter(isPlateProduct);
    else items = items.filter(isModuleProduct);
    if (novaraSearch) {
      const lower = novaraSearch.toLowerCase();
      items = items.filter(p => p.code.toLowerCase().includes(lower) || p.description.toLowerCase().includes(lower));
    }
    return items;
  };

  const toggleNovaraItem = (product: Product, type: 'plate' | 'module') => {
    const setter = type === 'plate' ? setSelectedPlates : setSelectedModules;
    setter(prev => {
      const ex = prev.find(m => m.product.id === product.id);
      return ex ? prev.map(m => m.product.id === product.id ? {...m, qty: m.qty + 1} : m) : [...prev, {product, qty: 1}];
    });
  };

  const removeNovaraItem = (id: string, type: 'plate' | 'module') => {
    const setter = type === 'plate' ? setSelectedPlates : setSelectedModules;
    setter(prev => prev.filter(m => m.product.id !== id));
  };

  const linesList = ['all', ...Array.from(new Set(products.map(p => p.line).filter(Boolean)))];
  const categoriesList = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Catálogo Dicompel</h2>
            <p className="text-slate-600 text-sm">Qualidade e tecnologia em componentes elétricos.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            {!hasApiKey && (
              <Button variant="danger" size="sm" onClick={handleOpenSelectKey} className="animate-pulse shadow-red-200 shadow-xl border-none">
                <Key className="h-4 w-4 mr-2" /> Ativar IA (Produção)
              </Button>
            )}
            <Button variant="primary" size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 border-none shadow-lg shadow-blue-100" onClick={() => { 
              setShowVisualSearch(true); 
              startCamera(); 
            }}>
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
          {aiResult && (
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-xl text-white"><Sparkles className="h-5 w-5" /></div>
                <div>
                  <h4 className="text-sm font-black text-indigo-900 uppercase">Sugestão da IA</h4>
                  <p className="text-xs text-indigo-700 font-bold">Identificado: {aiResult.description} ({aiResult.line})</p>
                </div>
              </div>
              <button onClick={() => setAiResult(null)} className="text-[10px] font-black uppercase text-indigo-500 hover:text-indigo-800 bg-white px-4 py-2 rounded-lg border border-indigo-100 transition-colors">Limpar Filtro IA</button>
            </div>
          )}

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute inset-y-0 left-3 h-5 w-5 text-slate-400 my-auto" />
              <input type="text" className="block w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:outline-none bg-white border-slate-200" placeholder="Buscar produtos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
              <select className="block flex-1 sm:w-40 pl-3 pr-8 py-2 border rounded-lg text-sm focus:outline-none bg-white border-slate-200" value={selectedAmperage} onChange={(e) => setSelectedAmperage(e.target.value)}>
                <option value="all">Amperagem</option>
                <option value="10A">10A</option>
                <option value="20A">20A</option>
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

      {/* Modal Pesquisa Visual */}
      {showVisualSearch && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 z-[3000]">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-xl w-full overflow-hidden flex flex-col relative animate-in zoom-in-95">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200"><Camera className="h-6 w-6" /></div>
                <div>
                   <h3 className="text-xl font-black text-slate-900 uppercase">IA Vision Dicompel</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identificação de Produtos</p>
                </div>
              </div>
              <button onClick={() => { setShowVisualSearch(false); stopCamera(); }} className="text-slate-300 hover:text-slate-900 transition-colors p-2 rounded-xl hover:bg-slate-100"><X className="h-8 w-8" /></button>
            </div>
            <div className="flex-grow p-8 flex flex-col items-center gap-6">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="loader mb-6 border-slate-100 border-t-blue-600"></div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest animate-pulse">Consultando Especialista IA...</h4>
                  <p className="text-xs text-slate-400 mt-2">Estamos identificando o modelo Dicompel para você.</p>
                </div>
              ) : (
                <>
                  <div className="relative w-full aspect-square bg-slate-900 rounded-[2rem] overflow-hidden border-4 border-slate-100 shadow-2xl">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-0 border-[40px] border-slate-900/40 pointer-events-none"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/50 rounded-3xl pointer-events-none">
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500"></div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500"></div>
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500"></div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500"></div>
                    </div>
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                       <button onClick={capturePhoto} className="h-20 w-20 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-blue-500 active:scale-95 transition-all group">
                          <div className="h-14 w-14 bg-blue-600 group-hover:bg-blue-700 rounded-full flex items-center justify-center text-white transition-colors"><Sparkles className="h-7 w-7" /></div>
                       </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <label className="flex flex-col items-center justify-center gap-2 p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-slate-100 transition-all group">
                       <Upload className="h-6 w-6 text-slate-400 group-hover:text-blue-600" />
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Enviar Foto</span>
                       <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    </label>
                    <div className="p-6 bg-blue-50 border-2 border-blue-100 rounded-3xl flex flex-col items-center justify-center text-center gap-2">
                       <AlertCircle className="h-6 w-6 text-blue-400" />
                       <p className="text-[9px] font-bold text-blue-600 leading-tight">Posicione o produto no centro para uma identificação precisa.</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes do Produto (Popup com Foto e Descrição) */}
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
                    {selectedProductForInfo.amperage && (
                      <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase text-white shadow-sm ${selectedProductForInfo.amperage === '20A' ? 'bg-red-600' : 'bg-blue-600'}`}>{selectedProductForInfo.amperage}</span>
                    )}
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
                 <div className="mb-8">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-blue-500"/> Especificações Técnicas</p>
                    <div className="text-sm text-slate-600 bg-slate-50 p-5 rounded-2xl border border-slate-100 max-h-40 overflow-y-auto leading-relaxed shadow-inner">
                       {selectedProductForInfo.details || "Consulte nosso catálogo impresso para especificações técnicas detalhadas deste componente."}
                    </div>
                 </div>
                 <Button className="w-full h-16 font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-100" onClick={() => { handleAddToCart(selectedProductForInfo); setSelectedProductForInfo(null); }}>ADICIONAR AO CARRINHO</Button>
              </div>
           </div>
        </div>
      )}

      {/* Aba Monte sua Novara */}
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
                 const isPlate = isPlateProduct(product);
                 const isInKit = (isPlate ? selectedPlates : selectedModules).find(m => m.product.id === product.id);
                 return (
                   <div key={product.id} className={`bg-white border-2 rounded-2xl overflow-hidden hover:border-blue-500 transition-all flex flex-col ${isInKit ? 'border-blue-600 shadow-lg' : 'border-slate-100 shadow-sm'}`}>
                     <div className="relative pt-[100%] bg-slate-50">
                        <img src={product.imageUrl} className="absolute inset-0 w-full h-full object-contain p-4" alt="" />
                        <span className="absolute top-3 right-3 bg-slate-900/90 text-white text-[10px] px-2 py-1 rounded-lg font-black uppercase z-10">{product.code}</span>
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
                {(selectedPlates.length > 0 || selectedModules.length > 0) && <button onClick={() => { setSelectedPlates([]); setSelectedModules([]); setNovaraStep(1); }} className="text-[10px] text-blue-400 font-black hover:text-white transition-colors underline">LIMPAR TUDO</button>}
             </div>
             <div className="p-6 space-y-6">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">PLACAS / SUPORTES ({selectedPlates.reduce((a,b) => a+b.qty, 0)})</p>
                   <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedPlates.map(it => (
                        <div key={it.product.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl text-[11px] font-bold border border-slate-100 group">
                           <span className="truncate flex-1 pr-2">{it.qty}x {it.product.description}</span>
                           <button onClick={() => removeNovaraItem(it.product.id, 'plate')} className="p-1 hover:bg-red-50 rounded-lg group-hover:text-red-500 transition-colors"><X className="h-4 w-4"/></button>
                        </div>
                      ))}
                      {selectedPlates.length === 0 && <p className="text-center py-4 text-xs text-slate-400 italic">Nenhuma placa selecionada</p>}
                   </div>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">MÓDULOS TÉCNICOS ({selectedModules.reduce((a,b) => a+b.qty, 0)})</p>
                   <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedModules.map(it => (
                        <div key={it.product.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl text-[11px] font-bold border border-slate-100 group">
                           <span className="truncate flex-1 pr-2">{it.qty}x {it.product.description}</span>
                           <button onClick={() => removeNovaraItem(it.product.id, 'module')} className="p-1 hover:bg-red-50 rounded-lg group-hover:text-red-500 transition-colors"><X className="h-4 w-4"/></button>
                        </div>
                      ))}
                      {selectedModules.length === 0 && <p className="text-center py-4 text-xs text-slate-400 italic">Nenhum módulo selecionado</p>}
                   </div>
                </div>
                <Button className="w-full h-14 text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-50" disabled={selectedPlates.length === 0} onClick={() => {
                   selectedPlates.forEach(m => { for(let i=0; i<m.qty; i++) addToCart(m.product); });
                   selectedModules.forEach(m => { for(let i=0; i<m.qty; i++) addToCart(m.product); });
                   setSelectedPlates([]); setSelectedModules([]); setNovaraStep(1); setActiveTab('general');
                   alert("Kit Novara personalizado adicionado ao carrinho!");
                }}>ADICIONAR KIT AO CARRINHO</Button>
             </div>
          </div>
        </div>
      )}
      <div ref={observerTarget} className="h-1 col-span-full"></div>
    </div>
  );
};
