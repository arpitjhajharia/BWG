/* eslint-disable react-hooks/preserve-manual-memoization */
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

    // 2. Safe Filtering: Check if companyData.id exists before filtering
    // If modal is closed (companyData.id is undefined), these arrays become empty []
    const relatedContacts = companyData.id ? contacts.filter(c => c.companyId === companyData.id) : [];

    const relatedTasks = companyData.id ? tasks.filter(t =>
        t.relatedId === companyData.id ||
        t.relatedClientId === companyData.id ||
        t.relatedVendorId === companyData.id
    ) : [];

    const relatedQuotes = companyData.id ? (
        isVendor
            ? quotesReceived.filter(q => q.vendorId === companyData.id)
            : quotesSent.filter(q => q.clientId === companyData.id)
    ) : [];

    const relatedOrders = companyData.id ? orders.filter(o => o.companyId === companyData.id).sort((a, b) => b.date.localeCompare(a.date)) : [];

    // Sort Tasks
    const sortedTasks = [...relatedTasks].sort((a, b) => {
        if (a.status === 'Completed' && b.status !== 'Completed') return 1;
        if (a.status !== 'Completed' && b.status === 'Completed') return -1;
        return new Date(a.dueDate || '9999-12-31') - new Date(b.dueDate || '9999-12-31');
    });

    // Calculate Values
    let potentialValue = 0;
    if (companyData.id) {
        if (isVendor) {
            potentialValue = relatedQuotes.reduce((acc, q) => acc + (q.price * q.moq), 0);
        } else {
            potentialValue = relatedQuotes.filter(q => q.status === 'Active').reduce((acc, q) => acc + (q.sellingPrice * q.moq), 0);
        }
    }
    const totalOrderValue = relatedOrders.reduce((acc, o) => acc + (o.amount || 0), 0);

    // Group Quotes (Now safe because relatedQuotes is [] if closed)
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
        <div className="fixed inset-0 bg-white z-40 overflow-y-auto animate-fade-in">
            <div className="bg-slate-900 text-white p-6 sticky top-0 z-50 shadow-lg">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge color={isVendor ? 'purple' : 'green'}>{isVendor ? 'VENDOR' : 'CLIENT'}</Badge>
                            <span className="text-slate-400 text-sm flex items-center gap-1"><span className="w-1 h-1 bg-slate-500 rounded-full"></span> {companyData.country}</span>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">{companyData.companyName}</h1>
                        <div className="flex gap-6 mt-2">
                            <div className={`text-sm font-medium ${isVendor ? 'text-purple-300' : 'text-green-400'}`}>
                                <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Potential Value</span>
                                {formatMoney(potentialValue)}
                            </div>
                            <div className="text-sm font-medium text-blue-300">
                                <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Total Order Value</span>
                                {formatMoney(totalOrderValue)}
                            </div>
                        </div>
                        <div className="flex items-center gap-4 mt-4 text-sm text-slate-400">
                            {companyData.website && <a href={companyData.website} target="_blank" className="flex items-center gap-1 hover:text-white transition-colors"><Icons.ExternalLink className="w-4 h-4" /> Website</a>}
                            {companyData.driveLink && <a href={companyData.driveLink} target="_blank" className="flex items-center gap-1 hover:text-white transition-colors"><Icons.Link className="w-4 h-4" /> Drive Folder</a>}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setModal({ open: true, type: isVendor ? 'vendor' : 'client', data: companyData, isEdit: true })} icon={Icons.Edit}>Edit</Button>
                        <Button variant="secondary" onClick={() => setDetailView({ open: false, type: null, data: null })} icon={Icons.X}>Close</Button>
                    </div>
                </div>
            </div>
            <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="space-y-6">
                    <Card className="p-5 flex flex-col h-[500px]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wide"><Icons.Task className="w-4 h-4 text-slate-400" /> Actions</h3>
                            <button onClick={() => setModal({ open: true, type: 'task', data: { contextType: isVendor ? 'Vendor' : 'Client', relatedId: companyData.id, relatedName: companyData.companyName } })} className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded">+ Add</button>
                        </div>
                        <div className="flex-1 overflow-y-auto scroller pr-1 -mr-1">
                            {sortedTasks.map(t => <InlineTask key={t.id} task={t} crud={actions} userProfiles={userProfiles} />)}
                        </div>
                    </Card>
                    <Card className="p-5">
                        <h3 className="font-bold text-slate-700 mb-4 flex gap-2 items-center text-sm uppercase tracking-wide"><Icons.Contact className="w-4 h-4 text-slate-400" /> Key People</h3>
                        {relatedContacts.map(c => (
                            <div
                                key={c.id}
                                // 1. Clicking the card opens the Edit Modal
                                onClick={() => setModal({ open: true, type: 'contact', data: c, isEdit: true })}
                                className="p-3 bg-slate-50 mb-2 rounded-lg border border-slate-100 flex justify-between items-center group hover:border-blue-200 hover:bg-blue-50/50 transition-all cursor-pointer relative"
                            >
                                <div>
                                    <div className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">
                                        {c.name}
                                    </div>
                                    <div className="text-xs text-slate-500">{c.role}</div>
                                </div>

                                <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                    {/* 2. Action Buttons use stopPropagation to avoid opening the modal */}
                                    {c.email && (
                                        <a
                                            href={`mailto:${c.email}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-1.5 bg-white rounded-full text-blue-500 shadow-sm hover:text-blue-700 hover:scale-110 transition-transform"
                                            title="Send Email"
                                        >
                                            <Icons.Mail className="w-3.5 h-3.5" />
                                        </a>
                                    )}
                                    {c.phone && (
                                        <a
                                            href={`tel:${c.phone}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-1.5 bg-white rounded-full text-green-500 shadow-sm hover:text-green-700 hover:scale-110 transition-transform"
                                            title="Call"
                                        >
                                            <Icons.Phone className="w-3.5 h-3.5" />
                                        </a>
                                    )}
                                    {c.linkedin && (
                                        <a
                                            href={c.linkedin}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-1.5 bg-white rounded-full text-blue-700 shadow-sm hover:text-blue-900 hover:scale-110 transition-transform"
                                            title="Open LinkedIn"
                                        >
                                            <Icons.Linkedin className="w-3.5 h-3.5" />
                                        </a>
                                    )}
                                    {/* Visual cue that the card is editable */}
                                    <div className="p-1.5 text-slate-300 group-hover:text-blue-400">
                                        <Icons.Edit className="w-3.5 h-3.5" />
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button onClick={() => setModal({ open: true, type: 'contact', data: { companyId: companyData.id } })} className="w-full mt-2 text-xs py-2 border border-dashed border-slate-300 rounded text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors">+ Add Contact</button>
                    </Card>
                </div>
                <div className="lg:col-span-2 space-y-6">
                    {/* ORDER HISTORY */}
                    <Card className="p-5 bg-blue-50/30 border-blue-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                                <Icons.Box className="w-5 h-5 text-blue-600" />
                                Order History
                            </h3>
                            <Button size="sm" onClick={() => setModal({ open: true, type: 'order', data: { companyId: companyData.id } })}>+ New Order</Button>
                        </div>
                        <div className="space-y-4">
                            {relatedOrders.length > 0 ? relatedOrders.map(order => {
                                const s = skus.find(x => x.id === order.skuId);
                                const p = products.find(x => x.id === s?.productId);
                                const docReqs = order.docRequirements || {};

                                return (
                                    <div key={order.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group">
                                        <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-50">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-mono text-xs font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">#{order.orderId}</span>
                                                    <span className="text-xs text-slate-400">{formatDate(order.date)}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-lg font-bold text-slate-800">
                                                    {p?.name || 'Unknown Product'}
                                                    <Badge size="xs" color="slate">{p?.format}</Badge>
                                                </div>
                                                <div className="text-xs text-slate-500 font-medium mt-0.5">
                                                    {s?.variant} • {s?.packSize}{s?.unit} • {s?.packType} • {s?.flavour}
                                                </div>
                                                <div className="text-xs text-slate-600 mt-1 font-mono bg-slate-50 inline-block px-1 rounded">
                                                    {order.qty} units @ {formatMoney(order.rate)} (+{order.taxRate}% tax)
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-4">
                                                <div>
                                                    <div className="text-lg font-bold text-slate-800">{formatMoney(order.amount)}</div>
                                                    <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Total Amount</div>
                                                </div>
                                                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setModal({ open: true, type: 'order', data: order, isEdit: true })} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Icons.Edit className="w-4 h-4" /></button>
                                                    <button onClick={() => actions.del('orders', order.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Icons.Trash className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50/50 p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Payment Milestones</h4>
                                                <div className="space-y-2">
                                                    {(order.paymentTerms || []).map((term, i) => (
                                                        <div key={i} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-slate-100">
                                                            <div>
                                                                <span className="font-medium text-slate-700">{term.label}</span>
                                                                <span className="text-slate-400 ml-1">({term.percent}%)</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono">{formatMoney((order.amount * term.percent) / 100)}</span>
                                                                <button
                                                                    onClick={() => toggleOrderPayment(order, i)}
                                                                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] transition-colors ${term.status === 'Paid' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}
                                                                >
                                                                    {term.status}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {(!order.paymentTerms || order.paymentTerms.length === 0) && <div className="text-xs text-slate-400 italic">No terms defined</div>}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Document Checklist</h4>
                                                <div className="space-y-2">
                                                    {Object.keys(docReqs).length > 0 ? Object.entries(docReqs).map(([docName, status]) => (
                                                        <div key={docName} className="flex flex-col gap-1 bg-white p-2 rounded border border-slate-100">
                                                            <div className="flex justify-between items-center">
                                                                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={status.received}
                                                                        onChange={(e) => updateOrderDoc(order, docName, 'received', e.target.checked)}
                                                                        className="rounded text-green-600 focus:ring-0 w-3 h-3"
                                                                    />
                                                                    {docName}
                                                                </label>
                                                                {status.link && <a href={status.link} target="_blank" className="text-blue-500 hover:underline text-[10px] flex items-center gap-1"><Icons.Link className="w-3 h-3" /> View</a>}
                                                            </div>
                                                            {status.received && (
                                                                <input
                                                                    placeholder="Paste Drive Link..."
                                                                    className="text-[10px] border-b border-slate-200 focus:border-blue-500 outline-none w-full bg-transparent"
                                                                    value={status.link || ''}
                                                                    onChange={(e) => updateOrderDoc(order, docName, 'link', e.target.value)}
                                                                />
                                                            )}
                                                        </div>
                                                    )) : <div className="text-xs text-slate-400 italic">No documents required.</div>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="text-center py-8 text-slate-400 italic border-2 border-dashed border-slate-200 rounded-lg">No orders recorded yet.</div>
                            )}
                        </div>
                    </Card>

                    {/* EXISTING QUOTES */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                                <Icons.Product className="w-5 h-5 text-blue-600" />
                                {isVendor ? 'Purchase Quotes' : 'Product Interests'}
                            </h3>
                            <Button size="sm" onClick={() => setModal({ open: true, type: isVendor ? 'quoteReceived' : 'quoteSent', data: isVendor ? { vendorId: companyData.id } : { clientId: companyData.id } })}>+ New Quote</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    <div key={group.skuId + (primaryQuote.id)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all relative group flex flex-col">
                                        <div className="flex justify-between items-start mb-3 border-b border-slate-50 pb-2">
                                            <div>
                                                <div className="font-bold text-slate-800 text-lg leading-tight flex items-center gap-2">
                                                    {p?.name || 'Unknown Product'}
                                                    {p?.format && <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded tracking-wide">{p.format}</span>}
                                                </div>
                                                <div className="text-xs text-slate-500 font-medium mt-1">
                                                    {s?.variant} • {s?.packSize}{s?.unit} • {s?.packType} • {s?.flavour}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge color={statusColor}>{displayStatus}</Badge>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            {group.quotes.map((q, idx) => {
                                                const investment = q.price * q.moq;
                                                const baseQ = isVendor ? null : quotesReceived.find(bq => bq.id === q.baseCostId);
                                                const marginPerUnit = !isVendor ? (q.sellingPrice - q.baseCostPrice) : 0;
                                                const totalMargin = marginPerUnit * q.moq;
                                                const marginColor = marginPerUnit < 0 ? 'text-red-600' : 'text-green-600';
                                                const rowOpacity = idx === 0 ? 'opacity-100' : 'opacity-60 hover:opacity-100 transition-opacity';

                                                return (
                                                    <div key={q.id} className={`grid grid-cols-[1.5fr_1fr_1fr_auto] items-center gap-2 text-sm ${idx > 0 ? 'border-t border-slate-50 pt-2' : ''} ${rowOpacity} group/line`}>
                                                        <div className="text-left">
                                                            {idx === 0 && <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">{isVendor ? 'Unit Rate' : 'Base Cost'}</div>}
                                                            <div className="text-sm text-slate-700 font-medium">
                                                                {formatMoney(isVendor ? q.price : q.baseCostPrice)}
                                                                <span className="text-slate-400 text-xs font-normal"> / u</span>
                                                            </div>
                                                            <div className="text-[10px] text-slate-500">MOQ: {isVendor ? q.moq : (baseQ?.moq || 'N/A')}</div>
                                                        </div>
                                                        <div className="text-center relative">
                                                            {idx === 0 && <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">{isVendor ? 'Investment' : 'Selling Price'}</div>}
                                                            <div className={`font-medium text-sm ${isVendor ? 'text-purple-700' : 'text-slate-700'}`}>
                                                                {isVendor ? formatMoney(investment) : formatMoney(q.sellingPrice)}
                                                                {!isVendor && <span className="text-slate-400 text-xs font-normal"> / u</span>}
                                                            </div>
                                                            {!isVendor && <div className="text-[10px] text-slate-500">MOQ: {q.moq}</div>}
                                                        </div>
                                                        <div className="text-right">
                                                            {isVendor ? (
                                                                <div>
                                                                    {idx === 0 && <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Date</div>}
                                                                    <div className="text-xs font-medium text-slate-600">{formatDate(q.createdAt)}</div>
                                                                </div>
                                                            ) : (
                                                                <div>
                                                                    {idx === 0 && <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Margin</div>}
                                                                    <div className={`${marginColor} text-lg font-bold leading-none`}>{formatMoney(totalMargin)}</div>
                                                                    <div className={`${marginColor} text-[10px] mt-0.5`}>{formatMoney(marginPerUnit)} / u</div>
                                                                    <div className="text-[9px] text-slate-300 mt-0.5">{formatDate(q.createdAt)}</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="w-16 flex justify-end gap-1 opacity-0 group-hover/line:opacity-100 transition-opacity">
                                                            <button onClick={() => setModal({ open: true, type: isVendor ? 'quoteReceived' : 'quoteSent', data: q, isEdit: true })} className="text-blue-500 p-1 hover:bg-blue-50 rounded"><Icons.Edit className="w-3 h-3" /></button>
                                                            {q.driveLink && <a href={q.driveLink} target="_blank" className="text-slate-500 p-1 hover:bg-slate-50 rounded"><Icons.File className="w-3 h-3" /></a>}
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
    );
};