import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Icons } from '../ui/Icons';
import { Button } from '../ui/Button';
import { formatDate } from '../../utils/helpers';

export const ORSMaster = ({ data, actions, setModal }) => {
    // Added 'clients' to destructuring
    const { ors = [], vendors, clients, skus, products, formulations = [] } = data;
    const [searchTerm, setSearchTerm] = useState('');

    const getVendorName = (id) => vendors.find(v => v.id === id)?.companyName || 'Unknown Vendor';
    const getClientName = (id) => clients.find(c => c.id === id)?.companyName || 'Unknown Client';

    const getSkuDetails = (skuId) => {
        const s = skus.find(x => x.id === skuId);
        const p = products.find(x => x.id === s?.productId);
        return s && p ? `${p.name} - ${s.variant} (${s.packSize}${s.unit})` : 'Unknown Item';
    };

    const filtered = ors.filter(o =>
        getVendorName(o.vendorId).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getClientName(o.clientId).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const generatePDF = (e, item) => {
        e.stopPropagation();

        const type = item.recipientType || 'Vendor';

        // --- Helper Function to Create One PDF ---
        const createDoc = (targetName, suffix) => {
            const doc = new jsPDF();
            const sku = skus.find(s => s.id === item.skuId);
            const product = products.find(p => p.id === sku?.productId);
            const formulation = formulations.find(f => f.skuId === sku?.id);

            const dateObj = new Date(item.date);
            const dateWithYear = !isNaN(dateObj)
                ? dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
                : '-';

            const packingMaterials = formulation?.packaging?.length > 0
                ? formulation.packaging.map(p => `${p.item} (${p.qty})`).join(', ')
                : 'None / Not Linked';

            // --- Header ---
            doc.setFontSize(20);
            doc.text("OEM Request Sheet (ORS)", 105, 20, null, null, "center");

            doc.setFontSize(10);
            // Removed PO No. Line
            doc.text(`Date: ${dateWithYear}`, 14, 35);
            doc.text(`To: ${targetName}`, 14, 40); // Adjusted Y position

            // --- Main Details Table ---
            const tableBody = [
                ['Product', product?.name || '-'],
                ['Variant', sku?.variant || '-'],
                ['Flavour', sku?.flavour || '-'],
                ['Pack Details', sku ? `${sku.packSize} ${sku.unit} (${sku.packType})` : '-'],
                ['Packing Materials', packingMaterials],
                ['Quantity', `${item.qty || 0} units`],
                ['Country of Sale', item.countryOfSale || '-'],
                ['Lead Time', `${item.leadTime || 0} weeks`],
                ['Shelf Life', `${item.shelfLife || 0} months`],
            ];

            autoTable(doc, {
                startY: 50, // Adjusted startY
                head: [['Field', 'Value']],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [51, 65, 85] },
                styles: { fontSize: 10, cellPadding: 2 },
                columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' } }
            });

            let finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || 150;

            // --- Formulation Table ---
            if (formulation?.ingredients?.length > 0) {
                if (finalY > 230) { doc.addPage(); finalY = 20; }

                doc.setFontSize(11);
                doc.setFont(undefined, 'bold');
                doc.text("Formulation Details:", 14, finalY + 10);
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
                    startY: finalY + 15,
                    head: [['Ingredient', 'Type', 'Qty %', `Qty/Serv (${dosageUnit})`, `Qty/Unit (${dosageUnit})`]],
                    body: ingBody,
                    theme: 'striped',
                    headStyles: { fillColor: [71, 85, 105] },
                    styles: { fontSize: 9, cellPadding: 1.5 },
                });

                finalY = doc.lastAutoTable.finalY;
            }

            // --- Documents Checklist ---
            const docsList = Object.entries(item.requiredDocs || {})
                .filter(([, required]) => required)
                .map(([docName]) => [docName, "Required"]);

            if (docsList.length > 0) {
                if (finalY > 240) { doc.addPage(); finalY = 20; }

                doc.setFontSize(11);
                doc.setFont(undefined, 'bold');
                doc.text("Required Documents:", 14, finalY + 10);
                doc.setFont(undefined, 'normal');

                autoTable(doc, {
                    startY: finalY + 15,
                    body: docsList,
                    theme: 'plain',
                    styles: { fontSize: 9, cellPadding: 1 },
                    columnStyles: { 0: { cellWidth: 100 }, 1: { fontStyle: 'bold' } }
                });
            }

            // Update filename: removed poNumber
            doc.save(`ORS_${dateWithYear}_${suffix}.pdf`);
        };

        try {
            // --- LOGIC FOR 3 SCENARIOS ---
            if (type === 'Vendor' || type === 'Both') {
                const vName = getVendorName(item.vendorId);
                createDoc(vName, 'Vendor');
            }

            if (type === 'Client' || type === 'Both') {
                const cName = getClientName(item.clientId);
                if (type === 'Both') {
                    setTimeout(() => createDoc(cName, 'Client'), 500);
                } else {
                    createDoc(cName, 'Client');
                }
            }

        } catch (error) {
            console.error("PDF Generation Error:", error);
            alert(`Failed to generate PDF: ${error.message}`);
        }
    };

    return (
        <div className="flex flex-col h-full animate-fade-in space-y-2">
            {/* Header Toolbar */}
            <div className="flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base text-slate-800">ORS</h2>
                    <span className="text-slate-400 font-light text-base">/</span>
                    <span className="text-[13px] font-semibold text-slate-500">{filtered.length} records</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative group">
                        <input
                            className="bg-white border border-slate-200 text-xs rounded-md pl-8 pr-3 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none w-48 transition-all hover:border-slate-300"
                            placeholder="Search ORS..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <Icons.Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <Button icon={Icons.Plus} onClick={() => setModal({ open: true, type: 'ors' })}>New</Button>
                </div>
            </div>

            {/* Dense Data Table */}
            <div className="flex-1 overflow-auto bg-white rounded border border-slate-200 shadow-sm scroller">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200 z-10 shadow-sm">
                        <tr>
                            <th className="px-3 py-1.5 w-24">Date</th>
                            <th className="px-3 py-1.5 w-44">Vendor / Client</th>
                            <th className="px-3 py-1.5">SKU Details</th>
                            <th className="px-3 py-1.5 w-20">Qty</th>
                            <th className="px-3 py-1.5 w-28">Country</th>
                            <th className="px-3 py-1.5 w-20 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[13px]">
                        {filtered.map(item => (
                            <tr key={item.id} className="hover:bg-blue-50/30 group transition-colors border-b border-slate-50 last:border-0">
                                <td className="px-3 py-1.5 font-mono text-slate-500 text-[11px] whitespace-nowrap">{formatDate(item.date)}</td>
                                <td className="px-3 py-1.5">
                                    {(item.recipientType === 'Both' || !item.recipientType) && (
                                        <div className="flex items-center gap-2">
                                            <span className="flex items-center gap-1"><span className="text-[9px] text-slate-400 bg-slate-50 px-0.5 rounded border border-slate-100">V</span> <span className="font-medium text-slate-700 text-[12px] truncate max-w-[100px]">{getVendorName(item.vendorId)}</span></span>
                                            <span className="flex items-center gap-1"><span className="text-[9px] text-slate-400 bg-slate-50 px-0.5 rounded border border-slate-100">C</span> <span className="font-medium text-slate-700 text-[12px] truncate max-w-[100px]">{getClientName(item.clientId)}</span></span>
                                        </div>
                                    )}
                                    {item.recipientType === 'Vendor' && <span className="font-medium text-slate-700 text-[12px]">{getVendorName(item.vendorId)}</span>}
                                    {item.recipientType === 'Client' && <span className="font-medium text-slate-700 text-[12px]">{getClientName(item.clientId)}</span>}
                                </td>
                                <td className="px-3 py-1.5 text-slate-600">
                                    <span className="font-semibold text-slate-800 text-[12px]">{getSkuDetails(item.skuId).split(' - ')[0]}</span>
                                    <span className="text-[11px] text-slate-400 ml-1">{getSkuDetails(item.skuId).split(' - ')[1]}</span>
                                </td>
                                <td className="px-3 py-1.5">
                                    <span className="font-bold text-slate-800 text-[12px]">{item.qty}</span>
                                </td>
                                <td className="px-3 py-1.5">
                                    <span className="text-[10px] text-slate-400">{item.countryOfSale}</span>
                                </td>
                                <td className="px-3 py-1.5 text-right">
                                    <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => generatePDF(e, item)} className="p-1 hover:bg-green-100 rounded text-slate-400 hover:text-green-600 transition-colors" title="PDF"><Icons.File className="w-3 h-3" /></button>
                                        <button onClick={() => setModal({ open: true, type: 'ors', data: item, isEdit: true })} className="p-1 hover:bg-blue-100 rounded text-slate-400 hover:text-blue-600 transition-colors" title="Edit"><Icons.Edit className="w-3 h-3" /></button>
                                        <button onClick={() => actions.del('ors', item.id)} className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-600 transition-colors" title="Delete"><Icons.Trash className="w-3 h-3" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr><td colSpan="6" className="p-6 text-center text-slate-400 text-xs italic">No ORS records found. Click "New" to create one.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};