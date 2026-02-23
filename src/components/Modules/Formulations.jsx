import React, { useState, useEffect } from 'react';
import { Icons } from '../ui/Icons';
import { Button } from '../ui/Button';
import { formatDate } from '../../utils/helpers';

export const Formulations = ({ data, actions, setModal, targetFormulationId }) => {
    const { formulations, skus, products } = data;
    const [expandedId, setExpandedId] = useState(null);
    const [localSearch, setLocalSearch] = useState('');

    const filteredFormulations = React.useMemo(() => {
        return formulations.filter(f => {
            const s = skus.find(i => i.id === f.skuId);
            const p = products.find(i => i.id === s?.productId);
            const searchStr = `${p?.name} ${s?.variant} ${s?.name}`.toLowerCase();
            return searchStr.includes(localSearch.toLowerCase());
        });
    }, [formulations, skus, products, localSearch]);

    // Auto-expand if a specific ID is targeted (from Product Module)
    useEffect(() => {
        if (targetFormulationId) {
            setTimeout(() => setExpandedId(targetFormulationId), 0);
        }
    }, [targetFormulationId]);

    const formatNum = (val) => {
        if (val === '' || val === null || val === undefined) return '';
        const num = parseFloat(val);
        if (isNaN(num)) return val;
        return num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    };

    const calculateTotal = (ingredients, field) => {
        const total = ingredients.reduce((sum, item) => sum + (parseFloat(item[field]) || 0), 0);
        return formatNum(total.toFixed(2));
    };

    return (
        <div className="flex flex-col h-full animate-fade-in space-y-2">
            {/* Header Toolbar */}
            <div className="flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base text-slate-800">Formulations</h2>
                    <span className="text-slate-400 font-light text-base">/</span>
                    <span className="text-[13px] font-semibold text-slate-500">{formulations.length} records</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative group">
                        <input
                            className="bg-white border border-slate-200 text-xs rounded-md pl-8 pr-3 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none w-52 transition-all hover:border-slate-300"
                            placeholder="Search by SKU Code or Product..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                        />
                        <Icons.Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <Button icon={Icons.Plus} onClick={() => setModal({ open: true, type: 'formulation' })}>New</Button>
                </div>
            </div>

            {/* List Content */}
            <div className="flex flex-col gap-1 pb-10 overflow-y-auto scroller">
                {filteredFormulations.map(f => {
                    const s = skus.find(i => i.id === f.skuId);
                    const p = products.find(i => i.id === s?.productId);
                    const isExpanded = expandedId === f.id;

                    return (
                        <div key={f.id} className={`bg-white rounded border transition-all ${isExpanded ? 'border-blue-300 ring-1 ring-blue-100 shadow-sm' : 'border-slate-200 hover:border-blue-400'}`}>
                            {/* Row Item */}
                            <div className="px-3 py-1.5 flex items-center justify-between cursor-pointer group" onClick={() => setExpandedId(isExpanded ? null : f.id)}>
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <div className="w-6 h-6 rounded flex items-center justify-center bg-purple-50 text-purple-600 border border-purple-100/50 flex-shrink-0">
                                        <Icons.List className="w-3 h-3" />
                                    </div>
                                    <div className="min-w-0 flex items-center gap-3 flex-wrap">
                                        <span className="font-bold text-[13px] text-slate-800 truncate">{s?.name || 'Unknown SKU'}</span>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                            <span className="font-mono">Serving: {f.servingSizeValue || '-'}{f.servingSizeUnit || ''}</span>
                                            <span className="flex items-center gap-1">
                                                {(f.ingredients || []).length > 0 && <span title="Ingredients" className="text-purple-500"><Icons.List className="w-3 h-3" /></span>}
                                                {(f.packaging || []).length > 0 && <span title="Packaging BOM" className="text-amber-500"><Icons.Box className="w-3 h-3" /></span>}
                                                {(f.healthBenefits || []).length > 0 && <span title="Health Benefits" className="text-green-500"><Icons.Check className="w-3 h-3" /></span>}
                                            </span>
                                            <span className="text-slate-400">{formatDate(f.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); setModal({ open: true, type: 'formulation', data: f, isEdit: true }) }} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors" title="Edit"><Icons.Edit className="w-3 h-3" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); setModal({ open: true, type: 'formulation', data: { ...f, skuId: '', packaging: [], id: undefined, sourceProductId: s?.productId, ingredients: JSON.parse(JSON.stringify(f.ingredients || [])), healthBenefits: JSON.parse(JSON.stringify(f.healthBenefits || [])) }, isDuplicate: true }) }} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-purple-600 transition-colors" title="Duplicate"><Icons.Copy className="w-3 h-3" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); actions.del('formulations', f.id) }} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600 transition-colors" title="Delete"><Icons.Trash className="w-3 h-3" /></button>
                                    </div>
                                    <div className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-blue-500' : ''}`}>
                                        <Icons.ChevronDown className="w-3.5 h-3.5" />
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                                <div className="border-t border-slate-100 bg-slate-50/50 px-3 py-2 animate-in slide-in-from-top-2 duration-200 grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {/* Ingredients Table */}
                                    <div className="min-w-0">
                                        <h4 className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mb-1.5 flex items-center gap-1">
                                            <Icons.List className="w-2.5 h-2.5" /> Ingredients
                                        </h4>
                                        <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
                                            <div className="overflow-x-auto scroller">
                                                <table className="w-full text-[11px] border-collapse">
                                                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                                        <tr>
                                                            <th className="px-2 py-1 text-left">Item</th>
                                                            <th className="px-2 py-1 text-left">Type</th>
                                                            <th className="px-2 py-1 text-right w-14">Qty %</th>
                                                            <th className="px-2 py-1 text-right w-16">/Serv ({f.dosageUnit || ''})</th>
                                                            <th className="px-2 py-1 text-right w-16 bg-blue-50/50">/Sku</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {(f.ingredients || []).map((ing, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="px-2 py-1 font-medium text-slate-700">{ing.name}</td>
                                                                <td className="px-2 py-1">
                                                                    <span className={`text-[9px] font-bold uppercase px-1 py-px rounded border ${ing.type === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                                                        {ing.type || 'Active'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-2 py-1 text-right text-slate-600">{ing.per100g}%</td>
                                                                <td className="px-2 py-1 text-right text-slate-600">{formatNum(ing.perServing)}</td>
                                                                <td className="px-2 py-1 text-right font-bold text-slate-700 bg-blue-50/20">{formatNum(ing.perSku)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot className="bg-slate-50 font-bold text-[10px] text-slate-700 border-t border-slate-200">
                                                        <tr>
                                                            <td colSpan="2" className="px-2 py-1 text-right uppercase text-slate-400">Total</td>
                                                            <td className="px-2 py-1 text-right">{calculateTotal(f.ingredients || [], 'per100g')}%</td>
                                                            <td className="px-2 py-1 text-right">{calculateTotal(f.ingredients || [], 'perServing')}</td>
                                                            <td className="px-2 py-1 text-right bg-blue-100/30">{calculateTotal(f.ingredients || [], 'perSku')}</td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Packaging + Health Benefits */}
                                    <div className="min-w-0 flex flex-col gap-4">
                                        {/* Packaging Table */}
                                        <div>
                                            <h4 className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mb-1.5 flex items-center gap-1">
                                                <Icons.Box className="w-2.5 h-2.5" /> Packaging BOM
                                            </h4>
                                            <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
                                                <table className="w-full text-[11px] border-collapse">
                                                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                                        <tr>
                                                            <th className="px-2 py-1 text-left">Material</th>
                                                            <th className="px-2 py-1 text-right w-20">Qty/Unit</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {(f.packaging || []).map((pack, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="px-2 py-1 font-medium text-slate-700">{pack.item}</td>
                                                                <td className="px-2 py-1 text-right text-slate-600">{pack.qty}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                {(f.packaging?.length === 0 || !f.packaging) && (
                                                    <div className="py-4 text-center text-slate-300 text-[10px] font-bold uppercase tracking-widest">No packaging items</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Health Benefits */}
                                        <div>
                                            <h4 className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mb-1.5 flex items-center gap-1">
                                                <Icons.Check className="w-2.5 h-2.5" /> Health Benefits
                                            </h4>
                                            <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
                                                {(f.healthBenefits && f.healthBenefits.length > 0) ? (
                                                    <div className="p-2 flex flex-col gap-1">
                                                        {f.healthBenefits.map((hb, idx) => (
                                                            <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-700">
                                                                <span className="text-green-500 mt-0.5 flex-shrink-0">•</span>
                                                                <span>{hb.benefit}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="py-4 text-center text-slate-300 text-[10px] font-bold uppercase tracking-widest">No benefits listed</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};