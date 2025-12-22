
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Order, Product, OrderStatus, CRMInteraction, CartItem } from '../types';
import { authService, orderService, productService, userService } from '../services/api';
import { Button } from '../components/Button';
import { Plus, Trash2, Edit2, Search, CheckCircle, Package, Users, X, Printer, User as UserIcon, Lock, LayoutDashboard, ChevronRight, ShoppingBag, Grid, AlertTriangle, Phone, Mail, Upload, Palette, Image as ImageIcon } from 'lucide-react';

interface DashboardProps {
  user: User;
  refreshTrigger?: number; // Adicionado para disparar recarregamento vindo do App.tsx
}

export const Dashboard: React.FC<DashboardProps> = ({ user, refreshTrigger = 0 }) => {
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
  const [productSearch, setProductSearch] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManageProducts = user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR;
  const canManageUsers = user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR;

  useEffect(() => {
    loadData();
  }, [user, activeTab, refreshTrigger]); // Recarrega quando o trigger do App mudar

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
      default: return 'bg-slate-700';
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
      setProfileMessage({ type: 'success', text: 'Perfil atualizado!' });
    } catch (err) { setProfileMessage({ type: 'error', text: 'Erro ao processar.' }); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingProduct) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingProduct({ ...editingProduct, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // Novo Estilo Escuro para os Inputs de Cadastro
  const darkInputClasses = "w-full bg-slate-800 border border-slate-700 p-3 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all";

  const renderCRMBoard = () => (
    <div className="flex gap-4 overflow-x-auto pb-6 items-start custom-scrollbar h-[calc(100vh-260px)]">
      {Object.values(OrderStatus).map(status => (
        <div key={status} className="w-[255px] flex-shrink-0 bg-white rounded-xl flex flex-col max-h-full border border-slate-200 shadow-sm overflow-hidden">
          <div className={`p-3 ${getStatusColor(status)} text-white flex justify-between items-center sticky top-0 z-10`}>
            <span className="text-[10px] font-bold uppercase tracking-wider">{status}</span>
            <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold">
               {orders.filter(o => o.status === status).length}
            </span>
          </div>
          <div className="p-3 space-y-3 overflow-y-auto flex-grow bg-slate-50/30 custom-scrollbar">
            {orders.filter(o => o.status === status).map(order => (
              <div key={order.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 cursor-pointer hover:border-blue-500 transition-all group" onClick={() => setSelectedOrder(order)}>
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
            {orders.filter(o => o.status === status).length === 0 && (
              <div className="text-center py-10 text-slate-300 text-[10px] font-bold uppercase italic">Vazio</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderProductList = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600"/>
          GERENCIAR PRODUTOS
        </h3>
        <Button onClick={() => setEditingProduct({ colors: [], category: 'Geral', subcategory: '' })} size="sm">
           NOVO PRODUTO
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Identificação</th>
              <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Specs</th>
              <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <img src={p.imageUrl} className="h-10 w-10 rounded border border-slate-100 object-cover" alt=""/>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{p.description}</div>
                      <div className="text-[10px] text-slate-400">Ref: {p.reference} | Cod: {p.code}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <div className="text-[10px] font-bold text-slate-700 uppercase">{p.line || 'DICOMPEL'}</div>
                   <div className="text-[10px] text-slate-400 uppercase">{p.amperage || '-'}</div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                     <button onClick={() => setEditingProduct(p)} className="p-2 text-slate-400 hover:text-blue-600"><Edit2 className="h-4 w-4"/></button>
                     <button onClick={async () => { if(confirm('Excluir?')) { await productService.delete(p.id); loadData(); } }} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4"/></button>
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600"/>
          TIME COMERCIAL
        </h3>
        <Button onClick={() => setEditingUser({ role: UserRole.REPRESENTATIVE, password: '' })} size="sm">
           NOVO USUÁRIO
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Nome</th>
              <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Cargo</th>
              <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm font-bold text-slate-900">{u.name}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{u.email}</td>
                <td className="px-6 py-4">
                  <span className="text-[10px] font-bold uppercase bg-slate-100 px-2 py-1 rounded">{u.role}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                     <button onClick={() => setEditingUser(u)} className="p-2 text-slate-400 hover:text-blue-600"><Edit2 className="h-4 w-4"/></button>
                     <button onClick={async () => { if(confirm('Remover usuário?')) { await userService.delete(u.id); loadData(); } }} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4"/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
                <h2 className="text-xl font-bold text-slate-900 uppercase">Painel de Controle</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{user.role}</p>
             </div>
          </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200 no-print overflow-x-auto">
        {['orders', 'products', 'users', 'profile'].map(tab => (
           (tab !== 'products' || canManageProducts) && 
           (tab !== 'users' || canManageUsers) && 
           // Removido aba de configurações para Admin conforme pedido
           (tab !== 'profile' || user.role !== UserRole.ADMIN) && (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`py-4 px-6 text-[11px] font-bold uppercase transition-all relative whitespace-nowrap ${activeTab === tab ? 'text-blue-600' : 'text-slate-400 hover:text-slate-800'}`}>
                {tab === 'orders' ? 'CRM Vendas' : tab === 'products' ? 'Catálogo' : tab === 'users' ? 'Equipe' : 'Configurações'}
                {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>}
            </button>
           )
        ))}
      </div>

      <div className="min-h-[50vh]">
        {loading && activeTab !== 'profile' ? (
          <div className="flex flex-col items-center justify-center p-20 text-slate-300">
             <div className="loader mb-4 border-slate-100 border-t-blue-600"></div>
             <p className="text-xs font-bold uppercase tracking-widest">Carregando dados...</p>
          </div>
        ) : (
          <>
            {activeTab === 'orders' && renderCRMBoard()}
            {activeTab === 'products' && renderProductList()}
            {activeTab === 'users' && renderUserList()}
            {activeTab === 'profile' && user.role !== UserRole.ADMIN && (
              <div className="max-w-xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-8">
                 <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><UserIcon className="h-5 w-5 text-blue-600"/> Meus Dados</h3>
                 <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div>
                       <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nome Exibição</label>
                       <input className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg text-slate-900 focus:border-blue-500 outline-none" value={profileName} onChange={e => setProfileName(e.target.value)} />
                    </div>
                    <div>
                       <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">E-mail de Login</label>
                       <input className="w-full bg-slate-50 border border-slate-100 p-3 rounded-lg text-slate-400 cursor-not-allowed" value={user.email} disabled />
                    </div>
                    <Button type="submit" className="w-full h-12">Atualizar Perfil</Button>
                 </form>
              </div>
            )}
          </>
        )}
      </div>

      {/* Editor de Produto com Estilo Escuro */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[150]">
          <form onSubmit={handleProductSave} className="bg-slate-900 text-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-700">
            <div className="p-6 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
               <h3 className="font-bold text-lg">Cadastro de Produto</h3>
               <button type="button" onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-white transition-colors"><X className="h-6 w-6"/></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Código</label>
                    <input className={darkInputClasses} value={editingProduct.code || ''} onChange={e => setEditingProduct({...editingProduct, code: e.target.value})} required />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Referência</label>
                    <input className={darkInputClasses} value={editingProduct.reference || ''} onChange={e => setEditingProduct({...editingProduct, reference: e.target.value})} required />
                 </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Descrição do Produto</label>
                <input className={darkInputClasses} value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} required />
              </div>
              <div className="grid grid-cols-3 gap-4">
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Linha</label>
                    <input className={darkInputClasses} value={editingProduct.line || ''} onChange={e => setEditingProduct({...editingProduct, line: e.target.value})} required />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Categoria</label>
                    <input className={darkInputClasses} value={editingProduct.category || ''} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} required />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Amperagem</label>
                    <select className={darkInputClasses} value={editingProduct.amperage || ''} onChange={e => setEditingProduct({...editingProduct, amperage: e.target.value})}>
                      <option value="" className="bg-slate-800">N/A</option>
                      <option value="10A" className="bg-slate-800">10A</option>
                      <option value="20A" className="bg-slate-800">20A</option>
                      <option value="Modular" className="bg-slate-800">Modular</option>
                    </select>
                 </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Cores (Vírgula)</label>
                <input className={darkInputClasses} value={typeof editingProduct.colors === 'string' ? editingProduct.colors : (editingProduct.colors || []).join(', ')} onChange={e => setEditingProduct({...editingProduct, colors: e.target.value})} placeholder="Branco, Preto..." />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Foto do Produto</label>
                <div className="flex flex-col gap-3">
                   <div className="flex gap-2">
                      <input className={darkInputClasses} value={editingProduct.imageUrl || ''} onChange={e => setEditingProduct({...editingProduct, imageUrl: e.target.value})} placeholder="Ou cole o link da imagem aqui..." />
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-2" title="Procurar no computador">
                         <Upload className="h-5 w-5"/> <span className="text-xs font-bold whitespace-nowrap">Procurar</span>
                      </button>
                   </div>
                   {editingProduct.imageUrl && (
                      <div className="relative w-20 h-20 rounded border border-slate-700 overflow-hidden bg-slate-800">
                         <img src={editingProduct.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                         <button type="button" onClick={() => setEditingProduct({...editingProduct, imageUrl: ''})} className="absolute top-0 right-0 bg-red-600 p-0.5 rounded-bl"><X className="h-3 w-3"/></button>
                      </div>
                   )}
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-800 flex justify-end gap-3 border-t border-slate-700">
              <Button type="button" variant="outline" onClick={() => setEditingProduct(null)} className="text-white border-slate-600 hover:bg-slate-700">Cancelar</Button>
              <Button type="submit">Salvar Produto</Button>
            </div>
          </form>
        </div>
      )}

      {/* Editor de Usuário com Estilo Escuro */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[150]">
          <form onSubmit={handleUserSave} className="bg-slate-900 text-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-700">
            <div className="p-6 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
               <h3 className="font-bold text-lg">Cadastro de Usuário</h3>
               <button type="button" onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white transition-colors"><X className="h-6 w-6"/></button>
            </div>
            <div className="p-6 space-y-4">
               <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Nome Completo</label>
                  <input className={darkInputClasses} value={editingUser.name || ''} onChange={e => setEditingUser({...editingUser, name: e.target.value})} required />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">E-mail</label>
                  <input className={darkInputClasses} type="email" value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} required />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Senha {editingUser.id && "(Deixe em branco para não alterar)"}</label>
                  <input className={darkInputClasses} type="password" value={editingUser.password || ''} onChange={e => setEditingUser({...editingUser, password: e.target.value})} required={!editingUser.id} />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Cargo</label>
                  <select className={darkInputClasses} value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}>
                     <option value={UserRole.REPRESENTATIVE} className="bg-slate-800">REPRESENTANTE</option>
                     <option value={UserRole.SUPERVISOR} className="bg-slate-800">SUPERVISOR</option>
                     <option value={UserRole.ADMIN} className="bg-slate-800">ADMINISTRADOR</option>
                  </select>
               </div>
            </div>
            <div className="p-6 bg-slate-800 flex justify-end gap-3 border-t border-slate-700">
              <Button type="button" variant="outline" onClick={() => setEditingUser(null)} className="text-white border-slate-600 hover:bg-slate-700">Cancelar</Button>
              <Button type="submit">Gravar Usuário</Button>
            </div>
          </form>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="font-bold text-lg">Visualizar Pedido #{selectedOrder.id.slice(0,8)}</h3>
              <button onClick={() => setSelectedOrder(null)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X className="h-6 w-6"/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/20">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                     <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Dados do Solicitante</p>
                     <p className="text-lg font-bold text-slate-900">{selectedOrder.customerName}</p>
                     <div className="mt-4 space-y-1">
                        <p className="text-xs text-slate-600 flex items-center gap-2"><Phone className="h-3 w-3"/> {selectedOrder.customerContact}</p>
                        <p className="text-xs text-slate-600 flex items-center gap-2"><Mail className="h-3 w-3"/> {selectedOrder.customerEmail}</p>
                     </div>
                  </div>
                  <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                     <p className="text-[10px] font-bold text-slate-400 uppercase mb-4">Gerenciamento de Fluxo</p>
                     <div className="space-y-4">
                        <select className={`w-full h-10 rounded-lg px-3 font-bold uppercase text-[10px] text-white ${getStatusColor(selectedOrder.status)} cursor-pointer`} value={selectedOrder.status} onChange={async (e) => { 
                             const upd = { ...selectedOrder, status: e.target.value as OrderStatus }; 
                             await orderService.update(upd); 
                             setSelectedOrder(upd); 
                             loadData(); 
                          }}>
                           {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <Button variant="outline" className="w-full h-10 text-[10px] font-bold" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2"/> IMPRIMIR COTAÇÃO</Button>
                     </div>
                  </div>
               </div>
               <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Relação de Produtos</span>
                     <span className="text-[10px] font-bold text-slate-900">{selectedOrder.items.length} Itens</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {selectedOrder.items.map((it, i) => (
                      <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                           <img src={it.imageUrl} className="h-10 w-10 object-cover rounded border" alt=""/>
                           <div>
                              <p className="text-xs font-bold text-slate-900">{it.description}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">Ref: {it.reference} | {it.amperage || 'N/A'}</p>
                           </div>
                        </div>
                        <div className="text-center px-4 py-2 bg-slate-100 rounded-lg">
                           <span className="text-sm font-bold text-slate-900">{it.quantity} un</span>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
            <div className="p-6 bg-white border-t border-slate-100 flex justify-end">
              <Button onClick={() => setSelectedOrder(null)} size="md">Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
