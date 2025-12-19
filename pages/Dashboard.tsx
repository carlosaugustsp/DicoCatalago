
import React, { useState, useEffect } from 'react';
import { User, UserRole, Order, Product, OrderStatus, CRMInteraction, CartItem } from '../types';
import { orderService, productService, userService } from '../services/api';
import { Button } from '../components/Button';
import { Plus, Trash2, Edit2, X, Eye, AlertCircle, Package, MessageSquare } from 'lucide-react';

interface DashboardProps { user: User; }

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'users'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [usersData, setUsersData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const canManageProducts = user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR;
  const canManageUsers = user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR;

  useEffect(() => { loadData(); }, [user, activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'orders') {
        const data = (user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR) 
          ? await orderService.getAll() 
          : await orderService.getByRep(user.id);
        setOrders(data);
      }
      if (activeTab === 'products' && canManageProducts) setProducts(await productService.getAll());
      if (activeTab === 'users' && canManageUsers) setUsersData(await userService.getAll());
    } catch (e: any) {
      setError("Erro ao carregar dados: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingProduct.id) await productService.update(editingProduct);
      else await productService.create(editingProduct);
      setShowProductModal(false);
      loadData();
    } catch (e: any) { setError(e.message); }
  };

  const handleProductDelete = async (id: string) => {
    if (!confirm('Excluir produto?')) return;
    setError(null);
    try {
      await productService.delete(id);
      loadData();
    } catch (e: any) { setError(e.message); }
  };

  const handleUserSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingUser.id) await userService.update(editingUser);
      else await userService.create(editingUser);
      setShowUserModal(false);
      loadData();
    } catch (e: any) { setError(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Painel</h2>
        <div className="flex bg-gray-200 p-1 rounded-lg">
          <button onClick={() => setActiveTab('orders')} className={`px-4 py-1.5 rounded-md text-sm ${activeTab === 'orders' ? 'bg-white shadow' : ''}`}>Pedidos</button>
          {canManageProducts && <button onClick={() => setActiveTab('products')} className={`px-4 py-1.5 rounded-md text-sm ${activeTab === 'products' ? 'bg-white shadow' : ''}`}>Produtos</button>}
          {canManageUsers && <button onClick={() => setActiveTab('users')} className={`px-4 py-1.5 rounded-md text-sm ${activeTab === 'users' ? 'bg-white shadow' : ''}`}>Usuários</button>}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded border border-red-200 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {loading ? <div className="loader"></div> : (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          {activeTab === 'products' && (
            <div>
              <div className="p-4 bg-gray-50 border-b flex justify-between">
                <h3 className="font-bold">Gerenciar Produtos</h3>
                <Button size="sm" onClick={() => { setEditingProduct({}); setShowProductModal(true); }}>Novo</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr><th className="p-3">Código</th><th className="p-3">Descrição</th><th className="p-3">Ações</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {products.map(p => (
                      <tr key={p.id}><td className="p-3 font-bold">{p.code}</td><td className="p-3">{p.description}</td>
                        <td className="p-3 flex gap-2">
                          <button onClick={() => { setEditingProduct(p); setShowProductModal(true); }} className="text-blue-600"><Edit2 className="h-4 w-4"/></button>
                          <button onClick={() => handleProductDelete(p.id)} className="text-red-600"><Trash2 className="h-4 w-4"/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab === 'orders' && (
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                   <thead className="bg-gray-50 border-b">
                      <tr><th className="p-3">Cliente</th><th className="p-3">Status</th><th className="p-3">Ações</th></tr>
                   </thead>
                   <tbody className="divide-y">
                      {orders.map(o => (
                        <tr key={o.id}><td className="p-3">{o.customerName}</td><td className="p-3">{o.status}</td>
                           <td className="p-3"><button onClick={() => setSelectedOrder(o)} className="text-blue-600"><Eye className="h-4 w-4"/></button></td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          )}
        </div>
      )}

      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleProductSave} className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">{editingProduct.id ? 'Editar' : 'Novo'} Produto</h3>
            <div className="space-y-4">
              <input required className="w-full border p-2 rounded" placeholder="Código" value={editingProduct.code || ''} onChange={e => setEditingProduct({...editingProduct, code: e.target.value})} />
              <input required className="w-full border p-2 rounded" placeholder="Descrição" value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} />
              <input className="w-full border p-2 rounded" placeholder="Categoria" value={editingProduct.category || ''} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setShowProductModal(false)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
