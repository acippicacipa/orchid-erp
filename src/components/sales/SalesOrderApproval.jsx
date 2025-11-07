import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { ThumbsUp, ThumbsDown, AlertTriangle, Info, Loader2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Helper untuk format mata uang
const formatRupiah = (amount ) => {
  if (amount === null || amount === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

const SalesOrderApproval = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fungsi untuk mengambil data SO yang menunggu persetujuan
  const fetchPendingOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/sales/sales-orders/?status=PENDING_APPROVAL`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch pending orders.');
      const data = await response.json();
      setPendingOrders(data.results || data);
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingOrders();
  }, [token]);

  // Fungsi untuk menangani aksi (approve/reject)
  const handleAction = async (orderId, action, reason = '') => {
    try {
      const payload = action === 'reject' ? { reason } : {};
      const response = await fetch(`${API_BASE_URL}/sales/sales-orders/${orderId}/${action}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} order.`);
      }
      
      toast({ title: 'Success', description: `Order has been successfully ${action}ed.` });
      fetchPendingOrders(); // Refresh data setelah aksi berhasil
      return true;

    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
  };

  const handleApproveClick = (order) => {
    if (window.confirm(`Are you sure you want to approve Sales Order ${order.order_number}?`)) {
      handleAction(order.id, 'approve');
    }
  };

  const handleRejectClick = (order) => {
    setSelectedOrder(order);
    setRejectionReason('');
    setIsRejectDialogOpen(true);
  };

  const submitRejection = async () => {
    if (!rejectionReason.trim()) {
      toast({ title: 'Warning', description: 'Rejection reason cannot be empty.', variant: 'destructive' });
      return;
    }
    const success = await handleAction(selectedOrder.id, 'reject', rejectionReason);
    if (success) {
      setIsRejectDialogOpen(false);
    }
  };

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Sales Order Approval</h1>
      <p className="text-muted-foreground mb-2">Review and approve or reject sales orders that exceed customer credit limits.</p>

      <Card>
        <CardHeader>
          <CardTitle>Orders Pending Approval</CardTitle>
          <CardDescription>
            {pendingOrders.length} order(s) require your attention.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Info</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Order Amount</TableHead>
                  <TableHead>Credit Info</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : pendingOrders.length > 0 ? (
                  pendingOrders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="font-medium">{order.order_number}</div>
                        <div className="text-sm text-muted-foreground">{new Date(order.order_date).toLocaleDateString()}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{order.customer_details.name}</div>
                        <div className="text-sm text-muted-foreground">{order.customer_details.customer_id}</div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatRupiah(order.total_amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-orange-600">
                           <AlertTriangle className="h-4 w-4 mr-2" />
                           <span>Exceeds Limit</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Available: {formatRupiah(order.customer_details.available_credit)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleRejectClick(order)}>
                            <ThumbsDown className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApproveClick(order)}>
                            <ThumbsUp className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Info className="h-8 w-8" />
                        <span>No orders are currently pending approval.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog untuk Menolak Order */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Sales Order: {selectedOrder?.order_number}</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this order. This reason will be recorded.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejectionReason">Rejection Reason</Label>
            <Textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Customer has too many overdue invoices."
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={submitRejection}>Confirm Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesOrderApproval;
