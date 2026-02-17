import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Icons } from '../ui/Icons';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatMoney } from '../../utils/helpers';

// Added onNavigateToFormulation prop
export const ProductMaster = ({ data, actions, setModal, setActiveQuotesView, onNavigateToFormulation }) => {
    // Destructure formulations to use in PDF generation
    const { products, skus, vendors, quotesReceived, quotesSent, settings, formulations = [] } = data;

    const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
    const [filterFormat, setFilterFormat] = useState('All');
    const [localSearch, setLocalSearch] = useState('');
    const [expandedProduct, setExpandedProduct] = useState(null);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            if (filterFormat !== 'All' && p.format !== filterFormat) return false;
            if (localSearch && !String(p.name).toLowerCase().includes(localSearch.toLowerCase())) return false;
            return true;
        }).sort((a, b) => {
            const valA = (a[sort.key] || '').toLowerCase();
            const valB = (b[sort.key] || '').toLowerCase();
            return sort.dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });
    }, [products, filterFormat, localSearch, sort]);

    // --- PDF GENERATION LOGIC ---
    const generateSkuPdf = (e, sku) => {
        e.stopPropagation();
        try {
            const doc = new jsPDF();
            const product = products.find(p => p.id === sku.productId);
            const formulation = formulations.find(f => f.skuId === sku.id);

            // Header
            doc.setFontSize(18);
            doc.text(`${product?.name || 'Product'} - ${sku.variant}`, 14, 20);

            doc.setFontSize(10);
            doc.text(`SKU Code: ${sku.name}`, 14, 30);
            doc.text(`Format: ${product?.format || '-'}`, 14, 35);
            doc.text(`Serving Size: ${formulation?.servingSizeValue || '-'}${formulation?.servingSizeUnit || ''}`, 14, 40);
            doc.text(`Pack: ${sku.packSize}${sku.unit} (${sku.packType})`, 14, 45);

            let finalY = 50;

            // Formulation Table
            if (formulation?.ingredients?.length > 0) {
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text("Formulation (Ingredients)", 14, finalY);
                doc.setFont(undefined, 'normal');

                const ingBody = formulation.ingredients.map(ing => [
                    ing.name,
                    ing.type || 'Active',
                    `${ing.per100g || '0'}%`,
                    ing.perServing || '-',
                    ing.perSku || '-'
                ]);

                const dosageUnit = formulation.dosageUnit || '';
                autoTable(doc, {
                    startY: finalY + 5,
                    head: [['Ingredient', 'Type', 'Qty %', `Qty/Serv (${dosageUnit})`, `Qty/Unit (${dosageUnit})`]],
                    body: ingBody,
                    theme: 'striped',
                    headStyles: { fillColor: [71, 85, 105] },
                    styles: { fontSize: 9 },
                });

                finalY = doc.lastAutoTable.finalY + 15;
            } else {
                doc.setFontSize(10);
                doc.setTextColor(150);
                doc.text("(No linked formulation found)", 14, finalY);
                doc.setTextColor(0);
                finalY += 10;
            }

            // Packaging Table
            if (formulation?.packaging?.length > 0) {
                // Check for page break
                if (finalY > 250) { doc.addPage(); finalY = 20; }

                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text("Packaging BOM", 14, finalY);
                doc.setFont(undefined, 'normal');

                const packBody = formulation.packaging.map(p => [
                    p.item,
                    p.qty
                ]);

                autoTable(doc, {
                    startY: finalY + 5,
                    head: [['Material Item', 'Quantity']],
                    body: packBody,
                    theme: 'grid',
                    headStyles: { fillColor: [51, 65, 85] },
                    styles: { fontSize: 9 },
                    columnStyles: { 0: { cellWidth: 120 } }
                });
            }

            doc.save(`${sku.name}_Spec.pdf`);

        } catch (error) {
            console.error("PDF Generation Error:", error);
            alert("Failed to generate PDF");
        }
    };

    return (
        <div className="flex flex-col h-full animate-fade-in space-y-2">
            <div className="flex justify-between items-center shrink-0 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-100 rounded border border-slate-200">
                        <Icons.Product className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                        <h2 className="font-bold text-base text-slate-800 leading-tight">Product Catalog</h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{filteredProducts.length} Product Models Managed</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <input
                            className="bg-white border border-slate-300 text-[11px] font-medium text-slate-600 rounded-md pl-8 pr-3 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none w-52 transition-all hover:border-slate-400 placeholder:text-slate-300"
                            placeholder="SEARCH CATALOG..."
                            value={localSearch}
                            onChange={e => setLocalSearch(e.target.value)}
                        />
                        <Icons.Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    </div>

                    <div className="relative group">
                        <select
                            className="appearance-none bg-white border border-slate-300 text-[10px] font-bold text-slate-500 uppercase tracking-widest rounded-md pl-3 pr-8 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer hover:border-slate-400 transition-colors"
                            value={filterFormat}
                            onChange={e => setFilterFormat(e.target.value)}
                        >
                            <option value="All">All Formats</option>
                            {(settings?.formats || []).map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <Icons.ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="flex bg-slate-100 rounded-md p-0.5 border border-slate-200">
                        <button
                            onClick={() => setSort(prev => ({ ...prev, key: 'name', dir: prev.key === 'name' ? (prev.dir === 'asc' ? 'desc' : 'asc') : 'asc' }))}
                            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all flex items-center gap-1 ${sort.key === 'name' ? 'bg-white shadow-sm text-blue-600 border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Sort A-Z
                            {sort.key === 'name' && (sort.dir === 'asc' ? <Icons.ArrowDown className="w-2.5 h-2.5" /> : <Icons.ArrowUp className="w-2.5 h-2.5" />)}
                        </button>
                    </div>

                    <Button icon={Icons.Plus} onClick={() => setModal({ open: true, type: 'product' })} className="shadow-sm uppercase text-[11px] tracking-widest px-5">New</Button>
                </div>
            </div>

            <div className="flex flex-col gap-1.5 pb-10">
                {filteredProducts.map(p => {
                    const pSkus = skus.filter(s => s.productId === p.id);
                    const isExpanded = expandedProduct === p.id;
                    const skuIds = pSkus.map(s => s.id);
                    const clientIds = [...new Set(quotesSent.filter(q => skuIds.includes(q.skuId)).map(q => q.clientId))];
                    const activeQuotesCount = quotesSent.filter(q => skuIds.includes(q.skuId) && q.status === 'Active').length;

                    return (
                        <div key={p.id} className={`bg-white border transition-all overflow-hidden ${isExpanded ? 'border-blue-300 ring-1 ring-blue-100 shadow-md transform scale-[1.002]' : 'border-slate-200 hover:border-blue-400 shadow-sm'}`}>
                            <div className={`px-3 py-2 flex items-center justify-between cursor-pointer group transition-colors ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-slate-50/30'}`} onClick={() => setExpandedProduct(isExpanded ? null : p.id)}>
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-7 h-7 rounded border flex items-center justify-center font-bold text-xs transition-colors shrink-0 ${isExpanded ? 'bg-blue-100 border-blue-200 text-blue-700 shadow-inner' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                        {p.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-[13px] text-slate-800 leading-none">{p.name}</h3>
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 bg-white px-1 py-px rounded border border-slate-200">{p.format}</span>
                                            {p.driveLink && <a href={p.driveLink} target="_blank" onClick={e => e.stopPropagation()} className="text-slate-300 hover:text-blue-500 transition-colors"><Icons.Link className="w-3 h-3" /></a>}
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] uppercase font-bold tracking-wider">
                                            <div className="flex items-center gap-1 text-slate-500">
                                                <Icons.Columns className="w-3 h-3 text-slate-300" />
                                                <span>{pSkus.length} <span className="text-[9px] opacity-70">Vars</span></span>
                                            </div>
                                            <div className="flex items-center gap-1 text-slate-500">
                                                <Icons.Users className="w-3 h-3 text-slate-300" />
                                                <span>{clientIds.length} <span className="text-[9px] opacity-70">Clients</span></span>
                                            </div>
                                            {activeQuotesCount > 0 && (
                                                <div
                                                    onClick={(e) => { e.stopPropagation(); setActiveQuotesView({ open: true, productId: p.id }); }}
                                                    className="text-emerald-600 flex items-center gap-1 hover:text-emerald-700 transition-colors"
                                                >
                                                    <Icons.Money className="w-3 h-3" />
                                                    <span>{activeQuotesCount} <span className="text-[9px] opacity-70">Active</span></span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setModal({ open: true, type: 'product', data: p, isEdit: true }) }}
                                        className="p-1 text-slate-300 hover:text-blue-600 transition-all rounded hover:bg-white"
                                    >
                                        <Icons.Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <div className={`text-slate-300 transition-all duration-300 p-0.5 ${isExpanded ? 'rotate-180 text-blue-500 bg-white rounded-full shadow-sm' : ''}`}>
                                        <Icons.ChevronDown className="w-3.5 h-3.5" />
                                    </div>
                                </div>
                            </div>
                            {isExpanded && (
                                <div className="border-t border-slate-100 bg-slate-50/40 px-3 py-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex justify-between items-center mb-2 px-1">
                                        <h4 className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.15em]">SKU Matrix</h4>
                                        <button
                                            onClick={() => setModal({ open: true, type: 'sku', data: { productId: p.id, productName: p.name } })}
                                            className="px-2 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm"
                                        >
                                            + Add SKU
                                        </button>
                                    </div>
                                    {pSkus.length > 0 ? (
                                        <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-slate-50/80 border-b border-slate-200 uppercase">
                                                    <tr>
                                                        <th className="px-3 py-1.5 text-[10px] font-bold text-slate-400 tracking-widest min-w-[150px]">Variant</th>
                                                        <th className="px-3 py-1.5 text-[10px] font-bold text-slate-400 tracking-widest">Pack</th>
                                                        <th className="px-3 py-1.5 text-[10px] font-bold text-slate-400 tracking-widest">Code</th>
                                                        <th className="px-3 py-1.5 text-[10px] font-bold text-slate-400 tracking-widest">Benchmark</th>
                                                        <th className="px-3 py-1.5 text-[10px] font-bold text-slate-400 tracking-widest text-right">Control</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {pSkus.map(s => {
                                                        const latestBuy = quotesReceived.filter(q => q.skuId === s.id).sort((a, b) => b.createdAt - a.createdAt)[0];
                                                        return (
                                                            <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group/row">
                                                                <td className="px-3 py-1.5">
                                                                    <span className="font-semibold text-slate-700 text-[12px]">{s.variant}</span>
                                                                    {s.flavour && <span className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter ml-1.5">{s.flavour}</span>}
                                                                </td>
                                                                <td className="px-3 py-1.5">
                                                                    <span className="text-[11px] font-medium text-slate-600">{s.packSize} {s.unit}</span>
                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase ml-1">{s.packType}</span>
                                                                </td>
                                                                <td className="px-3 py-1.5">
                                                                    <code className="text-[10px] font-bold text-slate-400 font-mono bg-slate-50 px-1 py-px border border-slate-100 rounded">{s.name}</code>
                                                                </td>
                                                                <td className="px-3 py-1.5">
                                                                    {latestBuy ? (
                                                                        <span className="text-[12px]"><span className="font-bold text-slate-800">{formatMoney(latestBuy.price, latestBuy.currency)}</span> <span className="text-[9px] text-slate-400">from {vendors.find(v => v.id === latestBuy.vendorId)?.companyName}</span></span>
                                                                    ) : <span className="text-[10px] text-slate-200">—</span>}
                                                                </td>
                                                                <td className="px-3 py-1.5 text-right">
                                                                    <div className="flex justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                                                        <button onClick={(e) => generateSkuPdf(e, s)} className="p-1 bg-white border border-slate-200 rounded text-green-500 hover:border-green-300 hover:bg-green-50 transition-all" title="Technical Datasheet"><Icons.File className="w-3 h-3" /></button>
                                                                        <button onClick={() => onNavigateToFormulation(s.id)} className="p-1 bg-white border border-slate-200 rounded text-purple-500 hover:border-purple-300 hover:bg-purple-50 transition-all" title="Formulation / BOM"><Icons.List className="w-3 h-3" /></button>
                                                                        <button onClick={() => setModal({ open: true, type: 'sku', data: s, isEdit: true })} className="p-1 bg-white border border-slate-200 rounded text-blue-500 hover:border-blue-300 hover:bg-blue-50 transition-all" title="Settings"><Icons.Edit className="w-3 h-3" /></button>
                                                                        <button onClick={() => { if (confirm('Delete SKU configuration?')) actions.del('skus', s.id) }} className="p-1 bg-white border border-slate-200 rounded text-red-400 hover:border-red-300 hover:bg-red-50 transition-all" title="Remove"><Icons.X className="w-3 h-3" /></button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="py-12 text-center border-2 border-dashed border-slate-200 bg-white/50 rounded-lg">
                                            <Icons.Product className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Matrix Empty</p>
                                            <p className="text-[10px] text-slate-300 mt-1 uppercase">Initialize SKU configurations to enable operations</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};