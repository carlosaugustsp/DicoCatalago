
import React, { useState, useEffect } from 'react';
import { CartItem, User, OrderStatus } from '../types';
import { userService, orderService } from '../services/api';
import { Trash2, Send, Download, Printer, ArrowLeft, Package, User as UserIcon, Building, Phone, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '../components/Button';

interface CartProps {
  items: CartItem[];
  updateQuantity: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  navigate: (page: string) => void;
}

export const Cart: React.FC<CartProps> = ({ items, updateQuantity, removeItem, clearCart, navigate }) => {
  const [reps, setReps] = useState<User[]>([]);
  const [selectedRep, setSelectedRep] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [resellerName, setResellerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { loadReps(); }, []);

  const loadReps = async () => { const data = await userService.getReps(); setReps(data); };

  const handleDownloadCsv = () => {
    const headers = "Código,Descrição,Referência,Quantidade,Revenda\n";
    const rows = items.map(item => `${item.code},"${item.description}",${item.reference},${item.quantity},"${resellerName}"`).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + encodeURI(headers + rows);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "pedido.csv");
    link.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRep || items.length === 0) return;
    
    setError(null);
    setIsSubmitting(true);
    
    try {
      const finalNotes = `[Revenda: ${resellerName}] ${notes}`;
      await orderService.create({
        representativeId: selectedRep,
        items: items,
        customerName: customerName || 'Cliente Anônimo',
        customerContact: customerContact,
        notes: finalNotes
      });
      setSubmitted(true);
      clearCart();
    } catch (err: any) {
      setError(err.message || "Erro inesperado ao enviar pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 px-4">
        <div className="bg-green-100 rounded-full h-24 w-24 flex items-center justify-center mx-auto mb-6">
          <Send className="h-12 w-12 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Pedido Enviado!</h2>
        <p className="text-lg text-gray-600 mb-8">O representante foi notificado.</p>
        <Button onClick={() => navigate('catalog')}>Voltar ao Catálogo</Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-gray-700 mb-4">Seu carrinho está vazio</h2>
        <Button onClick={() => navigate('catalog')}>Ir para o Catálogo</Button>
      </div>
    );
  }

  const selectedRepName = reps.find(r => r.id === selectedRep)?.name || 'Não selecionado';

  return (
    <div className="max-w-4xl mx-auto space-y-8 print:hidden">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('catalog')} className="flex items-center text-gray-600 hover:text-blue-600">
          <ArrowLeft className="h-4 w-4 mr-2" /> Continuar Comprando
        </button>
        <h2 className="text-2xl font-bold text-gray-900">Carrinho</h2>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border">
        <div className="p-6 space-y-6">
          {items.map(item => (
            <div key={item.id} className="flex flex-col sm:flex-row items-center gap-4 py-4 border-b last:border-0">
              <img src={item.imageUrl} alt={item.code} className="w-16 h-16 object-cover rounded bg-gray-100" />
              <div className="flex-grow text-center sm:text-left">
                <h4 className="font-medium text-gray-900">{item.description}</h4>
                <div className="text-xs text-gray-500">Ref: {item.reference} | {item.code}</div>
              </div>
              <div className="flex items-center gap-4">
                <input 
                  type="number" min="1" className="w-16 text-center border rounded p-1" 
                  value={item.quantity} onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                />
                <button onClick={() => removeItem(item.id)} className="text-red-500"><Trash2 className="h-5 w-5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 border">
        <h3 className="text-lg font-bold mb-4 border-b pb-2">Finalizar</h3>
        {error && (
          <div className="mb-4 bg-red-50 text-red-600 p-3 rounded border border-red-200 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input required className="border p-2 rounded" placeholder="Seu Nome" value={customerName} onChange={e => setCustomerName(e.target.value)} />
          <input className="border p-2 rounded" placeholder="Nome da Revenda" value={resellerName} onChange={e => setResellerName(e.target.value)} />
          <input required className="border p-2 rounded md:col-span-2" placeholder="Contato (Whats/Email)" value={customerContact} onChange={e => setCustomerContact(e.target.value)} />
        </div>
        <div className="mb-4">
          <select required className="w-full border p-2 rounded" value={selectedRep} onChange={e => setSelectedRep(e.target.value)}>
            <option value="">-- Selecione o Representante --</option>
            {reps.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
          </select>
        </div>
        <textarea className="w-full border p-2 rounded mb-4" rows={3} placeholder="Notas adicionais..." value={notes} onChange={e => setNotes(e.target.value)} />
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando...' : 'Enviar Pedido ao Representante'}
        </Button>
      </form>
    </div>
  );
};
