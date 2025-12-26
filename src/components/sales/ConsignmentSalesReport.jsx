import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Loader2, Check, Trash2 } from 'lucide-react';
import ProductSearchDropdown from '@/components/sales/ProductSearchDropdown';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const ConsignmentSalesReport = ( ) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [customers, setCustomers] = useState([]);
  const [locations, setLocations] = useState([]);

  const { token } = useAuth();
  const { toast } = useToast();

  const initialFormState = {
    customer: '',
    consignment_location: '',
    report_date: new Date().toISOString().split('T')[0],
    notes: '',
    items: [],
  };
  const [formData, setFormData] = useState(initialFormState);
  const [newItem, setNewItem] = useState({ product: null, quantity_sold: 1, unit_price: 0 });

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/sales/consignment-sales-reports/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch reports');
      const data = await response.json();
      setReports(data.results || []);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  const fetchSupportingData = useCallback(async () => {
    try {
      const [customersRes, locationsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/sales/customers/`, { headers: { 'Authorization': `Token ${token}` } }),
        fetch(`${API_BASE_URL}/inventory/locations/?location_type=CONSIGNMENT`, { headers: { 'Authorization': `Token ${token}` } }),
      ]);
      if (customersRes.ok) setCustomers((await customersRes.json()).results || []);
      if (locationsRes.ok) setLocations((await locationsRes.json()).results || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch supporting data.", variant: "destructive" });
    }
  }, [token, toast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    if (isDialogOpen) {
      fetchSupportingData();
    }
  }, [isDialogOpen, fetchSupportingData]);

  const handleAddItem = () => {
    if (!newItem.product || newItem.quantity_sold <= 0) {
      toast({ title: "Warning", description: "Please select a product and enter a valid quantity.", variant: "default" });
      return;
    }
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        product: newItem.product.id,
        product_name: newItem.product.name,
        product_sku: newItem.product.sku,
        quantity_sold: newItem.quantity_sold,
        unit_price: newItem.unit_price,
      }]
    }));
    setNewItem({ product: null, quantity_sold: 1, unit_price: 0 });
  };

  const handleRemoveItem = (productId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.product !== productId),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      toast({ title: "Error", description: "Please add at least one sold item.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/sales/consignment-sales-reports/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to create sales report.');
      toast({ title: "Success", description: "Sales report created successfully." });
      setIsDialogOpen(false);
      fetchReports();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (reportId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/sales/consignment-sales-reports/${reportId}/confirm/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to confirm report.');
      toast({ title: "Success", description: "Report confirmed. Sales, COGS, and Invoice have been generated." });
      fetchReports();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      'DRAFT': 'bg-gray-100 text-gray-800',
      'CONFIRMED': 'bg-green-100 text-green-800',
    }[status] || 'bg-gray-100';
    return <Badge className={config}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Consignment Sales Reports</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setFormData(initialFormState)}><Plus className="mr-2 h-4 w-4" /> New Report</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col">
            <DialogHeader><DialogTitle>Create Consignment Sales Report</DialogTitle></DialogHeader>
            <form id="report-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Customer (Consignee)</Label>
                  <Select onValueChange={(v) => setFormData(p => ({...p, customer: v}))} required>
                    <SelectTrigger><SelectValue placeholder="Select a customer..." /></SelectTrigger>
                    <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Consignment Location</Label>
                  <Select onValueChange={(v) => setFormData(p => ({...p, consignment_location: v}))} required>
                    <SelectTrigger><SelectValue placeholder="Select location..." /></SelectTrigger>
                    <SelectContent>{locations.map(l => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Report Date</Label>
                  <Input type="date" value={formData.report_date} onChange={(e) => setFormData(p => ({...p, report_date: e.target.value}))} />
                </div>
              </div>
              <div className="border p-4 rounded-lg space-y-2">
                <h3 className="font-semibold">Add Sold Items</h3>
                <div className="flex gap-4 items-end">
                  <div className="flex-grow space-y-1">
                    <Label>Product</Label>
                    <ProductSearchDropdown onSelect={(p) => setNewItem(prev => ({...prev, product: p, unit_price: p.selling_price || 0}))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Qty Sold</Label>
                    <Input type="number" value={newItem.quantity_sold} onChange={(e) => setNewItem(prev => ({...prev, quantity_sold: Number(e.target.value)}))} className="w-24" />
                  </div>
                  <div className="space-y-1">
                    <Label>Unit Price</Label>
                    <Input type="number" value={newItem.unit_price} onChange={(e) => setNewItem(prev => ({...prev, unit_price: Number(e.target.value)}))} className="w-32" />
                  </div>
                  <Button type="button" onClick={handleAddItem}>Add</Button>
                </div>
              </div>
              {formData.items.length > 0 && (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Qty Sold</TableHead><TableHead>Unit Price</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {formData.items.map(item => (
                        <TableRow key={item.product}>
                          <TableCell>{item.product_name} ({item.product_sku})</TableCell>
                          <TableCell>{item.quantity_sold}</TableCell>
                          <TableCell>{item.unit_price}</TableCell>
                          <TableCell><Button variant="destructive" size="icon" onClick={() => handleRemoveItem(item.product)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </form>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" form="report-form" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : 'Create Report'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Sales Report History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Report #</TableHead><TableHead>Customer</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Total Sales</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow> :
               reports.map(rep => (
                <TableRow key={rep.id}>
                  <TableCell className="font-medium">{rep.report_number}</TableCell>
                  <TableCell>{rep.customer_name}</TableCell>
                  <TableCell>{new Date(rep.report_date).toLocaleDateString()}</TableCell>
                  <TableCell>{getStatusBadge(rep.status)}</TableCell>
                  <TableCell>{/* Format Rupiah */ rep.total_sales_amount}</TableCell>
                  <TableCell>
                    {rep.status === 'DRAFT' && <Button size="sm" onClick={() => handleConfirmAction(rep.id)}><Check className="h-4 w-4 mr-1" />Confirm Report</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConsignmentSalesReport;