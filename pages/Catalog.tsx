import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { productService } from '../services/api';
import { Search, Filter, Plus, Info, Check } from 'lucide-react';
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

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [selectedLine, setSelectedLine] = useState<string>('all');

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchTerm, selectedCategory, selectedSubCategory, selectedLine, products]);

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

    setFilteredProducts(result);
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    setAddedIds(prev => [...prev, product.id]);
    setTimeout(() => {
      setAddedIds(prev => prev.filter(id => id !== product.id));
    }, 1500);
  };

  // Derive unique lists for dropdowns
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];
  
  // Dynamic Subcategories based on selected Category if possible, else all
  const subcategories = ['all', ...Array.from(new Set(
    products
      .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
      .map(p => p.subcategory)
  ))];

  const lines = ['all', ...Array.from(new Set(products.map(p => p.line)))];

  // Common dark input style
  const darkInputStyle = "bg-gray-700 text-white border-gray-600 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500";

  return (
    <div className="space-y-6">
      {/* Header & Help */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Catálogo de Produtos</h2>
          <p className="text-gray-600">Explore nossa linha completa de materiais elétricos.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowHelp(true)}>
          <Info className="h-4 w-4 mr-2" />
          Como Comprar?
        </Button>
      </div>

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
        /* GRID OPTIMIZED FOR MOBILE: grid-cols-2 with smaller gap on mobile */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200 flex flex-col h-full border border-gray-100">
              {/* Aspect Ratio container */}
              <div className="relative w-full pt-[100%] bg-gray-200 rounded-t-lg overflow-hidden">
                <img
                  src={product.imageUrl}
                  alt={product.description}
                  className="absolute top-0 left-0 w-full h-full object-cover"
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
                  <div className="text-[10px] md:text-xs text-gray-500 hidden sm:block">{product.subcategory}</div>
                </div>
                
                <h3 className="text-sm md:text-lg font-medium text-gray-900 mb-1 line-clamp-2 leading-tight" title={product.description}>
                  {product.description}
                </h3>
                <p className="text-xs md:text-sm text-gray-500 mb-2 md:mb-3">Ref: {product.reference}</p>
                
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

                <div className="mt-auto pt-2 md:pt-4">
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