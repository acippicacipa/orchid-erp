import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle
} from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { useToast } from '../ui/use-toast';
import { useReactToPrint } from 'react-to-print';
import { Search, Plus, Trash2, FileText, Calendar, User, AlertTriangle, Printer, Eye, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import CustomerSearchDropdown from './CustomerSearchDropdown'; // Pastikan komponen ini ada dan berfungsi

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Helper
const formatRupiah = (amount ) => {
  if (amount === null || amount === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch (e) {
    return 'Invalid Date';
  }
};

const getStatusBadge = (status) => {
  const config = {
    DRAFT: { variant: 'secondary', label: 'Draft' },
    SENT: { variant: 'outline', label: 'Sent' },
    PARTIAL: { variant: 'default', label: 'Partial' },
    PAID: { variant: 'default', className: 'bg-green-600 hover:bg-green-700', label: 'Paid' },
    OVERDUE: { variant: 'destructive', label: 'Overdue' },
    CANCELLED: { variant: 'destructive', label: 'Cancelled' },
  }[status] || { variant: 'secondary', label: status };
  
  return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
};

// ==================================================================
// KOMPONEN UTAMA
// ==================================================================
const InvoiceManagement = () => {
  // --- State untuk Data & UI ---
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // --- State untuk Dialog Create ---
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [availableSOs, setAvailableSOs] = useState([]);
  const [selectedSOIds, setSelectedSOIds] = useState(new Set());
  const [notes, setNotes] = useState('');

  // --- State untuk Dialog View & Print ---
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingInvoiceData, setViewingInvoiceData] = useState(null);
  const [loadingView, setLoadingView] = useState(false);
  const printComponentRef = useRef(null);

  // --- State untuk Pagination & Search ---
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const ITEMS_PER_PAGE = 15;

  // --- Inisialisasi Hook useReactToPrint ---
  const handlePrint = useReactToPrint({
    content: () => printComponentRef.current,
    documentTitle: `Invoice-${viewingInvoiceData?.invoice?.invoice_number || ''}`,
  });

  // --- Fungsi Fetch Data ---
  const fetchInvoices = useCallback(async (page = 1, search = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = new URL(`${API_BASE_URL}/sales/invoices/`);
      url.searchParams.append('page', page);
      if (search) url.searchParams.append('search', search);

      const response = await fetch(url.toString(), { headers: { 'Authorization': `Token ${token}` } });
      if (!response.ok) throw new Error('Failed to fetch invoices');
      
      const data = await response.json();
      setInvoices(data.results || []);
      setTotalInvoices(data.count || 0);
      setTotalPages(Math.ceil((data.count || 0) / ITEMS_PER_PAGE));
      setCurrentPage(page);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchInvoices(1, searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, fetchInvoices]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchInvoices(newPage, searchTerm);
    }
  };

  // --- Logika untuk Dialog Create ---
  const fetchReadyToInvoiceSOs = async (customerId) => {
    if (!customerId) {
      setAvailableSOs([]);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/sales/sales-orders/?customer=${customerId}&status=SHIPPED,DELIVERED&has_invoice=false`;
      const response = await fetch(url, { headers: { 'Authorization': `Token ${token}` } });
      if (response.ok) {
        const data = await response.json();
        setAvailableSOs(data.results || data);
      }
    } catch (error) {
      console.error("Failed to fetch ready sales orders", error);
    }
  };

  useEffect(() => {
    fetchReadyToInvoiceSOs(selectedCustomerId);
    setSelectedSOIds(new Set());
  }, [selectedCustomerId]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || selectedSOIds.size === 0) {
      toast({ title: "Validation Error", description: "Customer and at least one Sales Order must be selected.", variant: "destructive" });
      return;
    }
    setLoadingCreate(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        customer_id: parseInt(selectedCustomerId),
        sales_order_ids: Array.from(selectedSOIds),
        notes: notes,
      };
      const response = await fetch(`${API_BASE_URL}/sales/invoices/create-consolidated/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || JSON.stringify(errorData));
      }
      toast({ title: "Success", description: "Consolidated invoice created successfully." });
      setIsCreateDialogOpen(false);
      fetchInvoices();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoadingCreate(false);
    }
  };

  const resetCreateForm = () => {
    setSelectedCustomerId(null);
    setSelectedCustomerName('');
    setAvailableSOs([]);
    setSelectedSOIds(new Set());
    setNotes('');
  };

  // --- Logika untuk Dialog View & Print ---
  const openViewDialog = async (invoiceId) => {
    setIsViewDialogOpen(true);
    setLoadingView(true);
    setViewingInvoiceData(null);
    setCurrentPage(1);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/sales/invoices/${invoiceId}/print-details/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch invoice details.');
      const data = await response.json();
      setViewingInvoiceData(data);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setIsViewDialogOpen(false);
    } finally {
      setLoadingView(false);
    }
  };

  // --- Kalkulasi untuk Tampilan ---
  const selectedTotal = useMemo(() => {
    return availableSOs
      .filter(so => selectedSOIds.has(so.id))
      .reduce((total, so) => total + parseFloat(so.picked_subtotal || 0), 0);
  }, [selectedSOIds, availableSOs]);

  const paginatedItems = useMemo(() => {
    if (!viewingInvoiceData?.items) return [];
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return viewingInvoiceData.items.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [viewingInvoiceData, currentPage]);

  const viewTotalPages = viewingInvoiceData ? Math.ceil((viewingInvoiceData.items?.length || 0) / ITEMS_PER_PAGE) : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Invoice Management</h1>
          <p className="text-muted-foreground">Manage, create, and view all invoices.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Invoice #, Customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetCreateForm}>
                <Plus className="mr-2 h-4 w-4" /> Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col p-0">
              <DialogHeader className="p-6 pb-4 border-b">
                <DialogTitle>Create Consolidated Invoice</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} id="create-invoice-form" className="flex-grow overflow-y-auto p-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="customer-select">1. Select a Customer</Label>
                  <CustomerSearchDropdown
                    initialValue={selectedCustomerName}
                    onSelect={(customer) => {
                      setSelectedCustomerId(customer.id);
                      setSelectedCustomerName(customer.name);
                    }}
                  />
                </div>
                {selectedCustomerId && (
                  <div className="space-y-2">
                    <Label>2. Select Sales Orders to Invoice</Label>
                    <Card>
                      <CardContent className="p-0">
                        <div className="max-h-64 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12">
                                  <Checkbox
                                    checked={selectedSOIds.size === availableSOs.length && availableSOs.length > 0}
                                    onCheckedChange={() => {
                                      if (selectedSOIds.size === availableSOs.length) setSelectedSOIds(new Set());
                                      else setSelectedSOIds(new Set(availableSOs.map(so => so.id)));
                                    }}
                                  />
                                </TableHead>
                                <TableHead>Order #</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {availableSOs.length > 0 ? availableSOs.map(so => (
                                <TableRow key={so.id} data-state={selectedSOIds.has(so.id) && "selected"}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedSOIds.has(so.id)}
                                      onCheckedChange={() => {
                                        setSelectedSOIds(prev => {
                                          const newSet = new Set(prev);
                                          if (newSet.has(so.id)) newSet.delete(so.id);
                                          else newSet.add(so.id);
                                          return newSet;
                                        });
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium">{so.order_number}</TableCell>
                                  <TableCell>{formatDate(so.order_date)}</TableCell>
                                  <TableCell className="text-right">{formatRupiah(so.picked_subtotal)}</TableCell>
                                </TableRow>
                              )) : (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center">No shippable orders found for this customer.</TableCell></TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                    <div className="text-right font-bold mt-2">Selected Total: {formatRupiah(selectedTotal)}</div>
                  </div>
                )}
                {selectedSOIds.size > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="notes">3. Notes (Optional)</Label>
                    <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                )}
              </form>
              <DialogFooter className="p-6 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button type="submit" form="create-invoice-form" disabled={loadingCreate || selectedSOIds.size === 0}>
                  {loadingCreate ? 'Creating...' : `Create Invoice for ${selectedSOIds.size} Order(s)`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                ) : invoices.length > 0 ? (
                  invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.customer_name}</TableCell>
                      <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                      <TableCell>
                        <div className={`flex items-center ${new Date(invoice.due_date) < new Date() && invoice.status !== 'PAID' ? 'text-red-600' : ''}`}>
                          {new Date(invoice.due_date) < new Date() && invoice.status !== 'PAID' && <AlertTriangle className="h-4 w-4 mr-1" />}
                          {formatDate(invoice.due_date)}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatRupiah(invoice.total_amount)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatRupiah(invoice.balance_due)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openViewDialog(invoice.id)} title="View Invoice">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {invoice.status === 'DRAFT' && (
                            <Button variant="ghost" size="icon" onClick={() => { /* Logika Send */ }} title="Mark as Sent">
                              {/* Ganti dengan ikon Send */}
                            </Button>
                          )}
                          {invoice.status === 'DRAFT' && (
                            <Button variant="ghost" size="icon" onClick={() => { /* Logika Delete */ }} title="Delete Invoice">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center">No invoices found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="text-sm text-muted-foreground">
              Showing {invoices.length} of {totalInvoices} invoices.
            </div>
            <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <span className="p-2 text-sm">Page {currentPage} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2 border-b">
            <DialogTitle>Invoice Details</DialogTitle>
            {viewingInvoiceData?.invoice && (
              <DialogDescription>
                Viewing Invoice #{viewingInvoiceData.invoice.invoice_number}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="flex-grow overflow-y-auto">
            {loadingView ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : viewingInvoiceData ? (
              <div ref={printComponentRef} className="p-6">
                <header className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">INVOICE</h2>
                    <p className="text-muted-foreground">#{viewingInvoiceData.invoice.invoice_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{viewingInvoiceData.invoice.customer_name}</p>
                    <p className="text-sm text-muted-foreground">{viewingInvoiceData.invoice.customer_details?.full_address}</p>
                  </div>
                </header>
                <div className="grid grid-cols-3 gap-4 mb-6 p-4 border rounded-lg bg-slate-50">
                  <div><Label>Invoice Date</Label><p>{formatDate(viewingInvoiceData.invoice.invoice_date)}</p></div>
                  <div><Label>Due Date</Label><p>{formatDate(viewingInvoiceData.invoice.due_date)}</p></div>
                  <div><Label>Payment Terms</Label><p>{viewingInvoiceData.invoice.payment_terms}</p></div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">No.</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((item, index) => (
                      <TableRow key={item.product_id}>
                        <TableCell>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                        <TableCell>
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-xs text-muted-foreground">SKU: {item.product_sku}</div>
                        </TableCell>
                        <TableCell className="text-center">{item.total_picked_quantity}</TableCell>
                        <TableCell className="text-right">{formatRupiah(item.unit_price)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatRupiah(item.line_total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {viewTotalPages > 1 && (
                  <div className="flex items-center justify-end space-x-2 py-4">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">Page {currentPage} of {viewTotalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(viewTotalPages, p + 1))} disabled={currentPage === viewTotalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="flex justify-end mt-6">
                  <div className="w-full max-w-xs space-y-2">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatRupiah(viewingInvoiceData.invoice.subtotal)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-red-600">-{formatRupiah(viewingInvoiceData.invoice.discount_amount)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatRupiah(viewingInvoiceData.invoice.tax_amount)}</span></div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>Total Due</span><span>{formatRupiah(viewingInvoiceData.invoice.total_amount)}</span></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No details to display.</div>
            )}
          </div>
          <DialogFooter className="p-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              <X className="mr-2 h-4 w-4" /> Close
            </Button>
            <Button onClick={handlePrint} disabled={loadingView || !viewingInvoiceData}>
              <Printer className="mr-2 h-4 w-4" /> Print Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoiceManagement;
