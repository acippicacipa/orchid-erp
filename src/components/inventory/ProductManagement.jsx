import React, { useState, useEffect } from 'react';
// ... (impor komponen lainnya tetap sama)
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { Checkbox } from "../ui/checkbox";
import { useToast } from "../../hooks/use-toast";
import { PlusCircle, Edit, Trash2 } from "lucide-react";


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// ==============================================================================
// FUNGSI BANTUAN BARU: Diperbarui untuk menangani desimal
// ==============================================================================
const formatRupiah = (angka, withDecimal = false ) => {
  if (angka === null || angka === undefined || angka === '') return '';
  
  const numberString = angka.toString();
  const options = {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: withDecimal ? 2 : 0,
    maximumFractionDigits: withDecimal ? 2 : 0,
  };

  return new Intl.NumberFormat('id-ID', options).format(Number(numberString));
};

const parseRupiah = (stringRupiah) => {
  if (!stringRupiah) return '';
  // 1. Ambil semua digit dan koma (jika ada)
  const relevantChars = stringRupiah.replace(/[^0-9,]/g, '');
  // 2. Ganti koma desimal Indonesia dengan titik desimal standar
  const dotDecimal = relevantChars.replace(',', '.');
  return dotDecimal;
};


const ProductManagement = () => {
  // ... (state products, categories, dll. tetap sama) ...
  const [products, setProducts] = useState([]);
  const [mainCategories, setMainCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);

  const initialProductState = {
    name: '',
    sku: '',
    description: '',
    main_category: 'null',
    sub_category: 'null',
    color: '',
    size: '',
    brand: '',
    model: '',
    cost_price: '',
    selling_price: '',
    unit_of_measure: 'pcs',
    weight: '',
    dimensions: '',
    is_active: true,
    is_sellable: true,
    is_purchasable: true,
    is_manufactured: false,
    minimum_stock_level: '0',
    maximum_stock_level: '',
    reorder_point: '0',
    supplier_code: '',
    notes: '',
  };

  const [newProduct, setNewProduct] = useState(initialProductState);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  // ... (useEffect dan fungsi fetch tetap sama) ...
  useEffect(() => {
    const fetchInitialData = async () => {
      await fetchProducts();
      await fetchMainCategories();
      await fetchSubCategories();
    };
    fetchInitialData();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/products/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(data.results || []);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const fetchMainCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/main-categories/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch main categories');
      const data = await response.json();
      setMainCategories(data.results || []);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const fetchSubCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/sub-categories/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch sub categories');
      const data = await response.json();
      setSubCategories(data.results || []);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // ==============================================================================
  // PERUBAHAN 2: Modifikasi handleInputChange untuk menangani desimal
  // ==============================================================================
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    let finalValue = type === 'checkbox' ? checked : value;

    if (name === 'name') {
      finalValue = value.toUpperCase();
    } 
    else if (name === 'cost_price' || name === 'selling_price') {
      // Untuk harga, selalu parse untuk mendapatkan angka/string desimal murni
      finalValue = parseRupiah(value);
    }

    setNewProduct(prev => ({
      ...prev,
      [name]: finalValue,
    }));
  };

  const handleSelectChange = (name, value) => {
    setNewProduct(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const method = editingProduct ? 'PUT' : 'POST';
      const url = editingProduct 
        ? `${API_BASE_URL}/inventory/products/${editingProduct.id}/` 
        : `${API_BASE_URL}/inventory/products/`;
      
      // ==============================================================================
      // PERUBAHAN 3: Gunakan parseFloat untuk harga
      // ==============================================================================
      const payload = {
        ...newProduct,
        main_category: newProduct.main_category === 'null' ? null : parseInt(newProduct.main_category),
        sub_category: newProduct.sub_category === 'null' ? null : parseInt(newProduct.sub_category),
        cost_price: parseFloat(newProduct.cost_price || 0), // Kirim sebagai float
        selling_price: parseInt(newProduct.selling_price || 0), // Tetap integer
        minimum_stock_level: parseInt(newProduct.minimum_stock_level || 0),
        maximum_stock_level: newProduct.maximum_stock_level ? parseInt(newProduct.maximum_stock_level) : null,
        reorder_point: parseInt(newProduct.reorder_point || 0),
        weight: newProduct.weight ? parseFloat(newProduct.weight) : null,
      };
      delete payload.category;

      const response = await fetch(url, {
        method,
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || JSON.stringify(errorData) || 'Failed to save product');
      }

      toast({ title: "Success", description: `Product ${editingProduct ? 'updated' : 'created'} successfully.` });
      setIsModalOpen(false);
      fetchProducts();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setNewProduct({
      // ... (properti lain tetap sama)
      name: product.name,
      sku: product.sku,
      description: product.description || '',
      main_category: product.main_category ? product.main_category.toString() : 'null',
      sub_category: product.sub_category ? product.sub_category.toString() : 'null',
      color: product.color || '',
      size: product.size || '',
      brand: product.brand || '',
      model: product.model || '',
      cost_price: product.cost_price.toString(),
      selling_price: product.selling_price.toString(),
      unit_of_measure: product.unit_of_measure,
      weight: product.weight || '',
      dimensions: product.dimensions || '',
      is_active: product.is_active,
      is_sellable: product.is_sellable,
      is_purchasable: product.is_purchasable,
      is_manufactured: product.is_manufactured,
      minimum_stock_level: product.minimum_stock_level,
      maximum_stock_level: product.maximum_stock_level || '',
      reorder_point: product.reorder_point,
      supplier_code: product.supplier_code || '',
      notes: product.notes || '',
    });
    setIsModalOpen(true);
  };

  // ... (handleDelete tetap sama) ...
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/products/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete product');
      toast({ title: "Success", description: "Product deleted successfully." });
      fetchProducts();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h2 className="text-3xl font-bold tracking-tight mb-8">Product Management</h2>

      <div className="flex justify-end mb-4">
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingProduct(null);
              setNewProduct(initialProductState);
            }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] grid grid-rows-[auto_1fr_auto] h-[90vh] p-0">
            <DialogHeader className="p-6 pb-4">
              <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto px-6">
              <form id="product-form" onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 py-4">
                {/* ... (input nama, sku, kategori, dll. tetap sama) ... */}
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" value={newProduct.name} onChange={handleInputChange} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input id="sku" name="sku" value={newProduct.sku} onChange={handleInputChange} required />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="main_category">Main Category</Label>
                  <Select 
                    name="main_category" 
                    value={newProduct.main_category || 'null'} 
                    onValueChange={(value) => {
                      handleSelectChange('main_category', value);
                      handleSelectChange('sub_category', 'null');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a main category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">-- No Main Category --</SelectItem>
                      {mainCategories.map(mainCat => (
                        <SelectItem key={mainCat.id} value={mainCat.id.toString()}>
                          {mainCat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sub_category">Sub Category</Label>
                  <Select 
                    name="sub_category" 
                    value={newProduct.sub_category || 'null'} 
                    onValueChange={(value) => handleSelectChange('sub_category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a sub category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">-- No Sub Category --</SelectItem>
                      {subCategories.map(subCat => (
                        <SelectItem key={subCat.id} value={subCat.id.toString()}>
                          {subCat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="color">Color</Label>
                  <Input id="color" name="color" value={newProduct.color} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="size">Size</Label>
                  <Input id="size" name="size" value={newProduct.size} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input id="brand" name="brand" value={newProduct.brand} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="model">Model</Label>
                  <Input id="model" name="model" value={newProduct.model} onChange={handleInputChange} />
                </div>

                {/* ============================================================================== */}
                {/* PERUBAHAN 5: Ubah komponen Input untuk harga */}
                {/* ============================================================================== */}
                <div className="grid gap-2">
                  <Label htmlFor="cost_price">Cost Price (Pakai Koma)</Label>
                  <Input 
                    id="cost_price" 
                    name="cost_price" 
                    type="text"
                    // Format dengan desimal
                    value={formatRupiah(newProduct.cost_price, true)} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="selling_price">Selling Price</Label>
                  <Input 
                    id="selling_price" 
                    name="selling_price" 
                    type="text"
                    // Format tanpa desimal
                    value={formatRupiah(newProduct.selling_price, false)} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
                
                {/* ... (Sisa form lainnya tidak perlu diubah) ... */}
                <div className="grid gap-2">
                  <Label htmlFor="unit_of_measure">Unit of Measure</Label>
                  <Input id="unit_of_measure" name="unit_of_measure" value={newProduct.unit_of_measure} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="weight">Weight</Label>
                  <Input id="weight" name="weight" type="number" step="0.001" value={newProduct.weight} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dimensions">Dimensions</Label>
                  <Input id="dimensions" name="dimensions" value={newProduct.dimensions} onChange={handleInputChange} placeholder="L x W x H" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="minimum_stock_level">Min Stock Level</Label>
                  <Input id="minimum_stock_level" name="minimum_stock_level" type="number" step="1" value={newProduct.minimum_stock_level} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="maximum_stock_level">Max Stock Level</Label>
                  <Input id="maximum_stock_level" name="maximum_stock_level" type="number" step="1" value={newProduct.maximum_stock_level} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reorder_point">Reorder Point</Label>
                  <Input id="reorder_point" name="reorder_point" type="number" step="1" value={newProduct.reorder_point} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="supplier_code">Supplier Code</Label>
                  <Input id="supplier_code" name="supplier_code" value={newProduct.supplier_code} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" value={newProduct.description} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" value={newProduct.notes} onChange={handleInputChange} />
                </div>
                <div className="flex items-center space-x-2 col-span-2">
                  <Checkbox id="is_active" name="is_active" checked={newProduct.is_active} onCheckedChange={(checked) => handleSelectChange('is_active', checked)} />
                  <Label htmlFor="is_active">Is Active</Label>
                </div>
                <div className="flex items-center space-x-2 col-span-2">
                  <Checkbox id="is_sellable" name="is_sellable" checked={newProduct.is_sellable} onCheckedChange={(checked) => handleSelectChange('is_sellable', checked)} />
                  <Label htmlFor="is_sellable">Is Sellable</Label>
                </div>
                <div className="flex items-center space-x-2 col-span-2">
                  <Checkbox id="is_purchasable" name="is_purchasable" checked={newProduct.is_purchasable} onCheckedChange={(checked) => handleSelectChange('is_purchasable', checked)} />
                  <Label htmlFor="is_purchasable">Is Purchasable</Label>
                </div>
                <div className="flex items-center space-x-2 col-span-2">
                  <Checkbox id="is_manufactured" name="is_manufactured" checked={newProduct.is_manufactured} onCheckedChange={(checked) => handleSelectChange('is_manufactured', checked)} />
                  <Label htmlFor="is_manufactured">Is Manufactured</Label>
                </div>
              </form>
            </div>
            <DialogFooter className="p-6 pt-4 border-t">
              <Button type="submit" form="product-form">Save Product</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Main Category</TableHead>
              <TableHead>Sub Category</TableHead>
              <TableHead>Selling Price</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length > 0 ? (
              products.map(product => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.sku}</TableCell>
                  <TableCell>{product.main_category_name || 'N/A'}</TableCell>
                  <TableCell>{product.sub_category_name || 'N/A'}</TableCell>
                  <TableCell>{formatRupiah(product.selling_price)}</TableCell>
                  <TableCell>{product.is_active ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)} className="text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ProductManagement;
