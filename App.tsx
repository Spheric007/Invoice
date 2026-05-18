import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Invoice, Customer, NavigationParams, InvoiceItem } from './types';
import { db } from './services/db';
import { supabase } from './supabaseClient';
import Dashboard from './views/Dashboard';
import InvoiceList from './views/InvoiceList';
import CreateInvoice from './views/CreateInvoice';
import InvoiceDetails from './views/InvoiceDetails';
import CustomerList from './views/CustomerList';
import CustomerDetails from './views/CustomerDetails';
import Login from './views/Login';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>(View.Dashboard);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState<string | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null);
  const [initialInvoiceItems, setInitialInvoiceItems] = useState<Partial<InvoiceItem>[] | null>(null);

  // List States (Lifted to prevent reset on navigation)
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [customerSearch, setCustomerSearch] = useState('');

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollPositions = useRef<Record<string, number>>({});

  const contentRef = useRef<HTMLDivElement>(null);

  // Auth Listener
  useEffect(() => {
    // Fix: Access auth as any to ensure getSession and onAuthStateChange are available regardless of strict type checking
    const auth = (supabase as any).auth;
    
    auth.getSession().then(({ data: { session } }: any) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [invs, custs] = await Promise.all([
        db.getInvoices(),
        db.getCustomers()
      ]);
      setInvoices(invs);
      setCustomers(custs);
    } catch (err) {
      console.error("Error fetching initial data:", err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [fetchData, session]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const navigateTo = (view: View, params?: NavigationParams) => {
    // Save current scroll position
    if (contentRef.current) {
      const currentPos = contentRef.current.scrollTop;
      scrollPositions.current[currentView] = currentPos;
    }

    if (params?.invoiceNo) setSelectedInvoiceNo(params.invoiceNo);
    else if (view !== View.EditInvoice) setSelectedInvoiceNo(null);

    if (params?.customerName !== undefined) {
      setSelectedCustomerName(params.customerName);
      if (params.customerName) {
        setInvoiceSearch(params.customerName);
      }
    }
    
    if (params?.initialItems) setInitialInvoiceItems(params.initialItems);
    else setInitialInvoiceItems(null);

    setCurrentView(view);
    setIsSidebarOpen(false);

    // Scroll management
    setTimeout(() => {
      if (contentRef.current) {
        const savedPos = scrollPositions.current[view];
        if (params?.skipScrollTop && savedPos !== undefined) {
          contentRef.current.scrollTo({ top: savedPos, behavior: 'auto' });
        } else {
          contentRef.current.scrollTo(0, 0);
        }
      }
    }, 100);

    if (view === View.Dashboard || view === View.Invoices || view === View.Customers) {
      fetchData();
    }
  };

  const handleLogout = async () => {
    // Fix: Access auth as any to call signOut
    await (supabase.auth as any).signOut();
  };

  const renderView = () => {
    switch (currentView) {
      case View.Dashboard:
        return <Dashboard invoices={invoices} customers={customers} navigateTo={navigateTo} />;
      case View.Invoices:
        return (
          <InvoiceList 
            invoices={invoices} 
            navigateTo={navigateTo} 
            refresh={fetchData} 
            searchTerm={invoiceSearch}
            setSearchTerm={setInvoiceSearch}
            statusFilter={invoiceFilter}
            setStatusFilter={setInvoiceFilter}
          />
        );
      case View.CreateInvoice:
        return <CreateInvoice customers={customers} navigateTo={navigateTo} refresh={fetchData} initialItems={initialInvoiceItems || []} customerNameParam={selectedCustomerName} />;
      case View.EditInvoice:
        return <CreateInvoice customers={customers} navigateTo={navigateTo} refresh={fetchData} editInvoiceNo={selectedInvoiceNo} />;
      case View.InvoiceView:
        return <InvoiceDetails invoiceNo={selectedInvoiceNo} navigateTo={navigateTo} />;
      case View.Customers:
        return (
          <CustomerList 
            customers={customers} 
            invoices={invoices} 
            navigateTo={navigateTo} 
            refresh={fetchData} 
            searchTerm={customerSearch}
            setSearchTerm={setCustomerSearch}
          />
        );
      case View.CustomerDetails:
        return <CustomerDetails customerName={selectedCustomerName} navigateTo={navigateTo} refresh={fetchData} />;
      default:
        return <Dashboard invoices={invoices} customers={customers} navigateTo={navigateTo} />;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-black"></div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <div className="flex min-h-screen bg-secondary relative overflow-hidden font-poppins">
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-sm z-40 flex items-center justify-between px-5 py-3 no-print border-b border-border">
        <div className="flex items-center gap-2.5">
          <img src="https://i.postimg.cc/ZnBCH0FB/master-Comptrer.png" alt="Logo" className="h-9 w-9 object-contain rounded-lg shadow-sm" />
          <div>
            <h2 className="text-base font-black text-primary tracking-tighter uppercase leading-none">Master Computer</h2>
            <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 opacity-70">Printing Press Mgmt</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={() => navigateTo(View.CreateInvoice)} className="w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center text-sm shadow-md active:scale-90 transition-transform">
             <i className="fas fa-plus"></i>
           </button>
           <button className="text-primary text-xl p-2" onClick={toggleSidebar}>
             <i className="fas fa-bars-staggered"></i>
           </button>
        </div>
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300" onClick={toggleSidebar}></div>
      )}

      <div id="sidebar" className={`fixed md:sticky top-0 h-screen w-[280px] bg-white border-r border-border z-50 flex flex-col shadow-2xl md:shadow-none no-print transition-transform duration-300 ease-in-out md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 pb-6 border-b border-border flex items-center gap-3">
          <div className="relative group">
            <img src="https://i.postimg.cc/ZnBCH0FB/master-Comptrer.png" alt="Logo" className="h-14 w-14 object-contain rounded-xl shadow-md border border-gray-100 group-hover:scale-105 transition-transform" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <h2 className="text-xl font-black text-black tracking-tighter uppercase leading-none">Master Computer</h2>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1.5 opacity-70">Printing Press Mgmt</p>
          </div>
        </div>
        <nav className="flex-1 p-5 overflow-y-auto">
          <ul className="space-y-2">
            <li>
              <button onClick={() => { navigateTo(View.Dashboard); if(isSidebarOpen) toggleSidebar(); }} className={`w-full flex items-center px-5 py-3.5 rounded-2xl text-sm font-bold transition-all ${currentView === View.Dashboard ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-secondary'}`}>
                <i className="fas fa-th-large mr-4 text-xl"></i> Dashboard
              </button>
            </li>
            <li>
              <button onClick={() => { navigateTo(View.Invoices); if(isSidebarOpen) toggleSidebar(); }} className={`w-full flex items-center px-5 py-3.5 rounded-2xl text-sm font-bold transition-all ${[View.Invoices, View.CreateInvoice, View.EditInvoice, View.InvoiceView].includes(currentView) ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-secondary'}`}>
                <i className="fas fa-file-invoice mr-4 text-xl"></i> Invoices
              </button>
            </li>
            <li>
              <button onClick={() => { navigateTo(View.Customers); if(isSidebarOpen) toggleSidebar(); }} className={`w-full flex items-center px-5 py-3.5 rounded-2xl text-sm font-bold transition-all ${[View.Customers, View.CustomerDetails].includes(currentView) ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-secondary'}`}>
                <i className="fas fa-users mr-4 text-xl"></i> Customers
              </button>
            </li>
          </ul>
        </nav>
        <div className="p-5 border-t border-border">
          <button onClick={handleLogout} className="w-full flex items-center px-5 py-4 rounded-2xl text-sm font-bold text-danger hover:bg-danger/10 transition-all">
            <i className="fas fa-sign-out-alt mr-4 text-xl"></i> Logout
          </button>
          <div className="mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest opacity-40 px-5 text-center">v9.0 Stable Build</div>
        </div>
      </div>

      <div ref={contentRef} className="flex-1 px-4 py-8 md:p-10 pt-20 md:pt-10 overflow-y-auto h-screen relative bg-[#f8f9fc]">
        {loading && (
           <div className="fixed inset-0 md:absolute bg-white/40 backdrop-blur-[2px] z-[100] flex items-center justify-center">
             <div className="flex flex-col items-center">
               <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-black shadow-lg"></div>
               <p className="mt-4 text-black font-black uppercase text-xs tracking-widest animate-pulse">Syncing Cloud...</p>
             </div>
           </div>
        )}
        
        <div className="max-w-7xl mx-auto pb-24 md:pb-0">
          {renderView()}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-border p-2 px-6 flex justify-between items-center z-40 no-print shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
        <NavButton active={currentView === View.Dashboard} onClick={() => navigateTo(View.Dashboard)} icon="fa-th-large" label="Home" />
        <NavButton active={[View.Invoices, View.CreateInvoice, View.EditInvoice, View.InvoiceView].includes(currentView)} onClick={() => navigateTo(View.Invoices)} icon="fa-file-invoice" label="Bills" />
        <div className="relative -top-6">
          <button 
            onClick={() => navigateTo(View.CreateInvoice)}
            className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center text-xl shadow-xl border-4 border-[#f8f9fc] active:scale-90 transition-transform"
          >
            <i className="fas fa-plus"></i>
          </button>
        </div>
        <NavButton active={[View.Customers, View.CustomerDetails].includes(currentView)} onClick={() => navigateTo(View.Customers)} icon="fa-users" label="Clients" />
        <NavButton active={false} onClick={handleLogout} icon="fa-sign-out-alt" label="Exit" className="text-danger opacity-60" />
      </div>
    </div>
  );
};

const NavButton: React.FC<{active: boolean, onClick: () => void, icon: string, label: string, className?: string}> = ({ active, onClick, icon, label, className }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-primary' : 'text-gray-400'} ${className}`}>
    <i className={`fas ${icon} text-lg`}></i>
    <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
  </button>
);

export default App;