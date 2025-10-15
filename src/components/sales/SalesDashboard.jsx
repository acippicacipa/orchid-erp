import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, ShoppingCart, FileText, 
  DollarSign, Package, AlertTriangle, Calendar, Target 
} from 'lucide-react';

const SalesDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    totalCustomers: 0,
    totalOrders: 0,
    totalInvoices: 0,
    totalSales: 0,
    ordersThisMonth: 0,
    salesThisMonth: 0,
    pendingOrders: 0,
    overdueInvoices: 0
  });
  const [loading, setLoading] = useState(true);
  const [salesTrend, setSalesTrend] = useState([]);
  const [orderStatus, setOrderStatus] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch sales order stats
      const salesOrderResponse = await fetch('http://localhost:8000/api/sales/sales-orders/dashboard_stats/', {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Fetch invoice stats
      const invoiceResponse = await fetch('http://localhost:8000/api/sales/invoices/dashboard_stats/', {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Fetch customers
      const customerResponse = await fetch('http://localhost:8000/api/sales/customers/', {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Fetch sales orders for analysis
      const ordersResponse = await fetch('http://localhost:8000/api/sales/sales-orders/', {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (salesOrderResponse.ok && invoiceResponse.ok && customerResponse.ok && ordersResponse.ok) {
        const salesOrderStats = await salesOrderResponse.json();
        const invoiceStats = await invoiceResponse.json();
        const customers = await customerResponse.json();
        const orders = await ordersResponse.json();

        setDashboardData({
          totalCustomers: customers.length,
          totalOrders: salesOrderStats.total_orders || 0,
          totalInvoices: invoiceStats.total_invoices || 0,
          totalSales: salesOrderStats.total_sales_amount || 0,
          ordersThisMonth: salesOrderStats.orders_this_month || 0,
          salesThisMonth: salesOrderStats.sales_this_month || 0,
          pendingOrders: salesOrderStats.pending_orders || 0,
          overdueInvoices: invoiceStats.overdue_invoices || 0
        });

        // Process data for charts
        processSalesTrend(orders);
        processOrderStatus(orders);
        processTopCustomers(orders);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processSalesTrend = (orders) => {
    const last6Months = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
      
      const monthOrders = orders.filter(order => {
        const orderDate = new Date(order.order_date);
        return orderDate.getMonth() === date.getMonth() && 
               orderDate.getFullYear() === date.getFullYear();
      });

      const totalSales = monthOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      
      last6Months.push({
        month: monthName,
        sales: totalSales,
        orders: monthOrders.length
      });
    }
    
    setSalesTrend(last6Months);
  };

  const processOrderStatus = (orders) => {
    const statusCount = {};
    orders.forEach(order => {
      statusCount[order.status] = (statusCount[order.status] || 0) + 1;
    });

    const statusData = Object.entries(statusCount).map(([status, count]) => ({
      name: status,
      value: count
    }));

    setOrderStatus(statusData);
  };

  const processTopCustomers = (orders) => {
    const customerSales = {};
    
    orders.forEach(order => {
      const customerName = order.customer_name || 'Unknown';
      if (!customerSales[customerName]) {
        customerSales[customerName] = {
          name: customerName,
          totalSales: 0,
          orderCount: 0
        };
      }
      customerSales[customerName].totalSales += order.total_amount || 0;
      customerSales[customerName].orderCount += 1;
    });

    const topCustomersData = Object.values(customerSales)
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 5);

    setTopCustomers(topCustomersData);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, color = "blue" }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
              <div className={`flex items-center mt-1 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {trend === 'up' ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                {trendValue}
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full bg-${color}-100`}>
            <Icon className={`h-6 w-6 text-${color}-600`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Sales Dashboard</h1>
        <div className="text-center py-8">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Sales Dashboard</h1>
        <Badge variant="outline" className="text-sm">
          <Calendar className="h-4 w-4 mr-1" />
          {new Date().toLocaleDateString('id-ID', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Customers"
          value={formatNumber(dashboardData.totalCustomers)}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Total Sales Orders"
          value={formatNumber(dashboardData.totalOrders)}
          icon={ShoppingCart}
          color="green"
        />
        <StatCard
          title="Total Invoices"
          value={formatNumber(dashboardData.totalInvoices)}
          icon={FileText}
          color="purple"
        />
        <StatCard
          title="Total Sales"
          value={formatCurrency(dashboardData.totalSales)}
          icon={DollarSign}
          color="yellow"
        />
      </div>

      {/* Monthly Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Orders This Month"
          value={formatNumber(dashboardData.ordersThisMonth)}
          icon={Package}
          color="indigo"
        />
        <StatCard
          title="Sales This Month"
          value={formatCurrency(dashboardData.salesThisMonth)}
          icon={Target}
          color="green"
        />
        <StatCard
          title="Pending Orders"
          value={formatNumber(dashboardData.pendingOrders)}
          icon={AlertTriangle}
          color="orange"
        />
        <StatCard
          title="Overdue Invoices"
          value={formatNumber(dashboardData.overdueInvoices)}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'sales' ? formatCurrency(value) : value,
                    name === 'sales' ? 'Sales' : 'Orders'
                  ]}
                />
                <Legend />
                <Bar dataKey="sales" fill="#8884d8" name="Sales" />
                <Line type="monotone" dataKey="orders" stroke="#82ca9d" name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={orderStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {orderStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Customers by Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topCustomers} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
              <YAxis dataKey="name" type="category" width={150} />
              <Tooltip 
                formatter={(value) => [formatCurrency(value), 'Total Sales']}
                labelFormatter={(label) => `Customer: ${label}`}
              />
              <Bar dataKey="totalSales" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center space-x-3">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="font-medium">Manage Customers</h3>
                  <p className="text-sm text-gray-600">Add or edit customer information</p>
                </div>
              </div>
            </div>
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center space-x-3">
                <ShoppingCart className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="font-medium">Create Sales Order</h3>
                  <p className="text-sm text-gray-600">Start a new sales order</p>
                </div>
              </div>
            </div>
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-purple-600" />
                <div>
                  <h3 className="font-medium">Generate Invoice</h3>
                  <p className="text-sm text-gray-600">Create new invoice</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesDashboard;
