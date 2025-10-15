import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { useToast } from "../../hooks/use-toast";
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Factory, 
  MapPin, 
  DollarSign,
  ShoppingCart,
  Users,
  FileText,
  BarChart3,
  Activity,
  Clock,
  CheckCircle,
  Upload
} from "lucide-react";
import { Link } from 'react-router-dom'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const Dashboard = () => {
  const { user } = useAuth()
  const [dashboardData, setDashboardData] = useState({
    inventory: {
      totalProducts: 0,
      totalLocations: 0,
      lowStockItems: [],
      recentMovements: [],
      stockValue: 0,
    },
    manufacturing: {
      activeBOMs: 0,
      pendingAssemblyOrders: 0,
      completedAssemblyOrders: 0,
      recentAssemblyOrders: [],
    },
    alerts: [],
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Token ${token}`,
      };

      // Fetch inventory data
      const [productsRes, locationsRes, stockRes, movementsRes, bomsRes, assemblyOrdersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/inventory/products/`, { headers }),
        fetch(`${API_BASE_URL}/inventory/locations/`, { headers }),
        fetch(`${API_BASE_URL}/inventory/stock/`, { headers }),
        fetch(`${API_BASE_URL}/inventory/stock-movements/?limit=10`, { headers }),
        fetch(`${API_BASE_URL}/inventory/boms/`, { headers }),
        fetch(`${API_BASE_URL}/inventory/assembly-orders/`, { headers }),
      ]);

      const [products, locations, stock, movements, boms, assemblyOrders] = await Promise.all([
        productsRes.ok ? productsRes.json() : { results: [] },
        locationsRes.ok ? locationsRes.json() : { results: [] },
        stockRes.ok ? stockRes.json() : { results: [] },
        movementsRes.ok ? movementsRes.json() : { results: [] },
        bomsRes.ok ? bomsRes.json() : { results: [] },
        assemblyOrdersRes.ok ? assemblyOrdersRes.json() : { results: [] },
      ]);

      // Process data
      const productsList = products.results || products;
      const locationsList = locations.results || locations;
      const stockList = stock.results || stock;
      const movementsList = movements.results || movements;
      const bomsList = boms.results || boms;
      const assemblyOrdersList = assemblyOrders.results || assemblyOrders;

      // Calculate low stock items
      const lowStockItems = stockList.filter(item => 
        item.quantity_on_hand <= item.reorder_point && item.reorder_point > 0
      ).slice(0, 10);

      // Calculate stock value
      const stockValue = stockList.reduce((total, item) => 
        total + (item.quantity_on_hand * item.average_cost), 0
      );

      // Filter assembly orders by status
      const pendingAssemblyOrders = assemblyOrdersList.filter(order => order.status === 'PENDING');
      const completedAssemblyOrders = assemblyOrdersList.filter(order => order.status === 'COMPLETED');
      const recentAssemblyOrders = assemblyOrdersList.slice(0, 5);

      // Generate alerts
      const alerts = [];
      
      // Low stock alerts
      lowStockItems.forEach(item => {
        alerts.push({
          id: `low-stock-${item.id}`,
          type: 'warning',
          title: 'Low Stock Alert',
          message: `${item.product_name || item.product?.name} at ${item.location_name || item.location?.name} is below reorder point`,
          timestamp: new Date().toISOString(),
        });
      });

      // Pending assembly orders alerts
      if (pendingAssemblyOrders.length > 0) {
        alerts.push({
          id: 'pending-assembly-orders',
          type: 'info',
          title: 'Pending Assembly Orders',
          message: `${pendingAssemblyOrders.length} assembly orders are pending`,
          timestamp: new Date().toISOString(),
        });
      }

      setDashboardData({
        inventory: {
          totalProducts: productsList.length,
          totalLocations: locationsList.length,
          lowStockItems,
          recentMovements: movementsList.slice(0, 10),
          stockValue,
        },
        manufacturing: {
          activeBOMs: bomsList.filter(bom => bom.status === 'ACTIVE').length,
          pendingAssemblyOrders: pendingAssemblyOrders.length,
          completedAssemblyOrders: completedAssemblyOrders.length,
          recentAssemblyOrders,
        },
        alerts: alerts.slice(0, 10),
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const formatRupiah = (amount, withDecimal = true) => {
    if (amount === null || amount === undefined || amount === '') {
      return withDecimal ? 'Rp 0,00' : 'Rp 0';
    }
    const number = parseFloat(amount) || 0;

    const options = {
      style: 'currency',
      currency: 'IDR',
      // Jika withDecimal true, set minimum dan maximum fraction digits ke 2.
      // Jika false, set ke 0.
      minimumFractionDigits: withDecimal ? 2 : 0,
      maximumFractionDigits: withDecimal ? 2 : 0,
    };

    // Langkah 4: Gunakan Intl.NumberFormat untuk membuat string yang diformat
    return new Intl.NumberFormat('id-ID', options).format(number);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'info':
        return <Activity className="h-4 w-4 text-blue-500" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back, {user?.first_name || user?.username}! Here's what's happening with your ERP system today.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Activity className="h-4 w-4" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.inventory.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Active inventory items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.inventory.totalLocations}</div>
            <p className="text-xs text-muted-foreground">
              Storage locations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRupiah(dashboardData.inventory.stockValue)}</div>
            <p className="text-xs text-muted-foreground">
              Total inventory value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active BOMs</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.manufacturing.activeBOMs}</div>
            <p className="text-xs text-muted-foreground">
              Manufacturing recipes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Manufacturing Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{dashboardData.manufacturing.pendingAssemblyOrders}</div>
            <p className="text-xs text-muted-foreground">
              Assembly orders awaiting processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dashboardData.manufacturing.completedAssemblyOrders}</div>
            <p className="text-xs text-muted-foreground">
              Successfully completed assemblies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{dashboardData.inventory.lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground">
              Items below reorder point
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>System Alerts</span>
            </CardTitle>
            <CardDescription>Recent alerts and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.alerts.length > 0 ? (
                dashboardData.alerts.map(alert => (
                  <div key={alert.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <div className="font-medium text-sm">{alert.title}</div>
                      <div className="text-sm text-gray-600">{alert.message}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDate(alert.timestamp)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>No alerts at this time</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Low Stock Items</span>
              </div>
              <Link to="/inventory/stock">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </CardTitle>
            <CardDescription>Items that need restocking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.inventory.lowStockItems.length > 0 ? (
                dashboardData.inventory.lowStockItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.product_name || item.product?.name}</div>
                      <div className="text-sm text-gray-600">{item.location_name || item.location?.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-red-600">
                        {item.quantity_on_hand} / {item.reorder_point}
                      </div>
                      <div className="text-xs text-gray-500">On Hand / Reorder Point</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>All items are adequately stocked</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Stock Movements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Recent Stock Movements</span>
              </div>
              <Link to="/inventory/stock-movements">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </CardTitle>
            <CardDescription>Latest inventory transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.inventory.recentMovements.length > 0 ? (
                dashboardData.inventory.recentMovements.map(movement => (
                  <div key={movement.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{movement.product_name || movement.product?.name}</div>
                      <div className="text-sm text-gray-600">
                        {movement.movement_type.replace('_', ' ')} at {movement.location_name || movement.location?.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(movement.movement_date)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-2" />
                  <p>No recent movements</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Assembly Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Factory className="h-5 w-5" />
                <span>Recent Assembly Orders</span>
              </div>
              <Link to="/manufacturing/assembly-orders">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </CardTitle>
            <CardDescription>Latest manufacturing activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.manufacturing.recentAssemblyOrders.length > 0 ? (
                dashboardData.manufacturing.recentAssemblyOrders.map(order => (
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">AO-{order.order_number}</div>
                      <div className="text-sm text-gray-600">
                        {order.product_name || order.product?.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        className={
                          order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          order.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }
                      >
                        {order.status}
                      </Badge>
                      <div className="text-xs text-gray-500 mt-1">
                        Qty: {order.quantity_to_produce}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Factory className="h-12 w-12 mx-auto mb-2" />
                  <p>No recent assembly orders</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/inventory/products">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                <Package className="h-6 w-6" />
                <span className="text-sm">Add Product</span>
              </Button>
            </Link>
            <Link to="/inventory/stock">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                <TrendingUp className="h-6 w-6" />
                <span className="text-sm">Stock Movement</span>
              </Button>
            </Link>
            <Link to="/manufacturing/assembly-orders">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                <Factory className="h-6 w-6" />
                <span className="text-sm">New Assembly</span>
              </Button>
            </Link>
            <Link to="/data-import">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                <Upload className="h-6 w-6" />
                <span className="text-sm">Import Data</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Role-specific Information */}
      {user?.role === 'ADMIN' && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
              Administrator Dashboard
            </CardTitle>
            <CardDescription>System administration and management tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <h3 className="font-semibold">System Reports</h3>
                <p className="text-sm text-muted-foreground">View detailed analytics</p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Users className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <h3 className="font-semibold">User Management</h3>
                <p className="text-sm text-muted-foreground">Manage user accounts</p>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Activity className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                <h3 className="font-semibold">Audit Logs</h3>
                <p className="text-sm text-muted-foreground">Review system activity</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;

