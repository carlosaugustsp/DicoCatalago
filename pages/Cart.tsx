import React, { useState, useEffect } from 'react';
import { CartItem, User, OrderStatus } from '../types';
import { userService, orderService } from '../services/api';
import { Trash2, Send, Download, Printer, ArrowLeft, Package } from 'lucide-react';
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
  
  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [resellerName, setResellerName] = useState(''); // New Field
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
    const headers = "Código,Descrição,Referência,Cor,Quantidade,Revenda,Observações\n";
    const rows = items.map(item => 
      `${item.code},"${item.description}",${item.reference},"${item.colors.join('|')}",${item.quantity},"${resellerName}",""`
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

    // Concatena a Revenda nas observações para persistir sem mudar o DB
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

  // Se o carrinho estiver vazio E não estivermos imprimindo (pois pode ser uma reimpressão futura, mas aqui é logica de tela)
  if (items.length === 0) {
    return (
      <div className="text-center py-16 print:hidden">
        <h2 className="text-2xl font-bold text-gray-700 mb-4">Seu carrinho está vazio</h2>
        <p className="text-gray-500 mb-8">Adicione produtos do catálogo para gerar um pedido.</p>
        <Button onClick={() => navigate('catalog')}>Ir para o Catálogo</Button>
      </div>
    );
  }

  const selectedRepName = reps.find(r => r.id === selectedRep)?.name || 'Não selecionado';

  return (
    <>
      {/* --- LAYOUT DE TELA (Escondido na impressão) --- */}
      <div className="max-w-4xl mx-auto space-y-8 print:hidden">
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
                  <Printer className="h-4 w-4 mr-2" /> Imprimir / PDF
               </Button>
            </div>
          </div>
        </div>

        {/* Submission Form */}
        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 border border-gray-200 no-print">
          <h3 className="text-lg font-bold mb-4 border-b pb-2">Finalizar Envio</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seu Nome / Responsável</label>
              <input 
                required
                type="text" 
                className={darkInputStyle}
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Ex: João Silva"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Revenda</label>
              <input 
                type="text" 
                className={darkInputStyle}
                value={resellerName}
                onChange={e => setResellerName(e.target.value)}
                placeholder="Ex: Elétrica Central Ltda"
              />
            </div>
             <div className="md:col-span-2">
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

      {/* --- LAYOUT DE IMPRESSÃO (Visível apenas na impressão) --- */}
      <div className="hidden print:block bg-white text-black p-4">
        {/* Header Impressão */}
        <div className="flex justify-between items-center border-b-2 border-slate-800 pb-4 mb-6">
           <div className="flex items-center">
              <Package className="h-10 w-10 text-slate-900 mr-3" />
              <div>
                <h1 className="text-2xl font-bold tracking-wider text-slate-900">DICOMPEL</h1>
                <p className="text-sm text-slate-600">Catálogo Digital & Pedidos</p>
              </div>
           </div>
           <div className="text-right">
              <h2 className="text-xl font-bold uppercase text-slate-700">Pedido de Orçamento</h2>
              <p className="text-sm text-gray-500">{new Date().toLocaleDateString()}</p>
           </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-8 mb-8">
           <div className="border p-4 rounded bg-gray-50">
              <h3 className="text-xs font-bold uppercase text-gray-500 mb-2 border-b pb-1">Dados do Cliente</h3>
              <div className="space-y-1 text-sm">
                 <p><span className="font-semibold">Responsável:</span> {customerName || '________________________'}</p>
                 <p><span className="font-semibold">Revenda:</span> {resellerName || '________________________'}</p>
                 <p><span className="font-semibold">Contato:</span> {customerContact || '________________________'}</p>
              </div>
           </div>
           <div className="border p-4 rounded bg-gray-50">
              <h3 className="text-xs font-bold uppercase text-gray-500 mb-2 border-b pb-1">Detalhes do Envio</h3>
              <div className="space-y-1 text-sm">
                 <p><span className="font-semibold">Representante:</span> {selectedRepName}</p>
                 <p><span className="font-semibold">Itens:</span> {items.reduce((acc, i) => acc + i.quantity, 0)} volumes</p>
                 <p><span className="font-semibold">Obs:</span> {notes || 'Sem observações'}</p>
              </div>
           </div>
        </div>

        {/* Tabela de Itens */}
        <div className="mb-8">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-300">
                <th className="text-left py-2 px-3 font-bold text-slate-700">Código</th>
                <th className="text-left py-2 px-3 font-bold text-slate-700">Descrição</th>
                <th className="text-left py-2 px-3 font-bold text-slate-700">Referência</th>
                <th className="text-left py-2 px-3 font-bold text-slate-700">Cor(es)</th>
                <th className="text-center py-2 px-3 font-bold text-slate-700 w-24">Qtd.</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b border-gray-200 even:bg-gray-50">
                  <td className="py-3 px-3">{item.code}</td>
                  <td className="py-3 px-3">
                     <div className="font-medium">{item.description}</div>
                     <div className="text-xs text-gray-500">{item.category} - {item.line}</div>
                  </td>
                  <td className="py-3 px-3 text-gray-600">{item.reference}</td>
                  <td className="py-3 px-3 text-gray-600 text-xs max-w-[150px]">{item.colors.join(', ')}</td>
                  <td className="py-3 px-3 text-center font-bold bg-slate-50">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Impressão */}
        <div className="mt-12 pt-4 border-t-2 border-gray-300 flex flex-col items-center text-center text-gray-500 text-xs">
           <p className="mb-8 w-full max-w-md border-b border-black pb-1">Assinatura do Responsável</p>
           <p>Este documento não possui valor fiscal. Gerado automaticamente pelo Sistema Dicompel.</p>
           <p>www.dicompel.com.br</p>
        </div>
      </div>
    </>
  );
};