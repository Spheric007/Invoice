import React, { useState, useMemo } from 'react';
import { View, Customer, Invoice } from '../types';
import { db } from '../services/db';

interface CustomerListProps {
  customers: Customer[];
  invoices: Invoice[];
  navigateTo: (view: View, params?: any) => void;
  refresh: () => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
}

const CustomerList: React.FC<CustomerListProps> = ({ 
  customers, 
  invoices, 
  navigateTo, 
  refresh, 
  searchTerm, 
  setSearchTerm 
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Customer>({ name: '', address: '', mobile: '', opening_balance: 0 });

  const customerStats = useMemo(() => {
    const stats = new Map();
    invoices.forEach(inv => {
      const name = inv.client_name.toLowerCase().trim();
      if (!stats.has(name)) {
        stats.set(name, { totalDue: 0, count: 0 });
      }
      const data = stats.get(name);
      data.totalDue += (Number(inv.due) || 0);
      data.count += 1;
    });
    return stats;
  }, [invoices]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.mobile && c.mobile.includes(searchTerm))
  );

  const handleDelete = async (customer: Customer) => {
    const identifier = customer.id || customer.name;
    if (window.confirm(`Are you sure you want to delete customer "${customer.name}" and all their records?`)) {
      try {
        await db.deleteCustomer(identifier);
        alert('Customer deleted successfully');
        refresh();
      } catch (err: any) {
        alert('Failed to delete customer: ' + (err.message || 'Unknown error'));
        console.error(err);
      }
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name) return alert("Name is required");
    try {
      await db.saveCustomer(newCustomer);
      alert('Customer added successfully');
      setShowAddModal(false);
      setNewCustomer({ name: '', address: '', mobile: '', opening_balance: 0 });
      refresh();
    } catch (err) {
      alert('Failed to add customer');
    }
  };

  return (
    <div className="animate-in slide-in-from-right duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#333]">Customers</h1>
          <p className="text-lightText mt-1">Manage your customer relationships.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-white px-5 py-3 rounded-lg font-medium hover:opacity-90 transition-all flex items-center justify-center shadow-md shadow-primary/20"
        >
          <i className="fas fa-user-plus mr-2"></i> Add Customer
        </button>
      </div>

      <div className="relative mb-6">
        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-lightText"></i>
        <input 
          type="text" 
          placeholder="Search customers..." 
          className="w-full pl-11 pr-4 py-3 rounded-lg border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-border overflow-hidden">
        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-border">
          {filteredCustomers.map((cust) => {
            const stats = customerStats.get(cust.name.toLowerCase().trim()) || { totalDue: 0, count: 0 };
            return (
              <div key={cust.id || cust.name} className="p-5 active:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1" onClick={() => navigateTo(View.CustomerDetails, { customerName: cust.name })}>
                    <h3 className="font-black text-lg text-black font-bengali leading-tight">{cust.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full font-bold text-gray-500 uppercase tracking-tighter">
                        {stats.count} Bills
                      </span>
                      {cust.mobile && <span className="text-[10px] text-gray-400 font-bold">{cust.mobile}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total Due</div>
                    <div className="text-lg font-black text-danger">৳{stats.totalDue.toFixed(0)}</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => navigateTo(View.Invoices, { customerName: cust.name })}
                      className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/5 px-3 py-2 rounded-lg"
                    >
                      View Bills
                    </button>
                    <button 
                      onClick={() => navigateTo(View.CreateInvoice, { customerName: cust.name })}
                      className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg"
                    >
                      New Bill
                    </button>
                  </div>
                  <div className="flex gap-4 items-center">
                     <button onClick={() => navigateTo(View.CustomerDetails, { customerName: cust.name })} className="text-gray-400 p-2"><i className="fas fa-chevron-right text-sm"></i></button>
                     <button onClick={() => handleDelete(cust)} className="text-danger/40 hover:text-danger p-2"><i className="fas fa-trash-alt text-xs"></i></button>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredCustomers.length === 0 && (
            <div className="p-10 text-center text-gray-400 italic">No customers found.</div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f9fafb] text-left">
                <th className="px-6 py-4 text-xs font-bold text-lightText uppercase tracking-wider border-b border-border">Name</th>
                <th className="px-6 py-4 text-xs font-bold text-lightText uppercase tracking-wider border-b border-border text-center">Invoices</th>
                <th className="px-6 py-4 text-xs font-bold text-lightText uppercase tracking-wider border-b border-border">Contact</th>
                <th className="px-6 py-4 text-xs font-bold text-lightText uppercase tracking-wider border-b border-border text-right">Total Due (৳)</th>
                <th className="px-6 py-4 text-xs font-bold text-lightText uppercase tracking-wider border-b border-border text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCustomers.map((cust) => {
                const stats = customerStats.get(cust.name.toLowerCase().trim()) || { totalDue: 0, count: 0 };
                return (
                  <tr key={cust.id || cust.name} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-primary cursor-pointer hover:underline font-bengali" onClick={() => navigateTo(View.CustomerDetails, { customerName: cust.name })}>{cust.name}</td>
                    <td className="px-6 py-4 text-center">
                       <button 
                         onClick={() => navigateTo(View.Invoices, { customerName: cust.name })}
                         className="bg-secondary px-3 py-1 rounded-full text-xs font-bold text-lightText hover:bg-primary hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
                       >
                         {stats.count} Bills
                       </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium">{cust.mobile || 'N/A'}</div>
                      <div className="text-xs text-lightText font-bengali">{cust.address || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-danger">৳{stats.totalDue.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center space-x-3">
                      <button onClick={() => navigateTo(View.CustomerDetails, { customerName: cust.name })} className="text-primary hover:scale-110 transition-transform"><i className="fas fa-eye"></i></button>
                      <button onClick={() => handleDelete(cust)} className="text-danger hover:scale-110 transition-transform"><i className="fas fa-trash-alt"></i></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
           <div className="bg-white rounded-2xl w-full max-w-md p-8 relative shadow-2xl">
             <h2 className="text-2xl font-bold mb-6 text-primary">Add Customer</h2>
             <div className="space-y-4">
               <input type="text" placeholder="Name*" className="w-full px-4 py-3 rounded-xl border border-border outline-none font-bengali" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} />
               <input type="text" placeholder="Mobile" className="w-full px-4 py-3 rounded-xl border border-border outline-none" value={newCustomer.mobile} onChange={(e) => setNewCustomer({ ...newCustomer, mobile: e.target.value })} />
               <input type="text" placeholder="Address" className="w-full px-4 py-3 rounded-xl border border-border outline-none font-bengali" value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} />
               <input type="number" placeholder="Opening Due" className="w-full px-4 py-3 rounded-xl border border-border outline-none" value={newCustomer.opening_balance} onChange={(e) => setNewCustomer({ ...newCustomer, opening_balance: Number(e.target.value) })} />
             </div>
             <div className="flex gap-4 mt-8">
               <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-3 border border-border rounded-xl">Cancel</button>
               <button onClick={handleAddCustomer} className="flex-1 px-4 py-3 bg-primary text-white rounded-xl">Save</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CustomerList;