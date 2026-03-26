import React, { useState } from 'react';
import { Icons } from './components/ui/Icons';
import { useBiowearthData } from './hooks/useBiowearthData';
import { LoginScreen } from './components/LoginScreen';

// Modules
import { DashboardOverview } from './components/modules/DashboardOverview';
import { ProductMaster } from './components/modules/ProductMaster';
import { Formulations } from './components/modules/Formulations';
import { CompanyMaster } from './components/modules/CompanyMaster';
import { QuotesTab } from './components/modules/QuotesTab';
import { TaskBoard } from './components/modules/TaskBoard';
import { AdminPanel } from './components/modules/AdminPanel';
import { ORSMaster } from './components/modules/ORSMaster';
import { RFQMaster } from './components/modules/RFQMaster';
import { Inventory } from './components/modules/Inventory';
import { OrderMaster } from './components/modules/OrderMaster';
import { HelpCenter } from './components/modules/HelpCenter';

// Modals
import { AppModal } from './components/Modals/AppModal';
import { DetailDashboard } from './components/Modals/DetailDashboard';
import { ActiveQuotesModal } from './components/Modals/ActiveQuotesModal';

function App() {
  const { loading, data, actions, currentUser, setCurrentUser } = useBiowearthData();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  // UI State
  const [modal, setModal] = useState({ open: false, type: null, data: null, isEdit: false });
  const [detailView, setDetailView] = useState({ open: false, type: null, data: null });
  const [activeQuotesView, setActiveQuotesView] = useState({ open: false, productId: null });
  const [targetFormulationId, setTargetFormulationId] = useState(null);

  if (loading) return <div className="h-screen flex items-center justify-center text-slate-400">Loading Biowearth OS...</div>;
  if (!currentUser) return <LoginScreen actions={actions} />;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.Dashboard },
    { id: 'products', label: 'Products', icon: Icons.Product },
    { id: 'formulations', label: 'Formulations', icon: Icons.List },
    { id: 'ors', label: 'ORS', icon: Icons.File },
    { id: 'rfq', label: 'RFQs', icon: Icons.Mail },
    { id: 'vendors', label: 'Vendors', icon: Icons.Factory },
    { id: 'clients', label: 'Clients', icon: Icons.Users },
    { id: 'orders', label: 'Orders', icon: Icons.Ledger },
    { id: 'quotes', label: 'Quotes', icon: Icons.Money },
    { id: 'tasks', label: 'Tasks', icon: Icons.Task },
    { id: 'inventory', label: 'Inventory', icon: Icons.Box },
    { id: 'help', label: 'Help', icon: Icons.Help },
    ...(currentUser.role === 'Admin' ? [{ id: 'admin', label: 'Settings', icon: Icons.Settings }] : []),
  ];

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

      {/* --- SIDEBAR (Collapsible: icons-only → expand on hover) --- */}
      <aside
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`flex-shrink-0 bg-[#F8F9FA] border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0 w-[220px]' : '-translate-x-full w-[220px]'} lg:translate-x-0 lg:static fixed z-50 h-full ${!isSidebarOpen ? (isSidebarHovered ? 'lg:w-[220px]' : 'lg:w-[60px]') : ''}`}
      >
        {/* Brand */}
        <div className="h-14 flex items-center border-b border-slate-200/60 bg-white overflow-hidden px-3">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="Biowearth"
            className={`object-contain transition-all duration-300 ${isSidebarHovered || isSidebarOpen ? 'h-11 px-2' : 'h-8 px-0 mx-auto'}`}
          />
        </div>

        {/* Modules Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 custom-scrollbar">
          <div className={`px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 transition-all duration-300 whitespace-nowrap overflow-hidden ${isSidebarHovered || isSidebarOpen ? 'opacity-70' : 'opacity-0 h-0 py-0 mb-0'}`}>Workspace Matrix</div>
          {navItems.map(i => (
            <button
              key={i.id}
              onClick={() => handleNavClick(i.id)}
              title={!isSidebarHovered && !isSidebarOpen ? i.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-all text-[12px] font-bold uppercase tracking-tight whitespace-nowrap overflow-hidden ${isSidebarHovered || isSidebarOpen ? '' : 'justify-center px-0'} ${activeTab === i.id ? 'bg-white text-blue-600 shadow-sm border border-slate-200 ring-4 ring-blue-50/20' : 'text-slate-500 hover:bg-slate-200/40 hover:text-slate-800'}`}
            >
              <i.icon className={`w-4 h-4 flex-shrink-0 transition-colors ${activeTab === i.id ? 'text-blue-500' : 'text-slate-300'}`} />
              <span className={`transition-all duration-300 ${isSidebarHovered || isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>{i.label}</span>
            </button>
          ))}
        </nav>

        {/* User Profile (Bottom) */}
        <div className={`border-t border-slate-200/80 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.02)] transition-all duration-300 ${isSidebarHovered || isSidebarOpen ? 'p-4' : 'p-2'}`}>
          <div className={`flex items-center gap-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-all group border border-transparent hover:border-slate-100 ${isSidebarHovered || isSidebarOpen ? 'p-2' : 'p-1 justify-center'}`}>
            <div className="w-9 h-9 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500 group-hover:bg-blue-50 group-hover:border-blue-100 group-hover:text-blue-600 transition-all uppercase flex-shrink-0">
              {currentUser?.name?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
              {currentUser?.name?.split(' ')[1]?.charAt(0) || ''}
            </div>
            <div className={`flex-1 min-w-0 transition-all duration-300 ${isSidebarHovered || isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden hidden'}`}>
              <div className="text-[12px] font-bold text-slate-800 truncate leading-tight">{currentUser?.name || currentUser?.email || 'User'}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{currentUser?.role || 'Staff'}</div>
            </div>
            <button onClick={() => actions.logout()} className={`text-slate-300 hover:text-red-500 transition-all p-1 ${isSidebarHovered || isSidebarOpen ? '' : 'hidden'}`} title="Logout">
              <Icons.Logout className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">

        {/* Mobile hamburger (visible only on small screens) */}
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden fixed top-3 left-3 z-[60] p-2 text-slate-500 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 shadow-sm">
          <Icons.Menu className="w-5 h-5" />
        </button>

        {/* Scrollable Workspace */}
        <main className="flex-1 overflow-auto bg-slate-50/30 p-4 lg:p-6 scroller">
          <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
            {activeTab === 'dashboard' && <DashboardOverview data={data} actions={actions} setActiveTab={setActiveTab} />}
            {activeTab === 'products' && <ProductMaster data={data} actions={actions} setModal={setModal} setActiveQuotesView={setActiveQuotesView} onNavigateToFormulation={handleFormulationNavigation} currentUser={currentUser} />}
            {activeTab === 'formulations' && <Formulations data={data} actions={actions} setModal={setModal} targetFormulationId={targetFormulationId} />}
            {activeTab === 'ors' && <ORSMaster data={data} actions={actions} setModal={setModal} />}
            {activeTab === 'rfq' && <RFQMaster data={data} actions={actions} setModal={setModal} />}
            {activeTab === 'vendors' && <CompanyMaster type="vendor" data={data} actions={actions} setModal={setModal} setDetailView={setDetailView} currentUser={currentUser} />}
            {activeTab === 'clients' && <CompanyMaster type="client" data={data} actions={actions} setModal={setModal} setDetailView={setDetailView} currentUser={currentUser} />}
            {activeTab === 'orders' && <OrderMaster data={data} actions={actions} setModal={setModal} setDetailView={setDetailView} />}
            {activeTab === 'quotes' && <QuotesTab data={data} actions={actions} setModal={setModal} currentUser={currentUser} />}
            {activeTab === 'tasks' && <TaskBoard data={data} actions={actions} setModal={setModal} />}
            {activeTab === 'inventory' && <Inventory data={data} actions={actions} setModal={setModal} />}
            {activeTab === 'help' && <HelpCenter />}
            {activeTab === 'admin' && <AdminPanel currentUser={currentUser} data={data} actions={actions} setModal={setModal} />}
          </div>
        </main>

      </div>

      <DetailDashboard detailView={detailView} setDetailView={setDetailView} data={data} actions={actions} setModal={setModal} userProfiles={data.userProfiles} currentUser={currentUser} />
      <ActiveQuotesModal activeQuotesView={activeQuotesView} setActiveQuotesView={setActiveQuotesView} data={data} />
      <AppModal modal={modal} setModal={setModal} data={data} actions={actions} currentUser={currentUser} />

    </div>
  );
}

export default App;