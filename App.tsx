
import React, { useState, useEffect, useCallback } from 'react';
import { View, Invoice, Customer, NavigationParams, InvoiceItem } from './types';
import { db } from './services/db';
import Dashboard from './views/Dashboard';
import InvoiceList from './views/InvoiceList';
import CreateInvoice from './views/CreateInvoice';
import InvoiceDetails from './views/InvoiceDetails';
import CustomerList from './views/CustomerList';
import CustomerDetails from './views/CustomerDetails';
import Backup from './views/Backup';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Dashboard);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState<string | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null);
  const [initialInvoiceItems, setInitialInvoiceItems] = useState<Partial<InvoiceItem>[] | null>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const navigateTo = (view: View, params?: NavigationParams) => {
    if (params?.invoiceNo) setSelectedInvoiceNo(params.invoiceNo);
    else if (view !== View.EditInvoice) setSelectedInvoiceNo(null);

    if (params?.customerName) setSelectedCustomerName(params.customerName);
    
    if (params?.initialItems) setInitialInvoiceItems(params.initialItems);
    else setInitialInvoiceItems(null);

    setCurrentView(view);
    setIsSidebarOpen(false);
    if (view === View.Dashboard || view === View.Invoices || view === View.Customers) {
      fetchData();
    }
  };

  const renderView = () => {
    switch (currentView) {
      case View.Dashboard:
        return <Dashboard invoices={invoices} customers={customers} navigateTo={navigateTo} />;
      case View.Invoices:
        return <InvoiceList invoices={invoices} navigateTo={navigateTo} refresh={fetchData} />;
      case View.CreateInvoice:
        return <CreateInvoice customers={customers} navigateTo={navigateTo} refresh={fetchData} initialItems={initialInvoiceItems || []} customerNameParam={selectedCustomerName} />;
      case View.EditInvoice:
        return <CreateInvoice customers={customers} navigateTo={navigateTo} refresh={fetchData} editInvoiceNo={selectedInvoiceNo} />;
      case View.InvoiceView:
        return <InvoiceDetails invoiceNo={selectedInvoiceNo} navigateTo={navigateTo} />;
      case View.Customers:
        return <CustomerList customers={customers} invoices={invoices} navigateTo={navigateTo} refresh={fetchData} />;
      case View.CustomerDetails:
        return <CustomerDetails customerName={selectedCustomerName} navigateTo={navigateTo} refresh={fetchData} />;
      case View.Backup:
        return <Backup />;
      default:
        return <Dashboard invoices={invoices} customers={customers} navigateTo={navigateTo} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-secondary relative overflow-hidden font-poppins">
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white shadow-md z-40 flex items-center justify-between px-6 py-4 no-print">
        <h2 className="text-xl font-black text-primary tracking-tighter uppercase">Invoice Pro</h2>
        <button className="text-primary text-2xl" onClick={toggleSidebar}>
          <i className="fas fa-bars"></i>
        </button>
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={toggleSidebar}></div>
      )}

      <div id="sidebar" className={`fixed md:sticky top-0 h-screen w-[260px] bg-white border-r border-border z-50 flex flex-col shadow-xl md:shadow-none no-print transform md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 pb-6 border-b border-border">
          <h2 className="text-2xl font-black text-black tracking-tighter uppercase">Master Computer</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 opacity-70">Printing Press Mgmt</p>
        </div>
        <nav className="flex-1 p-5">
          <ul className="space-y-3">
            <li>
              <button onClick={() => navigateTo(View.Dashboard)} className={`w-full flex items-center px-5 py-4 rounded-2xl text-sm font-bold transition-all ${currentView === View.Dashboard ? 'bg-black text-white shadow-lg' : 'text-gray-500 hover:bg-secondary'}`}>
                <i className="fas fa-th-large mr-4 text-xl"></i> Dashboard
              </button>
            </li>
            <li>
              <button onClick={() => navigateTo(View.Invoices)} className={`w-full flex items-center px-5 py-4 rounded-2xl text-sm font-bold transition-all ${[View.Invoices, View.CreateInvoice, View.EditInvoice, View.InvoiceView].includes(currentView) ? 'bg-black text-white shadow-lg' : 'text-gray-500 hover:bg-secondary'}`}>
                <i className="fas fa-file-invoice mr-4 text-xl"></i> Invoices
              </button>
            </li>
            <li>
              <button onClick={() => navigateTo(View.Customers)} className={`w-full flex items-center px-5 py-4 rounded-2xl text-sm font-bold transition-all ${[View.Customers, View.CustomerDetails].includes(currentView) ? 'bg-black text-white shadow-lg' : 'text-gray-500 hover:bg-secondary'}`}>
                <i className="fas fa-users mr-4 text-xl"></i> Customers
              </button>
            </li>
            <li>
              <button onClick={() => navigateTo(View.Backup)} className={`w-full flex items-center px-5 py-4 rounded-2xl text-sm font-bold transition-all ${currentView === View.Backup ? 'bg-black text-white shadow-lg' : 'text-gray-500 hover:bg-secondary'}`}>
                <i className="fas fa-database mr-4 text-xl"></i> Data Backup
              </button>
            </li>
          </ul>
        </nav>
        <div className="p-8 pt-4 border-t border-border text-[10px] text-gray-400 font-bold uppercase tracking-widest opacity-40">v9.0 Stable Build</div>
      </div>

      <div className="flex-1 md:p-10 pt-24 md:pt-10 overflow-y-auto h-screen relative bg-[#f0f2f5]">
        {loading && (
           <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-[60] flex items-center justify-center">
             <div className="flex flex-col items-center">
               <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-black shadow-lg"></div>
               <p className="mt-4 text-black font-black uppercase text-xs tracking-widest animate-pulse">Loading Cloud Data...</p>
             </div>
           </div>
        )}
        <div className="max-w-7xl mx-auto">
          {renderView()}
        </div>
      </div>
    </div>
  );
};

export default App;
