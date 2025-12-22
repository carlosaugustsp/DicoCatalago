
import React, { useState, useEffect } from 'react';
import { CartItem, User, OrderStatus } from '../types';
import { userService, orderService } from '../services/api';
import { Trash2, Send, Download, Printer, ArrowLeft, Package, User as UserIcon, Building, Phone, Calendar, Mail } from 'lucide-react';
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
    const finalNotes = `[Revenda: ${resellerName}] ${notes}`;
    await orderService.create({
      representativeId: selectedRep,
      items: items,
      customerName: customerName || 'Cliente Anônimo',
      customerEmail: customerEmail,
      customerContact: customerContact,
      notes: finalNotes
    });
    setSubmitted(true);
    clearCart();
  };

  const darkInputStyle = "w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all";

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-4">
        <div className="bg-green-100 rounded-full h-24 w-24 flex items-center justify-center mx-auto mb-6">
          <Send className="h-12 w-12 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Pedido Enviado com Sucesso!</h2>
        <p className="text-lg text-gray-600 mb-8">O representante selecionado recebeu seu pedido e entrará em contato em breve.</p>
        <Button onClick={() => { setSubmitted(false); navigate('catalog'); }}>Voltar ao Catálogo</Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-24 print:hidden">
        <h2 className="text-3xl font-bold text-gray-400 mb-4">Seu carrinho está vazio</h2>
        <p className="text-gray-500 mb-10">Explore nosso catálogo e adicione itens para gerar seu orçamento.</p>
        <Button size="lg" onClick={() => navigate('catalog')}>Ir para o Catálogo</Button>
      </div>
    );
  }

  const selectedRepName = reps.find(r => r.id === selectedRep)?.name || 'Não selecionado';

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-10 print:hidden">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('catalog')} className="flex items-center text-slate-500 hover:text-blue-600 font-medium transition-colors">
            <ArrowLeft className="h-5 w-5 mr-2" /> Continuar Comprando
          </button>
          <h2 className="text-3xl font-bold text-slate-900">Carrinho de Orçamento</h2>
        </div>

        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-200">
          <div className="p-8 space-y-8">
            {items.map(item => (
              <div key={item.id} className="flex flex-col sm:flex-row items-center gap-6 py-6 border-b border-slate-100 last:border-0 group">
                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <img src={item.imageUrl} alt={item.code} className="w-24 h-24 object-cover group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="flex-grow text-center sm:text-left">
                  <h4 className="font-bold text-lg text-slate-900 mb-1">{item.description}</h4>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-3 text-sm text-slate-500">
                    <span className="bg-slate-100 px-2 py-0.5 rounded">Ref: {item.reference}</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded">Cod: {item.code}</span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center border border-slate-700 rounded-xl bg-slate-800 overflow-hidden shadow-inner">
                    <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white border-r border-slate-600" onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}>-</button>
                    <input type="number" min="1" className="w-16 text-center focus:outline-none p-2 bg-slate-800 text-white font-bold" value={item.quantity} onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)} />
                    <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white border-l border-slate-600" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-red-500 p-2 transition-colors"><Trash2 className="h-6 w-6" /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-slate-50 px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <span className="text-slate-700 font-bold text-lg">Total de Itens: {items.reduce((acc, i) => acc + i.quantity, 0)}</span>
            <div className="flex gap-4">
               <Button variant="outline" onClick={handleDownloadCsv} className="border-slate-300"><Download className="h-4 w-4 mr-2" /> Excel</Button>
               <Button variant="outline" onClick={handlePrint} className="border-slate-300"><Printer className="h-4 w-4 mr-2" /> Gerar PDF</Button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-2xl p-10 border border-slate-200">
          <h3 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
             <div className="bg-blue-600 p-2 rounded-lg text-white"><Send className="h-5 w-5"/></div>
             Informações para Contato
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nome Completo / Responsável</label>
              <input required type="text" className={darkInputStyle} value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Seu nome aqui" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nome da Revenda / Loja</label>
              <input type="text" className={darkInputStyle} value={resellerName} onChange={e => setResellerName(e.target.value)} placeholder="Nome da empresa" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">E-mail para Retorno</label>
              <input required type="email" className={darkInputStyle} value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Telefone / WhatsApp</label>
              <input required type="text" className={darkInputStyle} value={customerContact} onChange={e => setCustomerContact(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
          </div>
          <div className="mb-8">
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Selecione o Representante</label>
             <select required className={darkInputStyle} value={selectedRep} onChange={e => setSelectedRep(e.target.value)}>
               <option value="" className="bg-slate-800 text-white">-- Escolha quem te atende --</option>
               {reps.map(rep => <option key={rep.id} value={rep.id} className="bg-slate-800 text-white">{rep.name}</option>)}
             </select>
          </div>
          <div className="mb-10">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Observações Adicionais</label>
            <textarea className={darkInputStyle} rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex: Detalhes de entrega, dúvidas, etc." />
          </div>
          <Button type="submit" size="lg" className="w-full h-14 text-lg shadow-lg shadow-blue-200">Enviar Pedido para Análise</Button>
        </form>
      </div>

      <div className="hidden print:block print-layout bg-white text-black min-h-screen">
        <div className="flex justify-between items-center border-b-8 border-slate-900 pb-8 mb-10">
           <div className="flex items-center">
              <div className="bg-slate-900 text-white p-4 rounded-2xl mr-6">
                <Package className="h-12 w-12" />
              </div>
              <div>
                <h1 className="text-5xl font-black tracking-tighter text-slate-900">DICOMPEL</h1>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">Catálogo Industrial</p>
              </div>
           </div>
           <div className="text-right">
              <div className="bg-slate-50 px-6 py-4 rounded-2xl border border-slate-200">
                <h2 className="text-2xl font-black uppercase text-slate-800 mb-1">Cotação Digital</h2>
                <div className="flex items-center justify-end text-slate-500 font-bold">
                   <Calendar className="h-4 w-4 mr-2" />
                   <p className="text-sm">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-10">
           <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 border-b pb-2">Dados do Cliente</h3>
              <div className="space-y-6">
                 <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Solicitante</p>
                    <p className="text-xl font-black text-slate-900">{customerName || '-'}</p>
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Revenda</p>
                    <p className="text-xl font-black text-slate-900">{resellerName || '-'}</p>
                 </div>
              </div>
           </div>
           <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 border-b pb-2">Contato & Atendimento</h3>
              <div className="space-y-6">
                 <div className="flex gap-8">
                    <div className="flex-1">
                       <p className="text-[10px] font-bold text-slate-400 uppercase">E-mail</p>
                       <p className="text-sm font-bold text-slate-900">{customerEmail || '-'}</p>
                    </div>
                    <div className="flex-1">
                       <p className="text-[10px] font-bold text-slate-400 uppercase">Telefone</p>
                       <p className="text-sm font-bold text-slate-900">{customerContact || '-'}</p>
                    </div>
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Representante</p>
                    <p className="text-sm font-bold text-slate-900">{selectedRepName}</p>
                 </div>
              </div>
           </div>
        </div>

        {notes && (
          <div className="mb-10 p-6 bg-blue-50 border-l-8 border-blue-600 rounded-r-2xl">
             <h3 className="text-xs font-black uppercase text-blue-900 mb-2">Informações Adicionais</h3>
             <p className="text-lg text-slate-800 italic leading-relaxed">"{notes}"</p>
          </div>
        )}

        <div className="mb-12">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="text-left py-4 px-6 font-black text-sm rounded-tl-2xl">CÓDIGO</th>
                <th className="text-left py-4 px-6 font-black text-sm">PRODUTO / LINHA</th>
                <th className="text-left py-4 px-6 font-black text-sm">REFERÊNCIA</th>
                <th className="text-center py-4 px-6 font-black text-sm rounded-tr-2xl w-24">QTD.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="py-5 px-6 text-sm font-black text-slate-900">{item.code}</td>
                  <td className="py-5 px-6">
                     <div className="text-base font-black text-slate-900 leading-tight">{item.description}</div>
                     <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">{item.category} • {item.line}</div>
                  </td>
                  <td className="py-5 px-6 text-sm font-bold text-slate-700">{item.reference}</td>
                  <td className="py-5 px-6 text-center font-black text-slate-900 text-xl">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
               <tr className="bg-slate-900">
                  <td colSpan={3} className="py-4 px-6 text-white font-black text-right rounded-bl-2xl">TOTAL DE VOLUMES:</td>
                  <td className="py-4 px-6 text-white font-black text-center text-2xl rounded-br-2xl">{items.reduce((a, b) => a + b.quantity, 0)}</td>
               </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-auto pt-20">
           <div className="flex justify-between items-end border-t border-slate-200 pt-12">
              <div className="text-[10px] text-slate-400 font-bold">
                 <p className="text-slate-900 text-sm font-black mb-1">DICOMPEL INDÚSTRIA</p>
                 <p>Documento gerado em {new Date().toLocaleDateString()} às {new Date().toLocaleTimeString()}</p>
                 <p>www.dicompel.com.br</p>
              </div>
              <div className="text-center w-72">
                 <div className="border-b-2 border-slate-900 mb-3 h-1"></div>
                 <p className="text-xs font-black text-slate-900 uppercase">Assinatura do Cliente</p>
              </div>
           </div>
        </div>
      </div>
    </>
  );
};
