import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { navigation } from './navigation';

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