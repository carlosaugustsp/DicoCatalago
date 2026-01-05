
import React, { useState, useEffect } from 'react';
import { User, UserRole, Order, Product, OrderStatus, CartItem } from '../types';
import { authService, orderService, productService, userService } from '../services/api';
import { Button } from '../components/Button';
import { Plus, Trash2, Edit2, Search, Package, X, User as UserIcon, LayoutDashboard, ChevronRight, ShoppingBag, Upload, Image as ImageIcon, PlusCircle, Save, Users as UsersIcon, ShieldCheck, Mail, Lock, Download, FileSpreadsheet, Trash, Grid, Printer } from 'lucide-react';

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
  const [userManagementSearch, setUserManagementSearch] = useState('');
  const [orderProductSearch, setOrderProductSearch] = useState('');
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);

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
    } catch (err) { 
      console.error("Erro ao carregar dados do dashboard:", err); 
    } finally { 
      setLoading(false); 
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
      loadData();
      alert("Produto salvo!");
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      if (editingUser.id) await userService.update(editingUser as User);
      else await userService.create(editingUser as any);
      setShowUserModal(false);
      setEditingUser(null);
      loadData();
      alert("Membro da equipe salvo!");
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm("Deseja remover este membro da equipe?")) {
      try { await userService.delete(id); loadData(); } catch (err) { alert("Erro ao excluir."); }
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (confirm("ATENÇÃO: Deseja excluir este pedido permanentemente?")) {
      try {
        await orderService.delete(id);
        setShowOrderModal(false);
        loadData();
        alert("Pedido excluído com sucesso.");
      } catch (err) { alert("Erro ao excluir pedido."); }
    }
  };

  const handleSaveOrder = async () => {
    if (!selectedOrder) return;
    try {
      await orderService.update(selectedOrder);
      setShowOrderModal(false);
      loadData();
      alert("Pedido atualizado!");
    } catch (err) {
      alert("Erro ao atualizar pedido.");
    }
  };

  const exportOrderToExcel = (order: Order) => {
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
    link.setAttribute("download", `pedido_${order.id.slice(-6)}_${order.customerName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printOrder = () => {
    window.print();
  };

  const updateOrderItemQty = (prodId: string, qty: number) => {
    if (!selectedOrder) return;
    const newItems = selectedOrder.items.map(it => it.id === prodId ? { ...it, quantity: qty } : it);
    setSelectedOrder({ ...selectedOrder, items: newItems });
  };

  const removeOrderItem = (prodId: string) => {
    if (!selectedOrder) return;
    const newItems = selectedOrder.items.filter(it => it.id !== prodId);
    setSelectedOrder({ ...selectedOrder, items: newItems });
  };

  const addProductToOrder = (product: Product) => {
    if (!selectedOrder) return;
    const existing = selectedOrder.items.find(it => it.id === product.id);
    if (existing) {
      updateOrderItemQty(product.id, existing.quantity + 1);
    } else {
      setSelectedOrder({
        ...selectedOrder,
        items: [...selectedOrder.items, { ...product, quantity: 1 }]
      });
    }
    setOrderProductSearch('');
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
    if (confirm("ATENÇÃO: Deseja excluir este produto permanentemente do estoque?")) {
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
              <div key={order.id} className="bg-white p-4 rounded-xl border border-slate-100 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all" onClick={() => { setSelectedOrder(order); setShowOrderModal(true); }}>
                <div className="flex justify-between items-start mb-1">
                   <p className="text-[9px] font-black text-slate-300 uppercase">#{order.id.slice(-6)}</p>
                   <p className="text-[8px] font-bold text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <h4 className="font-bold text-slate-900 truncate text-xs mb-3">{order.customerName}</h4>
                <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-[10px] text-slate-500 font-black uppercase">
                   <div className="flex items-center"><ShoppingBag className="h-3 w-3 mr-1"/> {order.items.length} ITENS</div>
                   <ChevronRight className="h-4 w-4 text-slate-300" />
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
            <h2 className="text-xl font-black text-slate-900 uppercase">Painel Administrativo</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase">{user.role} - DICOMPEL</p>
         </div>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto no-print">
        {['orders', 'products', 'users', 'profile'].map(tab => (
           (tab !== 'products' || user.role !== UserRole.REPRESENTATIVE) && 
           (tab !== 'users' || user.role === UserRole.ADMIN) && (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`py-4 px-6 text-[10px] font-black uppercase relative transition-all ${activeTab === tab ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
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
            
            {activeTab === 'users' && user.role === UserRole.ADMIN && (
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden animate-in fade-in duration-300">
                <div className="p-5 bg-slate-50 border-b flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute inset-y-0 left-3 h-4 w-4 text-slate-400 my-auto" />
                    <input type="text" placeholder="Buscar na equipe..." className="pl-9 pr-4 py-2 border rounded-xl text-xs w-full focus:ring-2 focus:ring-blue-500 focus:outline-none" value={userManagementSearch} onChange={(e) => setUserManagementSearch(e.target.value)} />
                  </div>
                  <Button size="sm" className="font-black uppercase text-[10px]" onClick={() => { setEditingUser({ name: '', email: '', role: UserRole.REPRESENTATIVE }); setShowUserModal(true); }}>
                    <Plus className="h-4 w-4 mr-2"/> NOVO MEMBRO
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b">
                      <tr>
                        <th className="px-6 py-4">Membro</th>
                        <th className="px-6 py-4">E-mail</th>
                        <th className="px-6 py-4">Cargo</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.filter(u => u.name.toLowerCase().includes(userManagementSearch.toLowerCase())).map(u => (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400"><UserIcon className="h-4 w-4"/></div>
                            <span className="text-xs font-bold text-slate-900">{u.name}</span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500">{u.email}</td>
                          <td className="px-6 py-4">
                            <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase ${u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-600' : u.role === UserRole.SUPERVISOR ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex justify-end gap-1">
                                <button onClick={() => { setEditingUser(u); setShowUserModal(true); }} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg"><Edit2 className="h-4 w-4"/></button>
                                <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg"><Trash2 className="h-4 w-4"/></button>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden animate-in fade-in duration-300">
                <div className="p-5 bg-slate-50 border-b flex justify-between items-center gap-4">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute inset-y-0 left-3 h-4 w-4 text-slate-400 my-auto" />
                    <input type="text" placeholder="Filtrar estoque..." className="pl-9 pr-4 py-2 border rounded-xl text-xs w-full focus:ring-2 focus:ring-blue-500 focus:outline-none" value={productManagementSearch} onChange={(e) => setProductManagementSearch(e.target.value)} />
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
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
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
                                <button onClick={() => { setEditingProduct(p); setShowProductModal(true); }} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg" title="Editar"><Edit2 className="h-4 w-4"/></button>
                                <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg" title="Excluir do Estoque"><Trash2 className="h-4 w-4"/></button>
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

      {/* LAYOUT DE IMPRESSÃO (EXCLUSIVO PARA DASHBOARD) */}
      {selectedOrder && (
        <div className="hidden print-layout">
           <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8 mb-8">
              <div>
                 <h1 className="text-4xl font-black text-slate-900">DICOMPEL</h1>
                 <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Relatório de Pedido CRM</p>
              </div>
              <div className="text-right">
                 <h2 className="text-2xl font-black text-slate-900">#{selectedOrder.id.slice(-6)}</h2>
                 <p className="text-sm text-slate-500">Emitido em: {new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-8 mb-10">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Dados do Cliente</h3>
                 <p className="text-sm font-bold text-slate-900">{selectedOrder.customerName}</p>
                 <p className="text-xs text-slate-500 mt-1">{selectedOrder.customerEmail} | {selectedOrder.customerContact}</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Informações do Pedido</h3>
                 <p className="text-sm font-bold text-slate-900 uppercase">Status: {selectedOrder.status}</p>
                 <p className="text-xs text-slate-500 mt-1">Representante ID: {selectedOrder.representativeId}</p>
              </div>
           </div>

           <table className="w-full text-left border-collapse">
              <thead>
                 <tr className="bg-slate-900 text-white">
                    <th className="p-4 text-xs font-black uppercase tracking-widest rounded-tl-xl">Item / Descrição</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest">Cód / Ref</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-right rounded-tr-xl">Quantidade</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                 {selectedOrder.items.map((it, idx) => (
                    <tr key={it.id+idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                       <td className="p-4 text-sm font-bold text-slate-900">{it.description}</td>
                       <td className="p-4 text-xs text-slate-500">{it.code} / {it.reference}</td>
                       <td className="p-4 text-lg font-black text-slate-900 text-right">{it.quantity} UN</td>
                    </tr>
                 ))}
              </tbody>
           </table>
           {selectedOrder.notes && (
             <div className="mt-10 p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Observações Internas</h3>
                <p className="text-sm italic text-slate-600">{selectedOrder.notes}</p>
             </div>
           )}
           <div className="mt-20 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest border-t pt-8">
              Documento Gerado pelo CRM Dicompel - www.dicompel.com.br
           </div>
        </div>
      )}

      {/* MODAL PEDIDO (CRM) COMPLETO */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[300] no-print">
           <div className="bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                 <div className="flex items-center gap-4">
                    <button onClick={() => handleDeleteOrder(selectedOrder.id)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all" title="Excluir Pedido Permanentemente"><Trash className="h-5 w-5"/></button>
                    <div>
                       <h3 className="text-lg font-black text-slate-900 uppercase">Gestão do Pedido</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{selectedOrder.id.slice(-6)}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <button onClick={printOrder} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-[10px] font-black uppercase border border-blue-100 hover:bg-blue-600 hover:text-white transition-all" title="Imprimir em PDF"><Printer className="h-4 w-4"/> PDF</button>
                    <button onClick={() => exportOrderToExcel(selectedOrder)} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl text-[10px] font-black uppercase border border-green-100 hover:bg-green-600 hover:text-white transition-all" title="Baixar em Excel"><FileSpreadsheet className="h-4 w-4"/> EXCEL</button>
                    <button onClick={() => setShowOrderModal(false)} className="text-slate-300 hover:text-slate-900 ml-2"><X className="h-8 w-8"/></button>
                 </div>
              </div>
              <div className="p-8 flex-grow overflow-y-auto space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Status do Atendimento</label>
                       <select className={darkInputStyle} value={selectedOrder.status} onChange={e => setSelectedOrder({...selectedOrder, status: e.target.value as OrderStatus})}>
                          {Object.values(OrderStatus).map(s => <option key={s} value={s} className="bg-slate-800">{s}</option>)}
                       </select>
                    </div>
                    <div className="md:col-span-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Cliente / Contato</label>
                       <div className="p-3 bg-slate-50 rounded-lg border flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-900">{selectedOrder.customerName}</span>
                          <span className="text-xs text-slate-500">{selectedOrder.customerContact}</span>
                       </div>
                    </div>
                 </div>

                 {/* EDIÇÃO DE ITENS */}
                 <div className="pt-6 border-t">
                    <div className="flex justify-between items-center mb-4">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens do Orçamento ({selectedOrder.items.length})</h4>
                       <Button size="sm" onClick={() => setShowProductPicker(true)} className="text-[10px] font-black uppercase">
                          <PlusCircle className="h-4 w-4 mr-2" /> Adicionar Produto
                       </Button>
                    </div>
                    
                    <div className="space-y-2">
                       {selectedOrder.items.map(it => (
                         <div key={it.id} className="flex flex-col sm:flex-row justify-between items-center bg-white p-3 rounded-xl border border-slate-100 group shadow-sm hover:border-blue-200 transition-all">
                            <div className="flex items-center gap-3 flex-1">
                               <img src={it.imageUrl} className="w-10 h-10 object-contain rounded bg-slate-50 border p-1" alt=""/>
                               <div>
                                  <p className="text-[11px] font-bold text-slate-700">{it.description}</p>
                                  <p className="text-[9px] text-slate-400 uppercase font-black">{it.code} | REF: {it.reference}</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-6 mt-3 sm:mt-0">
                               <div className="flex items-center border rounded-lg overflow-hidden shadow-inner">
                                  <button onClick={() => updateOrderItemQty(it.id, Math.max(1, it.quantity - 1))} className="px-3 py-1 bg-slate-50 hover:bg-slate-200 transition-colors font-bold">-</button>
                                  <input type="number" className="w-12 text-center text-xs font-black py-1 bg-white focus:outline-none" value={it.quantity} onChange={e => updateOrderItemQty(it.id, parseInt(e.target.value) || 1)} />
                                  <button onClick={() => updateOrderItemQty(it.id, it.quantity + 1)} className="px-3 py-1 bg-slate-50 hover:bg-slate-200 transition-colors font-bold">+</button>
                               </div>
                               <button onClick={() => removeOrderItem(it.id)} className="text-slate-300 hover:text-red-500 p-2 bg-slate-50 hover:bg-red-50 rounded-lg transition-all" title="Remover item do pedido"><Trash2 className="h-5 w-5"/></button>
                            </div>
                         </div>
                       ))}
                       {selectedOrder.items.length === 0 && (
                         <div className="py-10 text-center border-2 border-dashed rounded-2xl text-slate-300 font-bold italic">Sem itens no pedido. Adicione clicando acima.</div>
                       )}
                    </div>
                 </div>

                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Observações Internas</label>
                    <textarea className={darkInputStyle} rows={3} value={selectedOrder.notes} onChange={e => setSelectedOrder({...selectedOrder, notes: e.target.value})} placeholder="Adicione detalhes sobre o andamento do atendimento..."></textarea>
                 </div>
              </div>
              <div className="p-6 bg-slate-50 border-t flex gap-4">
                 <Button variant="outline" className="flex-1 h-14" onClick={() => setShowOrderModal(false)}>CANCELAR</Button>
                 <Button className="flex-[2] h-14 font-black uppercase shadow-lg shadow-blue-200" onClick={handleSaveOrder}>SALVAR ALTERAÇÕES</Button>
              </div>
           </div>
        </div>
      )}

      {/* SELETOR VISUAL DE PRODUTOS */}
      {showProductPicker && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 z-[400] no-print">
           <div className="bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                 <div className="flex items-center gap-3">
                    <div className="bg-blue-600 text-white p-2 rounded-xl"><Grid className="h-5 w-5"/></div>
                    <h3 className="text-lg font-black text-slate-900 uppercase">Escolher Produtos</h3>
                 </div>
                 <button onClick={() => setShowProductPicker(false)} className="text-slate-300 hover:text-slate-900"><X className="h-8 w-8"/></button>
              </div>
              <div className="p-6 border-b">
                 <div className="relative">
                    <Search className="absolute left-3 inset-y-0 h-5 w-5 text-slate-400 my-auto" />
                    <input type="text" placeholder="Pesquisar por descrição, código ou referência..." className="w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500" value={orderProductSearch} onChange={e => setOrderProductSearch(e.target.value)} />
                 </div>
              </div>
              <div className="p-6 flex-grow overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-slate-100/30">
                 {products.filter(p => p.description.toLowerCase().includes(orderProductSearch.toLowerCase()) || p.code.toLowerCase().includes(orderProductSearch.toLowerCase())).map(p => (
                   <button key={p.id} onClick={() => { addProductToOrder(p); setShowProductPicker(false); }} className="bg-white border-2 border-transparent hover:border-blue-500 p-4 rounded-2xl transition-all flex flex-col items-center text-center group shadow-sm hover:shadow-md">
                      <div className="w-full aspect-square relative mb-4">
                         <img src={p.imageUrl} className="absolute inset-0 w-full h-full object-contain" alt=""/>
                      </div>
                      <p className="text-[10px] font-black text-blue-600 uppercase mb-1">{p.line}</p>
                      <p className="text-xs font-bold text-slate-800 line-clamp-2 h-8 leading-tight">{p.description}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{p.code}</p>
                      <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 text-white text-[10px] font-black py-2 px-4 rounded-lg uppercase">Adicionar</div>
                   </button>
                 ))}
              </div>
              <div className="p-4 border-t bg-slate-50 text-center">
                 <p className="text-[10px] text-slate-400 font-bold uppercase">Selecione o produto para inseri-lo no pedido</p>
              </div>
           </div>
        </div>
      )}

      {/* MODAL USUÁRIO */}
      {showUserModal && editingUser && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[300] no-print">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl font-black text-slate-900 uppercase">{editingUser.id ? 'Editar Membro' : 'Novo Membro Equipe'}</h3>
               <button onClick={() => setShowUserModal(false)} className="text-slate-300 hover:text-slate-900"><X className="h-8 w-8"/></button>
            </div>
            <form onSubmit={handleSaveUser} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Nome Completo</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                  <input required type="text" className={`${darkInputStyle} pl-10`} value={editingUser.name || ''} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">E-mail de Acesso</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                  <input required type="email" className={`${darkInputStyle} pl-10`} value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Nível de Acesso (Cargo)</label>
                <select required className={darkInputStyle} value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}>
                   <option value={UserRole.REPRESENTATIVE}>REPRESENTANTE</option>
                   <option value={UserRole.SUPERVISOR}>SUPERVISOR</option>
                   <option value={UserRole.ADMIN}>ADMINISTRADOR</option>
                </select>
              </div>
              {!editingUser.id && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Senha Inicial</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                    <input required type="password" className={`${darkInputStyle} pl-10`} value={editingUser.password || ''} onChange={e => setEditingUser({...editingUser, password: e.target.value})} />
                  </div>
                </div>
              )}
              <div className="pt-4"><Button type="submit" className="w-full h-14 font-black uppercase tracking-widest">SALVAR CONFIGURAÇÃO</Button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PRODUTO */}
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
              <div className="md:col-span-2 pt-4 flex gap-4">
                 {editingProduct.id && (
                    <Button type="button" variant="danger" className="flex-1 h-14 font-black uppercase" onClick={() => handleDeleteProduct(editingProduct.id!)}>EXCLUIR DEFINITIVO</Button>
                 )}
                 <Button type="submit" className="flex-[2] h-14 font-black uppercase tracking-widest">SALVAR PRODUTO</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
