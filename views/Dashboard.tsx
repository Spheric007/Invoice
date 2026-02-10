
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
    <div className="animate-in fade-in duration-500 p-4 md:p-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#333]">Dashboard</h1>
        <p className="text-lightText mt-1">Welcome back! Here's your business overview.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          icon="fa-file-alt" 
          value={totalInvoices.toString()} 
          label="Total Invoices" 
          color="bg-[#6a5acd]" 
        />
        <StatCard 
          icon="fa-users" 
          value={totalCustomers.toString()} 
          label="Total Customers" 
          color="bg-[#ff7f50]" 
        />
        <StatCard 
          icon="fa-dollar-sign" 
          value={`৳${totalRevenue.toLocaleString()}/-`} 
          label="Total Revenue" 
          color="bg-[#5cb85c]" 
        />
        <StatCard 
          icon="fa-clock" 
          value={`৳${pendingRevenue.toLocaleString()}/-`} 
          label="Pending Revenue" 
          color="bg-[#f0ad4e]" 
        />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-border">
        <h2 className="text-xl font-semibold mb-6 border-b border-border pb-3">Payment Status Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#e8f5e9] text-[#388e3c] p-8 rounded-xl border border-[#388e3c]">
            <div className="text-5xl font-bold mb-1">{paidInvoicesCount}</div>
            <div className="font-bold text-lg">Paid Invoices</div>
          </div>
          <div className="bg-[#fff3e0] text-[#f57f17] p-8 rounded-xl border border-[#f57f17]">
            <div className="text-5xl font-bold mb-1">{partialPaymentsCount}</div>
            <div className="font-bold text-lg">Partial Payments</div>
          </div>
          <div className="bg-[#ffebee] text-[#d32f2f] p-8 rounded-xl border border-[#d32f2f]">
            <div className="text-5xl font-bold mb-1">{unpaidInvoicesCount}</div>
            <div className="font-bold text-lg">Unpaid Invoices</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: string; value: string; label: string; color: string }> = ({ icon, value, label, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-border flex flex-col items-start transition-all hover:shadow-md">
    <div className={`${color} w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl mb-4 shadow-sm`}>
      <i className={`fas ${icon}`}></i>
    </div>
    <div className="text-3xl font-black text-[#333] tracking-tighter">{value}</div>
    <div className="text-xs font-bold text-lightText uppercase tracking-widest mt-1">{label}</div>
  </div>
);

export default Dashboard;
