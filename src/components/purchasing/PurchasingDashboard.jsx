import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const PurchasingDashboard = () => {
  const { apiCall } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState({
    summary: {
      totalSuppliers: 0,
      activePurchaseOrders: 0,
      pendingBills: 0,
      totalSpent: 0
    },
    purchaseOrdersByStatus: [],
    billsByStatus: [],
    topSuppliers: [],
    monthlySpending: [],
    recentActivity: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all required data
      const [
        suppliersResponse,
        purchaseOrdersResponse,
        billsResponse,
        paymentsResponse
      ] = await Promise.all([
        apiCall('/api/purchasing/suppliers/'),
        apiCall('/api/purchasing/purchase-orders/'),
        apiCall('/api/purchasing/bills/'),
        apiCall('/api/purchasing/supplier-payments/')
      ]);

      const suppliers = suppliersResponse.results || suppliersResponse;
      const purchaseOrders = purchaseOrdersResponse.results || purchaseOrdersResponse;
      const bills = billsResponse.results || billsResponse;
      const payments = paymentsResponse.results || paymentsResponse;

      // Calculate summary statistics
      const totalSuppliers = suppliers.length;
      const activePurchaseOrders = purchaseOrders.filter(po => 
        ['DRAFT', 'PENDING', 'CONFIRMED'].includes(po.status)
      ).length;
      const pendingBills = bills.filter(bill => 
        ['DRAFT', 'PENDING'].includes(bill.status)
      ).length;
      const totalSpent = bills.reduce((sum, bill) => sum + parseFloat(bill.amount_paid || 0), 0);

      // Purchase orders by status
      const poStatusCounts = purchaseOrders.reduce((acc, po) => {
        acc[po.status] = (acc[po.status] || 0) + 1;
        return acc;
      }, {});
      
      const purchaseOrdersByStatus = Object.entries(poStatusCounts).map(([status, count]) => ({
        status,
        count,
        name: status.charAt(0) + status.slice(1).toLowerCase()
      }));

      // Bills by status
      const billStatusCounts = bills.reduce((acc, bill) => {
        acc[bill.status] = (acc[bill.status] || 0) + 1;
        return acc;
      }, {});
      
      const billsByStatus = Object.entries(billStatusCounts).map(([status, count]) => ({
        status,
        count,
        name: status.charAt(0) + status.slice(1).toLowerCase()
      }));

      // Top suppliers by spending
      const supplierSpending = bills.reduce((acc, bill) => {
        const supplierName = bill.supplier_name;
        acc[supplierName] = (acc[supplierName] || 0) + parseFloat(bill.total_amount || 0);
        return acc;
      }, {});

      const topSuppliers = Object.entries(supplierSpending)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      // Monthly spending (last 6 months)
      const monthlySpending = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        const monthSpending = bills
          .filter(bill => {
            const billDate = new Date(bill.bill_date);
            return billDate.getMonth() === date.getMonth() && 
                   billDate.getFullYear() === date.getFullYear();
          })
          .reduce((sum, bill) => sum + parseFloat(bill.total_amount || 0), 0);
        
        monthlySpending.push({
          month: monthName,
          amount: monthSpending
        });
      }

      // Recent activity
      const recentPOs = purchaseOrders
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 3)
        .map(po => ({
          type: 'Purchase Order',
          description: `PO ${po.order_number} - ${po.supplier_name}`,
          amount: parseFloat(po.total_amount),
          date: po.created_at,
          status: po.status
        }));

      const recentBills = bills
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 3)
        .map(bill => ({
          type: 'Bill',
          description: `Bill ${bill.bill_number} - ${bill.supplier_name}`,
          amount: parseFloat(bill.total_amount),
          date: bill.created_at,
          status: bill.status
        }));

      const recentActivity = [...recentPOs, ...recentBills]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

      setDashboardData({
        summary: {
          totalSuppliers,
          activePurchaseOrders,
          pendingBills,
          totalSpent
        },
        purchaseOrdersByStatus,
        billsByStatus,
        topSuppliers,
        monthlySpending,
        recentActivity
      });

      setError('');
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status) => {
    const colors = {
      'DRAFT': 'text-gray-600 bg-gray-100',
      'PENDING': 'text-yellow-600 bg-yellow-100',
      'CONFIRMED': 'text-blue-600 bg-blue-100',
      'RECEIVED': 'text-green-600 bg-green-100',
      'PAID': 'text-green-600 bg-green-100',
      'CANCELLED': 'text-red-600 bg-red-100',
      'OVERDUE': 'text-red-600 bg-red-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Purchasing Dashboard</h1>
        <button
          onClick={fetchDashboardData}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Refresh Data
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Suppliers</p>
              <p className="text-2xl font-semibold text-gray-900">{dashboardData.summary.totalSuppliers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Purchase Orders</p>
              <p className="text-2xl font-semibold text-gray-900">{dashboardData.summary.activePurchaseOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Bills</p>
              <p className="text-2xl font-semibold text-gray-900">{dashboardData.summary.pendingBills}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Spent</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(dashboardData.summary.totalSpent)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Purchase Orders by Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Purchase Orders by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dashboardData.purchaseOrdersByStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, count }) => `${name}: ${count}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {dashboardData.purchaseOrdersByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bills by Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bills by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardData.billsByStatus}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Suppliers and Monthly Spending */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Suppliers */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Suppliers by Spending</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardData.topSuppliers} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="amount" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Spending Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Spending Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dashboardData.monthlySpending}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dashboardData.recentActivity.map((activity, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {activity.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {activity.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(activity.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(activity.status)}`}>
                      {activity.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(activity.date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {dashboardData.recentActivity.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No recent activity found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchasingDashboard;
