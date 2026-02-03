import React, { useState, useMemo } from 'react';
import { Icons } from '../ui/Icons';
import { Button } from '../ui/Button';
import { formatDate } from '../../utils/helpers';

export const Inventory = ({ data, actions, setModal }) => {
    const { inventoryInwards, inventoryOutwards, skus, products, vendors, clients } = data;

    // View mode: 'transactions' or 'stock'
    const [viewMode, setViewMode] = useState('transactions');

    // Transaction filters
    const [sort, setSort] = useState({ key: 'date', dir: 'desc' });
    const [localSearch, setLocalSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    // Transaction date filters
    const [selectedSkuId, setSelectedSkuId] = useState('');
    const [partyFilter, setPartyFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Stock view date (defaults to today)
    const [stockDate, setStockDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });

    // Get clean SKUs (exclude BIOMED ghost SKUs)
    const cleanSkus = useMemo(() => {
        return skus.filter(s => !s.name?.includes('BIOMED'));
    }, [skus]);

    // Combine and enrich all inventory records
    const allRecords = useMemo(() => {
        const records = [];

        inventoryInwards.forEach(inward => {
            const sku = skus.find(s => s.id === inward.skuId);
            const product = sku ? products.find(p => p.id === sku.productId) : null;

            let partyName = inward.sourceName || '-';
            if (inward.sourceType === 'Vendor' && inward.sourceId) {
                const vendor = vendors.find(v => v.id === inward.sourceId);
                partyName = vendor?.companyName || partyName;
            } else if (inward.sourceType === 'Client' && inward.sourceId) {
                const client = clients.find(c => c.id === inward.sourceId);
                partyName = client?.companyName || partyName;
            }

            records.push({
                ...inward,
                recordType: 'Inward',
                partyType: inward.sourceType || 'Unknown',
                partyName,
                partyId: inward.sourceId,
                skuName: sku?.name || 'Unknown SKU',
                productName: product?.name || '-',
                unit: sku?.unit || 'units'
            });
        });

        inventoryOutwards.forEach(outward => {
            const sku = skus.find(s => s.id === outward.skuId);
            const product = sku ? products.find(p => p.id === sku.productId) : null;

            let partyName = outward.destinationName || '-';
            if (outward.destinationType === 'Vendor' && outward.destinationId) {
                const vendor = vendors.find(v => v.id === outward.destinationId);
                partyName = vendor?.companyName || partyName;
            } else if (outward.destinationType === 'Client' && outward.destinationId) {
                const client = clients.find(c => c.id === outward.destinationId);
                partyName = client?.companyName || partyName;
            }

            records.push({
                ...outward,
                recordType: 'Outward',
                partyType: outward.destinationType || 'Unknown',
                partyName,
                partyId: outward.destinationId,
                skuName: sku?.name || 'Unknown SKU',
                productName: product?.name || '-',
                unit: sku?.unit || 'units'
            });
        });

        return records;
    }, [inventoryInwards, inventoryOutwards, skus, products, vendors, clients]);

    // === TRANSACTIONS VIEW ===
    const filteredRecords = useMemo(() => {
        const filtered = allRecords.filter(record => {
            if (typeFilter && record.recordType !== typeFilter) return false;
            if (selectedSkuId && record.skuId !== selectedSkuId) return false;
            if (partyFilter && record.partyType !== partyFilter) return false;
            if (dateFrom && new Date(record.date) < new Date(dateFrom)) return false;
            if (dateTo && new Date(record.date) > new Date(dateTo)) return false;
            if (localSearch) {
                const searchStr = localSearch.toLowerCase();
                return (
                    record.skuName?.toLowerCase().includes(searchStr) ||
                    record.productName?.toLowerCase().includes(searchStr) ||
                    record.partyName?.toLowerCase().includes(searchStr) ||
                    record.notes?.toLowerCase().includes(searchStr)
                );
            }
            return true;
        }).sort((a, b) => {
            let valA = a[sort.key] || '';
            let valB = b[sort.key] || '';
            if (sort.key === 'date') {
                valA = new Date(valA).getTime() || 0;
                valB = new Date(valB).getTime() || 0;
            } else if (sort.key === 'quantity') {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            } else {
                valA = String(valA).toLowerCase();
                valB = String(valB).toLowerCase();
            }
            if (valA < valB) return sort.dir === 'asc' ? -1 : 1;
            if (valA > valB) return sort.dir === 'asc' ? 1 : -1;
            return 0;
        });

        // Calculate running balance per SKU
        const skuBalances = {};
        // First, get all records sorted by date for balance calculation
        const allSorted = [...allRecords].sort((a, b) => new Date(a.date) - new Date(b.date));
        allSorted.forEach(r => {
            const qty = parseFloat(r.quantity) || 0;
            const delta = r.recordType === 'Inward' ? qty : -qty;
            skuBalances[r.skuId] = (skuBalances[r.skuId] || 0) + delta;
        });

        // Now add balance to filtered records (calculate as we go based on date order)
        const balanceTracker = {};
        const sortedFiltered = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date));
        const withBalance = sortedFiltered.map(r => {
            const qty = parseFloat(r.quantity) || 0;
            const delta = r.recordType === 'Inward' ? qty : -qty;
            balanceTracker[r.skuId] = (balanceTracker[r.skuId] || 0) + delta;
            return { ...r, balance: balanceTracker[r.skuId] };
        });

        // Re-sort based on user's sort preference
        return withBalance.sort((a, b) => {
            let valA = a[sort.key] || '';
            let valB = b[sort.key] || '';
            if (sort.key === 'date') {
                valA = new Date(valA).getTime() || 0;
                valB = new Date(valB).getTime() || 0;
            } else if (sort.key === 'quantity' || sort.key === 'balance') {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            } else {
                valA = String(valA).toLowerCase();
                valB = String(valB).toLowerCase();
            }
            if (valA < valB) return sort.dir === 'asc' ? -1 : 1;
            if (valA > valB) return sort.dir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [allRecords, localSearch, typeFilter, selectedSkuId, partyFilter, dateFrom, dateTo, sort]);

    // === TRANSACTIONS SUMMARY (when filters applied) ===
    const transactionsSummary = useMemo(() => {
        const hasFilters = selectedSkuId || partyFilter || dateFrom || dateTo;
        if (!hasFilters) return null;

        const sku = selectedSkuId ? skus.find(s => s.id === selectedSkuId) : null;
        const product = sku ? products.find(p => p.id === sku.productId) : null;

        // Get all records for the selected SKU to calculate opening balance
        let openingBalance = 0;
        if (dateFrom) {
            allRecords.filter(r => !selectedSkuId || r.skuId === selectedSkuId)
                .filter(r => !partyFilter || r.partyType === partyFilter)
                .filter(r => new Date(r.date) < new Date(dateFrom))
                .forEach(r => {
                    const qty = parseFloat(r.quantity) || 0;
                    openingBalance += r.recordType === 'Inward' ? qty : -qty;
                });
        }

        // Calculate totals from filtered records
        let totalIn = 0, totalOut = 0;
        filteredRecords.forEach(r => {
            const qty = parseFloat(r.quantity) || 0;
            if (r.recordType === 'Inward') totalIn += qty;
            else totalOut += qty;
        });

        const closingBalance = openingBalance + totalIn - totalOut;

        return {
            skuName: sku?.name || (selectedSkuId ? 'Selected SKU' : 'All SKUs'),
            productName: product?.name || '',
            unit: sku?.unit || 'units',
            openingBalance,
            totalIn,
            totalOut,
            closingBalance,
            recordCount: filteredRecords.length
        };
    }, [filteredRecords, allRecords, selectedSkuId, partyFilter, dateFrom, dateTo, skus, products]);

    // === STOCK VIEW ===
    // Calculate closing balances for all SKUs as of selected date, grouped by format then product
    const stockData = useMemo(() => {
        const stockCutoffDate = stockDate ? new Date(stockDate + 'T23:59:59') : new Date();
        const skuBalances = {};

        // Calculate balance for each SKU up to the selected date
        inventoryInwards.forEach(inward => {
            if (new Date(inward.date) <= stockCutoffDate) {
                const qty = parseFloat(inward.quantity) || 0;
                skuBalances[inward.skuId] = (skuBalances[inward.skuId] || 0) + qty;
            }
        });

        inventoryOutwards.forEach(outward => {
            if (new Date(outward.date) <= stockCutoffDate) {
                const qty = parseFloat(outward.quantity) || 0;
                skuBalances[outward.skuId] = (skuBalances[outward.skuId] || 0) - qty;
            }
        });

        // Count transactions per SKU to filter out those with 0 transactions
        const transactionCounts = {};
        inventoryInwards.forEach(i => {
            transactionCounts[i.skuId] = (transactionCounts[i.skuId] || 0) + 1;
        });
        inventoryOutwards.forEach(o => {
            transactionCounts[o.skuId] = (transactionCounts[o.skuId] || 0) + 1;
        });

        // Build enriched stock list (only SKUs with transactions)
        const stockItems = [];
        Object.entries(skuBalances).forEach(([skuId, balance]) => {
            if (!transactionCounts[skuId]) return; // Skip if no transactions

            const sku = skus.find(s => s.id === skuId);
            if (!sku || sku.name?.includes('BIOMED')) return; // Exclude ghost SKUs

            const product = products.find(p => p.id === sku.productId);
            const format = product?.format || 'Other';

            stockItems.push({
                skuId,
                skuName: sku.name || 'Unknown SKU',
                productId: sku.productId,
                productName: product?.name || '-',
                format,
                unit: sku.unit || 'units',
                closingBalance: balance
            });
        });

        // Group by format, then by product, sorted alphabetically
        const grouped = {};
        stockItems.forEach(item => {
            if (!grouped[item.format]) grouped[item.format] = {};
            if (!grouped[item.format][item.productName]) grouped[item.format][item.productName] = [];
            grouped[item.format][item.productName].push(item);
        });

        // Sort formats alphabetically
        const sortedFormats = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

        // Build final structure with sorted products and SKUs
        const result = [];
        sortedFormats.forEach(format => {
            const formatProducts = grouped[format];
            const sortedProducts = Object.keys(formatProducts).sort((a, b) => a.localeCompare(b));

            sortedProducts.forEach(productName => {
                const productSkus = formatProducts[productName].sort((a, b) => a.skuName.localeCompare(b.skuName));
                productSkus.forEach((item, idx) => {
                    result.push({
                        ...item,
                        isFirstInProduct: idx === 0,
                        productSkuCount: productSkus.length,
                        isFirstInFormat: sortedProducts.indexOf(productName) === 0 && idx === 0,
                        formatProductCount: sortedProducts.reduce((sum, p) => sum + formatProducts[p].length, 0)
                    });
                });
            });
        });

        // Calculate totals
        const totalBalance = stockItems.reduce((sum, item) => sum + item.closingBalance, 0);
        const positiveCount = stockItems.filter(i => i.closingBalance > 0).length;
        const negativeCount = stockItems.filter(i => i.closingBalance < 0).length;

        return {
            items: result,
            totalBalance,
            skuCount: stockItems.length,
            positiveCount,
            negativeCount,
            formatCount: sortedFormats.length
        };
    }, [inventoryInwards, inventoryOutwards, skus, products, stockDate]);

    // Handlers
    const handleSort = (key) => setSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
    const handleDelete = (record) => actions.del(record.recordType === 'Inward' ? 'inventoryInwards' : 'inventoryOutwards', record.id);
    const handleEdit = (record) => setModal({ open: true, type: 'inventoryRecord', data: { ...record, movementType: record.recordType }, isEdit: true });

    // Stats
    const inwardCount = allRecords.filter(r => r.recordType === 'Inward').length;
    const outwardCount = allRecords.filter(r => r.recordType === 'Outward').length;

    // Sub-components
    const SortHeader = ({ label, sortKey, className = '' }) => (
        <th className={`px-4 py-2 text-[10px] font-bold text-slate-400 tracking-widest cursor-pointer hover:text-blue-600 transition-colors ${className}`} onClick={() => handleSort(sortKey)}>
            <div className="flex items-center gap-1">
                {label}
                {sort.key === sortKey && (sort.dir === 'asc' ? <Icons.ArrowUp className="w-3 h-3" /> : <Icons.ArrowDown className="w-3 h-3" />)}
            </div>
        </th>
    );

    const TypeBadge = ({ type }) => (
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${type === 'Inward' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-red-700 bg-red-50 border-red-100'}`}>
            {type}
        </span>
    );

    const PartyTypeBadge = ({ type }) => {
        const colorClass = {
            'Vendor': 'text-purple-700',
            'Client': 'text-blue-700',
            'ThirdParty': 'text-amber-700',
            'Internal': 'text-slate-600'
        }[type] || 'text-slate-500';
        return <span className={`text-[9px] font-bold uppercase tracking-widest ${colorClass}`}>{type === 'ThirdParty' ? 'Third Party' : type}</span>;
    };

    return (
        <div className="flex flex-col h-full animate-fade-in space-y-4">
            {/* Header with View Toggle */}
            <div className="flex justify-between items-center shrink-0 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-slate-100 rounded border border-slate-200">
                            <Icons.Box className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-slate-800 leading-tight">Inventory</h2>
                            <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{inwardCount} In</span>
                                <span className="text-slate-300">|</span>
                                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{outwardCount} Out</span>
                            </div>
                        </div>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                        <button
                            className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${viewMode === 'transactions' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            onClick={() => setViewMode('transactions')}
                        >
                            Transactions
                        </button>
                        <button
                            className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${viewMode === 'stock' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            onClick={() => setViewMode('stock')}
                        >
                            Stock
                        </button>
                    </div>
                </div>

                {/* Actions - Different for each view */}
                <div className="flex items-center gap-3">
                    {viewMode === 'transactions' ? (
                        <>
                            <select className="bg-white border border-slate-300 text-[11px] font-bold text-slate-600 rounded-md px-3 py-1.5 outline-none w-44" value={selectedSkuId} onChange={e => setSelectedSkuId(e.target.value)}>
                                <option value="">All SKUs</option>
                                {cleanSkus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <select className="bg-white border border-slate-300 text-[11px] font-bold text-slate-600 rounded-md px-3 py-1.5 outline-none uppercase" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                                <option value="">All Types</option>
                                <option value="Inward">Inward</option>
                                <option value="Outward">Outward</option>
                            </select>
                            <select className="bg-white border border-slate-300 text-[11px] font-medium text-slate-600 rounded-md px-3 py-1.5 outline-none" value={partyFilter} onChange={e => setPartyFilter(e.target.value)}>
                                <option value="">All Parties</option>
                                <option value="Vendor">Vendor</option>
                                <option value="Client">Client</option>
                                <option value="ThirdParty">Third Party</option>
                                <option value="Internal">Internal</option>
                            </select>
                            <input type="date" className="bg-white border border-slate-300 text-[11px] rounded-md px-2 py-1.5 outline-none w-32" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                            <span className="text-slate-300 text-xs">to</span>
                            <input type="date" className="bg-white border border-slate-300 text-[11px] rounded-md px-2 py-1.5 outline-none w-32" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                            <div className="relative">
                                <input className="bg-white border border-slate-300 text-[11px] font-medium text-slate-600 rounded-md pl-8 pr-3 py-1.5 outline-none w-36 placeholder:text-slate-300" placeholder="SEARCH..." value={localSearch} onChange={e => setLocalSearch(e.target.value)} />
                                <Icons.Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">As of</span>
                                <input
                                    type="date"
                                    className="bg-white border border-slate-300 text-[11px] font-bold text-slate-700 rounded-md px-3 py-1.5 outline-none w-40"
                                    value={stockDate}
                                    onChange={e => setStockDate(e.target.value)}
                                />
                                <button
                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest"
                                    onClick={() => setStockDate(new Date().toISOString().split('T')[0])}
                                >
                                    Today
                                </button>
                            </div>
                        </>
                    )}
                    <Button icon={Icons.Plus} onClick={() => setModal({ open: true, type: 'inventoryRecord' })} className="shadow-sm uppercase text-[11px] tracking-widest px-5">
                        + New
                    </Button>
                </div>
            </div>

            {/* Transactions Summary Snapshot */}
            {viewMode === 'transactions' && transactionsSummary && (
                <div className="flex items-center gap-6 px-4 py-2 bg-slate-50 border border-slate-200 rounded">
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">SKU</span>
                        <code className="text-[12px] font-bold text-slate-700">{transactionsSummary.skuName}</code>
                    </div>
                    <div className="w-px h-4 bg-slate-200"></div>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">Opening</span>
                        <span className="text-[13px] font-black text-amber-700">{transactionsSummary.openingBalance.toLocaleString()}</span>
                    </div>
                    <div className="w-px h-4 bg-slate-200"></div>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">In</span>
                        <span className="text-[13px] font-black text-emerald-600">+{transactionsSummary.totalIn.toLocaleString()}</span>
                    </div>
                    <div className="w-px h-4 bg-slate-200"></div>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest">Out</span>
                        <span className="text-[13px] font-black text-red-600">-{transactionsSummary.totalOut.toLocaleString()}</span>
                    </div>
                    <div className="w-px h-4 bg-slate-200"></div>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Closing</span>
                        <span className={`text-[13px] font-black ${transactionsSummary.closingBalance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{transactionsSummary.closingBalance.toLocaleString()}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{transactionsSummary.unit}</span>
                    </div>
                    <div className="w-px h-4 bg-slate-200"></div>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Records</span>
                        <span className="text-[12px] font-bold text-slate-600">{transactionsSummary.recordCount}</span>
                    </div>
                </div>
            )}



            {/* Table */}
            <div className="flex-1 overflow-hidden bg-white border border-slate-200 relative flex flex-col shadow-sm">
                <div className="absolute inset-0 overflow-auto scroller">
                    {viewMode === 'transactions' ? (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50/80 border-b border-slate-200 uppercase sticky top-0 z-10">
                                <tr>
                                    <SortHeader label="Date" sortKey="date" />
                                    <SortHeader label="Party" sortKey="partyName" />
                                    <SortHeader label="SKU" sortKey="skuName" />
                                    <th className="px-4 py-2 text-[10px] font-bold text-emerald-500 tracking-widest text-right">In</th>
                                    <th className="px-4 py-2 text-[10px] font-bold text-red-500 tracking-widest text-right">Out</th>
                                    <th className="px-4 py-2 text-[10px] font-bold text-blue-500 tracking-widest text-right">Balance</th>
                                    <th className="px-4 py-2 text-[10px] font-bold text-slate-400 tracking-widest">Notes</th>
                                    <th className="px-4 py-2 text-[10px] font-bold text-slate-400 tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredRecords.map(record => (
                                    <tr key={`${record.recordType}-${record.id}`} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-4 py-3"><span className="text-[12px] font-bold text-slate-600">{formatDate(record.date)}</span></td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[12px] font-semibold text-slate-700">{record.partyName}</span>
                                                <PartyTypeBadge type={record.partyType} />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <code className="text-[11px] font-bold text-slate-500 font-mono bg-slate-50 px-1 py-0.5 border border-slate-100 rounded">{record.skuName}</code>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {record.recordType === 'Inward' && <span className="text-[13px] font-bold text-emerald-600">+{record.quantity}</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {record.recordType === 'Outward' && <span className="text-[13px] font-bold text-red-600">-{record.quantity}</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`text-[13px] font-black ${record.balance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{record.balance}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase ml-1">{record.unit}</span>
                                        </td>
                                        <td className="px-4 py-3"><span className="text-[11px] text-slate-500 max-w-[150px] truncate block">{record.notes || '-'}</span></td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEdit(record)} className="p-2 bg-white border border-slate-200 rounded text-blue-500 hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm"><Icons.Edit className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => handleDelete(record)} className="p-2 bg-white border border-slate-200 rounded text-red-400 hover:border-red-300 hover:bg-red-50 transition-all shadow-sm"><Icons.X className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredRecords.length === 0 && (
                                    <tr><td colSpan="8" className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-300">
                                            <Icons.Box className="w-12 h-12 mb-2 opacity-20" />
                                            <p className="text-xs font-bold uppercase tracking-[0.2em]">No Records</p>
                                        </div>
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50/80 border-b border-slate-200 uppercase sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-2 text-[10px] font-bold text-slate-400 tracking-widest w-32">Format</th>
                                    <th className="px-4 py-2 text-[10px] font-bold text-slate-400 tracking-widest">Product</th>
                                    <th className="px-4 py-2 text-[10px] font-bold text-slate-400 tracking-widest">SKU</th>
                                    <th className="px-4 py-2 text-[10px] font-bold text-blue-500 tracking-widest text-right">Closing Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {stockData.items.map((item, idx) => (
                                    <tr key={item.skuId} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-4 py-2.5">
                                            {item.isFirstInFormat && (
                                                <span className="text-[11px] font-bold uppercase tracking-widest text-purple-600 bg-purple-50 px-2 py-1 rounded border border-purple-100">
                                                    {item.format}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            {item.isFirstInProduct && (
                                                <span className="text-[13px] font-bold text-slate-700">{item.productName}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <code className="text-[11px] font-bold text-slate-500 font-mono bg-slate-50 px-1.5 py-0.5 border border-slate-100 rounded">
                                                {item.skuName}
                                            </code>
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <span className={`text-[14px] font-black ${item.closingBalance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                                                {item.closingBalance.toLocaleString()}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">{item.unit}</span>
                                        </td>
                                    </tr>
                                ))}
                                {stockData.items.length === 0 && (
                                    <tr><td colSpan="4" className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-300">
                                            <Icons.Box className="w-12 h-12 mb-2 opacity-20" />
                                            <p className="text-xs font-bold uppercase tracking-[0.2em]">No Stock Data</p>
                                            <p className="text-[10px] text-slate-300 mt-1">Add inventory transactions to see stock levels</p>
                                        </div>
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};
