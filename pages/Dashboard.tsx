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
  const [showProductModal, setShowProductModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  
  // Order Item Editing State
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [editingOrderTarget, setEditingOrderTarget] = useState<Order | null>(null);
  const [tempItems, setTempItems] = useState<CartItem[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  
  // CRM States
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newInteraction, setNewInteraction] = useState('');
  const [interactionType, setInteractionType] = useState<CRMInteraction['type']>('note');
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Permission helpers
  const canManageProducts = user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR;
  const canManageUsers = user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR;

  useEffect(() => {
    loadData();
    const handleClickOutside = () => setActiveDropdownId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [user, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'orders') {
        let data: Order[] = [];
        if (user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR) {
          data = await orderService.getAll();
        } else {
          data = await orderService.getByRep(user.id);
        }
        setOrders(data);
      }

      if (activeTab === 'products' && canManageProducts) {
        const data = await productService.getAll();
        setProducts(data);
      }

      if (activeTab === 'users' && canManageUsers) {
        const data = await userService.getAll();
        setUsers(data);
      }
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
    } finally {
      setLoading(false);
    }
  };

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
    setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    setSelectedOrder(updatedOrder);
    setNewInteraction('');
  };

  const handleDeleteOrder = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este pedido?')) {
      await orderService.delete(id);
      setOrders(prev => prev.filter(o => o.id !== id));
      if (selectedOrder?.id === id) setSelectedOrder(null);
    }
  };

  const handleProductSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    try {
      const productToSave: any = {
        ...editingProduct,
        colors: typeof editingProduct.colors === 'string' 
          ? editingProduct.colors.split(',').map(c => c.trim()) 
          : editingProduct.colors || []
      };

      if (productToSave.id) {
        await productService.update(productToSave);
      } else {
        await productService.create(productToSave);
      }
      
      setShowProductModal(false);
      setEditingProduct(null);
      loadData();
    } catch (e) {
      alert("Erro ao salvar produto.");
    }
  };

  const handleUserSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      if (editingUser.id) {
        await userService.update(editingUser as User);
      } else {
        await userService.create(editingUser);
      }
      setShowUserModal(false);
      setEditingUser(null);
      loadData();
    } catch (e) {
      alert("Erro ao salvar usuário.");
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Excluir este usuário?')) {
      await userService.delete(id);
      loadData();
    }
  };

  const getStatusOptions = () => {
    const options = Object.values(OrderStatus);
    if (user.role === UserRole.REPRESENTATIVE) {
      return options.filter(opt => opt !== OrderStatus.WAITING_STOCK);
    }
    return options;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Painel de Controle</h2>
        <div className="flex bg-gray-200 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'orders' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'}`}
          >Pedidos</button>
          {canManageProducts && (
            <button 
              onClick={() => setActiveTab('products')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'products' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'}`}
            >Produtos</button>
          )}
          {canManageUsers && (
            <button 
              onClick={() => setActiveTab('users')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'}`}
            >Usuários</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="loader"></div>
          <p className="text-gray-500">Carregando dados...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          {activeTab === 'orders' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b">
                  <tr>
                    <th className="px-6 py-3">Cliente</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Data</th>
                    <th className="px-6 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{order.customerName}</div>
                        <div className="text-xs text-gray-500">{order.customerContact}</div>
                      </td>
                      <td className="px-6 py-4">
                        <select 
                          className={`text-xs font-bold rounded-full px-3 py-1 border-0 focus:ring-2 focus:ring-blue-500 ${
                            order.status === OrderStatus.CLOSED ? 'bg-green-100 text-green-700' :
                            order.status === OrderStatus.CANCELLED ? 'bg-red-100 text-red-700' :
                            order.status === OrderStatus.WAITING_STOCK ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                        >
                          {getStatusOptions().map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {user.role === UserRole.ADMIN && (
                            <Button variant="danger" size="sm" onClick={() => handleDeleteOrder(order.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length === 0 && <div className="text-center py-10 text-gray-400">Nenhum pedido encontrado.</div>}
            </div>
          )}

          {activeTab === 'products' && (
            <div>
              <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-700">Gerenciar Produtos</h3>
                <Button size="sm" onClick={() => { setEditingProduct({}); setShowProductModal(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Novo Produto
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-xs text-gray-500 border-b">
                    <tr>
                      <th className="px-6 py-3">Cód/Ref</th>
                      <th className="px-6 py-3">Descrição</th>
                      <th className="px-6 py-3">Categoria</th>
                      <th className="px-6 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map(product => (
                      <tr key={product.id}>
                        <td className="px-6 py-4 text-sm font-bold">{product.code}<br/><span className="text-xs font-normal text-gray-400">{product.reference}</span></td>
                        <td className="px-6 py-4 text-sm">{product.description}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{product.category}</td>
                        <td className="px-6 py-4 flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setEditingProduct(product); setShowProductModal(true); }}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleProductDelete(product.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-700">Gerenciar Equipe</h3>
                <Button size="sm" onClick={() => { setEditingUser({}); setShowUserModal(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Novo Usuário
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-xs text-gray-500 border-b">
                    <tr>
                      <th className="px-6 py-3">Nome</th>
                      <th className="px-6 py-3">Email</th>
                      <th className="px-6 py-3">Cargo</th>
                      <th className="px-6 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map(u => (
                      <tr key={u.id}>
                        <td className="px-6 py-4 font-bold text-sm">{u.name}</td>
                        <td className="px-6 py-4 text-sm">{u.email}</td>
                        <td className="px-6 py-4 text-sm text-blue-600 font-medium">{u.role}</td>
                        <td className="px-6 py-4 flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setEditingUser(u); setShowUserModal(true); }}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleDeleteUser(u.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CRM Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Pedido #{selectedOrder.id.substring(0, 8)}</h3>
                <p className="text-sm text-gray-500">{selectedOrder.customerName} • {new Date(selectedOrder.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="h-6 w-6 text-gray-500" /></button>
            </div>
            
            <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
              <div className="w-full md:w-1/2 p-6 overflow-y-auto border-b md:border-b-0 md:border-r">
                <h4 className="font-bold text-gray-700 mb-4 flex items-center"><Package className="h-4 w-4 mr-2" /> Itens do Pedido</h4>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded border">
                      <img src={item.imageUrl} className="w-12 h-12 rounded object-cover border" alt=""/>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">{item.description}</div>
                        <div className="text-xs text-gray-500">Qtd: {item.quantity} • {item.code}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="w-full md:w-1/2 p-6 flex flex-col h-full">
                <h4 className="font-bold text-gray-700 mb-4 flex items-center"><MessageSquare className="h-4 w-4 mr-2" /> Histórico CRM</h4>
                <div className="flex-grow overflow-y-auto space-y-4 mb-4 pr-2">
                  {selectedOrder.interactions?.map(i => (
                    <div key={i.id} className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-500">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-blue-600 uppercase">{i.type}</span>
                        <span className="text-[10px] text-gray-400">{new Date(i.date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-gray-800">{i.content}</p>
                      <div className="mt-1 text-[10px] text-gray-500 italic">Por: {i.authorName}</div>
                    </div>
                  ))}
                  {(!selectedOrder.interactions || selectedOrder.interactions.length === 0) && (
                    <div className="text-center text-gray-400 py-10 text-sm">Inicie o atendimento deste pedido.</div>
                  )}
                </div>
                
                <div className="mt-auto space-y-3">
                  <div className="flex gap-2">
                    <select 
                      className="text-sm border rounded bg-gray-50 p-2"
                      value={interactionType}
                      onChange={(e) => setInteractionType(e.target.value as any)}
                    >
                      <option value="note">Nota</option>
                      <option value="call">Chamada</option>
                      <option value="email">Email</option>
                    </select>
                    <textarea 
                      className="flex-1 text-sm border rounded p-2 focus:ring-1 focus:ring-blue-500 outline-none"
                      rows={2}
                      placeholder="Adicionar observação..."
                      value={newInteraction}
                      onChange={(e) => setNewInteraction(e.target.value)}
                    ></textarea>
                  </div>
                  <Button className="w-full" onClick={handleAddInteraction}>Salvar Interação</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[110] flex items-center justify-center p-4">
          <form onSubmit={handleProductSave} className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-4 bg-gray-50 border-b font-bold flex justify-between">
              {editingProduct.id ? 'Editar Produto' : 'Novo Produto'}
              <button type="button" onClick={() => setShowProductModal(false)}><X/></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Código</label>
                  <input required className="w-full p-2 border rounded" value={editingProduct.code || ''} onChange={e => setEditingProduct({...editingProduct, code: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Referência</label>
                  <input className="w-full p-2 border rounded" value={editingProduct.reference || ''} onChange={e => setEditingProduct({...editingProduct, reference: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Descrição</label>
                <input required className="w-full p-2 border rounded" value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Categoria</label>
                  <input required className="w-full p-2 border rounded" value={editingProduct.category || ''} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Subcategoria</label>
                  <input className="w-full p-2 border rounded" value={editingProduct.subcategory || ''} onChange={e => setEditingProduct({...editingProduct, subcategory: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Imagem URL</label>
                <input className="w-full p-2 border rounded" value={editingProduct.imageUrl || ''} onChange={e => setEditingProduct({...editingProduct, imageUrl: e.target.value})} placeholder="https://..." />
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setShowProductModal(false)}>Cancelar</Button>
              <Button type="submit">Salvar Produto</Button>
            </div>
          </form>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[110] flex items-center justify-center p-4">
          <form onSubmit={handleUserSave} className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 bg-gray-50 border-b font-bold flex justify-between">
              {editingUser.id ? 'Editar Usuário' : 'Novo Usuário'}
              <button type="button" onClick={() => setShowUserModal(false)}><X/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Nome Completo</label>
                <input required className="w-full p-2 border rounded" value={editingUser.name || ''} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
                <input required type="email" className="w-full p-2 border rounded" value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} />
              </div>
              {!editingUser.id && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Senha</label>
                  <input required type="password" className="w-full p-2 border rounded" value={editingUser.password || ''} onChange={e => setEditingUser({...editingUser, password: e.target.value})} />
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Cargo</label>
                <select className="w-full p-2 border rounded" value={editingUser.role || ''} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}>
                  <option value="">Selecione...</option>
                  <option value={UserRole.REPRESENTATIVE}>Representante</option>
                  <option value={UserRole.SUPERVISOR}>Supervisor</option>
                  <option value={UserRole.ADMIN}>Administrador</option>
                </select>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setShowUserModal(false)}>Cancelar</Button>
              <Button type="submit">Salvar Usuário</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};