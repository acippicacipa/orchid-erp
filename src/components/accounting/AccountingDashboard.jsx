import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, TrendingDown, DollarSign, FileText, 
  BarChart3, PieChart, Calendar, AlertTriangle,
  CheckCircle, Clock, XCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, Area, AreaChart // <-- TAMBAHKAN 'Pie' DI SINI
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';

const AccountingDashboard = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    summary: {
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      netIncome: 0,
      cashBalance: 0,
      accountsReceivable: 0,
      accountsPayable: 0,
      totalRevenue: 0
    },
    recentEntries: [],
    monthlyRevenue: [],
    expenseBreakdown: [],
    cashFlow: [],
    accountBalances: [],
    pendingEntries: 0,
    overduePayables: 0,
    overdueReceivables: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch multiple endpoints concurrently
      const [
        balanceSheetResponse,
        incomeStatementResponse,
        journalEntriesResponse,
        accountsResponse
      ] = await Promise.all([
        fetch('/api/accounting/financial-reports/balance_sheet/', {
          headers: { 'Authorization': `Token ${token}` }
        }),
        fetch(`/api/accounting/financial-reports/income_statement/?start_date=${new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]}&end_date=${new Date().toISOString().split('T')[0]}`, {
          headers: { 'Authorization': `Token ${token}` }
        }),
        fetch('/api/accounting/journal-entries/?limit=10', {
          headers: { 'Authorization': `Token ${token}` }
        }),
        fetch('/api/accounting/accounts/?is_active=true', {
          headers: { 'Authorization': `Token ${token}` }
        })
      ]);

      const balanceSheet = balanceSheetResponse.ok ? await balanceSheetResponse.json() : null;
      const incomeStatement = incomeStatementResponse.ok ? await incomeStatementResponse.json() : null;
      const journalEntries = journalEntriesResponse.ok ? await journalEntriesResponse.json() : null;
      const accounts = accountsResponse.ok ? await accountsResponse.json() : null;

      // Process data for dashboard
      const summary = {
        totalAssets: balanceSheet?.total_assets || 0,
        totalLiabilities: balanceSheet?.total_liabilities || 0,
        totalEquity: balanceSheet?.total_equity || 0,
        netIncome: incomeStatement?.net_income || 0,
        totalRevenue: incomeStatement?.total_revenue || 0,
        cashBalance: getCashBalance(accounts),
        accountsReceivable: getAccountBalance(accounts, '1200'),
        accountsPayable: getAccountBalance(accounts, '2100')
      };

      // Generate mock data for charts (in real implementation, this would come from API)
      const monthlyRevenue = generateMonthlyRevenueData();
      const expenseBreakdown = generateExpenseBreakdownData(incomeStatement);
      const cashFlow = generateCashFlowData();
      const accountBalances = processAccountBalances(accounts);

      setDashboardData({
        summary,
        recentEntries: Array.isArray(journalEntries) ? journalEntries.slice(0, 10) : journalEntries?.results?.slice(0, 10) || [],
        monthlyRevenue,
        expenseBreakdown,
        cashFlow,
        accountBalances,
        pendingEntries: journalEntries?.results?.filter(entry => entry.status === 'DRAFT').length || 0,
        overduePayables: 0, // Would be calculated from actual data
        overdueReceivables: 0 // Would be calculated from actual data
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCashBalance = (accounts) => {
    if (!accounts) return 0;
    const accountList = Array.isArray(accounts) ? accounts : accounts.results || [];
    const cashAccounts = accountList.filter(acc => acc.cash_account || acc.bank_account);
    return cashAccounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
  };

  const getAccountBalance = (accounts, code) => {
    if (!accounts) return 0;
    const accountList = Array.isArray(accounts) ? accounts : accounts.results || [];
    const account = accountList.find(acc => acc.code === code);
    return account?.current_balance || 0;
  };

  const generateMonthlyRevenueData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month, index) => ({
      month,
      revenue: Math.floor(Math.random() * 50000000) + 10000000, // Random data for demo
      expenses: Math.floor(Math.random() * 30000000) + 5000000,
      profit: Math.floor(Math.random() * 20000000) + 2000000
    }));
  };

  const generateExpenseBreakdownData = (incomeStatement) => {
    if (!incomeStatement?.expense_accounts) {
      return [
        { name: 'Cost of Goods Sold', value: 25000000, color: '#8884d8' },
        { name: 'Operating Expenses', value: 15000000, color: '#82ca9d' },
        { name: 'Administrative', value: 8000000, color: '#ffc658' },
        { name: 'Marketing', value: 5000000, color: '#ff7c7c' },
        { name: 'Other', value: 3000000, color: '#8dd1e1' }
      ];
    }
    
    return incomeStatement.expense_accounts.map((expense, index) => ({
      name: expense.account_name,
      value: expense.amount,
      color: ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'][index % 5]
    }));
  };

  const generateCashFlowData = () => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });
    
    return days.map(date => ({
      date,
      inflow: Math.floor(Math.random() * 5000000) + 1000000,
      outflow: Math.floor(Math.random() * 4000000) + 800000,
      net: Math.floor(Math.random() * 2000000) - 1000000
    }));
  };

  const processAccountBalances = (accounts) => {
    if (!accounts) return [];
    const accountList = Array.isArray(accounts) ? accounts : accounts.results || [];
    
    return accountList
      .filter(acc => Math.abs(acc.current_balance || 0) > 1000000) // Only show significant balances
      .sort((a, b) => Math.abs(b.current_balance) - Math.abs(a.current_balance))
      .slice(0, 10)
      .map(acc => ({
        name: acc.name,
        code: acc.code,
        balance: acc.current_balance || 0,
        type: acc.account_category
      }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  const getStatusColor = (status) => {
    const colors = {
      'DRAFT': 'bg-yellow-100 text-yellow-800',
      'POSTED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Accounting Dashboard</h1>
        <Button onClick={fetchDashboardData} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Assets</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardData.summary.totalAssets)}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Income</p>
                <p className={`text-2xl font-bold ${dashboardData.summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(dashboardData.summary.netIncome)}
                </p>
              </div>
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${dashboardData.summary.netIncome >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {dashboardData.summary.netIncome >= 0 ? 
                  <TrendingUp className="h-6 w-6 text-green-600" /> :
                  <TrendingDown className="h-6 w-6 text-red-600" />
                }
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cash Balance</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardData.summary.cashBalance)}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardData.summary.totalRevenue)}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(dashboardData.pendingEntries > 0 || dashboardData.overduePayables > 0 || dashboardData.overdueReceivables > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dashboardData.pendingEntries > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-yellow-600 mr-2" />
                  <div>
                    <p className="font-medium text-yellow-800">Pending Entries</p>
                    <p className="text-sm text-yellow-600">{dashboardData.pendingEntries} journal entries need posting</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
          <TabsTrigger value="expenses">Expense Analysis</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Account Balances */}
            <Card>
              <CardHeader>
                <CardTitle>Top Account Balances</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.accountBalances.map((account, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-sm text-gray-500">{account.code} - {account.type}</p>
                      </div>
                      <p className={`font-mono ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(account.balance)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Journal Entries */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Journal Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.recentEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{entry.entry_number}</p>
                        <p className="text-sm text-gray-500">{entry.description}</p>
                        <p className="text-xs text-gray-400">{formatDate(entry.entry_date)}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(entry.status)}>
                          {entry.status}
                        </Badge>
                        <p className="text-sm font-mono mt-1">{formatCurrency(entry.total_debit)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={dashboardData.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stackId="1" stroke="#8884d8" fill="#8884d8" />
                  <Area type="monotone" dataKey="profit" stackId="2" stroke="#82ca9d" fill="#82ca9d" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={dashboardData.expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {dashboardData.expenseBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Expenses vs Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dashboardData.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8884d8" />
                    <Bar dataKey="expenses" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Cash Flow (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={dashboardData.cashFlow}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                  <Tooltip 
                    labelFormatter={(value) => formatDate(value)}
                    formatter={(value) => formatCurrency(value)} 
                  />
                  <Legend />
                  <Line type="monotone" dataKey="inflow" stroke="#82ca9d" strokeWidth={2} />
                  <Line type="monotone" dataKey="outflow" stroke="#ff7c7c" strokeWidth={2} />
                  <Line type="monotone" dataKey="net" stroke="#8884d8" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountingDashboard;
