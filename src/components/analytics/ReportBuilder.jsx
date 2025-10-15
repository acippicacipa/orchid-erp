import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, Minus, Play, Save, Download, Eye, Settings, Database, 
  Table, BarChart3, PieChart, LineChart, Filter, SortAsc, SortDesc,
  Columns, Rows, Target, Calendar, Hash, Type, DollarSign
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Cell
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';

const ReportBuilder = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [filters, setFilters] = useState([]);
  const [grouping, setGrouping] = useState([]);
  const [sorting, setSorting] = useState([]);
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [outputFormat, setOutputFormat] = useState('JSON');
  const [chartConfig, setChartConfig] = useState({
    type: 'bar',
    xAxis: '',
    yAxis: '',
    title: ''
  });
  const [reportResults, setReportResults] = useState(null);
  const [previewMode, setPreviewMode] = useState('table');

  useEffect(() => {
    fetchAvailableTables();
  }, []);

  const fetchAvailableTables = async () => {
    try {
      const response = await fetch('/api/analytics/report-builder/tables/', {
        headers: { 'Authorization': `Token ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableTables(data);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  };

  const handleTableSelection = (tableName) => {
    if (selectedTables.includes(tableName)) {
      setSelectedTables(selectedTables.filter(t => t !== tableName));
      // Remove fields from this table
      setSelectedFields(selectedFields.filter(f => !f.startsWith(tableName)));
    } else {
      setSelectedTables([...selectedTables, tableName]);
    }
  };

  const handleFieldSelection = (field) => {
    const fieldKey = `${field.table}.${field.name}`;
    if (selectedFields.some(f => f.key === fieldKey)) {
      setSelectedFields(selectedFields.filter(f => f.key !== fieldKey));
    } else {
      setSelectedFields([...selectedFields, { ...field, key: fieldKey }]);
    }
  };

  const addFilter = () => {
    setFilters([...filters, {
      id: Date.now(),
      field: '',
      operator: 'eq',
      value: '',
      type: 'string'
    }]);
  };

  const updateFilter = (id, updates) => {
    setFilters(filters.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeFilter = (id) => {
    setFilters(filters.filter(f => f.id !== id));
  };

  const addSorting = () => {
    setSorting([...sorting, {
      id: Date.now(),
      field: '',
      direction: 'ASC'
    }]);
  };

  const updateSorting = (id, updates) => {
    setSorting(sorting.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeSorting = (id) => {
    setSorting(sorting.filter(s => s.id !== id));
  };

  const buildReport = async () => {
    if (!reportName || selectedTables.length === 0 || selectedFields.length === 0) {
      alert('Please provide report name, select tables, and choose fields');
      return;
    }

    setLoading(true);

    try {
      const reportData = {
        name: reportName,
        description: reportDescription,
        tables: selectedTables,
        fields: selectedFields.map(f => f.key),
        filters: filters.reduce((acc, filter) => {
          if (filter.field && filter.value) {
            acc[filter.field] = {
              operator: filter.operator,
              value: filter.value
            };
          }
          return acc;
        }, {}),
        grouping: grouping,
        sorting: sorting.map(s => ({
          field: s.field,
          direction: s.direction
        })),
        output_format: outputFormat,
        chart_config: chartConfig
      };

      const response = await fetch('/api/analytics/report-builder/build/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportData)
      });

      if (response.ok) {
        const result = await response.json();
        setReportResults(result);
      } else {
        const error = await response.json();
        alert(`Error building report: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error building report:', error);
      alert('Error building report');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format) => {
    if (!reportResults) return;

    try {
      const reportData = {
        name: reportName,
        description: reportDescription,
        tables: selectedTables,
        fields: selectedFields.map(f => f.key),
        filters: filters.reduce((acc, filter) => {
          if (filter.field && filter.value) {
            acc[filter.field] = {
              operator: filter.operator,
              value: filter.value
            };
          }
          return acc;
        }, {}),
        grouping: grouping,
        sorting: sorting.map(s => ({
          field: s.field,
          direction: s.direction
        })),
        output_format: format
      };

      const response = await fetch('/api/analytics/report-builder/build/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportData)
      });

      if (response.ok && format === 'CSV') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportName.replace(/\s+/g, '_')}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  const getFieldIcon = (type) => {
    switch (type) {
      case 'string':
        return <Type className="h-4 w-4" />;
      case 'number':
      case 'decimal':
        return <Hash className="h-4 w-4" />;
      case 'date':
      case 'datetime':
        return <Calendar className="h-4 w-4" />;
      case 'boolean':
        return <Target className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  const renderChart = () => {
    if (!reportResults || !reportResults.results || reportResults.results.length === 0) {
      return <div className="text-center text-gray-500 py-8">No data to display</div>;
    }

    const data = reportResults.results;
    const { type, xAxis, yAxis } = chartConfig;

    if (!xAxis || !yAxis) {
      return <div className="text-center text-gray-500 py-8">Please configure chart axes</div>;
    }

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={yAxis} fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsLineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={yAxis} stroke="#3B82F6" strokeWidth={2} />
            </RechartsLineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsPieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey={yAxis}
                nameKey={xAxis}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        );

      default:
        return <div className="text-center text-gray-500 py-8">Unsupported chart type</div>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Report Builder</h1>
          <p className="text-gray-600">Create custom reports with drag-and-drop interface</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={buildReport} disabled={loading}>
            <Play className="h-4 w-4 mr-2" />
            {loading ? 'Building...' : 'Build Report'}
          </Button>
          
          {reportResults && (
            <>
              <Button onClick={() => exportReport('CSV')} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={() => exportReport('JSON')} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Configuration */}
        <div className="lg:col-span-1 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Report Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="reportName">Report Name *</Label>
                <Input
                  id="reportName"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="Enter report name"
                />
              </div>
              
              <div>
                <Label htmlFor="reportDescription">Description</Label>
                <Textarea
                  id="reportDescription"
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Enter report description"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="outputFormat">Output Format</Label>
                <Select value={outputFormat} onValueChange={setOutputFormat}>
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
            </CardContent>
          </Card>

          {/* Data Sources */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2" />
                Data Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {availableTables.map((table) => (
                  <div key={table.name} className="flex items-center space-x-2">
                    <Checkbox
                      id={table.name}
                      checked={selectedTables.includes(table.name)}
                      onCheckedChange={() => handleTableSelection(table.name)}
                    />
                    <Label htmlFor={table.name} className="flex-1">
                      <div className="font-medium">{table.label}</div>
                      <div className="text-sm text-gray-500">{table.description}</div>
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Fields Selection */}
          {selectedTables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Columns className="h-5 w-5 mr-2" />
                  Fields
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {availableTables
                    .filter(table => selectedTables.includes(table.name))
                    .map(table => (
                      <div key={table.name}>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">{table.label}</h4>
                        <div className="space-y-1">
                          {table.fields.map(field => (
                            <div key={field.name} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${table.name}.${field.name}`}
                                checked={selectedFields.some(f => f.key === `${table.name}.${field.name}`)}
                                onCheckedChange={() => handleFieldSelection(field)}
                              />
                              <Label htmlFor={`${table.name}.${field.name}`} className="flex items-center space-x-2 flex-1">
                                {getFieldIcon(field.type)}
                                <span className="text-sm">{field.label}</span>
                                <Badge variant="outline" className="text-xs">{field.type}</Badge>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Report Configuration Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="filters" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="filters">Filters</TabsTrigger>
              <TabsTrigger value="sorting">Sorting</TabsTrigger>
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="filters" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Filter className="h-5 w-5 mr-2" />
                      Filters
                    </span>
                    <Button onClick={addFilter} size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Filter
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filters.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      No filters configured. Click "Add Filter" to get started.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filters.map((filter) => (
                        <div key={filter.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                          <Select
                            value={filter.field}
                            onValueChange={(value) => updateFilter(filter.id, { field: value })}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedFields.map((field) => (
                                <SelectItem key={field.key} value={field.key}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Select
                            value={filter.operator}
                            onValueChange={(value) => updateFilter(filter.id, { operator: value })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="eq">Equals</SelectItem>
                              <SelectItem value="gt">Greater than</SelectItem>
                              <SelectItem value="lt">Less than</SelectItem>
                              <SelectItem value="contains">Contains</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Input
                            value={filter.value}
                            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                            placeholder="Filter value"
                            className="flex-1"
                          />
                          
                          <Button
                            onClick={() => removeFilter(filter.id)}
                            size="sm"
                            variant="outline"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sorting" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <SortAsc className="h-5 w-5 mr-2" />
                      Sorting
                    </span>
                    <Button onClick={addSorting} size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Sort
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sorting.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      No sorting configured. Click "Add Sort" to get started.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sorting.map((sort) => (
                        <div key={sort.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                          <Select
                            value={sort.field}
                            onValueChange={(value) => updateSorting(sort.id, { field: value })}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedFields.map((field) => (
                                <SelectItem key={field.key} value={field.key}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Select
                            value={sort.direction}
                            onValueChange={(value) => updateSorting(sort.id, { direction: value })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ASC">
                                <div className="flex items-center">
                                  <SortAsc className="h-4 w-4 mr-2" />
                                  Ascending
                                </div>
                              </SelectItem>
                              <SelectItem value="DESC">
                                <div className="flex items-center">
                                  <SortDesc className="h-4 w-4 mr-2" />
                                  Descending
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Button
                            onClick={() => removeSorting(sort.id)}
                            size="sm"
                            variant="outline"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="chart" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Chart Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Chart Type</Label>
                      <Select
                        value={chartConfig.type}
                        onValueChange={(value) => setChartConfig({ ...chartConfig, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bar">
                            <div className="flex items-center">
                              <BarChart3 className="h-4 w-4 mr-2" />
                              Bar Chart
                            </div>
                          </SelectItem>
                          <SelectItem value="line">
                            <div className="flex items-center">
                              <LineChart className="h-4 w-4 mr-2" />
                              Line Chart
                            </div>
                          </SelectItem>
                          <SelectItem value="pie">
                            <div className="flex items-center">
                              <PieChart className="h-4 w-4 mr-2" />
                              Pie Chart
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Chart Title</Label>
                      <Input
                        value={chartConfig.title}
                        onChange={(e) => setChartConfig({ ...chartConfig, title: e.target.value })}
                        placeholder="Enter chart title"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>X-Axis Field</Label>
                      <Select
                        value={chartConfig.xAxis}
                        onValueChange={(value) => setChartConfig({ ...chartConfig, xAxis: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select X-axis field" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedFields.map((field) => (
                            <SelectItem key={field.key} value={field.name}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Y-Axis Field</Label>
                      <Select
                        value={chartConfig.yAxis}
                        onValueChange={(value) => setChartConfig({ ...chartConfig, yAxis: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Y-axis field" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedFields
                            .filter(field => ['number', 'decimal'].includes(field.type))
                            .map((field) => (
                              <SelectItem key={field.key} value={field.name}>
                                {field.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              {reportResults ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Report Results</h3>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setPreviewMode('table')}
                        variant={previewMode === 'table' ? 'default' : 'outline'}
                        size="sm"
                      >
                        <Table className="h-4 w-4 mr-1" />
                        Table
                      </Button>
                      <Button
                        onClick={() => setPreviewMode('chart')}
                        variant={previewMode === 'chart' ? 'default' : 'outline'}
                        size="sm"
                      >
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Chart
                      </Button>
                    </div>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>{reportResults.name}</CardTitle>
                      {reportResults.description && (
                        <p className="text-gray-600">{reportResults.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Records: {reportResults.count}</span>
                        <span>Generated: {new Date().toLocaleString()}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {previewMode === 'table' ? (
                        <div className="overflow-x-auto">
                          {reportResults.results && reportResults.results.length > 0 ? (
                            <table className="w-full border-collapse border border-gray-300">
                              <thead>
                                <tr className="bg-gray-50">
                                  {Object.keys(reportResults.results[0]).map((key) => (
                                    <th key={key} className="border border-gray-300 px-4 py-2 text-left font-medium">
                                      {key}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {reportResults.results.slice(0, 100).map((row, index) => (
                                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    {Object.values(row).map((value, cellIndex) => (
                                      <td key={cellIndex} className="border border-gray-300 px-4 py-2">
                                        {value !== null && value !== undefined ? String(value) : '-'}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="text-center text-gray-500 py-8">No data available</div>
                          )}
                        </div>
                      ) : (
                        <div className="h-96">
                          {renderChart()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Generated</h3>
                    <p className="text-gray-600">
                      Configure your report settings and click "Build Report" to see the preview.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ReportBuilder;
