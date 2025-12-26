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
import { Plus, Loader2, Check, Send } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const PurchaseReturnManagement = ( ) => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Data pendukung
  const [bills, setBills] = useState([]);
  const [locations, setLocations] = useState([]);

  const { token } = useAuth();
  const { toast } = useToast();

  const initialFormState = {
    bill: '',
    return_from_location: '',
    reason: '',
    items: [],
  };
  const [formData, setFormData] = useState(initialFormState);

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/purchasing/purchase-returns/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch purchase returns');
      const data = await response.json();
      setReturns(data.results || []);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  const fetchSupportingData = useCallback(async () => {
    try {
      const [billsRes, locationsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/purchasing/bills/?status=PENDING`, { headers: { 'Authorization': `Token ${token}` } }),
        fetch(`${API_BASE_URL}/inventory/locations/`, { headers: { 'Authorization': `Token ${token}` } }),
      ]);
      if (billsRes.ok) setBills((await billsRes.json()).results || []);
      if (locationsRes.ok) setLocations((await locationsRes.json()).results || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch supporting data.", variant: "destructive" });
    }
  }, [token, toast]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  useEffect(() => {
    if (isDialogOpen) {
      fetchSupportingData();
    }
  }, [isDialogOpen, fetchSupportingData]);

  const handleBillSelection = async (billId) => {
    if (!billId) return;
    const bill = bills.find(b => b.id === parseInt(billId));
    if (!bill) return;

    // Ambil detail item dari Goods Receipt terkait (jika ada)
    const grResponse = await fetch(`${API_BASE_URL}/inventory/goods-receipts/?bill_id=${billId}`, { headers: { 'Authorization': `Token ${token}` } });
    const grData = await grResponse.json();
    const goodsReceipt = grData.results?.[0];

    if (!goodsReceipt) {
        toast({ title: "Info", description: "No received items found for this bill to return.", variant: "default" });
        return;
    }

    setFormData({
      ...initialFormState,
      bill: billId,
      supplier: bill.supplier,
      items: goodsReceipt.items.map(item => ({
        ...item,
        quantity: 0,
        max_quantity: item.quantity_received,
      })),
    });
  };

  const handleItemQuantityChange = (productId, newQuantity) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.product === productId) {
          const qty = Math.min(Number(newQuantity) || 0, item.max_quantity);
          return { ...item, quantity: qty };
        }
        return item;
      }),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const itemsToReturn = formData.items.filter(item => item.quantity > 0);
    if (itemsToReturn.length === 0) {
      toast({ title: "Error", description: "Please specify quantity for at least one item.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const payload = {
      supplier: formData.supplier,
      bill: formData.bill,
      return_from_location: formData.return_from_location,
      reason: formData.reason,
      items: itemsToReturn.map(item => ({
        product: item.product,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/purchasing/purchase-returns/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to create purchase return.');
      toast({ title: "Success", description: "Purchase return created successfully." });
      setIsDialogOpen(false);
      fetchReturns();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  
  const handleAction = async (returnId, action) => {
    setLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/purchasing/purchase-returns/${returnId}/${action}/`, {
            method: 'POST',
            headers: { 'Authorization': `Token ${token}` },
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to ${action} return.`);
        }
        toast({ title: "Success", description: `Return ${action}ed successfully.` });
        fetchReturns();
    } catch (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      'DRAFT': 'bg-gray-100 text-gray-800',
      'APPROVED': 'bg-blue-100 text-blue-800',
      'SHIPPED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800',
    }[status] || 'bg-gray-100';
    return <Badge className={config}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Purchase Returns</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setFormData(initialFormState)}><Plus className="mr-2 h-4 w-4" /> New Return</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Create Purchase Return</DialogTitle>
            </DialogHeader>
            <form id="return-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Original Bill</Label>
                  <Select onValueChange={handleBillSelection}>
                    <SelectTrigger><SelectValue placeholder="Select a bill..." /></SelectTrigger>
                    <SelectContent>
                      {bills.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.bill_number} - {b.supplier_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Return From Location</Label>
                  <Select name="return_from_location" value={formData.return_from_location} onValueChange={(v) => setFormData(p => ({...p, return_from_location: v}))} required>
                    <SelectTrigger><SelectValue placeholder="Select location..." /></SelectTrigger>
                    <SelectContent>
                      {locations.map(loc => <SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason for Return</Label>
                <Input name="reason" value={formData.reason} onChange={(e) => setFormData(p => ({...p, reason: e.target.value}))} />
              </div>
              {formData.items.length > 0 && (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Received Qty</TableHead><TableHead>Return Qty</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {formData.items.map(item => (
                        <TableRow key={item.product}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell>{item.max_quantity}</TableCell>
                          <TableCell>
                            <Input type="number" value={item.quantity} onChange={(e) => handleItemQuantityChange(item.product, e.target.value)} max={item.max_quantity} min="0" className="w-24" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </form>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" form="return-form" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : 'Create Return'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Return History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Return #</TableHead><TableHead>Supplier</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow> :
               returns.map(ret => (
                <TableRow key={ret.id}>
                  <TableCell className="font-medium">{ret.return_number}</TableCell>
                  <TableCell>{ret.supplier_name}</TableCell>
                  <TableCell>{new Date(ret.return_date).toLocaleDateString()}</TableCell>
                  <TableCell>{getStatusBadge(ret.status)}</TableCell>
                  <TableCell>{/* Format Rupiah */ ret.total_amount}</TableCell>
                  <TableCell className="space-x-2">
                    {ret.status === 'DRAFT' && <Button size="sm" onClick={() => handleAction(ret.id, 'approve')}><Check className="h-4 w-4 mr-1" />Approve</Button>}
                    {ret.status === 'APPROVED' && <Button size="sm" onClick={() => handleAction(ret.id, 'ship')}><Send className="h-4 w-4 mr-1" />Ship Items</Button>}
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

export default PurchaseReturnManagement;
