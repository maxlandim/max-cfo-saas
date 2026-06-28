"use client";

import { useEffect, useState } from 'react';
import { fetchAPI } from '../lib/api';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetchAPI('/analytics/dashboard');
        setData(response);
      } catch (err) {
        console.error("Failed to load analytics", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div className="p-8 text-center text-white">Carregando Inteligência Financeira...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Erro ao carregar os dados.</div>;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold text-white tracking-tight">CFO Dashboard</h1>
      <p className="text-gray-400">Visão consolidada em tempo real da sua empresa.</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-2xl border border-gray-800 shadow-xl">
          <h3 className="text-gray-400 text-sm font-medium">Saldo Consolidado</h3>
          <p className="text-3xl font-bold text-green-400 mt-2">
            R$ {(data.saldo_total / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-2xl border border-gray-800 shadow-xl">
          <h3 className="text-gray-400 text-sm font-medium">Receitas do Mês</h3>
          <p className="text-3xl font-bold text-blue-400 mt-2">
            R$ {(data.receitas_mes / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-2xl border border-gray-800 shadow-xl">
          <h3 className="text-gray-400 text-sm font-medium">Despesas do Mês</h3>
          <p className="text-3xl font-bold text-red-400 mt-2">
            R$ {(data.despesas_mes / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-2xl border border-blue-900 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg className="w-16 h-16 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z"></path></svg>
          </div>
          <h3 className="text-gray-400 text-sm font-medium">Runway (Sobrevivência)</h3>
          <p className={`text-4xl font-black mt-2 ${data.runway_meses < 2 ? 'text-red-500' : 'text-blue-400'}`}>
            {data.runway_meses} meses
          </p>
          <p className="text-xs text-gray-500 mt-1">Tempo de caixa restante</p>
        </div>
      </div>
      
      {/* Gráfico Fake para visual do CEO */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mt-8">
        <h2 className="text-xl font-bold text-white mb-4">Fluxo de Caixa vs Margem</h2>
        <div className="h-64 w-full flex items-end justify-between space-x-2">
          {[40, 70, 45, 90, 65, 85, 110].map((h, i) => (
            <div key={i} className="w-full bg-blue-500/20 rounded-t-md hover:bg-blue-500/40 transition-colors relative group">
               <div style={{ height: `${h}%` }} className="absolute bottom-0 w-full bg-blue-600 rounded-t-md"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
