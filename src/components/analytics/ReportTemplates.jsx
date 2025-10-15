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
  Plus, Edit, Trash2, Play, Download, Calendar, Clock, FileText,
  Settings, Eye, Copy, Share, Filter, Search, RefreshCw, CheckCircle,
  AlertCircle, XCircle, Loader, BarChart3, PieChart, LineChart, Table
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const ReportTemplates = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showExecutionForm, setShowExecutionForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'SALES',
    report_type: 'TABULAR',
    query: '',
    parameters: {},
    is_active: true,
    is_public: false,
    schedule_enabled: false,
    schedule_frequency: 'DAILY',
    schedule_time: '09:00',
    email_recipients: ''
  });
  const [executionParams, setExecutionParams] = useState({
    output_format: 'JSON',
    email_recipients: '',
    parameters: {}
  });

  useEffect(() => {
    fetchTemplates();
    fetchExecutions();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics/report-templates/', {
        headers: { 'Authorization': `Token ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(Array.isArray(data) ? data : data.results || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutions = async () => {
    try {
      const response = await fetch('/api/analytics/report-executions/', {
        headers: { 'Authorization': `Token ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setExecutions(Array.isArray(data) ? data : data.results || []);
      }
    } catch (error) {
      console.error('Error fetching executions:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = formData.id 
        ? `/api/analytics/report-templates/${formData.id}/`
        : '/api/analytics/report-templates/';
      
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
        await fetchTemplates();
        setShowForm(false);
        resetForm();
      } else {
        const error = await response.json();
        alert(`Error saving template: ${JSON.stringify(error)}`);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template');
    }
  };

  const handleEdit = (template) => {
    setFormData({
      id: template.id,
      name: template.name,
      description: template.description || '',
      category: template.category,
      report_type: template.report_type,
      query: template.query || '',
      parameters: template.parameters || {},
      is_active: template.is_active,
      is_public: template.is_public,
      schedule_enabled: template.schedule_enabled || false,
      schedule_frequency: template.schedule_frequency || 'DAILY',
      schedule_time: template.schedule_time || '09:00',
      email_recipients: template.email_recipients || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (templateId) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/analytics/report-templates/${templateId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` }
      });

      if (response.ok) {
        await fetchTemplates();
        if (selectedTemplate && selectedTemplate.id === templateId) {
          setSelectedTemplate(null);
        }
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const executeReport = async (template, params = {}) => {
    try {
      const response = await fetch(`/api/analytics/report-templates/${template.id}/execute/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parameters: params,
          output_format: executionParams.output_format,
          email_recipients: executionParams.email_recipients
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Report execution started. Execution ID: ${result.id}`);
        await fetchExecutions();
        setShowExecutionForm(false);
      } else {
        const error = await response.json();
        alert(`Error executing report: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error executing report:', error);
      alert('Error executing report');
    }
  };

  const downloadExecution = async (executionId) => {
    try {
      const response = await fetch(`/api/analytics/report-executions/${executionId}/download/`, {
        headers: { 'Authorization': `Token ${token}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${executionId}.${executionParams.output_format.toLowerCase()}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Error downloading report');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const duplicateTemplate = async (template) => {
    const duplicatedTemplate = {
      ...template,
      name: `${template.name} (Copy)`,
      id: undefined
    };
    
    setFormData(duplicatedTemplate);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'SALES',
      report_type: 'TABULAR',
      query: '',
      parameters: {},
      is_active: true,
      is_public: false,
      schedule_enabled: false,
      schedule_frequency: 'DAILY',
      schedule_time: '09:00',
      email_recipients: ''
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'RUNNING':
        return <Loader className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'COMPLETED': 'text-green-600 bg-green-100',
      'FAILED': 'text-red-600 bg-red-100',
      'RUNNING': 'text-blue-600 bg-blue-100',
      'PENDING': 'text-yellow-600 bg-yellow-100',
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const getReportTypeIcon = (type) => {
    switch (type) {
      case 'CHART':
        return <BarChart3 className="h-4 w-4" />;
      case 'DASHBOARD':
        return <PieChart className="h-4 w-4" />;
      default:
        return <Table className="h-4 w-4" />;
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || template.category === filterCategory;
    const matchesType = !filterType || template.report_type === filterType;
    
    return matchesSearch && matchesCategory && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading report templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Report Templates</h1>
          <p className="text-gray-600">Manage and execute report templates</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => fetchTemplates()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Template
          </Button>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="executions">Execution History</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search templates..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select 
                  value={filterCategory || 'all'} // Gunakan 'all' jika state kosong
                  onValueChange={(value) => setFilterCategory(value === 'all' ? '' : value)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="SALES">Sales</SelectItem>
                    <SelectItem value="PURCHASING">Purchasing</SelectItem>
                    <SelectItem value="INVENTORY">Inventory</SelectItem>
                    <SelectItem value="FINANCIAL">Financial</SelectItem>
                    <SelectItem value="OPERATIONAL">Operational</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select 
                  value={filterType || 'all'} // Gunakan 'all' jika state kosong
                  onValueChange={(value) => setFilterType(value === 'all' ? '' : value)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="TABULAR">Tabular</SelectItem>
                    <SelectItem value="CHART">Chart</SelectItem>
                    <SelectItem value="DASHBOARD">Dashboard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      {getReportTypeIcon(template.report_type)}
                      <span className="ml-2 truncate">{template.name}</span>
                    </span>
                    <div className="flex items-center space-x-1">
                      {template.schedule_enabled && (
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          Scheduled
                        </Badge>
                      )}
                      {!template.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {template.description || 'No description'}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {template.report_type}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500">
                        {template.executions_count || 0} runs
                      </div>
                    </div>
                    
                    {template.last_execution && (
                      <div className="text-xs text-gray-500">
                        Last run: {new Date(template.last_execution.created_at).toLocaleDateString()}
                        <Badge className={`ml-2 text-xs ${getStatusColor(template.last_execution.status)}`}>
                          {template.last_execution.status}
                        </Badge>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center pt-2">
                      <div className="flex space-x-1">
                        <Button
                          onClick={() => {
                            setSelectedTemplate(template);
                            setShowExecutionForm(true);
                          }}
                          size="sm"
                          variant="outline"
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={() => handleEdit(template)}
                          size="sm"
                          variant="outline"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={() => duplicateTemplate(template)}
                          size="sm"
                          variant="outline"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        onClick={() => handleDelete(template.id)}
                        size="sm"
                        variant="outline"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Found</h3>
                <p className="text-gray-600">
                  {searchTerm || filterCategory || filterType
                    ? 'No templates match your current filters.'
                    : 'Create your first report template to get started.'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="executions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Executions</CardTitle>
            </CardHeader>
            <CardContent>
              {executions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left">Template</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Started</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Duration</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Executed By</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {executions.slice(0, 20).map((execution, index) => (
                        <tr key={execution.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 px-4 py-2">
                            {execution.template_name}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            <div className="flex items-center">
                              {getStatusIcon(execution.status)}
                              <Badge className={`ml-2 text-xs ${getStatusColor(execution.status)}`}>
                                {execution.status}
                              </Badge>
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            {new Date(execution.created_at).toLocaleString()}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            {execution.duration_seconds 
                              ? `${execution.duration_seconds.toFixed(1)}s`
                              : '-'
                            }
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            {execution.executed_by_name || 'System'}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            {execution.status === 'COMPLETED' && (
                              <Button
                                onClick={() => downloadExecution(execution.id)}
                                size="sm"
                                variant="outline"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                            )}
                            {execution.error_message && (
                              <Button
                                onClick={() => alert(execution.error_message)}
                                size="sm"
                                variant="outline"
                              >
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Error
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p>No execution history available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {formData.id ? 'Edit Template' : 'Add New Template'}
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
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
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
                  <Label htmlFor="report_type">Report Type</Label>
                  <Select
                    value={formData.report_type}
                    onValueChange={(value) => setFormData({ ...formData, report_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TABULAR">Tabular</SelectItem>
                      <SelectItem value="CHART">Chart</SelectItem>
                      <SelectItem value="DASHBOARD">Dashboard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-4 pt-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_public"
                      checked={formData.is_public}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                    />
                    <Label htmlFor="is_public">Public</Label>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="query">SQL Query *</Label>
                <Textarea
                  id="query"
                  value={formData.query}
                  onChange={(e) => setFormData({ ...formData, query: e.target.value })}
                  rows={6}
                  placeholder="SELECT * FROM sales_salesorder WHERE order_date >= '2024-01-01'"
                  required
                />
              </div>

              {/* Scheduling Section */}
              <div className="border-t pt-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Switch
                    id="schedule_enabled"
                    checked={formData.schedule_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, schedule_enabled: checked })}
                  />
                  <Label htmlFor="schedule_enabled">Enable Scheduling</Label>
                </div>

                {formData.schedule_enabled && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="schedule_frequency">Frequency</Label>
                      <Select
                        value={formData.schedule_frequency}
                        onValueChange={(value) => setFormData({ ...formData, schedule_frequency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DAILY">Daily</SelectItem>
                          <SelectItem value="WEEKLY">Weekly</SelectItem>
                          <SelectItem value="MONTHLY">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="schedule_time">Time</Label>
                      <Input
                        id="schedule_time"
                        type="time"
                        value={formData.schedule_time}
                        onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email_recipients">Email Recipients</Label>
                      <Input
                        id="email_recipients"
                        value={formData.email_recipients}
                        onChange={(e) => setFormData({ ...formData, email_recipients: e.target.value })}
                        placeholder="email1@example.com, email2@example.com"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" onClick={() => setShowForm(false)} variant="outline">
                  Cancel
                </Button>
                <Button type="submit">
                  {formData.id ? 'Update' : 'Create'} Template
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Execution Form Modal */}
      {showExecutionForm && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Execute Report: {selectedTemplate.name}</h2>
              <Button onClick={() => setShowExecutionForm(false)} variant="outline" size="sm">
                ×
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="output_format">Output Format</Label>
                  <Select
                    value={executionParams.output_format}
                    onValueChange={(value) => setExecutionParams({ ...executionParams, output_format: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="JSON">JSON</SelectItem>
                      <SelectItem value="CSV">CSV</SelectItem>
                      <SelectItem value="EXCEL">Excel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="email_recipients">Email Recipients (Optional)</Label>
                  <Input
                    id="email_recipients"
                    value={executionParams.email_recipients}
                    onChange={(e) => setExecutionParams({ ...executionParams, email_recipients: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button onClick={() => setShowExecutionForm(false)} variant="outline">
                  Cancel
                </Button>
                <Button onClick={() => executeReport(selectedTemplate, executionParams.parameters)}>
                  <Play className="h-4 w-4 mr-2" />
                  Execute Report
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportTemplates;
