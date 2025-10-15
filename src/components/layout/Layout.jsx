import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { 
  Building2, 
  LayoutDashboard, 
  Upload, 
  Users, 
  Package, 
  ShoppingCart, 
  FileText, 
  Settings, 
  LogOut, 
  Menu,
  Bell,
  Search,
  Factory,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { 
    name: 'Inventory',
    href: '/inventory/products',
    icon: Package,
    subItems: [
      { name: 'Products', href: '/inventory/products' },
      { name: 'Categories', href: '/inventory/categories' },
      { name: 'Locations', href: '/inventory/locations' },
      { name: 'Stock', href: '/inventory/stock' },
      { name: 'Stock Movements', href: '/inventory/stock-movements' },
      { name: 'Good Receipts', href: '/inventory/good-receipt' },
    ]
  },
  {
    name: 'Sales',
    href: '/sales/orders',
    icon: ShoppingCart,
    subItems: [
      { name: 'Customers', href: '/sales/customers' },
      { name: 'Sales Orders', href: '/sales/orders' },
      { name: 'Create Sales Order', href: '/sales/orders/create' },
      { name: 'Invoices', href: '/sales/invoices' },
    ]
  },
  {
    name: 'Manufacturing',
    href: '/manufacturing/assembly-orders',
    icon: Factory,
    subItems: [
      { name: 'Assembly Orders', href: '/manufacturing/assembly-orders' },
      { name: 'Bill of Materials', href: '/manufacturing/boms' },
    ]
  },
  {
    name: 'Purchasing',
    href: '/purchasing/purchase-orders',
    icon: Package,
    subItems: [
      { name: 'Suppliers', href: '/purchasing/suppliers' },
      { name: 'Purchase Orders', href: '/purchasing/purchase-orders' },
      { name: 'Bills', href: '/purchasing/bills' },
    ]
  },
  {
    name: 'Accounting',
    href: '/accounting/accounts',
    icon: FileText,
    subItems: [
      { name: 'Chart of Accounts', href: '/accounting/accounts' },
      { name: 'Journal Entries', href: '/accounting/journal-entries' },
      { name: 'Financial Reports', href: '/accounting/reports' },
    ]
  },
  { 
    name: 'Analytics & Reports',
    href: '/analytics/dashboard',
    icon: FileText,
    subItems: [
      { name: 'Business Intelligence', href: '/analytics/dashboard' },
      { name: 'Indonesian Reports', href: '/analytics/report' },
      { name: 'KPI Management', href: '/analytics/kpi' },
      { name: 'Report Builder', href: '/analytics/builder' },
      { name: 'Report Templates', href: '/analytics/template' },
    ]
  },

  { name: 'Data Import', href: '/data-import', icon: Upload },
  { 
    name: 'Users',
    href: '/users/management',
    icon: Users,
    subItems: [
      { name: 'User Management', href: '/users/management' },
    ]
  },
  
]

function NavigationItems({ mobile = false, onItemClick = () => {} }) {
  const location = useLocation();
  //const [openSubMenus, setOpenSubMenus] = useState(null);
  const [openSubMenu, setOpenSubMenu] = useState(null);
  const toggleSubMenu = (itemName) => {
    // setOpenSubMenus(prev => ({
    //   ...prev,
    //   [itemName]: !prev[itemName],
    // }));
    setOpenSubMenu(prevOpen => (prevOpen === itemName ? null : itemName));
  };
  
  return (
    <nav>
      {navigation.map((item) => {
        const isActive = location.pathname === item.href || (item.subItems && item.subItems.some(sub => location.pathname.startsWith(sub.href)));
        const Icon = item.icon;
        const hasSubItems = item.subItems && item.subItems.length > 0;
        //const isSubMenuOpen = openSubMenus[item.name] || isActive;
        const isSubMenuOpen = openSubMenu === item.name || (openSubMenu === null && isActive);

        return (
          <div key={item.href} className="mb-1">
            <div
              className={`
                flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer
                ${isActive 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
              // Jika item tidak punya submenu, klik akan menavigasi. Jika punya, ia akan mentoggle.
              onClick={() => hasSubItems ? toggleSubMenu(item.name) : onItemClick(item.href)}
            >
              <Link to={item.href} className="flex items-center flex-grow" onClick={(e) => { if (hasSubItems) e.preventDefault(); }}>
                <Icon className="mr-3 h-4 w-4" />
                {item.name}
              </Link>
              {hasSubItems && (
                <Button variant="ghost" size="sm" className="h-auto p-1" onClick={(e) => { e.stopPropagation(); toggleSubMenu(item.name); }}>
                  {isSubMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </Button>
              )}
            </div>
            {hasSubItems && isSubMenuOpen && (
              <div className="ml-6 mt-1 space-y-1">
                {item.subItems.map((subItem) => {
                  const isSubItemActive = location.pathname === subItem.href;
                  return (
                    <Link
                      key={subItem.href}
                      to={subItem.href}
                      onClick={() => onItemClick(subItem.href)} // Pastikan onItemClick dipanggil di sini juga
                      className={`
                        flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${isSubItemActive 
                          ? 'bg-secondary text-secondary-foreground' 
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      {subItem.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`
    }
    return user?.username?.[0]?.toUpperCase() || 'U'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-sm">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">Orchid ERP</h1>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 px-4 py-6 overflow-y-auto">
              <NavigationItems />
            </div>

            {/* User Info */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user?.full_name || user?.username}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.role_display || 'User'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex flex-col h-full bg-white dark:bg-gray-800">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">Orchid ERP</h1>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 px-4 py-6 overflow-y-auto">
                <NavigationItems mobile onItemClick={() => setSidebarOpen(false)} />
              </div>
            </div>

            {/* User Info */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user?.full_name || user?.username}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.role_display || 'User'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Mobile menu button */}
              <div className="flex items-center lg:hidden">
                
              </div>

              {/* Search and Actions */}
              <div className="flex-1 flex justify-between items-center lg:ml-0 ml-4">
                <div className="flex-1 max-w-lg">
                  {/* Search can be added here */}
                </div>

                <div className="flex items-center space-x-4">
                  {/* Notifications */}
                  <Button variant="ghost" size="sm">
                    <Bell className="h-5 w-5" />
                  </Button>

                  {/* User Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                            {getUserInitials()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {user?.full_name || user?.username}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user?.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}