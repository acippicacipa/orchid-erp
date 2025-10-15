import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, Edit, Trash2, Target, TrendingUp, TrendingDown, Activity,
  AlertTriangle, CheckCircle, Clock, RefreshCw, Settings, BarChart3,
  LineChart, PieChart, Calendar, Hash, DollarSign, Percent
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, AreaChart, Area, ComposedChart
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';

const KPIManagement = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [kpiCategories, setKpiCategories] = useState([]);
  const [kpiDefinitions, setKpiDefinitions] = useState([]);
  const [selectedKPI, setSelectedKPI] = useState(null);
  const [kpiValues, setKpiValues] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    category: '',
    kpi_type: 'SALES',
    unit: '',
    target_value: '',
    frequency: 'MONTHLY',
    calculation_method: 'BUILTIN',
    calculation_formula: '',
    is_active: true,
    sort_order: 0
  });

  useEffect(() => {
    fetchKPICategories();
    fetchKPIDefinitions();
  }, []);

  useEffect(() => {
    if (selectedKPI) {
      fetchKPIValues(selectedKPI.id);
    }
  }, [selectedKPI]);

  const fetchKPICategories = async () => {
    try {
      const response = await fetch('/api/analytics/kpi-categories/', {
        headers: { 'Authorization': `Token ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setKpiCategories(Array.isArray(data) ? data : data.results || []);
      }
    } catch (error) {
      console.error('Error fetching KPI categories:', error);
    }
  };

  const fetchKPIDefinitions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics/kpi-definitions/', {
        headers: { 'Authorization': `Token ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const kpis = Array.isArray(data) ? data : data.results || [];
        setKpiDefinitions(kpis);
        
        if (kpis.length > 0 && !selectedKPI) {
          setSelectedKPI(kpis[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching KPI definitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchKPIValues = async (kpiId) => {
    try {
      const response = await fetch(`/api/analytics/kpi-values/?kpi=${kpiId}`, {
        headers: { 'Authorization': `Token ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setKpiValues(Array.isArray(data) ? data : data.results || []);
      }
    } catch (error) {
      console.error('Error fetching KPI values:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = formData.id 
        ? `/api/analytics/kpi-definitions/${formData.id}/`
        : '/api/analytics/kpi-definitions/';
      
      const method = formData.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchKPIDefinitions();
        setShowForm(false);
        resetForm();
      } else {
        const error = await response.json();
        alert(`Error saving KPI: ${JSON.stringify(error)}`);
      }
    } catch (error) {
      console.error('Error saving KPI:', error);
      alert('Error saving KPI');
    }
  };

  const handleEdit = (kpi) => {
    setFormData({
      id: kpi.id,
      name: kpi.name,
      code: kpi.code,
      description: kpi.description || '',
      category: kpi.category,
      kpi_type: kpi.kpi_type,
      unit: kpi.unit || '',
      target_value: kpi.target_value || '',
      frequency: kpi.frequency,
      calculation_method: kpi.calculation_method,
      calculation_formula: kpi.calculation_formula || '',
      is_active: kpi.is_active,
      sort_order: kpi.sort_order || 0
    });
    setShowForm(true);
  };

  const handleDelete = async (kpiId) => {
    if (!confirm('Are you sure you want to delete this KPI?')) return;

    try {
      const response = await fetch(`/api/analytics/kpi-definitions/${kpiId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` }
      });

      if (response.ok) {
        await fetchKPIDefinitions();
        if (selectedKPI && selectedKPI.id === kpiId) {
          setSelectedKPI(null);
        }
      }
    } catch (error) {
      console.error('Error deleting KPI:', error);
    }
  };

  const calculateKPI = async (kpiId) => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 1);

      const response = await fetch(`/api/analytics/kpi-definitions/${kpiId}/calculate/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`KPI calculated: ${result.formatted_value}`);
        if (selectedKPI && selectedKPI.id === kpiId) {
          await fetchKPIValues(kpiId);
        }
      }
    } catch (error) {
      console.error('Error calculating KPI:', error);
    }
  };

  const updateAllKPIs = async () => {
    try {
      const response = await fetch('/api/analytics/kpi-definitions/update_values/', {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` }
      });

      if (response.ok) {
        alert('All KPIs updated successfully');
        await fetchKPIDefinitions();
        if (selectedKPI) {
          await fetchKPIValues(selectedKPI.id);
        }
      }
    } catch (error) {
      console.error('Error updating KPIs:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      category: '',
      kpi_type: 'SALES',
      unit: '',
      target_value: '',
      frequency: 'MONTHLY',
      calculation_method: 'BUILTIN',
      calculation_formula: '',
      is_active: true,
      sort_order: 0
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'ABOVE_TARGET': 'text-green-600 bg-green-100',
      'ON_TARGET': 'text-blue-600 bg-blue-100',
      'BELOW_TARGET': 'text-yellow-600 bg-yellow-100',
      'CRITICAL': 'text-red-600 bg-red-100',
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const getTrendIcon = (values) => {
    if (values.length < 2) return <Activity className="h-4 w-4 text-gray-600" />;
    
    const latest = values[0].value;
    const previous = values[1].value;
    
    if (latest > previous) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (latest < previous) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    } else {
      return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatValue = (value, unit) => {
    if (unit === 'IDR') {
      return formatCurrency(value);
    } else if (unit === '%') {
      return `${value}%`;
    } else {
      return `${value} ${unit}`.trim();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading KPI management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">KPI Management</h1>
          <p className="text-gray-600">Manage and track key performance indicators</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={updateAllKPIs} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Update All KPIs
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add KPI
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KPI List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>KPI Definitions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {kpiDefinitions.map((kpi) => (
                  <div
                    key={kpi.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedKPI && selectedKPI.id === kpi.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedKPI(kpi)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{kpi.name}</h4>
                        <p className="text-sm text-gray-600">{kpi.code}</p>
                        <div className="flex items-center mt-2 space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {kpi.kpi_type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {kpi.frequency}
                          </Badge>
                          {!kpi.is_active && (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        {kpi.latest_value && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                {formatValue(kpi.latest_value.value, kpi.unit)}
                              </span>
                              <Badge className={`text-xs ${getStatusColor(kpi.latest_value.status)}`}>
                                {kpi.latest_value.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-center space-y-1">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(kpi);
                          }}
                          size="sm"
                          variant="outline"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            calculateKPI(kpi.id);
                          }}
                          size="sm"
                          variant="outline"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(kpi.id);
                          }}
                          size="sm"
                          variant="outline"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KPI Details and Chart */}
        <div className="lg:col-span-2">
          {selectedKPI ? (
            <div className="space-y-6">
              {/* KPI Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Target className="h-5 w-5 mr-2" />
                      {selectedKPI.name}
                    </span>
                    {selectedKPI.latest_value && getTrendIcon(kpiValues)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Current Value</p>
                      <p className="text-2xl font-bold">
                        {selectedKPI.latest_value 
                          ? formatValue(selectedKPI.latest_value.value, selectedKPI.unit)
                          : 'No data'
                        }
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Target</p>
                      <p className="text-2xl font-bold">
                        {selectedKPI.target_value 
                          ? formatValue(selectedKPI.target_value, selectedKPI.unit)
                          : 'Not set'
                        }
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Status</p>
                      {selectedKPI.latest_value ? (
                        <Badge className={`text-sm ${getStatusColor(selectedKPI.latest_value.status)}`}>
                          {selectedKPI.latest_value.status.replace('_', ' ')}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">No data</Badge>
                      )}
                    </div>
                  </div>
                  
                  {selectedKPI.description && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600">{selectedKPI.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* KPI Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  {kpiValues.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={kpiValues.slice().reverse()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="period_start" 
                          tickFormatter={(value) => new Date(value).toLocaleDateString()}
                        />
                        <YAxis />
                        <Tooltip 
                          labelFormatter={(value) => new Date(value).toLocaleDateString()}
                          formatter={(value) => [formatValue(value, selectedKPI.unit), 'Value']}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#3B82F6" 
                          strokeWidth={3}
                          name="Actual Value"
                        />
                        {selectedKPI.target_value && (
                          <Line 
                            type="monotone" 
                            dataKey={() => selectedKPI.target_value}
                            stroke="#EF4444" 
                            strokeDasharray="5 5"
                            name="Target"
                          />
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-gray-500 py-12">
                      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p>No historical data available</p>
                      <p className="text-sm">Calculate KPI values to see the trend</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* KPI Values History */}
              <Card>
                <CardHeader>
                  <CardTitle>Value History</CardTitle>
                </CardHeader>
                <CardContent>
                  {kpiValues.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-4 py-2 text-left">Period</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Value</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Target</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Variance</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {kpiValues.slice(0, 10).map((value, index) => (
                            <tr key={value.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="border border-gray-300 px-4 py-2">
                                {new Date(value.period_start).toLocaleDateString()} - {new Date(value.period_end).toLocaleDateString()}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 font-medium">
                                {formatValue(value.value, selectedKPI.unit)}
                              </td>
                              <td className="border border-gray-300 px-4 py-2">
                                {value.target_value ? formatValue(value.target_value, selectedKPI.unit) : '-'}
                              </td>
                              <td className="border border-gray-300 px-4 py-2">
                                {value.variance ? (
                                  <span className={value.variance >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {value.variance > 0 ? '+' : ''}{formatValue(value.variance, selectedKPI.unit)}
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="border border-gray-300 px-4 py-2">
                                <Badge className={`text-xs ${getStatusColor(value.status)}`}>
                                  {value.status.replace('_', ' ')}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p>No value history available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a KPI</h3>
                <p className="text-gray-600">
                  Choose a KPI from the list to view its details and performance trend.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* KPI Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {formData.id ? 'Edit KPI' : 'Add New KPI'}
              </h2>
              <Button onClick={() => setShowForm(false)} variant="outline" size="sm">
                ×
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {kpiCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="kpi_type">Type</Label>
                  <Select
                    value={formData.kpi_type}
                    onValueChange={(value) => setFormData({ ...formData, kpi_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SALES">Sales</SelectItem>
                      <SelectItem value="PURCHASING">Purchasing</SelectItem>
                      <SelectItem value="INVENTORY">Inventory</SelectItem>
                      <SelectItem value="FINANCIAL">Financial</SelectItem>
                      <SelectItem value="OPERATIONAL">Operational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="e.g., IDR, %, units"
                  />
                </div>
                <div>
                  <Label htmlFor="target_value">Target Value</Label>
                  <Input
                    id="target_value"
                    type="number"
                    step="0.01"
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                      <SelectItem value="YEARLY">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="calculation_method">Calculation Method</Label>
                <Select
                  value={formData.calculation_method}
                  onValueChange={(value) => setFormData({ ...formData, calculation_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUILTIN">Built-in</SelectItem>
                    <SelectItem value="CUSTOM">Custom SQL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.calculation_method === 'CUSTOM' && (
                <div>
                  <Label htmlFor="calculation_formula">Custom SQL Formula</Label>
                  <Textarea
                    id="calculation_formula"
                    value={formData.calculation_formula}
                    onChange={(e) => setFormData({ ...formData, calculation_formula: e.target.value })}
                    rows={4}
                    placeholder="SELECT COUNT(*) FROM sales_salesorder WHERE order_date BETWEEN '{start_date}' AND '{end_date}'"
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" onClick={() => setShowForm(false)} variant="outline">
                  Cancel
                </Button>
                <Button type="submit">
                  {formData.id ? 'Update' : 'Create'} KPI
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KPIManagement;
