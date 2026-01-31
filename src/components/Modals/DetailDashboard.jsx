import React, { useMemo, useState } from 'react';
import { Icons } from '../ui/Icons';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { formatMoney, formatDate } from '../../utils/helpers';

// --- Local Compact Task Component ---
const CompactTaskRow = ({ task, crud, userProfiles, setModal }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(task.title);

    const handleUpdate = (updates) => crud.update('tasks', task.id, updates);
    const handleTitleBlur = () => {
        setIsEditing(false);
        if (title !== task.title) handleUpdate({ title });
    };

    return (
        <div className="group flex items-center gap-3 py-1.5 px-2 hover:bg-slate-50 rounded-md transition-colors border-b border-slate-50 last:border-0 relative">
            <input
                type="checkbox"
                checked={task.status === 'Completed'}
                onChange={(e) => handleUpdate({ status: e.target.checked ? 'Completed' : 'Pending' })}
                className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
            />
            <div className="flex-1 min-w-0 flex items-center gap-2">
                {isEditing ? (
                    <input
                        className="flex-1 bg-transparent border-b border-blue-400 focus:outline-none text-[12px] py-0"
                        value={title}
                        autoFocus
                        onBlur={handleTitleBlur}
                        onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                ) : (
                    <span
                        className={`flex-1 text-[12px] truncate cursor-text ${task.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}
                        onDoubleClick={() => setIsEditing(true)}
                    >
                        {task.title}
                    </span>
                )}
                {task.dueDate && (
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded leading-none ${new Date(task.dueDate) < new Date() && task.status !== 'Completed' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                        {formatDate(task.dueDate)}
                    </span>
                )}
                {task.assignee && (
                    <div className="w-4 h-4 rounded-full bg-slate-200 text-[8px] flex items-center justify-center text-slate-600 font-bold shrink-0">
                        {task.assignee.charAt(0)}
                    </div>
                )}
            </div>
            <div className="opacity-0 group-hover:opacity-100 flex items-center absolute right-1 bg-slate-50 pl-2">
                <button onClick={() => setModal({ open: true, type: 'task', data: task, isEdit: true })} className="p-1 hover:text-blue-600 text-slate-400"><Icons.Edit className="w-3 h-3" /></button>
            </div>
        </div>
    );
};

// --- Local Compact Order Component ---
const CompactOrderRow = ({ order, skus, products, actions, setModal, toggleOrderPayment, updateOrderDoc, isVendor }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const sku = skus.find(x => x.id === order.skuId);
    const product = products.find(x => x.id === sku?.productId);
    const docReqs = order.docRequirements || {};

    // Calculate Rate and Margin
    const unitRate = order.rate || (order.amount / (order.qty || 1));
    const totalMargin = !isVendor ? (order.amount - (order.baseCostPrice * order.qty)) : null;

    return (
        <div className="border-b border-slate-100 last:border-0 py-2">
            <div
                className="flex items-center gap-4 py-2 px-2 hover:bg-slate-50 rounded cursor-pointer transition-colors group"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="w-6 flex flex-col items-center">
                    <Icons.ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] font-bold text-slate-900 border border-slate-200 px-1.5 py-0.5 rounded bg-slate-50 shadow-sm leading-none">#{order.orderId}</span>
                        <div className="flex items-center gap-2 truncate">
                            <span className="text-[13px] font-bold text-slate-800 truncate uppercase">{product?.name}</span>
                            {product?.format && (
                                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded leading-none uppercase">{product.format}</span>
                            )}
                        </div>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1 ml-0.5">
                        {sku?.variant} • {sku?.packSize}{sku?.unit} • {sku?.packType} • {sku?.flavour}
                    </div>
                </div>

                <div className="text-right flex items-center gap-8 min-w-[200px]">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter leading-none mb-1">Rate</span>
                        <span className="text-[12px] font-bold text-slate-700">{formatMoney(unitRate)}</span>
                    </div>
                    {!isVendor && totalMargin !== null && (
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter leading-none mb-1">Margin</span>
                            <span className={`text-[12px] font-bold ${totalMargin >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatMoney(totalMargin)}</span>
                        </div>
                    )}
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter leading-none mb-1">Total</span>
                        <span className="text-[13px] font-bold text-slate-900">{formatMoney(order.amount)}</span>
                    </div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); setModal({ open: true, type: 'order', data: order, isEdit: true }); }} className="p-1.5 hover:bg-white rounded hover:text-blue-600 text-slate-400 shadow-sm border border-transparent hover:border-slate-100"><Icons.Edit className="w-3.5 h-3.5" /></button>
                </div>
            </div>

            {isExpanded && (
                <div className="ml-10 mt-3 mb-4 grid grid-cols-2 gap-8 text-[11px] animate-fade-in bg-slate-50/30 p-4 rounded-lg border border-slate-50">
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Payment Milestones</p>
                        <div className="space-y-0.5">
                            {(order.paymentTerms || []).map((term, i) => (
                                <div key={i} className="flex justify-between items-center px-1.5 py-1.5 rounded-md hover:bg-white transition-colors border border-transparent hover:border-slate-100 shadow-sm-hover">
                                    <span className="text-slate-600 uppercase tracking-tight font-medium">{term.label} ({term.percent}%)</span>
                                    <div className="flex items-center gap-4">
                                        <span className="font-mono text-slate-700 font-bold">{formatMoney((order.amount * term.percent) / 100)}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleOrderPayment(order, i); }}
                                            className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${term.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-700'}`}
                                        >
                                            {term.status === 'Paid' ? 'Paid✓' : 'Mark Paid'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Document Checklist</p>
                        <div className="space-y-0.5">
                            {Object.entries(docReqs).sort(([a], [b]) => a.localeCompare(b)).map(([docName, status]) => (
                                <div key={docName} className="flex items-center justify-between px-1.5 py-1.5 rounded-md hover:bg-white transition-colors border border-transparent hover:border-slate-100 shadow-sm-hover">
                                    <label className="flex items-center gap-2 cursor-pointer truncate">
                                        <input
                                            type="checkbox"
                                            checked={status.received}
                                            onChange={(e) => updateOrderDoc(order, docName, 'received', e.target.checked)}
                                            className="rounded border-slate-300 w-3.5 h-3.5 text-blue-600 focus:ring-0"
                                        />
                                        <span className="uppercase text-slate-600 tracking-tight font-medium truncate">{docName}</span>
                                    </label>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {status.link ? (
                                            <a href={status.link} target="_blank" rel="noreferrer" className="p-1 bg-blue-50 text-blue-500 hover:text-blue-700 rounded transition-colors" onClick={e => e.stopPropagation()}><Icons.Link className="w-3.5 h-3.5" /></a>
                                        ) : (
                                            <input
                                                placeholder="UPLOAD LINK..."
                                                className="text-[9px] font-mono border-none outline-none w-20 bg-slate-100/50 px-1.5 py-0.5 rounded text-slate-400 focus:text-blue-500 italic focus:bg-white"
                                                onClick={e => e.stopPropagation()}
                                                onBlur={(e) => updateOrderDoc(order, docName, 'link', e.target.value)}
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const DetailDashboard = ({ detailView, setDetailView, data, actions, setModal, userProfiles }) => {
    const { type, data: rawCompanyData } = detailView;
    const companyData = rawCompanyData || {};
    const { contacts, tasks, quotesReceived, quotesSent, orders, products, skus } = data;
    const isVendor = type === 'vendor';

    // Filters & Memos
    const relatedContacts = useMemo(() => companyData.id ? contacts.filter(c => c.companyId === companyData.id) : [], [contacts, companyData.id]);
    const relatedTasks = useMemo(() => companyData.id ? tasks.filter(t => t.relatedId === companyData.id || t.relatedClientId === companyData.id || t.relatedVendorId === companyData.id) : [], [tasks, companyData.id]);
    const relatedQuotes = useMemo(() => companyData.id ? (isVendor ? quotesReceived.filter(q => q.vendorId === companyData.id) : quotesSent.filter(q => q.clientId === companyData.id)) : [], [isVendor, quotesReceived, quotesSent, companyData.id]);
    const relatedOrders = useMemo(() => companyData.id ? orders.filter(o => o.companyId === companyData.id).sort((a, b) => b.date.localeCompare(a.date)) : [], [orders, companyData.id]);

    const sortedTasks = useMemo(() => [...relatedTasks].sort((a, b) => {
        if (a.status === 'Completed' && b.status !== 'Completed') return 1;
        if (a.status !== 'Completed' && b.status === 'Completed') return -1;
        return new Date(a.dueDate || '9999-12-31') - new Date(b.dueDate || '9999-12-31');
    }), [relatedTasks]);

    const { potentialValue, totalOrderValue } = useMemo(() => {
        let pv = 0;
        if (companyData.id) {
            if (isVendor) pv = relatedQuotes.reduce((acc, q) => acc + (q.price * (q.moq || 0)), 0);
            else pv = relatedQuotes.filter(q => q.status === 'Active').reduce((acc, q) => acc + (q.sellingPrice * (q.moq || 0)), 0);
        }
        const tov = relatedOrders.reduce((acc, o) => acc + (o.amount || 0), 0);
        return { potentialValue: pv, totalOrderValue: tov };
    }, [relatedQuotes, relatedOrders, isVendor, companyData.id]);

    const quoteGroups = useMemo(() => {
        const groups = {};
        relatedQuotes.forEach(q => {
            if (!groups[q.skuId]) groups[q.skuId] = [];
            groups[q.skuId].push(q);
        });
        return Object.keys(groups).map(skuId => ({
            skuId,
            quotes: groups[skuId].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        }));
    }, [relatedQuotes]);

    if (!detailView.open || !rawCompanyData) return null;

    // Handlers
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
        <div className="fixed inset-0 bg-slate-50/50 backdrop-blur-sm z-[60] overflow-y-auto animate-fade-in scroller">
            <div className="min-h-screen bg-white max-w-[1440px] mx-auto shadow-2xl flex flex-col">
                {/* --- Compact Professional Header --- */}
                <header className="h-12 border-b border-slate-100 flex items-center justify-between px-6 bg-white/80 backdrop-blur sticky top-0 z-50">
                    <div className="flex items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <span className="hover:text-blue-600 cursor-pointer transition-colors" onClick={() => setDetailView({ open: false, type: null, data: null })}>DESK</span>
                        <Icons.ChevronRight className="w-3 h-3 mx-2 text-slate-300" />
                        <span className="text-slate-900">{companyData.companyName}</span>
                        <Badge size="xs" color={isVendor ? 'purple' : 'green'} className="ml-3 uppercase px-1.5 py-0">{isVendor ? 'Vendor' : 'Client'}</Badge>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {companyData.website && <a href={companyData.website} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Icons.ExternalLink className="w-3.5 h-3.5" /></a>}
                        {companyData.driveLink && <a href={companyData.driveLink} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Icons.Folder className="w-3.5 h-3.5" /></a>}
                        <div className="w-px h-4 bg-slate-200 mx-2"></div>
                        <Button variant="secondary" size="sm" onClick={() => setModal({ open: true, type: isVendor ? 'vendor' : 'client', data: companyData, isEdit: true })} className="h-7 text-[10px] px-3">Edit Profile</Button>
                        <button onClick={() => setDetailView({ open: false, type: null, data: null })} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><Icons.X className="w-4 h-4" /></button>
                    </div>
                </header>

                <div className="p-8 scroller flex-1">
                    {/* --- KPI Summary Bar --- */}
                    <div className="flex gap-16 mb-12">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Potential</p>
                            <h3 className={`text-xl font-bold tracking-tight ${isVendor ? 'text-purple-600' : 'text-blue-600'}`}>{formatMoney(potentialValue)}</h3>
                        </div>
                        <div className="w-px h-8 bg-slate-100 my-auto"></div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Lifetime Revenue</p>
                            <h3 className="text-xl font-bold tracking-tight text-slate-900">{formatMoney(totalOrderValue)}</h3>
                        </div>
                        <div className="w-px h-8 bg-slate-100 my-auto"></div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Country</p>
                            <h3 className="text-xl font-bold tracking-tight text-slate-700">{companyData.country || '--'}</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        {/* LEFT COLUMN: Tasks & Contacts (4 cols) */}
                        <div className="lg:col-span-4 space-y-12">
                            {/* Tasks Section */}
                            <div>
                                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                                    <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                        <Icons.Task className="w-3.5 h-3.5 text-slate-400" /> Actions
                                    </h4>
                                    <button
                                        onClick={() => setModal({ open: true, type: 'task', data: { contextType: isVendor ? 'Vendor' : 'Client', relatedId: companyData.id, relatedName: companyData.companyName } })}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase"
                                    >+ New</button>
                                </div>
                                <div className="space-y-0.5">
                                    {sortedTasks.map(t => (
                                        <CompactTaskRow key={t.id} task={t} crud={actions} userProfiles={userProfiles} setModal={setModal} />
                                    ))}
                                    {sortedTasks.length === 0 && <div className="py-6 text-center text-[10px] text-slate-400 uppercase tracking-widest italic opacity-60">No pending actions</div>}
                                </div>
                            </div>

                            {/* Contacts Section */}
                            <div>
                                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                                    <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                        <Icons.Contact className="w-3.5 h-3.5 text-slate-400" /> Stakeholders
                                    </h4>
                                    <button
                                        onClick={() => setModal({ open: true, type: 'contact', data: { companyId: companyData.id } })}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase"
                                    >+ Add</button>
                                </div>
                                <div className="space-y-1">
                                    {relatedContacts.map(c => (
                                        <div
                                            key={c.id}
                                            className="group flex items-center justify-between p-2 hover:bg-slate-50 rounded-md transition-colors cursor-pointer border border-transparent hover:border-slate-100"
                                            onClick={() => setModal({ open: true, type: 'contact', data: c, isEdit: true })}
                                        >
                                            <div className="min-w-0">
                                                <div className="text-[12px] font-bold text-slate-900 truncate uppercase leading-tight group-hover:text-blue-600 transition-colors">{c.name}</div>
                                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">{c.role || '--'}</div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                                                {c.email && <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} className="p-1 text-slate-400 hover:text-blue-600"><Icons.Mail className="w-3 h-3" /></a>}
                                                {c.phone && <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} className="p-1 text-slate-400 hover:text-green-600"><Icons.Phone className="w-3 h-3" /></a>}
                                            </div>
                                        </div>
                                    ))}
                                    {relatedContacts.length === 0 && <div className="py-6 text-center text-[10px] text-slate-400 uppercase tracking-widest italic opacity-60">None listed</div>}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Orders & RFQs (8 cols) */}
                        <div className="lg:col-span-8 space-y-12">
                            {/* Orders Section */}
                            <div>
                                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                                    <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                        <Icons.Box className="w-3.5 h-3.5 text-slate-400" /> Active Orders
                                    </h4>
                                    <button
                                        onClick={() => setModal({ open: true, type: 'order', data: { companyId: companyData.id } })}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase"
                                    >+ New Order</button>
                                </div>
                                <div className="bg-white rounded-lg border border-slate-100 divide-y divide-slate-50 shadow-sm overflow-hidden">
                                    {relatedOrders.map(order => (
                                        <CompactOrderRow
                                            key={order.id}
                                            order={order}
                                            skus={skus}
                                            products={products}
                                            actions={actions}
                                            setModal={setModal}
                                            toggleOrderPayment={toggleOrderPayment}
                                            updateOrderDoc={updateOrderDoc}
                                            isVendor={isVendor}
                                        />
                                    ))}
                                    {relatedOrders.length === 0 && <div className="py-20 text-center text-[11px] text-slate-400 uppercase tracking-widest font-bold">No order history</div>}
                                </div>
                            </div>

                            {/* Quotations Section */}
                            <div>
                                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                                    <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                        <Icons.Product className="w-3.5 h-3.5 text-slate-400" /> {isVendor ? 'Purchase Quotes' : 'Active Quotations'}
                                    </h4>
                                    <button
                                        onClick={() => setModal({ open: true, type: isVendor ? 'quoteReceived' : 'quoteSent', data: isVendor ? { vendorId: companyData.id } : { clientId: companyData.id } })}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase"
                                    >+ Add Quote</button>
                                </div>
                                <div className="space-y-6">
                                    {quoteGroups.map(group => {
                                        const sku = skus.find(x => x.id === group.skuId);
                                        const product = products.find(x => x.id === sku?.productId);
                                        const latestQuote = group.quotes[0];
                                        const historyQuotes = group.quotes.slice(1);

                                        return (
                                            <QuoteCard
                                                key={group.skuId}
                                                sku={sku}
                                                product={product}
                                                latestQuote={latestQuote}
                                                historyQuotes={historyQuotes}
                                                isVendor={isVendor}
                                                setModal={setModal}
                                            />
                                        );
                                    })}
                                    {quoteGroups.length === 0 && <div className="py-12 text-center text-[10px] text-slate-400 uppercase tracking-widest italic border border-dashed border-slate-200 rounded-lg">No quotation records</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Local Quote Card Component ---
const QuoteCard = ({ sku, product, latestQuote, historyQuotes, isVendor, setModal }) => {
    const [showHistory, setShowHistory] = useState(false);
    const rate = isVendor ? latestQuote.price : latestQuote.sellingPrice;
    const investment = rate * (latestQuote.moq || 0);
    const dateStr = latestQuote.createdAt ? formatDate(latestQuote.createdAt.toDate ? latestQuote.createdAt.toDate() : latestQuote.createdAt) : '--';
    const shortDate = dateStr.split(' ').slice(0, 2).join('-'); // e.g. "26-Jan"

    return (
        <div className="group/card bg-white rounded-lg border border-slate-100 p-3 shadow-sm hover:shadow-md transition-all duration-300">
            {/* Header: SKU Code & Format */}
            <div className="flex justify-between items-center mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[12px] font-bold text-slate-900 border-l-2 border-blue-500 pl-2 uppercase tracking-tight truncate">
                        {sku?.name || 'NO-SKU'}
                    </span>
                    {product?.format && (
                        <span className="text-[8px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded leading-none uppercase shrink-0">
                            {product.format}
                        </span>
                    )}
                    <span className="text-[10px] text-slate-400 font-medium truncate italic shrink-0">
                        {sku?.variant}
                    </span>
                </div>
                <button
                    onClick={() => setModal({ open: true, type: isVendor ? 'quoteReceived' : 'quoteSent', data: latestQuote, isEdit: true })}
                    className="p-1 opacity-0 group-hover/card:opacity-100 hover:bg-slate-50 rounded text-slate-400 hover:text-blue-600 transition-all shadow-sm"
                >
                    <Icons.Edit className="w-3 h-3" />
                </button>
            </div>

            {/* Metrics Row (Consolidated & Compact) */}
            <div className="flex items-center justify-between bg-slate-50/50 p-2 rounded-md">
                <div className="flex items-center gap-6">
                    {/* Unit Rate */}
                    <div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter block leading-none mb-0.5">Rate</span>
                        <div className="flex items-baseline gap-0.5">
                            <span className="text-[13px] font-bold text-slate-800">{formatMoney(rate).split('.')[0]}</span>
                            <span className="text-[9px] font-bold text-slate-400 italic">/u</span>
                        </div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter leading-none">MOQ: {latestQuote.moq}</span>
                    </div>

                    {/* Investment */}
                    <div className="border-l border-slate-200 pl-4">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter block leading-none mb-0.5">Investment</span>
                        <span className="text-[13px] font-bold text-purple-600">{formatMoney(investment).split('.')[0]}</span>
                    </div>
                </div>

                {/* Date */}
                <div className="text-right">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter block leading-none mb-0.5">Date</span>
                    <span className="text-[12px] font-bold text-slate-600 tabular-nums">{shortDate}</span>
                </div>
            </div>

            {/* Collapsible History Toggle */}
            {historyQuotes.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-50">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full flex items-center justify-between text-[9px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-tight"
                    >
                        <span>View History ({historyQuotes.length})</span>
                        <Icons.ChevronRight className={`w-3 h-3 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
                    </button>

                    {showHistory && (
                        <div className="mt-2 space-y-1.5 animate-fade-in scroller max-h-32 overflow-y-auto pr-1">
                            {historyQuotes.map(q => {
                                const qRate = isVendor ? q.price : q.sellingPrice;
                                const qDate = q.createdAt ? formatDate(q.createdAt.toDate ? q.createdAt.toDate() : q.createdAt) : '--';
                                const qShortDate = qDate.split(' ').slice(0, 2).join('-');
                                return (
                                    <div key={q.id} className="flex items-center justify-between py-1 px-2 border border-slate-50 bg-white rounded shadow-sm group/row hover:border-slate-200 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[11px] font-bold text-slate-700">{formatMoney(qRate).split('.')[0]}</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">MOQ: {q.moq}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-medium text-slate-500 tabular-nums">{qShortDate}</span>
                                            <button
                                                onClick={() => setModal({ open: true, type: isVendor ? 'quoteReceived' : 'quoteSent', data: q, isEdit: true })}
                                                className="p-1 opacity-0 group-hover/row:opacity-100 text-slate-300 hover:text-blue-500"
                                            >
                                                <Icons.Edit className="w-2.5 h-2.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};