import React, { useState } from 'react';
import { Icons } from '../ui/Icons';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { formatMoney } from '../../utils/helpers';

export const QuotesTab = ({ data, actions, setModal }) => {
    const { quotesReceived, quotesSent, vendors, clients, skus } = data;
    const [view, setView] = useState('purchase');

    return (
        <div className="flex flex-col h-full animate-fade-in space-y-4">
            {/* Header Toolbar */}
            <div className="flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <h2 className="font-bold text-lg text-slate-800">Quotes</h2>
                        <span className="text-slate-400 font-light text-lg">/</span>
                        <span className="text-[13px] font-semibold text-slate-500">
                            {view === 'purchase' ? quotesReceived.length : quotesSent.length} records
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Segment Control */}
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                            onClick={() => setView('purchase')}
                            className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-all ${view === 'purchase' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Purchase (In)
                        </button>
                        <button
                            onClick={() => setView('sales')}
                            className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-all ${view === 'sales' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Sales (Out)
                        </button>
                    </div>
                    <Button icon={Icons.Plus} onClick={() => setModal({ open: true, type: view === 'purchase' ? 'quoteReceived' : 'quoteSent' })}>New</Button>
                </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-auto bg-white rounded border border-slate-200 shadow-sm scroller">
                {view === 'purchase' ? (
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200 z-10 shadow-sm">
                            <tr>
                                <th className="px-3 py-2 w-24">ID</th>
                                <th className="px-3 py-2 w-40">Vendor</th>
                                <th className="px-3 py-2 w-40">SKU</th>
                                <th className="px-3 py-2 w-20 text-right">MOQ</th>
                                <th className="px-3 py-2 w-24 text-right">Price</th>
                                <th className="px-3 py-2 w-24 text-right">Total</th>
                                <th className="px-3 py-2 w-32">Sales Ref</th>
                                <th className="px-3 py-2 w-16 text-center">Doc</th>
                                <th className="px-3 py-2 w-16 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[13px]">
                            {quotesReceived.map(q => {
                                const v = vendors.find(x => x.id === q.vendorId);
                                const s = skus.find(x => x.id === q.skuId);
                                const linkedSQ = quotesSent.find(sq => sq.baseCostId === q.id);
                                return (
                                    <tr key={q.id} className="group hover:bg-blue-50/30 transition-colors border-b border-slate-50 last:border-0">
                                        <td className="px-3 py-2 font-mono text-slate-500 text-[11px]">{q.quoteId}</td>
                                        <td className="px-3 py-2 font-medium text-slate-700 truncate max-w-[150px]" title={v?.companyName}>{v?.companyName || 'Unknown'}</td>
                                        <td className="px-3 py-2 text-slate-600 truncate max-w-[150px]" title={s?.name}>{s?.name || 'Unknown SKU'}</td>
                                        <td className="px-3 py-2 text-right font-mono text-slate-600">{q.moq}</td>
                                        <td className="px-3 py-2 text-right font-medium text-slate-700">{formatMoney(q.price, q.currency)}</td>
                                        <td className="px-3 py-2 text-right font-bold text-slate-800">{formatMoney(q.price * q.moq, q.currency)}</td>
                                        <td className="px-3 py-2">
                                            {linkedSQ ? (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-green-200 bg-green-50 text-green-700 text-[10px] font-mono font-medium">
                                                    {linkedSQ.quoteId}
                                                </span>
                                            ) : <span className="text-slate-300 text-[10px]">-</span>}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            {q.driveLink && <a href={q.driveLink} target="_blank" className="text-slate-400 hover:text-blue-600 transition-colors"><Icons.File className="w-3.5 h-3.5" /></a>}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setModal({ open: true, type: 'quoteReceived', data: q, isEdit: true })} className="p-1 hover:bg-blue-100 rounded text-slate-400 hover:text-blue-600 transition-colors"><Icons.Edit className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => actions.del('quotesReceived', q.id)} className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-600 transition-colors"><Icons.X className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200 z-10 shadow-sm">
                            <tr>
                                <th className="px-3 py-2 w-24">ID</th>
                                <th className="px-3 py-2 w-40">Client</th>
                                <th className="px-3 py-2 w-40">SKU</th>
                                <th className="px-3 py-2 w-20 text-right">MOQ</th>
                                <th className="px-3 py-2 w-24 text-right">Price</th>
                                <th className="px-3 py-2 w-24 text-right">Total</th>
                                <th className="px-3 py-2 w-24 text-center">Status</th>
                                <th className="px-3 py-2 w-40">Base Cost</th>
                                <th className="px-3 py-2 w-32">Margin</th>
                                <th className="px-3 py-2 w-16 text-center">Doc</th>
                                <th className="px-3 py-2 w-16 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[13px]">
                            {quotesSent.map(q => {
                                const c = clients.find(x => x.id === q.clientId);
                                const s = skus.find(x => x.id === q.skuId);
                                const baseQuote = quotesReceived.find(bq => bq.id === q.baseCostId);
                                const baseVendor = vendors.find(v => v.id === baseQuote?.vendorId);
                                const totalRevenue = q.sellingPrice * q.moq;
                                const totalCost = q.baseCostPrice * q.moq;
                                const totalMargin = totalRevenue - totalCost;
                                const marginPct = totalCost ? ((totalMargin / totalCost) * 100).toFixed(1) : 0;

                                return (
                                    <tr key={q.id} className="group hover:bg-blue-50/30 transition-colors border-b border-slate-50 last:border-0">
                                        <td className="px-3 py-2 font-mono text-slate-500 text-[11px]">{q.quoteId}</td>
                                        <td className="px-3 py-2 font-medium text-slate-700 truncate max-w-[150px]" title={c?.companyName}>{c?.companyName || 'Unknown'}</td>
                                        <td className="px-3 py-2 text-slate-600 truncate max-w-[150px]" title={s?.name}>{s?.name || 'Unknown SKU'}</td>
                                        <td className="px-3 py-2 text-right font-mono text-slate-600">{q.moq}</td>
                                        <td className="px-3 py-2 text-right font-medium text-slate-700">{formatMoney(q.sellingPrice)}</td>
                                        <td className="px-3 py-2 text-right font-bold text-slate-800">{formatMoney(totalRevenue)}</td>
                                        <td className="px-3 py-2 text-center">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${q.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : q.status === 'Closed' ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                                {q.status || 'Draft'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">
                                            {baseQuote ? (
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] text-slate-600 font-medium truncate max-w-[120px]" title={baseVendor?.companyName}>{baseVendor?.companyName}</span>
                                                    <span className="text-[10px] text-slate-400">@ {formatMoney(baseQuote.price)}</span>
                                                </div>
                                            ) : <span className="text-[10px] text-red-400 italic">No Base</span>}
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`font-bold font-mono text-[11px] ${marginPct > 20 ? 'text-green-600' : marginPct > 10 ? 'text-yellow-600' : 'text-red-600'}`}>{formatMoney(totalMargin)}</span>
                                                <span className="text-[10px] text-slate-400">({marginPct}%)</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            {q.driveLink && <a href={q.driveLink} target="_blank" className="text-slate-400 hover:text-blue-600 transition-colors"><Icons.File className="w-3.5 h-3.5" /></a>}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setModal({ open: true, type: 'quoteSent', data: q, isEdit: true })} className="p-1 hover:bg-blue-100 rounded text-slate-400 hover:text-blue-600 transition-colors"><Icons.Edit className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => actions.del('quotesSent', q.id)} className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-600 transition-colors"><Icons.X className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};