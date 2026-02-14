import React, { useState } from 'react';
import { Icons } from './components/ui/Icons';
import { useBiowearthData } from './hooks/useBiowearthData';
import { LoginScreen } from './components/LoginScreen';

// Modules
import { DashboardOverview } from './components/Modules/DashboardOverview';
import { ProductMaster } from './components/Modules/ProductMaster';
import { Formulations } from './components/Modules/Formulations';
import { CompanyMaster } from './components/Modules/CompanyMaster';
import { QuotesTab } from './components/Modules/QuotesTab';
import { TaskBoard } from './components/Modules/TaskBoard';
import { AdminPanel } from './components/Modules/AdminPanel';
import { ORSMaster } from './components/Modules/ORSMaster';
import { RFQMaster } from './components/Modules/RFQMaster';
import { Inventory } from './components/modules/Inventory';
import { UserGuideOverlay } from './components/ui/UserGuideOverlay';

// Modals
import { AppModal } from './components/Modals/AppModal';
import { DetailDashboard } from './components/Modals/DetailDashboard';
import { ActiveQuotesModal } from './components/Modals/ActiveQuotesModal';

function App() {
  const { loading, data, actions, currentUser, setCurrentUser } = useBiowearthData();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // UI State
  const [modal, setModal] = useState({ open: false, type: null, data: null, isEdit: false });
  const [detailView, setDetailView] = useState({ open: false, type: null, data: null });
  const [activeQuotesView, setActiveQuotesView] = useState({ open: false, productId: null });
  const [targetFormulationId, setTargetFormulationId] = useState(null);
  const [showGuide, setShowGuide] = useState(false);

  if (loading) return <div className="h-screen flex items-center justify-center text-slate-400">Loading Biowearth OS...</div>;
  if (!currentUser) return <LoginScreen userProfiles={data.userProfiles} onLogin={setCurrentUser} />;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.Dashboard },
    { id: 'products', label: 'Products', icon: Icons.Product },
    { id: 'formulations', label: 'Formulations', icon: Icons.List },
    { id: 'ors', label: 'ORS', icon: Icons.File },
    { id: 'rfq', label: 'RFQs', icon: Icons.Mail }, // <--- Added RFQ Menu Item
    { id: 'vendors', label: 'Vendors', icon: Icons.Factory },
    { id: 'clients', label: 'Clients', icon: Icons.Users },
    { id: 'quotes', label: 'Quotes', icon: Icons.Money },
    { id: 'tasks', label: 'Tasks', icon: Icons.Task },
    { id: 'inventory', label: 'Inventory', icon: Icons.Box },
  ];

  // Admin item removed from sidebar - now accessed via settings icon

  const handleNavClick = (id) => {
    setActiveTab(id);
    setIsSidebarOpen(false);
    setTargetFormulationId(null);
  };

  const handleFormulationNavigation = (skuId) => {
    const found = data.formulations.find(f => f.skuId === skuId);
    if (found) {
      setTargetFormulationId(found.id);
      setActiveTab('formulations');
    } else {
      if (confirm("No formulation found for this SKU. Create one now?")) {
        setActiveTab('formulations');
        setModal({ open: true, type: 'formulation', data: { skuId } });
      }
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">

      {/* --- SIDEBAR (ERPNext "Desk") --- */}
      <aside className={`w-[220px] flex-shrink-0 bg-[#F8F9FA] border-r border-slate-200 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-[220px]'} lg:translate-x-0 lg:static fixed z-50 h-full`}>
        {/* Brand */}
        <div className="h-14 flex items-center px-5 border-b border-slate-200/60 bg-white">
          <div className="font-bold text-lg tracking-tight text-slate-800 flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-black shadow-sm">N</div>
            <span className="font-black text-slate-900 tracking-tighter">NIZONA<span className="text-blue-600">OS</span></span>
          </div>
        </div>

        {/* Modules Navigation */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-0.5 custom-scrollbar">
          <div className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 opacity-70">Workspace Matrix</div>
          {navItems.map(i => (
            <button
              key={i.id}
              onClick={() => handleNavClick(i.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-all text-[12px] font-bold uppercase tracking-tight ${activeTab === i.id ? 'bg-white text-blue-600 shadow-sm border border-slate-200 ring-4 ring-blue-50/20' : 'text-slate-500 hover:bg-slate-200/40 hover:text-slate-800'}`}
            >
              <i.icon className={`w-4 h-4 transition-colors ${activeTab === i.id ? 'text-blue-500' : 'text-slate-300 group-hover:text-slate-500'}`} />
              {i.label}
            </button>
          ))}
        </nav>

        {/* User Profile (Bottom) */}
        <div className="p-4 border-t border-slate-200/80 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group border border-transparent hover:border-slate-100">
            <div className="w-9 h-9 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500 group-hover:bg-blue-50 group-hover:border-blue-100 group-hover:text-blue-600 transition-all uppercase">
              {currentUser.name.charAt(0)}{currentUser.name.split(' ')[1]?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-bold text-slate-800 truncate leading-tight">{currentUser.name}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{currentUser.role}</div>
            </div>
            <button onClick={() => setCurrentUser(null)} className="text-slate-300 hover:text-red-500 transition-colors p-1" title="Logout">
              <Icons.Logout className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">

        {/* Top Header (Breadcrumbs/Search) */}
        <header className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-1.5 text-slate-500 hover:bg-slate-100 rounded border border-slate-200">
              <Icons.Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center text-[11px] font-bold uppercase tracking-widest text-slate-400">
              <span className="hover:text-blue-600 cursor-pointer transition-colors">DESK</span>
              <Icons.ChevronRight className="w-3.5 h-3.5 mx-2 text-slate-300" />
              <span className="text-slate-800 font-black">{navItems.find(i => i.id === activeTab)?.label}</span>
            </div>
          </div>


          {/* Right Actions */}
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowGuide(true)} className="p-2 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-50 transition-all" title="Help">
              <Icons.Info className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-200 mx-1"></div>
            {currentUser.role === 'Admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`p-2 rounded transition-all ${activeTab === 'admin' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-50'}`}
                title="Settings"
              >
                <Icons.Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Workspace */}
        <main className="flex-1 overflow-auto bg-slate-50/30 p-4 lg:p-6 scroller">
          <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
            {activeTab === 'dashboard' && <DashboardOverview data={data} actions={actions} setActiveTab={setActiveTab} />}
            {activeTab === 'products' && <ProductMaster data={data} actions={actions} setModal={setModal} setActiveQuotesView={setActiveQuotesView} onNavigateToFormulation={handleFormulationNavigation} />}
            {activeTab === 'formulations' && <Formulations data={data} actions={actions} setModal={setModal} targetFormulationId={targetFormulationId} />}
            {activeTab === 'ors' && <ORSMaster data={data} actions={actions} setModal={setModal} />}
            {activeTab === 'rfq' && <RFQMaster data={data} actions={actions} setModal={setModal} />}
            {activeTab === 'vendors' && <CompanyMaster type="vendor" data={data} actions={actions} setModal={setModal} setDetailView={setDetailView} />}
            {activeTab === 'clients' && <CompanyMaster type="client" data={data} actions={actions} setModal={setModal} setDetailView={setDetailView} />}
            {activeTab === 'quotes' && <QuotesTab data={data} actions={actions} setModal={setModal} />}
            {activeTab === 'tasks' && <TaskBoard data={data} actions={actions} setModal={setModal} />}
            {activeTab === 'inventory' && <Inventory data={data} actions={actions} setModal={setModal} />}
            {activeTab === 'admin' && <AdminPanel currentUser={currentUser} data={data} actions={actions} setModal={setModal} />}
          </div>
        </main>

      </div>

      <DetailDashboard detailView={detailView} setDetailView={setDetailView} data={data} actions={actions} setModal={setModal} userProfiles={data.userProfiles} />
      <ActiveQuotesModal activeQuotesView={activeQuotesView} setActiveQuotesView={setActiveQuotesView} data={data} />
      <AppModal modal={modal} setModal={setModal} data={data} actions={actions} currentUser={currentUser} />
      {showGuide && <UserGuideOverlay activeTab={activeTab} onClose={() => setShowGuide(false)} />}
    </div>
  );
}

export default App;