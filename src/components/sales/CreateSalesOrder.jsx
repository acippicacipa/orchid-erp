import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SalesOrderForm from './SalesOrderForm'; // 1. Impor komponen form yang baru
import { useToast } from '../ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Helper untuk mendapatkan tanggal hari ini
const getTodayDateString = ( ) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const CreateSalesOrder = () => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true); // State loading untuk fetch data awal
  const [submitLoading, setSubmitLoading] = useState(false); // State loading untuk submit form
  const { toast } = useToast();
  const navigate = useNavigate();

  // 2. Definisikan state awal untuk form order BARU
  const initialFormState = {
    customer: '',
    guest_name: '',
    guest_phone: '',
    due_date: getTodayDateString(),
    status: 'DRAFT',
    payment_method: 'NOT_PAID',
    down_payment_amount: '0',
    discount_percentage: '0',
    tax_percentage: '0',
    shipping_cost: '0',
    notes: '',
    items: [],
  };

  // 3. useEffect untuk mengambil data yang dibutuhkan oleh form
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        // Ambil data customers dan products secara paralel untuk efisiensi
        const [customersRes, productsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/sales/customers/`, {
            headers: { Authorization: `Token ${token}` },
          }),
          fetch(`${API_BASE_URL}/inventory/products/`, { // Ganti ke endpoint produk yang benar jika perlu
            headers: { Authorization: `Token ${token}` },
          }),
        ]);

        if (!customersRes.ok) throw new Error('Failed to fetch customers');
        if (!productsRes.ok) throw new Error('Failed to fetch products');

        const customersData = await customersRes.json();
        const productsData = await productsRes.json();

        setCustomers(customersData.results || customersData);
        setProducts(productsData.results || productsData);
      } catch (error) {
        toast({ title: 'Error', description: `Failed to load initial data: ${error.message}`, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  // 4. Buat fungsi untuk menangani submit dari form anak
  const handleCreateSubmit = async (formData) => {
    setSubmitLoading(true);
    
    // Validasi sederhana sebelum mengirim
    if (!formData.customer) {
      toast({ title: "Validation Error", description: "Please select a customer.", variant: "destructive" });
      setSubmitLoading(false);
      return;
    }
    if (formData.items.length === 0) {
      toast({ title: "Validation Error", description: "Please add at least one item.", variant: "destructive" });
      setSubmitLoading(false);
      return;
    }

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

      const response = await fetch(`${API_BASE_URL}/sales/sales-orders/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create sales order.');
      }

      toast({ title: "Success", description: "Sales order created successfully." });
      navigate('/sales/orders'); // Arahkan pengguna ke daftar SO setelah berhasil

    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitLoading(false);
    }
  };

  // 5. Render komponen utama
  return (
    <div className="container mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create New Sales Order</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Me-render komponen form dengan props yang relevan */}
              <SalesOrderForm
                initialData={initialFormState}
                onSubmit={handleCreateSubmit} // Dihandle oleh fungsi di halaman ini
                customers={customers}
                products={products}
                isEditing={false} // Tandai bahwa ini bukan mode edit
              />
              {/* Tombol aksi ditempatkan di sini, di luar form */}
              <div className="flex justify-end space-x-2 pt-6 border-t mt-6">
                <Button variant="outline" onClick={() => navigate('/sales/orders')} disabled={submitLoading}>
                  Cancel
                </Button>
                <Button type="submit" form="sales-order-form" disabled={submitLoading}>
                  {submitLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {submitLoading ? 'Saving...' : 'Create Order'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateSalesOrder;
