import React, { useState, useEffect } from 'react';
import { Icons } from '../ui/Icons';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatDate } from '../../utils/helpers';

export const Formulations = ({ data, actions, setModal, targetFormulationId }) => {
    const { formulations, skus, products } = data;
    const [expandedId, setExpandedId] = useState(null);

    // Auto-expand if a specific ID is targeted (from Product Module)
    useEffect(() => {
        if (targetFormulationId) {
            // Fix: Wrap in setTimeout to avoid synchronous state update warning
            setTimeout(() => setExpandedId(targetFormulationId), 0);
        }
    }, [targetFormulationId]);

    const calculateTotal = (ingredients, field) => {
        return ingredients.reduce((sum, item) => sum + (parseFloat(item[field]) || 0), 0).toFixed(2);
    };

    return (
        <div className="flex flex-col h-full animate-fade-in space-y-4">
            {/* Header Toolbar */}
            <div className="flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                    <h2 className="font-bold text-lg text-slate-800">Formulations</h2>
                    <span className="text-slate-400 font-light text-lg">/</span>
                    <span className="text-[13px] font-semibold text-slate-500">{formulations.length} records</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative group">
                        <input
                            className="bg-white border border-slate-200 text-xs rounded-md pl-8 pr-3 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none w-48 transition-all hover:border-slate-300"
                            placeholder="Search formulation..."
                        />
                        <Icons.Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <Button icon={Icons.Plus} onClick={() => setModal({ open: true, type: 'formulation' })}>New</Button>
                </div>
            </div>

            {/* List Content */}
            <div className="flex flex-col gap-2 pb-10">
                {formulations.map(f => {
                    const s = skus.find(i => i.id === f.skuId);
                    const p = products.find(i => i.id === s?.productId);
                    const isExpanded = expandedId === f.id;

                    return (
                        <div key={f.id} className={`bg-white rounded border transition-all ${isExpanded ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200 hover:border-blue-400'}`}>
                            {/* Row Item */}
                            <div className="p-3 flex items-center justify-between cursor-pointer group" onClick={() => setExpandedId(isExpanded ? null : f.id)}>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded flex items-center justify-center bg-purple-50 text-purple-600 border border-purple-100/50">
                                        <Icons.List className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm text-slate-800">{p?.name || 'Unknown Product'}</span>
                                            <span className="text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{s?.variant}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                                            <span className="font-mono">Serving: {f.servingSizeValue}{f.servingSizeUnit}</span>
                                            <span className="w-0.5 h-3 bg-slate-200"></span>
                                            <span>Updated: {formatDate(f.createdAt)}</span>
                                            <span className="w-0.5 h-3 bg-slate-200"></span>
                                            <span className="font-bold text-slate-600">{(f.ingredients || []).length} Ingredients</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                                        <button onClick={(e) => { e.stopPropagation(); setModal({ open: true, type: 'formulation', data: f, isEdit: true }) }} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600" title="Edit"><Icons.Edit className="w-3.5 h-3.5" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); actions.del('formulations', f.id) }} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600" title="Delete"><Icons.Trash className="w-3.5 h-3.5" /></button>
                                    </div>
                                    <div className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                        <Icons.ChevronDown className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                                <div className="border-t border-slate-100 bg-slate-50/50 p-4 animate-fade-in-down grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Ingredients Table */}
                                    <div>
                                        <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-1.5">
                                            <Icons.List className="w-3 h-3" /> Ingredients
                                        </h4>
                                        <div className="bg-white rounded border border-slate-200 overflow-hidden">
                                            <table className="w-full text-[11px]">
                                                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                                    <tr>
                                                        <th className="px-3 py-1.5 text-left">Item</th>
                                                        <th className="px-3 py-1.5 text-left">Type</th>
                                                        <th className="px-3 py-1.5 text-right w-16">Qty %</th>
                                                        <th className="px-3 py-1.5 text-right w-16">/Serv ({f.dosageUnit || ''})</th>
                                                        <th className="px-3 py-1.5 text-right w-16 bg-blue-50/30">/Sku ({f.dosageUnit || ''})</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {(f.ingredients || []).map((ing, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/50">
                                                            <td className="px-3 py-1.5 font-medium text-slate-700">{ing.name}</td>
                                                            <td className="px-3 py-1.5">
                                                                <span className={`text-[9px] font-bold uppercase px-1 py-px rounded border ${ing.type === 'Active' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                                                    {ing.type || 'Active'}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-1.5 text-right text-slate-600 font-mono">{ing.per100g}%</td>
                                                            <td className="px-3 py-1.5 text-right text-slate-600 font-mono">{ing.perServing}</td>
                                                            <td className="px-3 py-1.5 text-right font-bold text-slate-700 bg-blue-50/20 font-mono">{ing.perSku}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="bg-slate-50 font-bold text-[10px] text-slate-700 border-t border-slate-200">
                                                    <tr>
                                                        <td className="px-3 py-1.5 text-right uppercase text-slate-400">Total %</td>
                                                        <td className="px-3 py-1.5 text-right">{calculateTotal(f.ingredients || [], 'per100g')}%</td>
                                                        <td className="px-3 py-1.5 text-right">{calculateTotal(f.ingredients || [], 'perServing')}</td>
                                                        <td className="px-3 py-1.5 text-right bg-blue-100/30">{calculateTotal(f.ingredients || [], 'perSku')}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Packaging Table */}
                                    <div>
                                        <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-1.5">
                                            <Icons.Box className="w-3 h-3" /> Packaging BOM
                                        </h4>
                                        <div className="bg-white rounded border border-slate-200 overflow-hidden">
                                            <table className="w-full text-[11px]">
                                                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                                    <tr>
                                                        <th className="px-3 py-1.5 text-left">Material</th>
                                                        <th className="px-3 py-1.5 text-right w-20">Qty</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {(f.packaging || []).map((pack, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/50">
                                                            <td className="px-3 py-1.5 font-medium text-slate-700">{pack.item}</td>
                                                            <td className="px-3 py-1.5 text-right text-slate-600 font-mono">{pack.qty}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
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