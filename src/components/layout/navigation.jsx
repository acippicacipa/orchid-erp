import {
  Upload,
  Package,
  ShoppingCart,
  FileText,
  Factory,
} from 'lucide-react';

// Definisikan dan ekspor array navigasi dari sini
export const navigation = [
  { 
    name: 'Inventory',
    href: '#',
    icon: Package,
    subItems: [
      { name: 'Stock', href: '/inventory/stock' },
      { name: 'Stock Movements', href: '/inventory/stock-movements' },
      { name: 'Good Receipts', href: '/inventory/good-receipt' },
      { name: 'Picking List', href: '/inventory/fulfillment' },
      { name: 'Delivery Orders', href: '/inventory/delivery-orders' },
    ]
  },
  {
    name: 'Sales',
    href: '#',
    icon: ShoppingCart,
    subItems: [
      { name: 'Sales Orders', href: '/sales/orders' },
      { name: 'Create Sales Order', href: '/sales/orders/create' },
      { name: 'Order Approvals', href: '/sales/approvals' },
      { name: 'Invoices', href: '/sales/invoices' },
    ]
  },
  {
    name: 'Manufacturing',
    href: '#',
    icon: Factory,
    subItems: [
      { name: 'Assembly Orders', href: '/manufacturing/assembly-orders' },
      { name: 'Bill of Materials', href: '/manufacturing/boms' },
    ]
  },
  {
    name: 'Purchasing',
    href: '#',
    icon: Package,
    subItems: [
      { name: 'Purchase Orders', href: '/purchasing/purchase-orders' },
      { name: 'Bills', href: '/purchasing/bills' },
    ]
  },
  {
    name: 'Accounting',
    href: '#',
    icon: FileText,
    subItems: [
      { name: 'Chart of Accounts', href: '/accounting/accounts' },
      { name: 'Journal Entries', href: '/accounting/journal-entries' },
      { name: 'Financial Reports', href: '/accounting/reports' },
    ]
  },
  { 
    name: 'Analytics & Reports',
    href: '#',
    icon: FileText,
    subItems: [
      { name: 'Business Intelligence', href: '/analytics/dashboard' },
      { name: 'Indonesian Reports', href: '/analytics/report' },
      { name: 'KPI Management', href: '/analytics/kpi' },
      { name: 'Report Builder', href: '/analytics/builder' },
      { name: 'Report Templates', href: '/analytics/template' },
    ]
  },
  { 
    name: 'Master',
    href: '#',
    icon: FileText,
    subItems: [
      { name: 'Products', href: '/inventory/products' },
      { name: 'Categories', href: '/inventory/categories' },
      { name: 'Locations', href: '/inventory/locations' },
      { name: 'Suppliers', href: '/purchasing/suppliers' },
      { name: 'Customers', href: '/sales/customers' },
      { name: 'Users', href: '/users/management' }
    ]
  },

  { name: 'Data Import', href: '/data-import', icon:Upload },
//   { 
//     name: 'Users',
//     href: '#',
//     subItems: [
//       { name: 'User Management', href: '/users/management' },
//     ]
//   },
  
]