"use client";

import { useState } from 'react';
import { fetchAPI } from '../../lib/api';

export default function FintechPage() {
  const [amount, setAmount] = useState(15000);
  const [anticipationResult, setAnticipationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleAnticipate() {
    setLoading(true);
    try {
      // Cria uma cobrança mock primeiro para poder antecipar
      const chargeRes = await fetchAPI(`/fintech/generate-boleto?amount=${amount * 100}`, { method: 'POST' });
      
      // Simula a antecipação
      const antRes = await fetchAPI(`/fintech/anticipate?charge_id=${chargeRes.charge_id}`, { method: 'POST' });
      setAnticipationResult(antRes);
    } catch (err) {
      alert("Erro ao processar antecipação");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Hub Fintech</h1>
        <p className="text-gray-400">Transforme suas contas a receber em dinheiro na hora.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Painel de Antecipação */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-purple-900/30 rounded-lg text-purple-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Antecipação de Recebíveis</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Valor da Fatura Futura (R$)</label>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
              />
            </div>
            
            <button 
              onClick={handleAnticipate}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex justify-center items-center"
            >
              {loading ? "Processando..." : "Simular Adiantamento"}
            </button>
          </div>
        </div>

        {/* Resultado */}
        {anticipationResult && (
          <div className="bg-gradient-to-b from-gray-900 to-black border border-gray-800 p-6 rounded-2xl shadow-xl space-y-4 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
             
             <h3 className="text-lg font-bold text-gray-300">Resumo da Operação</h3>
             
             <div className="flex justify-between items-center py-2 border-b border-gray-800">
               <span className="text-gray-400">Valor Original</span>
               <span className="text-white font-medium">R$ {(anticipationResult.original_amount / 100).toFixed(2)}</span>
             </div>
             
             <div className="flex justify-between items-center py-2 border-b border-gray-800">
               <span className="text-red-400">Taxa de Desconto (3%)</span>
               <span className="text-red-400 font-medium">- R$ {(anticipationResult.discount_fee / 100).toFixed(2)}</span>
             </div>
             
             <div className="flex justify-between items-center pt-2">
               <span className="text-gray-300 font-bold">Valor Líquido creditado HOJE</span>
               <span className="text-3xl font-black text-green-400">R$ {(anticipationResult.net_amount / 100).toFixed(2)}</span>
             </div>
             
             <div className="mt-6 pt-4 border-t border-gray-800 text-center">
                <span className="inline-block bg-green-900/30 text-green-400 text-xs px-3 py-1 rounded-full border border-green-800/50">
                  Pré-aprovado
                </span>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
