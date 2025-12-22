
import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { productService } from '../services/api';
import { Search, Info, Check, Plus, Layers, Grid, ShoppingCart, FileText, X } from 'lucide-react';
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

  const getNovaraProducts = () => {
    let novaraItems = products.filter(p => p.line?.toLowerCase().includes('novara') || p.description?.toLowerCase().includes('novara'));
    
    if (novaraStep === 1) {
      novaraItems = novaraItems.filter(p => isPlateProduct(p));
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
            <Info className="h-4 w-4 mr-2" /> Como Comprar?
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
                <div key={product.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-100 flex flex-col h-full overflow-hidden">
                  <div className="relative pt-[100%] bg-slate-50">
                    <img src={product.imageUrl} alt={product.description} className="absolute inset-0 w-full h-full object-contain p-2" loading="lazy" />
                    <span className="absolute top-1.5 right-1.5 bg-slate-900/80 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">{product.code}</span>
                  </div>
                  <div className="p-3 md:p-4 flex-grow flex flex-col">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[9px] md:text-[10px] font-bold text-blue-600 uppercase tracking-wider">{product.line}</span>
                    </div>
                    <h3 className="text-xs md:text-sm font-bold text-slate-900 mb-1 line-clamp-2 leading-tight h-8 md:h-10">{product.description}</h3>
                    <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase truncate">Ref: {product.reference}</p>
                    <div className="mt-3 pt-2 border-t border-slate-50">
                      <Button variant={addedIds.includes(product.id) ? "secondary" : "primary"} className="w-full text-[10px] md:text-xs h-8 md:h-9" onClick={() => handleAddToCart(product)} disabled={addedIds.includes(product.id)}>
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
             <div className="bg-slate-800 text-white p-5 rounded-xl mb-4 flex items-center justify-between shadow-lg">
                <div>
                   <h3 className="text-lg font-bold">Passo {novaraStep}: {novaraStep === 1 ? 'Escolha sua Placa' : 'Personalize seu Kit'}</h3>
                </div>
                <div className="flex items-center gap-2">
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${novaraStep === 1 ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>1</div>
                   <div className="w-6 h-0.5 bg-slate-600"></div>
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${novaraStep === 2 ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>2</div>
                </div>
             </div>

             <div className="bg-white p-3 rounded-xl border border-slate-200 mb-4">
                <input type="text" className="w-full px-3 py-2 text-sm border rounded bg-slate-50 text-slate-900 focus:outline-none" placeholder="Buscar no kit..." value={novaraSearch} onChange={(e) => setNovaraSearch(e.target.value)} />
             </div>

             <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
               {getNovaraProducts().map(product => {
                 const isPlate = isPlateProduct(product);
                 return (
                   <div key={product.id} className={`bg-white border rounded-xl overflow-hidden hover:border-blue-500 transition-all ${selectedPlate?.id === product.id ? 'ring-2 ring-blue-500' : ''}`}>
                     <div className="relative pt-[100%] bg-slate-50">
                        <img src={product.imageUrl} className="absolute inset-0 w-full h-full object-contain p-2" alt="" />
                        <span className="absolute top-2 left-2 bg-slate-900/90 text-white text-[9px] px-2 py-0.5 rounded font-bold uppercase z-10">{product.code}</span>
                     </div>
                     <div className="p-2 md:p-3">
                        <h4 className="font-bold text-[11px] md:text-xs text-slate-800 line-clamp-2 min-h-[32px]">{product.description}</h4>
                        <div className="mt-3 flex flex-col gap-1.5">
                          {isPlate ? (
                             <>
                               <Button size="sm" className="w-full text-[9px] md:text-[10px] h-7 md:h-8" onClick={() => { setSelectedPlate(product); setNovaraStep(2); }}>
                                  {selectedPlate?.id === product.id ? 'Placa do Kit' : 'Usar Placa'}
                               </Button>
                               {novaraStep === 2 && (
                                 <Button size="sm" className="w-full text-[9px] md:text-[10px] h-7 md:h-8 bg-green-600 hover:bg-green-700 text-white border-none" onClick={() => handleAddToCart(product)}>
                                    Avulsa
                                 </Button>
                               )}
                             </>
                          ) : (
                             <Button size="sm" className="w-full text-[9px] md:text-[10px] h-7 md:h-8" onClick={() => {
                                setSelectedModules(prev => {
                                  const ex = prev.find(m => m.product.id === product.id);
                                  return ex ? prev.map(m => m.product.id === product.id ? {...m, qty: m.qty+1} : m) : [...prev, {product, qty:1}];
                                });
                             }}>
                                + No Kit
                             </Button>
                          )}
                        </div>
                     </div>
                   </div>
                 );
               })}
             </div>
          </div>

          <div className="w-full lg:w-80 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col h-fit sticky top-24">
             <div className="p-4 bg-slate-900 text-white rounded-t-xl flex justify-between items-center">
                <h3 className="font-bold text-sm flex items-center"><Layers className="h-4 w-4 mr-2"/> Meu Conjunto</h3>
                {selectedPlate && <button onClick={() => { setSelectedPlate(null); setSelectedModules([]); setNovaraStep(1); }} className="text-[10px] text-blue-400 hover:underline">Reiniciar</button>}
             </div>
             <div className="p-5 space-y-5">
                <div className="border-b border-slate-100 pb-4">
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Base Selecionada</p>
                   {selectedPlate ? (
                     <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <img src={selectedPlate.imageUrl} className="w-10 h-10 rounded object-contain border bg-white" alt=""/>
                        <div className="flex-1 min-w-0">
                           <div className="text-[11px] font-bold text-slate-900 truncate">{selectedPlate.description}</div>
                        </div>
                     </div>
                   ) : (
                     <div className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-lg text-center border border-dashed border-slate-200">Selecione uma placa</div>
                   )}
                </div>
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Módulos ({selectedModules.reduce((a,b) => a+b.qty, 0)})</p>
                   <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                      {selectedModules.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                           <div className="text-[10px] font-bold text-slate-700 truncate mr-2">{item.product.description}</div>
                           <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black">x{item.qty}</span>
                             <button onClick={() => setSelectedModules(prev => prev.filter(m => m.product.id !== item.product.id))} className="text-slate-300 hover:text-red-500"><X className="h-3 w-3"/></button>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
             <div className="p-4 bg-slate-50 rounded-b-xl border-t border-slate-100">
                <Button className="w-full h-12 text-sm font-bold" disabled={!selectedPlate} onClick={() => {
                   if (selectedPlate) addToCart(selectedPlate);
                   selectedModules.forEach(m => { for(let i=0; i<m.qty; i++) addToCart(m.product); });
                   alert("Kit adicionado ao carrinho!");
                   setSelectedPlate(null); setSelectedModules([]); setNovaraStep(1); setActiveTab('general');
                }}>Adicionar Kit ao Carrinho</Button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
