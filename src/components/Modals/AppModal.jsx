import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Icons } from '../ui/Icons';
import { Button } from '../ui/Button';
import { formatMoney } from '../../utils/helpers';
import { REQUIRED_DOCS, ORS_REQUIRED_DOCS, COUNTRIES } from '../../utils/constants';

export const AppModal = ({ modal, setModal, data, actions }) => {

    const { products, skus, vendors, clients, contacts, userProfiles, quotesReceived, settings, formulations = [] } = data;

    // --- SKU FILTERING (Ghost data, orphanded & duplicates) ---
    const cleanSkus = useMemo(() => {
        return skus.filter(s => {
            return products.some(p => p.id === s.productId);
        });
    }, [skus, products]);

    const unlinkedSkus = useMemo(() => {
        const base = cleanSkus.filter(s => !formulations.some(f => f.skuId === s.id) || (modal.isEdit && s.id === modal.data?.skuId));
        if (modal.isDuplicate && modal.data?.sourceProductId) {
            return base.filter(s => s.productId === modal.data.sourceProductId);
        }
        return base;
    }, [cleanSkus, formulations, modal.isEdit, modal.isDuplicate, modal.data?.skuId, modal.data?.sourceProductId]);
    const [form, setForm] = useState(modal.data || {});

    // Sync form state when modal opens
    useEffect(() => {
        if (modal.open) {
            setForm(modal.data || {});
        }
    }, [modal.open, modal.data]);

    // --- STATE FOR AUTO-FILLS (ORS & RFQ) ---
    const [derivedDetails, setDerivedDetails] = useState({
        productName: '-',
        variant: '-',
        pack: '-',
        formulationName: '-',
        packagingMaterial: []
    });

    // --- EFFECT: INITIALIZE DEFAULTS ---
    useEffect(() => {
        if (modal.open && !modal.isEdit) {
            if (modal.type === 'sku') {
                setForm(prev => ({
                    ...prev,
                    unit: prev.unit || settings?.units?.[0] || 'kg',
                    packType: prev.packType || settings?.packTypes?.[0] || 'Bag',
                    variant: prev.variant || '',
                    flavour: prev.flavour || '',
                    packSize: prev.packSize || ''
                }));
            }
            if (modal.type === 'formulation' && !modal.isDuplicate) {
                setForm(prev => ({ ...prev, ingredients: [], packaging: [] }));
            }
            if (modal.type === 'ors') {
                setForm(prev => ({
                    ...prev,
                    date: new Date().toISOString().split('T')[0],
                    currency: 'INR',
                    requiredDocs: ORS_REQUIRED_DOCS.reduce((acc, doc) => ({ ...acc, [doc]: true }), {})
                }));
            }
            // Sales Quote Defaults (multi-SKU)
            if (modal.type === 'quoteSent') {
                setForm(prev => ({
                    ...prev,
                    date: prev.date || new Date().toISOString().split('T')[0],
                    currency: prev.currency || 'INR',
                    lineItems: prev.lineItems || [{ skuId: '', moq: '', sellingPrice: '', baseCostId: '', baseCostPrice: '', status: 'Draft' }]
                }));
            }
            // RFQ Defaults
            if (modal.type === 'rfq') {
                setForm(prev => ({
                    ...prev,
                    requestType: 'Product SKU', // Default
                    currency: 'INR'
                }));
            }
        }
    }, [modal.open, modal.type, modal.isEdit, settings]);

    // --- EFFECT: AUTOMATIONS & CALCULATIONS ---

    // Default Task Context
    useEffect(() => {
        if (modal.type === 'task' && !modal.isEdit && !form.contextType) {
            setForm(f => ({ ...f, contextType: 'Internal', priority: 'Normal' }));
        }
    }, [modal.type, modal.isEdit, form.contextType]);

    // Order Calculations
    useEffect(() => {
        if (modal.type === 'order') {
            const qty = parseFloat(form.qty) || 0;
            const rate = parseFloat(form.rate) || 0;
            const taxRate = parseFloat(form.taxRate) || 0;
            const baseAmount = qty * rate;
            const taxAmount = (baseAmount * taxRate) / 100;
            const total = baseAmount + taxAmount;
            setForm(f => ({ ...f, amount: total, taxAmount: taxAmount }));
        }
    }, [form.qty, form.rate, form.taxRate, modal.type]);

    // Auto-generate SKU Code
    useEffect(() => {
        if (modal.type === 'sku' && !modal.isEdit) {
            const {
                productName = 'PROD', variant = '', packSize = '', unit = 'kg', packType = 'Bag', flavour = ''
            } = form;
            const skuCode = `${productName}-${variant}-${packSize}${unit}-${packType}-${flavour}`.toUpperCase().replace(/-+/g, '-').replace(/-$/, '');
            setForm(f => f.name === skuCode ? f : { ...f, name: skuCode });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.variant, form.packSize, form.unit, form.packType, form.flavour, modal.type, modal.isEdit, settings]);

    // Derived Calculations (Shared for ORS & RFQ when SKU is selected)
    useEffect(() => {
        if ((modal.type === 'ors' || (modal.type === 'rfq' && form.requestType === 'Product SKU')) && form.skuId) {
            const s = skus.find(x => x.id === form.skuId);
            const p = products.find(x => x.id === s?.productId);
            const f = formulations.find(x => x.skuId === s?.id);

            setDerivedDetails({
                productName: p?.name || '-',
                variant: s?.variant || '-',
                pack: s ? `${s.packSize} ${s.unit} ${s.packType}` : '-',
                formulationName: f ? `Linked (${(f.ingredients || []).length} ingredients)` : 'Not Available',
                packagingMaterial: f?.packaging || []
            });
        }
    }, [form.skuId, form.requestType, skus, products, formulations, modal.type]);

    // Filter SKUs for Vendor Orders
    const isVendorOrder = vendors.some(v => v.id === form.companyId);
    const availableSkus = useMemo(() => {
        const filtered = modal.type === 'order' && isVendorOrder
            ? cleanSkus.filter(s => quotesReceived.some(q => q.vendorId === form.companyId && q.skuId === s.id))
            : cleanSkus;
        return filtered;
    }, [cleanSkus, quotesReceived, isVendorOrder, form.companyId, modal.type]);

    // --- HANDLERS ---

    const submit = async () => {
        let map = {
            product: 'products', sku: 'skus', vendor: 'vendors', client: 'clients',
            contact: 'contacts', quoteReceived: 'quotesReceived', quoteSent: 'quotesSent',
            task: 'tasks', user: 'users', order: 'orders', formulation: 'formulations',
            ors: 'ors', rfq: 'rfqs', inventoryInward: 'inventoryInwards', inventoryOutward: 'inventoryOutwards'
        };

        // Handle unified inventory record
        if (modal.type === 'inventoryRecord') {
            map.inventoryRecord = form.movementType === 'Inward' ? 'inventoryInwards' : 'inventoryOutwards';
        }

        const col = map[modal.type];

        // Specific Validation for Vendor Input in RFQ (since it's a datalist)
        if (modal.type === 'rfq' && form.vendorNameInput) {
            const v = vendors.find(ven => ven.companyName === form.vendorNameInput);
            if (v) form.vendorId = v.id;
        }

        // Task Linking Logic
        if (col === 'tasks' && form.contextType !== 'Internal') {
            if (form.contextType === 'Client') {
                form.relatedClientId = form.relatedId;
                if (form.secondaryVendorId) form.relatedVendorId = form.secondaryVendorId;
            } else {
                form.relatedVendorId = form.relatedId;
                if (form.secondaryClientId) form.relatedClientId = form.secondaryClientId;
            }
        }

        // Order Validation
        if (col === 'orders') {
            const totalPercent = (form.paymentTerms || []).reduce((sum, t) => sum + (parseFloat(t.percent) || 0), 0);
            if (Math.abs(totalPercent - 100) > 0.1) {
                alert(`Payment milestones must sum to 100%. Current sum: ${totalPercent}%`);
                return;
            }
        }

        // Inventory Outward Validation - Prevent back-orders
        if (col === 'inventoryOutwards' && form.skuId && form.quantity) {
            const { inventoryInwards, inventoryOutwards } = data;
            const totalInward = inventoryInwards.filter(i => i.skuId === form.skuId).reduce((sum, i) => sum + (parseFloat(i.quantity) || 0), 0);
            const totalOutward = inventoryOutwards.filter(o => o.skuId === form.skuId && o.id !== modal.data?.id).reduce((sum, o) => sum + (parseFloat(o.quantity) || 0), 0);
            const currentStock = totalInward - totalOutward;
            const requestedQty = parseFloat(form.quantity) || 0;

            if (requestedQty > currentStock) {
                const sku = cleanSkus.find(s => s.id === form.skuId);
                alert(`Insufficient stock! Available: ${currentStock} ${sku?.unit || 'units'}, Requested: ${requestedQty} ${sku?.unit || 'units'}`);
                return;
            }
        }

        // Normalize inventoryRecord data before saving
        if (modal.type === 'inventoryRecord') {
            if (form.movementType === 'Inward') {
                form.sourceType = form.partyType;
                form.sourceId = form.partyId;
                form.sourceName = form.partyName;
            } else {
                form.destinationType = form.partyType;
                form.destinationId = form.partyId;
                form.destinationName = form.partyName;
            }
            // Clean up temporary form fields
            delete form.partyType;
            delete form.partyId;
            delete form.partyName;
            delete form.movementType;
        }

        // Also check stock for outward via unified record
        if (modal.type === 'inventoryRecord' && col === 'inventoryOutwards' && form.skuId && form.quantity) {
            const { inventoryInwards, inventoryOutwards } = data;
            const totalInward = inventoryInwards.filter(i => i.skuId === form.skuId).reduce((sum, i) => sum + (parseFloat(i.quantity) || 0), 0);
            const totalOutward = inventoryOutwards.filter(o => o.skuId === form.skuId && o.id !== modal.data?.id).reduce((sum, o) => sum + (parseFloat(o.quantity) || 0), 0);
            const currentStock = totalInward - totalOutward;
            const requestedQty = parseFloat(form.quantity) || 0;

            if (requestedQty > currentStock) {
                const sku = cleanSkus.find(s => s.id === form.skuId);
                alert(`Insufficient stock! Available: ${currentStock} ${sku?.unit || 'units'}, Requested: ${requestedQty} ${sku?.unit || 'units'}`);
                return;
            }
        }

        if (col) {
            // Multi-SKU Sales Quote creation
            if (modal.type === 'quoteSent' && !modal.isEdit && form.lineItems?.length) {
                const commonFields = { quoteId: form.quoteId, clientId: form.clientId, date: form.date, currency: form.currency, driveLink: form.driveLink };
                for (const line of form.lineItems) {
                    await actions.add('quotesSent', { ...commonFields, skuId: line.skuId, moq: line.moq, sellingPrice: line.sellingPrice, baseCostId: line.baseCostId || '', baseCostPrice: line.baseCostPrice || '', status: line.status || 'Draft' });
                }
            } else {
                // Specifically for users, we use email as ID for deterministic security rules
                if (col === 'users') {
                    if (modal.isEdit && modal.data.id !== form.email) {
                        // Manual delete if ID changed (to avoid the confirm prompt for internal move)
                        await actions.del('users', modal.data.id);
                    }
                    await actions.set('users', form.email, form);
                } else if (modal.isEdit) {
                    await actions.update(col, modal.data.id, form);
                } else {
                    await actions.add(col, form);
                }
            }
            setModal({ open: false, type: null, data: null, isEdit: false });
        }
    };

    // --- PDF GENERATOR (Vendor/Client) ---
    const generateCompanyPDF = () => {
        const doc = new jsPDF();
        const date = new Date();
        const dateStr = `${String(date.getDate()).padStart(2, '0')}${String(date.getMonth() + 1).padStart(2, '0')}${date.getFullYear()}`;
        const fileName = `${form.companyName || 'Company'}_${dateStr}.pdf`;

        // Header
        doc.setFontSize(18);
        doc.text(`${modal.type === 'vendor' ? 'Vendor' : 'Client'} Profile`, 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${date.toLocaleDateString()}`, 14, 28);
        doc.setTextColor(0);

        // Table Data
        const tableBody = [
            ['Company Name', form.companyName || '-'],
            ['Official Name', form.officialName || '-'],
            ['Website', form.website || '-'],
            ['Country', form.country || '-'],
            ['Billing Address', form.billingAddress || '-'],
            ['Shipping Address', form.shippingAddress || '-'],
            ['UID / Tax ID', `${form.uidType || ''} ${form.uidNumber || ''}`.trim() || '-'],
            ['Bank Details', form.bankDetails || '-']
        ];

        autoTable(doc, {
            startY: 35,
            head: [['Field', 'Details']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [51, 65, 85] }, // Slate-700
            columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' } },
            styles: { fontSize: 10, cellPadding: 3 }
        });

        doc.save(fileName);
    };

    // Helper functions for Dynamic Arrays
    const handleArrayAdd = (field, emptyObj) => setForm({ ...form, [field]: [...(form[field] || []), emptyObj] });
    const handleArrayChange = (field, idx, subField, val) => {
        const current = [...(form[field] || [])];
        current[idx][subField] = val;
        setForm({ ...form, [field]: current });
    };
    const handleArrayDel = (field, idx) => {
        const current = [...(form[field] || [])];
        current.splice(idx, 1);
        setForm({ ...form, [field]: current });
    };

    const handlePaymentTermAdd = () => setForm({ ...form, paymentTerms: [...(form.paymentTerms || []), { label: '', percent: 0, status: 'Pending' }] });
    const handlePaymentTermChange = (idx, field, value) => {
        const newTerms = [...(form.paymentTerms || [])];
        newTerms[idx][field] = value;
        setForm({ ...form, paymentTerms: newTerms });
    };
    const handlePaymentTermDelete = (idx) => {
        const newTerms = [...(form.paymentTerms || [])];
        newTerms.splice(idx, 1);
        setForm({ ...form, paymentTerms: newTerms });
    };

    const handleRequiredDocToggle = (docName) => {
        const currentDocs = form.docRequirements || {};
        if (currentDocs[docName]) {
            const newDocs = { ...currentDocs };
            delete newDocs[docName];
            setForm({ ...form, docRequirements: newDocs });
        } else {
            setForm({ ...form, docRequirements: { ...currentDocs, [docName]: { required: true, received: false, link: '' } } });
        }
    };

    const toggleOrsDoc = (doc) => {
        const current = form.requiredDocs || {};
        setForm({ ...form, requiredDocs: { ...current, [doc]: !current[doc] } });
    };

    if (!modal.open) return null;
    // --- RENDER CONTENT SWITCHER ---
    const renderContent = () => {
        switch (modal.type) {
            case 'product': return (
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h3 className="font-bold text-lg text-slate-800">{modal.isEdit ? 'Edit' : 'New'} Product</h3>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Product Name</label>
                        <input className="w-full p-2 border border-slate-300 rounded text-[13px] text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="e.g. Whey Protein" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Product Format</label>
                        <select className="w-full p-2 border border-slate-300 rounded text-[13px] bg-white focus:ring-1 focus:ring-blue-500 outline-none" value={form.format || ''} onChange={e => setForm({ ...form, format: e.target.value })}>
                            <option value="">Select Format...</option>
                            {(settings?.formats || []).map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Shared Drive Link</label>
                        <input className="w-full p-2 border border-slate-300 rounded text-[13px] text-blue-600 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="https://..." value={form.driveLink || ''} onChange={e => setForm({ ...form, driveLink: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Description <span className="text-slate-300 font-normal normal-case">(optional)</span></label>
                        <textarea rows="2" className="w-full p-2 border border-slate-300 rounded text-[13px] text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none" placeholder="Brief product description or notes..." value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
                    </div>
                </div>
            );
            case 'sku': return (
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h3 className="font-bold text-lg text-slate-800">{modal.isEdit ? 'Edit' : 'New'} SKU</h3>
                        <div className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-0.5 border border-slate-200 rounded">{form.name || 'SKU CODE'}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Variant</label>
                            <input className="w-full p-2 border border-slate-300 rounded text-[13px]" placeholder="e.g. Chocolate" value={form.variant || ''} onChange={e => setForm({ ...form, variant: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Flavour / Detail</label>
                            <input className="w-full p-2 border border-slate-300 rounded text-[13px]" placeholder="e.g. Natural" value={form.flavour || ''} onChange={e => setForm({ ...form, flavour: e.target.value })} />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Size</label>
                            <input type="number" className="w-full p-2 border border-slate-300 rounded text-[13px]" value={form.packSize || ''} onChange={e => setForm({ ...form, packSize: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Unit</label>
                            <select className="w-full p-2 border border-slate-300 rounded text-[13px] bg-white" value={form.unit || ''} onChange={e => setForm({ ...form, unit: e.target.value })}>
                                {(settings?.units || []).map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Type</label>
                            <select className="w-full p-2 border border-slate-300 rounded text-[13px] bg-white" value={form.packType || ''} onChange={e => setForm({ ...form, packType: e.target.value })}>
                                {(settings?.packTypes || []).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Standard MOQ</label>
                        <input type="number" className="w-full p-2 border border-slate-300 rounded text-[13px]" placeholder="0" value={form.standardMoq || ''} onChange={e => setForm({ ...form, standardMoq: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Description <span className="text-slate-300 font-normal normal-case">(optional)</span></label>
                        <textarea rows="2" className="w-full p-2 border border-slate-300 rounded text-[13px] text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none" placeholder="SKU-specific notes or details..." value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
                    </div>
                </div>
            );
            case 'vendor':
            case 'client': return (
                <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-2 scroller">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h3 className="font-bold text-lg text-slate-800 capitalize">{modal.isEdit ? 'Edit' : 'New'} {modal.type}</h3>
                        <div className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">Details</div>
                    </div>

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Company Name <span className="text-red-500">*</span></label>
                            <input className="w-full p-2 border border-slate-300 rounded text-[13px] text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="e.g. Acme Corp" value={form.companyName || ''} onChange={e => setForm({ ...form, companyName: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Official Legal Name</label>
                            <input className="w-full p-2 border border-slate-300 rounded text-[13px] text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="e.g. Acme Corporation Pvt Ltd" value={form.officialName || ''} onChange={e => setForm({ ...form, officialName: e.target.value })} />
                        </div>
                    </div>

                    {/* Primary Contact Selector */}
                    {modal.isEdit && (
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-2">
                                <Icons.Contact className="w-3 h-3 text-slate-400" /> Primary Contact
                            </label>
                            <select 
                                className="w-full p-2 border border-slate-300 rounded text-[13px] text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none bg-white font-semibold"
                                value={form.primaryContactId || ''}
                                onChange={e => setForm({ ...form, primaryContactId: e.target.value })}
                            >
                                <option value="">Select Primary Contact...</option>
                                {contacts.filter(c => c.companyId === form.id).map(c => (
                                    <option key={c.id} value={c.id}>{c.name} {c.role ? `(${c.role})` : ''}</option>
                                ))}
                            </select>
                            {contacts.filter(c => c.companyId === form.id).length === 0 && (
                                <p className="text-[10px] text-slate-400 italic mt-1 px-1">No contacts found. Add contacts first via the company profile view.</p>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Website</label>
                            <input className="w-full p-2 border border-slate-300 rounded text-[13px] text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="https://..." value={form.website || ''} onChange={e => setForm({ ...form, website: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Country</label>
                            <input
                                list="country-list-global"
                                placeholder="Select Country..."
                                className="w-full p-2 border border-slate-300 rounded text-[13px] text-slate-900 bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                value={form.country || ''}
                                onChange={e => setForm({ ...form, country: e.target.value })}
                            />
                            <datalist id="country-list-global">
                                {COUNTRIES.map(c => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                    </div>

                    {/* Address Section */}
                    <div className="grid grid-cols-2 gap-4 pt-1">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Billing Address</label>
                            <textarea rows="3" className="w-full p-2 border border-slate-300 rounded text-[13px] text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="Full billing address..." value={form.billingAddress || ''} onChange={e => setForm({ ...form, billingAddress: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Shipping Address</label>
                            <textarea rows="3" className="w-full p-2 border border-slate-300 rounded text-[13px] text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="Warehousing destination..." value={form.shippingAddress || ''} onChange={e => setForm({ ...form, shippingAddress: e.target.value })} />
                        </div>
                    </div>

                    {/* Financial Details */}
                    <div className="bg-slate-50/50 p-3 rounded border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Tax / Registration ID</label>
                            <div className="flex gap-2">
                                <select className="p-2 border border-slate-300 rounded text-[13px] bg-white w-24 focus:ring-1 focus:ring-blue-500 outline-none" value={form.uidType || ''} onChange={e => setForm({ ...form, uidType: e.target.value })}>
                                    <option value="">Type</option>
                                    <option value="GST">GST</option>
                                    <option value="VAT">VAT</option>
                                    <option value="EIN">EIN</option>
                                    <option value="PAN">PAN</option>
                                    <option value="Other">Other</option>
                                </select>
                                <input placeholder="ID Number" className="flex-1 p-2 border border-slate-300 rounded text-[13px] text-slate-800 bg-white focus:ring-1 focus:ring-blue-500 outline-none" value={form.uidNumber || ''} onChange={e => setForm({ ...form, uidNumber: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Bank Details</label>
                            <textarea rows="2" placeholder="Bank Name, Account No, IBAN/SWIFT..." className="w-full p-2 border border-slate-300 rounded text-[13px] text-slate-800 bg-white focus:ring-1 focus:ring-blue-500 outline-none" value={form.bankDetails || ''} onChange={e => setForm({ ...form, bankDetails: e.target.value })} />
                        </div>
                    </div>

                    {/* Client Specifics */}
                    {modal.type === 'client' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Lead Source</label>
                                <select className="w-full p-2 border border-slate-300 rounded text-[13px] text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none" value={form.leadSource || ''} onChange={e => setForm({ ...form, leadSource: e.target.value })}>
                                    <option>Select Source...</option>
                                    {(settings?.leadSources || []).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Lead Date</label>
                                <input type="date" className="w-full p-2 border border-slate-300 rounded text-[13px] text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none" value={form.leadDate || ''} onChange={e => setForm({ ...form, leadDate: e.target.value })} />
                            </div>
                        </div>
                    )}

                    <div className="pt-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Category (Product Formats)</label>
                        <div className="flex flex-wrap gap-1.5 p-2 border border-slate-300 rounded bg-white min-h-[38px]">
                            {(settings?.formats || []).map(fmt => {
                                const selected = (form.categories || []).includes(fmt);
                                return (
                                    <button
                                        key={fmt}
                                        type="button"
                                        onClick={() => {
                                            const current = form.categories || [];
                                            setForm({ ...form, categories: selected ? current.filter(c => c !== fmt) : [...current, fmt] });
                                        }}
                                        className={`text-[11px] font-semibold px-2 py-0.5 rounded border transition-colors ${selected ? 'bg-violet-100 text-violet-700 border-violet-300' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}
                                    >
                                        {fmt}
                                    </button>
                                );
                            })}
                            {(!settings?.formats || settings.formats.length === 0) && <span className="text-[11px] text-slate-300 italic">No formats configured</span>}
                        </div>
                    </div>

                    <div className="pt-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Folder Link (Google Drive / Dropbox)</label>
                        <input placeholder="https://..." className="w-full p-2 border border-slate-300 rounded text-[13px] text-blue-600 underline-offset-2 focus:ring-1 focus:ring-blue-500 outline-none transition-all" value={form.driveLink || ''} onChange={e => setForm({ ...form, driveLink: e.target.value })} />
                    </div>

                    {modal.type === 'client' && (
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Status</label>
                            <select className="w-full p-2 border border-slate-300 rounded text-[13px] font-semibold text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none" value={form.status || ''} onChange={e => setForm({ ...form, status: e.target.value })}>
                                <option>Select Status...</option>
                                {settings?.leadStatusGroups && Object.keys(settings.leadStatusGroups).length > 0 ? (
                                    ['In-progress', 'Complete'].map(group => {
                                        const groupStatuses = (settings?.leadStatuses || []).filter(s => (settings.leadStatusGroups[s] || 'In-progress') === group);
                                        return groupStatuses.length > 0 ? (
                                            <optgroup key={group} label={group}>
                                                {groupStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                                            </optgroup>
                                        ) : null;
                                    })
                                ) : (
                                    (settings?.leadStatuses || []).map(s => <option key={s} value={s}>{s}</option>)
                                )}
                            </select>
                        </div>
                    )}
                </div>
            );
            case 'task': return (
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h3 className="font-bold text-lg text-slate-800">{modal.isEdit ? 'Edit' : 'New'} Task</h3>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Task Title <span className="text-red-500">*</span></label>
                        <input className="w-full p-2 border border-slate-300 rounded text-[13px] text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="What needs to be done?" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Context</label>
                            <select className="w-full p-2 border border-slate-300 rounded text-[13px] bg-white" value={form.contextType || ''} onChange={e => { setForm({ ...form, contextType: e.target.value, relatedId: null, relatedName: null }); }}>
                                <option value="Internal">Internal</option>
                                <option value="Client">Client</option>
                                <option value="Vendor">Vendor</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Priority</label>
                            <select className="w-full p-2 border border-slate-300 rounded text-[13px] bg-white font-semibold" value={form.priority || ''} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                <option>Normal</option>
                                <option className="text-red-600 font-bold">High</option>
                            </select>
                        </div>
                    </div>
                    {form.contextType === 'Internal' && (
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Task Group</label>
                            <select className="w-full p-2 border border-slate-300 rounded text-[13px] bg-white" value={form.taskGroup || ''} onChange={e => setForm({ ...form, taskGroup: e.target.value })}>
                                <option value="">Select Group...</option>
                                {(settings?.taskGroups || []).map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                    )}
                    {form.contextType === 'Client' && (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[11px] font-bold text-blue-600 uppercase tracking-wide mb-1">Related Client</label>
                                <select className="w-full p-2 border border-blue-200 rounded text-[13px] bg-blue-50/30" value={form.relatedId || ''} onChange={e => { const c = clients.find(x => x.id === e.target.value); setForm({ ...form, relatedId: c.id, relatedName: c.companyName }); }}>
                                    <option>Select Client...</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Link Vendor (Optional)</label>
                                <select className="w-full p-2 border border-slate-200 rounded text-[13px] bg-slate-50" value={form.secondaryVendorId || ''} onChange={e => setForm({ ...form, secondaryVendorId: e.target.value })}>
                                    <option value="">No linked vendor</option>
                                    {vendors.map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}
                                </select>
                            </div>
                        </div>
                    )}
                    {form.contextType === 'Vendor' && (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[11px] font-bold text-purple-600 uppercase tracking-wide mb-1">Related Vendor</label>
                                <select className="w-full p-2 border border-purple-200 rounded text-[13px] bg-purple-50/30" value={form.relatedId || ''} onChange={e => { const v = vendors.find(x => x.id === e.target.value); setForm({ ...form, relatedId: v.id, relatedName: v.companyName }); }}>
                                    <option>Select Vendor...</option>
                                    {vendors.map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Link Client (Optional)</label>
                                <select className="w-full p-2 border border-slate-200 rounded text-[13px] bg-slate-50" value={form.secondaryClientId || ''} onChange={e => setForm({ ...form, secondaryClientId: e.target.value })}>
                                    <option value="">No linked client</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                                </select>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Assignee</label>
                            <select className="w-full p-2 border border-slate-300 rounded text-[13px] bg-white" value={form.assignee || ''} onChange={e => setForm({ ...form, assignee: e.target.value })}>
                                <option value="">Assign to...</option>
                                {userProfiles.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Due Date</label>
                            <input type="date" className="w-full p-2 border border-slate-300 rounded text-[13px]" value={form.dueDate || ''} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                        </div>
                    </div>
                </div>
            );
            case 'quoteReceived': return (
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h3 className="font-bold text-lg text-slate-800">{modal.isEdit ? 'Edit' : 'New'} Purchase Quote</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Quote ID / Ref</label>
                            <input className="w-full p-2 border border-slate-300 rounded text-[13px] font-mono" placeholder="QUO-123" value={form.quoteId || ''} onChange={e => setForm({ ...form, quoteId: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">MOQ</label>
                            <input type="number" className="w-full p-2 border border-slate-300 rounded text-[13px]" placeholder="0" value={form.moq || ''} onChange={e => setForm({ ...form, moq: e.target.value })} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Vendor / Party</label>
                            <select className="w-full p-2 border border-slate-300 rounded text-[13px] bg-white" value={form.vendorId || ''} onChange={e => setForm({ ...form, vendorId: e.target.value })}>
                                <option>Select Vendor...</option>
                                {vendors.map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">SKU</label>
                            <select className="w-full p-2 border border-slate-300 rounded text-[13px] bg-white font-semibold" value={form.skuId || ''} onChange={e => setForm({ ...form, skuId: e.target.value })}>
                                <option>Select SKU...</option>
                                {cleanSkus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Document Link</label>
                        <input className="w-full p-2 border border-slate-300 rounded text-[13px] text-blue-600" placeholder="Drive URL..." value={form.driveLink || ''} onChange={e => setForm({ ...form, driveLink: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Unit Price</label>
                            <input type="number" step="any" className="w-full p-2 border border-slate-300 rounded text-[13px] font-bold" value={form.price || ''} onChange={e => setForm({ ...form, price: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Currency</label>
                            <select className="w-full p-2 border border-slate-300 rounded text-[13px] bg-white font-bold" value={form.currency || 'INR'} onChange={e => setForm({ ...form, currency: e.target.value })}>
                                <option>INR</option>
                                <option>USD</option>
                            </select>
                        </div>
                    </div>
                </div>
            );
            case 'quoteSent': {
                // Multi-SKU line items for NEW, single-line for EDIT
                const isMultiLine = !modal.isEdit;
                const lineItems = form.lineItems || [];

                const handleLineChange = (idx, field, value) => {
                    const newLines = [...lineItems];
                    newLines[idx] = { ...newLines[idx], [field]: value };
                    // If setting baseCostId, also set baseCostPrice
                    if (field === 'baseCostId') {
                        const bq = quotesReceived.find(q => q.id === value);
                        newLines[idx].baseCostPrice = bq?.price || '';
                    }
                    setForm({ ...form, lineItems: newLines });
                };
                const addLine = () => setForm({ ...form, lineItems: [...lineItems, { skuId: '', moq: '', sellingPrice: '', baseCostId: '', baseCostPrice: '', status: 'Draft' }] });
                const removeLine = (idx) => {
                    const newLines = [...lineItems];
                    newLines.splice(idx, 1);
                    setForm({ ...form, lineItems: newLines });
                };

                return (
                    <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 scroller">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                            <h3 className="font-bold text-lg text-slate-800">{modal.isEdit ? 'Edit' : 'New'} Sales Quote</h3>
                        </div>

                        {/* Common Fields */}
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Quote ID / Ref</label>
                                <input className="w-full p-2 border border-slate-300 rounded text-[13px] font-mono" placeholder="QUO-123" value={form.quoteId || ''} onChange={e => setForm({ ...form, quoteId: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Date</label>
                                <input type="date" className="w-full p-2 border border-slate-300 rounded text-[13px]" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Client / Party</label>
                                <select className="w-full p-2 border border-slate-300 rounded text-[13px] bg-white" value={form.clientId || ''} onChange={e => setForm({ ...form, clientId: e.target.value })}>
                                    <option>Select Client...</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Document Link</label>
                                <input className="w-full p-2 border border-slate-300 rounded text-[13px] text-blue-600" placeholder="Drive URL..." value={form.driveLink || ''} onChange={e => setForm({ ...form, driveLink: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Currency</label>
                                <select className="w-full p-2 border border-slate-300 rounded text-[13px] bg-white font-bold" value={form.currency || 'INR'} onChange={e => setForm({ ...form, currency: e.target.value })}>
                                    <option>INR</option>
                                    <option>USD</option>
                                </select>
                            </div>
                        </div>

                        {/* SKU Line Items (multi for new, single for edit) */}
                        {isMultiLine ? (
                            <div className="border-t border-slate-100 pt-4">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">SKU Line Items</label>
                                    <button onClick={addLine} className="text-[11px] text-blue-600 font-bold hover:underline uppercase">+ Add SKU</button>
                                </div>
                                <div className="space-y-3">
                                    {lineItems.map((line, idx) => (
                                        <div key={idx} className="bg-slate-50/50 p-3 rounded-lg border border-slate-200 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SKU #{idx + 1}</span>
                                                {lineItems.length > 1 && (
                                                    <button onClick={() => removeLine(idx)} className="p-0.5 text-slate-300 hover:text-red-500 transition-colors"><Icons.X className="w-3.5 h-3.5" /></button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="col-span-2">
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">SKU</label>
                                                    <select className="w-full p-1.5 border border-slate-300 rounded text-[12px] bg-white font-semibold" value={line.skuId || ''} onChange={e => handleLineChange(idx, 'skuId', e.target.value)}>
                                                        <option>Select SKU...</option>
                                                        {cleanSkus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Status</label>
                                                    <select className="w-full p-1.5 border border-slate-300 rounded text-[12px] bg-white font-semibold" value={line.status || 'Draft'} onChange={e => handleLineChange(idx, 'status', e.target.value)}>
                                                        <option>Draft</option>
                                                        <option>Active</option>
                                                        <option>Closed</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">MOQ</label>
                                                    <input type="number" className="w-full p-1.5 border border-slate-300 rounded text-[12px]" placeholder="0" value={line.moq || ''} onChange={e => handleLineChange(idx, 'moq', e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Unit Price</label>
                                                    <input type="number" step="any" className="w-full p-1.5 border border-slate-300 rounded text-[12px] font-bold" value={line.sellingPrice || ''} onChange={e => handleLineChange(idx, 'sellingPrice', e.target.value)} />
                                                </div>
                                            </div>
                                            {/* Base Cost Picker per SKU */}
                                            {line.skuId && (
                                                <div className="bg-white p-2 rounded border border-slate-100 text-[10px]">
                                                    <p className="font-bold text-slate-400 uppercase mb-1.5 px-0.5">Linked Base Cost</p>
                                                    {quotesReceived.filter(q => q.skuId === line.skuId).length > 0 ? (
                                                        <div className="max-h-20 overflow-y-auto space-y-1">
                                                            {quotesReceived.filter(q => q.skuId === line.skuId).map(q => {
                                                                const v = vendors.find(x => x.id === q.vendorId);
                                                                return (
                                                                    <label key={q.id} className={`flex items-center gap-2 p-1 rounded border transition-colors cursor-pointer ${line.baseCostId === q.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-50'}`}>
                                                                        <input type="radio" className="w-2.5 h-2.5 text-blue-600" name={`baseCost-${idx}`} checked={line.baseCostId === q.id} onChange={() => handleLineChange(idx, 'baseCostId', q.id)} />
                                                                        <div className="flex-1 truncate">
                                                                            <span className="font-bold text-slate-700">{q.quoteId}</span>
                                                                            <span className="text-slate-400 mx-1">|</span>
                                                                            <span className="text-slate-500">{v?.companyName}</span>
                                                                        </div>
                                                                        <span className="font-bold text-blue-700">{formatMoney(q.price, q.currency)}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="text-[9px] text-slate-400 italic py-1 px-0.5">No purchase quotes found for this SKU</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {lineItems.length === 0 && <div className="text-[11px] text-slate-400 italic text-center py-4 bg-slate-50/30 rounded border border-dashed">No SKU lines added yet.</div>}
                                </div>
                            </div>
                        ) : (
                            /* Single-line edit mode (existing behavior) */
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">SKU</label>
                                        <select className="w-full p-2 border border-slate-300 rounded text-[13px] bg-white font-semibold" value={form.skuId || ''} onChange={e => setForm({ ...form, skuId: e.target.value })}>
                                            <option>Select SKU...</option>
                                            {cleanSkus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">MOQ</label>
                                        <input type="number" className="w-full p-2 border border-slate-300 rounded text-[13px]" placeholder="0" value={form.moq || ''} onChange={e => setForm({ ...form, moq: e.target.value })} />
                                    </div>
                                </div>
                                {form.skuId && quotesReceived.filter(q => q.skuId === form.skuId).length > 0 && (
                                    <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[11px]">
                                        <p className="font-bold text-slate-500 uppercase mb-2 px-1">Linked Base Cost</p>
                                        <div className="max-h-24 overflow-y-auto space-y-1">
                                            {quotesReceived.filter(q => q.skuId === form.skuId).map(q => {
                                                const v = vendors.find(x => x.id === q.vendorId);
                                                return (
                                                    <label key={q.id} className={`flex items-center gap-2 p-1.5 rounded border transition-colors cursor-pointer ${form.baseCostId === q.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100'}`}>
                                                        <input type="radio" className="w-3 h-3 text-blue-600" name="baseCost" checked={form.baseCostId === q.id} onChange={() => setForm({ ...form, baseCostId: q.id, baseCostPrice: q.price })} />
                                                        <div className="flex-1 truncate">
                                                            <span className="font-bold text-slate-700">{q.quoteId}</span>
                                                            <span className="text-slate-400 mx-1">|</span>
                                                            <span className="text-slate-600">{v?.companyName}</span>
                                                        </div>
                                                        <span className="font-bold text-blue-700">{formatMoney(q.price, q.currency)}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Unit Price</label>
                                        <input type="number" step="any" className="w-full p-2 border border-slate-300 rounded text-[13px] font-bold" value={form.sellingPrice || ''} onChange={e => setForm({ ...form, sellingPrice: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Quote Status</label>
                                        <select className="w-full p-2 border border-slate-300 rounded text-[13px] bg-white font-semibold" value={form.status || ''} onChange={e => setForm({ ...form, status: e.target.value })}>
                                            <option>Draft</option>
                                            <option>Active</option>
                                            <option>Closed</option>
                                        </select>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                );
            }
            case 'order': {
                const totalMilestonePercent = (form.paymentTerms || []).reduce((sum, t) => sum + (parseFloat(t.percent) || 0), 0);
                const percentError = Math.abs(totalMilestonePercent - 100) > 0.1;

                return (
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 scroller">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                            <h3 className="font-bold text-lg text-slate-800">{modal.isEdit ? 'Edit' : 'New'} Order</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Order Date</label>
                                <input type="date" className="w-full p-2 border border-slate-300 rounded text-[13px]" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Order ID / Ref</label>
                                <input placeholder="e.g. PO-123" className="w-full p-2 border border-slate-300 rounded text-[13px] font-mono" value={form.orderId || ''} onChange={e => setForm({ ...form, orderId: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">SKU</label>
                            <select className="w-full p-2 border border-slate-300 rounded text-[13px] bg-white font-semibold" value={form.skuId || ''} onChange={e => setForm({ ...form, skuId: e.target.value })}>
                                <option value="">Select SKU...</option>
                                {availableSkus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Quantity</label>
                                <input type="number" className="w-full p-2 border border-slate-300 rounded text-[13px]" value={form.qty || ''} onChange={e => setForm({ ...form, qty: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Rate</label>
                                <input type="number" className="w-full p-2 border border-slate-300 rounded text-[13px]" value={form.rate || ''} onChange={e => setForm({ ...form, rate: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Tax %</label>
                                <input type="number" className="w-full p-2 border border-slate-300 rounded text-[13px]" value={form.taxRate || ''} onChange={e => setForm({ ...form, taxRate: e.target.value })} />
                            </div>
                        </div>
                        <div className="text-right font-bold text-lg text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                            <span className="text-[10px] text-slate-400 uppercase mr-2 tracking-wider">Total Amount:</span>
                            {formatMoney(form.amount)}
                            <div className="text-[10px] text-slate-400 font-normal">Includes Tax: {formatMoney(form.taxAmount)}</div>
                        </div>

                        <div className="border-t border-slate-100 pt-4">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Payment Terms</label>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${percentError ? 'text-red-600 bg-red-50 border-red-100' : 'text-green-600 bg-green-50 border-green-100'}`}>Sum: {totalMilestonePercent}%</span>
                                    <button onClick={handlePaymentTermAdd} className="text-[11px] text-blue-600 font-bold hover:underline">+ ADD MILESTONE</button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {(form.paymentTerms || []).map((term, idx) => (
                                    <div key={idx} className="flex gap-2 items-center bg-slate-50/50 p-1.5 rounded border border-slate-100">
                                        <input placeholder="Label (e.g. Advance)" className="text-xs p-1.5 border border-slate-200 rounded flex-1 bg-white" value={term.label} onChange={e => handlePaymentTermChange(idx, 'label', e.target.value)} />
                                        <div className="relative w-16">
                                            <input type="number" className="text-xs p-1.5 border border-slate-200 rounded w-full pr-4 text-right bg-white" value={term.percent} onChange={e => handlePaymentTermChange(idx, 'percent', parseFloat(e.target.value))} />
                                            <span className="absolute right-1 top-1.5 text-[10px] text-slate-400">%</span>
                                        </div>
                                        <span className="text-[11px] font-mono font-bold text-slate-600 w-20 text-right">{formatMoney((form.amount || 0) * (term.percent / 100))}</span>
                                        <button onClick={() => handlePaymentTermDelete(idx)} className="p-1 text-slate-300 hover:text-red-500"><Icons.X className="w-3.5 h-3.5" /></button>
                                    </div>
                                ))}
                                {(form.paymentTerms?.length === 0 || !form.paymentTerms) && <div className="text-[11px] text-slate-400 italic text-center py-2 bg-slate-50/30 rounded border border-dashed">No payment milestones defined.</div>}
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-4">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 block">Required Documents</label>
                            <div className="grid grid-cols-2 gap-2">
                                {REQUIRED_DOCS.map(doc => {
                                    const isRequired = form.docRequirements?.[doc];
                                    return (
                                        <label key={doc} className={`flex items-center gap-2 text-[11px] cursor-pointer p-1.5 rounded border transition-colors ${isRequired ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold' : 'bg-white border-slate-200 text-slate-500'}`}>
                                            <input
                                                type="checkbox"
                                                checked={!!isRequired}
                                                onChange={() => handleRequiredDocToggle(doc)}
                                                className="rounded text-blue-600 focus:ring-0 w-3 h-3"
                                            />
                                            {doc}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            }
            case 'formulation': return (
                <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 scroller">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h3 className="font-bold text-lg text-slate-800">{modal.isEdit ? 'Edit' : modal.isDuplicate ? 'Duplicate' : 'New'} Formulation</h3>
                    </div>
                    <div className="space-y-3 p-3 bg-slate-50/50 rounded border border-slate-200">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Linked SKU</label>
                            <select className="w-full p-2 border border-slate-300 rounded text-[13px] bg-white font-semibold" value={form.skuId || ''} onChange={e => setForm({ ...form, skuId: e.target.value })}>
                                <option value="">Select SKU...</option>
                                {unlinkedSkus.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Serving Size</label>
                                <div className="flex gap-2">
                                    <input type="number" placeholder="30" className="flex-1 p-2 border border-slate-300 rounded text-[13px]" value={form.servingSizeValue || ''} onChange={e => setForm({ ...form, servingSizeValue: e.target.value })} />
                                    <select className="w-24 p-2 border border-slate-300 rounded text-[13px] bg-white" value={form.servingSizeUnit || ''} onChange={e => setForm({ ...form, servingSizeUnit: e.target.value })}>
                                        {(settings?.units || []).map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Servings per SKU <span className="text-[9px] font-normal lowercase">(Integer)</span></label>
                                <input type="number" placeholder="e.g. 10" className="w-full p-2 border border-slate-300 rounded text-[13px]" value={form.servingsPerSku || ''} onChange={e => setForm({ ...form, servingsPerSku: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Ingredient Dosage Unit <span className="text-[9px] font-normal lowercase">(Applies to all)</span></label>
                            <select className="w-full p-2 border border-slate-300 rounded text-[13px] bg-white font-semibold" value={form.dosageUnit || ''} onChange={e => setForm({ ...form, dosageUnit: e.target.value })}>
                                <option value="">Select Unit...</option>
                                <option value="mg">mg</option>
                                <option value="mcg">mcg</option>
                                <option value="g">g</option>
                                <option value="ml">ml</option>
                                <option value="IU">IU</option>
                            </select>
                        </div>
                    </div>
                    {/* Ingredients Section */}
                    <div>
                        <div className="flex justify-between items-center mb-2 border-b border-slate-100 pb-1">
                            <h4 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Ingredients</h4>
                            <button onClick={() => handleArrayAdd('ingredients', { name: '', type: 'Active', per100g: '', perServing: '', perSku: '' })} className="text-[11px] text-blue-600 font-bold hover:underline">+ ADD INGREDIENT</button>
                        </div>
                        <div className="space-y-1.5">
                            <div className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr_24px] gap-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">
                                <div>Name</div>
                                <div>Type</div>
                                <div className="text-right pr-1.5">Qty %</div>
                                <div className="text-right pr-1.5">/Serv ({form.dosageUnit || ''})</div>
                                <div className="text-right pr-1.5">/SKU</div>
                                <div></div>
                            </div>
                            {(form.ingredients || []).map((ing, i) => (
                                <div key={i} className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr_24px] gap-3 items-center">
                                    <input placeholder="Name" className="text-[12px] p-1.5 border border-slate-200 rounded bg-white w-full min-w-0" value={ing.name} onChange={e => handleArrayChange('ingredients', i, 'name', e.target.value)} />
                                    <select className="text-[12px] p-1.5 border border-slate-200 rounded bg-slate-50 w-full min-w-0" value={ing.type || 'Active'} onChange={e => handleArrayChange('ingredients', i, 'type', e.target.value)}>
                                        <option value="Active">Active</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    <input placeholder="0" type="number" step="any" className="text-[12px] p-1.5 border border-slate-200 rounded text-right w-full min-w-0" value={ing.per100g} onChange={e => handleArrayChange('ingredients', i, 'per100g', e.target.value)} />
                                    <input placeholder="0" type="number" step="any" className="text-[12px] p-1.5 border border-slate-200 rounded text-right w-full min-w-0" value={ing.perServing} onChange={e => {
                                        const val = e.target.value;
                                        const servings = parseFloat(form.servingsPerSku) || 0;
                                        const perSku = servings > 0 ? (parseFloat(val) || 0) * servings : (ing.perSku || '');
                                        const updated = [...(form.ingredients || [])];
                                        updated[i] = { ...updated[i], perServing: val, perSku: perSku };
                                        setForm({ ...form, ingredients: updated });
                                    }} />
                                    <input placeholder="0" type="number" step="any" className="text-[12px] p-1.5 border border-slate-200 rounded text-right bg-slate-50 font-bold w-full min-w-0" value={ing.perSku} readOnly />
                                    <button onClick={() => handleArrayDel('ingredients', i)} className="text-slate-300 hover:text-red-500 flex items-center justify-center"><Icons.X className="w-3.5 h-3.5" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Packaging Section */}
                    <div>
                        <div className="flex justify-between items-center mb-2 border-b border-slate-100 pb-1">
                            <h4 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Packaging Materials</h4>
                            <button onClick={() => handleArrayAdd('packaging', { item: '', qty: '' })} className="text-[11px] text-blue-600 font-bold hover:underline">+ ADD MATERIAL</button>
                        </div>
                        <div className="space-y-1.5">
                            {(form.packaging || []).map((pack, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <input placeholder="Item Name (e.g. Jar, Scoop)" className="text-[12px] p-1.5 border border-slate-200 rounded flex-[3]" value={pack.item} onChange={e => handleArrayChange('packaging', i, 'item', e.target.value)} />
                                    <input placeholder="Qty" className="text-[12px] p-1.5 border border-slate-200 rounded flex-1" value={pack.qty} onChange={e => handleArrayChange('packaging', i, 'qty', e.target.value)} />
                                    <button onClick={() => handleArrayDel('packaging', i)} className="text-slate-300 hover:text-red-500"><Icons.X className="w-3.5 h-3.5" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Health Benefits Section */}
                    <div>
                        <div className="flex justify-between items-center mb-2 border-b border-slate-100 pb-1">
                            <h4 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Health Benefits</h4>
                            <button onClick={() => handleArrayAdd('healthBenefits', { benefit: '' })} className="text-[11px] text-blue-600 font-bold hover:underline">+ ADD BENEFIT</button>
                        </div>
                        <div className="space-y-1.5">
                            {(form.healthBenefits || []).map((hb, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <input placeholder="e.g. Supports joint health, Boosts immunity" className="text-[12px] p-1.5 border border-slate-200 rounded flex-1" value={hb.benefit} onChange={e => handleArrayChange('healthBenefits', i, 'benefit', e.target.value)} />
                                    <button onClick={() => handleArrayDel('healthBenefits', i)} className="text-slate-300 hover:text-red-500"><Icons.X className="w-3.5 h-3.5" /></button>
                                </div>
                            ))}
                            {(form.healthBenefits?.length === 0 || !form.healthBenefits) && <div className="text-[11px] text-slate-400 italic text-center py-2 bg-slate-50/30 rounded border border-dashed">No health benefits added.</div>}
                        </div>
                    </div>
                </div>
            );
            case 'ors': return (
                <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2 scroller">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h3 className="font-bold text-lg text-slate-800">{modal.isEdit ? 'Edit' : 'New'} ORS</h3>
                    </div>

                    {/* Recipient Selection */}
                    <div className="bg-slate-50 p-2 rounded border border-slate-200 flex gap-4 items-center">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Recipient:</span>
                        {['Vendor', 'Client', 'Both'].map(type => (
                            <label key={type} className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-600 cursor-pointer">
                                <input
                                    type="radio"
                                    name="recipientType"
                                    value={type}
                                    checked={(form.recipientType || 'Vendor') === type}
                                    onChange={e => setForm({ ...form, recipientType: e.target.value })}
                                    className="text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                />
                                {type === 'Vendor' ? 'Vendor Only' : type === 'Client' ? 'Client Only' : 'Both'}
                            </label>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">ORS Date</label>
                            <input type="date" className="w-full p-2 border border-slate-300 rounded text-[13px]" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} />
                        </div>
                    </div>

                    {/* Row 2: Parties */}
                    <div className="grid grid-cols-2 gap-4">
                        {((form.recipientType || 'Vendor') === 'Vendor' || form.recipientType === 'Both') && (
                            <div>
                                <label className="block text-[11px] font-bold text-purple-600 uppercase tracking-wide mb-1">Vendor</label>
                                <select className="w-full p-2 border border-purple-200 bg-purple-50/10 rounded text-[13px] font-semibold" value={form.vendorId || ''} onChange={e => setForm({ ...form, vendorId: e.target.value })}>
                                    <option value="">Select Vendor...</option>
                                    {vendors.map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}
                                </select>
                            </div>
                        )}

                        {((form.recipientType || 'Vendor') === 'Client' || form.recipientType === 'Both') && (
                            <div>
                                <label className="block text-[11px] font-bold text-blue-600 uppercase tracking-wide mb-1">Client</label>
                                <select className="w-full p-2 border border-blue-200 bg-blue-50/10 rounded text-[13px] font-semibold" value={form.clientId || ''} onChange={e => setForm({ ...form, clientId: e.target.value })}>
                                    <option value="">Select Client...</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">SKU Selection</label>
                        <select className="w-full p-2 border border-slate-300 rounded text-[13px] bg-white font-bold" value={form.skuId || ''} onChange={e => setForm({ ...form, skuId: e.target.value })}>
                            <option value="">Select SKU...</option>
                            {cleanSkus.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Auto-Derived Details Block */}
                    <div className="bg-slate-50 p-3 rounded border border-slate-200 text-[12px] space-y-2">
                        <div className="grid grid-cols-2 gap-y-2">
                            <div><span className="text-slate-400 font-bold uppercase text-[9px] block">Product</span> <span className="font-bold text-slate-700">{derivedDetails.productName}</span></div>
                            <div><span className="text-slate-400 font-bold uppercase text-[9px] block">Variant</span> <span className="font-bold text-slate-700">{derivedDetails.variant}</span></div>
                            <div><span className="text-slate-400 font-bold uppercase text-[9px] block">Packing</span> <span className="font-bold text-slate-700">{derivedDetails.pack}</span></div>
                            <div><span className="text-slate-400 font-bold uppercase text-[9px] block">Formulation</span> <span className="font-bold text-blue-600">{derivedDetails.formulationName}</span></div>
                        </div>
                        {derivedDetails.packagingMaterial.length > 0 && (
                            <div className="pt-2 border-t border-slate-200">
                                <span className="text-slate-400 font-bold uppercase text-[9px] block mb-1">Packing Material (Specs):</span>
                                <div className="flex flex-wrap gap-1">
                                    {derivedDetails.packagingMaterial.map((pm, i) => (
                                        <span key={i} className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-medium">{pm.item} ({pm.qty})</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Quantity</label>
                            <input type="number" className="w-full p-2 border border-slate-300 rounded text-[13px]" placeholder="0" value={form.qty || ''} onChange={e => setForm({ ...form, qty: e.target.value })} />
                        </div>
                    </div>


                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Lead Time (Wks)</label>
                            <input type="number" className="w-full p-2 border border-slate-300 rounded text-[13px]" placeholder="0" value={form.leadTime || ''} onChange={e => setForm({ ...form, leadTime: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Shelf Life (Mos)</label>
                            <input type="number" className="w-full p-2 border border-slate-300 rounded text-[13px]" placeholder="0" value={form.shelfLife || ''} onChange={e => setForm({ ...form, shelfLife: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Country of Sale</label>
                            <input
                                list="countries-ors"
                                className="w-full p-2 border border-slate-300 rounded text-[13px]"
                                value={form.countryOfSale || ''}
                                onChange={e => setForm({ ...form, countryOfSale: e.target.value })}
                                placeholder="Type..."
                            />
                            <datalist id="countries-ors">
                                {COUNTRIES.map(c => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Required Documents Checklist</label>
                        <div className="grid grid-cols-2 gap-2">
                            {ORS_REQUIRED_DOCS.map(doc => (
                                <label key={doc} className={`flex items-center gap-2 text-[11px] cursor-pointer p-1.5 rounded border transition-colors ${(form.requiredDocs || {})[doc] ? 'bg-blue-50 border-blue-100 text-blue-700 font-bold' : 'bg-white border-slate-100 text-slate-400'}`}>
                                    <input
                                        type="checkbox"
                                        checked={!!(form.requiredDocs || {})[doc]}
                                        onChange={() => toggleOrsDoc(doc)}
                                        className="rounded text-blue-600 focus:ring-0 w-3 h-3"
                                    />
                                    {doc}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            );
            case 'rfq': return (
                <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2 scroller">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h3 className="font-bold text-lg text-slate-800">{modal.isEdit ? 'Edit' : 'New'} RFQ</h3>
                    </div>

                    {/* Request Type Switch */}
                    <div className="flex gap-2 p-1 bg-slate-100 rounded border border-slate-200">
                        <button
                            className={`flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded transition-all ${form.requestType === 'Product SKU' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                            onClick={() => setForm({ ...form, requestType: 'Product SKU', customProductName: '', customDescription: '' })}
                        >
                            Standard SKU
                        </button>
                        <button
                            className={`flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded transition-all ${form.requestType === 'Custom' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                            onClick={() => setForm({ ...form, requestType: 'Custom', skuId: '' })}
                        >
                            Custom Req
                        </button>
                    </div>

                    {/* Conditional Fields */}
                    {form.requestType === 'Product SKU' ? (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Select Marketplace SKU</label>
                                <select className="w-full p-2 border border-slate-300 rounded text-[13px] bg-white font-bold" value={form.skuId || ''} onChange={e => setForm({ ...form, skuId: e.target.value })}>
                                    <option value="">Select SKU...</option>
                                    {cleanSkus.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            {form.skuId && (
                                <div className="bg-blue-50/50 p-3 rounded border border-blue-100 text-[12px] space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><span className="text-blue-400 font-bold uppercase text-[9px] block">Product</span> <span className="font-bold text-blue-900">{derivedDetails.productName}</span></div>
                                        <div><span className="text-blue-400 font-bold uppercase text-[9px] block">Variant</span> <span className="font-bold text-blue-900">{derivedDetails.variant}</span></div>
                                        <div><span className="text-blue-400 font-bold uppercase text-[9px] block">Packing</span> <span className="font-bold text-blue-900">{derivedDetails.pack}</span></div>
                                        <div><span className="text-blue-400 font-bold uppercase text-[9px] block">Formulation</span> <span className="font-bold text-blue-700">{derivedDetails.formulationName}</span></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Product Name</label>
                                <input className="w-full p-2 border border-slate-300 rounded text-[13px]" placeholder="e.g. Optimized Muscle Recovery Blend" value={form.customProductName || ''} onChange={e => setForm({ ...form, customProductName: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Description / Key Requirements</label>
                                <textarea rows="3" className="w-full p-2 border border-slate-300 rounded text-[13px]" placeholder="Specific ingredients, certifications, or packaging needs..." value={form.customDescription || ''} onChange={e => setForm({ ...form, customDescription: e.target.value })} />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Target Quantity</label>
                            <input type="number" className="w-full p-2 border border-slate-300 rounded text-[13px] font-bold" placeholder="0" value={form.qty || ''} onChange={e => setForm({ ...form, qty: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Target Price</label>
                            <div className="flex">
                                <select className="p-2 border border-slate-300 border-r-0 rounded-l text-[13px] bg-slate-50 font-bold" value={form.currency || 'INR'} onChange={e => setForm({ ...form, currency: e.target.value })}>
                                    <option>INR</option><option>USD</option>
                                </select>
                                <input type="number" className="w-full p-2 border border-slate-300 rounded-r text-[13px] font-bold" placeholder="0.00" value={form.targetPrice || ''} onChange={e => setForm({ ...form, targetPrice: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Market (Country of Sale)</label>
                            <input
                                list="countries-rfq"
                                className="w-full p-2 border border-slate-300 rounded text-[13px]"
                                value={form.countryOfSale || ''}
                                onChange={e => setForm({ ...form, countryOfSale: e.target.value })}
                                placeholder="Select Country..."
                            />
                            <datalist id="countries-rfq">
                                {COUNTRIES.map(c => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-purple-600 uppercase tracking-wide mb-1">Preferred Vendor</label>
                            <input
                                list="vendor-list-rfq"
                                className="w-full p-2 border border-purple-200 bg-purple-50/5 rounded text-[13px] font-semibold"
                                value={form.vendorNameInput || (vendors.find(v => v.id === form.vendorId)?.companyName || '')}
                                onChange={e => {
                                    const val = e.target.value;
                                    setForm({ ...form, vendorNameInput: val });
                                    const match = vendors.find(v => v.companyName === val);
                                    if (match) setForm(prev => ({ ...prev, vendorId: match.id, vendorNameInput: val }));
                                }}
                                placeholder="Search vendors..."
                            />
                            <datalist id="vendor-list-rfq">
                                {vendors.map(v => <option key={v.id} value={v.companyName} />)}
                            </datalist>
                        </div>
                    </div>
                </div>
            );
            case 'user': return (
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h3 className="font-bold text-lg text-slate-800">{modal.isEdit ? 'Edit' : 'Add'} User</h3>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Full Name</label>
                        <input placeholder="e.g. John Doe" className="w-full p-2 border border-slate-300 rounded text-[13px]" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Authorized Email</label>
                        <input placeholder="name@company.com" className="w-full p-2 border border-slate-300 rounded text-[13px]" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Access Level / Role</label>
                        <select className="w-full p-2 border border-slate-300 rounded text-[13px] bg-white font-semibold" value={form.role || 'Staff'} onChange={e => setForm({ ...form, role: e.target.value })}>
                            <option value="Staff">Staff</option>
                            <option value="Admin">System Admin</option>
                        </select>
                    </div>
                </div>
            );
            case 'contact': return (
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h3 className="font-bold text-lg text-slate-800">{modal.isEdit ? 'Edit' : 'New'} Contact</h3>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Full Name</label>
                        <input
                            placeholder="e.g. Jane Smith"
                            className="w-full p-2 border border-slate-300 rounded text-[13px]"
                            value={form.name || ''}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Designation / Role</label>
                        <input
                            placeholder="e.g. Procurement Head"
                            className="w-full p-2 border border-slate-300 rounded text-[13px]"
                            value={form.role || ''}
                            onChange={e => setForm({ ...form, role: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Email Address</label>
                            <input
                                placeholder="jane@example.com"
                                className="w-full p-2 border border-slate-300 rounded text-[13px]"
                                value={form.email || ''}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Phone Number</label>
                            <input
                                placeholder="+1 234 567 890"
                                className="w-full p-2 border border-slate-300 rounded text-[13px]"
                                value={form.phone || ''}
                                onChange={e => setForm({ ...form, phone: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">LinkedIn Profile</label>
                        <input
                            placeholder="https://linkedin.com/in/..."
                            className="w-full p-2 border border-slate-300 rounded text-[13px] text-blue-600"
                            value={form.linkedin || ''}
                            onChange={e => setForm({ ...form, linkedin: e.target.value })}
                        />
                    </div>
                </div>
            );
            case 'inventoryInward': return (
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h3 className="font-bold text-lg text-slate-800">{modal.isEdit ? 'Edit' : 'New'} Inventory Inward</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Date <span className="text-red-500">*</span></label>
                            <input
                                type="date"
                                className="w-full p-2 border border-slate-300 rounded text-[13px]"
                                max={new Date().toISOString().split('T')[0]}
                                value={form.date || new Date().toISOString().split('T')[0]}
                                onChange={e => setForm({ ...form, date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Source Type <span className="text-red-500">*</span></label>
                            <select
                                className="w-full p-2 border border-slate-300 rounded text-[13px] bg-white font-semibold"
                                value={form.sourceType || ''}
                                onChange={e => setForm({ ...form, sourceType: e.target.value, sourceId: null, sourceName: '' })}
                            >
                                <option value="">Select Source Type...</option>
                                <option value="Vendor">Vendor</option>
                                <option value="Client">Client</option>
                                <option value="ThirdParty">Third Party</option>
                            </select>
                        </div>
                    </div>

                    {/* Dynamic Source Selection */}
                    {form.sourceType === 'Vendor' && (
                        <div>
                            <label className="block text-[11px] font-bold text-purple-600 uppercase tracking-wide mb-1">Select Vendor <span className="text-red-500">*</span></label>
                            <select
                                className="w-full p-2 border border-purple-200 rounded text-[13px] bg-purple-50/30 font-semibold"
                                value={form.sourceId || ''}
                                onChange={e => {
                                    const v = vendors.find(x => x.id === e.target.value);
                                    setForm({ ...form, sourceId: v?.id, sourceName: v?.companyName || '' });
                                }}
                            >
                                <option value="">Select Vendor...</option>
                                {vendors.map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}
                            </select>
                        </div>
                    )}
                    {form.sourceType === 'Client' && (
                        <div>
                            <label className="block text-[11px] font-bold text-emerald-600 uppercase tracking-wide mb-1">Select Client <span className="text-red-500">*</span></label>
                            <select
                                className="w-full p-2 border border-emerald-200 rounded text-[13px] bg-emerald-50/30 font-semibold"
                                value={form.sourceId || ''}
                                onChange={e => {
                                    const c = clients.find(x => x.id === e.target.value);
                                    setForm({ ...form, sourceId: c?.id, sourceName: c?.companyName || '' });
                                }}
                            >
                                <option value="">Select Client...</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                            </select>
                        </div>
                    )}
                    {form.sourceType === 'ThirdParty' && (
                        <div>
                            <label className="block text-[11px] font-bold text-amber-600 uppercase tracking-wide mb-1">Third Party Name <span className="text-red-500">*</span></label>
                            <input
                                placeholder="Enter supplier/party name..."
                                className="w-full p-2 border border-amber-200 rounded text-[13px] bg-amber-50/30 font-semibold"
                                value={form.sourceName || ''}
                                onChange={e => setForm({ ...form, sourceName: e.target.value, sourceId: null })}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">SKU <span className="text-red-500">*</span></label>
                        <select
                            className="w-full p-2 border border-slate-300 rounded text-[13px] bg-white font-semibold"
                            value={form.skuId || ''}
                            onChange={e => {
                                const s = cleanSkus.find(x => x.id === e.target.value);
                                setForm({ ...form, skuId: e.target.value, unit: s?.unit || 'units' });
                            }}
                        >
                            <option value="">Select SKU...</option>
                            {cleanSkus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Quantity <span className="text-red-500">*</span></label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="flex-1 p-2 border border-slate-300 rounded text-[13px] font-bold"
                                    value={form.quantity || ''}
                                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                                />
                                <span className="flex items-center px-3 bg-slate-50 border border-slate-200 rounded text-[11px] font-bold text-slate-500 uppercase">
                                    {form.unit || 'units'}
                                </span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Reference / Invoice No</label>
                            <input
                                placeholder="INV-001"
                                className="w-full p-2 border border-slate-300 rounded text-[13px] font-mono"
                                value={form.reference || ''}
                                onChange={e => setForm({ ...form, reference: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Notes</label>
                        <textarea
                            rows="2"
                            placeholder="Additional details about this inward..."
                            className="w-full p-2 border border-slate-300 rounded text-[13px]"
                            value={form.notes || ''}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Document Link</label>
                        <input
                            placeholder="https://drive.google.com/..."
                            className="w-full p-2 border border-slate-300 rounded text-[13px] text-blue-600"
                            value={form.driveLink || ''}
                            onChange={e => setForm({ ...form, driveLink: e.target.value })}
                        />
                    </div>
                </div>
            );
            case 'inventoryOutward': return (
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h3 className="font-bold text-lg text-slate-800">{modal.isEdit ? 'Edit' : 'New'} Inventory Outward</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Date <span className="text-red-500">*</span></label>
                            <input
                                type="date"
                                className="w-full p-2 border border-slate-300 rounded text-[13px]"
                                max={new Date().toISOString().split('T')[0]}
                                value={form.date || new Date().toISOString().split('T')[0]}
                                onChange={e => setForm({ ...form, date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Destination Type <span className="text-red-500">*</span></label>
                            <select
                                className="w-full p-2 border border-slate-300 rounded text-[13px] bg-white font-semibold"
                                value={form.destinationType || ''}
                                onChange={e => setForm({ ...form, destinationType: e.target.value, destinationId: null, destinationName: '' })}
                            >
                                <option value="">Select Destination Type...</option>
                                <option value="Vendor">Vendor</option>
                                <option value="Client">Client</option>
                                <option value="ThirdParty">Third Party</option>
                                <option value="Internal">Internal Use</option>
                            </select>
                        </div>
                    </div>

                    {/* Dynamic Destination Selection */}
                    {form.destinationType === 'Vendor' && (
                        <div>
                            <label className="block text-[11px] font-bold text-purple-600 uppercase tracking-wide mb-1">Select Vendor <span className="text-red-500">*</span></label>
                            <select
                                className="w-full p-2 border border-purple-200 rounded text-[13px] bg-purple-50/30 font-semibold"
                                value={form.destinationId || ''}
                                onChange={e => {
                                    const v = vendors.find(x => x.id === e.target.value);
                                    setForm({ ...form, destinationId: v?.id, destinationName: v?.companyName || '' });
                                }}
                            >
                                <option value="">Select Vendor...</option>
                                {vendors.map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}
                            </select>
                        </div>
                    )}
                    {form.destinationType === 'Client' && (
                        <div>
                            <label className="block text-[11px] font-bold text-emerald-600 uppercase tracking-wide mb-1">Select Client <span className="text-red-500">*</span></label>
                            <select
                                className="w-full p-2 border border-emerald-200 rounded text-[13px] bg-emerald-50/30 font-semibold"
                                value={form.destinationId || ''}
                                onChange={e => {
                                    const c = clients.find(x => x.id === e.target.value);
                                    setForm({ ...form, destinationId: c?.id, destinationName: c?.companyName || '' });
                                }}
                            >
                                <option value="">Select Client...</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                            </select>
                        </div>
                    )}
                    {form.destinationType === 'ThirdParty' && (
                        <div>
                            <label className="block text-[11px] font-bold text-amber-600 uppercase tracking-wide mb-1">Third Party Name <span className="text-red-500">*</span></label>
                            <input
                                placeholder="Enter recipient name..."
                                className="w-full p-2 border border-amber-200 rounded text-[13px] bg-amber-50/30 font-semibold"
                                value={form.destinationName || ''}
                                onChange={e => setForm({ ...form, destinationName: e.target.value, destinationId: null })}
                            />
                        </div>
                    )}
                    {form.destinationType === 'Internal' && (
                        <div>
                            <label className="block text-[11px] font-bold text-blue-600 uppercase tracking-wide mb-1">Internal Purpose</label>
                            <input
                                placeholder="e.g., Production, Testing, Sampling..."
                                className="w-full p-2 border border-blue-200 rounded text-[13px] bg-blue-50/30 font-semibold"
                                value={form.destinationName || ''}
                                onChange={e => setForm({ ...form, destinationName: e.target.value, destinationId: null })}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">SKU <span className="text-red-500">*</span></label>
                        <select
                            className="w-full p-2 border border-slate-300 rounded text-[13px] bg-white font-semibold"
                            value={form.skuId || ''}
                            onChange={e => {
                                const s = cleanSkus.find(x => x.id === e.target.value);
                                setForm({ ...form, skuId: e.target.value, unit: s?.unit || 'units' });
                            }}
                        >
                            <option value="">Select SKU...</option>
                            {cleanSkus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Quantity <span className="text-red-500">*</span></label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="flex-1 p-2 border border-slate-300 rounded text-[13px] font-bold"
                                    value={form.quantity || ''}
                                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                                />
                                <span className="flex items-center px-3 bg-slate-50 border border-slate-200 rounded text-[11px] font-bold text-slate-500 uppercase">
                                    {form.unit || 'units'}
                                </span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Reference / Dispatch No</label>
                            <input
                                placeholder="DISP-001"
                                className="w-full p-2 border border-slate-300 rounded text-[13px] font-mono"
                                value={form.reference || ''}
                                onChange={e => setForm({ ...form, reference: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Notes</label>
                        <textarea
                            rows="2"
                            placeholder="Additional details about this dispatch..."
                            className="w-full p-2 border border-slate-300 rounded text-[13px]"
                            value={form.notes || ''}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Document Link</label>
                        <input
                            placeholder="https://drive.google.com/..."
                            className="w-full p-2 border border-slate-300 rounded text-[13px] text-blue-600"
                            value={form.driveLink || ''}
                            onChange={e => setForm({ ...form, driveLink: e.target.value })}
                        />
                    </div>
                </div>
            );
            case 'inventoryRecord': return (
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h3 className="font-bold text-lg text-slate-800">{modal.isEdit ? 'Edit' : 'New'} Inventory Record</h3>
                    </div>

                    {/* Inward/Outward Toggle */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Movement Type <span className="text-red-500">*</span></label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                className={`flex-1 py-2.5 rounded border-2 font-bold text-[12px] uppercase tracking-wide transition-all ${form.movementType === 'Inward'
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                                    : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                    }`}
                                onClick={() => setForm({ ...form, movementType: 'Inward', partyType: '', partyId: null, partyName: '' })}
                            >
                                ↓ Inward
                            </button>
                            <button
                                type="button"
                                className={`flex-1 py-2.5 rounded border-2 font-bold text-[12px] uppercase tracking-wide transition-all ${form.movementType === 'Outward'
                                    ? 'bg-red-50 border-red-500 text-red-700'
                                    : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                    }`}
                                onClick={() => setForm({ ...form, movementType: 'Outward', partyType: '', partyId: null, partyName: '' })}
                            >
                                ↑ Outward
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Date <span className="text-red-500">*</span></label>
                            <input
                                type="date"
                                className="w-full p-2 border border-slate-300 rounded text-[13px]"
                                max={new Date().toISOString().split('T')[0]}
                                value={form.date || new Date().toISOString().split('T')[0]}
                                onChange={e => setForm({ ...form, date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                                {form.movementType === 'Inward' ? 'Source' : 'Destination'} Type <span className="text-red-500">*</span>
                            </label>
                            <select
                                className="w-full p-2 border border-slate-300 rounded text-[13px] bg-white font-semibold"
                                value={form.partyType || ''}
                                onChange={e => setForm({ ...form, partyType: e.target.value, partyId: null, partyName: '' })}
                            >
                                <option value="">Select Type...</option>
                                <option value="Vendor">Vendor</option>
                                <option value="Client">Client</option>
                                <option value="ThirdParty">Third Party</option>
                                {form.movementType === 'Outward' && <option value="Internal">Internal Use</option>}
                            </select>
                        </div>
                    </div>

                    {/* Dynamic Party Selection */}
                    {form.partyType === 'Vendor' && (
                        <div>
                            <label className="block text-[11px] font-bold text-purple-600 uppercase tracking-wide mb-1">Select Vendor <span className="text-red-500">*</span></label>
                            <select
                                className="w-full p-2 border border-purple-200 rounded text-[13px] bg-purple-50/30 font-semibold"
                                value={form.partyId || ''}
                                onChange={e => {
                                    const v = vendors.find(x => x.id === e.target.value);
                                    setForm({ ...form, partyId: v?.id, partyName: v?.companyName || '' });
                                }}
                            >
                                <option value="">Select Vendor...</option>
                                {vendors.map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}
                            </select>
                        </div>
                    )}
                    {form.partyType === 'Client' && (
                        <div>
                            <label className="block text-[11px] font-bold text-emerald-600 uppercase tracking-wide mb-1">Select Client <span className="text-red-500">*</span></label>
                            <select
                                className="w-full p-2 border border-emerald-200 rounded text-[13px] bg-emerald-50/30 font-semibold"
                                value={form.partyId || ''}
                                onChange={e => {
                                    const c = clients.find(x => x.id === e.target.value);
                                    setForm({ ...form, partyId: c?.id, partyName: c?.companyName || '' });
                                }}
                            >
                                <option value="">Select Client...</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                            </select>
                        </div>
                    )}
                    {form.partyType === 'ThirdParty' && (
                        <div>
                            <label className="block text-[11px] font-bold text-amber-600 uppercase tracking-wide mb-1">
                                {form.movementType === 'Inward' ? 'Source' : 'Recipient'} Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                placeholder="Enter name..."
                                className="w-full p-2 border border-amber-200 rounded text-[13px] bg-amber-50/30 font-semibold"
                                value={form.partyName || ''}
                                onChange={e => setForm({ ...form, partyName: e.target.value, partyId: null })}
                            />
                        </div>
                    )}
                    {form.partyType === 'Internal' && (
                        <div>
                            <label className="block text-[11px] font-bold text-blue-600 uppercase tracking-wide mb-1">Purpose</label>
                            <input
                                placeholder="e.g., Production, Testing, Sampling..."
                                className="w-full p-2 border border-blue-200 rounded text-[13px] bg-blue-50/30 font-semibold"
                                value={form.partyName || ''}
                                onChange={e => setForm({ ...form, partyName: e.target.value, partyId: null })}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">SKU <span className="text-red-500">*</span></label>
                        <select
                            className="w-full p-2 border border-slate-300 rounded text-[13px] bg-white font-semibold"
                            value={form.skuId || ''}
                            onChange={e => {
                                const s = cleanSkus.find(x => x.id === e.target.value);
                                setForm({ ...form, skuId: e.target.value, unit: s?.unit || 'units' });
                            }}
                        >
                            <option value="">Select SKU...</option>
                            {cleanSkus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Quantity <span className="text-red-500">*</span></label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="flex-1 p-2 border border-slate-300 rounded text-[13px] font-bold"
                                    value={form.quantity || ''}
                                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                                />
                                <span className="flex items-center px-3 bg-slate-50 border border-slate-200 rounded text-[11px] font-bold text-slate-500 uppercase">
                                    {form.unit || 'units'}
                                </span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Reference No</label>
                            <input
                                placeholder="INV-001 / DISP-001"
                                className="w-full p-2 border border-slate-300 rounded text-[13px] font-mono"
                                value={form.reference || ''}
                                onChange={e => setForm({ ...form, reference: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Notes</label>
                        <textarea
                            rows="2"
                            placeholder="Additional details..."
                            className="w-full p-2 border border-slate-300 rounded text-[13px]"
                            value={form.notes || ''}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Document Link</label>
                        <input
                            placeholder="https://drive.google.com/..."
                            className="w-full p-2 border border-slate-300 rounded text-[13px] text-blue-600"
                            value={form.driveLink || ''}
                            onChange={e => setForm({ ...form, driveLink: e.target.value })}
                        />
                    </div>
                </div>
            );
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded border border-slate-200 shadow-2xl w-full max-w-lg flex flex-col max-h-[95vh] animate-in fade-in zoom-in duration-200">
                <div className="flex-1 overflow-auto p-6 scroller">
                    {renderContent()}
                </div>
                <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                    <div>
                        {modal.isEdit && modal.type === 'task' && (
                            <Button variant="secondary" className="px-4 text-red-600 hover:bg-red-50 hover:border-red-200" onClick={() => { if (confirm('Delete this task?')) { actions.del('tasks', modal.data.id); setModal({ open: false, type: null, data: null, isEdit: false }); } }}>
                                <Icons.Trash className="w-3.5 h-3.5 mr-1" /> Delete
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" className="px-5" onClick={() => setModal({ open: false, type: null, data: null, isEdit: false })}>Cancel</Button>
                        <Button className="px-8 shadow-sm" onClick={submit}>
                            {modal.isEdit ? 'Update Record' : 'Create Record'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};