
import React from 'react';
import { View, Invoice, Customer } from '../types';

interface DashboardProps {
  invoices: Invoice[];
  customers: Customer[];
  navigateTo: (view: View, params?: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ invoices, customers, navigateTo }) => {
  const totalInvoices = invoices.length;
  const uniqueInvoicedCustomers = new Set(invoices.map(i => i.client_name.toLowerCase().trim())).size;
  const totalCustomers = Math.max(uniqueInvoicedCustomers, customers.length);
  
  let totalRevenue = 0;
  let pendingRevenue = 0;
  let paidInvoicesCount = 0;
  let partialPaymentsCount = 0;
  let unpaidInvoicesCount = 0;

  invoices.forEach(inv => {
    const total = Number(inv.grand_total) || 0;
    const due = Number(inv.due) || 0;
    const advance = Number(inv.advance) || 0;

    if (due <= 0 && total > 0) {
      paidInvoicesCount++;
      totalRevenue += total;
    } else if (advance > 0 && due > 0) {
      partialPaymentsCount++;
      pendingRevenue += due;
      totalRevenue += advance;
    } else if (due > 0) {
      unpaidInvoicesCount++;
      pendingRevenue += due;
    }
  });

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-black tracking-tighter">Dashboard</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">Business Intelligence Overview</p>
        </div>
        <div className="hidden md:block text-right">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Today's Date</div>
          <div className="font-black text-black">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
        <StatCard 
          icon="fa-file-alt" 
          value={totalInvoices.toString()} 
          label="Total Bills" 
          color="bg-[#6366f1]" 
        />
        <StatCard 
          icon="fa-users" 
          value={totalCustomers.toString()} 
          label="Clients" 
          color="bg-[#f97316]" 
        />
        <StatCard 
          icon="fa-coins" 
          value={`৳${totalRevenue.toLocaleString()}`} 
          label="Collected" 
          color="bg-[#10b981]" 
        />
        <StatCard 
          icon="fa-hourglass-half" 
          value={`৳${pendingRevenue.toLocaleString()}`} 
          label="Pending" 
          color="bg-[#f59e0b]" 
        />
      </div>

      <div className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-border overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16"></div>
        <h2 className="text-xl font-black mb-8 flex items-center gap-3 relative">
          <span className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center text-sm">
            <i className="fas fa-chart-pie"></i>
          </span>
          Billing Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 relative">
          <div className="bg-emerald-50 p-6 md:p-8 rounded-2xl border border-emerald-100 flex md:flex-col justify-between md:justify-start items-center md:items-start group hover:bg-emerald-100/50 transition-colors">
            <div>
              <div className="text-4xl md:text-5xl font-black text-emerald-600 mb-1 tracking-tighter group-hover:scale-105 transition-transform origin-left">{paidInvoicesCount}</div>
              <div className="font-bold text-sm md:text-lg text-emerald-800 uppercase md:normal-case tracking-wider md:tracking-normal">Fully Paid</div>
            </div>
            <i className="fas fa-check-circle text-2xl md:text-3xl text-emerald-200 mt-0 md:mt-4"></i>
          </div>
          <div className="bg-amber-50 p-6 md:p-8 rounded-2xl border border-amber-100 flex md:flex-col justify-between md:justify-start items-center md:items-start group hover:bg-amber-100/50 transition-colors">
            <div>
              <div className="text-4xl md:text-5xl font-black text-amber-600 mb-1 tracking-tighter group-hover:scale-105 transition-transform origin-left">{partialPaymentsCount}</div>
              <div className="font-bold text-sm md:text-lg text-amber-800 uppercase md:normal-case tracking-wider md:tracking-normal">Partial</div>
            </div>
            <i className="fas fa-adjust text-2xl md:text-3xl text-amber-200 mt-0 md:mt-4"></i>
          </div>
          <div className="bg-rose-50 p-6 md:p-8 rounded-2xl border border-rose-100 flex md:flex-col justify-between md:justify-start items-center md:items-start group hover:bg-rose-100/50 transition-colors">
            <div>
              <div className="text-4xl md:text-5xl font-black text-rose-600 mb-1 tracking-tighter group-hover:scale-105 transition-transform origin-left">{unpaidInvoicesCount}</div>
              <div className="font-bold text-sm md:text-lg text-rose-800 uppercase md:normal-case tracking-wider md:tracking-normal">Unpaid</div>
            </div>
            <i className="fas fa-exclamation-circle text-2xl md:text-3xl text-rose-200 mt-0 md:mt-4"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: string; value: string; label: string; color: string }> = ({ icon, value, label, color }) => (
  <div className="bg-white p-5 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-border flex flex-col items-start transition-all hover:shadow-md hover:-translate-y-1 duration-300">
    <div className={`${color} w-10 md:w-12 h-10 md:h-12 rounded-xl flex items-center justify-center text-white text-lg md:text-xl mb-3 md:mb-4 shadow-lg shadow-black/5`}>
      <i className={`fas ${icon}`}></i>
    </div>
    <div className="text-xl md:text-3xl font-black text-black tracking-tighter leading-tight break-all">{value}</div>
    <div className="text-[9px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{label}</div>
  </div>
);

export default Dashboard;
