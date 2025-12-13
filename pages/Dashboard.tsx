import React, { useState, useEffect } from 'react';
import { User, UserRole, Order, Product, OrderStatus, CRMInteraction, CartItem } from '../types';
import { orderService, productService, userService } from '../services/api';
import { Button } from '../components/Button';
import { Plus, Trash2, Edit2, Download, Search, CheckCircle, Clock, Package, Users, MessageSquare, Phone, Mail, Calendar, X, ArrowRight, MoreHorizontal, Eye, Upload, Printer, Save, UserCog } from 'lucide-react';

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
     const headers = "ID,Code,Description,Reference,Category,Subcategory,Line,Colors\n";
     const rows = products.map(p => 
       `${p.id},${p.code},"${p.description}",${p.reference},${p.category},${p.subcategory},${p.line},"${p.colors.join('|')}"`
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
    
    // Validation: Supervisors cannot create/promote Admins
    if (user.role === UserRole.SUPERVISOR && editingUser.role === UserRole.ADMIN) {
        return alert("Supervisores não podem criar ou promover usuários para Administrador.");
    }

    try {
      if (editingUser.id) {
        await userService.update(editingUser as User);
      } else {
        await userService.create(editingUser as User);
      }
      setEditingUser(null);
      await loadData(); // Reload to show new user
    } catch (error) {
      alert("Erro ao salvar usuário.");
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
      await userService.delete(id);
      loadData();
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

  // --- Status Helper ---
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.NEW: return 'bg-blue-100 text-blue-800 border-blue-200';
      case OrderStatus.IN_PROGRESS: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case OrderStatus.WAITING_STOCK: return 'bg-orange-100 text-orange-800 border-orange-200';
      case OrderStatus.CLOSED: return 'bg-green-100 text-green-800 border-green-200';
      case OrderStatus.CANCELLED: return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // --- Common Styles ---
  const inputClassName = "w-full bg-gray-700 border border-gray-600 rounded p-2 text-white placeholder-gray-400 focus:ring-blue-500 focus:outline-none";

  // --- Renders ---

  const renderOrderEditor = () => {
    if (!isEditingItems || !editingOrderTarget) return null;

    // Filter products for adding new items
    const searchResults = productSearchTerm 
      ? products.filter(p => 
          p.description.toLowerCase().includes(productSearchTerm.toLowerCase()) || 
          p.code.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
          p.reference.toLowerCase().includes(productSearchTerm.toLowerCase())
        ).slice(0, 5) // Limit to 5 results
      : [];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[60]">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
          <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-lg">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Editar Itens do Pedido</h3>
              <p className="text-sm text-gray-500">Cliente: {editingOrderTarget.customerName}</p>
            </div>
            <button onClick={() => setIsEditingItems(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-grow overflow-hidden flex flex-col md:flex-row">
            {/* Left: Current Items */}
            <div className="flex-1 overflow-y-auto p-4 border-r border-gray-200 bg-gray-50">
               <h4 className="font-semibold mb-3 flex items-center text-gray-700">
                 <Package className="h-4 w-4 mr-2" /> Itens no Pedido ({tempItems.length})
               </h4>
               <div className="space-y-3">
                 {tempItems.map(item => (
                   <div key={item.id} className="bg-white p-3 rounded shadow-sm border border-gray-200 flex items-center gap-3">
                     <img src={item.imageUrl} alt="" className="h-12 w-12 rounded object-cover bg-gray-100" />
                     <div className="flex-grow min-w-0">
                       <p className="font-medium text-sm text-gray-900 truncate">{item.description}</p>
                       <p className="text-xs text-gray-500">{item.code} | {item.reference}</p>
                     </div>
                     <div className="flex items-center gap-2">
                       <input 
                         type="number" 
                         min="1"
                         className="w-16 bg-gray-700 border border-gray-600 rounded text-white text-center p-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                         value={item.quantity}
                         onChange={(e) => updateTempItemQuantity(item.id, parseInt(e.target.value) || 1)}
                       />
                       <button 
                         onClick={() => removeTempItem(item.id)}
                         className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                         title="Remover"
                       >
                         <Trash2 className="h-4 w-4" />
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
            </div>

            {/* Right: Add Products */}
            <div className="flex-1 p-4 flex flex-col bg-white">
              <h4 className="font-semibold mb-3 flex items-center text-gray-700">
                <Search className="h-4 w-4 mr-2" /> Adicionar Produtos
              </h4>
              <div className="relative mb-4">
                 <input 
                   type="text"
                   className={inputClassName}
                   placeholder="Buscar por código, nome ou referência..."
                   value={productSearchTerm}
                   onChange={(e) => setProductSearchTerm(e.target.value)}
                 />
              </div>

              <div className="flex-grow overflow-y-auto space-y-2">
                 {productSearchTerm && searchResults.length === 0 && (
                   <p className="text-center text-gray-500 text-sm mt-4">Nenhum produto encontrado.</p>
                 )}
                 {!productSearchTerm && (
                    <p className="text-center text-gray-400 text-sm mt-4">Digite para buscar produtos...</p>
                 )}
                 {searchResults.map(product => {
                   const alreadyInOrder = tempItems.some(i => i.id === product.id);
                   return (
                     <div key={product.id} className="border border-gray-100 rounded p-2 hover:bg-gray-50 transition-colors flex items-center gap-2">
                        <img src={product.imageUrl} alt="" className="h-10 w-10 rounded object-cover bg-gray-100" />
                        <div className="flex-grow min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{product.description}</p>
                          <p className="text-xs text-gray-500">{product.code}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant={alreadyInOrder ? "secondary" : "primary"}
                          onClick={() => addItemToOrder(product)}
                          disabled={alreadyInOrder}
                          className="text-xs px-2 py-1"
                        >
                          {alreadyInOrder ? 'Adicionado' : 'Adicionar'}
                        </Button>
                     </div>
                   );
                 })}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsEditingItems(false)}>Cancelar</Button>
            <Button onClick={saveOrderItemsChanges}>
              <Save className="h-4 w-4 mr-2" /> Salvar Alterações
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderCRMDetail = () => {
    if (!selectedOrder) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-50 print-modal">
        <div className="bg-white w-full max-w-2xl h-full shadow-2xl overflow-y-auto flex flex-col animate-slide-left print-scroll-reset">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex justify-between items-start bg-slate-50 print:bg-white print:border-b-2">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">{selectedOrder.customerName}</h2>
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <span>Pedido #{selectedOrder.id.toUpperCase()}</span>
                <span>•</span>
                <span>{selectedOrder.customerContact}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 no-print">
              <Button variant="outline" size="sm" onClick={() => handleDownloadOrderCSV(selectedOrder)} title="Baixar Excel">
                <Download className="h-4 w-4 mr-2" /> Excel
              </Button>
              <Button variant="primary" size="sm" onClick={handlePrintOrder} title="Imprimir em PDF">
                <Printer className="h-4 w-4 mr-2" /> Imprimir PDF
              </Button>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 ml-2">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Pipeline Status */}
          <div className="p-6 bg-white border-b border-gray-200 no-print">
            <label className="block text-sm font-medium text-gray-700 mb-2">Status do Pipeline</label>
            <div className="flex flex-wrap gap-2">
              {Object.values(OrderStatus).map(status => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(selectedOrder.id, status)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    selectedOrder.status === status
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
          
          {/* Print Status Display */}
          <div className="hidden print:block px-6 py-4 border-b border-gray-200">
             <span className="font-bold">Status:</span> {selectedOrder.status}
          </div>

          <div className="flex-grow flex flex-col md:flex-row print:flex-col">
            {/* Left Col: Order Items */}
            <div className="w-full md:w-1/2 print:w-full p-6 border-r border-gray-200 overflow-y-auto bg-gray-50 print:bg-white print:overflow-visible">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-gray-800 flex items-center">
                   <Package className="h-4 w-4 mr-2"/> Produtos ({selectedOrder.items.length})
                 </h3>
                 <button 
                   onClick={() => { setSelectedOrder(null); openOrderEditor(selectedOrder); }}
                   className="text-xs text-blue-600 hover:text-blue-800 font-medium no-print flex items-center"
                 >
                   <Edit2 className="h-3 w-3 mr-1"/> Editar Itens
                 </button>
              </div>
              
              <ul className="space-y-3">
                {selectedOrder.items.map((item, idx) => (
                  <li key={idx} className="bg-white print:border print:border-gray-300 p-3 rounded shadow-sm border border-gray-200 text-sm">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-gray-900">{item.code}</span>
                      <span className="bg-gray-100 print:bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-xs">x{item.quantity}</span>
                    </div>
                    <p className="text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                    <p className="text-xs text-gray-400 mt-1">Ref: {item.reference}</p>
                    <p className="text-xs text-gray-500 mt-1">Cores: {item.colors.join(', ')}</p>
                  </li>
                ))}
              </ul>
              {selectedOrder.notes && (
                <div className="mt-4 bg-yellow-50 print:bg-white print:border print:border-gray-300 p-3 rounded border border-yellow-100 text-sm text-yellow-800 print:text-gray-900">
                  <span className="font-bold">Nota do Cliente:</span> {selectedOrder.notes}
                </div>
              )}
            </div>

            {/* Right Col: CRM Timeline */}
            <div className="w-full md:w-1/2 print:w-full p-6 flex flex-col h-full bg-white print:h-auto">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                <Clock className="h-4 w-4 mr-2"/> Histórico de Interações
              </h3>
              
              <div className="flex-grow overflow-y-auto space-y-4 mb-4 pr-2 print:overflow-visible">
                {(selectedOrder.interactions || []).length === 0 && (
                  <p className="text-sm text-gray-400 italic text-center py-4">Nenhuma interação registrada.</p>
                )}
                {(selectedOrder.interactions || []).map(interaction => (
                  <div key={interaction.id} className="relative pl-4 border-l-2 border-gray-200 print:border-gray-400">
                    <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white print:border-gray-300 ${
                      interaction.type === 'call' ? 'bg-green-500' :
                      interaction.type === 'email' ? 'bg-blue-500' :
                      interaction.type === 'meeting' ? 'bg-purple-500' : 'bg-gray-400'
                    }`}></div>
                    <div className="text-xs text-gray-500 mb-1 flex justify-between">
                      <span>{new Date(interaction.date).toLocaleString()}</span>
                      <span className="font-medium">{interaction.authorName}</span>
                    </div>
                    <div className="text-sm text-gray-800 bg-gray-50 print:bg-white print:border print:border-gray-200 p-2 rounded">
                      {interaction.content}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Interaction Form */}
              <div className="border-t pt-4 no-print">
                <div className="flex gap-2 mb-2">
                  <button onClick={() => setInteractionType('note')} className={`p-2 rounded transition-colors ${interactionType === 'note' ? 'bg-gray-700 text-white' : 'hover:bg-gray-100 text-gray-600'}`} title="Nota"><MessageSquare className="h-4 w-4"/></button>
                  <button onClick={() => setInteractionType('call')} className={`p-2 rounded transition-colors ${interactionType === 'call' ? 'bg-green-600 text-white' : 'hover:bg-gray-100 text-gray-600'}`} title="Ligação"><Phone className="h-4 w-4"/></button>
                  <button onClick={() => setInteractionType('email')} className={`p-2 rounded transition-colors ${interactionType === 'email' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-600'}`} title="Email"><Mail className="h-4 w-4"/></button>
                  <button onClick={() => setInteractionType('meeting')} className={`p-2 rounded transition-colors ${interactionType === 'meeting' ? 'bg-purple-600 text-white' : 'hover:bg-gray-100 text-gray-600'}`} title="Reunião"><Users className="h-4 w-4"/></button>
                </div>
                <textarea
                  className={inputClassName}
                  rows={3}
                  placeholder="Registre uma interação..."
                  value={newInteraction}
                  onChange={e => setNewInteraction(e.target.value)}
                />
                <Button size="sm" className="w-full mt-2" onClick={handleAddInteraction}>
                  Adicionar Registro
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCRMBoard = () => (
    <div className={`space-y-6 ${selectedOrder || isEditingItems ? 'print:hidden' : ''}`}>
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
         <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
           <h4 className="text-gray-500 text-sm font-medium">Novos Leads</h4>
           <p className="text-2xl font-bold text-gray-900">{orders.filter(o => o.status === OrderStatus.NEW).length}</p>
         </div>
         <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500">
           <h4 className="text-gray-500 text-sm font-medium">Em Atendimento</h4>
           <p className="text-2xl font-bold text-gray-900">{orders.filter(o => o.status === OrderStatus.IN_PROGRESS).length}</p>
         </div>
         <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-orange-500">
           <h4 className="text-gray-500 text-sm font-medium">Aguardando Estoque</h4>
           <p className="text-2xl font-bold text-gray-900">{orders.filter(o => o.status === OrderStatus.WAITING_STOCK).length}</p>
         </div>
         <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
           <h4 className="text-gray-500 text-sm font-medium">Vendas Fechadas</h4>
           <p className="text-2xl font-bold text-gray-900">{orders.filter(o => o.status === OrderStatus.CLOSED).length}</p>
         </div>
       </div>

       <div className="bg-white shadow rounded-lg border border-gray-200">
         <div className="p-4 border-b border-gray-200 bg-gray-50">
           <h3 className="font-bold text-gray-700">Pipeline de Vendas</h3>
         </div>
         <div className="overflow-x-auto min-h-[300px]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente / Contato</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Interação</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map(order => {
                   const lastInteraction = order.interactions && order.interactions.length > 0 
                    ? order.interactions[order.interactions.length - 1] 
                    : null;

                   return (
                    <tr key={order.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedOrder(order)}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                        <div className="text-sm text-gray-500">{order.customerContact}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {lastInteraction ? (
                          <div className="flex flex-col">
                            <span className="truncate max-w-[150px]">{lastInteraction.content}</span>
                            <span className="text-xs text-gray-400">{new Date(lastInteraction.date).toLocaleDateString()}</span>
                          </div>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium relative order-actions">
                        <div className="relative inline-block text-left">
                           <button 
                             onClick={(e) => { 
                               e.stopPropagation(); 
                               setActiveDropdownId(activeDropdownId === order.id ? null : order.id); 
                             }}
                             className="text-gray-500 hover:text-blue-600 focus:outline-none p-2 rounded-full hover:bg-gray-100"
                           >
                             <MoreHorizontal className="h-5 w-5" />
                           </button>
                           
                           {/* Dropdown Menu */}
                           {activeDropdownId === order.id && (
                             <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                               <div className="py-1" role="menu" aria-orientation="vertical">
                                 <button
                                   onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); setActiveDropdownId(null); }}
                                   className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                   role="menuitem"
                                 >
                                   <div className="flex items-center"><Eye className="h-4 w-4 mr-2"/> Ver Detalhes</div>
                                 </button>
                                 <button
                                   onClick={(e) => { e.stopPropagation(); openOrderEditor(order); }}
                                   className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                   role="menuitem"
                                 >
                                   <div className="flex items-center"><Edit2 className="h-4 w-4 mr-2"/> Editar Pedido</div>
                                 </button>
                                 <button
                                   onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); setActiveDropdownId(null); }}
                                   className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
                                   role="menuitem"
                                 >
                                   <div className="flex items-center"><Trash2 className="h-4 w-4 mr-2"/> Excluir Pedido</div>
                                 </button>
                               </div>
                             </div>
                           )}
                        </div>
                      </td>
                    </tr>
                   );
                })}
              </tbody>
            </table>
         </div>
       </div>
       {renderCRMDetail()}
       {renderOrderEditor()}
    </div>
  );

  const renderProductManager = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Catálogo de Produtos</h3>
        <div className="flex gap-2">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
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
                  <div className="text-xs text-gray-500">{p.subcategory} • {p.line}</div>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleUserSave} className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">{editingUser.id ? 'Editar' : 'Novo'} Usuário</h3>
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
                    placeholder={editingUser.id ? "Deixe em branco para manter" : "Senha inicial"}
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