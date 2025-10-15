import React, { useState, useEffect } from 'react';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"; // Impor komponen Tabs
import { useToast } from "../../hooks/use-toast";
import { PlusCircle, Edit, Trash2 } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// ==============================================================================
// Komponen Tabel Generik
// Dibuat agar kita tidak perlu menulis kode tabel dua kali.
// ==============================================================================
const CategoryTable = ({ title, data, onEdit, onDelete } ) => (
  <div className="rounded-md border mt-4">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Active</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length > 0 ? (
          data.map(item => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>{item.description || '-'}</TableCell>
              <TableCell>{item.is_active ? 'Yes' : 'No'}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)} className="text-red-500">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={4} className="h-24 text-center">
              No {title} found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </div>
);

// ==============================================================================
// Komponen Utama CategoryManagement
// Telah dirombak total untuk menggunakan Tabs dan struktur data baru.
// ==============================================================================
const CategoryManagement = () => {
  // State untuk menampung dua jenis kategori
  const [mainCategories, setMainCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  
  // State untuk mengontrol tab yang aktif
  const [activeTab, setActiveTab] = useState('main'); // 'main' atau 'sub'

  // State untuk mengelola modal (pop-up)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // Menyimpan item yang sedang diedit
  const [newItem, setNewItem] = useState({ name: '', description: '', is_active: true });
  
  const { toast } = useToast();

  // Fungsi untuk mengambil data dari kedua endpoint API
  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Token ${token}` };
      
      // Mengambil data Main Categories dan Sub Categories secara bersamaan
      const [mainRes, subRes] = await Promise.all([
        fetch(`${API_BASE_URL}/inventory/main-categories/`, { headers }),
        fetch(`${API_BASE_URL}/inventory/sub-categories/`, { headers }),
      ]);

      if (!mainRes.ok || !subRes.ok) {
        throw new Error('Failed to fetch one or more category types');
      }

      const mainData = await mainRes.json();
      const subData = await subRes.json();

      setMainCategories(mainData.results || []);
      setSubCategories(subData.results || []);

    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Jalankan fetchData saat komponen pertama kali dimuat
  useEffect(() => {
    fetchData();
  }, []);

  // Handler untuk membuka modal, baik untuk menambah baru atau mengedit
  const handleOpenModal = (item = null) => {
    setEditingItem(item);
    // Jika mengedit, isi form dengan data item. Jika baru, gunakan state kosong.
    setNewItem(item ? { id: item.id, name: item.name, description: item.description || '', is_active: item.is_active } : { name: '', description: '', is_active: true });
    setIsModalOpen(true);
  };

  // Handler untuk perubahan input di dalam form modal
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem(prev => ({ ...prev, [name]: value }));
  };

  // Handler untuk men-submit form (membuat atau memperbarui)
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Tentukan endpoint API berdasarkan tab yang aktif
    const endpoint = activeTab === 'main' ? 'main-categories' : 'sub-categories';
    const url = editingItem
      ? `${API_BASE_URL}/inventory/${endpoint}/${editingItem.id}/`
      : `${API_BASE_URL}/inventory/${endpoint}/`;
    const method = editingItem ? 'PUT' : 'POST';

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        method,
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to save ${activeTab} category`);
      }

      toast({ title: "Success", description: "Operation successful." });
      setIsModalOpen(false);
      fetchData(); // Ambil ulang data terbaru setelah berhasil
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Handler untuk menghapus item
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    const endpoint = activeTab === 'main' ? 'main-categories' : 'sub-categories';
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/${endpoint}/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error(`Failed to delete ${activeTab} category`);
      toast({ title: "Success", description: "Item deleted successfully." });
      fetchData(); // Ambil ulang data setelah berhasil
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Category Management</h2>
        <Button onClick={() => handleOpenModal()}>
          <PlusCircle className="mr-2 h-4 w-4" /> 
          {/* Teks tombol berubah sesuai tab yang aktif */}
          Add New {activeTab === 'main' ? 'Main Category' : 'Sub Category'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="main">Main Categories</TabsTrigger>
          <TabsTrigger value="sub">Sub Categories</TabsTrigger>
        </TabsList>
        <TabsContent value="main">
          <CategoryTable 
            title="Main Categories" 
            data={mainCategories} 
            onEdit={handleOpenModal} 
            onDelete={handleDelete} 
          />
        </TabsContent>
        <TabsContent value="sub">
          <CategoryTable 
            title="Sub Categories" 
            data={subCategories} 
            onEdit={handleOpenModal} 
            onDelete={handleDelete} 
          />
        </TabsContent>
      </Tabs>

      {/* Modal untuk Add/Edit */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit' : 'Add'} {activeTab === 'main' ? 'Main Category' : 'Sub Category'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" value={newItem.name} onChange={handleInputChange} required />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" value={newItem.description} onChange={handleInputChange} />
            </div>
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryManagement;
