import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Eye,
  Trash2,
  FileSpreadsheet,
  Users,
  Package,
  ShoppingCart,
  CreditCard,
  Building,
  MapPin
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const StatusBadge = ({ status }) => {
  const statusConfig = {
    PENDING: { color: 'bg-gray-100 text-gray-800', icon: Clock },
    VALIDATING: { color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
    VALID: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    INVALID: { color: 'bg-red-100 text-red-800', icon: XCircle },
    IMPORTING: { color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
    COMPLETED: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    FAILED: { color: 'bg-red-100 text-red-800', icon: XCircle },
  }

  const config = statusConfig[status] || statusConfig.PENDING
  const Icon = config.icon

  return (
    <Badge variant="outline" className={`${config.color} border-0`}>
      <Icon className="w-3 h-3 mr-1" />
      {status}
    </Badge>
  )
}

const getTemplateIcon = (templateType) => {
  const iconMap = {
    'CUSTOMERS': Users,
    'SUPPLIERS': Building,
    'ITEMS': Package,
    'CATEGORIES': FileText,
    'LOCATIONS': MapPin,
    'INVENTORY': Package,
    'SALES_ORDERS': ShoppingCart,
    'INVOICES': FileText,
    'PAYMENTS': CreditCard,
    'PURCHASE_ORDERS': ShoppingCart,
    'BILLS': FileText,
    'SUPPLIER_PAYMENTS': CreditCard,
    'ACCOUNTS': FileSpreadsheet,
    'JOURNAL_ENTRIES': FileSpreadsheet,
    'USERS': Users,
  }
  return iconMap[templateType] || FileText
}

const ValidationErrorsDialog = ({ importId, errors, onClose }) => {
  return (
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Validation Errors</DialogTitle>
        <DialogDescription>
          Review and fix these errors in your Excel file before importing
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4">
        {errors.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No validation errors found</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Row</TableHead>
                <TableHead>Column</TableHead>
                <TableHead>Error Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errors.map((error, index) => (
                <TableRow key={index}>
                  <TableCell>{error.row_number}</TableCell>
                  <TableCell>{error.column_name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {error.error_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{error.error_message}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {error.raw_value || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </DialogContent>
  )
}

const ImportLogsDialog = ({ importId, logs, onClose }) => {
  return (
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Import Logs</DialogTitle>
        <DialogDescription>
          Detailed logs for this import operation
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4">
        {logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No logs available</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log, index) => (
              <div key={index} className={`p-3 rounded-lg border-l-4 ${
                log.level === 'ERROR' ? 'border-red-500 bg-red-50' :
                log.level === 'WARNING' ? 'border-yellow-500 bg-yellow-50' :
                'border-blue-500 bg-blue-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant={log.level === 'ERROR' ? 'destructive' : 'secondary'}>
                      {log.level}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-sm">{log.message}</p>
                {log.details && (
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DialogContent>
  )
}

const FileUploadArea = ({ onFileSelect, selectedTemplate, loading }) => {
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0])
    }
  }

  return (
    <div
      className={`
        border-2 border-dashed rounded-lg p-8 text-center transition-colors
        ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 dark:border-gray-600'}
        ${!selectedTemplate ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary hover:bg-primary/5'}
      `}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => selectedTemplate && !loading && fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileInput}
        className="hidden"
        disabled={!selectedTemplate || loading}
      />
      
      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <h3 className="text-lg font-semibold mb-2">
        {selectedTemplate ? 'Upload Excel or CSV File' : 'Select a Template First'}
      </h3>
      <p className="text-muted-foreground mb-4">
        {selectedTemplate 
          ? 'Drag and drop your file here, or click to browse'
          : 'Choose an import template to enable file upload'
        }
      </p>
      <p className="text-sm text-muted-foreground">
        Supported formats: .xlsx, .xls, .csv
      </p>
    </div>
  )
}

export default function DataImport() {
  const { apiCall } = useAuth()
  const { toast } = useToast()
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [importHistory, setImportHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [validationErrors, setValidationErrors] = useState([])
  const [importLogs, setImportLogs] = useState([])
  const [showErrorsDialog, setShowErrorsDialog] = useState(false)
  const [showLogsDialog, setShowLogsDialog] = useState(false)
  const [selectedImportId, setSelectedImportId] = useState(null)

  useEffect(() => {
    fetchTemplates()
    fetchImportHistory()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await apiCall('/data-import/templates/')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch templates",
        variant: "destructive",
      })
    }
  }

  const fetchImportHistory = async () => {
    try {
      const response = await apiCall('/data-import/history/')
      if (response.ok) {
        const data = await response.json()
        setImportHistory(data.imports || [])
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch import history",
        variant: "destructive",
      })
    }
  }

  const fetchValidationErrors = async (importId) => {
    try {
      const response = await apiCall(`/data-import/validate/?import_id=${importId}`)
      if (response.ok) {
        const data = await response.json()
        setValidationErrors(data.errors || [])
        setSelectedImportId(importId)
        setShowErrorsDialog(true)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch validation errors",
        variant: "destructive",
      })
    }
  }

  const fetchImportLogs = async (importId) => {
    try {
      const response = await apiCall(`/data-import/logs/?import_id=${importId}`)
      if (response.ok) {
        const data = await response.json()
        setImportLogs(data.logs || [])
        setSelectedImportId(importId)
        setShowLogsDialog(true)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch import logs",
        variant: "destructive",
      })
    }
  }

  const handleFileUpload = async (file) => {
    if (!selectedTemplate) {
      toast({
        title: "Error",
        description: "Please select a template first",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('template_id', selectedTemplate)

    try {
      const response = await apiCall('/data-import/upload/', {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type for FormData, let browser set it
        },
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: data.message || "File uploaded and validated successfully",
        })
        fetchImportHistory()
      } else {
        toast({
          title: "Error",
          description: data.error || "Upload failed",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Upload failed. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleImportData = async (importId) => {
    setLoading(true)
    try {
      const response = await apiCall('/data-import/import/', {
        method: 'POST',
        body: JSON.stringify({ import_id: importId }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: `Data imported successfully. ${data.imported_rows} rows imported.`,
        })
        fetchImportHistory()
      } else {
        toast({
          title: "Error",
          description: data.error || "Import failed",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Import failed. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = async (templateId) => {
    try {
      const response = await apiCall(`/data-import/templates/?template_id=${templateId}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `template_${templateId}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        toast({
          title: "Success",
          description: "Template downloaded successfully",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download template",
        variant: "destructive",
      })
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  const getModuleColor = (templateType) => {
    const colorMap = {
      'CUSTOMERS': 'bg-blue-100 text-blue-800',
      'SUPPLIERS': 'bg-purple-100 text-purple-800',
      'ITEMS': 'bg-green-100 text-green-800',
      'CATEGORIES': 'bg-yellow-100 text-yellow-800',
      'LOCATIONS': 'bg-indigo-100 text-indigo-800',
      'INVENTORY': 'bg-green-100 text-green-800',
      'SALES_ORDERS': 'bg-blue-100 text-blue-800',
      'INVOICES': 'bg-blue-100 text-blue-800',
      'PAYMENTS': 'bg-emerald-100 text-emerald-800',
      'PURCHASE_ORDERS': 'bg-purple-100 text-purple-800',
      'BILLS': 'bg-purple-100 text-purple-800',
      'SUPPLIER_PAYMENTS': 'bg-purple-100 text-purple-800',
      'ACCOUNTS': 'bg-orange-100 text-orange-800',
      'JOURNAL_ENTRIES': 'bg-orange-100 text-orange-800',
      'USERS': 'bg-gray-100 text-gray-800',
    }
    return colorMap[templateType] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Data Import</h1>
        <p className="text-muted-foreground">
          Upload and import data from Excel files into your ERP system.
        </p>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upload">Upload Data</TabsTrigger>
          <TabsTrigger value="history">Import History</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Upload Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Select Import Template</CardTitle>
                  <CardDescription>
                    Choose the type of data you want to import
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4" />
                            <span>{template.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedTemplate && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Template Selected</h4>
                          <p className="text-sm text-muted-foreground">
                            {templates.find(t => t.id.toString() === selectedTemplate)?.description}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadTemplate(selectedTemplate)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Template
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upload File</CardTitle>
                  <CardDescription>
                    Upload your Excel file for validation and import
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FileUploadArea
                    onFileSelect={handleFileUpload}
                    selectedTemplate={selectedTemplate}
                    loading={uploading}
                  />
                  
                  {uploading && (
                    <div className="mt-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Uploading and validating...</span>
                      </div>
                      <Progress value={undefined} className="h-2" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Instructions */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Import Instructions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                        1
                      </div>
                      <div>
                        <p className="text-sm font-medium">Select Template</p>
                        <p className="text-xs text-muted-foreground">Choose the appropriate import template</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                        2
                      </div>
                      <div>
                        <p className="text-sm font-medium">Download Template</p>
                        <p className="text-xs text-muted-foreground">Get the Excel template with correct format</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                        3
                      </div>
                      <div>
                        <p className="text-sm font-medium">Prepare Data</p>
                        <p className="text-xs text-muted-foreground">Fill the template with your data</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                        4
                      </div>
                      <div>
                        <p className="text-sm font-medium">Upload & Import</p>
                        <p className="text-xs text-muted-foreground">Upload file and review validation results</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> Make sure your Excel file follows the template format exactly. 
                  Required columns must be filled, and data types must match the expected format.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Import History</CardTitle>
                <CardDescription>View and manage your data import history</CardDescription>
              </div>
              <Button variant="outline" onClick={fetchImportHistory}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {importHistory.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No imports yet</h3>
                  <p className="text-muted-foreground">Upload your first Excel file to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {importHistory.map((importItem) => (
                    <div key={importItem.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getModuleColor(importItem.template_type)}`}>
                            {(() => {
                              const Icon = getTemplateIcon(importItem.template_type)
                              return <Icon className="w-5 h-5" />
                            })()}
                          </div>
                          <div>
                            <h4 className="font-medium">{importItem.original_filename}</h4>
                            <p className="text-sm text-muted-foreground">
                              {importItem.template_name} • {formatDate(importItem.created_at)}
                              {importItem.created_by && ` • by ${importItem.created_by}`}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={importItem.status} />
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{importItem.total_rows}</p>
                          <p className="text-xs text-muted-foreground">Total Rows</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{importItem.valid_rows}</p>
                          <p className="text-xs text-muted-foreground">Valid</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-600">{importItem.invalid_rows}</p>
                          <p className="text-xs text-muted-foreground">Invalid</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{importItem.imported_rows}</p>
                          <p className="text-xs text-muted-foreground">Imported</p>
                        </div>
                      </div>
                      
                      {importItem.total_rows > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-muted-foreground">Success Rate</span>
                            <span className="text-sm font-medium">{importItem.success_rate}%</span>
                          </div>
                          <Progress 
                            value={importItem.success_rate} 
                            className="h-2"
                          />
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {importItem.status === 'VALID' && (
                            <Button
                              size="sm"
                              onClick={() => handleImportData(importItem.id)}
                              disabled={loading}
                            >
                              {loading ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4 mr-2" />
                              )}
                              Import Data
                            </Button>
                          )}
                          {importItem.invalid_rows > 0 && (
                            <Dialog open={showErrorsDialog && selectedImportId === importItem.id} onOpenChange={setShowErrorsDialog}>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => fetchValidationErrors(importItem.id)}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Errors ({importItem.invalid_rows})
                                </Button>
                              </DialogTrigger>
                              <ValidationErrorsDialog 
                                importId={selectedImportId}
                                errors={validationErrors}
                                onClose={() => setShowErrorsDialog(false)}
                              />
                            </Dialog>
                          )}
                          {(importItem.status === 'COMPLETED' || importItem.status === 'FAILED') && (
                            <Dialog open={showLogsDialog && selectedImportId === importItem.id} onOpenChange={setShowLogsDialog}>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => fetchImportLogs(importItem.id)}
                                >
                                  <FileText className="w-4 h-4 mr-2" />
                                  View Logs
                                </Button>
                              </DialogTrigger>
                              <ImportLogsDialog 
                                importId={selectedImportId}
                                logs={importLogs}
                                onClose={() => setShowLogsDialog(false)}
                              />
                            </Dialog>
                          )}
                        </div>
                        
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Templates</CardTitle>
              <CardDescription>Download Excel templates for data import</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getModuleColor(template.template_type)}`}>
                          {(() => {
                            const Icon = getTemplateIcon(template.template_type)
                            return <Icon className="w-5 h-5" />
                          })()}
                        </div>
                        <div>
                          <h3 className="font-semibold">{template.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {template.template_type.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-4">
                        {template.description}
                      </p>
                      
                      <div className="space-y-2 mb-4">
                        <div>
                          <p className="text-xs font-medium text-green-700">Required Columns ({template.required_columns.length}):</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {template.required_columns.slice(0, 3).map((col) => (
                              <Badge key={col} variant="secondary" className="text-xs">
                                {col}
                              </Badge>
                            ))}
                            {template.required_columns.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{template.required_columns.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {template.optional_columns.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-blue-700">Optional Columns ({template.optional_columns.length}):</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {template.optional_columns.slice(0, 3).map((col) => (
                                <Badge key={col} variant="outline" className="text-xs">
                                  {col}
                                </Badge>
                              ))}
                              {template.optional_columns.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{template.optional_columns.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={() => downloadTemplate(template.id)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

