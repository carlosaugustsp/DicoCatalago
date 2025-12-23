
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
  
  // Estados de Gerenciamento de Produtos
  const [productManagementSearch, setProductManagementSearch] = useState('');

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editOrderItems, setEditOrderItems] = useState<CartItem[]>([]);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [productSearch, setProductSearch] = useState('');

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
      setProducts(prodData || []);
      
      if (activeTab === 'orders') {
        const data = (user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR) 
          ? await orderService.getAll() 
          : await orderService.getByRep(user.id);
        setOrders(data || []);
      } else if (activeTab === 'users' && (user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR)) {
        const userData = await userService.getAll();
        setUsers(userData || []);
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
      await loadData();
      alert("Produto salvo e sincronizado com o banco de dados!");
    } catch (err: any) {
      console.error(err);
      alert(`Erro crítico: O produto NÃO foi salvo no banco de dados. Verifique sua conexão ou permissões. Erro: ${err.message}`);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Imagem muito grande! O limite é 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingProduct(prev => prev ? ({ ...prev, imageUrl: reader.result as string }) : null);
      };
      reader.readAsDataURL(file);
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
        alert("Novo usuário cadastrado e sincronizado!");
      }
      setShowUserModal(false);
      setEditingUser(null);
      loadData();
    } catch (err: any) {
      alert(`Erro ao processar usuário no banco: ${err.message}`);
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

  const exportProductsToExcel = () => {
    const headers = ['Descricao', 'Codigo', 'Referencia', 'Categoria', 'Subcategoria', 'Linha', 'Amperagem'];
    const filtered = products.filter(p => 
      (p.description || '').toLowerCase().includes(productManagementSearch.toLowerCase()) || 
      (p.code || '').toLowerCase().includes(productManagementSearch.toLowerCase())
    );
    const rows = filtered.map(p => [
      p.description || '',
      p.code || '',
      p.reference || '',
      p.category || '',
      p.subcategory || '',
      p.line || '',
      p.amperage || ''
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `produtos_dicompel_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-black text-[11px] text-slate-700 uppercase tracking-widest whitespace-nowrap">Estoque Técnico</h3>
                    <div className="relative">
                      <Search className="absolute inset-y-0 left-3 h-4 w-4 text-slate-400 my-auto" />
                      <input 
                        type="text" 
                        placeholder="Buscar no cadastro..." 
                        className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none w-48 lg:w-64"
                        value={productManagementSearch}
                        onChange={(e) => setProductManagementSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={exportProductsToExcel} className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border border-green-100">
                      <FileSpreadsheet className="h-4 w-4"/> EXPORTAR EXCEL
                    </button>
                    <Button size="sm" className="font-black uppercase text-[10px]" onClick={() => { setEditingProduct({ colors: [], subcategory: '' }); setShowProductModal(true); }}>
                      <Plus className="h-4 w-4 mr-2"/> NOVO ITEM
                    </Button>
                  </div>
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
                      {products.filter(p => 
                        (p.description || '').toLowerCase().includes(productManagementSearch.toLowerCase()) || 
                        (p.code || '').toLowerCase().includes(productManagementSearch.toLowerCase()) ||
                        (p.reference || '').toLowerCase().includes(productManagementSearch.toLowerCase())
                      ).map(p => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-lg border p-1 flex-shrink-0">
                               <img src={p.imageUrl} className="w-full h-full object-contain" alt=""/>
                            </div>
                            <div className="flex flex-col gap-1">
                               <span className="text-xs font-bold text-slate-900">{p.description}</span>
                               {p.amperage && (
                                 <span className={`w-fit px-2 py-0.5 rounded text-[8px] font-black text-white ${
                                   p.amperage === '20A' 
                                   ? 'bg-red-600' 
                                   : 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-blue-600'
                                 }`}>
                                   {p.amperage}
                                 </span>
                               )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                             <p className="text-[10px] font-black text-slate-500 uppercase">{p.code}</p>
                             <p className="text-[10px] text-slate-400">{p.reference}</p>
                          </td>
                          <td className="px-6 py-4">
                             <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{p.line}</p>
                             <p className="text-[9px] font-medium text-slate-400">{p.category} / {p.subcategory}</p>
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
                           {!(user.role === UserRole.SUPERVISOR && u.role === UserRole.ADMIN) ? (
                              <button onClick={() => { setEditingUser(u); setShowUserModal(true); }} className="p-2.5 text-slate-400 hover:text-blue-600 bg-white border rounded-xl shadow-sm transition-all"><Edit2 className="h-4 w-4"/></button>
                           ) : (
                              <div className="p-2.5 text-slate-200 bg-slate-50 border rounded-xl cursor-not-allowed" title="Você não tem permissão para editar um administrador"><Lock className="h-4 w-4"/></div>
                           )}
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
                 </div>
              </form>
           </div>
        </div>
      )}

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
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Subcategoria</label>
                <input type="text" className={darkInputStyle} placeholder="Ex: Módulo, Placa, Suporte" value={editingProduct.subcategory || ''} onChange={e => setEditingProduct({...editingProduct, subcategory: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Linha Dicompel</label>
                <input required type="text" className={darkInputStyle} value={editingProduct.line || ''} onChange={e => setEditingProduct({...editingProduct, line: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Amperagem</label>
                <select className={darkInputStyle} value={editingProduct.amperage || ''} onChange={e => setEditingProduct({...editingProduct, amperage: e.target.value})}>
                   <option value="">Nenhuma / N.A</option>
                   <option value="10A">10A</option>
                   <option value="20A">20A</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Cores (separadas por vírgula)</label>
                <input type="text" className={darkInputStyle} placeholder="Ex: Branco, Preto, Ouro" value={(editingProduct.colors || []).join(', ')} onChange={e => setEditingProduct({...editingProduct, colors: e.target.value.split(',').map(c => c.trim())})} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Foto do Produto</label>
                <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-800 p-6 rounded-2xl border border-slate-700 border-dashed">
                   {editingProduct.imageUrl ? (
                     <div className="relative w-28 h-28 rounded-xl border border-slate-600 bg-white p-2 overflow-hidden group shadow-lg">
                        <img src={editingProduct.imageUrl} className="w-full h-full object-contain" alt="Preview"/>
                        <button type="button" onClick={() => setEditingProduct({...editingProduct, imageUrl: ''})} className="absolute inset-0 bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                           <Trash2 className="h-6 w-6"/>
                        </button>
                     </div>
                   ) : (
                     <div className="w-28 h-28 rounded-xl border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500 bg-slate-900/50">
                        <ImageIcon className="h-10 w-10"/>
                     </div>
                   )}
                   <div className="flex-grow w-full">
                      <input type="file" id="prod-img-upload" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      <label htmlFor="prod-img-upload" className="flex items-center justify-center gap-3 w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl cursor-pointer transition-all text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/20">
                         <Upload className="h-5 w-5"/> SELECIONAR FOTO NO COMPUTADOR
                      </label>
                   </div>
                </div>
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
