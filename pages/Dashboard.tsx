
import React, { useState, useEffect } from 'react';
import { User, UserRole, Order, Product, OrderStatus, CartItem } from '../types';
import { authService, orderService, productService, userService } from '../services/api';
import { Button } from '../components/Button';
import { Plus, Trash2, Edit2, Search, Package, X, User as UserIcon, LayoutDashboard, ChevronRight, ShoppingBag, Upload, Image as ImageIcon, PlusCircle, Save } from 'lucide-react';

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
  
  const [productManagementSearch, setProductManagementSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [showProductModal, setShowProductModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [editingUser, setEditingUser] = useState<Partial<User & { password?: string }> | null>(null);

  const darkInputStyle = "w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all shadow-sm";

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (!loading) loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    try {
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
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message}`);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditingProduct(prev => prev ? ({ ...prev, imageUrl: reader.result as string }) : null);
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm("Excluir este produto?")) {
      try { await productService.delete(id); loadData(); } catch (err) { alert("Erro ao excluir."); }
    }
  };

  const renderCRMBoard = () => (
    <div className="flex gap-4 overflow-x-auto pb-6 items-start h-[calc(100vh-260px)]">
      {Object.values(OrderStatus).map(status => (
        <div key={status} className="w-[280px] flex-shrink-0 bg-white rounded-2xl flex flex-col max-h-full border shadow-sm">
          <div className={`p-4 ${status === OrderStatus.NEW ? 'bg-blue-600' : status === OrderStatus.IN_PROGRESS ? 'bg-orange-500' : status === OrderStatus.CLOSED ? 'bg-green-600' : 'bg-red-600'} text-white flex justify-between items-center`}>
            <span className="text-[10px] font-black uppercase tracking-widest">{status}</span>
            <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-black">{orders.filter(o => o.status === status).length}</span>
          </div>
          <div className="p-3 space-y-3 overflow-y-auto bg-slate-50/50">
            {orders.filter(o => o.status === status).map(order => (
              <div key={order.id} className="bg-white p-4 rounded-xl border border-slate-100 cursor-pointer hover:border-blue-500" onClick={() => setSelectedOrder(order)}>
                <p className="text-[9px] font-black text-slate-300 uppercase">#{order.id.slice(-6)}</p>
                <h4 className="font-bold text-slate-900 truncate text-xs mb-3">{order.customerName}</h4>
                <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-[10px] text-slate-500 font-black uppercase">
                   <div className="flex items-center"><ShoppingBag className="h-3 w-3 mr-1"/> {order.items.length} PROD</div>
                   <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
         <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg"><LayoutDashboard className="h-6 w-6" /></div>
         <div>
            <h2 className="text-xl font-black text-slate-900 uppercase">Painel Dicompel</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase">{user.role}</p>
         </div>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto no-print">
        {['orders', 'products', 'users', 'profile'].map(tab => (
           (tab !== 'products' || user.role !== UserRole.REPRESENTATIVE) && 
           (tab !== 'users' || user.role === UserRole.ADMIN) && (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`py-4 px-6 text-[10px] font-black uppercase relative ${activeTab === tab ? 'text-blue-600' : 'text-slate-400'}`}>
                {tab === 'orders' ? 'CRM Vendas' : tab === 'products' ? 'Estoque' : tab === 'users' ? 'Equipe' : 'Configurações'}
                {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>}
            </button>
           )
        ))}
      </div>

      <div className="min-h-[50vh]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 text-slate-300"><div className="loader mb-4"></div></div>
        ) : (
          <>
            {activeTab === 'orders' && renderCRMBoard()}
            {activeTab === 'products' && (
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="p-5 bg-slate-50 border-b flex justify-between items-center gap-4">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute inset-y-0 left-3 h-4 w-4 text-slate-400 my-auto" />
                    <input type="text" placeholder="Filtrar estoque..." className="pl-9 pr-4 py-2 border rounded-xl text-xs w-full" value={productManagementSearch} onChange={(e) => setProductManagementSearch(e.target.value)} />
                  </div>
                  <Button size="sm" className="font-black uppercase text-[10px]" onClick={() => { setEditingProduct({ colors: [], amperage: '', category: '', line: '', subcategory: '' }); setShowProductModal(true); }}>
                    <Plus className="h-4 w-4 mr-2"/> NOVO PRODUTO
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b">
                      <tr><th className="px-6 py-4">Produto</th><th className="px-6 py-4">Linha / Cat</th><th className="px-6 py-4 text-right">Ações</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products.filter(p => p.description.toLowerCase().includes(productManagementSearch.toLowerCase())).map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 flex items-center gap-3">
                            <img src={p.imageUrl} className="w-10 h-10 object-contain rounded border p-1" alt=""/>
                            <div><p className="text-xs font-bold text-slate-900">{p.description}</p><p className="text-[9px] text-slate-400 uppercase">{p.code}</p></div>
                          </td>
                          <td className="px-6 py-4">
                             <p className="text-[10px] font-black text-blue-600 uppercase">{p.line}</p>
                             <p className="text-[9px] text-slate-400">{p.category}</p>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex justify-end gap-1">
                                <button onClick={() => { setEditingProduct(p); setShowProductModal(true); }} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg"><Edit2 className="h-4 w-4"/></button>
                                <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg"><Trash2 className="h-4 w-4"/></button>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showProductModal && editingProduct && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[200] no-print">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-10 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl font-black text-slate-900 uppercase">{editingProduct.id ? 'Editar Registro' : 'Novo Registro Técnico'}</h3>
               <button onClick={() => setShowProductModal(false)} className="text-slate-300 hover:text-slate-900"><X className="h-8 w-8"/></button>
            </div>
            <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Descrição Comercial</label>
                <input required type="text" className={darkInputStyle} value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Código Interno</label>
                <input required type="text" className={darkInputStyle} value={editingProduct.code || ''} onChange={e => setEditingProduct({...editingProduct, code: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Referência Fábrica</label>
                <input required type="text" className={darkInputStyle} value={editingProduct.reference || ''} onChange={e => setEditingProduct({...editingProduct, reference: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Categoria</label>
                <input required type="text" className={darkInputStyle} value={editingProduct.category || ''} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Linha Dicompel</label>
                <input required type="text" className={darkInputStyle} value={editingProduct.line || ''} onChange={e => setEditingProduct({...editingProduct, line: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Subcategoria (Opcional)</label>
                <input type="text" className={darkInputStyle} value={editingProduct.subcategory || ''} onChange={e => setEditingProduct({...editingProduct, subcategory: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Amperagem</label>
                <select className={darkInputStyle} value={editingProduct.amperage || ''} onChange={e => setEditingProduct({...editingProduct, amperage: e.target.value})}>
                   <option value="">Nenhuma</option>
                   <option value="10A">10A</option>
                   <option value="20A">20A</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Cores (separadas por vírgula)</label>
                <input type="text" className={darkInputStyle} placeholder="Ex: Branco, Preto, Ouro" value={(editingProduct.colors || []).join(', ')} onChange={e => setEditingProduct({...editingProduct, colors: e.target.value.split(',').map(c => c.trim())})} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Foto Técnica</label>
                <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-800 p-6 rounded-2xl border border-slate-700 border-dashed">
                   {editingProduct.imageUrl ? (
                     <div className="relative w-24 h-24 bg-white rounded-lg p-1 group">
                        <img src={editingProduct.imageUrl} className="w-full h-full object-contain" alt="Preview"/>
                        <button type="button" onClick={() => setEditingProduct({...editingProduct, imageUrl: ''})} className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-5 w-5"/></button>
                     </div>
                   ) : (
                     <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500 bg-slate-900/50"><ImageIcon className="h-8 w-8"/></div>
                   )}
                   <div className="flex-grow w-full">
                      <input type="file" id="prod-img-upload-dash" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      <label htmlFor="prod-img-upload-dash" className="flex items-center justify-center gap-3 w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl cursor-pointer text-[11px] font-black uppercase"><Upload className="h-5 w-5"/> SELECIONAR FOTO</label>
                   </div>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Detalhes Técnicos</label>
                <textarea rows={3} className={darkInputStyle} value={editingProduct.details || ''} onChange={e => setEditingProduct({...editingProduct, details: e.target.value})} />
              </div>
              <div className="md:col-span-2 pt-4"><Button type="submit" className="w-full h-14 font-black uppercase tracking-widest">SALVAR PRODUTO</Button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
