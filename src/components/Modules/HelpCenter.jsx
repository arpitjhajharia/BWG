import React, { useState, useRef } from 'react';
import { Icons } from '../ui/Icons';

// ─── Guide Data ─────────────────────────────────────────────────────────
const guides = {
    dashboard: {
        title: 'Dashboard',
        subtitle: 'Get a bird\'s-eye view of your business metrics.',
        icon: '📊',
        sections: [
            {
                icon: '📈',
                heading: 'Overview Cards',
                items: [
                    'The top row shows key KPIs: Total Products, Active Vendors, Active Clients, and pending Tasks.',
                    'Each card is clickable — it navigates to the corresponding module.',
                ],
            },
            {
                icon: '📉',
                heading: 'Charts',
                items: [
                    'Leads by Source — Shows how many leads were added each month, grouped by source.',
                    'Leads by Product Format — Monthly lead count broken down by product format.',
                    'Use these charts to spot trends and plan outreach.',
                ],
            },
        ],
    },
    products: {
        title: 'Products',
        subtitle: 'Your central hub for managing products and SKU configurations.',
        icon: '📦',
        sections: [
            {
                icon: '📦',
                heading: 'Product Cards',
                items: [
                    'Each card represents a product with its name, format badge, and key metrics.',
                    'Metrics show the number of SKU Variations, associated Clients, and Active Quotes.',
                    'Click anywhere on a card to expand it and reveal its Configuration Matrix.',
                    'Use the link icon (🔗) on a card to open the product\'s Google Drive folder.',
                ],
            },
            {
                icon: '🔍',
                heading: 'Search & Filter',
                items: [
                    'Use the Search bar at the top to find products by name.',
                    'Filter by product Format using the dropdown (e.g. Powder, Capsule, Tablet).',
                    'Toggle Sort A–Z to switch between ascending and descending alphabetical order.',
                ],
            },
            {
                icon: '➕',
                heading: 'Adding New Items',
                items: [
                    'Click "+ New Product" to create a new product entry.',
                    'Inside an expanded product, click "+ Add SKU" to add a new variant/configuration.',
                ],
            },
            {
                icon: '⚙️',
                heading: 'Configuration Matrix (Expanded View)',
                items: [
                    'Shows all SKU variants for the product in a table.',
                    'Columns: Model Variant (name + flavour), Pack (size & type), Code (SKU code), and Market Benchmark (latest purchase quote price & vendor).',
                    'Hover over a row to reveal action buttons on the right.',
                ],
            },
            {
                icon: '🛠️',
                heading: 'SKU Row Actions',
                items: [
                    '📄 Technical Datasheet — Downloads a PDF spec sheet with formulation & packaging details.',
                    '📋 Formulation / BOM — Navigates to the linked formulation. If none exists, prompts to create one.',
                    '✏️ Settings — Opens the SKU edit form to modify variant details.',
                    '❌ Remove — Deletes the SKU (with confirmation prompt).',
                ],
            },
        ],
    },
    formulations: {
        title: 'Formulations',
        subtitle: 'Manage ingredient recipes and packaging BOMs for each SKU.',
        icon: '🧪',
        sections: [
            {
                icon: '🧪',
                heading: 'Formulation Cards',
                items: [
                    'Each card represents a formulation linked to a specific SKU.',
                    'Cards display the Product name, SKU code, Variant, Serving size, Last updated date, and Ingredient count.',
                    'Click anywhere on a card to expand it and view detailed tables.',
                    'You can navigate here directly from the Products tab by clicking the Formulation/BOM icon on a SKU row.',
                ],
            },
            {
                icon: '🔍',
                heading: 'Search',
                items: [
                    'Use the search bar to find formulations by Product name, SKU code, or Variant.',
                    'Search is case-insensitive and matches partial text.',
                ],
            },
            {
                icon: '🧬',
                heading: 'Ingredients Table (Expanded)',
                items: [
                    'Shows every ingredient in the formulation with its Type (Active or Excipient).',
                    'Columns: Item name, Type badge, Qty % (per 100g), Qty per Serving, and Qty per SKU.',
                    'A "Total Calculation" footer row sums up each numeric column.',
                    'The dosage unit (e.g. mg, g) is shown in the column headers.',
                ],
            },
            {
                icon: '📦',
                heading: 'Packaging BOM (Expanded)',
                items: [
                    'Lists all packaging materials required per unit of the SKU.',
                    'Columns: Material name and Quantity per unit.',
                    'If no packaging items are added, a placeholder message is displayed.',
                ],
            },
            {
                icon: '🛠️',
                heading: 'Actions',
                items: [
                    '➕ New — Creates a new formulation and links it to a selected SKU.',
                    '✏️ Edit — Opens the formulation form to modify ingredients and packaging.',
                    '🗑️ Delete — Removes the formulation record.',
                    'Edit and Delete buttons appear on hover over each card row.',
                ],
            },
        ],
    },
    vendors: {
        title: 'Vendors',
        subtitle: 'Track and manage your supplier relationships and engagement.',
        icon: '🏭',
        sections: [
            {
                icon: '🏭',
                heading: 'Views',
                items: [
                    'List View — A sortable, filterable data table of all vendors.',
                    'Kanban View — Vendors grouped into columns by their status (e.g. Active, On Hold, Blacklisted).',
                    'Switch between views using the toggle buttons in the toolbar.',
                ],
            },
            {
                icon: '👁️',
                heading: 'Column Visibility',
                items: [
                    'Click the "Columns" button to show or hide table columns.',
                    'Available columns: Products, Status, Rollup (engagement), Onboarded date, and Website.',
                ],
            },
            {
                icon: '🔍',
                heading: 'Filtering & Sorting',
                items: [
                    'Each column header has a built-in filter — click the filter icon to search or multi-select.',
                    'Click a column header to sort ascending/descending.',
                    'Status column supports multi-select filtering (e.g. show only Active vendors).',
                ],
            },
            {
                icon: '📊',
                heading: 'Table Columns',
                items: [
                    'Company Entity — Vendor name and website URL.',
                    'Status — Color-coded badge (Active, On Hold, Blacklisted).',
                    'Portfolio — Products linked to this vendor via purchase quotes.',
                    'Engagement — Next pending task with priority indicator and due date.',
                    'Onboarded — Date when the vendor was added.',
                ],
            },
            {
                icon: '🔎',
                heading: 'Detail View',
                items: [
                    'Click any vendor row to open its detailed side panel.',
                    'The detail view shows full contact info, linked quotes, and related tasks.',
                ],
            },
            {
                icon: '➕',
                heading: 'Adding Vendors',
                items: [
                    'Click "Add New" to create a new vendor entry.',
                    'In Kanban view, hover over a card and click the edit icon to modify.',
                ],
            },
        ],
    },
    clients: {
        title: 'Clients',
        subtitle: 'Manage your client pipeline, lead tracking, and engagement.',
        icon: '👥',
        sections: [
            {
                icon: '👥',
                heading: 'Views',
                items: [
                    'List View — A sortable, filterable data table of all clients.',
                    'Kanban View — Clients grouped into columns by their lead status (e.g. Hot Lead, Cold, etc.).',
                    'Switch between views using the toggle buttons in the toolbar.',
                ],
            },
            {
                icon: '👁️',
                heading: 'Column Visibility',
                items: [
                    'Click the "Columns" button to show or hide table columns.',
                    'Client-specific columns include Source (lead source) and Hot (hot lead indicator).',
                ],
            },
            {
                icon: '🔍',
                heading: 'Filtering & Sorting',
                items: [
                    'Each column header has a built-in filter — click the filter icon to search or multi-select.',
                    'Click a column header to sort ascending/descending.',
                    'Status and Source columns support multi-select filtering.',
                ],
            },
            {
                icon: '📊',
                heading: 'Table Columns',
                items: [
                    'Company Entity — Client name and website URL.',
                    'Status — Inline dropdown to change the lead status directly from the table.',
                    'Portfolio — Products linked to this client via sales quotes.',
                    'Engagement — Next pending task with priority indicator and due date.',
                    'Lead Date — Date the lead was created or recorded.',
                ],
            },
            {
                icon: '🔎',
                heading: 'Detail View',
                items: [
                    'Click any client row to open its detailed side panel.',
                    'The detail view shows full contact info, linked quotes, and related tasks.',
                ],
            },
            {
                icon: '➕',
                heading: 'Adding Clients',
                items: [
                    'Click "Add New" to create a new client entry.',
                    'In Kanban view, hover over a card and click the edit icon to modify.',
                ],
            },
        ],
    },
    rfq: {
        title: 'RFQ (Request for Quotation)',
        subtitle: 'Create and manage purchase requests sent to vendors.',
        icon: '📬',
        sections: [
            {
                icon: '📬',
                heading: 'Overview',
                items: [
                    'Each row represents a single RFQ sent to a vendor for a specific product or custom item.',
                    'RFQs are displayed in a dense data table sorted by date.',
                    'Use the search bar to find RFQs by vendor name or product name.',
                ],
            },
            {
                icon: '🏷️',
                heading: 'Request Types',
                items: [
                    'Standard SKU — Links to an existing product and SKU from your catalog, with pack details auto-filled.',
                    'Custom — A freeform request with a custom product name and description.',
                    'Type is shown as a color-coded badge (blue for Standard, purple for Custom).',
                ],
            },
            {
                icon: '📊',
                heading: 'Table Columns',
                items: [
                    'Date — When the RFQ was created.',
                    'Vendor — The supplier the request was sent to.',
                    'Type — Standard SKU or Custom.',
                    'Item Details — Product name, variant, and pack info (or custom name & description).',
                    'Qty / Target — Requested quantity and target price (if specified).',
                    'Country — Country of sale for the request.',
                ],
            },
            {
                icon: '📄',
                heading: 'PDF Generation',
                items: [
                    'Click the document icon on a row to download a formatted PDF of the RFQ.',
                    'For Standard SKU type, the PDF includes linked formulation ingredients and packing materials.',
                    'The PDF is named with the vendor name and date for easy filing.',
                ],
            },
            {
                icon: '🛠️',
                heading: 'Actions',
                items: [
                    '➕ New — Opens the form to create a new RFQ.',
                    '📄 PDF — Downloads a formatted RFQ document.',
                    '✏️ Edit — Opens the RFQ form to modify details.',
                    '🗑️ Delete — Removes the RFQ record.',
                    'Action buttons appear on hover over each row.',
                ],
            },
        ],
    },
    ors: {
        title: 'ORS (OEM Request Sheet)',
        subtitle: 'Create and manage OEM request sheets for vendors and clients.',
        icon: '📋',
        sections: [
            {
                icon: '📋',
                heading: 'Overview',
                items: [
                    'Each row represents an ORS linking a specific SKU to a vendor, client, or both.',
                    'ORS records include product details, quantity, country of sale, lead time, and shelf life.',
                    'Use the search bar to find records by vendor or client name.',
                ],
            },
            {
                icon: '🔀',
                heading: 'Recipient Types',
                items: [
                    'Vendor — The ORS is addressed to a supplier.',
                    'Client — The ORS is addressed to a customer.',
                    'Both — Two separate PDFs are generated, one for the vendor and one for the client.',
                ],
            },
            {
                icon: '📊',
                heading: 'Table Columns',
                items: [
                    'Date — When the ORS was created.',
                    'Vendor / Client — The recipient(s), with V and C badges when both are present.',
                    'SKU Details — Product name, variant, and pack size.',
                    'Quantity — Number of units requested.',
                    'Country — Country of sale for the order.',
                ],
            },
            {
                icon: '📄',
                heading: 'PDF Generation',
                items: [
                    'Click the document icon to download a formatted ORS PDF.',
                    'The PDF includes product info, pack details, packing materials, lead time, and shelf life.',
                    'If a formulation is linked, ingredient details are included automatically.',
                    'Required documents checklist is appended at the end of the PDF.',
                    'For "Both" type, two PDFs are downloaded (vendor and client versions).',
                ],
            },
            {
                icon: '🛠️',
                heading: 'Actions',
                items: [
                    '➕ New — Opens the form to create a new ORS.',
                    '📄 PDF — Downloads the ORS document(s).',
                    '✏️ Edit — Opens the ORS form to modify details.',
                    '🗑️ Delete — Removes the ORS record.',
                    'Action buttons appear on hover over each row.',
                ],
            },
        ],
    },
    quotes: {
        title: 'Quotes',
        subtitle: 'Track purchase quotes (In) from vendors and sales quotes (Out) to clients.',
        icon: '💰',
        sections: [
            {
                icon: '🔄',
                heading: 'In / Out Toggle',
                items: [
                    '"In" shows Purchase Quotes — prices received from vendors for your SKUs.',
                    '"Out" shows Sales Quotes — prices you\'ve offered to clients.',
                    'Switch between views using the segmented control in the toolbar.',
                    'The record count updates to reflect the active view.',
                ],
            },
            {
                icon: '🔍',
                heading: 'Search',
                items: [
                    'In "In" view, search by Vendor name, SKU code, or Quote ID.',
                    'In "Out" view, search by Client name, SKU code, or Quote ID.',
                    'Search is case-insensitive and matches partial text.',
                ],
            },
            {
                icon: '📥',
                heading: 'Purchase Quotes (In) Columns',
                items: [
                    'ID — Unique quote identifier.',
                    'Vendor — Supplier who provided the quote.',
                    'SKU — The product SKU code being quoted.',
                    'MOQ — Minimum order quantity.',
                    'Price — Unit price in the quoted currency.',
                    'Total — Calculated total (MOQ × Price).',
                    'Doc — Link to the attached document (if any).',
                ],
            },
            {
                icon: '📤',
                heading: 'Sales Quotes (Out) Columns',
                items: [
                    'ID — Unique quote identifier.',
                    'Client — Customer the quote was sent to.',
                    'SKU — The product SKU code being quoted.',
                    'MOQ — Minimum order quantity.',
                    'Price — Your selling price per unit.',
                    'Total — Calculated revenue (MOQ × Selling Price).',
                    'Status — Active, Draft, or Closed (color-coded badge).',
                    'Base Cost — The linked vendor purchase quote with vendor name and cost price.',
                    'Margin — Calculated profit margin in value and percentage, color-coded by yield.',
                ],
            },
            {
                icon: '🛠️',
                heading: 'Actions',
                items: [
                    '➕ New — Creates a new purchase or sales quote depending on the active view.',
                    '✏️ Edit — Opens the quote form to modify details.',
                    '❌ Delete — Removes the quote (with confirmation prompt).',
                    'Action buttons appear on hover over each row.',
                ],
            },
        ],
    },
    tasks: {
        title: 'Task Board',
        subtitle: 'Manage, assign, and schedule tasks across your team.',
        icon: '✅',
        sections: [
            {
                icon: '📋',
                heading: 'Views',
                items: [
                    'Table View — A sortable list of all tasks with columns for details.',
                    'Calendar (Month) — Tasks plotted on a monthly grid by due date.',
                    'Calendar (Week) — A zoomed-in weekly view with larger day cells.',
                    'Switch between views using the toggle buttons in the toolbar.',
                ],
            },
            {
                icon: '📊',
                heading: 'Table Columns',
                items: [
                    'Checkbox — Mark a task as Completed (strikes through the title).',
                    'Task — The task title.',
                    'Due Date — Target completion date.',
                    'Assignee — The team member assigned (shown as a pill badge).',
                    'Priority — High (red) or Normal (blue) badge.',
                    'Related To — Linked vendor or client with a color dot indicator.',
                ],
            },
            {
                icon: '📅',
                heading: 'Calendar Features',
                items: [
                    'Tasks appear as color-coded chips on their due date, colored by assignee.',
                    'Click a task chip to edit it. Use the checkbox to mark it complete.',
                    'Hover over a day cell and click the + button to create a task on that date.',
                    'Navigate months/weeks with the arrow buttons or jump to "Today".',
                    'Completed tasks appear faded with strikethrough text.',
                ],
            },
            {
                icon: '✏️',
                heading: 'Inline Editing',
                items: [
                    'Double-click a task title to edit it inline (in card or list views).',
                    'Change the assignee via the dropdown directly on the task card.',
                    'Click the due date on a card to change it with a date picker.',
                ],
            },
            {
                icon: '🛠️',
                heading: 'Actions',
                items: [
                    '➕ New Task — Opens the form to create a new task.',
                    '✏️ Edit — Click a task row or calendar chip to modify details.',
                    '🔍 Search — Filter tasks by title text.',
                ],
            },
        ],
    },
    inventory: {
        title: 'Inventory',
        subtitle: 'Track stock movements and view closing balances.',
        icon: '📦',
        sections: [
            {
                icon: '📦',
                heading: 'Views',
                items: [
                    'Transactions — A ledger of all inward and outward stock movements.',
                    'Stock — Closing balance for every SKU as of a selected date.',
                    'Switch between views using the toggle buttons in the toolbar.',
                ],
            },
            {
                icon: '🔍',
                heading: 'Transaction Filters',
                items: [
                    'SKU dropdown — Filter to a specific SKU.',
                    'Type — Show only Inward or Outward records.',
                    'Party — Filter by Vendor, Client, Third Party, or Internal.',
                    'Date range — Set a From and To date to narrow results.',
                    'Search — Find records by SKU name, product, party, or notes.',
                ],
            },
            {
                icon: '📊',
                heading: 'Transaction Columns',
                items: [
                    'Date — When the movement occurred (sortable).',
                    'Party — Source or destination name with type badge (Vendor, Client, etc.).',
                    'SKU — The product SKU code.',
                    'In — Quantity received (green, shown for Inward records).',
                    'Out — Quantity dispatched (red, shown for Outward records).',
                    'Balance — Running balance per SKU (blue if positive, red if negative).',
                    'Notes — Optional notes attached to the record.',
                ],
            },
            {
                icon: '📈',
                heading: 'Summary Snapshot',
                items: [
                    'Appears when filters are applied (SKU, party, or date range).',
                    'Shows Opening Balance, Total In, Total Out, and Closing Balance.',
                    'Opening balance is calculated from all transactions before the "From" date.',
                ],
            },
            {
                icon: '📋',
                heading: 'Stock View',
                items: [
                    'Shows closing balance for all SKUs as of the selected date (defaults to today).',
                    'Grouped by Format → Product → SKU, sorted alphabetically.',
                    'SKUs with zero transactions are excluded.',
                    'Use the "Today" button to quickly reset the date.',
                ],
            },
            {
                icon: '🛠️',
                heading: 'Actions',
                items: [
                    '➕ New — Create a new inward or outward inventory record.',
                    '✏️ Edit — Modify an existing transaction.',
                    '❌ Delete — Remove a transaction record.',
                    'Action buttons appear on hover over each row.',
                ],
            },
        ],
    },
};

// ─── Quick-Link How-To Cards ────────────────────────────────────────────
const quickLinks = [
    { label: 'Create a new product', targetGuide: 'products', targetSection: 'Adding New Items', emoji: '📦' },
    { label: 'Add a formulation', targetGuide: 'formulations', targetSection: 'Actions', emoji: '🧪' },
    { label: 'Create a new vendor', targetGuide: 'vendors', targetSection: 'Adding Vendors', emoji: '🏭' },
    { label: 'Create a new client', targetGuide: 'clients', targetSection: 'Adding Clients', emoji: '👥' },
    { label: 'Create an RFQ', targetGuide: 'rfq', targetSection: 'Actions', emoji: '📬' },
    { label: 'Create an ORS', targetGuide: 'ors', targetSection: 'Actions', emoji: '📋' },
    { label: 'Add a quote', targetGuide: 'quotes', targetSection: 'Actions', emoji: '💰' },
    { label: 'Add a task', targetGuide: 'tasks', targetSection: 'Actions', emoji: '✅' },
    { label: 'Record inventory', targetGuide: 'inventory', targetSection: 'Actions', emoji: '📈' },
];

// ─── Component ──────────────────────────────────────────────────────────
export const HelpCenter = () => {
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [highlightSection, setHighlightSection] = useState(null);
    const cardRefs = useRef({});

    const lowerSearch = search.toLowerCase();

    // Filter guides based on search
    const filteredGuides = Object.entries(guides).filter(([, guide]) => {
        if (!lowerSearch) return true;
        if (guide.title.toLowerCase().includes(lowerSearch)) return true;
        if (guide.subtitle.toLowerCase().includes(lowerSearch)) return true;
        return guide.sections.some(
            s => s.heading.toLowerCase().includes(lowerSearch) ||
                s.items.some(item => item.toLowerCase().includes(lowerSearch))
        );
    });

    const handleQuickLink = (targetGuide, targetSection) => {
        setExpandedId(targetGuide);
        setHighlightSection(targetSection);
        setSearch('');
        setTimeout(() => {
            cardRefs.current[targetGuide]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Clear highlight after animation
            setTimeout(() => setHighlightSection(null), 2000);
        }, 100);
    };

    const toggleExpand = (id) => {
        setExpandedId(prev => prev === id ? null : id);
        setHighlightSection(null);
    };

    return (
        <div className="h-full flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center border border-blue-200">
                            <Icons.Help className="w-4.5 h-4.5 text-blue-600" />
                        </div>
                        Help Center
                    </h1>
                    <p className="text-[12px] text-slate-400 mt-1 font-medium">Step-by-step guides for every module in Biowearth.</p>
                </div>
                <div className="relative w-full sm:w-72">
                    <Icons.Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                        type="text"
                        placeholder="Search guides..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-[12px] font-medium bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 placeholder:text-slate-300 transition-all"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors">
                            <Icons.X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Links — Getting Started */}
            {!search && (
                <div>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">⚡ Quick How-To</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                        {quickLinks.map((ql, i) => (
                            <button
                                key={i}
                                onClick={() => handleQuickLink(ql.targetGuide, ql.targetSection)}
                                className="group flex items-center gap-2.5 px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-sm transition-all text-left"
                            >
                                <span className="text-base flex-shrink-0">{ql.emoji}</span>
                                <span className="text-[11px] font-bold text-slate-600 group-hover:text-blue-700 leading-tight transition-colors">{ql.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Guide Cards */}
            <div className="flex-1 space-y-2 pb-4">
                {filteredGuides.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Icons.Search className="w-10 h-10 text-slate-200 mb-3" />
                        <p className="text-sm font-bold text-slate-400">No guides match "{search}"</p>
                        <p className="text-[11px] text-slate-300 mt-1">Try searching for a module name or keyword.</p>
                    </div>
                )}

                {filteredGuides.map(([id, guide]) => {
                    const isExpanded = expandedId === id;
                    return (
                        <div
                            key={id}
                            ref={el => (cardRefs.current[id] = el)}
                            className={`bg-white border rounded-lg overflow-hidden transition-all duration-200 ${isExpanded ? 'border-blue-200 shadow-md ring-2 ring-blue-50' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}
                        >
                            {/* Card Header */}
                            <button
                                onClick={() => toggleExpand(id)}
                                className="w-full flex items-center gap-3.5 px-4 py-3 text-left group"
                            >
                                <span className="text-xl flex-shrink-0">{guide.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <h3 className={`text-[13px] font-black tracking-tight transition-colors ${isExpanded ? 'text-blue-700' : 'text-slate-800 group-hover:text-blue-600'}`}>
                                        {guide.title}
                                    </h3>
                                    <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">{guide.subtitle}</p>
                                </div>
                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex-shrink-0 hidden sm:block">
                                    {guide.sections.length} topics
                                </span>
                                <Icons.ChevronDown className={`w-4 h-4 text-slate-300 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-blue-500' : ''}`} />
                            </button>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-4 animate-fade-in">
                                    {guide.sections.map((section, si) => {
                                        const isHighlighted = highlightSection === section.heading;
                                        return (
                                            <div
                                                key={si}
                                                className={`rounded-lg p-3 transition-all duration-500 ${isHighlighted ? 'bg-blue-50 border border-blue-200 ring-2 ring-blue-100' : 'bg-slate-50/60'}`}
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-sm">{section.icon}</span>
                                                    <h4 className={`text-[11px] font-black uppercase tracking-widest ${isHighlighted ? 'text-blue-700' : 'text-slate-600'}`}>
                                                        {section.heading}
                                                    </h4>
                                                </div>
                                                <ul className="space-y-1.5 pl-6">
                                                    {section.items.map((item, j) => (
                                                        <li key={j} className="text-[12px] text-slate-600 leading-relaxed relative before:content-['•'] before:absolute before:-left-3.5 before:text-blue-400 before:font-bold">
                                                            {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
