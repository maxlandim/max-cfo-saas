"use client";

import { useEffect, useState } from 'react';
import { fetchAPI } from '../../lib/api';

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [prodRes, alertRes] = await Promise.all([
          fetchAPI('/inventory'),
          fetchAPI('/inventory/alerts')
        ]);
        setProducts(prodRes || []);
        setAlerts(alertRes?.alerts || []);
      } catch (err) {
        console.error("Failed to load inventory", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div className="p-8 text-center text-white">Carregando Estoque...</div>;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Controle de Estoque</h1>
        <p className="text-gray-400">Gerencie suprimentos e monitore alertas de recompra.</p>
      </div>

      {alerts.length > 0 && (
        <div className="bg-red-900/30 border border-red-500/50 p-4 rounded-xl flex items-start space-x-3">
          <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="text-red-400 font-bold">Atenção: Ação Necessária</h3>
            <p className="text-red-200 text-sm">Existem {alerts.length} produtos abaixo do ponto de recompra!</p>
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-gray-800 text-gray-400 uppercase font-semibold text-xs">
            <tr>
              <th className="px-6 py-4">Produto / SKU</th>
              <th className="px-6 py-4 text-center">Qtd Atual</th>
              <th className="px-6 py-4 text-center">Ponto de Recompra</th>
              <th className="px-6 py-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {products.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-8 text-gray-500">Nenhum produto cadastrado.</td></tr>
            ) : (
              products.map(prod => {
                const isCritical = prod.quantity <= prod.reorder_point;
                return (
                  <tr key={prod.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{prod.name}</div>
                      <div className="text-xs text-gray-500">SKU: {prod.sku}</div>
                    </td>
                    <td className="px-6 py-4 text-center text-lg font-bold">
                      {prod.quantity}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-500">
                      {prod.reorder_point}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isCritical ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/50 text-red-400 border border-red-800">
                          Repor Estoque
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-400 border border-green-800">
                          Estável
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
