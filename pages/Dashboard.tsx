
import React, { useState, useEffect } from 'react';
import { User, UserRole, Order, Product, OrderStatus, CRMInteraction, CartItem } from '../types';
import { authService, orderService, productService, userService } from '../services/api';
import { Button } from '../components/Button';
// Added AlertTriangle to imports from lucide-react
import { Plus, Trash2, Edit2, Search, CheckCircle, Package, Users, MessageSquare, Phone, Mail, X, Printer, User as UserIcon, Lock, LayoutDashboard, ChevronRight, ShoppingBag, Grid, List, AlertTriangle } from 'lucide-react';

interface DashboardProps {
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'users' | 'profile'>('orders');
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [profileName, setProfileName] = useState(user.name);
  const [newPassword, setNewPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

  const [editingProduct, setEditingProduct] = useState<(Partial<Omit<Product, 'colors'>> & { colors?: string | string[] }) | null>(null);
  const [editingUser, setEditingUser] = useState<Partial<User> & { password?: string } | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isEditingOrderItems, setIsEditingOrderItems] = useState(false);
  const [tempOrderItems, setTempOrderItems] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState('');

  const canManageProducts = user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR;
  const canManageUsers = user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR;

  useEffect(() => {
    loadData();
  }, [user, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carrega produtos para garantir que o representante possa escolher no editor de pedidos
      const prodData = await productService.getAll();
      setProducts(prodData);

      if (activeTab === 'orders') {
        const data = (user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR) 
          ? await orderService.getAll() 
          : await orderService.getByRep(user.id);
        setOrders(data);
      } else if (activeTab === 'users' && canManageUsers) {
        const data = await userService.getAll();
        setUsers(data);
      }
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.NEW: return 'bg-blue-600';
      case OrderStatus.IN_PROGRESS: return 'bg-orange-500';
      case OrderStatus.CLOSED: return 'bg-green-600';
      case OrderStatus.CANCELLED: return 'bg-red-600';
      default: return 'bg-slate-500';
    }
  };

  const handleProductSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    const colorsArr = typeof editingProduct.colors === 'string' 
      ? (editingProduct.colors as string).split(',').map(c => c.trim()) 
      : editingProduct.colors || [];
    const productToSave: any = { ...editingProduct, colors: colorsArr };
    if (productToSave.id) await productService.update(productToSave);
    else await productService.create(productToSave);
    setEditingProduct(null);
    loadData();
  };

  const handleUserSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (editingUser.id) await userService.update(editingUser as User & { password?: string });
    else await userService.create(editingUser);
    setEditingUser(null);
    loadData();
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage({ type: '', text: '' });
    try {
      await userService.update({ ...user, name: profileName });
      if (newPassword.trim() !== '') {
        const success = await authService.updatePassword(newPassword);
        if (!success) {
           setProfileMessage({ type: 'error', text: 'Falha ao atualizar senha.' });
           return;
        }
      }
      setProfileMessage({ type: 'success', text: 'Perfil atualizado!' });
      setNewPassword('');
    } catch (err) {
      setProfileMessage({ type: 'error', text: 'Erro ao processar.' });
    }
  };

  const saveOrderItemsChanges = async () => {
    if (!selectedOrder) return;
    const updatedOrder = { ...selectedOrder, items: tempOrderItems };
    await orderService.update(updatedOrder);
    setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    setSelectedOrder(updatedOrder);
    setIsEditingOrderItems(false);
  };

  // ESTILO DE INPUT PREMIUM (Fundo slate escuro com transparência, Texto branco puro)
  const premiumInputClasses = "w-full bg-slate-800/80 border-2 border-slate-700 p-4 rounded-2xl font-bold text-white placeholder-slate-400 focus:border-blue-500 focus:bg-slate-900 outline-none transition-all shadow-lg ring-offset-slate-900";

  const renderCRMBoard = () => (
    <div className="flex gap-6 overflow-x-auto pb-8 items-start custom-scrollbar h-[calc(100vh-280px)]">
      {Object.values(OrderStatus).map(status => (
        <div key={status} className="w-[300px] sm:w-[340px] flex-shrink-0 bg-slate-50/50 rounded-[2rem] flex flex-col max-h-full border border-slate-200 shadow-sm overflow-hidden">
          <div className={`p-5 ${getStatusColor(status)} text-white flex justify-between items-center sticky top-0 z-10 shadow-lg`}>
            <span className="text-xs font-black uppercase tracking-tighter">{status}</span>
            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black">
               {orders.filter(o => o.status === status).length}
            </span>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto flex-grow custom-scrollbar">
            {orders.filter(o => o.status === status).map(order => (
              <div 
                key={order.id} 
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-xl hover:border-blue-400 hover:-translate-y-1 transition-all group" 
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex justify-between items-start mb-3">
                   <p className="text-[10px] bg-slate-900 text-white px-2 py-1 rounded-lg font-black tracking-widest">#{order.id.slice(0,8)}</p>
                   <p className="text-[10px] text-slate-400 font-bold">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <h4 className="font-black text-slate-900 truncate text-sm mb-1">{order.customerName}</h4>
                <div className="flex items-center justify-between pt-3 border-t border-slate-50 mt-2">
                   <div className="flex items-center text-slate-500 text-[10px] font-bold uppercase">
                      <ShoppingBag className="h-3.5 w-3.5 mr-1.5 text-blue-500"/>
                      {order.items.reduce((acc, item) => acc + item.quantity, 0)} volumes
                   </div>
                   <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderProductList = () => (
    <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden">
      <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
        <h3 className="font-black text-slate-900 flex items-center gap-3"><Package className="h-6 w-6 text-blue-600"/> CATÁLOGO DE PRODUTOS</h3>
        <Button onClick={() => setEditingProduct({ colors: [], category: 'Geral' })} size="md" className="rounded-2xl shadow-lg shadow-blue-100">
           <Plus className="h-4 w-4 mr-2"/> CADASTRAR PRODUTO
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificação</th>
              <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Linha / Categoria</th>
              <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-5">
                    <div className="h-16 w-16 rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm flex-shrink-0">
                       <img src={p.imageUrl} className="h-full w-full object-cover" alt=""/>
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900 uppercase leading-none mb-1">{p.description}</div>
                      <div className="text-[11px] text-slate-400 font-bold tracking-tighter">{p.code} • Ref: {p.reference}</div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                   <span className="text-[10px] font-black px-3 py-1.5 rounded-xl uppercase bg-slate-100 text-slate-600">{p.line || 'Novara'}</span>
                   <span className="ml-2 text-[10px] font-bold text-slate-400 uppercase">{p.category}</span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-3">
                     <button onClick={() => setEditingProduct(p)} className="p-3 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-2xl transition-all"><Edit2 className="h-4 w-4"/></button>
                     <button onClick={async () => { if(confirm('⚠️ Apagar este produto do catálogo?')) { await productService.delete(p.id); loadData(); } }} className="p-3 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-2xl transition-all"><Trash2 className="h-4 w-4"/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Added renderUserList function to manage sales team
  const renderUserList = () => (
    <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden">
      <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
        <h3 className="font-black text-slate-900 flex items-center gap-3"><Users className="h-6 w-6 text-blue-600"/> EQUIPE DE VENDAS</h3>
        <Button onClick={() => setEditingUser({ role: UserRole.REPRESENTATIVE })} size="md" className="rounded-2xl shadow-lg shadow-blue-100">
           <Plus className="h-4 w-4 mr-2"/> NOVO COLABORADOR
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
              <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Nível de Acesso</th>
              <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-5">
                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                       <UserIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900 uppercase leading-none mb-1">{u.name}</div>
                      <div className="text-[11px] text-slate-400 font-bold tracking-tighter">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                   <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl uppercase ${u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : u.role === UserRole.SUPERVISOR ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                     {u.role}
                   </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-3">
                     <button onClick={() => setEditingUser(u)} className="p-3 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-2xl transition-all"><Edit2 className="h-4 w-4"/></button>
                     {u.id !== user.id && (
                       <button onClick={async () => { if(confirm('⚠️ Remover este colaborador?')) { await userService.delete(u.id); loadData(); } }} className="p-3 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-2xl transition-all"><Trash2 className="h-4 w-4"/></button>
                     )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderOrderEditor = () => {
    if (!selectedOrder) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/98 backdrop-blur-2xl flex items-center justify-center p-4 z-[200]">
         <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden">
            <div className="p-8 bg-slate-50 border-b flex justify-between items-center">
               <div className="flex items-center gap-5">
                  <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-xl">
                     <ShoppingBag className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase">Personalizar Pedido</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Cliente: {selectedOrder.customerName} • #{selectedOrder.id.slice(0,8)}</p>
                  </div>
               </div>
               <button onClick={() => setIsEditingOrderItems(false)} className="bg-white p-4 rounded-full hover:bg-rose-50 hover:text-rose-500 border border-slate-100 shadow-sm transition-all"><X className="h-7 w-7"/></button>
            </div>
            
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
               {/* PAINEL ESQUERDO: CARRINHO ATUAL */}
               <div className="w-full lg:w-[35%] p-8 overflow-y-auto border-r border-slate-100 bg-slate-50/50">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 border-b border-slate-200 pb-3 flex items-center justify-between">
                     CONTEÚDO DO PEDIDO
                     <span className="text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{tempOrderItems.length} ITENS</span>
                  </h4>
                  <div className="space-y-4">
                     {tempOrderItems.map((item, idx) => (
                       <div key={idx} className="bg-white p-4 rounded-[1.5rem] border border-slate-100 flex items-center gap-5 shadow-sm hover:border-blue-300 transition-all group">
                          <img src={item.imageUrl} className="h-16 w-16 object-cover rounded-2xl border bg-slate-50" alt=""/>
                          <div className="flex-grow min-w-0">
                             <p className="text-xs font-black text-slate-900 truncate uppercase leading-tight">{item.description}</p>
                             <p className="text-[9px] text-slate-400 font-bold mt-1">{item.code}</p>
                          </div>
                          <div className="flex flex-col items-center gap-2">
                             <input type="number" min="1" className="w-16 bg-slate-100 border-2 border-slate-200 rounded-xl p-2 text-center font-black text-slate-900 focus:border-blue-500 focus:outline-none" value={item.quantity} onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                setTempOrderItems(tempOrderItems.map((it, i) => i === idx ? { ...it, quantity: val } : it));
                             }} />
                             <button onClick={() => setTempOrderItems(tempOrderItems.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-rose-500 p-1 transition-colors"><Trash2 className="h-4 w-4"/></button>
                          </div>
                       </div>
                     ))}
                     {tempOrderItems.length === 0 && (
                        <div className="text-center py-20 opacity-30 flex flex-col items-center">
                           <ShoppingBag className="h-16 w-16 mb-4" />
                           <p className="text-xs font-black uppercase tracking-widest">O pedido está vazio</p>
                        </div>
                     )}
                  </div>
               </div>

               {/* PAINEL DIREITO: NAVEGAÇÃO DE CATÁLOGO COM FOTOS */}
               <div className="w-full lg:w-[65%] p-8 flex flex-col overflow-hidden bg-white">
                  <div className="flex items-center justify-between mb-8">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ESCOLHER PRODUTOS</h4>
                     <div className="flex items-center gap-2">
                        <Grid className="h-4 w-4 text-slate-400" />
                        <div className="w-10 h-0.5 bg-slate-100"></div>
                        <List className="h-4 w-4 text-slate-200" />
                     </div>
                  </div>
                  <div className="relative mb-8">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400"/>
                    <input className={premiumInputClasses} placeholder="Buscar por nome, código ou referência..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                  </div>
                  
                  <div className="flex-grow overflow-y-auto pr-3 custom-scrollbar">
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                       {products
                         .filter(p => !productSearch || p.description.toLowerCase().includes(productSearch.toLowerCase()) || p.code.toLowerCase().includes(productSearch.toLowerCase()))
                         .map(p => (
                           <div key={p.id} className="bg-slate-50 p-4 rounded-[2rem] border border-slate-100 flex flex-col hover:bg-white hover:border-blue-400 hover:shadow-2xl transition-all group cursor-pointer" onClick={() => {
                               const exists = tempOrderItems.find(it => it.id === p.id);
                               if (exists) setTempOrderItems(tempOrderItems.map(it => it.id === p.id ? { ...it, quantity: it.quantity + 1 } : it));
                               else setTempOrderItems([...tempOrderItems, { ...p, quantity: 1 }]);
                           }}>
                              <div className="relative pt-[100%] bg-white rounded-[1.5rem] overflow-hidden border border-slate-200 mb-4">
                                 <img src={p.imageUrl} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt=""/>
                                 <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors flex items-center justify-center">
                                    <Plus className="h-10 w-10 text-white opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100" />
                                 </div>
                              </div>
                              <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter mb-1 truncate">{p.line || 'DICOMPEL'}</p>
                              <p className="text-xs font-black text-slate-800 uppercase leading-tight line-clamp-2 min-h-[2rem]">{p.description}</p>
                              <div className="mt-4 flex items-center justify-between">
                                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{p.code}</span>
                                <div className="bg-slate-900 text-white p-2 rounded-xl group-hover:bg-blue-600 transition-colors shadow-lg shadow-slate-100"><Plus className="h-4 w-4" /></div>
                              </div>
                           </div>
                       ))}
                    </div>
                  </div>
               </div>
            </div>

            <div className="p-10 bg-slate-900 flex flex-col sm:flex-row justify-between items-center gap-6">
               <div className="flex items-center gap-6">
                  <div className="text-center px-8 border-r border-slate-700">
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Volumes</p>
                     <p className="text-3xl font-black text-white">{tempOrderItems.reduce((a, b) => a + b.quantity, 0)}</p>
                  </div>
                  <div className="text-center px-8">
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Itens Únicos</p>
                     <p className="text-3xl font-black text-white">{tempOrderItems.length}</p>
                  </div>
               </div>
               <div className="flex gap-4 w-full sm:w-auto">
                  <Button variant="outline" onClick={() => setIsEditingOrderItems(false)} className="rounded-[1.5rem] h-16 px-10 font-black uppercase text-xs border-slate-700 text-white hover:bg-slate-800">CANCELAR</Button>
                  <Button onClick={saveOrderItemsChanges} className="rounded-[1.5rem] h-16 px-16 font-black uppercase text-xs shadow-2xl shadow-blue-500/20">SALVAR NO PEDIDO</Button>
               </div>
            </div>
         </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 no-print">
          <div className="flex items-center gap-6">
             <div className="bg-slate-900 text-white p-4 rounded-[1.5rem] shadow-2xl">
               <LayoutDashboard className="h-7 w-7" />
             </div>
             <div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Painel Corporativo</h2>
                <div className="flex items-center gap-2 mt-1">
                   <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user.role} ONLINE</p>
                </div>
             </div>
          </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200 overflow-x-auto no-print">
        {['orders', 'products', 'users', 'profile'].map(tab => (
           (tab !== 'products' || canManageProducts) && (tab !== 'users' || canManageUsers) && (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`py-6 px-10 text-[11px] font-black uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-blue-600' : 'text-slate-400 hover:text-slate-900'}`}>
                {tab === 'orders' ? 'ESTEIRA DE PEDIDOS' : tab === 'products' ? 'GERENCIAR CATÁLOGO' : tab === 'users' ? 'EQUIPE DE VENDAS' : 'CONFIGURAÇÕES'}
                {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-1.5 bg-blue-600 rounded-t-full shadow-[0_-4px_10px_rgba(37,99,235,0.4)]"></div>}
            </button>
           )
        ))}
      </div>

      <div className="min-h-[60vh]">
        {loading && activeTab !== 'profile' ? (
          <div className="flex flex-col items-center justify-center p-40 text-slate-300">
             <div className="loader mb-6"></div>
             <p className="text-[11px] font-black uppercase tracking-[0.2em] animate-pulse">Sincronizando Banco de Dados...</p>
          </div>
        ) : (
          <>
            {activeTab === 'orders' && renderCRMBoard()}
            {activeTab === 'products' && renderProductList()}
            {activeTab === 'users' && renderUserList()}
            {activeTab === 'profile' && (
                <div className="max-w-3xl mx-auto bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
                    <div className="p-10 bg-slate-900 text-white flex items-center gap-8">
                        <div className="bg-blue-600 p-6 rounded-[2rem] shadow-2xl shadow-blue-500/30">
                            <UserIcon className="h-12 w-12" />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black uppercase tracking-tight">Meus Acessos</h3>
                            <p className="text-slate-400 font-bold text-sm mt-1">Gerencie sua identidade corporativa Dicompel.</p>
                        </div>
                    </div>

                    <form onSubmit={handleProfileUpdate} className="p-10 space-y-10">
                        {profileMessage.text && (
                           <div className={`p-5 rounded-2xl text-xs font-black border flex items-center gap-4 ${profileMessage.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                              {profileMessage.type === 'success' ? <CheckCircle className="h-5 w-5"/> : <AlertTriangle className="h-5 w-5"/>}
                              {profileMessage.text}
                           </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3 ml-2">Nome Completo</label>
                            <input className={premiumInputClasses} value={profileName} onChange={e => setProfileName(e.target.value)} required />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3 ml-2">E-mail de Login</label>
                            <input className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-slate-400 font-bold shadow-inner" value={user.email} disabled />
                          </div>
                        </div>

                        <div className="pt-10 border-t border-slate-100">
                          <h4 className="text-sm font-black text-slate-900 mb-8 flex items-center gap-3">
                              <div className="bg-blue-50 p-2 rounded-lg"><Lock className="h-5 w-5 text-blue-600"/></div>
                              SEGURANÇA E SENHA
                          </h4>
                          <div className="bg-slate-900 p-8 rounded-[2rem] shadow-2xl">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Definir Nova Senha</label>
                              <input type="password" className={premiumInputClasses} placeholder="Mínimo 6 caracteres (vazio = manter atual)" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                          </div>
                        </div>

                        <Button type="submit" className="w-full h-20 rounded-[2rem] text-lg font-black shadow-2xl shadow-blue-500/20 tracking-tighter">EFETIVAR ATUALIZAÇÕES</Button>
                    </form>
                </div>
            )}
          </>
        )}
      </div>

      {/* MODAL DETALHES DO PEDIDO */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-6">
                 <div className="bg-blue-600 p-4 rounded-[1.5rem] shadow-2xl shadow-blue-500/30"><Package className="h-7 w-7"/></div>
                 <div>
                    <h3 className="text-3xl font-black uppercase tracking-tight">Pedido #{selectedOrder.id.slice(0,8)}</h3>
                    <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest mt-1">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                 </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X className="h-8 w-8 text-slate-500 hover:text-white"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 space-y-10 bg-slate-50/50 custom-scrollbar">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-3">Informações do Cliente</p>
                     <div className="space-y-6">
                        <div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Responsável</p>
                           <p className="text-2xl font-black text-slate-900">{selectedOrder.customerName}</p>
                        </div>
                        <div className="flex gap-10">
                           <div className="flex items-center gap-3">
                              <Phone className="h-5 w-5 text-blue-500" />
                              <p className="text-sm font-black text-slate-700">{selectedOrder.customerContact || '-'}</p>
                           </div>
                           <div className="flex items-center gap-3">
                              <Mail className="h-5 w-5 text-blue-500" />
                              <p className="text-sm font-black text-slate-700 truncate">{selectedOrder.customerEmail || '-'}</p>
                           </div>
                        </div>
                     </div>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-3">Status e Fluxo</p>
                     <div className="space-y-6">
                        <select className={`w-full h-16 rounded-[1.5rem] px-8 font-black uppercase text-xs shadow-xl border-2 transition-all ${getStatusColor(selectedOrder.status)} text-white border-transparent cursor-pointer ring-offset-4 focus:ring-4 focus:ring-blue-100`} value={selectedOrder.status} onChange={async (e) => { const upd = { ...selectedOrder, status: e.target.value as OrderStatus }; await orderService.update(upd); setSelectedOrder(upd); loadData(); }}>
                           {Object.values(OrderStatus).map(s => <option key={s} value={s} className="text-slate-900 font-bold">{s}</option>)}
                        </select>
                        <Button variant="outline" className="w-full h-16 rounded-[1.5rem] font-black uppercase text-xs tracking-widest border-slate-200" onClick={() => window.print()}><Printer className="h-5 w-5 mr-3"/> Imprimir Orçamento</Button>
                     </div>
                  </div>
               </div>

               <div className="border border-slate-100 rounded-[2.5rem] overflow-hidden bg-white shadow-2xl shadow-slate-200/50">
                  <div className="bg-slate-50/80 px-10 py-6 flex justify-between items-center border-b border-slate-100">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PRODUTOS NO PEDIDO ({selectedOrder.items.length})</h4>
                     <button onClick={() => { setTempOrderItems([...selectedOrder.items]); setIsEditingOrderItems(true); }} className="text-blue-600 text-[10px] font-black hover:bg-blue-600 hover:text-white px-6 py-3 rounded-2xl transition-all border-2 border-blue-100 hover:border-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <Edit2 className="h-3.5 w-3.5"/> Alterar Itens
                     </button>
                  </div>
                  <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {selectedOrder.items.map((it, i) => (
                      <div key={i} className="px-10 py-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-6">
                           <img src={it.imageUrl} className="h-20 w-20 object-cover rounded-3xl border border-slate-100 bg-white shadow-sm" alt=""/>
                           <div>
                              <p className="text-sm font-black text-slate-900 uppercase leading-none mb-1">{it.description}</p>
                              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">{it.code} • Ref: {it.reference}</p>
                           </div>
                        </div>
                        <div className="text-center bg-slate-100 px-6 py-3 rounded-2xl border border-slate-200">
                           <span className="text-2xl font-black text-slate-900">x{it.quantity}</span>
                           <p className="text-[8px] font-black text-slate-400 uppercase mt-1">unidades</p>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>

            <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <button onClick={async () => { if(confirm('⚠️ Deletar este pedido permanentemente?')) { await orderService.delete(selectedOrder.id); setSelectedOrder(null); loadData(); } }} className="text-rose-600 font-black uppercase text-[10px] bg-rose-50 px-8 py-5 rounded-[1.5rem] hover:bg-rose-600 hover:text-white transition-all border border-rose-100 shadow-sm flex items-center gap-3">
                 <Trash2 className="h-4 w-4"/> Deletar Pedido
              </button>
              <Button onClick={() => setSelectedOrder(null)} className="rounded-[1.5rem] h-16 px-16 font-black uppercase text-xs tracking-[0.2em]">FECHAR DETALHES</Button>
            </div>
          </div>
        </div>
      )}

      {/* EDITOR DE ITENS (ABRE SOBRE O MODAL DE DETALHES) */}
      {isEditingOrderItems && renderOrderEditor()}

      {/* MODAL DE CADASTRO/EDIÇÃO DE PRODUTO */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 z-[150]">
          <form onSubmit={handleProductSave} className="bg-white rounded-[3rem] shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
               <div className="flex items-center gap-5">
                  <div className="bg-blue-600 p-4 rounded-[1.5rem] shadow-2xl shadow-blue-500/30"><Package className="h-7 w-7"/></div>
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">Ficha de Produto</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase mt-1">Catálogo Dicompel</p>
                  </div>
               </div>
               <button type="button" onClick={() => setEditingProduct(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X className="h-8 w-8 text-slate-500 hover:text-white"/></button>
            </div>
            <div className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-3 ml-2 tracking-[0.2em]">Código Oficial</label>
                    <input className={premiumInputClasses} value={editingProduct.code || ''} onChange={e => setEditingProduct({...editingProduct, code: e.target.value})} required placeholder="Ex: NOV-001" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-3 ml-2 tracking-[0.2em]">Referência Fábrica</label>
                    <input className={premiumInputClasses} value={editingProduct.reference || ''} onChange={e => setEditingProduct({...editingProduct, reference: e.target.value})} required placeholder="Ex: REF-99" />
                 </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-3 ml-2 tracking-[0.2em]">Descrição Comercial</label>
                <input className={premiumInputClasses} value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} required placeholder="Ex: Placa 4x2 Novara Branca" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-3 ml-2 tracking-[0.2em]">Linha / Coleção</label>
                    <input className={premiumInputClasses} value={editingProduct.line || ''} onChange={e => setEditingProduct({...editingProduct, line: e.target.value})} required placeholder="Ex: Novara" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-3 ml-2 tracking-[0.2em]">Categoria Base</label>
                    <input className={premiumInputClasses} value={editingProduct.category || ''} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} required placeholder="Ex: Interruptores" />
                 </div>
              </div>
            </div>
            <div className="p-10 bg-slate-50 flex justify-end gap-5 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setEditingProduct(null)} className="rounded-[1.5rem] h-16 px-10 font-black uppercase text-xs border-slate-200">CANCELAR</Button>
              <Button type="submit" className="rounded-[1.5rem] h-16 px-16 font-black uppercase text-xs shadow-2xl shadow-blue-500/20">SALVAR PRODUTO</Button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL DE CADASTRO/EDIÇÃO DE USUÁRIO */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 z-[150]">
          <form onSubmit={handleUserSave} className="bg-white rounded-[3rem] shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
               <div className="flex items-center gap-5">
                  <div className="bg-blue-600 p-4 rounded-[1.5rem] shadow-2xl shadow-blue-500/30"><Users className="h-7 w-7"/></div>
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">Novo Colaborador</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase mt-1">Controle de Acessos</p>
                  </div>
               </div>
               <button type="button" onClick={() => setEditingUser(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X className="h-8 w-8 text-slate-500 hover:text-white"/></button>
            </div>
            <div className="p-10 space-y-8">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase block mb-3 ml-2 tracking-[0.2em]">Nome do Vendedor</label>
                   <input className={premiumInputClasses} value={editingUser.name || ''} onChange={e => setEditingUser({...editingUser, name: e.target.value})} required placeholder="Nome Completo" />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase block mb-3 ml-2 tracking-[0.2em]">E-mail Corporativo</label>
                   <input className={premiumInputClasses} type="email" value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} required placeholder="vendas@dicompel.com.br" />
                </div>
                {!editingUser.id && (
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase block mb-3 ml-2 tracking-[0.2em]">Senha Temporária</label>
                      <input className={premiumInputClasses} type="password" value={editingUser.password || ''} onChange={e => setEditingUser({...editingUser, password: e.target.value})} required placeholder="Mínimo 6 caracteres" />
                   </div>
                )}
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase block mb-3 ml-2 tracking-[0.2em]">Atribuição / Cargo</label>
                   <select className={premiumInputClasses} value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}>
                      <option value={UserRole.REPRESENTATIVE} className="bg-slate-900">Representante Comercial</option>
                      <option value={UserRole.SUPERVISOR} className="bg-slate-900">Supervisor de Vendas</option>
                      {user.role === UserRole.ADMIN && <option value={UserRole.ADMIN} className="bg-slate-900">Administrador Global</option>}
                   </select>
                </div>
            </div>
            <div className="p-10 bg-slate-50 flex justify-end gap-5 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setEditingUser(null)} className="rounded-[1.5rem] h-16 px-8 font-black uppercase text-xs border-slate-200">CANCELAR</Button>
              <Button type="submit" className="rounded-[1.5rem] h-16 px-12 font-black uppercase text-xs shadow-2xl shadow-blue-500/20">CONFIRMAR</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
