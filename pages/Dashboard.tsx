
import React, { useState, useEffect, useCallback } from 'react';
import { User, UserRole, Order, Product, OrderStatus, CartItem } from '../types';
import { orderService, productService, userService, authService } from '../services/api';
import { Button } from '../components/Button';
import { Plus, Trash2, Edit2, Search, X, LayoutDashboard, ShoppingBag, ImageIcon, Upload, FileSpreadsheet, ExternalLink, Calendar, User as UserIcon, Phone, Mail, Package, ArrowRight, Save, Printer, Download, Camera, ShieldCheck, UserCheck, Briefcase, Lock, LogOut, Settings } from 'lucide-react';

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
  const [userSearch, setUserSearch] = useState('');
  
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);

  // CRM States
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [orderAddProductSearch, setOrderAddProductSearch] = useState('');

  const darkInput = "w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 text-sm focus:outline-none transition-all";

  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      
      const [prodData, userData] = await Promise.all([
        productService.getAll(),
        userService.getAll()
      ]);
      
      setProducts(prodData || []);
      setUsers(userData || []);

      if (activeTab === 'orders') {
        const data = (user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR) 
          ? await orderService.getAll() 
          : await orderService.getByRep(user.id);
        setOrders(data || []);
      }
    } catch (err) { 
      console.error(err); 
    } finally { 
      if (!isSilent) setLoading(false); 
    }
  }, [activeTab, user]);

  useEffect(() => {
    // Só mostramos o loading quando trocamos de aba. 
    // O refreshTrigger (vindo do App.tsx) é tratado como silencioso para não piscar a tela.
    loadData(false);
  }, [activeTab]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      loadData(true);
    }
  }, [refreshTrigger, loadData]);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await orderService.updateStatus(orderId, newStatus);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
      loadData(true);
    } catch (err) {
      alert("Erro ao atualizar status.");
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm("Tem certeza que deseja EXCLUIR permanentemente este pedido?")) return;
    try {
      await orderService.delete(orderId);
      setSelectedOrder(null);
      loadData(true);
      alert("Pedido excluído com sucesso.");
    } catch (err) {
      alert("Erro ao excluir pedido.");
    }
  };

  const handleSaveOrderChanges = async () => {
    if (!selectedOrder) return;
    try {
      await orderService.update(selectedOrder);
      setIsEditingOrder(false);
      loadData(true);
      alert("Alterações salvas com sucesso!");
    } catch (err) {
      alert("Erro ao salvar alterações do pedido.");
    }
  };

  const removeItemFromOrder = (idx: number) => {
    if (!selectedOrder) return;
    const newItems = [...selectedOrder.items];
    newItems.splice(idx, 1);
    setSelectedOrder({ ...selectedOrder, items: newItems });
  };

  const addItemToOrder = (p: Product) => {
    if (!selectedOrder) return;
    const existingIdx = selectedOrder.items.findIndex(item => item.id === p.id);
    if (existingIdx > -1) {
      const newItems = [...selectedOrder.items];
      newItems[existingIdx].quantity += 1;
      setSelectedOrder({ ...selectedOrder, items: newItems });
    } else {
      setSelectedOrder({ 
        ...selectedOrder, 
        items: [...selectedOrder.items, { ...p, quantity: 1 }] 
      });
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      if (editingProduct.id) await productService.update(editingProduct as Product);
      else await productService.create(editingProduct as any);
      setShowProductModal(false);
      setEditingProduct(null);
      loadData(true);
      alert("Produto salvo com sucesso!");
    } catch (err: any) { alert(`Erro: ${err.message}`); }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    // Regra de segurança: Supervisor não pode criar ou editar Admin
    if (user.role === UserRole.SUPERVISOR && editingUser.role === UserRole.ADMIN) {
      alert("Você não tem permissão para gerenciar Administradores.");
      return;
    }

    try {
      if (editingUser.id) {
        await userService.update(editingUser as User);
      } else {
        await userService.create(editingUser as any);
      }
      setShowUserModal(false);
      setEditingUser(null);
      loadData(true);
      alert("Usuário salvo com sucesso!");
    } catch (err: any) {
      alert(`Erro ao salvar usuário: ${err.message}`);
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (u.role === UserRole.ADMIN && user.role !== UserRole.ADMIN) {
      alert("Você não pode excluir um Administrador.");
      return;
    }
    if (!window.confirm(`Deseja realmente excluir o usuário ${u.name}?`)) return;
    try {
      await userService.delete(u.id);
      loadData(true);
      alert("Usuário removido.");
    } catch (err) {
      alert("Erro ao remover usuário.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditingProduct(p => p ? ({ ...p, imageUrl: reader.result as string }) : null);
      reader.readAsDataURL(file);
    }
  };

  const getRepName = (id: string) => {
    return users.find(u => u.id === id)?.name || "N/A";
  };

  const getStatusClass = (status: OrderStatus) => {
    switch(status) {
      case OrderStatus.NEW: return 'bg-blue-100 text-blue-700 border-blue-200';
      case OrderStatus.IN_PROGRESS: return 'bg-amber-100 text-amber-700 border-amber-200';
      case OrderStatus.CLOSED: return 'bg-green-100 text-green-700 border-green-200';
      case OrderStatus.CANCELLED: return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700';
    }
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
    link.setAttribute("download", `pedido_dicompel_${order.id}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return <span className="bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Admin</span>;
      case UserRole.SUPERVISOR:
        return <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1"><UserCheck className="h-3 w-3" /> Supervisor</span>;
      case UserRole.REPRESENTATIVE:
        return <span className="bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1"><Briefcase className="h-3 w-3" /> Representante</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">{role}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 no-print">
         <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg"><LayoutDashboard className="h-6 w-6" /></div>
         <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Painel Gestão</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user.role}</p>
         </div>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto no-print">
        {['orders', 'products', 'users', 'profile'].map(tab => (
           (tab !== 'products' || user.role !== UserRole.REPRESENTATIVE) && 
           (tab !== 'users' || user.role !== UserRole.REPRESENTATIVE) && (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`py-4 px-6 text-[10px] font-black uppercase relative transition-all ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                {tab === 'orders' ? 'CRM Vendas' : tab === 'products' ? 'Catálogo & Estoque' : tab === 'users' ? 'Equipe' : 'Configurações'}
            </button>
           )
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center p-20 no-print"><div className="loader"></div></div>
      ) : (
        <>
          {activeTab === 'products' && (
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden no-print">
               <div className="p-5 bg-slate-50 border-b flex justify-between items-center gap-4">
                  <div className="relative w-64">
                    <Search className="absolute inset-y-0 left-3 h-4 w-4 text-slate-400 my-auto" />
                    <input type="text" placeholder="Filtrar produtos..." className="pl-9 pr-4 py-2 border rounded-xl text-xs w-full" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
                  </div>
                  <Button size="sm" className="font-black uppercase text-[10px]" onClick={() => { setEditingProduct({ colors: [], amperage: '', category: '', line: '', details: '', subcategory: '' }); setShowProductModal(true); }}>
                    + NOVO PRODUTO
                  </Button>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b">
                      <tr>
                        <th className="px-6 py-4">Produto</th>
                        <th className="px-6 py-4">Linha</th>
                        <th className="px-6 py-4">Amperagem</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products.filter(p => p.description.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 flex items-center gap-3">
                            <img src={p.imageUrl} className="w-10 h-10 object-contain rounded border bg-white p-1" alt=""/>
                            <div>
                               <p className="text-xs font-bold text-slate-900">{p.description}</p>
                               <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{p.code}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4"><span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{p.line}</span></td>
                          <td className="px-6 py-4">
                             <span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded uppercase">{p.amperage || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <button onClick={() => { setEditingProduct(p); setShowProductModal(true); }} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg"><Edit2 className="h-4 w-4"/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          )}

          {activeTab === 'users' && (
             <div className="bg-white rounded-2xl shadow-sm border overflow-hidden no-print">
               <div className="p-5 bg-slate-50 border-b flex justify-between items-center gap-4">
                  <div className="relative w-64">
                    <Search className="absolute inset-y-0 left-3 h-4 w-4 text-slate-400 my-auto" />
                    <input type="text" placeholder="Filtrar equipe..." className="pl-9 pr-4 py-2 border rounded-xl text-xs w-full" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
                  </div>
                  <Button size="sm" className="font-black uppercase text-[10px]" onClick={() => { setEditingUser({ name: '', email: '', role: UserRole.REPRESENTATIVE, password: '' }); setShowUserModal(true); }}>
                    + NOVO USUÁRIO
                  </Button>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b">
                      <tr>
                        <th className="px-6 py-4">Membro da Equipe</th>
                        <th className="px-6 py-4">Role / Nível</th>
                        <th className="px-6 py-4">E-mail Corporativo</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 flex items-center gap-3">
                             <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">
                                {u.name.charAt(0)}
                             </div>
                             <div>
                                <p className="text-xs font-bold text-slate-900">{u.name}</p>
                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">ID: {String(u.id).slice(-6)}</p>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             {getRoleBadge(u.role)}
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-600">
                             {u.email}
                          </td>
                          <td className="px-6 py-4 text-right flex justify-end gap-2">
                             {(user.role === UserRole.ADMIN || (user.role === UserRole.SUPERVISOR && u.role !== UserRole.ADMIN)) && (
                               <>
                                 <button onClick={() => { setEditingUser(u); setShowUserModal(true); }} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg transition-colors"><Edit2 className="h-4 w-4"/></button>
                                 <button onClick={() => handleDeleteUser(u)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4"/></button>
                               </>
                             )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          )}

          {activeTab === 'profile' && (
             <div className="max-w-2xl mx-auto py-10 no-print">
               <div className="bg-white rounded-3xl border shadow-xl p-10 flex flex-col items-center text-center">
                  <div className="h-24 w-24 rounded-full bg-slate-900 flex items-center justify-center text-4xl font-black text-white shadow-xl mb-6">
                     {user.name.charAt(0)}
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{user.name}</h3>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mb-8">{user.role}</p>
                  
                  <div className="w-full space-y-4 mb-10">
                     <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border">
                        <span className="text-[10px] font-black text-slate-400 uppercase">E-mail Corporativo</span>
                        <span className="text-sm font-bold text-slate-900">{user.email}</span>
                     </div>
                     <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Status da Conta</span>
                        <span className="text-[9px] font-black bg-green-100 text-green-700 px-3 py-1 rounded-full uppercase">Ativo</span>
                     </div>
                  </div>

                  <div className="flex gap-4 w-full">
                     <Button variant="outline" className="flex-1 h-14 font-black uppercase text-[10px]" onClick={() => window.location.reload()}>
                        Recarregar App
                     </Button>
                     <Button variant="danger" className="flex-1 h-14 font-black uppercase text-[10px]" onClick={() => authService.logout().then(() => window.location.reload())}>
                        <LogOut className="h-4 w-4 mr-2"/> Encerrar Sessão
                     </Button>
                  </div>
               </div>
             </div>
          )}

          {activeTab === 'orders' && (
             <div className="grid grid-cols-1 gap-4 no-print">
                {orders.map(order => (
                   <div key={order.id} className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 hover:border-blue-200 transition-all group">
                      <div className="flex-grow">
                         <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{String(order.id).slice(-6)}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Calendar className="h-3 w-3"/> {new Date(order.createdAt).toLocaleDateString()}</span>
                         </div>
                         <h4 className="text-sm font-black text-slate-900 uppercase mb-1">{order.customerName || 'Cliente sem Nome'}</h4>
                         <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase">
                            <span className="flex items-center gap-1"><UserIcon className="h-3 w-3 text-blue-500"/> Rep: {getRepName(order.representativeId)}</span>
                            <span className="flex items-center gap-1"><Package className="h-3 w-3 text-blue-500"/> {order.items?.length || 0} Itens</span>
                         </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusClass(order.status as OrderStatus)}`}>
                            {order.status}
                         </span>
                         <Button size="sm" variant="outline" className="text-[9px] font-black uppercase h-10 px-4 group-hover:bg-blue-600 group-hover:text-white transition-all" onClick={() => { setSelectedOrder(order); setIsEditingOrder(false); }}>
                            Detalhes do Pedido <ArrowRight className="h-3 w-3 ml-2" />
                         </Button>
                      </div>
                   </div>
                ))}
                {orders.length === 0 && (
                   <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center">
                      <ShoppingBag className="h-12 w-12 text-slate-200 mb-4" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum pedido encontrado no sistema.</p>
                      <Button variant="outline" size="sm" className="mt-6 text-[10px] font-black" onClick={() => loadData(false)}>Atualizar Lista</Button>
                   </div>
                )}
             </div>
          )}
        </>
      )}

      {/* MODAL USUÁRIO (CADASTRO / EDIÇÃO) */}
      {showUserModal && editingUser && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[350] no-print">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full p-10 overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-8">
               <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{editingUser.id ? 'Editar Membro' : 'Novo Membro'}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestão de Equipe Dicompel</p>
               </div>
               <button onClick={() => setShowUserModal(false)} className="text-slate-300 hover:text-slate-900 bg-slate-50 p-2 rounded-full"><X className="h-8 w-8"/></button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-6">
               <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Nome Completo</label>
                  <div className="relative">
                     <UserIcon className="absolute inset-y-0 left-3 h-5 w-5 text-slate-500 my-auto" />
                     <input required type="text" className={`${darkInput} pl-10`} value={editingUser.name || ''} onChange={e => setEditingUser({...editingUser, name: e.target.value})} placeholder="Ex: João da Silva" />
                  </div>
               </div>

               <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">E-mail Corporativo</label>
                  <div className="relative">
                     <Mail className="absolute inset-y-0 left-3 h-5 w-5 text-slate-500 my-auto" />
                     <input required type="email" className={`${darkInput} pl-10`} value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} placeholder="joao@dicompel.com.br" />
                  </div>
               </div>

               <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Nível de Acesso (Cargo)</label>
                  <div className="relative">
                     <ShieldCheck className="absolute inset-y-0 left-3 h-5 w-5 text-slate-500 my-auto" />
                     <select 
                       required 
                       className={`${darkInput} pl-10 appearance-none`} 
                       value={editingUser.role || UserRole.REPRESENTATIVE} 
                       onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}
                     >
                        <option value={UserRole.REPRESENTATIVE}>REPRESENTANTE (Vendas)</option>
                        <option value={UserRole.SUPERVISOR}>SUPERVISOR (Gestão)</option>
                        {user.role === UserRole.ADMIN && <option value={UserRole.ADMIN}>ADMINISTRADOR (Total)</option>}
                     </select>
                  </div>
                  {user.role === UserRole.SUPERVISOR && <p className="text-[8px] text-slate-400 mt-1 uppercase font-bold">Apenas administradores podem criar outros administradores.</p>}
               </div>

               <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Senha de Acesso</label>
                  <div className="relative">
                     <Lock className="absolute inset-y-0 left-3 h-5 w-5 text-slate-500 my-auto" />
                     <input required={!editingUser.id} type="password" className={`${darkInput} pl-10`} value={editingUser.password || ''} onChange={e => setEditingUser({...editingUser, password: e.target.value})} placeholder="••••••••" />
                  </div>
                  {editingUser.id && <p className="text-[8px] text-slate-400 mt-1 uppercase font-bold italic">Deixe em branco para não alterar a senha.</p>}
               </div>

               <div className="flex gap-3 pt-6 border-t">
                <Button variant="outline" className="flex-1 h-14 font-black uppercase text-[10px]" type="button" onClick={() => setShowUserModal(false)}>CANCELAR</Button>
                <Button type="submit" className="flex-[2] h-14 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-blue-100">SALVAR MEMBRO</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALHES DO PEDIDO (CRM) */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 z-[300] no-print">
           <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                 <div>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">CRM Vendas - Dicompel Digital</span>
                    <h3 className="text-xl font-black text-slate-900 uppercase">PEDIDO #{String(selectedOrder.id).slice(-6)}</h3>
                 </div>
                 <div className="flex gap-2">
                    {!isEditingOrder ? (
                       <button onClick={() => setIsEditingOrder(true)} className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-blue-100 hover:bg-blue-100 transition-all">
                          <Edit2 className="h-4 w-4"/> Editar
                       </button>
                    ) : (
                       <button onClick={handleSaveOrderChanges} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-green-100 hover:bg-green-700 transition-all">
                          <Save className="h-4 w-4"/> Salvar Pedido
                       </button>
                    )}
                    <button onClick={() => setSelectedOrder(null)} className="text-slate-300 hover:text-slate-900 bg-white p-2 rounded-full shadow-sm"><X className="h-8 w-8"/></button>
                 </div>
              </div>
              
              <div className="p-8 overflow-y-auto flex-grow space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Identificação</h4>
                       <div className="space-y-3">
                          {isEditingOrder ? (
                             <>
                               <input type="text" className={darkInput} value={selectedOrder.customerName} onChange={e => setSelectedOrder({...selectedOrder, customerName: e.target.value})} placeholder="Nome do Cliente" />
                               <input type="text" className={darkInput} value={selectedOrder.customerContact} onChange={e => setSelectedOrder({...selectedOrder, customerContact: e.target.value})} placeholder="Telefone" />
                               <input type="text" className={darkInput} value={selectedOrder.customerEmail} onChange={e => setSelectedOrder({...selectedOrder, customerEmail: e.target.value})} placeholder="E-mail" />
                             </>
                          ) : (
                             <>
                                <p className="text-sm font-bold text-slate-900 flex items-center gap-2"><UserIcon className="h-4 w-4 text-blue-500"/> {selectedOrder.customerName}</p>
                                <p className="text-sm font-bold text-slate-600 flex items-center gap-2"><Phone className="h-4 w-4 text-blue-500"/> {selectedOrder.customerContact || 'Não informado'}</p>
                                <p className="text-sm font-bold text-slate-600 flex items-center gap-2"><Mail className="h-4 w-4 text-blue-500"/> {selectedOrder.customerEmail || 'Não informado'}</p>
                             </>
                          )}
                       </div>
                    </div>
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Status & Controle</h4>
                       <select 
                        value={selectedOrder.status} 
                        onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value as OrderStatus)}
                        className={`w-full p-3 rounded-xl text-xs font-black uppercase tracking-widest border-2 focus:outline-none ${getStatusClass(selectedOrder.status as OrderStatus)}`}
                       >
                          <option value={OrderStatus.NEW}>{OrderStatus.NEW}</option>
                          <option value={OrderStatus.IN_PROGRESS}>{OrderStatus.IN_PROGRESS}</option>
                          <option value={OrderStatus.CLOSED}>{OrderStatus.CLOSED}</option>
                          <option value={OrderStatus.CANCELLED}>{OrderStatus.CANCELLED}</option>
                       </select>
                       <div className="flex gap-2">
                          <Button variant="outline" className="flex-1 text-[9px] font-black bg-white" onClick={() => exportToExcel(selectedOrder)}>
                             <FileSpreadsheet className="h-3.5 w-3.5 mr-2" /> EXCEL (CSV)
                          </Button>
                          <Button variant="outline" className="flex-1 text-[9px] font-black bg-white" onClick={() => window.print()}>
                             <Printer className="h-3.5 w-3.5 mr-2" /> IMPRIMIR PDF
                          </Button>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens do Pedido ({selectedOrder.items?.length || 0})</h4>
                    </div>
                    
                    {isEditingOrder && (
                       <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                          <p className="text-[10px] font-black text-blue-600 uppercase mb-2">Adicionar mais produtos:</p>
                          <div className="relative mb-3">
                             <Search className="absolute inset-y-0 left-3 h-4 w-4 text-blue-400 my-auto" />
                             <input type="text" className="w-full pl-10 pr-3 py-2 border border-blue-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Buscar por código ou nome..." value={orderAddProductSearch} onChange={e => setOrderAddProductSearch(e.target.value)} />
                          </div>
                          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                             {products.filter(p => p.description.toLowerCase().includes(orderAddProductSearch.toLowerCase()) || p.code.toLowerCase().includes(orderAddProductSearch.toLowerCase())).slice(0, 10).map(p => (
                                <button key={p.id} onClick={() => addItemToOrder(p)} className="flex-shrink-0 w-24 bg-white border border-slate-200 rounded-lg p-2 hover:border-blue-500 transition-all text-center">
                                   <img src={p.imageUrl} className="w-12 h-12 object-contain mx-auto mb-1" alt=""/>
                                   <p className="text-[8px] font-black text-slate-800 line-clamp-1">{p.description}</p>
                                   <p className="text-[7px] font-bold text-slate-400">{p.code}</p>
                                   <div className="mt-1 flex items-center justify-center bg-blue-600 text-white rounded p-0.5"><Plus className="h-2.5 w-2.5"/></div>
                                </button>
                             ))}
                          </div>
                       </div>
                    )}

                    <div className="bg-slate-50 rounded-2xl border overflow-hidden">
                       <table className="w-full text-left">
                          <thead className="bg-slate-100 text-[9px] font-black uppercase text-slate-400">
                             <tr>
                                <th className="px-4 py-3">Produto</th>
                                <th className="px-4 py-3 text-center">Linha</th>
                                <th className="px-4 py-3 text-center">Qtd</th>
                                <th className="px-4 py-3 text-right">Ação</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                             {selectedOrder.items?.map((item, idx) => (
                                <tr key={idx} className="bg-white">
                                   <td className="px-4 py-3 flex items-center gap-3">
                                      <img src={item.imageUrl} className="w-8 h-8 object-contain rounded border p-0.5" alt=""/>
                                      <div>
                                         <p className="text-xs font-bold text-slate-900">{item.description}</p>
                                         <p className="text-[9px] text-slate-400 font-bold uppercase">{item.code}</p>
                                      </div>
                                   </td>
                                   <td className="px-4 py-3 text-center"><span className="text-[9px] font-black text-blue-600 uppercase">{item.line}</span></td>
                                   <td className="px-4 py-3 text-center">
                                      {isEditingOrder ? (
                                         <input 
                                           type="number" 
                                           className="w-16 text-center border rounded font-black text-xs p-1" 
                                           value={item.quantity} 
                                           onChange={e => {
                                              const n = parseInt(e.target.value) || 1;
                                              const newItems = [...selectedOrder.items];
                                              newItems[idx].quantity = n;
                                              setSelectedOrder({...selectedOrder, items: newItems});
                                           }}
                                         />
                                      ) : (
                                         <span className="font-black text-slate-900">{item.quantity}</span>
                                      )}
                                   </td>
                                   <td className="px-4 py-3 text-right">
                                      {isEditingOrder && (
                                         <button onClick={() => removeItemFromOrder(idx)} className="p-1.5 text-slate-300 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4"/></button>
                                      )}
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Observações Adicionais:</p>
                    {isEditingOrder ? (
                       <textarea className={darkInput} rows={3} value={selectedOrder.notes} onChange={e => setSelectedOrder({...selectedOrder, notes: e.target.value})} />
                    ) : (
                       <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 italic text-xs text-slate-700">
                          "{selectedOrder.notes || 'Sem observações'}"
                       </div>
                    )}
                 </div>
              </div>
              
              <div className="p-8 border-t bg-slate-50 flex flex-col md:flex-row gap-4">
                 <Button variant="outline" className="flex-1 h-12 text-[10px] font-black uppercase" onClick={() => setSelectedOrder(null)}>FECHAR</Button>
                 <Button variant="danger" className="flex-1 h-12 text-[10px] font-black uppercase" onClick={() => handleDeleteOrder(selectedOrder.id)}>EXCLUIR PEDIDO COMPLETO</Button>
              </div>
           </div>
        </div>
      )}

      {/* VIEW DE IMPRESSÃO */}
      {selectedOrder && (
         <div className="hidden print-layout">
            <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-6">
               <div>
                  <h1 className="text-3xl font-black">DICOMPEL</h1>
                  <p className="text-xs font-black text-slate-400 uppercase">Resumo CRM Vendas</p>
               </div>
               <div className="text-right">
                  <h2 className="text-xl font-black">ORÇAMENTO DIGITAL</h2>
                  <p className="text-xs text-slate-500">#{selectedOrder.id}</p>
               </div>
            </div>
            <div className="mb-6 grid grid-cols-2 gap-4 text-xs font-bold bg-slate-50 p-4 border rounded-xl">
               <p>Cliente: <span className="font-black">{selectedOrder.customerName}</span></p>
               <p>Contato: <span className="font-black">{selectedOrder.customerContact}</span></p>
               <p>Data: <span className="font-black">{new Date(selectedOrder.createdAt).toLocaleDateString()}</span></p>
               <p>Rep: <span className="font-black">{getRepName(selectedOrder.representativeId)}</span></p>
            </div>
            <table className="w-full text-left border-collapse mb-6">
               <thead>
                  <tr className="bg-slate-900 text-white text-[10px] uppercase font-black">
                     <th className="p-2">Produto</th>
                     <th className="p-2">Cód</th>
                     <th className="p-2 text-center">Linha</th>
                     <th className="p-2 text-right">Qtd</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-200">
                  {selectedOrder.items.map((item, i) => (
                     <tr key={i} className="text-xs">
                        <td className="p-2 font-bold">{item.description}</td>
                        <td className="p-2">{item.code}</td>
                        <td className="p-2 text-center uppercase">{item.line}</td>
                        <td className="p-2 text-right font-black">{item.quantity}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
            <div className="p-4 bg-slate-50 border rounded-xl text-xs">
               <p className="font-black uppercase text-[10px] mb-1">Obs:</p>
               <p className="italic">"{selectedOrder.notes || 'Sem observações adicionais.'}"</p>
            </div>
         </div>
      )}

      {/* MODAL PRODUTO */}
      {showProductModal && editingProduct && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[200] no-print">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-3xl w-full p-10 overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
               <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Cadastro Técnico Dicompel</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gerenciamento de Item de Catálogo</p>
               </div>
               <button onClick={() => setShowProductModal(false)} className="text-slate-300 hover:text-slate-900 bg-slate-50 p-2 rounded-full"><X className="h-8 w-8"/></button>
            </div>
            
            <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-4 space-y-4">
                 <label className="text-[10px] font-black text-slate-400 uppercase block tracking-widest">Foto do Produto</label>
                 <div className="relative group w-full aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all">
                    {editingProduct.imageUrl ? (
                       <img src={editingProduct.imageUrl} className="w-full h-full object-contain p-4" alt="Preview"/>
                    ) : (
                       <div className="text-center p-6">
                          <ImageIcon className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                          <p className="text-[10px] font-bold text-slate-400">Clique para Upload</p>
                       </div>
                    )}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <div className="absolute bottom-4 right-4 bg-white/90 p-2 rounded-xl shadow-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                       <Upload className="h-4 w-4" />
                    </div>
                 </div>
              </div>

              <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Nome do Produto (Exibição)</label>
                  <input required type="text" className={darkInput} value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} placeholder="Ex: Tomada 2P+T Branca 10A Novara" />
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Código Interno</label>
                  <input required type="text" className={darkInput} value={editingProduct.code || ''} onChange={e => setEditingProduct({...editingProduct, code: e.target.value})} placeholder="Ex: TOM-01" />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Referência de Fábrica</label>
                  <input required type="text" className={darkInput} value={editingProduct.reference || ''} onChange={e => setEditingProduct({...editingProduct, reference: e.target.value})} />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Linha</label>
                  <input required type="text" className={darkInput} value={editingProduct.line || ''} onChange={e => setEditingProduct({...editingProduct, line: e.target.value})} placeholder="Ex: Novara, Classic..." />
                </div>

                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Categoria</label>
                   <input required type="text" className={darkInput} value={editingProduct.category || ''} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} placeholder="Ex: Tomadas, Interruptores..." />
                </div>
                
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Amperagem / Tensão</label>
                   <input type="text" className={darkInput} value={editingProduct.amperage || ''} onChange={e => setEditingProduct({...editingProduct, amperage: e.target.value})} placeholder="Ex: 10A, 20A, Bivolt..." />
                </div>

                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Subcategoria</label>
                   <input type="text" className={darkInput} value={editingProduct.subcategory || ''} onChange={e => setEditingProduct({...editingProduct, subcategory: e.target.value})} />
                </div>
              </div>

              <div className="md:col-span-12">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Descrição Técnica / Especificações (IA & Catálogo)</label>
                <textarea 
                   className={`${darkInput} min-h-[120px]`} 
                   rows={4} 
                   value={editingProduct.details || ''} 
                   onChange={e => setEditingProduct({...editingProduct, details: e.target.value})} 
                   placeholder="Informe aqui detalhes técnicos, materiais, dimensões e outras informações relevantes que aparecerão nos detalhes do produto."
                ></textarea>
              </div>

              <div className="md:col-span-12 flex gap-3 pt-6 border-t mt-4">
                <Button variant="outline" className="flex-1 h-14 font-black uppercase text-[10px]" type="button" onClick={() => setShowProductModal(false)}>CANCELAR</Button>
                <Button type="submit" className="flex-[2] h-14 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-blue-100">SALVAR PRODUTO NO BANCO</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
