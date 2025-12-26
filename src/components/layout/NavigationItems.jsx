function NavigationItems({ navigation = [], mobile = false, onItemClick = () => {} }) {
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
              <div className="relative mt-1 pl-5 ml-3 border-l-2 border-gray-200 dark:border-gray-700">
                <div className="space-y-1 py-1">
                  {item.subItems.map((subItem) => {
                    const isSubItemActive = location.pathname === subItem.href;
                    return (
                      <Link
                        key={subItem.href}
                        to={subItem.href}
                        onClick={() => onItemClick(subItem.href)} // Pastikan onItemClick dipanggil di sini juga
                        className={`
                          flex items-center w-full px-2 py-1.5 rounded-md text-sm font-medium transition-colors
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
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}