import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { 
  TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, 
  Users, AlertTriangle, CheckCircle, Clock, BarChart3, PieChart,
  LineChart, Activity, Target, Zap, RefreshCw, Download, Filter
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, PieChart as RechartsPieChart, Cell, Area, AreaChart, ComposedChart,
  RadialBarChart, RadialBar, ScatterChart, Scatter, FunnelChart, Funnel, LabelList
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';

const BusinessIntelligenceDashboard = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedModule, setSelectedModule] = useState('all');
  const [dashboardData, setDashboardData] = useState({
    kpis: [],
    sales_analytics: {},
    purchasing_analytics: {},
    inventory_analytics: {},
    financial_analytics: {},
    trends: [],
    alerts: [],
    performance_metrics: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod, selectedModule]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on selected period
      const endDate = new Date();
      const startDate = new Date();
      
      switch (selectedPeriod) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      });

      // Fetch analytics overview
      const overviewResponse = await fetch(`/api/analytics/overview/?${params}`, {
        headers: { 'Authorization': `Token ${token}` }
      });

      if (overviewResponse.ok) {
        const overviewData = await overviewResponse.json();
        
        // Fetch KPIs
        const kpisResponse = await fetch('/api/analytics/kpi-definitions/?active_only=true', {
          headers: { 'Authorization': `Token ${token}` }
        });
        
        const kpisData = kpisResponse.ok ? await kpisResponse.json() : [];
        
        // Fetch alerts
        const alertsResponse = await fetch('/api/analytics/alert-instances/?status=ACTIVE', {
          headers: { 'Authorization': `Token ${token}` }
        });
        
        const alertsData = alertsResponse.ok ? await alertsResponse.json() : [];

        // Process and enhance data
        const processedData = {
          ...overviewData,
          kpis: Array.isArray(kpisData) ? kpisData : kpisData.results || [],
          alerts: Array.isArray(alertsData) ? alertsData : alertsData.results || [],
          trends: generateTrendData(overviewData),
          performance_metrics: calculatePerformanceMetrics(overviewData)
        };

        setDashboardData(processedData);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const generateTrendData = (data) => {
    // Generate trend data for charts (in real implementation, this would come from API)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    
    return months.slice(0, currentMonth + 1).map((month, index) => ({
      month,
      sales: Math.floor(Math.random() * 100000000) + 50000000,
      purchases: Math.floor(Math.random() * 80000000) + 30000000,
      profit: Math.floor(Math.random() * 30000000) + 10000000,
      inventory_value: Math.floor(Math.random() * 200000000) + 100000000,
      cash_flow: Math.floor(Math.random() * 50000000) - 25000000,
    }));
  };

  const calculatePerformanceMetrics = (data) => {
    const sales = data.sales_analytics || {};
    const purchasing = data.purchasing_analytics || {};
    const financial = data.financial_analytics || {};
    
    return [
      {
        name: 'Revenue Growth',
        value: 15.2,
        unit: '%',
        trend: 'up',
        target: 12.0,
        status: 'excellent'
      },
      {
        name: 'Profit Margin',
        value: financial.profit_margin || 0,
        unit: '%',
        trend: 'up',
        target: 15.0,
        status: financial.profit_margin > 15 ? 'excellent' : 'good'
      },
      {
        name: 'Customer Acquisition',
        value: sales.new_customers || 0,
        unit: 'customers',
        trend: 'up',
        target: 50,
        status: sales.new_customers > 50 ? 'excellent' : 'good'
      },
      {
        name: 'Inventory Turnover',
        value: 8.5,
        unit: 'times/year',
        trend: 'stable',
        target: 10.0,
        status: 'good'
      }
    ];
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (number) => {
    return new Intl.NumberFormat('id-ID').format(number);
  };

  const getStatusColor = (status) => {
    const colors = {
      'excellent': 'text-green-600 bg-green-100',
      'good': 'text-blue-600 bg-blue-100',
      'warning': 'text-yellow-600 bg-yellow-100',
      'critical': 'text-red-600 bg-red-100',
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading business intelligence dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Business Intelligence Dashboard</h1>
          <p className="text-gray-600">Comprehensive analytics and performance insights</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedModule} onValueChange={setSelectedModule}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="purchasing">Purchasing</SelectItem>
              <SelectItem value="inventory">Inventory</SelectItem>
              <SelectItem value="financial">Financial</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={refreshData} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardData.performance_metrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.name}</p>
                  <p className="text-2xl font-bold">
                    {metric.value} {metric.unit}
                  </p>
                  <div className="flex items-center mt-2">
                    {getTrendIcon(metric.trend)}
                    <span className="text-sm text-gray-500 ml-1">
                      Target: {metric.target} {metric.unit}
                    </span>
                  </div>
                </div>
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${getStatusColor(metric.status)}`}>
                  <Target className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts Section */}
      {dashboardData.alerts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Active Alerts ({dashboardData.alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.alerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <p className="font-medium">{alert.rule_name}</p>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                  </div>
                  <Badge variant={alert.severity === 'CRITICAL' ? 'destructive' : 'secondary'}>
                    {alert.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue vs Expenses */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Expenses Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={dashboardData.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="sales" fill="#3B82F6" name="Sales Revenue" />
                    <Bar dataKey="purchases" fill="#EF4444" name="Purchases" />
                    <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={3} name="Profit" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Business Metrics Radial Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={dashboardData.performance_metrics}>
                    <RadialBar
                      minAngle={15}
                      label={{ position: 'insideStart', fill: '#fff' }}
                      background
                      clockWise
                      dataKey="value"
                      fill="#3B82F6"
                    />
                    <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
                    <Tooltip />
                  </RadialBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Module Performance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Sales Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Orders</span>
                    <span className="font-semibold">{formatNumber(dashboardData.sales_analytics.total_sales_orders || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Revenue</span>
                    <span className="font-semibold">{formatCurrency(dashboardData.sales_analytics.total_sales_value || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Order Value</span>
                    <span className="font-semibold">{formatCurrency(dashboardData.sales_analytics.average_order_value || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>New Customers</span>
                    <span className="font-semibold">{formatNumber(dashboardData.sales_analytics.new_customers || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Inventory Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Products</span>
                    <span className="font-semibold">{formatNumber(dashboardData.inventory_analytics.total_products || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inventory Value</span>
                    <span className="font-semibold">{formatCurrency(dashboardData.inventory_analytics.total_inventory_value || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Low Stock Items</span>
                    <span className="font-semibold text-yellow-600">{formatNumber(dashboardData.inventory_analytics.low_stock_products || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Out of Stock</span>
                    <span className="font-semibold text-red-600">{formatNumber(dashboardData.inventory_analytics.out_of_stock_products || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Financial Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Assets</span>
                    <span className="font-semibold">{formatCurrency(dashboardData.financial_analytics.total_assets || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Net Income</span>
                    <span className={`font-semibold ${(dashboardData.financial_analytics.net_income || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(dashboardData.financial_analytics.net_income || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cash Balance</span>
                    <span className="font-semibold">{formatCurrency(dashboardData.financial_analytics.total_cash || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Profit Margin</span>
                    <span className="font-semibold">{(dashboardData.financial_analytics.profit_margin || 0).toFixed(2)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sales Funnel Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <FunnelChart>
                    <Tooltip />
                    <Funnel
                      dataKey="value"
                      data={[
                        { name: 'Leads', value: 1000, fill: '#3B82F6' },
                        { name: 'Prospects', value: 800, fill: '#10B981' },
                        { name: 'Quotes', value: 600, fill: '#F59E0B' },
                        { name: 'Orders', value: 400, fill: '#EF4444' },
                        { name: 'Delivered', value: 350, fill: '#8B5CF6' },
                      ]}
                    >
                      <LabelList position="center" fill="#fff" stroke="none" />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Acquisition Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dashboardData.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="sales" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={dashboardData.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="cash_flow" stroke="#10B981" strokeWidth={3} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profitability Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dashboardData.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="profit" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Turnover</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={dashboardData.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="inventory_value" stroke="#F59E0B" strokeWidth={3} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Operational Efficiency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Order Processing Time</span>
                    <div className="flex items-center">
                      <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                      </div>
                      <span className="text-sm font-medium">85%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Inventory Accuracy</span>
                    <div className="flex items-center">
                      <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                      </div>
                      <span className="text-sm font-medium">92%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Supplier Performance</span>
                    <div className="flex items-center">
                      <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                        <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                      </div>
                      <span className="text-sm font-medium">78%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Comprehensive Business Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={dashboardData.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="sales" fill="#3B82F6" name="Sales" />
                  <Bar yAxisId="left" dataKey="purchases" fill="#EF4444" name="Purchases" />
                  <Line yAxisId="right" type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={3} name="Profit" />
                  <Line yAxisId="right" type="monotone" dataKey="cash_flow" stroke="#F59E0B" strokeWidth={2} name="Cash Flow" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BusinessIntelligenceDashboard;
