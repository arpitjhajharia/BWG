import React from 'react';
import { Icons } from '../ui/Icons';
import { formatMoney } from '../../utils/helpers';

export const ActiveQuotesModal = ({ activeQuotesView, setActiveQuotesView, data }) => {
    if (!activeQuotesView.open) return null;

    const { products, skus, clients, quotesSent } = data;
    const product = products.find(p => p.id === activeQuotesView.productId);
    const pSkus = skus.filter(s => s.productId === activeQuotesView.productId);
    const skuIds = pSkus.map(s => s.id);
    const activeQuotes = quotesSent.filter(q => skuIds.includes(q.skuId) && q.status === 'Active');

    return (
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Active Quotes</h2>
                        <p className="text-sm text-slate-500">For product: <span className="font-semibold text-blue-600">{product?.name}</span></p>
                    </div>
                    <button onClick={() => setActiveQuotesView({ open: false, productId: null })} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><Icons.X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 overflow-y-auto scroller">
                    {activeQuotes.length > 0 ? (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="p-3 bg-slate-50 text-xs font-bold text-slate-500 border-b">Client</th>
                                    <th className="p-3 bg-slate-50 text-xs font-bold text-slate-500 border-b">SKU</th>
                                    <th className="p-3 bg-slate-50 text-xs font-bold text-slate-500 border-b">MOQ</th>
                                    <th className="p-3 bg-slate-50 text-xs font-bold text-slate-500 border-b text-right">Price</th>
                                    <th className="p-3 bg-slate-50 text-xs font-bold text-slate-500 border-b text-right">Total</th>
                                    <th className="p-3 bg-slate-50 text-xs font-bold text-slate-500 border-b text-right">Margin</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeQuotes.map(q => {
                                    const c = clients.find(x => x.id === q.clientId);
                                    const s = skus.find(x => x.id === q.skuId);
                                    const totalRevenue = q.sellingPrice * q.moq;
                                    const totalCost = q.baseCostPrice * q.moq;
                                    const totalMargin = totalRevenue - totalCost;

                                    return (
                                        <tr key={q.id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0">
                                            <td className="p-3 font-medium text-slate-700">{c?.companyName}</td>
                                            <td className="p-3 text-xs text-slate-500">{s?.variant} - {s?.packSize}{s?.unit}</td>
                                            <td className="p-3">{q.moq}</td>
                                            <td className="p-3 text-right">{formatMoney(q.sellingPrice)}</td>
                                            <td className="p-3 text-right font-medium">{formatMoney(totalRevenue)}</td>
                                            <td className={`p-3 text-right font-bold ${totalMargin < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatMoney(totalMargin)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center py-10 text-slate-400">No active quotes found for this product.</div>
                    )}
                </div>
            </div>
        </div>
    );
};