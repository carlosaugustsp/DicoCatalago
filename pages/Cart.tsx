
import React, { useState, useEffect } from 'react';
import { CartItem, User, OrderStatus } from '../types';
import { userService, orderService } from '../services/api';
import { Trash2, Send, Download, Printer, ArrowLeft, Package, User as UserIcon, Building, Phone, Mail, CheckCircle, X } from 'lucide-react';
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
  const [customerEmail, setCustomerEmail] = useState('');
  const [resellerName, setResellerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [notes, setNotes] = useState('');
  
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadReps();
  }, []);

  const loadReps = async () => {
    const data = await userService.getReps();
    setReps(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRep || items.length === 0) return;
    
    // Garantir que os campos sejam strings puras
    const safeReseller = String(resellerName || '').trim();
    const safeNotes = String(notes || '').trim();
    const finalNotes = safeReseller ? `[Revenda: ${safeReseller}] ${safeNotes}` : safeNotes;
    
    try {
      await orderService.create({
        representativeId: selectedRep,
        items: items,
        customerName: String(customerName || 'Cliente Anônimo').trim(),
        customerEmail: String(customerEmail || '').trim(),
        customerContact: String(customerContact || '').trim(),
        notes: finalNotes
      });
      setSubmitted(true);
      clearCart();
    } catch (err) {
      console.error("Erro ao enviar pedido:", err);
      alert("Erro ao enviar pedido para o representante. Verifique sua conexão.");
    }
  };

  const darkInputStyle = "w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all shadow-sm";

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-4">
        <div className="bg-green-100 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pedido Enviado!</h2>
        <p className="text-gray-600 mb-8">Seu orçamento foi encaminhado ao representante escolhido.</p>
        <Button onClick={() => navigate('catalog')}>Voltar ao Catálogo</Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-dashed p-10">
        <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-400">Seu carrinho está vazio</h2>
        <p className="text-slate-400 mb-8">Escolha produtos no catálogo para gerar sua cotação.</p>
        <Button onClick={() => navigate('catalog')}>Ir para o Catálogo</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('catalog')} className="flex items-center text-slate-500 hover:text-blue-600 font-bold transition-colors">
          <ArrowLeft className="h-5 w-5 mr-2" /> Continuar Comprando
        </button>
        <h2 className="text-2xl font-bold text-slate-900">Carrinho de Orçamento</h2>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {items.map(item => (
            <div key={item.id} className="p-6 flex flex-col sm:flex-row items-center gap-6">
              <img src={item.imageUrl} alt={item.code} className="w-20 h-20 object-cover rounded border" />
              <div className="flex-grow text-center sm:text-left">
                <h4 className="font-bold text-slate-900">{item.description}</h4>
                <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Ref: {item.reference} | Cod: {item.code}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                  <button className="px-3 py-1 hover:bg-slate-200" onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}>-</button>
                  <input type="number" min="1" className="w-12 text-center bg-white font-bold text-sm" value={item.quantity} onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)} />
                  <button className="px-3 py-1 hover:bg-slate-200" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                </div>
                <button onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="h-5 w-5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-xl p-8 border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
           <UserIcon className="h-5 w-5 text-blue-600"/> Dados para Contato
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Seu Nome / Responsável</label>
            <input required type="text" className={darkInputStyle} value={customerName} onChange={e => setCustomerName(e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Nome da Revenda</label>
            <input type="text" className={darkInputStyle} value={resellerName} onChange={e => setResellerName(e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">E-mail</label>
            <input required type="email" className={darkInputStyle} value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Telefone</label>
            <input required type="text" className={darkInputStyle} value={customerContact} onChange={e => setCustomerContact(e.target.value)} />
          </div>
        </div>
        <div className="mb-6">
           <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Selecione seu Representante</label>
           <select required className={darkInputStyle} value={selectedRep} onChange={e => setSelectedRep(e.target.value)}>
             <option value="" className="bg-slate-800">-- Escolha --</option>
             {reps.map(rep => <option key={rep.id} value={rep.id} className="bg-slate-800">{rep.name}</option>)}
           </select>
        </div>
        <div className="mb-8">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Observações</label>
          <textarea 
            className={darkInputStyle} 
            rows={3} 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)} 
            placeholder="Alguma informação adicional sobre seu pedido?"
          />
        </div>
        <Button type="submit" size="lg" className="w-full h-14 font-bold">ENVIAR ORÇAMENTO</Button>
      </form>
    </div>
  );
};
