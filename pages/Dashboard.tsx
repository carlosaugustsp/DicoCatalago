
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Order, Product, OrderStatus, CRMInteraction, CartItem } from '../types';
import { authService, orderService, productService, userService } from '../services/api';
import { Button } from '../components/Button';
import { Plus, Trash2, Edit2, Search, CheckCircle, Package, Users, X, Printer, User as UserIcon, Lock, LayoutDashboard, ChevronRight, ShoppingBag, Grid, AlertTriangle, Phone, Mail, Upload, Palette, Image as ImageIcon, FileText, Save, PlusCircle, Key } from 'lucide-react';

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
  
  // Estados de Pedido
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editOrderItems, setEditOrderItems] = useState<CartItem[]>([]);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Estados de Produtos/Usuários/Perfil
  const [showProductModal, setShowProductModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [editingUser, setEditingUser] = useState<Partial<User & { password?: string }> | null>(null);
  const [profileData, setProfileData] = useState({ name: user.name, password: '' });

  // Estilo comum para inputs dark solicitado pelo usuário
  const darkInputStyle = "w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all shadow-sm";

  // Carregamento inicial e trocas de aba
  useEffect(() => {
    setLoading(true);
    loadData();
  }, [activeTab]);

  // Atualização silenciosa em background
  useEffect(() => {
    if (!loading) {
        silentRefresh();
    }
  }, [refreshTrigger]);

  const loadData = async () => {
    try {
      const prodData = await productService.getAll();
      setProducts(prodData);
      
      if (activeTab === 'orders') {
        const data = (user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR) 
          ? await orderService.getAll() 
          : await orderService.getByRep(user.id);
        setOrders(data);
      } else if (activeTab === 'users' && user.role === UserRole.ADMIN) {
        const userData = await userService.getAll();
        setUsers(userData);
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  const silentRefresh = async () => {
    try {
        const prodData = await productService.getAll();
        setProducts(prodData);
        if (activeTab === 'orders') {
            const data = (user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR) 
              ? await orderService.getAll() 
              : await orderService.getByRep(user.id);
            setOrders(data);
        }
    } catch (e) {}
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.NEW: return 'bg-blue-600';
      case OrderStatus.IN_PROGRESS: return 'bg-orange-500';
      case OrderStatus.CLOSED: return 'bg-green-600';
      case OrderStatus.CANCELLED: return 'bg-red-600';
      default: return 'bg-slate-700';
    }
  };

  // --- LÓGICA DE PRODUTOS ---
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      if (editingProduct.id) {
        await productService.update(editingProduct as Product);
      } else {
        await productService.create(editingProduct as any);
      }
      setShowProductModal(false);
      setEditingProduct(null);
      loadData();
      alert("Produto salvo com sucesso!");
    } catch (err) {
      alert("Erro ao salvar produto.");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm("Deseja realmente excluir este produto?")) {
      // Otimismo na interface: remove logo da lista local para feedback imediato
      setProducts(prev => prev.filter(p => p.id !== id));
      try {
        await productService.delete(id);
        // Recarrega para garantir sincronia com servidor/storage
        loadData();
      } catch (err) {
        alert("Erro ao excluir produto.");
        loadData(); // Reverte a lista se der erro
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingProduct(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // --- LÓGICA DE USUÁRIOS ---
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      if (editingUser.id) {
        await userService.update(editingUser as any);
      } else {
        await userService.create(editingUser);
      }
      setShowUserModal(false);
      setEditingUser(null);
      loadData();
      alert("Usuário salvo!");
    } catch (err) {
      alert("Erro ao salvar usuário.");
    }
  };

  // --- LÓGICA DE PERFIL ---
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await userService.update({ ...user, name: profileData.name, password: profileData.password });
      alert("Perfil atualizado!");
      setProfileData({ ...profileData, password: '' });
    } catch (err) {
      alert("Erro ao atualizar perfil.");
    }
  };

  // --- OUTRAS FUNÇÕES DE APOIO ---
  const handleStartEditingOrder = () => {
    if (!selectedOrder) return;
    setEditOrderItems([...selectedOrder.items]);
    setIsEditingOrder(true);
  };

  const handleSaveOrderEdit = async () => {
    if (!selectedOrder) return;
    const updatedOrder = { ...selectedOrder, items: editOrderItems };
    await orderService.update(updatedOrder);
    setSelectedOrder(updatedOrder);
    setIsEditingOrder(false);
    loadData();
    alert("Pedido atualizado!");
  };

  const removeOrderItem = (productId: string) => {
    setEditOrderItems(prev => prev.filter(i => i.id !== productId));
  };

  const updateOrderQty = (productId: string, delta: number) => {
    setEditOrderItems(prev => prev.map(item => {
      if (item.id === productId) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const addProductToOrder = (p: Product) => {
    setEditOrderItems(prev => {
      const existing = prev.find(i => i.id === p.id);
      if (existing) {
        return prev.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...p, quantity: 1 }];
    });
    setShowProductSelector(false);
  };

  // --- RENDERS ---
  const renderCRMBoard = () => (
    <div className="flex gap-4 overflow-x-auto pb-6 items-start custom-scrollbar h-[calc(100vh-260px)]">
      {Object.values(OrderStatus).map(status => (
        <div key={status} className="w-[220px] flex-shrink-0 bg-white rounded-xl flex flex-col max-h-full border border-slate-200 shadow-sm overflow-hidden">
          <div className={`p-3 ${getStatusColor(status)} text-white flex justify-between items-center sticky top-0 z-10`}>
            <span className="text-[10px] font-bold uppercase tracking-wider">{status}</span>
            <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold">
               {orders.filter(o => o.status === status).length}
            </span>
          </div>
          <div className="p-3 space-y-3 overflow-y-auto flex-grow bg-slate-50/30 custom-scrollbar">
            {orders.filter(o => o.status === status).map(order => (
              <div key={order.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 cursor-pointer hover:border-blue-500 transition-all group" onClick={() => { setSelectedOrder(order); setIsEditingOrder(false); }}>
                <div className="flex justify-between items-start mb-2">
                   <p className="text-[10px] font-bold text-slate-400">#{order.id.slice(0,8)}</p>
                   <p className="text-[10px] text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <h4 className="font-bold text-slate-900 truncate text-xs mb-2">{order.customerName}</h4>
                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                   <div className="flex items-center text-slate-500 text-[9px] font-bold uppercase">
                      <ShoppingBag className="h-3 w-3 mr-1 text-slate-400"/>
                      {order.items.reduce((acc, item) => acc + item.quantity, 0)} Itens
                   </div>
                   <ChevronRight className="h-3 w-3 text-slate-300 group-hover:text-blue-500 transition-all" />
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
      <div className="flex items-center justify-between no-print">
          <div className="flex items-center gap-4">
             <div className="bg-slate-900 text-white p-3 rounded-lg shadow-md">
               <LayoutDashboard className="h-6 w-6" />
             </div>
             <div>
                <h2 className="text-xl font-bold text-slate-900 uppercase">Gestão Operacional</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{user.role}</p>
             </div>
          </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200 no-print overflow-x-auto">
        {['orders', 'products', 'users', 'profile'].map(tab => (
           (tab !== 'products' || user.role !== UserRole.REPRESENTATIVE) && 
           (tab !== 'users' || user.role === UserRole.ADMIN) && (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`py-4 px-6 text-[11px] font-bold uppercase transition-all relative whitespace-nowrap ${activeTab === tab ? 'text-blue-600' : 'text-slate-400 hover:text-slate-800'}`}>
                {tab === 'orders' ? 'CRM Vendas' : tab === 'products' ? 'Produtos' : tab === 'users' ? 'Equipe' : 'Perfil'}
                {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>}
            </button>
           )
        ))}
      </div>

      <div className="min-h-[50vh]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 text-slate-300">
             <div className="loader mb-4 border-slate-100 border-t-blue-600"></div>
             <p className="text-xs font-bold uppercase tracking-widest">Sincronizando Dados...</p>
          </div>
        ) : (
          <>
            {activeTab === 'orders' && renderCRMBoard()}
            {activeTab === 'products' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-bold text-sm text-slate-700 uppercase tracking-widest">Catálogo de Produtos</h3>
                  <Button size="sm" onClick={() => { setEditingProduct({}); setShowProductModal(true); }}>
                    <Plus className="h-4 w-4 mr-2"/> NOVO PRODUTO
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4">Produto</th>
                        <th className="px-6 py-4">Código</th>
                        <th className="px-6 py-4">Categoria</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 flex items-center gap-3">
                            <img src={p.imageUrl} className="w-10 h-10 object-contain rounded border bg-white" alt=""/>
                            <span className="text-xs font-bold text-slate-900">{p.description}</span>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-500">{p.code}</td>
                          <td className="px-6 py-4 text-xs text-slate-500">{p.category}</td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button onClick={() => { setEditingProduct(p); setShowProductModal(true); }} className="p-2 text-slate-400 hover:text-blue-600"><Edit2 className="h-4 w-4"/></button>
                            <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4"/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {activeTab === 'users' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-bold text-sm text-slate-700 uppercase tracking-widest">Equipe Dicompel</h3>
                  <Button size="sm" onClick={() => { setEditingUser({ role: UserRole.REPRESENTATIVE }); setShowUserModal(true); }}>
                    <Plus className="h-4 w-4 mr-2"/> CADASTRAR MEMBRO
                  </Button>
                </div>
                <div className="divide-y divide-slate-100">
                  {users.map(u => (
                    <div key={u.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <UserIcon className="h-6 w-6"/>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{u.name}</h4>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded ${u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>{u.role}</span>
                        <button onClick={() => { setEditingUser(u); setShowUserModal(true); }} className="p-2 text-slate-400 hover:text-blue-600"><Edit2 className="h-4 w-4"/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === 'profile' && (
                <div className="max-w-2xl bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-blue-600"/> Segurança e Perfil
                </h3>
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Nome Completo</label>
                    <input required type="text" className={darkInputStyle} value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Nova Senha (deixe em branco para manter)</label>
                    <input type="password" placeholder="••••••••" className={darkInputStyle} value={profileData.password} onChange={e => setProfileData({...profileData, password: e.target.value})} />
                  </div>
                  <Button type="submit" className="w-full h-12 font-bold uppercase tracking-widest">ATUALIZAR DADOS</Button>
                </form>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Cadastro/Edição de Produto */}
      {showProductModal && editingProduct && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[110]">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-slate-900 uppercase tracking-widest">{editingProduct.id ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-slate-900"><X className="h-6 w-6"/></button>
            </div>
            <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Descrição do Produto</label>
                <input required type="text" className={darkInputStyle} value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Código Interno</label>
                <input required type="text" className={darkInputStyle} value={editingProduct.code || ''} onChange={e => setEditingProduct({...editingProduct, code: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Referência</label>
                <input required type="text" className={darkInputStyle} value={editingProduct.reference || ''} onChange={e => setEditingProduct({...editingProduct, reference: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Categoria</label>
                <input required type="text" className={darkInputStyle} value={editingProduct.category || ''} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Linha</label>
                <input required type="text" className={darkInputStyle} value={editingProduct.line || ''} onChange={e => setEditingProduct({...editingProduct, line: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Cor</label>
                <input type="text" className={darkInputStyle} value={editingProduct.colors?.join(', ') || ''} placeholder="Ex: Branco, Preto, Cinza" onChange={e => setEditingProduct({...editingProduct, colors: e.target.value.split(',').map(c => c.trim())})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Amperagem</label>
                <select className={darkInputStyle} value={editingProduct.amperage || ''} onChange={e => setEditingProduct({...editingProduct, amperage: e.target.value})}>
                  <option value="" className="bg-slate-800">Selecione Amperagem</option>
                  <option value="10A" className="bg-slate-800">10A</option>
                  <option value="20A" className="bg-slate-800">20A</option>
                  <option value="N/A" className="bg-slate-800">Não se aplica</option>
                </select>
              </div>
              
              <div className="md:col-span-2 space-y-3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Imagem do Produto</label>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                   <div className="w-32 h-32 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center overflow-hidden bg-slate-50">
                      {editingProduct.imageUrl ? (
                        <img src={editingProduct.imageUrl} className="w-full h-full object-contain p-2" alt="Preview"/>
                      ) : (
                        <ImageIcon className="h-8 w-8 text-slate-300"/>
                      )}
                   </div>
                   <div className="flex-1 w-full">
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="product-image-upload" />
                      <label htmlFor="product-image-upload" className="flex items-center justify-center gap-2 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-lg text-xs font-black cursor-pointer transition-all border border-slate-200">
                        <Upload className="h-4 w-4"/> PROCURAR NO COMPUTADOR
                      </label>
                      <p className="text-[9px] text-slate-400 mt-2 text-center sm:text-left italic">PNG, JPG ou JPEG (máx 2MB recomendado)</p>
                   </div>
                </div>
              </div>

              <div className="md:col-span-2 pt-4">
                <Button type="submit" className="w-full h-14 font-bold uppercase tracking-widest">SALVAR PRODUTO NO SISTEMA</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cadastro/Edição de Usuário */}
      {showUserModal && editingUser && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[110]">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-slate-900 uppercase tracking-widest">{editingUser.id ? 'Editar Membro' : 'Novo Membro'}</h3>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-900"><X className="h-6 w-6"/></button>
            </div>
            <form onSubmit={handleSaveUser} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Nome Completo</label>
                <input required type="text" className={darkInputStyle} value={editingUser.name || ''} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">E-mail Dicompel</label>
                <input required type="email" className={darkInputStyle} value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Nível de Acesso</label>
                <select className={darkInputStyle} value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}>
                  {Object.values(UserRole).map(r => <option key={r} value={r} className="bg-slate-800">{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">{editingUser.id ? 'Nova Senha (opcional)' : 'Senha de Acesso'}</label>
                <input required={!editingUser.id} type="password" placeholder="••••••••" className={darkInputStyle} value={editingUser.password || ''} onChange={e => setEditingUser({...editingUser, password: e.target.value})} />
              </div>
              <Button type="submit" className="w-full h-12 font-bold uppercase tracking-widest">FINALIZAR CADASTRADO</Button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Visualização/Edição Pedido */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-3">
                 <h3 className="font-bold text-lg">Pedido #{selectedOrder.id.slice(0,8)}</h3>
                 {isEditingOrder && <span className="bg-blue-100 text-blue-600 text-[10px] font-black uppercase px-2 py-1 rounded">Modo Edição</span>}
              </div>
              <div className="flex gap-2">
                 {!isEditingOrder && (
                   <button onClick={handleStartEditingOrder} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold transition-all">
                      <Edit2 className="h-4 w-4"/> EDITAR PEDIDO
                   </button>
                 )}
                 {isEditingOrder && (
                   <button onClick={handleSaveOrderEdit} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all">
                      <Save className="h-4 w-4"/> SALVAR ALTERAÇÕES
                   </button>
                 )}
                 <button onClick={() => { setSelectedOrder(null); setIsEditingOrder(false); }} className="p-2 text-slate-400 hover:text-slate-900"><X className="h-6 w-6"/></button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                     <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Solicitante</p>
                     <p className="text-lg font-bold text-slate-900">{selectedOrder.customerName}</p>
                     <div className="mt-4 space-y-1">
                        <p className="text-xs text-slate-600 flex items-center gap-2"><Phone className="h-3 w-3"/> {selectedOrder.customerContact}</p>
                        <p className="text-xs text-slate-600 flex items-center gap-2"><Mail className="h-3 w-3"/> {selectedOrder.customerEmail}</p>
                     </div>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                     <p className="text-[10px] font-bold text-slate-400 uppercase mb-4">Status</p>
                     <select className={`w-full h-10 rounded-lg px-3 font-bold uppercase text-[10px] text-white ${getStatusColor(selectedOrder.status)}`} value={selectedOrder.status} onChange={async (e) => { 
                             const upd = { ...selectedOrder, status: e.target.value as OrderStatus }; 
                             await orderService.update(upd); 
                             setSelectedOrder(upd); 
                             silentRefresh(); 
                          }}>
                           {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                  </div>
               </div>

               {selectedOrder.notes && (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                     <p className="text-[10px] font-bold text-yellow-600 uppercase mb-2 flex items-center gap-2"><FileText className="h-3 w-3"/> Observações</p>
                     <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedOrder.notes}</p>
                  </div>
               )}

               <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                     <span className="font-bold text-[10px] text-slate-500 uppercase tracking-widest">Produtos do Pedido</span>
                     {isEditingOrder && (
                        <button onClick={() => setShowProductSelector(true)} className="text-blue-600 hover:text-blue-700 text-[10px] font-black uppercase flex items-center gap-1">
                           <PlusCircle className="h-4 w-4"/> ADICIONAR PRODUTOS
                        </button>
                     )}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {(isEditingOrder ? editOrderItems : selectedOrder.items).map((it, i) => (
                      <div key={it.id + i} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                           <img src={it.imageUrl} className="h-12 w-12 object-contain rounded border bg-white p-1" alt=""/>
                           <div>
                              <p className="text-sm font-bold text-slate-900">{it.description}</p>
                              <p className="text-[10px] text-slate-400">Ref: {it.reference} | {it.code}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-6">
                           <div className="flex items-center gap-3">
                              {isEditingOrder && (
                                <button onClick={() => updateOrderQty(it.id, -1)} className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100">-</button>
                              )}
                              <span className="text-sm font-black text-slate-900 w-12 text-center">{it.quantity} un</span>
                              {isEditingOrder && (
                                <button onClick={() => updateOrderQty(it.id, 1)} className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100">+</button>
                              )}
                           </div>
                           {isEditingOrder && (
                             <button onClick={() => removeOrderItem(it.id)} className="text-red-400 hover:text-red-600 p-2 transition-colors">
                               <Trash2 className="h-5 w-5"/>
                             </button>
                           )}
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Seletor de Produtos para Pedido */}
      {showProductSelector && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[200]">
           <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                 <h4 className="font-black text-slate-900 text-sm uppercase tracking-widest">Adicionar Item ao Pedido</h4>
                 <button onClick={() => setShowProductSelector(false)} className="text-slate-400 hover:text-slate-900"><X className="h-6 w-6"/></button>
              </div>
              <div className="p-4 bg-slate-50">
                 <div className="relative">
                    <Search className="absolute inset-y-0 left-3 h-5 w-5 text-slate-400 my-auto" />
                    <input autoFocus type="text" className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="Buscar por descrição..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                 {products.filter(p => p.description.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                    <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-all cursor-pointer group" onClick={() => addProductToOrder(p)}>
                       <div className="flex items-center gap-4">
                          <img src={p.imageUrl} className="h-10 w-10 object-contain rounded border bg-white p-1" alt=""/>
                          <div>
                             <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{p.description}</p>
                             <p className="text-[10px] text-slate-400">{p.code}</p>
                          </div>
                       </div>
                       <PlusCircle className="h-6 w-6 text-slate-200 group-hover:text-blue-600 transition-all" />
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
