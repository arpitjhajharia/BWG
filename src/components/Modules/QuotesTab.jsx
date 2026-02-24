import React, { useState } from 'react';
import { Icons } from '../ui/Icons';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

import { formatMoney } from '../../utils/helpers';

export const QuotesTab = ({ data, actions, setModal }) => {
    const { quotesReceived, quotesSent, vendors, clients, skus } = data;
    const [view, setView] = useState('purchase');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredQuotesReceived = quotesReceived.filter(q => {
        const v = vendors.find(x => x.id === q.vendorId);
        const s = skus.find(x => x.id === q.skuId);
        const term = searchTerm.toLowerCase();
        return (
            v?.companyName?.toLowerCase().includes(term) ||
            s?.name?.toLowerCase().includes(term) ||
            q.quoteId?.toLowerCase().includes(term)
        );
    });

    const filteredQuotesSent = quotesSent.filter(q => {
        const c = clients.find(x => x.id === q.clientId);
        const s = skus.find(x => x.id === q.skuId);
        const term = searchTerm.toLowerCase();
        return (
            c?.companyName?.toLowerCase().includes(term) ||
            s?.name?.toLowerCase().includes(term) ||
            q.quoteId?.toLowerCase().includes(term)
        );
    });

    const displayQuotes = view === 'purchase' ? filteredQuotesReceived : filteredQuotesSent;

    return (
        <div className="flex flex-col h-full animate-fade-in space-y-2">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shrink-0">
                <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base text-slate-800">Quotes</h2>
                    <span className="text-slate-400 font-light text-base">/</span>
                    <span className="text-[12px] font-semibold text-slate-500">
                        {displayQuotes.length} records
                    </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Search Bar */}
                    <div className="relative flex-1 sm:w-48">
                        <Icons.Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder={view === 'purchase' ? "Search Vendor or SKU..." : "Search Client or SKU..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-md py-1.5 pl-8 pr-3 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                        />
                    </div>

                    {/* Segment Control */}
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
                        <button
                            onClick={() => setView('purchase')}
                            className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${view === 'purchase' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            In
                        </button>
                        <button
                            onClick={() => setView('sales')}
                            className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${view === 'sales' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Out
                        </button>
                    </div>
                    <Button icon={Icons.Plus} onClick={() => setModal({ open: true, type: view === 'purchase' ? 'quoteReceived' : 'quoteSent' })} className="shrink-0">New</Button>
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block flex-1 overflow-auto bg-white rounded border border-slate-200 shadow-sm scroller">
                {view === 'purchase' ? (
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-50/80 backdrop-blur-md text-[10px] font-bold text-slate-400 border-b border-slate-200 z-10 uppercase tracking-widest">
                            <tr>
                                <th className="px-2 py-1.5 border-b border-slate-200 w-20">ID</th>
                                <th className="px-2 py-1.5 border-b border-slate-200">Vendor</th>
                                <th className="px-2 py-1.5 border-b border-slate-200">SKU</th>
                                <th className="px-2 py-1.5 border-b border-slate-200 text-right w-16">MOQ</th>
                                <th className="px-2 py-1.5 border-b border-slate-200 text-right">Price</th>
                                <th className="px-2 py-1.5 border-b border-slate-200 text-right">Total</th>
                                <th className="px-2 py-1.5 border-b border-slate-200 text-center w-10">Doc</th>
                                <th className="px-2 py-1.5 border-b border-slate-200 w-14"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px]">
                            {filteredQuotesReceived.map(q => {
                                const v = vendors.find(x => x.id === q.vendorId);
                                const s = skus.find(x => x.id === q.skuId);
                                const linkedSQ = quotesSent.find(sq => sq.baseCostId === q.id);
                                return (
                                    <tr key={q.id} className="group hover:bg-blue-50/30 transition-colors">
                                        <td className="px-2 py-1 font-mono text-slate-400 text-[10px] whitespace-nowrap">{q.quoteId}</td>
                                        <td className="px-2 py-1 font-semibold text-slate-700 text-[12px] truncate max-w-[130px]" title={v?.companyName}>{v?.companyName || 'Unknown'}</td>
                                        <td className="px-2 py-1 text-[11px] font-medium text-slate-600 truncate max-w-[180px]" title={s?.name}>{s?.name || 'Unknown SKU'}</td>
                                        <td className="px-2 py-1 text-right font-mono text-slate-600">{q.moq}</td>
                                        <td className="px-2 py-1 text-right font-semibold text-slate-700 whitespace-nowrap">{formatMoney(q.price, q.currency)}</td>
                                        <td className="px-2 py-1 text-right font-bold text-blue-600 whitespace-nowrap">{formatMoney(q.price * q.moq, q.currency)}</td>
                                        <td className="px-2 py-1 text-center">
                                            {q.driveLink && (
                                                <a href={q.driveLink} target="_blank" rel="noreferrer" className="inline-flex p-0.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                                    <Icons.File className="w-3 h-3" />
                                                </a>
                                            )}
                                        </td>
                                        <td className="px-2 py-1 text-right">
                                            <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setModal({ open: true, type: 'quoteReceived', data: q, isEdit: true })} className="p-1 hover:bg-blue-100 rounded text-slate-400 hover:text-blue-600 transition-colors"><Icons.Edit className="w-3 h-3" /></button>
                                                <button onClick={() => { if (confirm('Delete quote?')) actions.del('quotesReceived', q.id) }} className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-600 transition-colors"><Icons.X className="w-3 h-3" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                ) : (() => {
                    // Group sales quotes by quoteId
                    const quoteGroups = {};
                    filteredQuotesSent.forEach(q => {
                        const key = q.quoteId || q.id;
                        if (!quoteGroups[key]) quoteGroups[key] = [];
                        quoteGroups[key].push(q);
                    });
                    const groupEntries = Object.entries(quoteGroups);

                    return (
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-slate-50/80 backdrop-blur-md text-[10px] font-bold text-slate-400 border-b border-slate-200 z-10 uppercase tracking-widest">
                                <tr>
                                    <th className="px-2 py-1.5 border-b border-slate-200 w-20">ID</th>
                                    <th className="px-2 py-1.5 border-b border-slate-200">Client</th>
                                    <th className="px-2 py-1.5 border-b border-slate-200 w-20">Date</th>
                                    <th className="px-2 py-1.5 border-b border-slate-200">SKU</th>
                                    <th className="px-2 py-1.5 border-b border-slate-200 text-right w-16">MOQ</th>
                                    <th className="px-2 py-1.5 border-b border-slate-200 text-right">Price</th>
                                    <th className="px-2 py-1.5 border-b border-slate-200 text-right">Total</th>
                                    <th className="px-2 py-1.5 border-b border-slate-200 text-center w-16">Status</th>
                                    <th className="px-2 py-1.5 border-b border-slate-200">Base Cost</th>
                                    <th className="px-2 py-1.5 border-b border-slate-200 text-right">Margin</th>
                                    <th className="px-2 py-1.5 border-b border-slate-200 text-center w-10">Doc</th>
                                    <th className="px-2 py-1.5 border-b border-slate-200 w-14"></th>
                                </tr>
                            </thead>
                            <tbody className="text-[11px]">
                                {groupEntries.map(([groupId, groupQuotes]) => {
                                    const firstQ = groupQuotes[0];
                                    const c = clients.find(x => x.id === firstQ.clientId);
                                    const isMulti = groupQuotes.length > 1;

                                    return groupQuotes.map((q, idx) => {
                                        const s = skus.find(x => x.id === q.skuId);
                                        const baseQuote = quotesReceived.find(bq => bq.id === q.baseCostId);
                                        const baseVendor = vendors.find(v => v.id === baseQuote?.vendorId);
                                        const totalRevenue = q.sellingPrice * q.moq;
                                        const totalCost = q.baseCostPrice * q.moq;
                                        const totalMargin = totalRevenue - totalCost;
                                        const marginPct = totalCost ? ((totalMargin / totalCost) * 100).toFixed(1) : 0;
                                        const isFirst = idx === 0;
                                        const isLast = idx === groupQuotes.length - 1;

                                        return (
                                            <tr key={q.id} className={`group hover:bg-blue-50/30 transition-colors ${isFirst && isMulti ? 'border-t-2 border-t-slate-200' : ''} ${!isLast && isMulti ? '' : 'border-b border-slate-100'}`}>
                                                {/* Quote ID & Client: show only on first row, span remaining */}
                                                {isFirst ? (
                                                    <>
                                                        <td className="px-2 py-1 font-mono text-slate-400 text-[10px] whitespace-nowrap align-top" rowSpan={isMulti ? groupQuotes.length : undefined}>
                                                            {q.quoteId}
                                                        </td>
                                                        <td className="px-2 py-1 font-semibold text-slate-700 text-[12px] truncate max-w-[130px] align-top" rowSpan={isMulti ? groupQuotes.length : undefined} title={c?.companyName}>
                                                            {c?.companyName || 'Unknown'}
                                                        </td>
                                                        <td className="px-2 py-1 font-mono text-slate-500 text-[10px] whitespace-nowrap align-top" rowSpan={isMulti ? groupQuotes.length : undefined}>
                                                            {q.date || '—'}
                                                        </td>
                                                    </>
                                                ) : null}
                                                <td className="px-2 py-1 text-[11px] font-medium text-slate-600 truncate max-w-[180px]" title={s?.name}>{s?.name || 'Unknown SKU'}</td>
                                                <td className="px-2 py-1 text-right font-mono text-slate-600">{q.moq}</td>
                                                <td className="px-2 py-1 text-right font-semibold text-slate-700 whitespace-nowrap">{formatMoney(q.sellingPrice)}</td>
                                                <td className="px-2 py-1 text-right font-bold text-blue-600 whitespace-nowrap">{formatMoney(totalRevenue)}</td>
                                                <td className="px-2 py-1 text-center">
                                                    <span className={`text-[8px] font-bold uppercase tracking-wider px-1 py-px rounded border ${q.status === 'Active' ? 'text-green-700 bg-green-50 border-green-100' : q.status === 'Closed' ? 'text-slate-500 bg-slate-50 border-slate-200' : 'text-yellow-700 bg-yellow-50 border-yellow-100'}`}>
                                                        {q.status || 'Draft'}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-1 whitespace-nowrap">
                                                    {baseQuote ? (
                                                        <span className="text-[11px] text-slate-600"><span className="font-semibold">{baseVendor?.companyName}</span> <span className="text-slate-400">@ {formatMoney(baseQuote.price)}</span></span>
                                                    ) : <span className="text-[9px] font-bold text-yellow-600 bg-yellow-50 px-1 py-px rounded border border-yellow-100">No Base</span>}
                                                </td>
                                                <td className="px-2 py-1 text-right whitespace-nowrap">
                                                    <span className={`font-bold font-mono text-[11px] ${marginPct > 20 ? 'text-green-600' : marginPct > 10 ? 'text-yellow-600' : 'text-red-600'}`}>{formatMoney(totalMargin)}</span>
                                                    <span className="text-[9px] text-slate-400 ml-1">{marginPct}%</span>
                                                </td>
                                                <td className="px-2 py-1 text-center">
                                                    {q.driveLink && (
                                                        <a href={q.driveLink} target="_blank" rel="noreferrer" className="inline-flex p-0.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                                            <Icons.File className="w-3 h-3" />
                                                        </a>
                                                    )}
                                                </td>
                                                <td className="px-2 py-1 text-right">
                                                    <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => setModal({ open: true, type: 'quoteSent', data: q, isEdit: true })} className="p-1 hover:bg-blue-100 rounded text-slate-400 hover:text-blue-600 transition-colors"><Icons.Edit className="w-3 h-3" /></button>
                                                        <button onClick={() => { if (confirm('Delete quote?')) actions.del('quotesSent', q.id) }} className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-600 transition-colors"><Icons.X className="w-3 h-3" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    });
                                })}
                            </tbody>
                        </table>
                    );
                })()}
            </div>

            <div className="md:hidden flex-1 overflow-auto space-y-3 pb-12 scroller">
                {view === 'purchase' ? (
                    filteredQuotesReceived.map(q => {
                        const v = vendors.find(x => x.id === q.vendorId);
                        const s = skus.find(x => x.id === q.skuId);
                        const linkedSQ = quotesSent.find(sq => sq.baseCostId === q.id);
                        return (
                            <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm active:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider">{q.quoteId}</span>
                                            {linkedSQ && <Badge color="green" size="xs">Ref: {linkedSQ.quoteId}</Badge>}
                                        </div>
                                        <h3 className="font-bold text-slate-800 text-[14px] truncate">{v?.companyName || 'Unknown Vendor'}</h3>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                        <button onClick={() => setModal({ open: true, type: 'quoteReceived', data: q, isEdit: true })} className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg">
                                            <Icons.Edit className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => { if (confirm('Delete quote?')) actions.del('quotesReceived', q.id) }} className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg">
                                            <Icons.Trash className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <div className="text-[11px] font-medium text-slate-600 line-clamp-2 leading-tight">{s?.name || 'Unknown SKU'}</div>
                                </div>

                                <div className="flex items-center justify-between text-[12px] pt-2 border-t border-slate-100">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] uppercase font-bold text-slate-400">MOQ × Price</span>
                                        <span className="font-medium text-slate-600 font-mono">{q.moq} × {formatMoney(q.price, q.currency)}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] uppercase font-bold text-blue-500">Total Purchase</span>
                                        <span className="font-black text-blue-600 text-[14px]">{formatMoney(q.price * q.moq, q.currency)}</span>
                                    </div>
                                </div>

                                {q.driveLink && (
                                    <div className="mt-2.5 pt-2 border-t border-slate-50">
                                        <a href={q.driveLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                                            <Icons.File className="w-3.5 h-3.5" />
                                            View Document
                                        </a>
                                    </div>
                                )}
                            </div>
                        )
                    })
                ) : (
                    filteredQuotesSent.map(q => {
                        const c = clients.find(x => x.id === q.clientId);
                        const s = skus.find(x => x.id === q.skuId);
                        const baseQuote = quotesReceived.find(bq => bq.id === q.baseCostId);
                        const baseVendor = vendors.find(v => v.id === baseQuote?.vendorId);
                        const totalRevenue = q.sellingPrice * q.moq;
                        const totalCost = q.baseCostPrice * q.moq;
                        const totalMargin = totalRevenue - totalCost;
                        const marginPct = totalCost ? ((totalMargin / totalCost) * 100).toFixed(1) : 0;

                        return (
                            <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm active:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider">{q.quoteId}</span>
                                            <Badge color={q.status === 'Active' ? 'green' : q.status === 'Closed' ? 'slate' : 'yellow'} size="xs" className="uppercase tracking-wider text-[8px]">
                                                {q.status || 'Draft'}
                                            </Badge>
                                        </div>
                                        <h3 className="font-bold text-slate-800 text-[14px] truncate">{c?.companyName || 'Unknown Client'}</h3>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                        <button onClick={() => setModal({ open: true, type: 'quoteSent', data: q, isEdit: true })} className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg">
                                            <Icons.Edit className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => { if (confirm('Delete quote?')) actions.del('quotesSent', q.id) }} className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg">
                                            <Icons.Trash className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <div className="text-[11px] font-medium text-slate-600 line-clamp-2 leading-tight">{s?.name || 'Unknown SKU'}</div>
                                    <span className="text-[10px] font-mono text-slate-400">MOQ: {q.moq} unit(s)</span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Price / Total</span>
                                        <span className="text-[13px] font-bold text-blue-700">{formatMoney(q.sellingPrice)}</span>
                                        <span className="text-[10px] font-medium text-slate-400">{formatMoney(totalRevenue)}</span>
                                    </div>
                                    <div className="flex flex-col items-end text-right">
                                        <span className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Margin Yield</span>
                                        <span className={`text-[13px] font-bold ${marginPct > 20 ? 'text-green-600' : 'text-yellow-600'}`}>{formatMoney(totalMargin)}</span>
                                        <span className="text-[10px] font-medium text-slate-400">{marginPct}% Yield</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[9px] uppercase font-bold text-slate-400">Base Cost</span>
                                        {baseQuote ? (
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-[11px] font-bold text-slate-700 truncate max-w-[120px]">{baseVendor?.companyName}</span>
                                                <span className="text-[10px] font-medium text-slate-400 shrink-0">@ {formatMoney(baseQuote.price)}</span>
                                            </div>
                                        ) : <Badge color="yellow" size="xs">No Base Linked</Badge>}
                                    </div>
                                    {q.driveLink && (
                                        <a href={q.driveLink} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-blue-600">
                                            <Icons.File className="w-4 h-4" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    );
};