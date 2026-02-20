import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Correct import for Vite
import { Icons } from '../ui/Icons';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatDate } from '../../utils/helpers';

export const RFQMaster = ({ data, actions, setModal }) => {
    // Added 'formulations' to destructuring
    const { rfqs = [], vendors, skus, products, formulations = [] } = data;
    const [searchTerm, setSearchTerm] = useState('');

    const getVendorName = (id) => vendors.find(v => v.id === id)?.companyName || 'Unknown Vendor';

    // Helper to get display details based on Type
    const getRfqDetails = (item) => {
        if (item.requestType === 'Custom') {
            return {
                title: item.customProductName || 'Custom Item',
                subtitle: item.customDescription || '-'
            };
        } else {
            const s = skus.find(x => x.id === item.skuId);
            const p = products.find(x => x.id === s?.productId);
            return {
                title: p ? `${p.name} (${s?.variant})` : 'Unknown Product',
                subtitle: s ? `${s.packSize} ${s.unit} ${s.packType}` : '-'
            };
        }
    };

    const filtered = rfqs.filter(r => {
        const vendor = getVendorName(r.vendorId).toLowerCase();
        const details = getRfqDetails(r);
        const search = searchTerm.toLowerCase();
        return vendor.includes(search) || details.title.toLowerCase().includes(search);
    });

    const generatePDF = (e, item) => {
        e.stopPropagation(); // Prevent row click
        try {
            const doc = new jsPDF();
            const vendor = vendors.find(v => v.id === item.vendorId);

            // --- DATE WITH YEAR ---
            let displayDate = '-';
            if (item.createdAt) {
                const d = new Date(item.createdAt.seconds ? item.createdAt.seconds * 1000 : item.createdAt);
                if (!isNaN(d.getTime())) {
                    displayDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
                }
            }

            // --- Header ---
            doc.setFontSize(20);
            doc.text("Request for Quotation (RFQ)", 105, 20, null, null, "center");

            doc.setFontSize(10);
            doc.text(`Date: ${displayDate}`, 14, 35);
            doc.text(`Vendor: ${vendor?.companyName || 'Unknown Vendor'}`, 14, 40);

            // --- Construct Body based on Type ---
            let tableBody = [];

            if (item.requestType === 'Custom') {
                tableBody = [
                    ['Request Type', 'Custom Item'],
                    ['Product Name', item.customProductName || '-'],
                    ['Description', item.customDescription || '-'],
                    ['Quantity', `${item.qty || 0} units`],
                    ['Target Price', item.targetPrice ? `${item.currency} ${item.targetPrice}` : 'N/A'],
                    ['Country of Sale', item.countryOfSale || '-']
                ];
            } else {
                const s = skus.find(x => x.id === item.skuId);
                const p = products.find(x => x.id === s?.productId);

                // --- NEW LOGIC START: Find Formulation & Packing ---
                const formulation = formulations.find(f => f.skuId === s?.id);
                const packingMaterials = formulation?.packaging?.length > 0
                    ? formulation.packaging.map(pk => `${pk.item} (${pk.qty})`).join(', ')
                    : 'None / Not Linked';
                // --- NEW LOGIC END ---

                tableBody = [
                    ['Request Type', 'Standard SKU'],
                    ['Product', p?.name || '-'],
                    ['Variant', s?.variant || '-'],
                    ['Pack Details', s ? `${s.packSize} ${s.unit} (${s.packType})` : '-'],
                    ['Packing Materials', packingMaterials], // <--- Added here
                    ['Quantity', `${item.qty || 0} units`],
                    ['Target Price', item.targetPrice ? `${item.currency} ${item.targetPrice}` : 'N/A'],
                    ['Country of Sale', item.countryOfSale || '-']
                ];
            }

            // --- Generate Table ---
            autoTable(doc, {
                startY: 50,
                head: [['Field', 'Value']],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [51, 65, 85] }, // Slate-700
                styles: { fontSize: 10, cellPadding: 2 },
                columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' } } // Bold keys
            });

            // --- NEW: Add Formulation Table (If SKU type and formulation exists) ---
            if (item.requestType !== 'Custom') {
                const s = skus.find(x => x.id === item.skuId);
                const formulation = formulations.find(f => f.skuId === s?.id);
                let finalY = doc.lastAutoTable.finalY;

                if (formulation?.ingredients?.length > 0) {
                    if (finalY > 230) { doc.addPage(); finalY = 20; }

                    doc.setFontSize(11);
                    doc.setFont(undefined, 'bold');
                    doc.text("Formulation Details:", 14, finalY + 10);
                    doc.setFont(undefined, 'normal');

                    // UPDATED: Added 'perServing' column
                    const ingBody = formulation.ingredients.map(ing => [
                        ing.name,
                        ing.type || 'Active',
                        ing.per100g || '-',
                        ing.perServing || '-', // <--- Added this
                        ing.perSku || '-'
                    ]);

                    autoTable(doc, {
                        startY: finalY + 15,
                        // UPDATED Header to match columns
                        head: [['Ingredient', 'Type', 'Qty / 100g', 'Qty / Serving', 'Qty / Unit']],
                        body: ingBody,
                        theme: 'striped',
                        headStyles: { fillColor: [100, 116, 139] },
                        styles: { fontSize: 9, cellPadding: 1.5 },
                    });
                }
            }

            // --- Save ---
            const filename = `RFQ_${vendor?.companyName || 'Vendor'}_${displayDate}.pdf`;
            doc.save(filename);

        } catch (error) {
            console.error("RFQ PDF Error:", error);
            alert("Failed to generate PDF. See console for details.");
        }
    };

    return (
        <div className="flex flex-col h-full animate-fade-in space-y-2">
            {/* Toolbar */}
            <div className="flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base text-slate-800">RFQ</h2>
                    <span className="text-slate-400 font-light text-base">/</span>
                    <span className="text-[13px] font-semibold text-slate-500">{filtered.length} records</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative group">
                        <input
                            className="bg-white border border-slate-200 text-xs rounded-md pl-8 pr-3 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none w-48 transition-all hover:border-slate-300"
                            placeholder="Search RFQ..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <Icons.Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <Button icon={Icons.Plus} onClick={() => setModal({ open: true, type: 'rfq' })}>New</Button>
                </div>
            </div>

            {/* Dense Data Table */}
            <div className="flex-1 overflow-auto bg-white rounded border border-slate-200 shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200 z-10 shadow-sm">
                        <tr>
                            <th className="px-2 py-1.5 w-20">Date</th>
                            <th className="px-2 py-1.5 w-28">Vendor</th>
                            <th className="px-2 py-1.5 w-16">Type</th>
                            <th className="px-2 py-1.5">Item Details</th>
                            <th className="px-2 py-1.5 w-32">Qty / Target</th>
                            <th className="px-2 py-1.5 w-20">Country</th>
                            <th className="px-2 py-1.5 text-right w-16">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[13px]">
                        {filtered.map(item => {
                            const details = getRfqDetails(item);
                            return (
                                <tr key={item.id} className="hover:bg-blue-50/30 group transition-colors border-b border-slate-50 last:border-0">
                                    <td className="px-2 py-1 whitespace-nowrap text-slate-500 font-mono text-[11px]">{formatDate(item.createdAt)}</td>
                                    <td className="px-2 py-1 font-medium text-slate-700 text-[12px] truncate max-w-[110px]" title={getVendorName(item.vendorId)}>{getVendorName(item.vendorId)}</td>
                                    <td className="px-2 py-1 whitespace-nowrap">
                                        <span className={`text-[8px] font-bold uppercase tracking-wider px-1 py-px rounded border whitespace-nowrap ${item.requestType === 'Custom' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                            {item.requestType === 'Product SKU' ? 'SKU' : item.requestType}
                                        </span>
                                    </td>
                                    <td className="px-2 py-1">
                                        <span className="font-semibold text-slate-800 text-[12px]">{details.title}</span>
                                        <span className="text-[10px] text-slate-400 ml-1">{details.subtitle}</span>
                                    </td>
                                    <td className="px-2 py-1 whitespace-nowrap">
                                        <span className="text-slate-700 font-medium text-[12px]">{item.qty} <span className="text-[9px] text-slate-400 font-normal">units</span></span>
                                        {item.targetPrice && <span className="text-[10px] text-slate-500 font-mono ml-1">{item.currency} {item.targetPrice}</span>}
                                    </td>
                                    <td className="px-2 py-1 text-slate-500 text-[10px] truncate max-w-[80px]" title={item.countryOfSale}>{item.countryOfSale || '-'}</td>
                                    <td className="px-2 py-1 text-right">
                                        <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => generatePDF(e, item)} className="p-1 hover:bg-green-100 rounded text-slate-400 hover:text-green-600 transition-colors" title="Download PDF"><Icons.File className="w-3 h-3" /></button>
                                            <button onClick={() => setModal({ open: true, type: 'rfq', data: item, isEdit: true })} className="p-1 hover:bg-blue-100 rounded text-slate-400 hover:text-blue-600 transition-colors" title="Edit"><Icons.Edit className="w-3 h-3" /></button>
                                            <button onClick={() => actions.del('rfqs', item.id)} className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-600 transition-colors" title="Delete"><Icons.Trash className="w-3 h-3" /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr><td colSpan="7" className="p-6 text-center text-slate-400 text-xs italic">No RFQs found. Click "New" to create one.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};