import React, { useState, useEffect } from 'react';
import { CartItem, User, OrderStatus } from '../types';
import { userService, orderService } from '../services/api';
import { Trash2, Send, Download, Printer, ArrowLeft } from 'lucide-react';
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

  const handleDownloadCsv = () => {
    const headers = "Código,Descrição,Referência,Cor,Quantidade,Observações\n";
    const rows = items.map(item => 
      `${item.code},"${item.description}",${item.reference},"${item.colors.join('|')}",${item.quantity},""`
    ).join("\n");
    
    const csvContent = "data:text/csv;charset=utf-8," + encodeURI(headers + rows);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "pedido_dicompel.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRep || items.length === 0) return;

    await orderService.create({
      representativeId: selectedRep,
      items: items,
      customerName: customerName || 'Cliente Anônimo',
      customerContact: customerContact,
      notes: notes
    });

    setSubmitted(true);
    clearCart();
  };

  const darkInputStyle = "w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white placeholder-gray-400 focus:ring-blue-500 focus:outline-none focus:border-blue-500";

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 px-4">
        <div className="bg-green-100 rounded-full h-24 w-24 flex items-center justify-center mx-auto mb-6">
          <Send className="h-12 w-12 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Pedido Enviado com Sucesso!</h2>
        <p className="text-lg text-gray-600 mb-8">
          O representante selecionado recebeu seu pedido e entrará em contato em breve para dar andamento.
        </p>
        <Button onClick={() => { setSubmitted(false); navigate('catalog'); }}>
          Voltar ao Catálogo
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-gray-700 mb-4">Seu carrinho está vazio</h2>
        <p className="text-gray-500 mb-8">Adicione produtos do catálogo para gerar um pedido.</p>
        <Button onClick={() => navigate('catalog')}>Ir para o Catálogo</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between no-print">
        <button onClick={() => navigate('catalog')} className="flex items-center text-gray-600 hover:text-blue-600">
          <ArrowLeft className="h-4 w-4 mr-2" /> Continuar Comprando
        </button>
        <h2 className="text-2xl font-bold text-gray-900">Carrinho de Orçamento</h2>
      </div>

      {/* Cart List */}
      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <div className="p-6 space-y-6">
          {items.map(item => (
            <div key={item.id} className="flex flex-col sm:flex-row items-center gap-4 py-4 border-b border-gray-100 last:border-0">
              <img src={item.imageUrl} alt={item.code} className="w-20 h-20 object-cover rounded-md bg-gray-100" />
              
              <div className="flex-grow text-center sm:text-left">
                <h4 className="font-medium text-gray-900">{item.description}</h4>
                <div className="text-sm text-gray-500 space-x-2">
                  <span>Ref: {item.reference}</span>
                  <span>•</span>
                  <span>{item.code}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center border border-gray-600 rounded-md bg-gray-700 overflow-hidden">
                  <button 
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white border-r border-gray-500 no-print"
                    onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                  >-</button>
                  <input 
                    type="number" 
                    min="1"
                    className="w-16 text-center focus:outline-none p-1 bg-gray-700 text-white"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                  />
                  <button 
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white border-l border-gray-500 no-print"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >+</button>
                </div>
                
                <button 
                  onClick={() => removeItem(item.id)}
                  className="text-red-500 hover:text-red-700 p-2 no-print"
                  title="Remover"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center no-print">
          <span className="text-gray-600 font-medium">Total de Itens: {items.reduce((acc, i) => acc + i.quantity, 0)}</span>
          <div className="flex space-x-3">
             <Button variant="outline" size="sm" onClick={handleDownloadCsv}>
                <Download className="h-4 w-4 mr-2" /> Excel/CSV
             </Button>
             <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" /> Imprimir
             </Button>
          </div>
        </div>
      </div>

      {/* Submission Form */}
      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 border border-gray-200 no-print">
        <h3 className="text-lg font-bold mb-4 border-b pb-2">Finalizar Envio</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seu Nome / Razão Social</label>
            <input 
              required
              type="text" 
              className={darkInputStyle}
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Ex: Elétrica Silva"
            />
          </div>
           <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contato (Tel/Email)</label>
            <input 
              required
              type="text" 
              className={darkInputStyle}
              value={customerContact}
              onChange={e => setCustomerContact(e.target.value)}
              placeholder="Ex: (11) 99999-9999"
            />
          </div>
        </div>

        <div className="mb-6">
           <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o Representante</label>
           <select
            required
            className={darkInputStyle}
            value={selectedRep}
            onChange={e => setSelectedRep(e.target.value)}
           >
             <option value="">-- Escolha um Representante --</option>
             {reps.map(rep => (
               <option key={rep.id} value={rep.id}>{rep.name}</option>
             ))}
           </select>
           <p className="text-xs text-gray-500 mt-1">O pedido será enviado para este representante.</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Observações (Opcional)</label>
          <textarea
            className={darkInputStyle}
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Ex: Melhor horário de entrega..."
          />
        </div>

        <Button type="submit" size="lg" className="w-full md:w-auto">
          Enviar Pedido ao Representante
        </Button>
      </form>
    </div>
  );
};