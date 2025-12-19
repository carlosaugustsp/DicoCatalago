import React, { useState, useEffect } from 'react';
import { CartItem, User, OrderStatus } from '../types';
import { userService, orderService } from '../services/api';
import { Trash2, Send, Download, Printer, ArrowLeft, Package, User as UserIcon, Building, Phone, Calendar } from 'lucide-react';
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
      <div className="hidden print:block print-layout bg-white text-black p-8">
        
        {/* Header Moderno */}
        <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-8">
           <div className="flex items-center">
              <div className="bg-slate-900 text-white p-3 rounded-lg mr-4">
                <Package className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-4xl font-extrabold tracking-wider text-slate-900">DICOMPEL</h1>
                <p className="text-sm font-medium text-slate-600 uppercase tracking-widest mt-1">Catálogo Digital</p>
              </div>
           </div>
           <div className="text-right">
              <div className="bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">
                <h2 className="text-xl font-bold uppercase text-slate-800">Pedido de Orçamento</h2>
                <div className="flex items-center justify-end text-slate-600 mt-1">
                   <Calendar className="h-4 w-4 mr-2" />
                   <p className="text-sm font-medium">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
           </div>
        </div>

        {/* Info Box - Cliente e Revenda */}
        <div className="bg-gray-100 rounded-xl p-6 mb-8 border border-gray-200">
           <div className="grid grid-cols-2 gap-y-6 gap-x-12">
              
              {/* Cliente */}
              <div>
                 <div className="flex items-center text-slate-500 mb-1 text-xs font-bold uppercase tracking-wider">
                    <UserIcon className="h-3 w-3 mr-1" />
                    Cliente / Responsável
                 </div>
                 <div className="text-xl font-bold text-black border-b border-gray-300 pb-1">
                    {customerName || <span className="text-gray-400 text-base font-normal italic">Não informado</span>}
                 </div>
              </div>

              {/* Revenda */}
              <div>
                 <div className="flex items-center text-slate-500 mb-1 text-xs font-bold uppercase tracking-wider">
                    <Building className="h-3 w-3 mr-1" />
                    Revenda
                 </div>
                 <div className="text-xl font-bold text-black border-b border-gray-300 pb-1">
                    {resellerName || <span className="text-gray-400 text-base font-normal italic">Não informado</span>}
                 </div>
              </div>

              {/* Contato */}
              <div>
                 <div className="flex items-center text-slate-500 mb-1 text-xs font-bold uppercase tracking-wider">
                    <Phone className="h-3 w-3 mr-1" />
                    Contato
                 </div>
                 <div className="text-lg font-medium text-black">
                    {customerContact || <span className="text-gray-400 font-normal italic">Não informado</span>}
                 </div>
              </div>

               {/* Representante */}
               <div>
                 <div className="flex items-center text-slate-500 mb-1 text-xs font-bold uppercase tracking-wider">
                    <UserIcon className="h-3 w-3 mr-1" />
                    Representante Selecionado
                 </div>
                 <div className="text-lg font-medium text-black">
                    {selectedRepName}
                 </div>
              </div>

           </div>
        </div>

        {/* Observações (se houver) */}
        {notes && (
          <div className="mb-8 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
             <h3 className="text-xs font-bold uppercase text-yellow-700 mb-1">Observações</h3>
             <p className="text-sm text-black">{notes}</p>
          </div>
        )}

        {/* Tabela de Itens */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center">
            <Package className="h-5 w-5 mr-2" /> 
            Itens do Pedido 
            <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {items.reduce((acc, i) => acc + i.quantity, 0)} volumes
            </span>
          </h3>
          
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="text-left py-3 px-4 font-semibold text-sm rounded-tl-lg">Código</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Descrição / Categoria</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Referência</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Cores</th>
                <th className="text-center py-3 px-4 font-semibold text-sm rounded-tr-lg w-24">Qtd.</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="py-3 px-4 text-sm font-bold text-black">{item.code}</td>
                  <td className="py-3 px-4">
                     <div className="text-sm font-bold text-black">{item.description}</div>
                     <div className="text-xs text-slate-600 mt-0.5">{item.category} • {item.line}</div>
                  </td>
                  <td className="py-3 px-4 text-sm text-black">{item.reference}</td>
                  <td className="py-3 px-4 text-xs text-black max-w-[150px]">{item.colors.join(', ')}</td>
                  <td className="py-3 px-4 text-center font-bold text-black text-base">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
               <tr>
                 <td colSpan={5} className="pt-2">
                    <div className="w-full h-1 bg-slate-900 rounded-full"></div>
                 </td>
               </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer Impressão */}
        <div className="mt-auto">
           <div className="flex justify-between items-end pt-12 pb-6">
              <div className="text-xs text-gray-500">
                 <p className="font-bold text-slate-900 mb-1">Dicompel Indústria</p>
                 <p>www.dicompel.com.br</p>
                 <p>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
              </div>
              <div className="text-center w-64">
                 <div className="border-b border-black mb-2 h-1"></div>
                 <p className="text-xs font-bold text-black uppercase">Assinatura do Responsável</p>
              </div>
           </div>
           <div className="bg-slate-100 text-slate-500 text-[10px] text-center p-2 rounded">
              Este documento não possui valor fiscal. Gerado automaticamente pelo Sistema Dicompel.
           </div>
        </div>

      </div>
    </>
  );
};