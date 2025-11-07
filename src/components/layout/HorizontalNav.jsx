import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navigation = [
  { name: 'Dashboard', href: '/dashboard'},
  { 
    name: 'Master',
    href: '#',
    subItems: [
      { name: 'Products', href: '/inventory/products' },
      { name: 'Categories', href: '/inventory/categories' },
      { name: 'Locations', href: '/inventory/locations' },
      { name: 'Suppliers', href: '/purchasing/suppliers' },
      { name: 'Customers', href: '/sales/customers' },
      { name: 'Users', href: '/users/management' }
    ]
  },
  { 
    name: 'Inventory',
    href: '#',
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
    subItems: [
      { name: 'Assembly Orders', href: '/manufacturing/assembly-orders' },
      { name: 'Bill of Materials', href: '/manufacturing/boms' },
    ]
  },
  {
    name: 'Purchasing',
    href: '#',
    subItems: [
      { name: 'Purchase Orders', href: '/purchasing/purchase-orders' },
      { name: 'Bills', href: '/purchasing/bills' },
    ]
  },
  {
    name: 'Accounting',
    href: '#',
    subItems: [
      { name: 'Chart of Accounts', href: '/accounting/accounts' },
      { name: 'Journal Entries', href: '/accounting/journal-entries' },
      { name: 'Financial Reports', href: '/accounting/reports' },
    ]
  },
  { 
    name: 'Analytics & Reports',
    href: '#',
    subItems: [
      { name: 'Business Intelligence', href: '/analytics/dashboard' },
      { name: 'Indonesian Reports', href: '/analytics/report' },
      { name: 'KPI Management', href: '/analytics/kpi' },
      { name: 'Report Builder', href: '/analytics/builder' },
      { name: 'Report Templates', href: '/analytics/template' },
    ]
  },

  { name: 'Data Import', href: '/data-import'},
//   { 
//     name: 'Users',
//     href: '#',
//     subItems: [
//       { name: 'User Management', href: '/users/management' },
//     ]
//   },
  
]

const HorizontalNav = () => {
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(null);

  return (
    <nav className="hidden lg:flex items-center space-x-1 text-sm">
      {navigation.map((item) => {
        const hasSubItems = item.subItems && item.subItems.length > 0;
        const isActive = location.pathname === item.href || 
                         (hasSubItems && item.subItems.some(sub => location.pathname.startsWith(sub.href)));

        if (hasSubItems) {
          // Render sebagai DropdownMenu
          return (
            <DropdownMenu 
              key={item.name}
              open={openMenu === item.name} // Kontrol status open dari state
              onOpenChange={(isOpen) => {
                // Jika ditutup (misal klik di luar), reset state
                if (!isOpen) {
                  setOpenMenu(null);
                }
              }}
            >
              <DropdownMenuTrigger asChild>
                <div
                  // Event untuk membuka saat hover
                  onMouseEnter={() => setOpenMenu(item.name)}
                  // Event untuk menutup saat mouse keluar dari area tombol + menu
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  <Button 
                    variant={isActive ? "secondary" : "ghost"} 
                    className="h-8 px-3 py-1 text-sm"
                    // Tambahkan onClick untuk pengguna mobile/keyboard
                    onClick={() => setOpenMenu(openMenu === item.name ? null : item.name)}
                  >
                    {item.name}
                  </Button>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="start"
                // Event untuk memastikan menu tetap terbuka saat mouse di atasnya
                onMouseEnter={() => setOpenMenu(item.name)}
                onMouseLeave={() => setOpenMenu(null)}
              >
                {item.subItems.map((subItem) => (
                  <DropdownMenuItem key={subItem.href} asChild>
                    <Link to={subItem.href}>{subItem.name}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        } else {
          // Render sebagai Button/Link biasa
          return (
            <Button
              key={item.name}
              variant={isActive ? "secondary" : "ghost"}
              asChild
              className="h-8 px-3 py-1 text-sm"
            >
              <Link to={item.href}>{item.name}</Link>
            </Button>
          );
        }
      })}
    </nav>
  );
};

export default HorizontalNav;