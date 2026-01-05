
import React, { useState, useEffect } from 'react';
import { User, UserRole, Order, Product, OrderStatus } from '../types';
import { orderService, productService, userService } from '../services/api';
import { Button } from '../components/Button';
import { Plus, Trash2, Edit2, Search, X, LayoutDashboard, ShoppingBag, ImageIcon, Upload, FileSpreadsheet } from 'lucide-react';

interface DashboardProps {
  user: User;
  refreshTrigger?: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, refreshTrigger = 0 }) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'users' | 'profile'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [productSearch, setProductSearch] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  const darkInput = "w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 text-sm";

  useEffect(() => {
    loadData();
  }, [activeTab, refreshTrigger]);

  const loadData = async () => {
    try {
      setLoading(true);
      const prodData = await productService.getAll();
      setProducts(prodData || []);

      if (activeTab === 'orders') {
        const data = (user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR) ? await orderService.getAll() : await orderService.getByRep(user.id);
        setOrders(data || []);
      } else if (activeTab === 'users' && user.role === UserRole.ADMIN) {
        const userData = await userService.getAll();
        setUsers(userData || []);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      if (editingProduct.id) await productService.update(editingProduct as Product);
      else await productService.create(editingProduct as any);
      setShowProductModal(false);
      setEditingProduct(null);
      loadData();
      alert("Produto salvo com sucesso!");
    } catch (err: any) { alert(`Erro: ${err.message}`); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditingProduct(p => p ? ({ ...p, imageUrl: reader.result as string }) : null);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
         <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg"><LayoutDashboard className="h-6 w-6" /></div>
         <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Painel Gestão</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user.role}</p>
         </div>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto no-print">
        {['orders', 'products', 'users', 'profile'].map(tab => (
           (tab !== 'products' || user.role !== UserRole.REPRESENTATIVE) && 
           (tab !== 'users' || user.role === UserRole.ADMIN) && (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`py-4 px-6 text-[10px] font-black uppercase relative transition-all ${activeTab === tab ? 'text-blue-600' : 'text-slate-400'}`}>
                {tab === 'orders' ? 'CRM Vendas' : tab === 'products' ? 'Estoque' : tab === 'users' ? 'Equipe' : 'Configurações'}
                {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>}
            </button>
           )
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center p-20"><div className="loader"></div></div>
      ) : (
        <>
          {activeTab === 'products' && (
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
               <div className="p-5 bg-slate-50 border-b flex justify-between items-center gap-4">
                  <div className="relative w-64">
                    <Search className="absolute inset-y-0 left-3 h-4 w-4 text-slate-400 my-auto" />
                    <input type="text" placeholder="Buscar no estoque..." className="pl-9 pr-4 py-2 border rounded-xl text-xs w-full" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
                  </div>
                  <Button size="sm" className="font-black uppercase text-[10px]" onClick={() => { setEditingProduct({ colors: [], amperage: '', category: '', line: '', details: '' }); setShowProductModal(true); }}>
                    + NOVO PRODUTO
                  </Button>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b">
                      <tr><th className="px-6 py-4">Produto</th><th className="px-6 py-4">Linha</th><th className="px-6 py-4">Amperagem</th><th className="px-6 py-4 text-right">Ações</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products.filter(p => p.description.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 flex items-center gap-3">
                            <img src={p.imageUrl} className="w-10 h-10 object-contain rounded border bg-white" alt=""/>
                            <div><p className="text-xs font-bold text-slate-900">{p.description}</p><p className="text-[9px] text-slate-400 uppercase">{p.code}</p></div>
                          </td>
                          <td className="px-6 py-4"><span className="text-[10px] font-black text-blue-600 uppercase">{p.line}</span></td>
                          <td className="px-6 py-4"><span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded uppercase">{p.amperage || 'N/A'}</span></td>
                          <td className="px-6 py-4 text-right">
                             <button onClick={() => { setEditingProduct(p); setShowProductModal(true); }} className="p-2 text-slate-400 hover:text-blue-600"><Edit2 className="h-4 w-4"/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          )}

          {activeTab === 'orders' && (
             <div className="grid grid-cols-1 gap-4">
                {orders.map(order => (
                   <div key={order.id} className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase">#{order.id.slice(-6)} | {new Date(order.createdAt).toLocaleDateString()}</p>
                         <h4 className="text-sm font-black text-slate-900 uppercase">{order.customerName}</h4>
                      </div>
                      <div className="flex items-center gap-4">
                         <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${order.status === 'Novo' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{order.status}</span>
                         <Button size="sm" variant="outline" className="text-[9px]">Ver Detalhes</Button>
                      </div>
                   </div>
                ))}
             </div>
          )}
        </>
      )}

      {/* MODAL PRODUTO */}
      {showProductModal && editingProduct && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[200]">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full p-10 overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-black text-slate-900 uppercase mb-8">Cadastro Técnico</h3>
            <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Descrição</label>
                <input required type="text" className={darkInput} value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Código</label>
                <input required type="text" className={darkInput} value={editingProduct.code || ''} onChange={e => setEditingProduct({...editingProduct, code: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Amperagem</label>
                <select className={darkInput} value={editingProduct.amperage || ''} onChange={e => setEditingProduct({...editingProduct, amperage: e.target.value})}>
                   <option value="" className="bg-slate-800">N/A</option>
                   <option value="10A" className="bg-slate-800">10A</option>
                   <option value="20A" className="bg-slate-800">20A</option>
                   <option value="Bivolt" className="bg-slate-800">Bivolt</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Linha</label>
                <input required type="text" className={darkInput} value={editingProduct.line || ''} onChange={e => setEditingProduct({...editingProduct, line: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Cor</label>
                <input type="text" className={darkInput} value={editingProduct.colors?.[0] || ''} onChange={e => setEditingProduct({...editingProduct, colors: [e.target.value]})} />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Especificações Técnicas</label>
                <textarea className={darkInput} rows={3} value={editingProduct.details || ''} onChange={e => setEditingProduct({...editingProduct, details: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Imagem</label>
                 <div className="flex items-center gap-4 bg-slate-900 p-6 rounded-2xl border-2 border-dashed border-slate-700">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs text-slate-400" />
                    {editingProduct.imageUrl && <img src={editingProduct.imageUrl} className="w-16 h-16 object-contain bg-white rounded p-1"/>}
                 </div>
              </div>
              <div className="md:col-span-2 flex gap-3 pt-6">
                <Button variant="outline" className="flex-1" onClick={() => setShowProductModal(false)}>CANCELAR</Button>
                <Button type="submit" className="flex-[2]">SALVAR NO BANCO</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
