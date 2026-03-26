import React, { useMemo, useState } from 'react';
import { Icons } from '../ui/Icons';
import { Card } from '../ui/Card';
import { formatDate, formatMoney } from '../../utils/helpers';

export const OrderMaster = ({ data, actions, setModal, setDetailView, currentUser }) => {
    const { orders, skus, products, clients, vendors, settings } = data;
    const usdRate = parseFloat(settings?.usdToInrRate || 1);

    const [view, setView] = useState('sales'); // 'sales' (Client POs) or 'purchase' (Vendor POs)
    const [search, setSearch] = useState('');

    const sharedOrders = useMemo(() => {
        return (orders || []).map(o => {
            const sku = skus.find(s => s.id === o.skuId);
            const company = clients.find(c => c.id === o.companyId) || vendors.find(v => v.id === o.companyId);
            const isClientOrder = clients.some(c => c.id === o.companyId);
            
            let paid = 0;
            (o.paymentTerms || []).forEach(t => {
                paid += (parseFloat(t.paidBase) || 0) + (parseFloat(t.paidTax) || 0);
            });
            
            const amount = parseFloat(o.amount || 0);
            const unpaid = Math.max(0, amount - paid);

            return {
                ...o,
                skuName: sku ? sku.name : 'Unknown SKU',
                companyName: company ? company.companyName : 'Unknown Entity',
                isClientOrder,
                paid,
                unpaid,
                amount,
                // Normalized for totals
                nAmount: o.currency === 'USD' ? amount * usdRate : amount,
                nPaid: o.currency === 'USD' ? paid * usdRate : paid,
                nUnpaid: o.currency === 'USD' ? unpaid * usdRate : unpaid
            };
        });
    }, [orders, skus, products, clients, vendors, usdRate]);

    const filteredOrders = useMemo(() => {
        return sharedOrders.filter(o => {
            const typeMatch = view === 'sales' ? o.isClientOrder : !o.isClientOrder;
            const searchMatch = !search || 
                o.orderId.toLowerCase().includes(search.toLowerCase()) ||
                o.skuName.toLowerCase().includes(search.toLowerCase()) ||
                o.companyName.toLowerCase().includes(search.toLowerCase());
            return typeMatch && searchMatch;
        }).sort((a,b) => new Date(b.date) - new Date(a.date));
    }, [sharedOrders, view, search]);

    const totals = useMemo(() => {
        return filteredOrders.reduce((acc, o) => ({
            amount: acc.amount + o.nAmount,
            paid: acc.paid + o.nPaid,
            unpaid: acc.unpaid + o.nUnpaid
        }), { amount: 0, paid: 0, unpaid: 0 });
    }, [filteredOrders]);

    return (
        <div className="flex flex-col h-full animate-fade-in space-y-2 p-3 overflow-hidden">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 px-2">
                <div className="flex items-center gap-3">
                    <h2 className="font-bold text-lg text-slate-800 uppercase tracking-tight leading-none">Order Hub</h2>
                    <span className="text-slate-300 font-light text-lg">/</span>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                        {view === 'sales' ? 'Sales PO (Clients)' : 'Purchase PO (Vendors)'}
                    </span>
                    <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded-full font-bold border border-slate-200">{filteredOrders.length}</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-72">
                        <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            placeholder="Quick Search ID, SKU, Entity..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-md py-1.5 pl-10 pr-4 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500/10 focus:border-blue-500 placeholder:text-slate-400 shadow-sm"
                        />
                    </div>

                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0 shadow-inner">
                        <button onClick={() => setView('sales')} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${view === 'sales' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Sales</button>
                        <button onClick={() => setView('purchase')} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${view === 'purchase' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Purchase</button>
                    </div>
                </div>
            </div>

            {/* Compact Stats Grid */}
            <div className="grid grid-cols-4 gap-3 px-2 shrink-0">
                <div className="bg-white border border-slate-200 p-2.5 rounded-lg shadow-sm">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Volume</p>
                    <p className="text-[16px] font-bold text-slate-900 leading-none">{formatMoney(totals.amount, 'INR', false)}</p>
                </div>
                <div className="bg-emerald-50/20 border border-emerald-100 p-2.5 rounded-lg shadow-sm border-l-2 border-l-emerald-500">
                    <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mb-0.5">{view === 'sales' ? 'Collected' : 'Paid Out'}</p>
                    <p className="text-[16px] font-bold text-emerald-600 leading-none">{formatMoney(totals.paid, 'INR', false)}</p>
                </div>
                <div className="bg-amber-50/10 border border-amber-100 p-2.5 rounded-lg shadow-sm border-l-2 border-l-amber-500">
                    <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mb-0.5">Outstanding</p>
                    <p className="text-[16px] font-bold text-amber-600 leading-none">{formatMoney(totals.unpaid, 'INR', false)}</p>
                </div>
                <div className="bg-blue-50/20 border border-blue-100 p-2.5 rounded-lg shadow-sm border-l-2 border-l-blue-500">
                    <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-0.5">USD Baseline</p>
                    <p className="text-[16px] text-blue-700 font-bold tabular-nums leading-none">₹{usdRate}</p>
                </div>
            </div>

            {/* Vertically Compact Table */}
            <div className="flex-1 overflow-auto bg-white rounded-lg border border-slate-200 mx-2 mb-2 scroller shadow-sm">
                <table className="w-full text-left border-collapse table-auto">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10 uppercase tracking-[0.1em]">
                        <tr className="text-[10px] font-bold text-slate-400">
                            <th className="px-4 py-2 whitespace-nowrap">Date</th>
                            <th className="px-4 py-2 whitespace-nowrap">Order ID</th>
                            <th className="px-4 py-2 whitespace-nowrap">{view === 'sales' ? 'Client' : 'Vendor'}</th>
                            <th className="px-4 py-2">SKU</th>
                            <th className="px-4 py-2 text-right">Qty</th>
                            <th className="px-4 py-2 text-right">Base</th>
                            <th className="px-4 py-2 text-right whitespace-nowrap">{view === 'sales' ? 'Paid' : 'Sent'}</th>
                            <th className="px-4 py-2 text-right">Pending</th>
                            <th className="px-4 py-2 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-[12px]">
                        {filteredOrders.map(order => (
                            <tr 
                                key={order.id} 
                                className="group hover:bg-blue-50/30 transition-colors cursor-pointer"
                                onClick={() => {
                                    const company = clients.find(c => c.id === order.companyId) || vendors.find(v => v.id === order.companyId);
                                    if (company) setDetailView({ open: true, type: order.isClientOrder ? 'client' : 'vendor', data: company });
                                }}
                            >
                                <td className="px-4 py-1.5 whitespace-nowrap text-slate-400 tabular-nums font-medium uppercase">{formatDate(order.date)}</td>
                                <td className="px-4 py-1.5 tabular-nums">
                                    <span className="font-mono text-[11px] font-bold text-slate-600 group-hover:text-blue-600">#{order.orderId}</span>
                                </td>
                                <td className="px-4 py-1.5 font-bold text-slate-800 uppercase tracking-tight whitespace-nowrap text-xs">{order.companyName}</td>
                                <td className="px-4 py-1.5 font-semibold text-slate-600 text-xs">
                                    {order.skuName}
                                </td>
                                <td className="px-4 py-1.5 text-right font-bold text-slate-500 tabular-nums">{order.qty}</td>
                                <td className="px-4 py-1.5 text-right font-bold text-slate-800 tabular-nums tracking-tight">{formatMoney(order.amount, order.currency, false)}</td>
                                <td className="px-4 py-1.5 text-right font-bold text-emerald-600 tabular-nums tracking-tight">{formatMoney(order.paid, order.currency, false)}</td>
                                <td className="px-4 py-1.5 text-right font-bold text-amber-600 tabular-nums tracking-tight relative">
                                    {formatMoney(order.unpaid, order.currency, false)}
                                    {order.unpaid > 0 && order.unpaid > order.amount * 0.9 && (
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-full bg-red-400/50" title="High Outstanding"></div>
                                    )}
                                </td>
                                <td className="px-4 py-1.5 text-right">
                                    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('Delete this order entry permanently?')) {
                                                    actions.del('orders', order.id);
                                                }
                                            }}
                                            className="p-1 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded transition-colors"
                                        >
                                            <Icons.Trash className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredOrders.length === 0 && (
                    <div className="py-20 text-center text-slate-300 italic text-[13px]">No records found.</div>
                )}
            </div>
        </div>
    );
};
