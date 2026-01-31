import React, { useMemo } from 'react';
import { Icons } from '../ui/Icons';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { InlineTask } from '../modules/TaskBoard';
import { formatMoney, formatDate } from '../../utils/helpers';

export const DetailDashboard = ({ detailView, setDetailView, data, actions, setModal, userProfiles }) => {
    // 1. Safe Destructuring: If no data, use an empty object {} to prevent crashes
    const { type, data: rawCompanyData } = detailView;
    const companyData = rawCompanyData || {};
    const { contacts, tasks, quotesReceived, quotesSent, orders, products, skus } = data;
    const isVendor = type === 'vendor';

    // Memoized Filters
    const relatedContacts = useMemo(() => companyData.id ? contacts.filter(c => c.companyId === companyData.id) : [], [contacts, companyData.id]);

    const relatedTasks = useMemo(() => companyData.id ? tasks.filter(t =>
        t.relatedId === companyData.id ||
        t.relatedClientId === companyData.id ||
        t.relatedVendorId === companyData.id
    ) : [], [tasks, companyData.id]);

    const relatedQuotes = useMemo(() => companyData.id ? (
        isVendor
            ? quotesReceived.filter(q => q.vendorId === companyData.id)
            : quotesSent.filter(q => q.clientId === companyData.id)
    ) : [], [isVendor, quotesReceived, quotesSent, companyData.id]);

    const relatedOrders = useMemo(() => companyData.id ? orders.filter(o => o.companyId === companyData.id).sort((a, b) => b.date.localeCompare(a.date)) : [], [orders, companyData.id]);

    // Sort Tasks
    const sortedTasks = useMemo(() => [...relatedTasks].sort((a, b) => {
        if (a.status === 'Completed' && b.status !== 'Completed') return 1;
        if (a.status !== 'Completed' && b.status === 'Completed') return -1;
        return new Date(a.dueDate || '9999-12-31') - new Date(b.dueDate || '9999-12-31');
    }), [relatedTasks]);

    // Calculate Values
    const { potentialValue, totalOrderValue } = useMemo(() => {
        let pv = 0;
        if (companyData.id) {
            if (isVendor) {
                pv = relatedQuotes.reduce((acc, q) => acc + (q.price * q.moq), 0);
            } else {
                pv = relatedQuotes.filter(q => q.status === 'Active').reduce((acc, q) => acc + (q.sellingPrice * q.moq), 0);
            }
        }
        const tov = relatedOrders.reduce((acc, o) => acc + (o.amount || 0), 0);
        return { potentialValue: pv, totalOrderValue: tov };
    }, [relatedQuotes, relatedOrders, isVendor, companyData.id]);

    // Group Quotes
    const quoteGroups = useMemo(() => {
        const groups = {};
        relatedQuotes.forEach(q => {
            if (!groups[q.skuId]) groups[q.skuId] = [];
            groups[q.skuId].push(q);
        });

        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => {
                const dateA = a.createdAt?.seconds ? a.createdAt.seconds : new Date(a.createdAt || 0).getTime();
                const dateB = b.createdAt?.seconds ? b.createdAt.seconds : new Date(b.createdAt || 0).getTime();
                return dateB - dateA;
            });
        });

        return Object.keys(groups).map(skuId => ({ skuId, quotes: groups[skuId] }));
    }, [relatedQuotes]);

    // 3. FINAL GATE: Stop rendering if closed
    if (!detailView.open || !rawCompanyData) return null;

    // --- ACTION HANDLERS ---

    const toggleOrderPayment = async (order, termIdx) => {
        const newTerms = [...order.paymentTerms];
        newTerms[termIdx].status = newTerms[termIdx].status === 'Paid' ? 'Pending' : 'Paid';
        await actions.update('orders', order.id, { paymentTerms: newTerms });
    };

    const updateOrderDoc = async (order, docName, field, value) => {
        const currentDoc = order.docRequirements?.[docName] || {};
        const newDoc = { ...currentDoc, [field]: value };
        const newReqs = { ...order.docRequirements, [docName]: newDoc };
        await actions.update('orders', order.id, { docRequirements: newReqs });
    };

    return (
        <div className="fixed inset-0 bg-white z-[60] overflow-y-auto animate-fade-in scroller">
            {/* --- ERPNext-Style Header --- */}
            <header className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white sticky top-0 z-50">
                <div className="flex items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span className="hover:text-blue-600 cursor-pointer transition-colors" onClick={() => setDetailView({ open: false, type: null, data: null })}>DESK</span>
                    <Icons.ChevronRight className="w-3.5 h-3.5 mx-2 text-slate-300" />
                    <span className="text-slate-400">{isVendor ? 'VENDORS' : 'CLIENTS'}</span>
                    <Icons.ChevronRight className="w-3.5 h-3.5 mx-2 text-slate-300" />
                    <span className="text-slate-900 font-bold">{companyData.companyName}</span>
                    <div className="ml-4 flex items-center gap-1.5">
                        <Badge size="xs" color={isVendor ? 'purple' : 'green'}>{isVendor ? 'Vendor' : 'Client'}</Badge>
                        <span className="text-[10px] text-slate-300">•</span>
                        <span className="text-[10px] text-slate-400">{companyData.country}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-3 mr-4 pr-4 border-r border-slate-100">
                        {companyData.website && <a href={companyData.website} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600 p-1 transition-colors" title="Website"><Icons.ExternalLink className="w-3.5 h-3.5" /></a>}
                        {companyData.driveLink && <a href={companyData.driveLink} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600 p-1 transition-colors" title="Drive Folder"><Icons.Folder className="w-3.5 h-3.5" /></a>}
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => setModal({ open: true, type: isVendor ? 'vendor' : 'client', data: companyData, isEdit: true })} icon={Icons.Edit} className="h-8 text-[11px] font-bold uppercase tracking-wider">Edit Profile</Button>
                    <Button variant="secondary" size="sm" onClick={() => setDetailView({ open: false, type: null, data: null })} icon={Icons.X} className="h-8 text-[11px] font-bold uppercase tracking-wider">Close</Button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-8 space-y-10">
                {/* Summary Row - No Boxes */}
                <div className="flex flex-wrap gap-12 items-end">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1.5">Potential Value</p>
                        <h3 className={`text-2xl font-bold ${isVendor ? 'text-purple-600' : 'text-blue-600'}`}>{formatMoney(potentialValue)}</h3>
                    </div>
                    <div className="w-px h-10 bg-slate-100 hidden md:block"></div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1.5">Lifetime Revenue</p>
                        <h3 className="text-2xl font-bold text-slate-900">{formatMoney(totalOrderValue)}</h3>
                    </div>
                    <div className="w-px h-10 bg-slate-100 hidden md:block"></div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1.5 transition-all">Engagement</p>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            <span className="text-[12px] font-bold text-slate-700 uppercase">Active Relationship</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="space-y-10">
                        {/* Actions List - Flattened */}
                        <div>
                            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                                <h3 className="font-bold text-slate-900 text-[11px] uppercase tracking-wider flex items-center gap-2">
                                    <Icons.Task className="w-3.5 h-3.5 text-slate-400" />
                                    Open Actions
                                </h3>
                                <button onClick={() => setModal({ open: true, type: 'task', data: { contextType: isVendor ? 'Vendor' : 'Client', relatedId: companyData.id, relatedName: companyData.companyName } })} className="text-[10px] font-bold text-blue-600 hover:underline uppercase">Add Task</button>
                            </div>
                            <div className="space-y-1">
                                {sortedTasks.map(t => (
                                    <div key={t.id} className="detail-task-wrapper">
                                        <InlineTask task={t} crud={actions} userProfiles={userProfiles} />
                                    </div>
                                ))}
                                {sortedTasks.length === 0 && <div className="text-[11px] text-slate-400 py-10 text-center uppercase tracking-widest bg-slate-50/50 border border-dashed border-slate-200 rounded">No pending tasks</div>}
                            </div>
                        </div>

                        {/* Contacts List - No boxes inside */}
                        <div>
                            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                                <h3 className="font-bold text-slate-900 text-[11px] uppercase tracking-wider flex items-center gap-2">
                                    <Icons.Contact className="w-3.5 h-3.5 text-slate-400" />
                                    Key Contacts
                                </h3>
                                <button onClick={() => setModal({ open: true, type: 'contact', data: { companyId: companyData.id } })} className="text-[10px] font-bold text-blue-600 hover:underline uppercase">Add New</button>
                            </div>
                            <div className="divide-y divide-slate-100 border-t border-slate-100">
                                {relatedContacts.map(c => (
                                    <div
                                        key={c.id}
                                        onClick={() => setModal({ open: true, type: 'contact', data: c, isEdit: true })}
                                        className="py-3 flex justify-between items-center group cursor-pointer"
                                    >
                                        <div>
                                            <div className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors uppercase tracking-tight">{c.name}</div>
                                            <div className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">{c.role}</div>
                                        </div>
                                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {c.email && <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} className="p-1 hover:text-blue-600"><Icons.Mail className="w-3.5 h-3.5" /></a>}
                                            {c.phone && <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} className="p-1 hover:text-green-600"><Icons.Phone className="w-3.5 h-3.5" /></a>}
                                            {c.linkedin && <a href={c.linkedin} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="p-1 hover:text-blue-800"><Icons.Linkedin className="w-3.5 h-3.5" /></a>}
                                        </div>
                                    </div>
                                ))}
                                {relatedContacts.length === 0 && <div className="text-[11px] text-slate-400 py-6 text-center italic uppercase tracking-widest opacity-60">None listed</div>}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-10">
                        {/* Fulfillment History - Clean Layout */}
                        <div>
                            <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
                                <h3 className="font-bold text-slate-900 text-[11px] uppercase tracking-wider flex items-center gap-2">
                                    <Icons.Box className="w-3.5 h-3.5 text-slate-400" />
                                    Order Lifecycle
                                </h3>
                                <button onClick={() => setModal({ open: true, type: 'order', data: { companyId: companyData.id } })} className="text-[10px] font-bold text-blue-600 hover:underline uppercase">New Order</button>
                            </div>
                            <div className="space-y-10">
                                {relatedOrders.length > 0 ? relatedOrders.map(order => {
                                    const s = skus.find(x => x.id === order.skuId);
                                    const p = products.find(x => x.id === s?.productId);
                                    const docReqs = order.docRequirements || {};

                                    return (
                                        <div key={order.id} className="group">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="font-mono text-[10px] font-bold text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded leading-none bg-slate-50 uppercase">#{order.orderId}</span>
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{formatDate(order.date)}</span>
                                                    </div>
                                                    <div className="text-base font-bold text-slate-900 uppercase">
                                                        {p?.name} <span className="text-slate-500 font-medium ml-1">({p?.format})</span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 font-medium mt-1">
                                                        {s?.variant} • {s?.packSize}{s?.unit} • {s?.packType} • {s?.flavour}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-wider">
                                                        {order.qty} units @ {formatMoney(order.rate)}
                                                    </div>
                                                </div>
                                                <div className="text-right flex items-center gap-8">
                                                    <div>
                                                        <div className="text-2xl font-bold text-slate-900 tracking-tight">{formatMoney(order.amount)}</div>
                                                        <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Total Payable</div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => setModal({ open: true, type: 'order', data: order, isEdit: true })} className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-blue-600 transition-colors"><Icons.Edit className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => actions.del('orders', order.id)} className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-red-500 transition-colors"><Icons.Trash className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-6 border-t border-slate-100">
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mb-4">Milestones</p>
                                                    <div className="space-y-1 font-medium">
                                                        {(order.paymentTerms || []).map((term, i) => (
                                                            <div key={i} className="flex justify-between items-center py-1.5">
                                                                <div className="text-[11px]">
                                                                    <span className="text-slate-800 uppercase tracking-tight">{term.label}</span>
                                                                    <span className="text-slate-400 ml-1.5">({term.percent}%)</span>
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    <span className="font-mono text-[11px] text-slate-700">{formatMoney((order.amount * term.percent) / 100)}</span>
                                                                    <button
                                                                        onClick={() => toggleOrderPayment(order, i)}
                                                                        className={`text-[9px] font-bold uppercase tracking-wider ${term.status === 'Paid' ? 'text-green-600' : 'text-slate-400 hover:text-blue-600'}`}
                                                                    >
                                                                        {term.status === 'Paid' ? 'Paid✓' : 'Mark Paid'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mb-4">Legal & Compliance</p>
                                                    <div className="grid grid-cols-1 gap-1">
                                                        {Object.entries(docReqs).map(([docName, status]) => (
                                                            <div key={docName} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                                                                <label className="flex items-center gap-3 text-[11px] font-medium text-slate-700 cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={status.received}
                                                                        onChange={(e) => updateOrderDoc(order, docName, 'received', e.target.checked)}
                                                                        className="rounded border-slate-300 text-blue-600 focus:ring-0 w-3 h-3 hover:border-blue-400"
                                                                    />
                                                                    <span className="uppercase tracking-tight">{docName}</span>
                                                                </label>
                                                                <div className="flex items-center gap-3">
                                                                    {status.link && <a href={status.link} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700"><Icons.Link className="w-3.5 h-3.5" /></a>}
                                                                    {!status.link && (
                                                                        <input
                                                                            placeholder="DRIVE LINK..."
                                                                            className="text-[9px] font-mono border-none outline-none w-24 bg-transparent text-slate-400 focus:text-blue-600 transition-all font-medium italic"
                                                                            onBlur={(e) => updateOrderDoc(order, docName, 'link', e.target.value)}
                                                                        />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="py-16 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-lg">
                                        <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Registry Empty</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Market Quotations - Flattened Layout */}
                        <div>
                            <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
                                <h3 className="font-bold text-slate-900 text-[11px] uppercase tracking-wider flex items-center gap-2">
                                    <Icons.Product className="w-3.5 h-3.5 text-slate-400" />
                                    {isVendor ? 'Purchase Catalog' : 'Active Quotes'}
                                </h3>
                                <button onClick={() => setModal({ open: true, type: isVendor ? 'quoteReceived' : 'quoteSent', data: isVendor ? { vendorId: companyData.id } : { clientId: companyData.id } })} className="text-[10px] font-bold text-blue-600 hover:underline uppercase">Add Record</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                {quoteGroups.map(group => {
                                    const primaryQuote = group.quotes[0];
                                    const s = skus.find(x => x.id === primaryQuote.skuId);
                                    const p = products.find(x => x.id === s?.productId);

                                    let displayStatus = primaryQuote.status || 'Draft';
                                    let statusColor = 'blue';

                                    if (isVendor) {
                                        const linkedSalesQuotes = quotesSent.filter(sq => sq.baseCostId === primaryQuote.id);
                                        const isLinkedActive = linkedSalesQuotes.some(sq => sq.status === 'Active');
                                        if (isLinkedActive) {
                                            displayStatus = 'Active';
                                            statusColor = 'green';
                                        }
                                    } else {
                                        if (primaryQuote.status === 'Active') statusColor = 'green';
                                        else if (primaryQuote.status === 'Closed') statusColor = 'slate';
                                    }

                                    return (
                                        <div key={group.skuId} className="group">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <div className="text-[13px] font-bold text-slate-900 uppercase tracking-tight">
                                                        {p?.name}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 font-medium mt-0.5 uppercase tracking-wide">
                                                        {s?.variant} • {s?.packSize}{s?.unit}
                                                    </div>
                                                </div>
                                                <Badge size="xs" color={statusColor}>{displayStatus}</Badge>
                                            </div>
                                            <div className="space-y-4 border-t border-slate-50 pt-4">
                                                {group.quotes.map((q, idx) => {
                                                    const investment = q.price * q.moq;
                                                    const marginPerUnit = !isVendor ? (q.sellingPrice - q.baseCostPrice) : 0;
                                                    const totalMargin = marginPerUnit * q.moq;
                                                    const marginColor = marginPerUnit < 0 ? 'text-red-500' : 'text-green-600';
                                                    const rowOpacity = idx === 0 ? 'opacity-100' : 'opacity-40 hover:opacity-100 transition-opacity';

                                                    return (
                                                        <div key={q.id} className={`${rowOpacity}`}>
                                                            <div className="flex justify-between items-end mb-1">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">{isVendor ? 'Rate/Unit' : 'Our Price'}</span>
                                                                    <span className="text-[12px] font-bold text-slate-800">{formatMoney(isVendor ? q.price : q.sellingPrice)}</span>
                                                                </div>
                                                                <div className="flex flex-col text-right">
                                                                    <span className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">{isVendor ? 'Investment' : 'Est. Margin'}</span>
                                                                    <span className={`${isVendor ? 'text-slate-900' : marginColor} text-[12px] font-bold`}>
                                                                        {isVendor ? formatMoney(investment) : formatMoney(totalMargin)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between items-center text-[9px] font-medium text-slate-400">
                                                                <span>MOQ: {q.moq} UNITS</span>
                                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => setModal({ open: true, type: isVendor ? 'quoteReceived' : 'quoteSent', data: q, isEdit: true })} className="text-blue-500 hover:text-blue-700 font-bold uppercase">Edit</button>
                                                                    <span className="text-slate-200">|</span>
                                                                    <span className="font-mono">{formatDate(q.createdAt)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};