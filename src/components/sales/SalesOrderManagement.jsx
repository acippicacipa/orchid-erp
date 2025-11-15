import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Search, Edit, Trash2, Loader2, Info, FileText, CheckCircle } from 'lucide-react';
import { useToast } from '../ui/use-toast';
import { useNavigate } from 'react-router-dom';
import SalesOrderForm from './SalesOrderForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '../ui/pagination'; // Impor komponen Pagination
import { useAuth } from '@/contexts/AuthContext';


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Helper untuk format mata uang
const formatRupiah = (amount ) => {
  if (amount === null || amount === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Helper untuk format tanggal
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch (error) {
    return dateString;
  }
};

const SalesOrderManagement = () => {
  const [salesOrders, setSalesOrders] = useState([]);
  const [customers, setCustomers] = useState([]); // Data untuk form
  const [products, setProducts] = useState([]);   // Data untuk form
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // --- 2. TAMBAHKAN STATE UNTUK DIALOG ---
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);

  useEffect(() => {
    fetchSalesOrders();
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/sales/customers/`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      } );

      if (response.ok) {
        const data = await response.json();
        const customersData = Array.isArray(data.results) 
          ? data.results 
          : Array.isArray(data) 
            ? data 
            : [];

        setCustomers(customersData.filter(customer => customer.is_active));
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]); // Pastikan reset ke array kosong jika terjadi error
    }
  };

  const fetchSalesOrders = useCallback(async (page = 1, search = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = new URL(`${API_BASE_URL}/sales/sales-orders/`);
      url.searchParams.append('page', page);
      if (search) {
        url.searchParams.append('search', search);
      }

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch sales orders');
      
      const data = await response.json();
      
      setSalesOrders(data.results || []);
      setTotalCount(data.count || 0);
      // Hitung total halaman berdasarkan jumlah data dan ukuran halaman (misal 25)
      setTotalPages(Math.ceil((data.count || 0) / 25)); 
      setCurrentPage(page);

    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSalesOrders(1, '');
  }, [fetchSalesOrders]);

  useEffect(() => {
    const handler = setTimeout(() => {
      // Saat pengguna selesai mengetik, panggil API lagi dari halaman 1 dengan query pencarian
      fetchSalesOrders(1, searchTerm);
    }, 500); // Tunda 500ms

    return () => clearTimeout(handler);
  }, [searchTerm, fetchSalesOrders]);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      fetchSalesOrders(newPage, searchTerm);
    }
  };

  const handleDelete = async (orderId) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this draft order? This action cannot be undone.'
      )
    ) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/sales/sales-orders/${orderId}/`,
        {
          method: 'DELETE',
          headers: { Authorization: `Token ${token}` },
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete sales order.');
      }
      toast({ title: 'Success', description: 'Draft order has been deleted.' });
      fetchSalesOrders(); // Refresh data
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };


  const handleEdit = (order) => {
    const transformedData = {
      // Ambil ID dari order itu sendiri
      id: order.id,
      
      // Ambil ID customer dari objek 'customer_details'
      customer: order.customer_details?.id || '',

      // Ambil field-field lain, berikan nilai default jika null/undefined
      status: order.status || 'DRAFT',
      due_date: order.due_date ? order.due_date.split('T')[0] : getTodayDateString(),
      notes: order.notes || '',
      discount_percentage: order.discount_percentage?.toString() || '0',
      tax_percentage: order.tax_percentage?.toString() || '0',
      shipping_cost: order.shipping_cost?.toString() || '0',
      down_payment_amount: order.down_payment_amount?.toString() || '0',
      payment_method: order.payment_method || 'NOT_PAID',
      guest_name: order.guest_name || '',
      guest_phone: order.guest_phone || '',

      // 2. Transformasi setiap item di dalam array 'items'
      items: (order.items || []).map(item => ({
        product: item.product_details?.id || item.product, // Ambil ID produk
        product_full_name: item.product_details?.full_name || 'Unknown Product', // Ambil nama lengkapnya
        quantity: item.quantity?.toString() || '1',
        unit_price: item.unit_price?.toString() || '0',
        discount_percentage: item.discount_percentage?.toString() || '0',
        // Hitung ulang line_total untuk konsistensi
        line_total: (item.quantity * item.unit_price) * (1 - (item.discount_percentage / 100)),
      })),
    };

    // 3. Set state 'editingOrder' dengan data yang sudah ditransformasi
    setEditingOrder(transformedData);
    
    // 4. Buka dialog
    setIsDialogOpen(true);
  };

  const handleUpdateSubmit = async (formData) => {
    if (!editingOrder) return;
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        items: formData.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage,
        })),
      };

      const response = await fetch(`${API_BASE_URL}/sales/sales-orders/${editingOrder.id}/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update order.');
      }

      toast({ title: 'Success', description: 'Sales order has been updated.' });
      setIsDialogOpen(false);
      setEditingOrder(null);
      fetchSalesOrders();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      DRAFT: 'secondary',
      PENDING_APPROVAL: 'outline',
      REJECTED: 'destructive',
      CONFIRMED: 'default',
      PROCESSING: 'default',
      SHIPPED: 'default',
      DELIVERED: 'default',
      CANCELLED: 'destructive',
    };
    const variant = statusConfig[status] || 'secondary';
    return (
      <Badge
        variant={variant}
        className={`capitalize ${
          variant === 'default' ? 'bg-blue-600' : ''
        }`}
      >
        {status.replace('_', ' ').toLowerCase()}
      </Badge>
    );
  };

  // const filteredOrders = salesOrders.filter(
  //   (order) =>
  //     order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //     order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //     order.status?.toLowerCase().includes(searchTerm.toLowerCase())
  // );

  const handleConfirmOrder = async (orderId) => {
    // Tampilkan konfirmasi kepada pengguna
    if (!window.confirm('Are you sure you want to confirm this order? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // 1. Tentukan URL yang benar, sesuai dengan pola yang dibuat oleh @action
      const url = `${API_BASE_URL}/sales/sales-orders/${orderId}/confirm/`;

      // 2. Buat permintaan HTTP POST ke URL tersebut
      const response = await fetch(url, {
        method: 'POST', // Metode harus POST
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json', // Header standar
        },
        // Body bisa kosong jika tidak ada data tambahan yang perlu dikirim
        body: JSON.stringify({}), 
      });

      // 3. Tangani respons dari backend
      if (!response.ok) {
        const errorData = await response.json();
        // Tampilkan pesan error yang dikirim oleh backend
        throw new Error(errorData.error || 'Failed to confirm the order.');
      }

      // Jika berhasil
      toast({ title: 'Success', description: 'Sales Order has been confirmed.' });
      
      // 4. Ambil ulang data untuk me-refresh tabel
      fetchSalesOrders();

    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-2">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Sales Orders</h1>
            <p className="text-muted-foreground">View, search, and manage all sales orders.</p>
        </div>
        <Button onClick={() => navigate('/sales/orders/create')}>
            <FileText className="mr-2 h-4 w-4" /> Create New Order
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Sales Orders</CardTitle>
          <CardDescription>
            <div className="relative mt-2 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Order #, Customer, or Status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : salesOrders.length > 0 ? (
                  salesOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.order_number}
                      </TableCell>
                      <TableCell>{order.customer_name || 'N/A'}</TableCell>
                      <TableCell>{order.order_date}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatRupiah(order.total_amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              // 1. Hentikan event agar tidak merambat ke TableRow atau elemen lain
                              e.stopPropagation(); 
                              
                              // 2. Jalankan fungsi handleEdit seperti biasa
                              handleEdit(order);
                            }}
                            title="Edit Order"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {order.status === 'DRAFT' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConfirmOrder(order.id)} // Panggil fungsi handler saat diklik
                              title="Confirm Order"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Confirm
                            </Button>
                          )}
                          {order.status === 'DRAFT' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(order.id)}
                              title="Delete Draft Order"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Info className="h-8 w-8" />
                        <span>No sales orders found.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}. Total {totalCount} orders.
        </div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                href="#" 
                onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }}
                disabled={currentPage === 1}
              />
            </PaginationItem>
            {/* Anda bisa menambahkan logika untuk menampilkan nomor halaman di sini */}
            <PaginationItem>
              <PaginationNext 
                href="#"
                onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }}
                disabled={currentPage === totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-7xl h-[95vh] grid grid-rows-[auto_1fr_auto] p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>Edit Sales Order: {editingOrder?.order_number}</DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto px-6">
            {editingOrder && (
              <SalesOrderForm
                initialData={editingOrder}
                onSubmit={handleUpdateSubmit}
                customers={customers}
                products={products}
                isEditing={true}
              />
            )}
          </div>

          <DialogFooter className="p-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button type="submit" form="sales-order-form">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesOrderManagement;
