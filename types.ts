
export interface InvoiceItem {
  id: string | number;
  details: string;
  len?: string | number;
  wid?: string | number;
  qty: number;
  rate: number;
  total: number;
}

export interface Invoice {
  id?: string;
  invoice_no: string;
  client_name: string;
  client_address?: string;
  client_mobile?: string;
  grand_total: number;
  advance: number;
  due: number;
  is_paid: boolean;
  memo_date: string;
  is_walk_in: boolean;
  items: InvoiceItem[];
  in_word: string;
  created_at?: string;
}

export interface Customer {
  id?: string;
  name: string;
  address?: string;
  mobile?: string;
  opening_balance?: number;
  created_at?: string;
}

export interface Transaction {
  id?: string;
  customer_name: string;
  date: string;
  description: string;
  amount: number;
  type: 'Deposit' | 'Due';
  created_at?: string;
}

export interface PendingItem {
  id: string | number;
  customer_name: string;
  description: string;
  qty: number;
  rate: number;
  total: number;
}

export interface ActivityLog {
  id?: string;
  customer_name: string;
  date: string;
  type: string;
  description: string;
  amount: number;
}

export enum View {
  Dashboard = 'dashboard',
  Invoices = 'invoices',
  CreateInvoice = 'create-invoice',
  EditInvoice = 'edit-invoice',
  InvoiceView = 'invoice-view',
  Customers = 'customers',
  CustomerDetails = 'customer-details',
  Backup = 'backup'
}
