
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
  
  // States
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [editingProduct, setEditingProduct] = useState<(Partial<Omit<Product, 'colors'>> & { colors?: string | string[] }) | null>(null);
  const [editingUser, setEditingUser] = useState<Partial<User> & { password?: string } | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Permissions - explicitly checking SUPERVISOR
  const canManageProducts = user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR;
  const canManageUsers = user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR;

  useEffect(() => {
    loadData();
  }, [user, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'orders') {
        const data = (user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR) 
          ? await orderService.getAll() 
          : await orderService.getByRep(user.id);
        setOrders(data);
      } else if (activeTab === 'products' && canManageProducts) {
        const data = await productService.getAll();
        setProducts(data);
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
    
    if (user.role === UserRole.SUPERVISOR && editingUser.role === UserRole.ADMIN) {
      alert("Acesso Negado: Supervisores não podem criar Administradores.");
      return;
    }

    if (editingUser.id) await userService.update(editingUser as User);
    else await userService.create(editingUser);
    
    setEditingUser(null);
    loadData();
  };

  const renderCRMBoard = () => (
    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-250px)] items-start">
      {Object.values(OrderStatus).map(status => (
        <div key={status} className="min-w-[280px] bg-gray-100 rounded-lg flex flex-col max-h-full">
          <div className="p-3 font-bold text-gray-700 bg-gray-200 rounded-t-lg flex justify-between">
            <span className="text-xs uppercase">{status}</span>
            <span className="bg-white px-2 rounded-full text-xs">{orders.filter(o => o.status === status).length}</span>
          </div>
          <div className="p-2 space-y-2 overflow-y-auto">
            {orders.filter(o => o.status === status).map(order => (
              <div key={order.id} className="bg-white p-3 rounded shadow-sm border border-gray-200 cursor-pointer hover:border-blue-300" onClick={() => setSelectedOrder(order)}>
                <p className="text-[10px] text-blue-600 font-bold">#{order.id.slice(0,8)}</p>
                <p className="text-sm font-bold text-gray-800 truncate">{order.customerName}</p>
                <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderProductList = () => (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="p-4 border-b flex justify-between items-center bg-gray-50">
        <h3 className="font-bold flex items-center gap-2"><Package className="h-4 w-4"/> Gestão de Catálogo</h3>
        <Button onClick={() => setEditingProduct({ colors: [], category: 'Geral' })} size="sm">
          <Plus className="h-4 w-4 mr-1"/> Novo Produto
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Produto</th>
              <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Categoria</th>
              <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={p.imageUrl} className="h-10 w-10 object-cover rounded border" alt=""/>
                    <div>
                      <div className="text-sm font-bold">{p.description}</div>
                      <div className="text-xs text-gray-500">{p.code}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{p.category}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => setEditingProduct(p)} className="text-blue-600 hover:underline text-xs font-bold mr-4">Editar</button>
                  <button onClick={async () => { if(confirm('Excluir?')) { await productService.delete(p.id); loadData(); } }} className="text-red-600 hover:underline text-xs font-bold">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderUserList = () => (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="p-4 border-b flex justify-between items-center bg-gray-50">
        <h3 className="font-bold flex items-center gap-2"><Users className="h-4 w-4"/> Gestão de Equipe</h3>
        <Button onClick={() => setEditingUser({ role: UserRole.REPRESENTATIVE })} size="sm">
          <Plus className="h-4 w-4 mr-1"/> Adicionar Usuário
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Nome</th>
              <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Cargo</th>
              <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-bold">{u.name}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : u.role === UserRole.SUPERVISOR ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {(user.role === UserRole.ADMIN || (user.role === UserRole.SUPERVISOR && u.role !== UserRole.ADMIN)) && (
                    <button onClick={async () => { if(confirm('Excluir usuário?')) { await userService.delete(u.id); loadData(); } }} className="text-red-600 hover:underline text-xs font-bold">Excluir</button>
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
      <div className="flex space-x-2 border-b overflow-x-auto">
        <button onClick={() => setActiveTab('orders')} className={`py-3 px-6 text-xs font-bold whitespace-nowrap ${activeTab === 'orders' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-400'}`}>CRM PEDIDOS</button>
        {canManageProducts && <button onClick={() => setActiveTab('products')} className={`py-3 px-6 text-xs font-bold whitespace-nowrap ${activeTab === 'products' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-400'}`}>CATÁLOGO / PRODUTOS</button>}
        {canManageUsers && <button onClick={() => setActiveTab('users')} className={`py-3 px-6 text-xs font-bold whitespace-nowrap ${activeTab === 'users' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-400'}`}>EQUIPE / USUÁRIOS</button>}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 text-gray-400">
           <div className="loader mb-4"></div>
           <p>Sincronizando dados...</p>
        </div>
      ) : (
        <>
          {activeTab === 'orders' && renderCRMBoard()}
          {activeTab === 'products' && renderProductList()}
          {activeTab === 'users' && renderUserList()}
        </>
      )}

      {/* Modal Produto */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <form onSubmit={handleProductSave} className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold">Cadastro de Produto</h3>
              <button type="button" onClick={() => setEditingProduct(null)}><X className="h-5 w-5"/></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">CÓDIGO</label>
                <input className="w-full border p-2 rounded bg-gray-50 focus:ring-blue-500" placeholder="Ex: TOM-001" value={editingProduct.code || ''} onChange={e => setEditingProduct({...editingProduct, code: e.target.value})} required />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">DESCRIÇÃO</label>
                <input className="w-full border p-2 rounded bg-gray-50 focus:ring-blue-500" placeholder="Ex: Tomada 10A Branca" value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} required />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">CATEGORIA</label>
                <input className="w-full border p-2 rounded bg-gray-50 focus:ring-blue-500" placeholder="Ex: Tomadas" value={editingProduct.category || ''} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} required />
              </div>
            </div>
            <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t">
              <Button type="button" variant="secondary" onClick={() => setEditingProduct(null)}>Cancelar</Button>
              <Button type="submit">Salvar Produto</Button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Usuário */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <form onSubmit={handleUserSave} className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold">Novo Usuário</h3>
              <button type="button" onClick={() => setEditingUser(null)}><X className="h-5 w-5"/></button>
            </div>
            <div className="p-6 space-y-4">
              <input className="w-full border p-2 rounded bg-gray-50" placeholder="Nome Completo" value={editingUser.name || ''} onChange={e => setEditingUser({...editingUser, name: e.target.value})} required />
              <input className="w-full border p-2 rounded bg-gray-50" type="email" placeholder="Email" value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} required />
              {!editingUser.id && (
                <input className="w-full border p-2 rounded bg-gray-50" type="password" placeholder="Senha Temporária" value={editingUser.password || ''} onChange={e => setEditingUser({...editingUser, password: e.target.value})} required />
              )}
              <select className="w-full border p-2 rounded bg-gray-50" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}>
                <option value={UserRole.REPRESENTATIVE}>Representante</option>
                <option value={UserRole.SUPERVISOR}>Supervisor</option>
                {user.role === UserRole.ADMIN && <option value={UserRole.ADMIN}>Administrador</option>}
              </select>
            </div>
            <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t">
              <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>Cancelar</Button>
              <Button type="submit">Cadastrar</Button>
            </div>
          </form>
        </div>
      )}

      {/* CRM Detail View */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold">Pedido #{selectedOrder.id.slice(0,8)}</h3>
              <button type="button" onClick={() => setSelectedOrder(null)}><X className="h-6 w-6"/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Cliente</p>
                  <p className="font-bold">{selectedOrder.customerName}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Status</p>
                  <select className="text-sm font-bold bg-white border rounded p-1" value={selectedOrder.status} onChange={async (e) => {
                    const upd = { ...selectedOrder, status: e.target.value as OrderStatus };
                    await orderService.update(upd);
                    setSelectedOrder(upd);
                    loadData();
                  }}>
                    {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="border rounded p-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Itens</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((it, i) => (
                    <div key={i} className="flex justify-between text-sm py-2 border-b last:border-0">
                      <span>{it.description}</span>
                      <span className="font-bold">x{it.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <Button onClick={() => setSelectedOrder(null)}>Fechar Detalhes</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
