
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Order, Product, OrderStatus, CRMInteraction, CartItem } from '../types';
import { authService, orderService, productService, userService } from '../services/api';
import { Button } from '../components/Button';
import { Plus, Trash2, Edit2, Search, CheckCircle, Package, Users, X, Printer, User as UserIcon, Lock, LayoutDashboard, ChevronRight, ShoppingBag, Grid, AlertTriangle, Phone, Mail, Upload, Palette, Image as ImageIcon, FileText, Save, PlusCircle, Key, HelpCircle, BookOpen, Lightbulb, Download, FileSpreadsheet, Minus, ShieldCheck } from 'lucide-react';

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
  const [showRepHelp, setShowRepHelp] = useState(false);
  
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

  const darkInputStyle = "w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all shadow-sm";

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [activeTab]);

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
      } else if (activeTab === 'users' && (user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR)) {
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
      alert("Produto salvo!");
    } catch (err) {
      alert("Erro ao salvar.");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm("Deseja realmente excluir este produto?")) {
      try {
        await productService.delete(id);
        loadData();
      } catch (err) {
        alert("Erro ao excluir.");
      }
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    // Proteção de segurança adicional: Supervisor não pode criar/editar Admin
    if (user.role === UserRole.SUPERVISOR && editingUser.role === UserRole.ADMIN) {
      alert("Você não tem permissão para conceder acesso de Administrador.");
      return;
    }

    try {
      if (editingUser.id) {
        await userService.update(editingUser as any);
        alert("Dados do usuário atualizados!");
      } else {
        await userService.create(editingUser);
        alert("Novo usuário cadastrado!");
      }
      setShowUserModal(false);
      setEditingUser(null);
      loadData();
    } catch (err) {
      alert("Erro ao processar usuário.");
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (user.id === id) return alert("Você não pode excluir seu próprio acesso.");
    
    const targetUser = users.find(u => u.id === id);
    if (user.role === UserRole.SUPERVISOR && targetUser?.role === UserRole.ADMIN) {
      return alert("Supervisores não podem excluir administradores.");
    }

    if (confirm("Deseja realmente remover este membro da equipe?")) {
      try {
        await userService.delete(id);
        loadData();
      } catch (err) {
        alert("Erro ao excluir.");
      }
    }
  };

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

  const handleDeleteOrder = async (id: string) => {
    if (confirm("Deseja realmente excluir este pedido permanentemente?")) {
      try {
        await orderService.delete(id);
        setSelectedOrder(null);
        setIsEditingOrder(false);
        loadData();
      } catch (err) {
        alert("Erro ao excluir.");
      }
    }
  };

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
    alert("Pedido atualizado com sucesso!");
  };

  const removeOrderItem = (productId: string) => {
    setEditOrderItems(prev => prev.filter(i => i.id !== productId));
  };

  const updateOrderQty = (productId: string, delta: number) => {
    setEditOrderItems(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
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

  const exportToExcel = (order: Order) => {
    const headers = ['Produto', 'Codigo', 'Referencia', 'Linha', 'Quantidade'];
    const rows = order.items.map(item => [
      item.description,
      item.code,
      item.reference,
      item.line,
      item.quantity.toString()
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pedido_dicompel_${order.id.slice(-6)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printOrder = () => {
    window.print();
  };

  const renderCRMBoard = () => (
    <div className="flex gap-4 overflow-x-auto pb-6 items-start custom-scrollbar h-[calc(100vh-260px)]">
      {Object.values(OrderStatus).map(status => (
        <div key={status} className="w-[240px] flex-shrink-0 bg-white rounded-2xl flex flex-col max-h-full border border-slate-200 shadow-sm overflow-hidden">
          <div className={`p-4 ${getStatusColor(status)} text-white flex justify-between items-center sticky top-0 z-10 shadow-sm`}>
            <span className="text-[10px] font-black uppercase tracking-widest">{status}</span>
            <span className="bg-white/20 px-2.5 py-0.5 rounded-lg text-[10px] font-black">
               {orders.filter(o => o.status === status).length}
            </span>
          </div>
          <div className="p-3 space-y-3 overflow-y-auto flex-grow bg-slate-50/50 custom-scrollbar min-h-[100px]">
            {orders.filter(o => o.status === status).map(order => (
              <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group" onClick={() => { setSelectedOrder(order); setIsEditingOrder(false); }}>
                <div className="flex justify-between items-start mb-2">
                   <p className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">ID: {order.id.slice(-6)}</p>
                   <p className="text-[9px] font-bold text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <h4 className="font-bold text-slate-900 truncate text-xs mb-3">{order.customerName}</h4>
                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                   <div className="flex items-center text-slate-500 text-[10px] font-black uppercase tracking-tighter">
                      <ShoppingBag className="h-3 w-3 mr-1.5 text-slate-400"/>
                      {order.items.reduce((acc, item) => acc + item.quantity, 0)} ITENS
                   </div>
                   <div className="bg-slate-50 group-hover:bg-blue-50 p-1 rounded-lg transition-colors">
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-600" />
                   </div>
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
      <div className="flex items-center justify-between no-print gap-4">
          <div className="flex items-center gap-4">
             <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl">
               <LayoutDashboard className="h-6 w-6" />
             </div>
             <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Gestão Comercial</h2>
                <div className="flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{user.role}</p>
                </div>
             </div>
          </div>
          {user.role === UserRole.REPRESENTATIVE && (
            <button 
              onClick={() => setShowRepHelp(true)} 
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-100"
            >
               <Lightbulb className="h-4 w-4 text-blue-200"/> Fluxo de Atendimento
            </button>
          )}
      </div>

      <div className="flex gap-1 border-b border-slate-200 no-print overflow-x-auto hide-scrollbar">
        {['orders', 'products', 'users', 'profile'].map(tab => (
           (tab !== 'products' || user.role !== UserRole.REPRESENTATIVE) && 
           (tab !== 'users' || (user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR)) && (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`py-4 px-6 text-[10px] font-black uppercase transition-all relative whitespace-nowrap tracking-[0.15em] ${activeTab === tab ? 'text-blue-600' : 'text-slate-400 hover:text-slate-800'}`}>
                {tab === 'orders' ? 'CRM Vendas' : tab === 'products' ? 'Cadastro Produtos' : tab === 'users' ? 'Equipe' : 'Configurações'}
                {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full"></div>}
            </button>
           )
        ))}
      </div>

      <div className="min-h-[50vh]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-24 text-slate-300">
             <div className="loader mb-6 border-slate-100 border-t-blue-600"></div>
             <p className="text-[10px] font-black uppercase tracking-[0.3em]">Sincronizando...</p>
          </div>
        ) : (
          <>
            {activeTab === 'orders' && renderCRMBoard()}
            {activeTab === 'products' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-black text-[11px] text-slate-700 uppercase tracking-widest">Estoque Técnico</h3>
                  <Button size="sm" className="font-black uppercase text-[10px]" onClick={() => { setEditingProduct({}); setShowProductModal(true); }}>
                    <Plus className="h-4 w-4 mr-2"/> NOVO ITEM
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4">Produto</th>
                        <th className="px-6 py-4">Código/Ref</th>
                        <th className="px-6 py-4">Linha/Cat</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-lg border p-1 flex-shrink-0">
                               <img src={p.imageUrl} className="w-full h-full object-contain" alt=""/>
                            </div>
                            <span className="text-xs font-bold text-slate-900">{p.description}</span>
                          </td>
                          <td className="px-6 py-4">
                             <p className="text-[10px] font-black text-slate-500 uppercase">{p.code}</p>
                             <p className="text-[10px] text-slate-400">{p.reference}</p>
                          </td>
                          <td className="px-6 py-4">
                             <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{p.line}</p>
                             <p className="text-[9px] font-medium text-slate-400">{p.category}</p>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex justify-end gap-1">
                                <button onClick={() => { setEditingProduct(p); setShowProductModal(true); }} className="p-2.5 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-xl transition-all"><Edit2 className="h-4 w-4"/></button>
                                <button onClick={() => handleDeleteProduct(p.id)} className="p-2.5 text-slate-400 hover:text-red-600 bg-slate-50 rounded-xl transition-all"><Trash2 className="h-4 w-4"/></button>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {activeTab === 'users' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-black text-[11px] text-slate-700 uppercase tracking-widest">Time Dicompel</h3>
                  <Button size="sm" className="font-black uppercase text-[10px]" onClick={() => { setEditingUser({ role: UserRole.REPRESENTATIVE }); setShowUserModal(true); }}>
                    <Plus className="h-4 w-4 mr-2"/> CADASTRAR MEMBRO
                  </Button>
                </div>
                <div className="divide-y divide-slate-100">
                  {users.map(u => (
                    <div key={u.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                          <UserIcon className="h-7 w-7"/>
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm">{u.name}</h4>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full tracking-widest ${u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-600' : u.role === UserRole.SUPERVISOR ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{u.role}</span>
                        <div className="flex gap-1">
                           {/* Supervisor não pode editar Admin */}
                           {!(user.role === UserRole.SUPERVISOR && u.role === UserRole.ADMIN) ? (
                              <button onClick={() => { setEditingUser(u); setShowUserModal(true); }} className="p-2.5 text-slate-400 hover:text-blue-600 bg-white border rounded-xl shadow-sm transition-all"><Edit2 className="h-4 w-4"/></button>
                           ) : (
                              <div className="p-2.5 text-slate-200 bg-slate-50 border rounded-xl cursor-not-allowed" title="Você não tem permissão para editar um administrador"><Lock className="h-4 w-4"/></div>
                           )}

                           {/* Supervisor não pode excluir Admin ou Supervisor (exceto ele mesmo se fosse permitido, mas aqui restringimos a admin) */}
                           {user.id !== u.id && !(user.role === UserRole.SUPERVISOR && u.role === UserRole.ADMIN) && (
                             <button onClick={() => handleDeleteUser(u.id)} className="p-2.5 text-slate-400 hover:text-red-600 bg-white border rounded-xl shadow-sm transition-all"><Trash2 className="h-4 w-4"/></button>
                           )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === 'profile' && (
                <div className="max-w-xl bg-white rounded-3xl shadow-sm border border-slate-200 p-10">
                <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                  <Lock className="h-6 w-6 text-blue-600"/> Segurança de Acesso
                </h3>
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Nome Completo</label>
                    <input required type="text" className={darkInputStyle} value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Nova Senha Dicompel</label>
                    <input type="password" placeholder="Mudar senha de acesso" className={darkInputStyle} value={profileData.password} onChange={e => setProfileData({...profileData, password: e.target.value})} />
                  </div>
                  <div className="pt-4">
                     <Button type="submit" className="w-full h-14 font-black uppercase tracking-[0.2em] text-xs">ATUALIZAR PERFIL</Button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Cadastro/Edição de Usuário */}
      {showUserModal && editingUser && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[200]">
           <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full p-10 animate-in fade-in zoom-in duration-300">
              <div className="flex justify-between items-center mb-8">
                 <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg">
                       <UserIcon className="h-6 w-6"/>
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{editingUser.id ? 'Editar Membro' : 'Novo Membro'}</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gestão de Time Dicompel</p>
                    </div>
                 </div>
                 <button onClick={() => setShowUserModal(false)} className="text-slate-300 hover:text-slate-900 transition-colors">
                    <X className="h-8 w-8"/>
                 </button>
              </div>

              <form onSubmit={handleSaveUser} className="space-y-6">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Nome Completo</label>
                    <input required type="text" className={darkInputStyle} placeholder="Ex: João da Silva" value={editingUser.name || ''} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
                 </div>
                 
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">E-mail Corporativo</label>
                    <input required type="email" disabled={!!editingUser.id} className={`${darkInputStyle} ${editingUser.id ? 'opacity-50' : ''}`} placeholder="email@dicompel.com.br" value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} />
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Cargo / Função</label>
                       <select className={darkInputStyle} value={editingUser.role || UserRole.REPRESENTATIVE} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}>
                          <option value={UserRole.REPRESENTATIVE}>Representante</option>
                          {/* Supervisor pode criar apenas representantes, mas se ele estiver se editando ou editando outro supervisor, ele vê essa opção */}
                          {user.role === UserRole.SUPERVISOR && editingUser.role === UserRole.SUPERVISOR && (
                             <option value={UserRole.SUPERVISOR}>Supervisor</option>
                          )}
                          {user.role === UserRole.ADMIN && (
                            <>
                               <option value={UserRole.SUPERVISOR}>Supervisor</option>
                               <option value={UserRole.ADMIN}>Administrador</option>
                            </>
                          )}
                       </select>
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Senha Dicompel</label>
                       <div className="relative">
                          {/* Bloqueia troca de senha por supervisor caso ele de alguma forma acesse um admin (já bloqueado na lista) */}
                          <input 
                            type="password" 
                            disabled={user.role === UserRole.SUPERVISOR && editingUser.role === UserRole.ADMIN}
                            className={`${darkInputStyle} ${user.role === UserRole.SUPERVISOR && editingUser.role === UserRole.ADMIN ? 'opacity-50 cursor-not-allowed' : ''}`} 
                            placeholder={editingUser.id ? 'Manter atual' : 'Definir senha'} 
                            value={editingUser.password || ''} 
                            onChange={e => setEditingUser({...editingUser, password: e.target.value})} 
                          />
                          <Key className="absolute right-3 inset-y-0 h-4 w-4 text-slate-600 my-auto" />
                       </div>
                    </div>
                 </div>

                 <div className="pt-6">
                    <Button type="submit" className="w-full h-16 font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-blue-100">
                       {editingUser.id ? 'ATUALIZAR MEMBRO' : 'CADASTRAR MEMBRO'}
                    </Button>
                    {editingUser.id && (
                       <p className="text-center text-[9px] text-slate-400 font-bold uppercase mt-4 tracking-widest">A senha só será alterada se preenchida.</p>
                    )}
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Modal Guia do Representante */}
      {showRepHelp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[2000] no-print">
           <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                       <BookOpen className="h-7 w-7"/>
                    </div>
                    <div>
                       <h3 className="text-xl font-bold">Guia do Representante</h3>
                       <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest">O que fazer com o pedido recebido?</p>
                    </div>
                 </div>
                 <button onClick={() => setShowRepHelp(false)} className="text-white/70 hover:text-white transition-all">
                    <X className="h-8 w-8"/>
                 </button>
              </div>
              <div className="p-10 space-y-8">
                 <div className="flex gap-6">
                    <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black flex-shrink-0 border border-blue-100 shadow-sm">1</div>
                    <div>
                       <h4 className="font-bold text-slate-900 uppercase text-xs tracking-widest mb-1">Validação do Orçamento</h4>
                       <p className="text-xs text-slate-500 leading-relaxed">Fale com o cliente imediatamente para confirmar as especificações e quantidades solicitadas.</p>
                    </div>
                 </div>
                 <div className="flex gap-6">
                    <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black flex-shrink-0 border border-blue-100 shadow-sm">2</div>
                    <div>
                       <h4 className="font-bold text-slate-900 uppercase text-xs tracking-widest mb-1">Mudar para "Em Atendimento"</h4>
                       <p className="text-xs text-slate-500 leading-relaxed">Ao iniciar a negociação, mude o status do pedido. Isso avisa ao supervisor que o cliente já está sendo atendido.</p>
                    </div>
                 </div>
                 <div className="flex gap-6">
                    <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black flex-shrink-0 border border-blue-100 shadow-sm">3</div>
                    <div>
                       <h4 className="font-bold text-slate-900 uppercase text-xs tracking-widest mb-1">Processar no Sistema Fábrica</h4>
                       <p className="text-xs text-slate-500 leading-relaxed">Com o aceite do cliente, insira o pedido no sistema principal da Dicompel para gerar o faturamento oficial.</p>
                    </div>
                 </div>
                 <div className="flex gap-6">
                    <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black flex-shrink-0 border border-blue-100 shadow-sm">4</div>
                    <div>
                       <h4 className="font-bold text-slate-900 uppercase text-xs tracking-widest mb-1">Finalização</h4>
                       <p className="text-xs text-slate-500 leading-relaxed">Assim que a nota fiscal for emitida, retorne ao CRM e altere o status para <b>Finalizado</b> para limpar seu painel.</p>
                    </div>
                 </div>
                 <Button className="w-full h-16 font-black uppercase tracking-[0.2em] mt-4 shadow-xl shadow-blue-50" onClick={() => setShowRepHelp(false)}>ENTENDI, BOM TRABALHO!</Button>
              </div>
           </div>
        </div>
      )}

      {/* Modal Visualização Pedido */}
      {selectedOrder && (
        <>
          {/* Layout de Impressão Oculto no Navegador, Visível no PDF */}
          <div className="hidden print-layout">
             <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8 mb-8">
                <div>
                   <h1 className="text-4xl font-black text-slate-900">DICOMPEL</h1>
                   <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Catálogo Digital & CRM Vendas</p>
                </div>
                <div className="text-right">
                   <h2 className="text-2xl font-black text-slate-900">ORDEM DE SERVIÇO</h2>
                   <p className="text-lg font-bold">#{selectedOrder.id.slice(-8).toUpperCase()}</p>
                   <p className="text-sm text-slate-500">{new Date(selectedOrder.createdAt).toLocaleDateString()} {new Date(selectedOrder.createdAt).toLocaleTimeString()}</p>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-8 mb-10">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Dados do Solicitante</h3>
                   <p className="text-xl font-black text-slate-900 mb-2">{selectedOrder.customerName}</p>
                   <p className="text-sm font-bold text-slate-600">Tel: {selectedOrder.customerContact}</p>
                   <p className="text-sm font-bold text-slate-600">Email: {selectedOrder.customerEmail}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Informações do Pedido</h3>
                   <p className="text-sm font-bold text-slate-800">Status: <span className="font-black uppercase">{selectedOrder.status}</span></p>
                   <p className="text-sm font-bold text-slate-800">Itens Totais: <span className="font-black">{selectedOrder.items.reduce((a,b) => a+b.quantity, 0)}</span></p>
                   <p className="text-sm font-bold text-slate-800 mt-4">Atendido por: <span className="font-black">Dicompel Oficial</span></p>
                </div>
             </div>

             {selectedOrder.notes && (
                <div className="mb-10 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Observações Adicionais</h3>
                   <p className="text-sm text-slate-700 leading-relaxed">{selectedOrder.notes}</p>
                </div>
             )}

             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-slate-900 text-white">
                      <th className="p-4 text-xs font-black uppercase tracking-widest rounded-tl-xl">Produto / Descrição</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest">Cód. / Ref.</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-center">Linha</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-right rounded-tr-xl">Qtd</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                   {selectedOrder.items.map((it, idx) => (
                      <tr key={it.id+idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                         <td className="p-4 text-sm font-bold text-slate-900">{it.description}</td>
                         <td className="p-4 text-xs text-slate-500">{it.code} / {it.reference}</td>
                         <td className="p-4 text-xs font-black text-slate-400 text-center uppercase">{it.line}</td>
                         <td className="p-4 text-lg font-black text-slate-900 text-right">{it.quantity}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>

          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] no-print">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                <div className="flex items-center gap-4">
                   <div className={`p-3 rounded-2xl ${getStatusColor(selectedOrder.status)} text-white`}>
                      <Package className="h-6 w-6"/>
                   </div>
                   <div>
                      <h3 className="font-black text-xl text-slate-900">Pedido #{selectedOrder.id.slice(-8).toUpperCase()}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isEditingOrder ? 'Editando Itens do Pedido' : 'Gerenciamento CRM'}</p>
                   </div>
                </div>
                <div className="flex gap-2">
                   {!isEditingOrder && (
                     <>
                        <button onClick={() => exportToExcel(selectedOrder)} className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border border-green-100">
                           <FileSpreadsheet className="h-4 w-4"/> EXPORTAR EXCEL
                        </button>
                        <button onClick={printOrder} className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border border-green-100">
                           <Printer className="h-4 w-4"/> IMPRIMIR PDF
                        </button>
                     </>
                   )}
                   <button onClick={() => { setSelectedOrder(null); setIsEditingOrder(false); }} className="p-3 text-slate-300 hover:text-slate-900 transition-colors"><X className="h-8 w-8"/></button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                 {!isEditingOrder && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">CLIENTE SOLICITANTE</p>
                         <p className="text-xl font-black text-slate-900">{selectedOrder.customerName}</p>
                         <div className="mt-5 space-y-3">
                            <div className="flex items-center gap-3 text-xs font-bold text-slate-600 bg-white p-3 rounded-xl border border-slate-100">
                               <Phone className="h-4 w-4 text-blue-500"/> {selectedOrder.customerContact}
                            </div>
                            <div className="flex items-center gap-3 text-xs font-bold text-slate-600 bg-white p-3 rounded-xl border border-slate-100">
                               <Mail className="h-4 w-4 text-blue-500"/> {selectedOrder.customerEmail}
                            </div>
                         </div>
                      </div>
                      <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">STATUS DA VENDA</p>
                         <select className={`w-full h-14 rounded-2xl px-5 font-black uppercase text-xs text-white shadow-lg transition-all ${getStatusColor(selectedOrder.status)}`} value={selectedOrder.status} onChange={async (e) => { 
                                 const upd = { ...selectedOrder, status: e.target.value as OrderStatus }; 
                                 await orderService.update(upd); 
                                 setSelectedOrder(upd); 
                                 silentRefresh(); 
                              }}>
                               {Object.values(OrderStatus).map(s => <option key={s} value={s} className="text-slate-900">{s.toUpperCase()}</option>)}
                            </select>
                            <p className="mt-4 text-[9px] text-slate-400 font-bold uppercase text-center italic">Alteração automática ao mudar o status.</p>
                      </div>
                   </div>
                 )}

                 <div className="border border-slate-100 rounded-3xl overflow-hidden bg-white shadow-sm">
                    <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                       <span className="font-black text-[10px] text-slate-400 uppercase tracking-widest">
                          {isEditingOrder ? 'MODO DE EDIÇÃO DE ITENS' : 'ITENS DO PEDIDO'}
                       </span>
                       {isEditingOrder && (
                          <button onClick={() => setShowProductSelector(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md">
                             <Plus className="h-3 w-3" /> ADICIONAR PRODUTO
                          </button>
                       )}
                    </div>
                    <div className="divide-y divide-slate-50">
                      {(isEditingOrder ? editOrderItems : selectedOrder.items).map((it, i) => (
                        <div key={it.id + i} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-center gap-5 min-w-0">
                             <img src={it.imageUrl} className="h-16 w-16 object-contain rounded-2xl border bg-white p-2 flex-shrink-0" alt=""/>
                             <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{it.description}</p>
                                <div className="flex items-center gap-2 mt-1">
                                   <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">{it.code}</span>
                                   <span className="text-[9px] font-black text-slate-300">|</span>
                                   <span className="text-[9px] font-bold text-slate-400">REF: {it.reference}</span>
                                </div>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                             {isEditingOrder ? (
                               <>
                                 <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                    <button onClick={() => updateOrderQty(it.id, -1)} className="p-3 hover:bg-slate-200 transition-colors"><Minus className="h-4 w-4"/></button>
                                    <span className="px-4 font-black text-slate-900">{it.quantity}</span>
                                    <button onClick={() => updateOrderQty(it.id, 1)} className="p-3 hover:bg-slate-200 transition-colors"><Plus className="h-4 w-4"/></button>
                                 </div>
                                 <button onClick={() => removeOrderItem(it.id)} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                                    <Trash2 className="h-5 w-5"/>
                                 </button>
                               </>
                             ) : (
                               <div className="text-right flex-shrink-0">
                                  <p className="text-lg font-black text-slate-900">{it.quantity}</p>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">UNIDADES</p>
                               </div>
                             )}
                          </div>
                        </div>
                      ))}
                    </div>
                 </div>

                 {/* Rodapé de Ações do Modal */}
                 <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 border-t border-slate-100">
                    {!isEditingOrder ? (
                      <>
                        <button onClick={() => handleDeleteOrder(selectedOrder.id)} className="flex items-center gap-2 text-red-500 hover:text-white hover:bg-red-500 border border-red-100 px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all order-2 sm:order-1">
                           <Trash2 className="h-4 w-4"/> Excluir Pedido
                        </button>
                        <div className="flex gap-3 w-full sm:w-auto order-1 sm:order-2">
                           <button onClick={handleStartEditingOrder} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                              <Edit2 className="h-4 w-4"/> Editar Itens
                           </button>
                           <button onClick={() => { setSelectedOrder(null); setIsEditingOrder(false); }} className="flex-1 sm:flex-none bg-slate-900 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">
                              Fechar
                           </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setIsEditingOrder(false)} className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest">
                           Cancelar Edição
                        </button>
                        <button onClick={handleSaveOrderEdit} className="w-full sm:w-auto flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-100 transition-all">
                           <Save className="h-4 w-4"/> Salvar Alterações
                        </button>
                      </>
                    )}
                 </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Seletor de Produtos para Pedido (Utilizado em Edição) */}
      {showProductSelector && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[300]">
           <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                 <h4 className="font-black text-slate-900 text-sm uppercase tracking-widest">Inserir Produto Manualmente</h4>
                 <button onClick={() => setShowProductSelector(false)} className="text-slate-300 hover:text-slate-900 transition-colors"><X className="h-8 w-8"/></button>
              </div>
              <div className="p-6 bg-slate-50">
                 <div className="relative">
                    <Search className="absolute inset-y-0 left-4 h-5 w-5 text-slate-400 my-auto" />
                    <input autoFocus type="text" className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-6 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 shadow-sm" placeholder="Pesquisar por nome ou código..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
                 {products.filter(p => p.description.toLowerCase().includes(productSearch.toLowerCase()) || p.code.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                    <div key={p.id} className="p-5 flex items-center justify-between hover:bg-blue-50 transition-all cursor-pointer group" onClick={() => addProductToOrder(p)}>
                       <div className="flex items-center gap-5">
                          <img src={p.imageUrl} className="h-14 w-14 object-contain rounded-xl border bg-white p-2" alt=""/>
                          <div>
                             <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{p.description}</p>
                             <p className="text-[10px] font-black text-slate-400 uppercase mt-0.5">{p.code}</p>
                          </div>
                       </div>
                       <PlusCircle className="h-7 w-7 text-slate-200 group-hover:text-blue-600 group-hover:scale-110 transition-all" />
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* Modal Cadastro/Edição de Produto */}
      {showProductModal && editingProduct && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[200]">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-10 overflow-y-auto max-h-[90vh] animate-in slide-in-from-bottom-8 duration-300">
            <div className="flex justify-between items-center mb-10">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg">
                    <Package className="h-6 w-6"/>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{editingProduct.id ? 'Editar Produto' : 'Novo Produto'}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Controle de Estoque Técnico</p>
                  </div>
               </div>
              <button onClick={() => setShowProductModal(false)} className="text-slate-300 hover:text-slate-900 transition-colors"><X className="h-8 w-8"/></button>
            </div>
            <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Descrição Comercial</label>
                <input required type="text" className={darkInputStyle} value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Código Interno</label>
                <input required type="text" className={darkInputStyle} value={editingProduct.code || ''} onChange={e => setEditingProduct({...editingProduct, code: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Referência Fábrica</label>
                <input required type="text" className={darkInputStyle} value={editingProduct.reference || ''} onChange={e => setEditingProduct({...editingProduct, reference: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Categoria</label>
                <input required type="text" className={darkInputStyle} value={editingProduct.category || ''} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Linha Dicompel</label>
                <input required type="text" className={darkInputStyle} value={editingProduct.line || ''} onChange={e => setEditingProduct({...editingProduct, line: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Detalhes Técnicos / Observações</label>
                <textarea rows={4} className={darkInputStyle} placeholder="Informe detalhes para o cliente visualizar no catálogo..." value={editingProduct.details || ''} onChange={e => setEditingProduct({...editingProduct, details: e.target.value})} />
              </div>
              <div className="md:col-span-2 pt-6">
                <Button type="submit" className="w-full h-16 font-black uppercase tracking-[0.3em] text-sm shadow-2xl">SALVAR REGISTRO</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
