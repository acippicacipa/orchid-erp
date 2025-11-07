import React, { useState, useEffect } from 'react';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { useToast } from "../../hooks/use-toast";
import { PlusCircle, Edit, Trash2, Search } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const SupplierManagement = () => {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const initialFormState = {
    name: '',
    supplier_id: '',
    email: '',
    phone: '',
    contact_person: '',
    tax_id: '',
    payment_terms: '',
    currency: 'IDR',
    notes: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchSuppliers();
  }, [searchTerm]);

  // Ganti fungsi fetchSuppliers yang lama dengan ini:

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
      const url = `${API_BASE_URL}/purchasing/suppliers/${params}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Token ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch suppliers');

      const data = await response.json();
      setSuppliers(data.results || []);
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const method = editingSupplier ? 'PUT' : 'POST';
      const url = editingSupplier 
        ? `${API_BASE_URL}/purchasing/suppliers/${editingSupplier.id}/` 
        : `${API_BASE_URL}/purchasing/suppliers/`;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = Object.values(errorData).flat().join(' ') || 'Failed to save supplier';
        throw new Error(errorMessage);
      }

      toast({
        title: "Success",
        description: `Supplier ${editingSupplier ? 'updated' : 'created'} successfully.`,
      });
      
      setIsModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name || '',
      supplier_id: supplier.supplier_id || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      contact_person: supplier.contact_person || '',
      tax_id: supplier.tax_id || '',
      payment_terms: supplier.payment_terms || '',
      currency: supplier.currency || 'IDR',
      notes: supplier.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        const token = localStorage.getItem('token');
        const url = `${API_BASE_URL}/purchasing/suppliers/${id}/`;

        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Authorization': `Token ${token}`,
          },
        });

        if (!response.ok) {
          // response.ok bernilai false untuk status 400-599
          // Untuk DELETE, response body mungkin kosong, jadi kita buat pesan error sendiri
          throw new Error('Failed to delete supplier');
        }
        
        toast({
          title: "Success",
          description: "Supplier deleted successfully.",
        });
        fetchSuppliers(); // Muat ulang data
      } catch (err) {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      supplier_id: '',
      email: '',
      phone: '',
      contact_person: '',
      tax_id: '',
      payment_terms: '',
      currency: 'IDR',
      notes: ''
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSupplier(null);
    resetForm();
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchSuppliers();
  };

  // if (loading) {
  //   return (
  //     <div className="flex justify-center items-center h-64">
  //       <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
  //     </div>
  //   );
  // }

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Supplier Management</h2>
          <p className="text-muted-foreground">Manage all suppliers.</p>
        </div>
        {/* Search Input */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or contact..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingSupplier(null);
              setFormData(initialFormState);
            }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl grid grid-rows-[auto_1fr_auto] h-[90vh] p-0">
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
            </DialogHeader>
            
            <div className="overflow-y-auto px-6">
              <form id="supplier-form" onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Supplier Name *</Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="supplier_id">Supplier ID</Label>
                  <Input id="supplier_id" name="supplier_id" value={formData.supplier_id} onChange={handleInputChange} />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input id="contact_person" name="contact_person" value={formData.contact_person} onChange={handleInputChange} />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="tax_id">Tax ID (NPWP)</Label>
                  <Input id="tax_id" name="tax_id" value={formData.tax_id} onChange={handleInputChange} />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="payment_terms">Payment Terms</Label>
                  <Input id="payment_terms" name="payment_terms" value={formData.payment_terms} onChange={handleInputChange} placeholder="e.g., Net 30" />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select name="currency" value={formData.currency} onValueChange={(value) => handleSelectChange('currency', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange} rows={4} />
                </div>
              </form>
            </div>
            
            <DialogFooter className="p-6 pt-4 border-t">
              <Button type="submit" form="supplier-form">
                {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Payment Terms</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : suppliers.length > 0 ? (
              suppliers.map(supplier => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.contact_person || '-'}</TableCell>
                  <TableCell>{supplier.email || '-'}</TableCell>
                  <TableCell>{supplier.phone || '-'}</TableCell>
                  <TableCell>{supplier.payment_terms || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(supplier)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(supplier.id)} className="text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No suppliers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SupplierManagement;
