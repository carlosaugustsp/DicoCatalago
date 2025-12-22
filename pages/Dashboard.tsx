
import React, { useState, useEffect } from 'react';
import { User, UserRole, Order, Product, OrderStatus, CRMInteraction, CartItem } from '../types';
import { authService, orderService, productService, userService } from '../services/api';
import { Button } from '../components/Button';
import { Plus, Trash2, Edit2, Search, CheckCircle, Package, Users, X, Printer, User as UserIcon, Lock, LayoutDashboard, ChevronRight, ShoppingBag, Grid, List, AlertTriangle, Phone, Mail, Upload, Palette, Image as ImageIcon } from 'lucide-react';

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
      default: return 'bg-slate-900';
    }
  };

  const handleProductSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    const colorsArr = typeof editingProduct.colors === 'string' 
      ? (editingProduct.colors as string).split(',').map(c => c.trim()).filter(c => c !== '') 
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

  const dashboardInputClasses = "w-full bg-slate-800 border-2 border-slate-700 p-4 rounded-xl font-bold text-white placeholder-slate-500 focus:border-blue-500 focus:bg-slate-900 outline-none transition-all shadow-lg";

  const renderCRMBoard = () => (
    <div className="flex gap-4 overflow-x-auto pb-6 items-start custom-scrollbar h-[calc(100vh-260px)]">
      {Object.values(OrderStatus).map(status => (
        <div key={status} className="w-[300px] flex-shrink-0 bg-white rounded-3xl flex flex-col max-h-full border border-slate-100 shadow-xl overflow-hidden">
          <div className={`p-3 ${getStatusColor(status)} text-white flex justify-between items-center sticky top-0 z-10`}>
            <span className="text-[10px] font-black uppercase tracking-widest">{status}</span>
            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black">
               {orders.filter(o => o.status === status).length}
            </span>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto flex-grow bg-slate-50/30 custom-scrollbar">
            {orders.filter(o => o.status === status).map(order => (
              <div 
                key={order.id} 
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-lg hover:border-blue-500 hover:-translate-y-1 transition-all group" 
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex justify-between items-start mb-3">
                   <p className="text-[10px] bg-slate-900 text-white px-2 py-1 rounded font-black tracking-widest">#{order.id.slice(0,8)}</p>
                   <p className="text-[10px] text-slate-400 font-bold">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <h4 className="font-black text-slate-900 truncate text-sm mb-1 uppercase tracking-tight">{order.customerName}</h4>
                <div className="flex items-center justify-between pt-3 border-t border-slate-50 mt-2">
                   <div className="flex items-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                      <ShoppingBag className="h-4 w-4 mr-2 text-blue-600"/>
                      {order.items.reduce((acc, item) => acc + item.quantity, 0)} Itens
                   </div>
                   <ChevronRight className="h-4 w-4 text-slate-200 group-hover:text-blue-500 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );

  const renderProductList = () => (
    <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden">
      <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white">
        <h3 className="font-black text-slate-900 flex items-center gap-4 text-xl tracking-tight">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-100"><Package className="h-6 w-6"/></div>
          CATÁLOGO INDUSTRIAL
        </h3>
        <Button onClick={() => setEditingProduct({ colors: [], category: 'Geral' })} size="md" className="rounded-2xl shadow-xl shadow-blue-200 font-black h-12 uppercase text-[10px] tracking-widest">
           NOVO PRODUTO
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-50">
          <thead className="bg-slate-50/50">
            <tr>
              <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Identificação</th>
              <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Especificações</th>
              <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gerenciar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-6">
                    <div className="h-20 w-20 rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-sm flex-shrink-0">
                       <img src={p.imageUrl} className="h-full w-full object-cover" alt=""/>
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none mb-2">{p.description}</div>
                      <div className="flex gap-2">
                        <span className="text-[9px] bg-slate-900 text-white px-2 py-0.5 rounded font-black tracking-widest">#{p.code}</span>
                        <span className="text-[9px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded font-black">REF: {p.reference}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                   <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{p.line || 'DICOMPEL'}</div>
                   <div className="text-[10px] font-bold text-slate-400 uppercase">{p.category}</div>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-3">
                     <button onClick={() => setEditingProduct(p)} className="p-4 bg-slate-50 hover:bg-blue-600 text-slate-400 hover:text-white rounded-2xl transition-all"><Edit2 className="h-4 w-4"/></button>
                     <button onClick={async () => { if(confirm('Excluir?')) { await productService.delete(p.id); loadData(); } }} className="p-4 bg-slate-50 hover:bg-red-600 text-slate-400 hover:text-white rounded-2xl transition-all"><Trash2 className="h-4 w-4"/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderUserList = () => (
    <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden">
      <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white">
        <h3 className="font-black text-slate-900 flex items-center gap-4 text-xl tracking-tight">
          <div className="bg-slate-900 p-2 rounded-xl text-white shadow-lg"><Users className="h-6 w-6"/></div>
          EQUIPE COMERCIAL
        </h3>
        <Button onClick={() => setEditingUser({ role: UserRole.REPRESENTATIVE })} size="md" className="rounded-2xl shadow-xl shadow-slate-100 font-black h-12 uppercase text-[10px] tracking-widest">
           ADICIONAR ACESSO
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-50">
          <thead className="bg-slate-50/50">
            <tr>
              <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Nome do Colaborador</th>
              <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Nível hierárquico</th>
              <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Controles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-5">
                    <div className="h-14 w-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 border-2 border-white shadow-sm">
                       <UserIcon className="h-7 w-7" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900 uppercase tracking-tight">{u.name}</div>
                      <div className="text-[11px] text-slate-400 font-bold mt-1">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                   <span className={`text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest ${u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : u.role === UserRole.SUPERVISOR ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                     {u.role}
                   </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-3">
                     <button onClick={() => setEditingUser(u)} className="p-4 bg-slate-50 hover:bg-blue-600 text-slate-400 hover:text-white rounded-2xl transition-all shadow-sm"><Edit2 className="h-4 w-4"/></button>
                     {u.id !== user.id && (
                       <button onClick={async () => { if(confirm('⚠️ Remover este colaborador?')) { await userService.delete(u.id); loadData(); } }} className="p-4 bg-slate-50 hover:bg-red-600 text-slate-400 hover:text-white rounded-2xl transition-all shadow-sm"><Trash2 className="h-4 w-4"/></button>
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
         <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-7xl h-[94vh] flex flex-col overflow-hidden border border-white/20">
            <div className="p-8 bg-white border-b border-slate-50 flex justify-between items-center">
               <div className="flex items-center gap-6">
                  <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-xl shadow-blue-200">
                     <ShoppingBag className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Gerenciar Itens do Orçamento</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">#{selectedOrder.id.slice(0,8)} • {selectedOrder.customerName}</p>
                  </div>
               </div>
               <button onClick={() => setIsEditingOrderItems(false)} className="bg-slate-50 p-5 rounded-full hover:bg-rose-600 hover:text-white transition-all group"><X className="h-6 w-6"/></button>
            </div>
            
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
               <div className="w-full lg:w-[35%] p-8 overflow-y-auto border-r border-slate-50 bg-slate-50/30">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 border-b border-slate-100 pb-4 flex items-center justify-between">
                     CARRINHO ATUAL
                     <span className="text-blue-600 bg-white border border-blue-50 px-3 py-1 rounded-full font-black shadow-sm">{tempOrderItems.length} ITENS</span>
                  </h4>
                  <div className="space-y-4">
                     {tempOrderItems.map((item, idx) => (
                       <div key={idx} className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center gap-5 shadow-sm group hover:border-blue-500 transition-all">
                          <img src={item.imageUrl} className="h-16 w-16 object-cover rounded-2xl border border-slate-50 bg-slate-50" alt=""/>
                          <div className="flex-grow min-w-0">
                             <p className="text-xs font-black text-slate-900 truncate uppercase leading-tight mb-1">{item.description}</p>
                             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{item.code}</p>
                          </div>
                          <div className="flex flex-col items-center gap-2">
                             <input type="number" min="1" className="w-16 bg-slate-50 border-2 border-slate-100 rounded-xl p-2 text-center font-black text-slate-900 focus:border-blue-500 focus:outline-none focus:bg-white" value={item.quantity} onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                setTempOrderItems(tempOrderItems.map((it, i) => i === idx ? { ...it, quantity: val } : it));
                             }} />
                             <button onClick={() => setTempOrderItems(tempOrderItems.filter((_, i) => i !== idx))} className="text-slate-200 hover:text-rose-600 transition-colors"><Trash2 className="h-4 w-4"/></button>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>

               <div className="w-full lg:w-[65%] p-8 flex flex-col overflow-hidden bg-white">
                  <div className="flex items-center justify-between mb-8">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ADICIONAR DO CATÁLOGO</h4>
                     <div className="flex items-center gap-3">
                        <Grid className="h-4 w-4 text-blue-600" />
                        <div className="w-12 h-1 bg-slate-50 rounded-full"></div>
                     </div>
                  </div>
                  <div className="relative mb-8">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400"/>
                    <input className={dashboardInputClasses} placeholder="Busque por código, linha ou descrição comercial..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                  </div>
                  
                  <div className="flex-grow overflow-y-auto pr-3 custom-scrollbar">
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                       {products
                         .filter(p => !productSearch || p.description.toLowerCase().includes(productSearch.toLowerCase()) || p.code.toLowerCase().includes(productSearch.toLowerCase()))
                         .map(p => (
                           <div key={p.id} className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100 flex flex-col hover:bg-white hover:border-blue-500 hover:shadow-2xl transition-all group cursor-pointer" onClick={() => {
                               const exists = tempOrderItems.find(it => it.id === p.id);
                               if (exists) setTempOrderItems(tempOrderItems.map(it => it.id === p.id ? { ...it, quantity: it.quantity + 1 } : it));
                               else setTempOrderItems([...tempOrderItems, { ...p, quantity: 1 }]);
                           }}>
                              <div className="relative pt-[100%] bg-white rounded-2xl overflow-hidden border border-slate-100 mb-4">
                                 <img src={p.imageUrl} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt=""/>
                                 <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-all flex items-center justify-center">
                                    <Plus className="h-10 w-10 text-white opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100" />
                                 </div>
                              </div>
                              <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-1 truncate">{p.line || 'DICOMPEL'}</p>
                              <p className="text-[10px] font-black text-slate-900 uppercase leading-tight line-clamp-2 min-h-[2.4rem]">{p.description}</p>
                              <div className="mt-4 flex items-center justify-between">
                                <span className="text-[8px] font-black text-slate-300 bg-white px-2 py-1 rounded border border-slate-100">{p.code}</span>
                                <div className="bg-slate-900 text-white p-2 rounded-xl group-hover:bg-blue-600 transition-all shadow-lg shadow-slate-200"><Plus className="h-4 w-4" /></div>
                              </div>
                           </div>
                       ))}
                    </div>
                  </div>
               </div>
            </div>

            <div className="p-10 bg-slate-900 flex flex-col sm:flex-row justify-between items-center gap-8 border-t border-white/5">
               <div className="flex items-center gap-10">
                  <div className="text-center">
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Total de Volumes</p>
                     <p className="text-4xl font-black text-white">{tempOrderItems.reduce((a, b) => a + b.quantity, 0)}</p>
                  </div>
                  <div className="w-px h-12 bg-white/10"></div>
                  <div className="text-center">
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Linhas de Produto</p>
                     <p className="text-4xl font-black text-white">{tempOrderItems.length}</p>
                  </div>
               </div>
               <div className="flex gap-4 w-full sm:w-auto">
                  <Button variant="outline" onClick={() => setIsEditingOrderItems(false)} className="rounded-2xl h-16 px-10 font-black uppercase text-[10px] tracking-widest border-slate-700 text-white hover:bg-slate-800">CANCELAR</Button>
                  <Button onClick={saveOrderItemsChanges} className="rounded-2xl h-16 px-16 font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-blue-500/20">CONFIRMAR ALTERAÇÕES</Button>
               </div>
            </div>
         </div>
      </div>
    );
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 no-print">
          <div className="flex items-center gap-6">
             <div className="bg-slate-900 text-white p-5 rounded-[2rem] shadow-2xl shadow-slate-200">
               <LayoutDashboard className="h-7 w-7" />
             </div>
             <div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Console de Gestão</h2>
                <div className="flex items-center gap-3 mt-2">
                   <div className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse"></div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{user.role} OPERACIONAL</p>
                </div>
             </div>
          </div>
      </div>

      <div className="flex gap-2 border-b border-slate-100 overflow-x-auto no-print scrollbar-hide">
        {['orders', 'products', 'users', 'profile'].map(tab => (
           (tab !== 'products' || canManageProducts) && (tab !== 'users' || canManageUsers) && (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`py-6 px-10 text-[10px] font-black uppercase tracking-[0.25em] transition-all relative ${activeTab === tab ? 'text-blue-600' : 'text-slate-400 hover:text-slate-900'}`}>
                {tab === 'orders' ? 'ESTEIRA CRM' : tab === 'products' ? 'MEU CATÁLOGO' : tab === 'users' ? 'TIME COMERCIAL' : 'MEU PERFIL'}
                {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-1.5 bg-blue-600 rounded-t-full"></div>}
            </button>
           )
        ))}
      </div>

      <div className="min-h-[60vh]">
        {loading && activeTab !== 'profile' ? (
          <div className="flex flex-col items-center justify-center p-40 text-slate-200">
             <div className="loader mb-8 border-slate-100 border-t-blue-600"></div>
             <p className="text-[11px] font-black uppercase tracking-[0.4em] animate-pulse">Estabelecendo Conexão Segura...</p>
          </div>
        ) : (
          <>
            {activeTab === 'orders' && renderCRMBoard()}
            {activeTab === 'products' && renderProductList()}
            {activeTab === 'users' && renderUserList()}
            {activeTab === 'profile' && (
                <div className="max-w-3xl mx-auto bg-white rounded-[3rem] shadow-2xl border border-slate-50 overflow-hidden">
                    <div className="p-10 bg-slate-900 text-white flex items-center gap-8">
                        <div className="bg-blue-600 p-6 rounded-[2rem] shadow-2xl shadow-blue-500/30">
                            <UserIcon className="h-12 w-12" />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black uppercase tracking-tight">Configurações Pessoais</h3>
                            <p className="text-slate-400 font-bold text-sm mt-2">Dados de identificação e segurança Dicompel.</p>
                        </div>
                    </div>

                    <form onSubmit={handleProfileUpdate} className="p-10 space-y-12">
                        {profileMessage.text && (
                           <div className={`p-6 rounded-2xl text-xs font-black border flex items-center gap-4 ${profileMessage.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                              {profileMessage.type === 'success' ? <CheckCircle className="h-6 w-6"/> : <AlertTriangle className="h-6 w-6"/>}
                              {profileMessage.text}
                           </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-4 ml-1">NOME CORPORATIVO</label>
                            <input className={dashboardInputClasses} value={profileName} onChange={e => setProfileName(e.target.value)} required />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-4 ml-1">E-MAIL DE ACESSO</label>
                            <input className="w-full bg-slate-50 border-2 border-slate-50 p-4 rounded-xl text-slate-400 font-bold shadow-inner cursor-not-allowed" value={user.email} disabled />
                          </div>
                        </div>

                        <div className="pt-12 border-t border-slate-50">
                          <h4 className="text-xs font-black text-slate-900 mb-8 flex items-center gap-4 uppercase tracking-[0.2em]">
                              <div className="bg-slate-100 p-2 rounded-lg"><Lock className="h-5 w-5 text-slate-900"/></div>
                              REDEFINIÇÃO DE SEGURANÇA
                          </h4>
                          <div className="bg-slate-50/50 p-10 rounded-[2.5rem] border border-slate-100">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4 ml-1">Nova Senha de Acesso</label>
                              <input type="password" className={dashboardInputClasses} placeholder="Deixe vazio para manter a atual" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                          </div>
                        </div>

                        <Button type="submit" className="w-full h-20 rounded-[2rem] text-lg font-black shadow-2xl shadow-blue-500/10 tracking-tighter uppercase">SALVAR TODAS AS ALTERAÇÕES</Button>
                    </form>
                </div>
            )}
          </>
        )}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[3.5rem] shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-white/20">
            <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-8">
                 <div className="bg-blue-600 p-5 rounded-3xl shadow-2xl shadow-blue-500/30"><Package className="h-8 w-8"/></div>
                 <div>
                    <h3 className="text-3xl font-black uppercase tracking-tight">Pedido #{selectedOrder.id.slice(0,8)}</h3>
                    <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.4em] mt-2">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                 </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-4 hover:bg-white/10 rounded-2xl transition-all"><X className="h-8 w-8 text-slate-500 hover:text-white"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-12 space-y-12 bg-slate-50/20 custom-scrollbar">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col h-full">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 border-b border-slate-50 pb-4">DADOS DO CLIENTE</p>
                     <div className="space-y-8 flex-grow">
                        <div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">NOME / RAZÃO SOCIAL</p>
                           <p className="text-3xl font-black text-slate-900 uppercase leading-none">{selectedOrder.customerName}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                           <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <Phone className="h-5 w-5 text-blue-600" />
                              <p className="text-sm font-black text-slate-700">{selectedOrder.customerContact || 'Sem contato cadastrado'}</p>
                           </div>
                           <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <Mail className="h-5 w-5 text-blue-600" />
                              <p className="text-sm font-black text-slate-700 truncate">{selectedOrder.customerEmail || 'Sem e-mail cadastrado'}</p>
                           </div>
                        </div>
                     </div>
                  </div>
                  <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col h-full">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 border-b border-slate-50 pb-4">WORKFLOW E STATUS</p>
                     <div className="space-y-8">
                        <div>
                           <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block">ALTERAR ETAPA ATUAL</label>
                           <select className={`w-full h-12 rounded-xl px-4 font-bold uppercase text-xs tracking-widest shadow-xl border-0 transition-all ${getStatusColor(selectedOrder.status)} text-white cursor-pointer ring-offset-2 focus:ring-2 focus:ring-blue-100`} value={selectedOrder.status} onChange={async (e) => { const upd = { ...selectedOrder, status: e.target.value as OrderStatus }; await orderService.update(upd); setSelectedOrder(upd); loadData(); }}>
                              {Object.values(OrderStatus).map(s => <option key={s} value={s} className="text-slate-900 font-bold">{s}</option>)}
                           </select>
                        </div>
                        <Button variant="outline" className="w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] border-slate-200" onClick={() => window.print()}><Printer className="h-5 w-5 mr-3"/> IMPRIMIR ORÇAMENTO</Button>
                     </div>
                  </div>
               </div>

               <div className="border border-slate-100 rounded-[3rem] overflow-hidden bg-white shadow-2xl shadow-slate-200/50">
                  <div className="bg-slate-50/50 px-10 py-8 flex justify-between items-center border-b border-slate-50">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">RELAÇÃO DE PRODUTOS ({selectedOrder.items.length})</h4>
                     <button onClick={() => { setTempOrderItems([...selectedOrder.items]); setIsEditingOrderItems(true); }} className="text-blue-600 text-[10px] font-black hover:bg-blue-600 hover:text-white px-8 py-4 rounded-2xl transition-all border-2 border-blue-50 hover:border-blue-600 uppercase tracking-widest">
                        EDITAR QUANTIDADES
                     </button>
                  </div>
                  <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {selectedOrder.items.map((it, i) => (
                      <div key={i} className="px-10 py-8 flex items-center justify-between hover:bg-slate-50/30 transition-colors">
                        <div className="flex items-center gap-8">
                           <img src={it.imageUrl} className="h-24 w-24 object-cover rounded-3xl border border-slate-50 bg-white shadow-sm" alt=""/>
                           <div>
                              <p className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2 leading-none">{it.description}</p>
                              <div className="flex gap-3">
                                <span className="text-[9px] bg-slate-900 text-white px-2 py-0.5 rounded font-black tracking-widest">{it.code}</span>
                                <span className="text-[9px] bg-slate-50 text-slate-400 px-2 py-0.5 rounded font-bold uppercase tracking-widest">REF: {it.reference}</span>
                              </div>
                           </div>
                        </div>
                        <div className="text-center bg-slate-900 text-white px-8 py-4 rounded-3xl shadow-xl">
                           <span className="text-3xl font-black leading-none">{it.quantity}</span>
                           <p className="text-[8px] font-black text-slate-500 uppercase mt-2 tracking-widest">UNIDADES</p>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>

            <div className="p-12 bg-white border-t border-slate-50 flex justify-between items-center">
              <button onClick={async () => { if(confirm('⚠️ Deletar este pedido permanentemente?')) { await orderService.delete(selectedOrder.id); setSelectedOrder(null); loadData(); } }} className="text-rose-600 font-black uppercase text-[10px] bg-rose-50 px-10 py-6 rounded-2xl hover:bg-rose-600 hover:text-white transition-all border border-rose-100 tracking-widest">
                 EXCLUIR REGISTRO
              </button>
              <Button onClick={() => setSelectedOrder(null)} className="rounded-2xl h-18 px-20 font-black uppercase text-[10px] tracking-[0.3em] h-16">FECHAR PAINEL</Button>
            </div>
          </div>
        </div>
      )}

      {isEditingOrderItems && renderOrderEditor()}

      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/98 backdrop-blur-xl flex items-center justify-center p-4 z-[150]">
          <form onSubmit={handleProductSave} className="bg-white rounded-[3rem] shadow-2xl max-w-2xl w-full overflow-hidden border border-white/20">
            <div className="p-8 bg-white border-b border-slate-50 flex justify-between items-center">
               <div className="flex items-center gap-6">
                  <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-xl shadow-blue-200"><Package className="h-7 w-7"/></div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Propriedades do Produto</h3>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Inventário dicompel industrial</p>
                  </div>
               </div>
               <button type="button" onClick={() => setEditingProduct(null)} className="bg-slate-50 p-4 rounded-full group hover:bg-slate-100 transition-all"><X className="h-6 w-6 text-slate-400 group-hover:text-slate-900"/></button>
            </div>
            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-3 ml-1 tracking-[0.2em]">CÓDIGO INTERNO</label>
                    <input className={dashboardInputClasses} value={editingProduct.code || ''} onChange={e => setEditingProduct({...editingProduct, code: e.target.value})} required placeholder="Ex: NOV-001" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-3 ml-1 tracking-[0.2em]">REFERÊNCIA FÁBRICA</label>
                    <input className={dashboardInputClasses} value={editingProduct.reference || ''} onChange={e => setEditingProduct({...editingProduct, reference: e.target.value})} required placeholder="Ex: REF-99" />
                 </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-3 ml-1 tracking-[0.2em]">DESCRIÇÃO COMERCIAL</label>
                <input className={dashboardInputClasses} value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} required placeholder="Ex: Placa 4x2 Novara Branca" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-3 ml-1 tracking-[0.2em]">LINHA / COLEÇÃO</label>
                    <input className={dashboardInputClasses} value={editingProduct.line || ''} onChange={e => setEditingProduct({...editingProduct, line: e.target.value})} required placeholder="Ex: Novara" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-3 ml-1 tracking-[0.2em]">CATEGORIA BASE</label>
                    <input className={dashboardInputClasses} value={editingProduct.category || ''} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} required placeholder="Ex: Interruptores" />
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-3 ml-1 tracking-[0.2em]">PALETA DE CORES (Separar por vírgula)</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"><Palette className="h-5 w-5"/></div>
                      <input className={dashboardInputClasses + " pl-12"} value={typeof editingProduct.colors === 'string' ? editingProduct.colors : (editingProduct.colors || []).join(', ')} onChange={e => setEditingProduct({...editingProduct, colors: e.target.value})} placeholder="Branco, Preto, Alumínio" />
                    </div>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-3 ml-1 tracking-[0.2em]">URL DA IMAGEM DO PRODUTO</label>
                    <div className="flex gap-3">
                       <div className="relative flex-grow">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"><ImageIcon className="h-5 w-5"/></div>
                          <input className={dashboardInputClasses + " pl-12"} value={editingProduct.imageUrl || ''} onChange={e => setEditingProduct({...editingProduct, imageUrl: e.target.value})} placeholder="https://link-da-imagem.com" />
                       </div>
                       <button type="button" className="bg-slate-800 border-2 border-slate-700 p-4 rounded-xl text-white hover:bg-slate-700 transition-all flex-shrink-0 shadow-lg" title="Upload de Arquivo">
                          <Upload className="h-6 w-6"/>
                       </button>
                    </div>
                 </div>
              </div>
            </div>
            <div className="p-10 bg-slate-50 flex justify-end gap-6 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setEditingProduct(null)} className="rounded-2xl h-14 px-12 font-black uppercase text-[10px] tracking-widest border-slate-200">DESCARTAR</Button>
              <Button type="submit" className="rounded-2xl h-14 px-20 font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-blue-200">SALVAR PRODUTO</Button>
            </div>
          </form>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/98 backdrop-blur-2xl flex items-center justify-center p-4 z-[150]">
          <form onSubmit={handleUserSave} className="bg-white rounded-[3rem] shadow-2xl max-w-lg w-full overflow-hidden border border-white/20">
            <div className="p-10 bg-white border-b border-slate-50 flex justify-between items-center">
               <div className="flex items-center gap-6">
                  <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl"><Users className="h-7 w-7"/></div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Gerenciar Acesso</h3>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Configurações de rede corporativa</p>
                  </div>
               </div>
               <button type="button" onClick={() => setEditingUser(null)} className="bg-slate-50 p-4 rounded-full group hover:bg-slate-100 transition-all"><X className="h-6 w-6 text-slate-400 group-hover:text-slate-900"/></button>
            </div>
            <div className="p-10 space-y-10">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase block mb-4 ml-1 tracking-[0.2em]">NOME COMPLETO DO VENDEDOR</label>
                   <input className={dashboardInputClasses} value={editingUser.name || ''} onChange={e => setEditingUser({...editingUser, name: e.target.value})} required placeholder="Ex: João Silva" />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase block mb-4 ml-1 tracking-[0.2em]">E-MAIL CORPORATIVO (LOGIN)</label>
                   <input className={dashboardInputClasses} type="email" value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} required placeholder="exemplo@dicompel.com.br" />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase block mb-4 ml-1 tracking-[0.2em]">DEFINIR NOVA SENHA</label>
                   <input className={dashboardInputClasses} type="password" value={editingUser.password || ''} onChange={e => setEditingUser({...editingUser, password: e.target.value})} placeholder={editingUser.id ? "Manter atual (vazio)" : "Mínimo 6 caracteres"} required={!editingUser.id} />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase block mb-4 ml-1 tracking-[0.2em]">NÍVEL DE ACESSO AO SISTEMA</label>
                   <select className={dashboardInputClasses} value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}>
                      <option value={UserRole.REPRESENTATIVE} className="bg-slate-800 text-white">REPRESENTANTE COMERCIAL</option>
                      <option value={UserRole.SUPERVISOR} className="bg-slate-800 text-white">SUPERVISOR DE VENDAS</option>
                      {user.role === UserRole.ADMIN && <option value={UserRole.ADMIN} className="bg-slate-800 text-white">ADMINISTRADOR GLOBAL</option>}
                   </select>
                </div>
            </div>
            <div className="p-10 bg-slate-50 flex justify-end gap-6 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setEditingUser(null)} className="rounded-2xl h-16 px-10 font-black uppercase text-[10px] tracking-widest border-slate-200">CANCELAR</Button>
              <Button type="submit" className="rounded-2xl h-16 px-16 font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-slate-200">GRAVAR DADOS</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
