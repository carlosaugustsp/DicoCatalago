import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { productService } from '../services/api';
import { Search, Filter, Plus, Info, Check, Zap, FileText, X, Layers, Grid, ArrowRight, Trash2, RotateCcw, AlertCircle, ShoppingCart } from 'lucide-react';
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
    setLoading(true);
    try {
      const data = await productService.getAll();
      setProducts(data);
      setFilteredProducts(data);
    } catch (e) {
      console.error("Erro ao carregar produtos:", e);
    } finally {
      setLoading(false);
    }
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

    // Filter by Amperage
    if (selectedAmperage !== 'all') {
      result = result.filter(p => p.amperage === selectedAmperage);
    }

    setFilteredProducts(result);
    setVisibleCount(24);
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    setAddedIds(prev => [...prev, product.id]);
    setTimeout(() => {
      setAddedIds(prev => prev.filter(id => id !== product.id));
    }, 1500);
  };

  // --- NOVARA BUILDER LOGIC ---

  const isNovaraProduct = (p: Product) => {
      const text = [p.line, p.description, p.reference, p.code].filter(Boolean).join(' ').toLowerCase();
      return text.includes('novara');
  };

  const isPlateProduct = (p: Product) => {
      const text = [p.category, p.subcategory, p.description].filter(Boolean).join(' ').toLowerCase();
      if (text.includes('módulo') || text.includes('modulo')) {
          return false;
      }
      return text.includes('placa') || text.includes('suporte') || text.includes('espelho');
  };

  const getNovaraProducts = () => {
    let novaraItems = products.filter(p => isNovaraProduct(p));

    if (novaraStep === 1) {
      novaraItems = novaraItems.filter(p => isPlateProduct(p));
    } else {
      novaraItems = novaraItems.filter(p => !isPlateProduct(p));
      if (novaraModuleCategory !== 'all') {
        novaraItems = novaraItems.filter(p => p.category === novaraModuleCategory);
      }
    }

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
    
    alert("Kit Novara adicionado ao carrinho!");
    setSelectedPlate(null);
    setSelectedModules([]);
    setNovaraStep(1);
    setActiveTab('general');
  };

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];
  const subcategories = ['all', ...Array.from(new Set(
    products
      .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
      .map(p => p.subcategory)
  ))];
  const lines = ['all', ...Array.from(new Set(products.map(p => p.line)))];
  const amperages = ['all', ...Array.from(new Set(products.map(p => p.amperage).filter(Boolean) as string[]))];

  const allNovaraProducts = products.filter(p => isNovaraProduct(p));
  const novaraColorsAvailable = ['all', ...Array.from(new Set(
    allNovaraProducts.flatMap(p => p.colors || [])
  )).sort()];
  const novaraModuleCategories = ['all', ...Array.from(new Set(
    allNovaraProducts.filter(p => !isPlateProduct(p)).map(p => p.category)
  )).sort()];

  const darkInputStyle = "bg-gray-700 text-white border-gray-600 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500";

  return (
    <div className="space-y-6">
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
            onClick={() => {
               setActiveTab('novara');
               if (!selectedPlate) setNovaraStep(1);
            }}
            className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'novara' ? 'bg-slate-800 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <div className="flex items-center justify-center">
              <Layers className="w-4 h-4 mr-2"/>
              Monte sua Novara
            </div>
          </button>
        </div>
      </div>

      {activeTab === 'general' && (
        <>
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

          {loading ? (
            <div className="text-center py-12 flex flex-col items-center">
              <div className="loader mb-4"></div>
              <p className="text-gray-500">Carregando catálogo...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
              Nenhum produto encontrado com estes filtros.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                {filteredProducts.slice(0, visibleCount).map(product => (
                  <div key={product.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200 flex flex-col h-full border border-gray-100">
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
                    </div>
                    
                    <div className="p-3 md:p-4 flex-grow flex flex-col">
                      <div className="mb-1 md:mb-2">
                        <span className="text-[10px] md:text-xs font-semibold text-blue-600 uppercase tracking-wide truncate block">
                          {product.category} • {product.line}
                        </span>
                      </div>
                      
                      <h3 className="text-sm md:text-lg font-medium text-gray-900 mb-1 line-clamp-2 leading-tight">
                        {product.description}
                      </h3>
                      
                      <div className="flex items-center flex-wrap gap-2 mb-2 md:mb-3">
                        <p className="text-xs md:text-sm text-gray-500">Ref: {product.reference}</p>
                        {product.amperage && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            {product.amperage}
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-auto pt-2 md:pt-4 space-y-2">
                        {product.details && (
                          <Button 
                            variant="outline" 
                            className="w-full text-xs py-1 h-8" 
                            onClick={() => setSelectedProductForInfo(product)}
                          >
                            <Info className="h-3 w-3 mr-1.5" /> INFORMAÇÕES
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
              
              {visibleCount < filteredProducts.length && (
                <div ref={observerTarget} className="col-span-full py-8 text-center flex justify-center items-center text-gray-500 text-sm">
                   <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                   Carregando mais...
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'novara' && (
        <div className="flex flex-col md:flex-row gap-6 h-full">
          <div className="flex-1">
             <div className="bg-slate-800 text-white p-4 rounded-lg mb-4 flex items-center justify-between shadow-lg">
                <div>
                   <h3 className="text-lg font-bold">
                     {novaraStep === 1 ? '1. Escolha sua Placa' : '2. Escolha os Módulos'}
                   </h3>
                </div>
                <div className="flex items-center gap-2">
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${novaraStep === 1 ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>1</div>
                   <div className="w-8 h-1 bg-slate-600"></div>
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${novaraStep === 2 ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>2</div>
                </div>
             </div>

             <div className="bg-white p-3 rounded-lg border border-gray-200 mb-4 flex gap-2 flex-wrap items-center">
                <div className="relative flex-grow min-w-[200px]">
                   <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
                   <input
                      type="text"
                      className="w-full pl-8 pr-2 py-1.5 text-sm border rounded bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder={`Buscar...`}
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
                  <select 
                    className="p-1.5 text-sm border rounded bg-gray-50 min-w-[150px]"
                    value={novaraModuleCategory}
                    onChange={(e) => setNovaraModuleCategory(e.target.value)}
                  >
                    <option value="all">Tipo de Módulo</option>
                    {novaraModuleCategories.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
             </div>

             <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
               {getNovaraProducts().map(product => (
                 <div key={product.id} className="bg-white border rounded-lg overflow-hidden transition-all">
                   <div className="relative pt-[100%] bg-gray-100">
                      <img src={product.imageUrl} className="absolute inset-0 w-full h-full object-cover" alt="" />
                   </div>
                   <div className="p-3">
                      <h4 className="font-medium text-sm text-gray-800 line-clamp-2 min-h-[40px]">{product.description}</h4>
                      <p className="text-xs text-gray-500 mt-1 mb-2">{product.code}</p>
                      
                      {novaraStep === 1 ? (
                         <div className="grid grid-cols-2 gap-2 mt-2">
                             <Button 
                                variant={addedIds.includes(product.id) ? "secondary" : "outline"} 
                                size="sm" 
                                className="text-[10px]"
                                onClick={() => handleAddToCart(product)}
                             >
                                {addedIds.includes(product.id) ? <Check className="h-3 w-3"/> : <ShoppingCart className="h-3 w-3"/>}
                                <span className="ml-1">Avulso</span>
                             </Button>
                             <Button 
                                size="sm" 
                                className="text-[10px] bg-blue-600 text-white"
                                onClick={() => { setSelectedPlate(product); setNovaraStep(2); }}
                             >
                                <Layers className="h-3 w-3"/>
                                <span className="ml-1">Montar</span>
                             </Button>
                         </div>
                      ) : (
                         <Button size="sm" className="w-full mt-2" onClick={() => addModuleToKit(product)}>
                            <Plus className="h-3 w-3 mr-1"/> Adicionar
                         </Button>
                      )}
                   </div>
                 </div>
               ))}
             </div>
          </div>

          <div className="w-full md:w-80 bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col h-fit sticky top-24">
             <div className="p-4 bg-slate-900 text-white rounded-t-lg">
                <h3 className="font-bold flex items-center"><Layers className="h-4 w-4 mr-2"/> Seu Kit Novara</h3>
             </div>
             
             <div className="p-4 flex-grow space-y-4">
                <div className="border-b pb-4">
                   <p className="text-xs font-bold text-gray-400 uppercase mb-2">Placa Selecionada</p>
                   {selectedPlate ? (
                     <div className="flex items-center gap-3">
                        <img src={selectedPlate.imageUrl} className="w-12 h-12 rounded object-cover border" alt=""/>
                        <div className="flex-1">
                           <div className="text-sm font-bold text-gray-800 truncate">{selectedPlate.description}</div>
                           <button onClick={() => { setSelectedPlate(null); setNovaraStep(1); }} className="text-xs text-blue-600 hover:underline">Alterar</button>
                        </div>
                     </div>
                   ) : (
                     <p className="text-sm text-gray-400 italic text-center py-2">Selecione uma placa</p>
                   )}
                </div>

                <div>
                   <p className="text-xs font-bold text-gray-400 uppercase mb-2">Módulos</p>
                   <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {selectedModules.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded border">
                           <div className="flex-1 min-w-0 mr-2 text-xs truncate">{item.product.description}</div>
                           <div className="flex items-center gap-2">
                             <span className="text-xs font-bold">x{item.qty}</span>
                             <button onClick={() => removeModuleFromKit(item.product.id)} className="text-red-500"><X className="h-3 w-3"/></button>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>

             <div className="p-4 border-t bg-gray-50 rounded-b-lg space-y-2">
                <Button className="w-full" disabled={!selectedPlate} onClick={addKitToCart}>
                   Adicionar ao Carrinho
                </Button>
                {novaraStep === 2 && (
                   <Button variant="secondary" className="w-full" size="sm" onClick={() => setNovaraStep(1)}>
                     <RotateCcw className="h-3 w-3 mr-2"/> Voltar
                   </Button>
                )}
             </div>
          </div>
        </div>
      )}

      {selectedProductForInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[70] backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full relative overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold">Detalhes do Produto</h3>
              <button onClick={() => setSelectedProductForInfo(null)} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6"/></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
               <div className="flex items-center mb-6">
                 <img src={selectedProductForInfo.imageUrl} className="h-20 w-20 object-cover rounded mr-4" alt=""/>
                 <div>
                   <h4 className="font-bold">{selectedProductForInfo.description}</h4>
                   <p className="text-sm text-gray-500">Ref: {selectedProductForInfo.reference}</p>
                 </div>
               </div>
               <div className="bg-blue-50 p-4 rounded-lg border text-sm text-blue-900 whitespace-pre-wrap">
                 {selectedProductForInfo.details || "Sem informações técnicas adicionais."}
               </div>
            </div>
            <div className="p-4 border-t bg-gray-50 text-right">
              <Button onClick={() => setSelectedProductForInfo(null)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
            <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-gray-400">&times;</button>
            <h3 className="text-xl font-bold mb-4">Guia Rápido</h3>
            <p className="text-gray-600 mb-4">Selecione produtos no catálogo geral ou monte conjuntos completos na aba Novara. Seus itens aparecerão no carrinho para revisão e envio.</p>
            <Button className="w-full" onClick={() => setShowHelp(false)}>Entendi</Button>
          </div>
        </div>
      )}
    </div>
  );
};