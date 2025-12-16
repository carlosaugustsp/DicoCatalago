import React, { useState, useEffect } from 'react';
import { User, UserRole, Order, Product, OrderStatus, CRMInteraction, CartItem } from '../types';
import { orderService, productService, userService } from '../services/api';
import { Button } from '../components/Button';
import { Plus, Trash2, Edit2, Download, Search, CheckCircle, Clock, Package, Users, MessageSquare, Phone, Mail, Calendar, X, ArrowRight, MoreHorizontal, Eye, Upload, Printer, Save, UserCog, Building, User as UserIcon, Cloud, Monitor, CloudOff, HelpCircle, ExternalLink, Copy, AlertTriangle, Eraser, FileText } from 'lucide-react';

interface DashboardProps {
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'users'>('orders');
  
  // Data State
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit States
  const [editingProduct, setEditingProduct] = useState<(Partial<Omit<Product, 'colors'>> & { colors?: string | string[] }) | null>(null);
  const [editingUser, setEditingUser] = useState<Partial<User> & { password?: string } | null>(null);
  const [showSupabaseHelp, setShowSupabaseHelp] = useState(false); // Novo estado para ajuda
  
  // Order Item Editing State
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [editingOrderTarget, setEditingOrderTarget] = useState<Order | null>(null);
  const [tempItems, setTempItems] = useState<CartItem[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  
  // CRM States
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null); // For CRM Detail View
  const [newInteraction, setNewInteraction] = useState('');
  const [interactionType, setInteractionType] = useState<CRMInteraction['type']>('note');
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Helper to check management permissions
  const canManageProducts = user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR;
  const canManageUsers = user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR;

  useEffect(() => {
    loadData();
    // Click outside to close dropdowns
    const handleClickOutside = () => setActiveDropdownId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [user, activeTab]);

  const loadData = async () => {
    setLoading(true);
    
    // Load Orders
    if (activeTab === 'orders') {
      let data: Order[] = [];
      if (user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR) {
        data = await orderService.getAll();
      } else {
        data = await orderService.getByRep(user.id);
      }
      setOrders(data);
    }

    // Load Products (Admin and Supervisor)
    if (activeTab === 'products' && canManageProducts) {
      const data = await productService.getAll();
      setProducts(data);
    }

    // Load Users (Admin and Supervisor)
    if (activeTab === 'users' && canManageUsers) {
      const data = await userService.getAll();
      setUsers(data);
    }

    setLoading(false);
  };

  // --- Order Item Editing Handlers ---

  const openOrderEditor = async (order: Order) => {
    setEditingOrderTarget(order);
    setTempItems([...order.items]); // Deep copy of items
    setProductSearchTerm('');
    setIsEditingItems(true);
    setActiveDropdownId(null);

    // Ensure products are loaded so the user can search and add new ones
    if (products.length === 0) {
      const allProducts = await productService.getAll();
      setProducts(allProducts);
    }
  };

  const updateTempItemQuantity = (itemId: string, newQty: number) => {
    if (newQty < 1) return;
    setTempItems(prev => prev.map(item => item.id === itemId ? { ...item, quantity: newQty } : item));
  };

  const removeTempItem = (itemId: string) => {
    if (confirm('Remover este item do pedido?')) {
      setTempItems(prev => prev.filter(item => item.id !== itemId));
    }
  };

  const addItemToOrder = (product: Product) => {
    setTempItems(prev => {
      const exists = prev.find(item => item.id === product.id);
      if (exists) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const saveOrderItemsChanges = async () => {
    if (!editingOrderTarget) return;

    if (tempItems.length === 0) {
      alert("O pedido não pode ficar vazio.");
      return;
    }

    const updatedOrder = {
      ...editingOrderTarget,
      items: tempItems
    };

    await orderService.update(updatedOrder);
    
    // Update local state
    setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    if (selectedOrder && selectedOrder.id === updatedOrder.id) {
      setSelectedOrder(updatedOrder);
    }

    setIsEditingItems(false);
    setEditingOrderTarget(null);
  };

  // --- CRM Handlers ---

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      const updated = { ...order, status: newStatus };
      await orderService.update(updated);
      setOrders(orders.map(o => o.id === orderId ? updated : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(updated);
      }
    }
  };

  const handleAddInteraction = async () => {
    if (!selectedOrder || !newInteraction.trim()) return;

    const interaction: CRMInteraction = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      type: interactionType,
      content: newInteraction,
      authorName: user.name
    };

    const updatedOrder = {
      ...selectedOrder,
      interactions: [...(selectedOrder.interactions || []), interaction]
    };

    await orderService.update(updatedOrder);
    
    // Update local state
    setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    setSelectedOrder(updatedOrder);
    setNewInteraction('');
  };

  const handleDeleteOrder = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.')) {
      try {
        // Optimistically remove from UI
        setOrders(prev => prev.filter(o => o.id !== id));
        if (selectedOrder?.id === id) setSelectedOrder(null);
        
        await orderService.delete(id);
      } catch (error) {
        console.error("Erro ao excluir pedido:", error);
        alert("Ocorreu um erro ao excluir o pedido.");
        loadData(); // Revert/Reload if failed
      }
    }
  };

  const handleDownloadOrderCSV = (order: Order) => {
    const headers = "Código,Descrição,Referência,Cor,Quantidade,Observações\n";
    const rows = order.items.map(item => 
      `${item.code},"${item.description}",${item.reference},"${item.colors.join('|')}",${item.quantity},""`
    ).join("\n");
    
    const csvContent = "data:text/csv;charset=utf-8," + encodeURI(headers + rows);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `pedido_${order.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintOrder = () => {
    window.print();
  };

  // --- Product Handlers ---

  const handleProductDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      await productService.delete(id);
      loadData();
    }
  };

  const handleClearLocalProducts = () => {
     if (confirm('Isso apagará produtos criados OFFLINE/LOCALMENTE que não foram salvos no Supabase. Os produtos do servidor (Nuvem) permanecerão. Deseja continuar?')) {
        // @ts-ignore - método adicionado recentemente
        if (productService.clearLocalData) {
            // @ts-ignore
            productService.clearLocalData();
        } else {
            // Fallback direto caso a interface não esteja atualizada no TS
            localStorage.removeItem('dicompel_products_db');
        }
        alert('Produtos locais limpos. A página será recarregada.');
        window.location.reload();
     }
  };

  const handleProductSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    if (!editingProduct.code || !editingProduct.description || !editingProduct.category) {
      return alert("Preencha campos obrigatórios (Código, Descrição, Categoria).");
    }

    const productToSave: Product = {
      ...editingProduct as Product,
      colors: typeof editingProduct.colors === 'string' 
        ? (editingProduct.colors as string).split(',').map((c: string) => c.trim()) 
        : editingProduct.colors || []
    };

    if (editingProduct.id) {
       await productService.update(productToSave);
    } else {
       await productService.create(productToSave);
    }
    setEditingProduct(null);
    loadData();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingProduct(prev => {
          if (!prev) return prev;
          return { ...prev, imageUrl: reader.result as string };
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const text = await file.text();
      await productService.importCSV(text);
      alert('Importação concluída!');
      loadData();
    }
  };

  const downloadProductList = () => {
     const headers = "ID,Code,Description,Reference,Category,Subcategory,Line,Colors,Amperage,Details\n";
     const rows = products.map(p => 
       `${p.id},${p.code},"${p.description}",${p.reference},${p.category},${p.subcategory},${p.line},"${p.colors.join('|')}","${p.amperage || ''}","${p.details || ''}"`
     ).join('\n');
     const blob = new Blob([headers + rows], { type: 'text/csv' });
     const url = window.URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = 'produtos.csv';
     a.click();
  };

  // --- User Handlers ---

  const handleUserSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editingUser.name || !editingUser.email || !editingUser.role) {
      return alert("Preencha Nome, Email e Função.");
    }
    
    // Validação: Senha obrigatória para NOVOS usuários
    if (!editingUser.id && !editingUser.password) {
      return alert("A senha é obrigatória para cadastrar novos usuários.");
    }

    // Validation: Supervisors cannot create/promote Admins
    if (user.role === UserRole.SUPERVISOR && editingUser.role === UserRole.ADMIN) {
        return alert("Supervisores não podem criar ou promover usuários para Administrador.");
    }

    try {
      let resultUser: User;
      if (editingUser.id) {
        await userService.update(editingUser as User);
        resultUser = editingUser as User;
      } else {
        resultUser = await userService.create(editingUser as User);
      }
      
      setEditingUser(null);
      await loadData(); // Reload to show new user

      // Feedback Inteligente
      const isSupabase = resultUser.id.length > 20; // UUIDs são longos
      if (isSupabase) {
        alert("Usuário criado/atualizado com sucesso no SUPABASE (Nuvem)!");
      } else {
        alert("Atenção: Usuário criado apenas LOCALMENTE. Verifique sua conexão ou configurações do Supabase.");
      }

    } catch (error) {
      alert("Erro ao salvar usuário. Se for erro de permissão no Supabase, verifique o botão de AJUDA.");
    }
  };

  const handleUserDelete = async (id: string) => {
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return;

    // Validation: Supervisors cannot delete Admins
    if (user.role === UserRole.SUPERVISOR && targetUser.role === UserRole.ADMIN) {
        return alert("Supervisores não podem excluir Administradores.");
    }

    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await userService.delete(id);
        alert('Usuário excluído com sucesso!');
        loadData();
      } catch (error) {
        // Erro já tratado no service com alerta específico
        // Não recarregamos dados para não perder estado se algo deu errado
        console.error("Falha ao excluir:", error);
      }
    }
  };
  
  // Can current user edit target user?
  const canEditTargetUser = (targetUser: User) => {
      if (user.role === UserRole.ADMIN) return true;
      if (user.role === UserRole.SUPERVISOR) {
          // Supervisor can only edit NON-ADMINS
          return targetUser.role !== UserRole.ADMIN;
      }
      return false;
  };

  // Helper para identificar origem do usuário (Mock/Local/Supabase)
  const getUserSourceIcon = (userItem: User) => {
     // IDs do Supabase são UUIDs (longos). IDs locais/mock são curtos ou 'u1', 'u2'.
     const isSupabase = userItem.id.length > 20;
     const isLocal = !isSupabase;
     
     if (isSupabase) {
       return <span title="Salvo no Supabase (Nuvem)" className="text-green-600 flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 text-[10px] font-bold uppercase"><Cloud className="h-3 w-3"/> Nuvem</span>;
     } else {
       return <span title="Salvo Localmente (Navegador)" className="text-orange-600 flex items-center gap-1 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 text-[10px] font-bold uppercase"><Monitor className="h-3 w-3"/> Local</span>;
     }
  };

  // --- Common Styles ---
  const inputClassName = "w-full bg-gray-700 border border-gray-600 rounded p-2 text-white placeholder-gray-400 focus:ring-blue-500 focus:outline-none";

  // --- Renders ---

  const renderOrderEditor = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-bold text-lg">Editar Itens do Pedido</h3>
            <button onClick={() => { setIsEditingItems(false); setEditingOrderTarget(null); }} className="text-gray-500 hover:text-gray-700">
              <X className="h-6 w-6"/>
            </button>
          </div>

          <div className="flex-grow overflow-hidden flex flex-col md:flex-row">
            {/* Left: Current Items */}
            <div className="w-full md:w-1/2 p-4 overflow-y-auto border-r border-gray-200">
               <h4 className="font-bold text-gray-700 mb-3 text-sm uppercase">Itens Atuais ({tempItems.length})</h4>
               <div className="space-y-2">
                 {tempItems.map(item => (
                   <div key={item.id} className="flex items-center bg-gray-50 p-2 rounded border border-gray-200">
                      <img src={item.imageUrl} className="h-10 w-10 object-cover rounded mr-2" alt=""/>
                      <div className="flex-grow min-w-0">
                         <div className="truncate font-medium text-sm">{item.description}</div>
                         <div className="text-xs text-gray-500">{item.code}</div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <input 
                          type="number" 
                          className="w-16 p-1 border rounded text-center text-sm" 
                          value={item.quantity} 
                          min="1"
                          onChange={(e) => updateTempItemQuantity(item.id, parseInt(e.target.value))}
                        />
                        <button onClick={() => removeTempItem(item.id)} className="text-red-500 hover:text-red-700 p-1">
                          <Trash2 className="h-4 w-4"/>
                        </button>
                      </div>
                   </div>
                 ))}
                 {tempItems.length === 0 && <div className="text-gray-400 text-sm text-center italic py-4">Nenhum item no pedido.</div>}
               </div>
            </div>

            {/* Right: Add Product */}
            <div className="w-full md:w-1/2 p-4 overflow-y-auto flex flex-col">
               <h4 className="font-bold text-gray-700 mb-3 text-sm uppercase">Adicionar Produto</h4>
               <div className="relative mb-4">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"/>
                  <input 
                    type="text" 
                    className="w-full pl-9 pr-3 py-2 border rounded text-sm focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="Buscar produto..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                  />
               </div>
               
               <div className="flex-grow overflow-y-auto space-y-2 border rounded p-2 bg-gray-50">
                  {products
                    .filter(p => !productSearchTerm || p.description.toLowerCase().includes(productSearchTerm.toLowerCase()) || p.code.toLowerCase().includes(productSearchTerm.toLowerCase()))
                    .slice(0, 20) // Limit results
                    .map(product => (
                      <div key={product.id} className="bg-white p-2 rounded border border-gray-200 flex items-center justify-between">
                         <div className="flex items-center overflow-hidden mr-2">
                            <img src={product.imageUrl} className="h-8 w-8 object-cover rounded mr-2 flex-shrink-0" alt=""/>
                            <div className="truncate">
                               <div className="text-sm font-medium truncate">{product.description}</div>
                               <div className="text-xs text-gray-500">{product.code}</div>
                            </div>
                         </div>
                         <Button size="sm" onClick={() => addItemToOrder(product)}>Adicionar</Button>
                      </div>
                  ))}
               </div>
            </div>
          </div>

          <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
             <Button variant="secondary" onClick={() => { setIsEditingItems(false); setEditingOrderTarget(null); }}>Cancelar</Button>
             <Button onClick={saveOrderItemsChanges}>Salvar Alterações</Button>
          </div>
        </div>
      </div>
    );
  };

  const renderCRMDetail = () => {
    if (!selectedOrder) return null;

    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 h-full flex flex-col">
         {/* Header */}
         <div className="p-4 border-b border-gray-200 flex justify-between items-start bg-gray-50 rounded-t-lg">
            <div>
               <button onClick={() => setSelectedOrder(null)} className="text-sm text-gray-500 hover:text-blue-600 mb-2 flex items-center">
                 <ArrowRight className="h-3 w-3 mr-1 rotate-180"/> Voltar para o Quadro
               </button>
               <h2 className="text-xl font-bold flex items-center gap-2">
                 Pedido #{selectedOrder.id.slice(0, 8)}
                 <span className={`text-sm px-2 py-0.5 rounded-full border ${selectedOrder.status === OrderStatus.NEW ? 'bg-blue-100 border-blue-200 text-blue-800' : 'bg-gray-100 border-gray-200 text-gray-800'}`}>
                    {selectedOrder.status}
                 </span>
               </h2>
               <div className="text-sm text-gray-500 mt-1 flex gap-4">
                  <span className="flex items-center"><Calendar className="h-3 w-3 mr-1"/> {new Date(selectedOrder.createdAt).toLocaleString()}</span>
                  <span className="flex items-center"><UserIcon className="h-3 w-3 mr-1"/> {selectedOrder.customerName}</span>
               </div>
            </div>
            
            <div className="flex gap-2 relative">
               <div className="relative">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setActiveDropdownId(activeDropdownId === 'status' ? null : 'status'); }}
                    className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded shadow-sm text-sm hover:bg-gray-50"
                  >
                    Mudar Status <MoreHorizontal className="h-4 w-4 ml-2"/>
                  </button>
                  {activeDropdownId === 'status' && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                      {Object.values(OrderStatus).map(status => (
                        <button
                          key={status}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => { handleStatusChange(selectedOrder.id, status); setActiveDropdownId(null); }}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  )}
               </div>

               <Button variant="outline" size="sm" onClick={() => handleDownloadOrderCSV(selectedOrder)}>
                 <Download className="h-4 w-4"/>
               </Button>
               <Button variant="outline" size="sm" onClick={handlePrintOrder}>
                 <Printer className="h-4 w-4"/>
               </Button>
               <Button variant="danger" size="sm" onClick={() => handleDeleteOrder(selectedOrder.id)}>
                 <Trash2 className="h-4 w-4"/>
               </Button>
            </div>
         </div>

         <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
            {/* Left Col: Items */}
            <div className="w-full md:w-2/3 p-4 overflow-y-auto border-r border-gray-200">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-gray-700 flex items-center"><Package className="h-4 w-4 mr-2"/> Itens do Pedido</h3>
                 <button onClick={() => openOrderEditor(selectedOrder)} className="text-blue-600 text-sm hover:underline flex items-center">
                   <Edit2 className="h-3 w-3 mr-1"/> Editar Itens
                 </button>
               </div>
               
               <div className="space-y-3">
                 {selectedOrder.items.map((item, idx) => (
                   <div key={idx} className="flex items-center p-3 bg-gray-50 rounded border border-gray-100">
                      <img src={item.imageUrl} className="h-12 w-12 object-cover rounded bg-white border mr-3" alt=""/>
                      <div className="flex-grow">
                        <div className="font-bold text-sm">{item.description}</div>
                        <div className="text-xs text-gray-500">Ref: {item.reference} • Cor: {item.colors.join(', ')}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{item.quantity}</div>
                        <div className="text-[10px] text-gray-400">unidades</div>
                      </div>
                   </div>
                 ))}
               </div>

               {selectedOrder.notes && (
                 <div className="mt-6 bg-yellow-50 p-4 rounded border border-yellow-100">
                   <h4 className="font-bold text-sm text-yellow-800 mb-1">Observações do Cliente</h4>
                   <p className="text-sm text-gray-700">{selectedOrder.notes}</p>
                 </div>
               )}
            </div>

            {/* Right Col: CRM/History */}
            <div className="w-full md:w-1/3 bg-gray-50 flex flex-col border-t md:border-t-0">
               <div className="p-4 border-b border-gray-200 bg-white">
                 <h3 className="font-bold text-gray-700 flex items-center"><MessageSquare className="h-4 w-4 mr-2"/> Histórico & Notas</h3>
               </div>
               
               <div className="flex-grow overflow-y-auto p-4 space-y-4">
                  {selectedOrder.interactions?.map(interaction => (
                    <div key={interaction.id} className="bg-white p-3 rounded shadow-sm border border-gray-200 relative">
                       <div className="flex justify-between items-center mb-1">
                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded 
                            ${interaction.type === 'call' ? 'bg-green-100 text-green-700' : 
                              interaction.type === 'email' ? 'bg-blue-100 text-blue-700' : 
                              interaction.type === 'meeting' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                            {interaction.type}
                          </span>
                          <span className="text-[10px] text-gray-400">{new Date(interaction.date).toLocaleString()}</span>
                       </div>
                       <p className="text-sm text-gray-800 whitespace-pre-wrap">{interaction.content}</p>
                       <p className="text-[10px] text-gray-400 mt-2 text-right">Por: {interaction.authorName}</p>
                    </div>
                  ))}
                  {(!selectedOrder.interactions || selectedOrder.interactions.length === 0) && (
                    <div className="text-center text-gray-400 text-sm py-8 italic">Nenhuma interação registrada.</div>
                  )}
               </div>

               <div className="p-4 bg-white border-t border-gray-200">
                  <div className="flex gap-2 mb-2">
                     <button 
                       onClick={() => setInteractionType('note')} 
                       className={`p-1.5 rounded flex-1 flex justify-center ${interactionType === 'note' ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:bg-gray-100'}`} title="Nota"
                     ><FileText className="h-4 w-4"/></button>
                     <button 
                       onClick={() => setInteractionType('call')} 
                       className={`p-1.5 rounded flex-1 flex justify-center ${interactionType === 'call' ? 'bg-green-100 text-green-700' : 'text-gray-400 hover:bg-gray-100'}`} title="Ligação"
                     ><Phone className="h-4 w-4"/></button>
                     <button 
                       onClick={() => setInteractionType('email')} 
                       className={`p-1.5 rounded flex-1 flex justify-center ${interactionType === 'email' ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:bg-gray-100'}`} title="Email"
                     ><Mail className="h-4 w-4"/></button>
                  </div>
                  <textarea
                    className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-blue-500 focus:border-blue-500 mb-2"
                    placeholder="Adicionar nota..."
                    rows={3}
                    value={newInteraction}
                    onChange={(e) => setNewInteraction(e.target.value)}
                  />
                  <Button size="sm" className="w-full" onClick={handleAddInteraction} disabled={!newInteraction.trim()}>
                    Adicionar Nota
                  </Button>
               </div>
            </div>
         </div>
         
         {/* Edit Modal Injection */}
         {isEditingItems && editingOrderTarget?.id === selectedOrder.id && renderOrderEditor()}
      </div>
    );
  };

  const renderCRMBoard = () => {
    if (selectedOrder) {
      return renderCRMDetail();
    }

    const columns = Object.values(OrderStatus);

    return (
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)] items-start">
        {columns.map(status => (
          <div key={status} className="min-w-[300px] w-[300px] flex-shrink-0 bg-gray-100 rounded-lg flex flex-col max-h-full">
            <div className="p-3 font-bold text-gray-700 flex justify-between items-center bg-gray-200 rounded-t-lg sticky top-0 z-10">
              <span className="text-sm uppercase">{status}</span>
              <span className="bg-white text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold border border-gray-300">
                {orders.filter(o => o.status === status).length}
              </span>
            </div>
            
            <div className="p-2 space-y-2 overflow-y-auto flex-1">
              {orders.filter(o => o.status === status).map(order => (
                <div 
                  key={order.id} 
                  onClick={() => setSelectedOrder(order)}
                  className="bg-white p-3 rounded shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-all hover:border-blue-300 group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">#{order.id.slice(0, 8)}</span>
                    <span className="text-[10px] text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  <h4 className="font-bold text-gray-800 text-sm mb-1 truncate" title={order.customerName || 'Cliente Anônimo'}>
                    {order.customerName || 'Cliente Anônimo'}
                  </h4>
                  <p className="text-xs text-gray-500 mb-2 truncate">{order.customerContact}</p>
                  
                  {order.notes && (
                     <div className="text-[10px] bg-yellow-50 text-yellow-800 p-1 rounded mb-2 truncate border border-yellow-100">
                       Note: {order.notes}
                     </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                     <div className="text-xs text-gray-500 font-medium flex items-center">
                        <Package className="h-3 w-3 mr-1"/> {order.items.length} vols
                     </div>
                     {user.role !== UserRole.REPRESENTATIVE && (
                       <div className="text-[10px] text-gray-400 flex items-center" title="Representante">
                          <UserIcon className="h-3 w-3 mr-1"/>
                          {users.find(u => u.id === order.representativeId)?.name.split(' ')[0] || 'Rep'}
                       </div>
                     )}
                  </div>
                </div>
              ))}
              {orders.filter(o => o.status === status).length === 0 && (
                <div className="text-center text-gray-400 text-xs py-4 italic">Vazio</div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderProductManager = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Catálogo de Produtos</h3>
        <div className="flex gap-2">
           <Button variant="danger" size="sm" onClick={handleClearLocalProducts} title="Limpar Cache Local">
             <Eraser className="h-4 w-4 mr-2" /> Limpar Produtos Locais
           </Button>
           <label className="cursor-pointer bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 flex items-center">
             <Download className="h-4 w-4 mr-2"/> Importar CSV
             <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
           </label>
           <Button variant="outline" onClick={downloadProductList}>
             <Download className="h-4 w-4 mr-2"/> Exportar
           </Button>
           <Button onClick={() => setEditingProduct({ colors: [], category: 'Geral' })}>
             <Plus className="h-4 w-4 mr-2"/> Novo Produto
           </Button>
        </div>
      </div>

      {editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto print:hidden">
          <form onSubmit={handleProductSave} className="bg-white rounded-lg p-6 max-w-3xl w-full">
            <h3 className="text-lg font-bold mb-4 border-b pb-2">{editingProduct.id ? 'Editar' : 'Novo'} Produto</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Código</label>
                  <input 
                    className={inputClassName}
                    value={editingProduct.code || ''} 
                    onChange={e => setEditingProduct({...editingProduct, code: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Referência</label>
                  <input 
                    className={inputClassName}
                    value={editingProduct.reference || ''} 
                    onChange={e => setEditingProduct({...editingProduct, reference: e.target.value})}
                  />
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700">Categoria</label>
                  <input 
                    className={inputClassName}
                    value={editingProduct.category || ''} 
                    onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                    placeholder="Ex: Tomadas"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Subcategoria</label>
                  <input 
                    className={inputClassName}
                    value={editingProduct.subcategory || ''} 
                    onChange={e => setEditingProduct({...editingProduct, subcategory: e.target.value})}
                    placeholder="Ex: Residencial"
                  />
                </div>
              </div>

              <div className="space-y-4">
                 <div>
                  <label className="block text-sm font-medium text-gray-700">Descrição</label>
                  <input 
                    className={inputClassName}
                    value={editingProduct.description || ''} 
                    onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Linha</label>
                  <input 
                    className={inputClassName}
                    value={editingProduct.line || ''} 
                    onChange={e => setEditingProduct({...editingProduct, line: e.target.value})}
                    placeholder="Ex: Classic"
                  />
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700">Amperagem</label>
                  <select
                    className={inputClassName}
                    value={editingProduct.amperage || ''} 
                    onChange={e => setEditingProduct({...editingProduct, amperage: e.target.value})}
                  >
                    <option value="">Não se aplica</option>
                    <option value="10A">10A</option>
                    <option value="20A">20A</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Paleta de Cores (Separe por vírgula)</label>
                  <input 
                    className={inputClassName}
                    value={Array.isArray(editingProduct.colors) ? editingProduct.colors.join(', ') : editingProduct.colors || ''} 
                    onChange={e => setEditingProduct({...editingProduct, colors: e.target.value})}
                    placeholder="Branco, Preto, Cinza"
                  />
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700">Foto do Produto</label>
                  <div className="flex gap-2 items-center">
                    <label className="flex-grow cursor-pointer bg-gray-700 border border-gray-600 text-white py-2 px-3 rounded shadow-sm hover:bg-gray-600 flex items-center justify-center">
                       <Upload className="h-4 w-4 mr-2" />
                       {editingProduct.imageUrl ? 'Alterar Imagem' : 'Upload Imagem'}
                       <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                    {editingProduct.imageUrl && (
                      <img src={editingProduct.imageUrl} alt="Preview" className="h-10 w-10 object-cover rounded bg-gray-100 border"/>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Carregar do computador</p>
                </div>
              </div>
            </div>

             {/* Novo Campo de Detalhes */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Informações Técnicas / Detalhes</label>
              <textarea 
                className={inputClassName}
                rows={4}
                value={editingProduct.details || ''} 
                onChange={e => setEditingProduct({...editingProduct, details: e.target.value})}
                placeholder="Insira detalhes técnicos, dimensões, materiais e outras informações relevantes sobre o produto..."
              />
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button type="button" variant="secondary" onClick={() => setEditingProduct(null)}>Cancelar</Button>
              <Button type="submit">Salvar Produto</Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-x-auto border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Classificação</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cores</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <img src={p.imageUrl} alt="" className="h-10 w-10 rounded object-cover mr-3 bg-gray-100"/>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{p.description}</div>
                      <div className="text-xs text-gray-500">Cod: {p.code} | Ref: {p.reference}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{p.category}</div>
                  <div className="text-xs text-gray-500">
                    {p.subcategory} • {p.line}
                    {p.amperage && <span className="ml-2 font-bold text-blue-600 border border-blue-200 bg-blue-50 px-1 rounded">{p.amperage}</span>}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex flex-wrap gap-1">
                    {p.colors.map(c => <span key={c} className="px-2 py-0.5 bg-gray-100 rounded text-[10px] border border-gray-200">{c}</span>)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => setEditingProduct(p)} className="text-indigo-600 hover:text-indigo-900 mr-4">Editar</button>
                  <button onClick={() => handleProductDelete(p.id)} className="text-red-600 hover:text-red-900">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderUserManager = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Gerenciar Usuários</h3>
        <Button onClick={() => setEditingUser({ role: UserRole.REPRESENTATIVE })}>
          <Plus className="h-4 w-4 mr-2"/> Novo Usuário
        </Button>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 print:hidden">
          <form onSubmit={handleUserSave} className="bg-white rounded-lg p-6 max-w-md w-full relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{editingUser.id ? 'Editar' : 'Novo'} Usuário</h3>
              <button 
                type="button" 
                onClick={() => setShowSupabaseHelp(!showSupabaseHelp)} 
                className="text-blue-600 hover:text-blue-800 flex items-center text-xs font-medium"
              >
                <HelpCircle className="h-4 w-4 mr-1" />
                Ajuda Supabase
              </button>
            </div>

            {/* Guia de Ajuda do Supabase + Correção SQL */}
            {showSupabaseHelp && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 text-sm text-blue-900 max-h-60 overflow-y-auto">
                <h4 className="font-bold flex items-center mb-2 text-blue-800">
                  <Cloud className="h-4 w-4 mr-2"/> Guia de Configuração
                </h4>
                
                <div className="mb-3">
                    <p className="font-semibold text-xs uppercase mb-1 text-blue-700">1. Criação Manual</p>
                    <ol className="list-decimal pl-4 space-y-1 text-xs">
                    <li>No Supabase, vá em <strong>Authentication</strong> e adicione o usuário.</li>
                    <li>Copie o <strong>User UID</strong> gerado.</li>
                    <li>Vá em <strong>Table Editor</strong> &gt; <strong>profiles</strong>.</li>
                    <li>Insira uma linha com o UID e a Role (ADMIN, REPRESENTATIVE ou SUPERVISOR).</li>
                    </ol>
                </div>

                <div className="bg-red-50 p-2 rounded border border-red-100">
                    <p className="font-bold text-xs text-red-700 mb-1 flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Erro "profiles_role_check"?
                    </p>
                    <p className="text-[10px] text-red-600 mb-2 leading-tight">
                        Esse erro ocorre porque o banco de dados tem uma regra antiga que não aceita "SUPERVISOR". Execute o SQL abaixo no <strong>SQL Editor</strong> do Supabase para corrigir:
                    </p>
                    <div className="relative group">
                        <code className="block bg-gray-800 text-green-400 p-2 rounded text-[10px] font-mono break-all whitespace-pre-wrap">
{`ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('ADMIN', 'REPRESENTATIVE', 'SUPERVISOR'));`}
                        </code>
                    </div>
                </div>

                <button 
                  type="button"
                  onClick={() => setShowSupabaseHelp(false)}
                  className="mt-3 text-xs underline text-blue-700 hover:text-blue-900 w-full text-center sticky bottom-0 bg-blue-50 py-1"
                >
                  Fechar Ajuda
                </button>
              </div>
            )}

            <div className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
                  <input 
                    className={inputClassName}
                    value={editingUser.name || ''} 
                    onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                    required
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input 
                    type="email"
                    className={inputClassName}
                    value={editingUser.email || ''} 
                    onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                    required
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700">Senha</label>
                  <input 
                    type="text"
                    className={inputClassName}
                    value={editingUser.password || ''} 
                    onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                    placeholder={editingUser.id ? "Deixe em branco para manter" : "Senha Obrigatória"}
                    required={!editingUser.id}
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700">Função</label>
                  <select 
                    className={inputClassName}
                    value={editingUser.role} 
                    onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}
                  >
                    <option value={UserRole.REPRESENTATIVE}>Representante</option>
                    {user.role === UserRole.ADMIN && (
                      <>
                        <option value={UserRole.SUPERVISOR}>Supervisor</option>
                        <option value={UserRole.ADMIN}>Administrador</option>
                      </>
                    )}
                  </select>
                  {user.role === UserRole.SUPERVISOR && (
                      <p className="text-xs text-gray-400 mt-1">Supervisores podem criar apenas Representantes.</p>
                  )}
               </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
             <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Função</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{u.name}</td>
                <td className="px-6 py-4 text-gray-500">{u.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-800' : 
                      u.role === UserRole.SUPERVISOR ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                    {u.role === UserRole.ADMIN ? 'Admin' : u.role === UserRole.SUPERVISOR ? 'Supervisor' : 'Representante'}
                  </span>
                </td>
                 <td className="px-6 py-4">
                  {getUserSourceIcon(u)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {canEditTargetUser(u) ? (
                      <>
                        <button onClick={() => setEditingUser(u)} className="text-indigo-600 hover:text-indigo-900 mr-4">Editar</button>
                        <button onClick={() => handleUserDelete(u.id)} className="text-red-600 hover:text-red-900">Excluir</button>
                      </>
                  ) : (
                      <span className="text-gray-400 text-xs italic">Restrito</span>
                  )}
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
      <div className="flex border-b border-gray-200 overflow-x-auto no-print">
        <button
          className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'orders' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('orders')}
        >
          <div className="flex items-center"><Package className="mr-2 h-4 w-4"/> CRM / Pedidos</div>
        </button>
        {canManageProducts && (
          <button
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'products' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('products')}
          >
            <div className="flex items-center"><Search className="mr-2 h-4 w-4"/> Produtos</div>
          </button>
        )}
        {canManageUsers && (
          <button
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'users' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('users')}
          >
            <div className="flex items-center"><Users className="mr-2 h-4 w-4"/> Usuários</div>
          </button>
        )}
      </div>

      {loading ? <div>Carregando...</div> : (
        <div className="min-h-[400px]">
          {activeTab === 'orders' && renderCRMBoard()}
          {activeTab === 'products' && canManageProducts && renderProductManager()}
          {activeTab === 'users' && canManageUsers && renderUserManager()}
        </div>
      )}
    </div>
  );
};