import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { productService } from '../services/api';
import { Search, Filter, Plus, Info, Check, Zap, FileText, X, Layers, Grid, ArrowRight, Trash2, RotateCcw } from 'lucide-react';
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
  
  // Estado de Abas (Geral vs Novara)
  const [activeTab, setActiveTab] = useState<'general' | 'novara'>('general');

  // Estados de Paginação / Infinite Scroll
  const [visibleCount, setVisibleCount] = useState(24);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Estados do Construtor Novara
  const [novaraStep, setNovaraStep] = useState<1 | 2>(1); // 1 = Placa, 2 = Módulos
  const [selectedPlate, setSelectedPlate] = useState<Product | null>(null);
  const [selectedModules, setSelectedModules] = useState<{product: Product, qty: number}[]>([]);
  
  // Estado para o Modal de Detalhes
  const [selectedProductForInfo, setSelectedProductForInfo] = useState<Product | null>(null);

  // Filter States (Geral)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [selectedLine, setSelectedLine] = useState<string>('all');
  const [selectedAmperage, setSelectedAmperage] = useState<string>('all');

  // Filter States (Novara Builder)
  const [novaraSearch, setNovaraSearch] = useState('');
  const [novaraColor, setNovaraColor] = useState('all');
  const [novaraAmperage, setNovaraAmperage] = useState('all');
  const [novaraModuleCategory, setNovaraModuleCategory] = useState('all');

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (activeTab === 'general') {
      filterProducts();
    }
  }, [searchTerm, selectedCategory, selectedSubCategory, selectedLine, selectedAmperage, products, activeTab]);

  // Observer para Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 24);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [filteredProducts, activeTab, visibleCount]);

  const loadProducts = async () => {
    const data = await productService.getAll();
    setProducts(data);
    setFilteredProducts(data);
    setLoading(false);
  };

  const filterProducts = () => {
    let result = products;

    // Filter by Search Text (Code, Desc, Ref)
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.code.toLowerCase().includes(lower) ||
        p.description.toLowerCase().includes(lower) ||
        p.reference.toLowerCase().includes(lower)
      );
    }

    // Filter by Category
    if (selectedCategory !== 'all') {
      result = result.filter(p => p.category === selectedCategory);
    }

    // Filter by SubCategory
    if (selectedSubCategory !== 'all') {
      result = result.filter(p => p.subcategory === selectedSubCategory);
    }

    // Filter by Line
    if (selectedLine !== 'all') {
      result = result.filter(p => p.line === selectedLine);
    }

    // Filter by Amperage (Novo Filtro)
    if (selectedAmperage !== 'all') {
      result = result.filter(p => p.amperage === selectedAmperage);
    }

    setFilteredProducts(result);
    setVisibleCount(24); // Reseta a paginação ao filtrar
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    setAddedIds(prev => [...prev, product.id]);
    setTimeout(() => {
      setAddedIds(prev => prev.filter(id => id !== product.id));
    }, 1500);
  };

  // --- NOVARA BUILDER LOGIC ---

  const getNovaraProducts = () => {
    // Base filter: Line must contain "Novara" (case insensitive)
    let novaraItems = products.filter(p => p.line && p.line.toLowerCase().includes('novara'));

    if (novaraStep === 1) {
      // Step 1: Placas only
      novaraItems = novaraItems.filter(p => p.category.toLowerCase().includes('placa'));
    } else {
      // Step 2: Everything else (Modules)
      novaraItems = novaraItems.filter(p => !p.category.toLowerCase().includes('placa'));
      
      // Filtro de Categoria do Módulo
      if (novaraModuleCategory !== 'all') {
        novaraItems = novaraItems.filter(p => p.category === novaraModuleCategory);
      }
    }

    // Common Filters for Novara Steps
    if (novaraSearch) {
      const lower = novaraSearch.toLowerCase();
      novaraItems = novaraItems.filter(p => 
        p.code.toLowerCase().includes(lower) ||
        p.description.toLowerCase().includes(lower)
      );
    }

    if (novaraColor !== 'all') {
       novaraItems = novaraItems.filter(p => p.colors && p.colors.includes(novaraColor));
    }

    if (novaraAmperage !== 'all') {
      novaraItems = novaraItems.filter(p => p.amperage === novaraAmperage);
    }

    return novaraItems;
  };

  const addModuleToKit = (product: Product) => {
    setSelectedModules(prev => {
      const existing = prev.find(m => m.product.id === product.id);
      if (existing) {
        return prev.map(m => m.product.id === product.id ? { ...m, qty: m.qty + 1 } : m);
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const removeModuleFromKit = (productId: string) => {
    setSelectedModules(prev => prev.filter(m => m.product.id !== productId));
  };

  const addKitToCart = () => {
    if (selectedPlate) {
      addToCart(selectedPlate);
    }
    selectedModules.forEach(item => {
      for(let i=0; i<item.qty; i++) {
        addToCart(item.product);
      }
    });
    
    // Reset
    alert("Kit Novara adicionado ao carrinho!");
    setSelectedPlate(null);
    setSelectedModules([]);
    setNovaraStep(1);
    setActiveTab('general'); // Volta pro geral ou fica no novara limpo
  };

  // --- DROPDOWNS ---
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];
  const subcategories = ['all', ...Array.from(new Set(
    products
      .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
      .map(p => p.subcategory)
  ))];
  const lines = ['all', ...Array.from(new Set(products.map(p => p.line)))];
  const amperages = ['all', ...Array.from(new Set(products.map(p => p.amperage).filter(Boolean) as string[]))];

  // Novara Specific Colors
  const novaraColorsAvailable = ['all', 'Branco', 'Preto', 'Cinza', 'Fendi', 'Ouro', 'Prata']; 
  const novaraModuleCategories = ['all', ...Array.from(new Set(products.filter(p => p.line && p.line.toLowerCase().includes('novara') && !p.category.toLowerCase().includes('placa')).map(p => p.category)))];

  // Common dark input style
  const darkInputStyle = "bg-gray-700 text-white border-gray-600 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500";

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Catálogo Digital</h2>
            <p className="text-gray-600">Explore nossa linha completa.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowHelp(true)}>
            <Info className="h-4 w-4 mr-2" />
            Como Comprar?
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg w-full md:w-auto self-start">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'general' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <div className="flex items-center justify-center">
              <Grid className="w-4 h-4 mr-2"/>
              Catálogo Geral
            </div>
          </button>
          <button
            onClick={() => setActiveTab('novara')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'novara' ? 'bg-slate-800 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <div className="flex items-center justify-center">
              <Layers className="w-4 h-4 mr-2"/>
              Monte sua Novara
            </div>
          </button>
        </div>
      </div>

      {/* === GENERAL CATALOG VIEW === */}
      {activeTab === 'general' && (
        <>
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col lg:flex-row gap-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className={`block w-full pl-10 pr-3 py-2 border rounded-md leading-5 sm:text-sm focus:outline-none focus:ring-1 ${darkInputStyle}`}
                placeholder="Buscar por código, nome ou referência..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400 hidden lg:block" />
                <select
                  className={`block w-full sm:w-40 pl-3 pr-8 py-2 text-base border rounded-md focus:outline-none sm:text-sm ${darkInputStyle}`}
                  value={selectedCategory}
                  onChange={(e) => { setSelectedCategory(e.target.value); setSelectedSubCategory('all'); }}
                >
                  <option value="all">Todas Cats</option>
                  {categories.filter(c => c !== 'all').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <select
                  className={`block w-full sm:w-40 pl-3 pr-8 py-2 text-base border rounded-md focus:outline-none sm:text-sm ${darkInputStyle}`}
                  value={selectedSubCategory}
                  onChange={(e) => setSelectedSubCategory(e.target.value)}
                >
                  <option value="all">Todas Subcats</option>
                  {subcategories.filter(c => c !== 'all').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <select
                  className={`block w-full sm:w-40 pl-3 pr-8 py-2 text-base border rounded-md focus:outline-none sm:text-sm ${darkInputStyle}`}
                  value={selectedLine}
                  onChange={(e) => setSelectedLine(e.target.value)}
                >
                  <option value="all">Todas Linhas</option>
                  {lines.filter(c => c !== 'all').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <select
                  className={`block w-full sm:w-28 pl-3 pr-8 py-2 text-base border rounded-md focus:outline-none sm:text-sm ${darkInputStyle}`}
                  value={selectedAmperage}
                  onChange={(e) => setSelectedAmperage(e.target.value)}
                >
                  <option value="all">Amperagem</option>
                  {amperages.filter(c => c !== 'all').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="text-center py-12">Carregando produtos...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
              Nenhum produto encontrado com estes filtros.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                {filteredProducts.slice(0, visibleCount).map(product => (
                  <div key={product.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200 flex flex-col h-full border border-gray-100">
                    {/* Aspect Ratio container */}
                    <div className="relative w-full pt-[100%] bg-gray-200 rounded-t-lg overflow-hidden">
                      <img
                        src={product.imageUrl}
                        alt={product.description}
                        className="absolute top-0 left-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                      <span className="absolute top-2 right-2 bg-slate-800 text-white text-[10px] md:text-xs px-1.5 py-0.5 md:px-2 md:py-1 rounded opacity-90">
                        {product.code}
                      </span>
                      {product.amperage && (
                        <span className="absolute bottom-2 left-2 bg-yellow-500 text-white text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center">
                            <Zap className="h-3 w-3 mr-0.5" fill="currentColor" /> {product.amperage}
                        </span>
                      )}
                    </div>
                    
                    <div className="p-3 md:p-4 flex-grow flex flex-col">
                      <div className="mb-1 md:mb-2">
                        <span className="text-[10px] md:text-xs font-semibold text-blue-600 uppercase tracking-wide truncate block">
                          {product.category} • {product.line}
                        </span>
                        <div className="text-[10px] md:text-xs text-gray-500 hidden sm:block">{product.subcategory}</div>
                      </div>
                      
                      <h3 className="text-sm md:text-lg font-medium text-gray-900 mb-1 line-clamp-2 leading-tight" title={product.description}>
                        {product.description}
                      </h3>
                      
                      {/* Referência e Amperagem */}
                      <div className="flex items-center flex-wrap gap-2 mb-2 md:mb-3">
                        <p className="text-xs md:text-sm text-gray-500">Ref: {product.reference}</p>
                        {product.amperage && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            {product.amperage}
                          </span>
                        )}
                      </div>
                      
                      {product.colors && product.colors.length > 0 && (
                        <div className="flex gap-1 mb-2 md:mb-4 flex-wrap">
                          {product.colors.slice(0, 3).map(color => (
                            <span key={color} className="inline-block px-1.5 py-0.5 rounded text-[9px] md:text-[10px] bg-gray-100 text-gray-700 border border-gray-200">
                              {color}
                            </span>
                          ))}
                          {product.colors.length > 3 && (
                            <span className="text-[9px] md:text-[10px] text-gray-400 self-center">+{product.colors.length - 3}</span>
                          )}
                        </div>
                      )}

                      <div className="mt-auto pt-2 md:pt-4 space-y-2">
                        {/* Botão de Informações */}
                        {product.details && (
                          <Button 
                            variant="outline" 
                            className="w-full text-xs py-1 h-8" 
                            onClick={() => setSelectedProductForInfo(product)}
                          >
                            <Info className="h-3 w-3 mr-1.5" /> INFORMAÇÕES SOBRE O PRODUTO
                          </Button>
                        )}

                        <Button 
                          variant={addedIds.includes(product.id) ? "secondary" : "primary"}
                          className="w-full text-xs md:text-sm py-1.5 md:py-2"
                          size="sm"
                          onClick={() => handleAddToCart(product)}
                          disabled={addedIds.includes(product.id)}
                        >
                          {addedIds.includes(product.id) ? (
                            <><Check className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Adicionado</>
                          ) : (
                            <><Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Adicionar</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Loader Sentinela para Infinite Scroll */}
              {visibleCount < filteredProducts.length && (
                <div ref={observerTarget} className="col-span-full py-8 text-center flex justify-center items-center text-gray-500 text-sm">
                   <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                   Carregando mais produtos...
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* === NOVARA BUILDER VIEW === */}
      {activeTab === 'novara' && (
        <div className="flex flex-col md:flex-row gap-6 h-full">
          
          {/* Main Area: Selection Grid */}
          <div className="flex-1">
             
             {/* Stepper Header */}
             <div className="bg-slate-800 text-white p-4 rounded-lg mb-4 flex items-center justify-between shadow-lg">
                <div>
                   <h3 className="text-lg font-bold flex items-center">
                     {novaraStep === 1 ? '1. Escolha sua Placa' : '2. Adicione os Módulos'}
                   </h3>
                   <p className="text-xs text-slate-300">
                     {novaraStep === 1 ? 'Selecione o modelo da placa Novara para começar.' : 'Agora personalize com tomadas, interruptores e mais.'}
                   </p>
                </div>
                <div className="flex items-center gap-2">
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${novaraStep === 1 ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>1</div>
                   <div className="w-8 h-1 bg-slate-600"></div>
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${novaraStep === 2 ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>2</div>
                </div>
             </div>

             {/* Novara Filters */}
             <div className="bg-white p-3 rounded-lg border border-gray-200 mb-4 flex gap-2 flex-wrap items-center">
                <div className="relative flex-grow min-w-[200px]">
                   <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
                   <input
                      type="text"
                      className="w-full pl-8 pr-2 py-1.5 text-sm border rounded bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder={`Buscar ${novaraStep === 1 ? 'placa' : 'módulo'}...`}
                      value={novaraSearch}
                      onChange={(e) => setNovaraSearch(e.target.value)}
                   />
                </div>
                
                <select 
                  className="p-1.5 text-sm border rounded bg-gray-50"
                  value={novaraColor}
                  onChange={(e) => setNovaraColor(e.target.value)}
                >
                  <option value="all">Todas Cores</option>
                  {novaraColorsAvailable.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                {novaraStep === 2 && (
                  <>
                    <select 
                      className="p-1.5 text-sm border rounded bg-gray-50"
                      value={novaraAmperage}
                      onChange={(e) => setNovaraAmperage(e.target.value)}
                    >
                      <option value="all">Todas Amperagens</option>
                      {amperages.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <select 
                      className="p-1.5 text-sm border rounded bg-gray-50 max-w-[150px]"
                      value={novaraModuleCategory}
                      onChange={(e) => setNovaraModuleCategory(e.target.value)}
                    >
                      <option value="all">Tipo de Módulo</option>
                      {novaraModuleCategories.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </>
                )}
             </div>

             {/* Grid Items */}
             <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
               {getNovaraProducts().map(product => (
                 <div 
                    key={product.id} 
                    className={`bg-white border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all
                      ${selectedPlate?.id === product.id ? 'ring-2 ring-blue-500' : ''}
                    `}
                    onClick={() => {
                      if (novaraStep === 1) {
                        setSelectedPlate(product);
                        setNovaraStep(2);
                      } else {
                        addModuleToKit(product);
                      }
                    }}
                 >
                   <div className="relative pt-[100%] bg-gray-100">
                      <img src={product.imageUrl} className="absolute inset-0 w-full h-full object-cover" alt="" />
                      {novaraStep === 2 && (
                        <div className="absolute bottom-2 right-2 bg-blue-600 text-white p-1 rounded-full shadow-lg hover:bg-blue-700">
                          <Plus className="h-4 w-4"/>
                        </div>
                      )}
                   </div>
                   <div className="p-3">
                      <div className="text-xs text-blue-600 font-bold uppercase mb-1">{product.category}</div>
                      <h4 className="font-medium text-sm text-gray-800 line-clamp-2">{product.description}</h4>
                      <p className="text-xs text-gray-500 mt-1">{product.code}</p>
                      
                      {product.colors && (
                        <div className="flex gap-1 mt-2">
                           {product.colors.slice(0,3).map(c => (
                             <span key={c} className="text-[9px] bg-gray-100 px-1 rounded border">{c}</span>
                           ))}
                        </div>
                      )}
                   </div>
                 </div>
               ))}
               
               {getNovaraProducts().length === 0 && (
                 <div className="col-span-full py-12 text-center text-gray-400 bg-gray-50 rounded-lg border border-dashed">
                    Nenhum produto Novara encontrado com estes filtros.
                 </div>
               )}
             </div>
          </div>

          {/* Sidebar: Kit Summary */}
          <div className="w-full md:w-80 bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col h-fit sticky top-24">
             <div className="p-4 bg-slate-900 text-white rounded-t-lg">
                <h3 className="font-bold flex items-center"><Layers className="h-4 w-4 mr-2"/> Seu Kit Novara</h3>
             </div>
             
             <div className="p-4 flex-grow space-y-4">
                {/* Selected Plate */}
                <div className="border-b pb-4">
                   <p className="text-xs font-bold text-gray-400 uppercase mb-2">Placa Selecionada</p>
                   {selectedPlate ? (
                     <div className="flex items-center gap-3">
                        <img src={selectedPlate.imageUrl} className="w-12 h-12 rounded object-cover border" alt=""/>
                        <div className="flex-1">
                           <div className="text-sm font-bold text-gray-800 line-clamp-1">{selectedPlate.description}</div>
                           <div className="text-xs text-gray-500">{selectedPlate.code}</div>
                           <button onClick={() => { setSelectedPlate(null); setNovaraStep(1); }} className="text-xs text-blue-600 hover:underline mt-1">Alterar</button>
                        </div>
                     </div>
                   ) : (
                     <div className="text-sm text-gray-400 italic bg-gray-50 p-3 rounded text-center border border-dashed">
                        Nenhuma placa selecionada
                     </div>
                   )}
                </div>

                {/* Selected Modules */}
                <div>
                   <div className="flex justify-between items-center mb-2">
                      <p className="text-xs font-bold text-gray-400 uppercase">Módulos ({selectedModules.reduce((a,b) => a + b.qty, 0)})</p>
                      {selectedModules.length > 0 && (
                        <button onClick={() => setSelectedModules([])} className="text-xs text-red-500 hover:text-red-700 flex items-center">
                           <Trash2 className="h-3 w-3 mr-1"/> Limpar
                        </button>
                      )}
                   </div>
                   
                   <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {selectedModules.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded border">
                           <div className="flex-1 min-w-0 mr-2">
                              <div className="text-xs font-medium truncate">{item.product.description}</div>
                              <div className="text-[10px] text-gray-500">{item.product.code}</div>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-xs font-bold bg-white px-2 py-0.5 rounded border">x{item.qty}</span>
                             <button onClick={() => removeModuleFromKit(item.product.id)} className="text-gray-400 hover:text-red-500"><X className="h-3 w-3"/></button>
                           </div>
                        </div>
                      ))}
                      {selectedModules.length === 0 && (
                        <div className="text-xs text-gray-400 italic text-center py-4">Adicione módulos na etapa 2</div>
                      )}
                   </div>
                </div>
             </div>

             <div className="p-4 border-t bg-gray-50 rounded-b-lg space-y-2">
                <Button 
                   className="w-full" 
                   disabled={!selectedPlate}
                   onClick={addKitToCart}
                >
                   Adicionar Kit ao Carrinho
                </Button>
                {novaraStep === 2 && (
                   <Button variant="secondary" className="w-full" size="sm" onClick={() => setNovaraStep(1)}>
                     <RotateCcw className="h-3 w-3 mr-2"/> Voltar para Placas
                   </Button>
                )}
             </div>
          </div>

        </div>
      )}

      {/* Product Details Modal (Shared) */}
      {selectedProductForInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[70] backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full relative overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600"/> Detalhes do Produto
              </h3>
              <button onClick={() => setSelectedProductForInfo(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6"/>
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
               <div className="flex items-center mb-6">
                 <img src={selectedProductForInfo.imageUrl} className="h-20 w-20 object-cover rounded bg-gray-100 border mr-4" alt=""/>
                 <div>
                   <h4 className="font-bold text-gray-900">{selectedProductForInfo.description}</h4>
                   <p className="text-sm text-gray-500">Código: {selectedProductForInfo.code}</p>
                   <p className="text-sm text-gray-500">Ref: {selectedProductForInfo.reference}</p>
                 </div>
               </div>
               
               <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">
                 {selectedProductForInfo.details}
               </div>
            </div>

            <div className="p-4 border-t bg-gray-50 text-right">
              <Button onClick={() => setSelectedProductForInfo(null)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
            <button 
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <span className="text-2xl">&times;</span>
            </button>
            <h3 className="text-xl font-bold mb-4">Como Gerar um Pedido</h3>
            <ol className="list-decimal pl-5 space-y-3 text-gray-700">
              <li>Navegue pelo catálogo e use os filtros para encontrar os produtos desejados.</li>
              <li>Use a aba <strong>"Monte sua Novara"</strong> para configurar conjuntos completos desta linha.</li>
              <li>Clique em "Adicionar" nos itens que deseja.</li>
              <li>Vá até o ícone do carrinho no topo da página.</li>
              <li>Revise as quantidades.</li>
              <li>Preencha seus dados e da sua revenda.</li>
              <li>Selecione o Representante que atende sua região e envie o pedido.</li>
            </ol>
            <div className="mt-6 text-right">
              <Button onClick={() => setShowHelp(false)}>Entendi</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};