import React, { useState, useMemo } from 'react';
import { Icons } from '../ui/Icons';
import { Button } from '../ui/Button';
import { FilterHeader } from '../shared/FilterHeader';
import { formatDate } from '../../utils/helpers';

export const CompanyMaster = ({ type, data, actions, setModal, setDetailView, currentUser }) => {
    const { vendors, clients, skus, products, quotesReceived, quotesSent, tasks, settings } = data;
    const isVendor = type === 'vendor';
    const listData = isVendor ? vendors : clients;
    const statusOptions = (isVendor ? settings?.vendorStatuses : settings?.leadStatuses) || [];
    const statusGroupMap = (!isVendor && settings?.leadStatusGroups) || {};

    // Build grouped options for FilterHeader (only for clients)
    const statusOptionGroups = useMemo(() => {
        if (isVendor || !statusGroupMap || Object.keys(statusGroupMap).length === 0) return null;
        const groups = { 'In-progress': [], 'Complete': [] };
        statusOptions.forEach(s => {
            const g = statusGroupMap[s] || 'In-progress';
            if (groups[g]) groups[g].push(s);
            else groups[g] = [s];
        });
        return groups;
    }, [statusOptions, statusGroupMap, isVendor]);

    const [viewMode, setViewMode] = useState('list');
    const [propertiesOpen, setPropertiesOpen] = useState(false);
    const [visibleProps, setVisibleProps] = useState({
        products: true,
        status: true,
        category: true,
        rollup: true,
        leadDate: true,
        source: type === 'client',
        website: false
    });

    const [sort, setSort] = useState({ key: 'companyName', dir: 'asc' });
    const [colFilters, setColFilters] = useState({
        name: '',
        status: [],
        category: [],
        source: [],
        products: '',
        website: '',
        nextAction: '',
        date: ''
    });

    const enrichedData = useMemo(() => {
        return listData.map(item => {
            const relatedSkus = skus.filter(s => {
                if (isVendor) {
                    const vendorQuotes = quotesReceived.filter(q => q.vendorId === item.id);
                    return vendorQuotes.some(q => q.skuId === s.id);
                } else {
                    const clientQuotes = quotesSent.filter(q => q.clientId === item.id);
                    return clientQuotes.some(q => q.skuId === s.id);
                }
            });

            const productNames = [...new Set(relatedSkus.map(s => {
                const p = products.find(prod => prod.id === s.productId);
                return p ? p.name : null;
            }).filter(Boolean))];

            const pendingTasks = tasks.filter(t => (t.relatedId === item.id || t.relatedClientId === item.id || t.relatedVendorId === item.id) && t.status !== 'Completed')
                .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

            return {
                ...item,
                rollupProducts: productNames,
                rollupPendingTasks: pendingTasks
            };
        });
    }, [listData, skus, products, quotesReceived, quotesSent, tasks, isVendor]);

    const filteredData = useMemo(() => {
        return enrichedData.filter(item => {
            if (colFilters.name && !item.companyName.toLowerCase().includes(colFilters.name.toLowerCase())) return false;
            if (colFilters.status.length > 0 && !colFilters.status.includes(item.status)) return false;
            if (type === 'client' && colFilters.source.length > 0 && !colFilters.source.includes(item.leadSource)) return false;

            if (colFilters.products) {
                const searchStr = colFilters.products.toLowerCase();
                if (!item.rollupProducts.some(p => p.toLowerCase().includes(searchStr))) return false;
            }

            if (colFilters.website && (!item.website || !item.website.toLowerCase().includes(colFilters.website.toLowerCase()))) return false;

            if (colFilters.category.length > 0) {
                const itemCats = item.categories || [];
                if (!colFilters.category.some(c => itemCats.includes(c))) return false;
            }



            if (colFilters.nextAction) {
                const actionText = item.rollupPendingTasks.map(t => t.title).join(' ').toLowerCase();
                if (!actionText.includes(colFilters.nextAction.toLowerCase())) return false;
            }

            if (colFilters.date) {
                const dateStr = (item.leadDate || (item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : '')).toLowerCase();
                if (!dateStr.includes(colFilters.date.toLowerCase())) return false;
            }

            return true;
        }).sort((a, b) => {
            let valA, valB;
            if (sort.key === 'rollupProducts') {
                valA = a.rollupProducts.join(', ');
                valB = b.rollupProducts.join(', ');
            } else if (sort.key === 'rollupPendingTasks') {
                valA = a.rollupPendingTasks[0]?.dueDate || '9999-12-31';
                valB = b.rollupPendingTasks[0]?.dueDate || '9999-12-31';
            } else {
                valA = (a[sort.key] || '');
                valB = (b[sort.key] || '');
            }

            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return sort.dir === 'asc' ? -1 : 1;
            if (valA > valB) return sort.dir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [enrichedData, colFilters, sort, type]);

    const handleSort = (key) => {
        setSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
    };

    const handleDelete = async (item) => {
        const { quotesSent = [], quotesReceived = [], rfqs = [], tasks = [] } = data;
        const deps = {};

        if (!isVendor) {
            deps.quotesSent = quotesSent.filter(q => q.clientId === item.id).map(q => ({ col: 'quotesSent', id: q.id }));
            deps.tasks = tasks.filter(t => (t.relatedId === item.id && t.contextType === 'Client') || t.secondaryClientId === item.id).map(t => ({ col: 'tasks', id: t.id }));
        } else {
            deps.quotesReceived = quotesReceived.filter(q => q.vendorId === item.id).map(q => ({ col: 'quotesReceived', id: q.id }));
            deps.rfqs = rfqs.filter(r => r.vendorId === item.id).map(r => ({ col: 'rfqs', id: r.id }));
            deps.tasks = tasks.filter(t => (t.relatedId === item.id && t.contextType === 'Vendor') || t.secondaryVendorId === item.id).map(t => ({ col: 'tasks', id: t.id }));
        }

        const allDeps = Object.values(deps).flat();

        if (allDeps.length > 0) {
            const summary = Object.entries(deps)
                .filter(([_, arr]) => arr.length > 0)
                .map(([name, arr]) => `${arr.length} ${name.replace(/([A-Z])/g, ' $1').trim()}`)
                .join(', ');

            if (confirm(`Deleting ${item.companyName} will also delete all associated: ${summary}. Proceed?`)) {
                await actions.delMany([...allDeps, { col: isVendor ? 'vendors' : 'clients', id: item.id }]);
            }
        } else {
            if (confirm(`Delete ${item.companyName}?`)) {
                await actions.del(isVendor ? 'vendors' : 'clients', item.id);
            }
        }
    };

    const StatusBadge = ({ item }) => {
        const status = item.status || 'Active';
        const colorClass = (s) => {
            if (s === 'Active' || s === 'Hot Lead') return 'text-emerald-700 bg-emerald-50/50 border-emerald-100';
            if (s === 'On Hold' || s === 'Cold') return 'text-slate-500 bg-slate-50 border-slate-200';
            if (s === 'Blacklisted') return 'text-red-600 bg-red-50 border-red-100';
            return 'text-blue-600 bg-blue-50 border-blue-100';
        };

        return (
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${colorClass(status)}`}>
                {status}
            </span>
        );
    };

    const StatusSelect = ({ item }) => {
        const status = item.status || 'Active';
        return (
            <div className="relative w-fit group/status">
                <select
                    className="appearance-none bg-transparent pl-0 pr-6 py-1 text-[11px] font-bold text-slate-600 group-hover/status:text-blue-600 cursor-pointer focus:outline-none focus:ring-0 transition-colors uppercase tracking-tight"
                    value={status}
                    onChange={(e) => actions.update(isVendor ? 'vendors' : 'clients', item.id, { status: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                >
                    <option value="">Status...</option>
                    {statusOptionGroups ? (
                        Object.entries(statusOptionGroups).map(([group, opts]) => (
                            <optgroup key={group} label={group}>
                                {opts.map(s => <option key={s} value={s}>{s}</option>)}
                            </optgroup>
                        ))
                    ) : (
                        statusOptions.map(s => <option key={s} value={s}>{s}</option>)
                    )}
                </select>
                <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                    <Icons.ChevronDown className="w-2.5 h-2.5" />
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full animate-fade-in space-y-2">
            <div className="flex justify-between items-center shrink-0 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-100 rounded border border-slate-200">
                        {isVendor ? <Icons.Vendor className="w-5 h-5 text-slate-600" /> : <Icons.Client className="w-5 h-5 text-slate-600" />}
                    </div>
                    <div>
                        <h2 className="font-bold text-base text-slate-800 leading-tight">{isVendor ? 'Vendor Master' : 'Client Registry'}</h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{filteredData.length} Entities Indexed</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 rounded-md p-1 border border-slate-200">
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="Grid View"><Icons.Table className="w-4 h-4" /></button>
                        <button onClick={() => setViewMode('board')} className={`p-1.5 rounded transition-all ${viewMode === 'board' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="Kanban View"><Icons.Columns className="w-4 h-4" /></button>
                    </div>

                    <div className="relative">
                        <button onClick={() => setPropertiesOpen(!propertiesOpen)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 text-[11px] font-bold uppercase tracking-wider transition-all hover:bg-slate-50 ${propertiesOpen ? 'bg-slate-100 shadow-inner' : 'bg-white shadow-sm'}`}>
                            <Icons.Eye className="w-3.5 h-3.5" />
                            <span>Columns</span>
                        </button>
                        {propertiesOpen && (
                            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-slate-300 rounded shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-100">
                                <div className="text-[9px] uppercase font-bold text-slate-400 mb-2 px-1 tracking-widest border-b border-slate-100 pb-1">Visibility Matrix</div>
                                <div className="space-y-0.5">
                                    {Object.keys(visibleProps).map(key => (
                                        <label key={key} className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded-sm cursor-pointer transition-colors">
                                            <span className="text-[11px] font-semibold text-slate-600 capitalize">{key}</span>
                                            <input type="checkbox" checked={visibleProps[key]} onChange={() => setVisibleProps(prev => ({ ...prev, [key]: !prev[key] }))} className="w-3.5 h-3.5 text-blue-600 rounded-sm border-slate-300 focus:ring-0" />
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <Button icon={Icons.Plus} onClick={() => setModal({ open: true, type })} variant="primary" className="shadow-sm uppercase text-[11px] tracking-widest px-5">New</Button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden bg-white border border-slate-200 relative flex flex-col shadow-sm">
                {viewMode === 'list' ? (
                    <div className="absolute inset-0 overflow-auto scroller">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="divide-x divide-slate-100 border-b border-slate-200">
                                    <th className="min-w-[180px] bg-slate-50/50 p-0">
                                        <FilterHeader label="Company Entity" sortKey="companyName" currentSort={sort} onSort={handleSort} filterType="text" filterValue={colFilters.name} onFilter={v => setColFilters(p => ({ ...p, name: v }))} />
                                    </th>
                                    {visibleProps.status && (
                                        <th className="bg-slate-50/50 p-0">
                                            <FilterHeader label="Status" sortKey="status" currentSort={sort} onSort={handleSort} filterType="multi-select" filterValue={colFilters.status} onFilter={v => setColFilters(p => ({ ...p, status: v }))} options={statusOptions} optionGroups={statusOptionGroups} />
                                        </th>
                                    )}
                                    {visibleProps.category && (
                                        <th className="bg-slate-50/50 p-0">
                                            <FilterHeader label="Category" sortKey="categories" currentSort={sort} onSort={handleSort} filterType="multi-select" filterValue={colFilters.category} onFilter={v => setColFilters(p => ({ ...p, category: v }))} options={(settings?.formats || [])} />
                                        </th>
                                    )}
                                    {visibleProps.source && (
                                        <th className="bg-slate-50/50 p-0">
                                            <FilterHeader label="Lead Source" sortKey="leadSource" currentSort={sort} onSort={handleSort} filterType="multi-select" filterValue={colFilters.source} onFilter={v => setColFilters(p => ({ ...p, source: v }))} options={(settings?.leadSources || [])} />
                                        </th>
                                    )}

                                    {visibleProps.products && (
                                        <th className="bg-slate-50/50 p-0">
                                            <FilterHeader label="Portfolio" sortKey="rollupProducts" currentSort={sort} onSort={handleSort} filterType="text" filterValue={colFilters.products} onFilter={v => setColFilters(p => ({ ...p, products: v }))} />
                                        </th>
                                    )}
                                    {visibleProps.rollup && (
                                        <th className="bg-slate-50/50 p-0">
                                            <FilterHeader label="Engagement" sortKey="rollupPendingTasks" currentSort={sort} onSort={handleSort} filterType="text" filterValue={colFilters.nextAction} onFilter={v => setColFilters(p => ({ ...p, nextAction: v }))} />
                                        </th>
                                    )}
                                    {visibleProps.leadDate && (
                                        <th className="bg-slate-50/50 p-0">
                                            <FilterHeader label={isVendor ? 'Onboarded' : 'Lead Date'} sortKey={isVendor ? 'createdAt' : 'leadDate'} currentSort={sort} onSort={handleSort} filterType="text" filterValue={colFilters.date} onFilter={v => setColFilters(p => ({ ...p, date: v }))} />
                                        </th>
                                    )}
                                    <th className="w-32 bg-slate-50/50"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredData.map(item => (
                                    <tr
                                        key={item.id}
                                        onClick={() => setDetailView({ open: true, type, data: item })}
                                        className="hover:bg-slate-50/80 cursor-pointer group transition-colors divide-x divide-slate-50"
                                    >
                                        <td className="px-3 py-1.5">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-6 h-6 rounded border flex items-center justify-center text-[9px] font-bold uppercase shrink-0 ${isVendor ? 'bg-purple-50 border-purple-100 text-purple-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                                    {item.companyName.charAt(0)}
                                                </div>
                                                <span className="font-semibold text-slate-700 text-[12px] truncate">{item.companyName}</span>
                                            </div>
                                        </td>
                                        {visibleProps.status && (
                                            <td className="px-3 py-1.5">
                                                {isVendor ? <StatusBadge item={item} /> : <StatusSelect item={item} />}
                                            </td>
                                        )}
                                        {visibleProps.category && (
                                            <td className="px-3 py-1.5">
                                                <div className="flex flex-wrap gap-0.5">
                                                    {(item.categories || []).map((c, i) => (
                                                        <span key={i} className="text-[9px] px-1 py-px bg-violet-50 text-violet-600 rounded border border-violet-200 font-semibold uppercase tracking-tighter">{c}</span>
                                                    ))}
                                                    {(!item.categories || item.categories.length === 0) && <span className="text-slate-200 text-[10px]">—</span>}
                                                </div>
                                            </td>
                                        )}
                                        {visibleProps.source && (
                                            <td className="px-3 py-1.5">
                                                <span className="text-[11px] font-medium text-slate-500">{item.leadSource || '—'}</span>
                                            </td>
                                        )}

                                        {visibleProps.products && (
                                            <td className="px-3 py-1.5">
                                                <div className="flex flex-wrap gap-0.5">
                                                    {item.rollupProducts.slice(0, 2).map((p, i) => (
                                                        <span key={i} className="text-[9px] px-1 py-px bg-slate-50 text-slate-500 rounded border border-slate-200 font-semibold uppercase tracking-tighter">
                                                            {p}
                                                        </span>
                                                    ))}
                                                    {item.rollupProducts.length > 2 && (
                                                        <span className="text-[9px] font-bold text-slate-300 uppercase">+{item.rollupProducts.length - 2}</span>
                                                    )}
                                                    {item.rollupProducts.length === 0 && <span className="text-slate-200 text-[10px]">—</span>}
                                                </div>
                                            </td>
                                        )}
                                        {visibleProps.rollup && (
                                            <td className="px-3 py-1.5">
                                                {item.rollupPendingTasks.length > 0 ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <div className={`w-1.5 h-1.5 shrink-0 rounded-full ${item.rollupPendingTasks[0].priority === 'High' ? 'bg-red-500' : 'bg-blue-400'}`}></div>
                                                        <span className="text-[11px] font-semibold text-slate-600 truncate">{item.rollupPendingTasks[0].title}</span>
                                                        <span className="text-[9px] text-slate-400 uppercase tracking-tight whitespace-nowrap">Due {formatDate(item.rollupPendingTasks[0].dueDate)}</span>
                                                    </div>
                                                ) : <span className="text-slate-200 text-[10px]">—</span>}
                                            </td>
                                        )}
                                        {visibleProps.leadDate && (
                                            <td className="px-3 py-1.5">
                                                <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
                                                    {item.leadDate ? formatDate(item.leadDate) : (item.createdAt ? formatDate(item.createdAt) : '-')}
                                                </span>
                                            </td>
                                        )}
                                        <td className="px-1 py-1.5 text-right relative">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setModal({ open: true, type, data: item, isEdit: true }) }}
                                                    className="p-1 px-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100/50 rounded transition-all"
                                                    title="Edit"
                                                >
                                                    <Icons.Edit className="w-3.5 h-3.5" />
                                                </button>
                                                {currentUser?.role === 'Admin' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                                                        className="p-1 px-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                                        title="Delete"
                                                    >
                                                        <Icons.Trash className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                <div className="w-px h-3 bg-slate-200 mx-0.5"></div>
                                                <button className="p-1 text-slate-300 group-hover:text-blue-500 transition-colors">
                                                    <Icons.ChevronRight className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredData.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="py-20 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-300">
                                                <Icons.Search className="w-12 h-12 mb-2 opacity-20" />
                                                <p className="text-xs font-bold uppercase tracking-[0.2em]">No Matches Found</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="absolute inset-0 overflow-x-auto overflow-y-hidden p-4 flex gap-4 bg-slate-50/50">
                        {(statusOptionGroups ? Object.entries(statusOptionGroups) : [['', statusOptions]]).map(([groupName, groupStatuses]) => (
                            <React.Fragment key={groupName}>
                                {groupName && (
                                    <div className="flex flex-col justify-start pt-1">
                                        <div className={`writing-mode-vertical text-[9px] font-bold uppercase tracking-[0.2em] py-3 px-1 rounded ${groupName === 'In-progress' ? 'text-amber-500 bg-amber-50/50' : 'text-emerald-500 bg-emerald-50/50'}`}
                                            style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}>
                                            {groupName}
                                        </div>
                                    </div>
                                )}
                                {groupStatuses.map(status => {
                                    const itemsInStatus = filteredData.filter(i => (i.status || 'Active') === status);
                                    return (
                                        <div key={status} className="w-72 flex-shrink-0 flex flex-col h-full bg-slate-100/30 rounded-lg border border-slate-200 p-2">
                                            <div className="flex justify-between items-center mb-3 px-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">{status}</span>
                                                    <span className="bg-white border border-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">{itemsInStatus.length}</span>
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto scroller space-y-2.5 pr-1">
                                                {itemsInStatus.map(item => (
                                                    <div
                                                        key={item.id}
                                                        onClick={() => setDetailView({ open: true, type, data: item })}
                                                        className="bg-white p-3 border border-slate-200 shadow-sm hover:border-blue-400 cursor-pointer group transition-all hover:shadow-md"
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h4 className="font-bold text-slate-700 text-[13px] line-clamp-2 leading-snug tracking-tight">{item.companyName}</h4>
                                                            <div className="flex items-center gap-0.5">
                                                                <button onClick={(e) => { e.stopPropagation(); setModal({ open: true, type, data: item, isEdit: true }) }} className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-slate-50 rounded transition-all" title="Edit"><Icons.Edit className="w-3 h-3" /></button>
                                                                {currentUser?.role === 'Admin' && <button onClick={(e) => { e.stopPropagation(); handleDelete(item); }} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all" title="Delete"><Icons.Trash className="w-3 h-3" /></button>}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold border uppercase ${isVendor ? 'bg-purple-50 border-purple-100 text-purple-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                                                {item.companyName.charAt(0)}
                                                            </div>
                                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{item.city || 'Location N/A'}</div>
                                                        </div>

                                                        {visibleProps.products && item.rollupProducts.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mb-3">
                                                                {item.rollupProducts.slice(0, 2).map((p, i) => <span key={i} className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-slate-50 text-slate-500 border border-slate-100 rounded-sm">{p}</span>)}
                                                                {item.rollupProducts.length > 2 && <span className="text-[9px] font-bold text-slate-300 px-1">+{item.rollupProducts.length - 2}</span>}
                                                            </div>
                                                        )}

                                                        {visibleProps.rollup && item.rollupPendingTasks.length > 0 && (
                                                            <div className="mt-2 pt-2 border-t border-slate-50">
                                                                <div className="flex items-start gap-1.5">
                                                                    <div className={`w-1.5 h-1.5 mt-1 shrink-0 rounded-full ${item.rollupPendingTasks[0].priority === 'High' ? 'bg-red-500' : 'bg-blue-400'}`}></div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-[10px] font-bold text-slate-600 truncate leading-tight">{item.rollupPendingTasks[0].title}</div>
                                                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Due {formatDate(item.rollupPendingTasks[0].dueDate)}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};