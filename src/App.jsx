import {
  Upload,
  Package,
  ShoppingCart,
  FileText,
  Factory,
} from 'lucide-react';

const ROLES = {
  ADMIN: 'ADMIN',
  WAREHOUSE: 'WAREHOUSE',
  SALES: 'SALES',
  PURCHASING: 'PURCHASING',
  ACCOUNTING: 'ACCOUNTING',
  PRODUCTION: 'PRODUCTION',
  AUDIT: 'AUDIT',
};

// Helper untuk peran umum
const ALL_ROLES = Object.values(ROLES);
const ADMIN_ONLY = [ROLES.ADMIN];
const ADMIN_AND_PURCHASING = [ROLES.ADMIN, ROLES.PURCHASING];
const ADMIN_AND_SALES = [ROLES.ADMIN, ROLES.SALES];
const ADMIN_AND_WAREHOUSE = [ROLES.ADMIN, ROLES.WAREHOUSE];
const ADMIN_AND_PRODUCTION = [ROLES.ADMIN, ROLES.PRODUCTION]
const ADMIN_WAREHOUSE_SALES = [ROLES.ADMIN, ROLES.WAREHOUSE, ROLES.SALES]
const ADMIN_AND_ACCOUNTING = [ROLES.ADMIN, ROLES.ACCOUNTING]

// Definisikan dan ekspor array navigasi dari sini
export const navigation = [
  { 
    name: 'Inventory',
    href: '#',
    icon: Package,
    roles: ALL_ROLES,
    subItems: [
      { name: 'Stock', href: '/inventory/stock', roles: ALL_ROLES },
      { name: 'Stock Movements', href: '/inventory/stock-movements', roles: ADMIN_WAREHOUSE_SALES },
      { name: 'Stock Transfer', href: '/inventory/transfer', roles: ADMIN_WAREHOUSE_SALES },
      { name: 'Good Receipts', href: '/inventory/good-receipt', roles: ADMIN_AND_WAREHOUSE },
      { name: 'Picking List', href: '/inventory/fulfillment', roles: ADMIN_AND_WAREHOUSE },
      { name: 'Delivery Orders', href: '/inventory/delivery-orders', roles: ADMIN_AND_WAREHOUSE },
    ]
  },
  {
    name: 'Sales',
    href: '#',
    icon: ShoppingCart,
    roles: ADMIN_AND_SALES,
    subItems: [
      { name: 'Sales Orders', href: '/sales/orders', roles: ADMIN_AND_SALES },
      { name: 'Create Sales Order', href: '/sales/orders/create', roles: ADMIN_AND_SALES },
      { name: 'Order Approvals', href: '/sales/approvals', roles: ADMIN_ONLY },
      { name: 'Invoices', href: '/sales/invoices', roles: ADMIN_AND_SALES },
    ]
  },
  {
    name: 'Manufacturing',
    href: '#',
    icon: Factory,
    roles: ADMIN_AND_PRODUCTION,
    subItems: [
      { name: 'Assembly Orders', href: '/manufacturing/assembly-orders', roles: ADMIN_AND_PRODUCTION },
      { name: 'Bill of Materials', href: '/manufacturing/boms', roles: ADMIN_AND_PRODUCTION },
    ]
  },
  {
    name: 'Purchasing',
    href: '#',
    icon: Package,
    roles: [ROLES.ADMIN, ROLES.PURCHASING, ROLES.ACCOUNTING],
    subItems: [
      { name: 'Purchase Orders', href: '/purchasing/purchase-orders', roles: ADMIN_AND_PURCHASING },
      { name: 'Bills', href: '/purchasing/bills', roles: ADMIN_AND_ACCOUNTING },
    ]
  },
  {
    name: 'Accounting',
    href: '#',
    icon: FileText,
    roles: ADMIN_AND_ACCOUNTING,
    subItems: [
      { name: 'Chart of Accounts', href: '/accounting/accounts', roles: ADMIN_AND_ACCOUNTING },
      { name: 'Journal Entries', href: '/accounting/journal-entries', roles: ADMIN_AND_ACCOUNTING },
      { name: 'Financial Reports', href: '/accounting/reports', roles: ADMIN_AND_ACCOUNTING },
    ]
  },
  { 
    name: 'Analytics & Reports',
    href: '#',
    icon: FileText,
    roles: ADMIN_AND_ACCOUNTING,
    subItems: [
      { name: 'Business Intelligence', href: '/analytics/dashboard', roles: ADMIN_AND_ACCOUNTING },
      { name: 'Indonesian Reports', href: '/analytics/report', roles: ADMIN_AND_ACCOUNTING },
      { name: 'KPI Management', href: '/analytics/kpi', roles: ADMIN_AND_ACCOUNTING },
      { name: 'Report Builder', href: '/analytics/builder', roles: ADMIN_AND_ACCOUNTING },
      { name: 'Report Templates', href: '/analytics/template', roles: ADMIN_AND_ACCOUNTING },
    ]
  },
  { 
    name: 'Master',
    href: '#',
    icon: FileText,
    roles: [ROLES.ADMIN, ROLES.PURCHASING, ROLES.SALES],
    subItems: [
      { name: 'Products', href: '/inventory/products', roles: ADMIN_ONLY},
      { name: 'Categories', href: '/inventory/categories', roles: ADMIN_ONLY },
      { name: 'Locations', href: '/inventory/locations', roles: ADMIN_ONLY },
      { name: 'Suppliers', href: '/purchasing/suppliers', roles: ADMIN_AND_PURCHASING },
      { name: 'Customers', href: '/sales/customers', roles: ADMIN_AND_SALES },
      { name: 'Users', href: '/users/management', roles: ADMIN_ONLY }
    ]
  },

  { name: 'Data Import', href: '/data-import', icon:Upload, roles: [ROLES.ADMIN] },
//   { 
//     name: 'Users',
//     href: '#',
//     subItems: [
//       { name: 'User Management', href: '/users/management' },
//     ]
//   },
  
];
