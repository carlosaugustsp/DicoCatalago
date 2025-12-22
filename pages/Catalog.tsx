
import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { productService } from '../services/api';
import { Search, Info, Check, Plus, Layers, Grid, ShoppingCart, FileText, X, ChevronRight, HelpCircle, Eye } from 'lucide-react';
import { Button } from '../components/Button';

interface CatalogProps {
  addToCart: (product: Product) => void;
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

  const [novaraStep, setNovaraStep] = useState<1 | 2>(1);
  const [selectedPlate, setSelectedPlate] = useState<Product | null>(null);
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
  }, [searchTerm, selectedCategory, selectedLine, selectedAmperage, products, activeTab]);

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
    const data = await productService.getAll();
    setProducts(data);
    setFilteredProducts(data);
    setLoading(false);
  };

  const filterProducts = () => {
    let result = products;
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
    if (selectedAmperage !== 'all') result = result.filter(p => p.amperage === selectedAmperage);
    setFilteredProducts(result);
    setVisibleCount(24);
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    setAddedIds(prev => [...prev, product.id]);
    setTimeout(() => setAddedIds(prev => prev.filter(id => id !== product.id)), 1500);
  };

  const isPlateProduct = (p: Product) => {
    const text = [p.category, p.subcategory, p.description].filter(Boolean).join(' ').toLowerCase();
    return (text.includes('placa') || text.includes('suporte') || text.includes('espelho')) && !text.includes('módulo');
  };

  const isModuleProduct = (p: Product) => {
    const text = [p.category, p.subcategory, p.description].filter(Boolean).join(' ').toLowerCase();
    return text.includes('módulo');
  };

  const getNovaraProducts = () => {
    // Filtrar primeiro pela linha Novara
    let novaraItems = products.filter(p => 
      p.line?.toLowerCase().includes('novara') || 
      p.description?.toLowerCase().includes('novara')
    );
    
    if (novaraStep === 1) {
      // Passo 1: MOSTRAR APENAS PLACAS
      novaraItems = novaraItems.filter(p => isPlateProduct(p));
    } else {
      // Passo 2: MOSTRAR APENAS MÓDULOS
      novaraItems = novaraItems.filter(p => isModuleProduct(p));
    }

    if (novaraSearch) {
      const lower = novaraSearch.toLowerCase();
      novaraItems = novaraItems.filter(p => p.code.toLowerCase().includes(lower) || p.description.toLowerCase().includes(lower));
    }
    return novaraItems;
  };

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];
  const amperages = ['all', '10A', '20A'];

  const filterInputStyle = "bg-white text-slate-900 border-slate-200 placeholder-slate-400 focus:ring-blue-500 focus:border-blue-500 shadow-sm";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Catálogo Dicompel</h2>
            <p className="text-slate-600 text-sm">Qualidade e tecnologia em componentes elétricos.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowHelp(true)}>
            <HelpCircle className="h-4 w-4 mr-2" /> Como comprar?
          </Button>
        </div>

        <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-full md:w-auto self-start border border-slate-200">
          <button onClick={() => setActiveTab('general')} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'general' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            Catálogo Geral
          </button>
          <button onClick={() => { setActiveTab('novara'); if (!selectedPlate) setNovaraStep(1); }} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'novara' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            Monte sua Novara
          </button>
        </div>
      </div>

      {activeTab === 'general' && (
        <>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute inset-y-0 left-3 h-5 w-5 text-slate-400 my-auto" />
              <input type="text" className={`block w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:outline-none ${filterInputStyle}`} placeholder="Buscar produtos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <select className={`block w-full sm:w-44 pl-3 pr-8 py-2 border rounded-lg text-sm focus:outline-none ${filterInputStyle}`} value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                <option value="all">Categorias</option>
                {categories.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className={`block w-full sm:w-40 pl-3 pr-8 py-2 border rounded-lg text-sm focus:outline-none ${filterInputStyle}`} value={selectedAmperage} onChange={(e) => setSelectedAmperage(e.target.value)}>
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
                    
                    {/* ETIQUETAS DE AMPERAGEM */}
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

      {activeTab === 'novara' && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
             <div className="bg-slate-900 text-white p-6 rounded-2xl mb-4 flex items-center justify-between shadow-xl">
                <div>
                   <h3 className="text-lg font-bold">Passo {novaraStep}: {novaraStep === 1 ? 'Escolha sua Placa' : 'Selecione os Módulos'}</h3>
                   <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mt-1">
                      {novaraStep === 1 ? 'Somente placas e suportes' : 'Somente módulos técnicos'}
                   </p>
                </div>
                <div className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-all ${novaraStep === 1 ? 'bg-blue-600 text-white ring-4 ring-blue-900/50' : 'bg-slate-800 text-slate-500'}`}>1</div>
                   <div className="w-6 h-0.5 bg-slate-800"></div>
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-all ${novaraStep === 2 ? 'bg-blue-600 text-white ring-4 ring-blue-900/50' : 'bg-slate-800 text-slate-500'}`}>2</div>
                </div>
             </div>

             <div className="bg-white p-3 rounded-xl border border-slate-200 mb-4 flex gap-2">
                <Search className="h-5 w-5 text-slate-400 my-auto ml-2"/>
                <input type="text" className="w-full px-2 py-2 text-sm focus:outline-none text-slate-900" placeholder={`Pesquisar ${novaraStep === 1 ? 'placas' : 'módulos'}...`} value={novaraSearch} onChange={(e) => setNovaraSearch(e.target.value)} />
             </div>

             <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
               {getNovaraProducts().map(product => {
                 const isPlate = isPlateProduct(product);
                 return (
                   <div key={product.id} className={`bg-white border rounded-xl overflow-hidden hover:border-blue-500 transition-all ${selectedPlate?.id === product.id ? 'ring-2 ring-blue-600 shadow-lg' : 'shadow-sm'} flex flex-col`}>
                     <div className="relative pt-[100%] bg-slate-50">
                        <img src={product.imageUrl} className="absolute inset-0 w-full h-full object-contain p-3" alt="" />
                        
                        {/* ETIQUETAS DE AMPERAGEM NOVARA */}
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
                          {isPlate ? (
                             <Button size="sm" className="w-full text-[10px] font-black" onClick={() => { setSelectedPlate(product); setNovaraStep(2); }}>
                                {selectedPlate?.id === product.id ? 'PLACA DO CONJUNTO' : 'USAR ESTA PLACA'}
                             </Button>
                          ) : (
                             <Button size="sm" className="w-full text-[10px] font-black" onClick={() => {
                                setSelectedModules(prev => {
                                  const ex = prev.find(m => m.product.id === product.id);
                                  return ex ? prev.map(m => m.product.id === product.id ? {...m, qty: m.qty+1} : m) : [...prev, {product, qty:1}];
                                });
                             }}>
                                + ADICIONAR AO KIT
                             </Button>
                          )}
                        </div>
                     </div>
                   </div>
                 );
               })}
             </div>
          </div>

          <div className="w-full lg:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col h-fit sticky top-24 overflow-hidden">
             <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <Layers className="h-5 w-5 text-blue-500"/>
                   <h3 className="font-bold text-sm uppercase tracking-widest">Resumo do Kit</h3>
                </div>
                {selectedPlate && <button onClick={() => { setSelectedPlate(null); setSelectedModules([]); setNovaraStep(1); }} className="text-[10px] text-blue-400 hover:text-white underline font-black">REINICIAR</button>}
             </div>
             <div className="p-6 space-y-6">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">PLACA/SUPORTE</p>
                   {selectedPlate ? (
                     <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <img src={selectedPlate.imageUrl} className="w-12 h-12 rounded-lg object-contain border bg-white p-1" alt=""/>
                        <div className="min-w-0">
                           <div className="text-[11px] font-bold text-slate-900 truncate">{selectedPlate.description}</div>
                           <div className="text-[9px] font-black text-slate-400 uppercase">{selectedPlate.code}</div>
                        </div>
                     </div>
                   ) : (
                     <div className="text-xs text-slate-400 italic bg-slate-50 p-5 rounded-xl text-center border border-dashed border-slate-200">Nenhuma placa selecionada</div>
                   )}
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">MÓDULOS ({selectedModules.reduce((a,b) => a+b.qty, 0)})</p>
                   <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {selectedModules.length > 0 ? selectedModules.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm group">
                           <div className="flex items-center gap-3 min-w-0">
                              <span className="bg-slate-900 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-lg">{item.qty}</span>
                              <div className="truncate">
                                 <p className="text-[10px] font-bold text-slate-700 truncate">{item.product.description}</p>
                                 <p className="text-[8px] font-black text-slate-400">{item.product.code}</p>
                              </div>
                           </div>
                           <button onClick={() => setSelectedModules(prev => prev.filter(m => m.product.id !== item.product.id))} className="text-slate-300 hover:text-red-500 transition-colors"><X className="h-4 w-4"/></button>
                        </div>
                      )) : (
                        <p className="text-center py-6 text-[11px] text-slate-400 border border-dashed rounded-xl">Selecione os módulos no Passo 2</p>
                      )}
                   </div>
                </div>
             </div>
             <div className="p-6 bg-slate-50 border-t border-slate-200">
                <Button className="w-full h-12 text-xs font-black uppercase tracking-widest" disabled={!selectedPlate} onClick={() => {
                   if (selectedPlate) addToCart(selectedPlate);
                   selectedModules.forEach(m => { for(let i=0; i<m.qty; i++) addToCart(m.product); });
                   alert("Kit adicionado ao carrinho!");
                   setSelectedPlate(null); setSelectedModules([]); setNovaraStep(1); setActiveTab('general');
                }}>ADICIONAR KIT AO CARRINHO</Button>
             </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes do Produto */}
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

      {/* Modal Como Comprar */}
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
