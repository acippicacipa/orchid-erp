import React, { useState, useEffect } from 'react';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog";
import { useToast } from "../../hooks/use-toast";
import { PlusCircle, Edit, Trash2, ChevronDown, ChevronRight } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [mainCategories, setMainCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({
    name: '',
    main_category: '',
    parent_category: null,
    description: '',
    is_active: true,
  });
  const [editingCategory, setEditingCategory] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/categories/`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      setCategories(data.results || []);
      // const formattedCategories = data.results.map(cat => ({
      //   ...cat,
      //   parent_category: cat.parent_category || null,
      // }));
      // setCategories(formattedCategories);
      
      // // Extract unique main categories
      // const uniqueMainCategories = [...new Set(formattedCategories.map(cat => cat.main_category))];
      // setMainCategories(uniqueMainCategories);

    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewCategory(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSelectChange = (name, value) => {
    setNewCategory(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const method = editingCategory ? 'PUT' : 'POST';
      const url = editingCategory 
        ? `${API_BASE_URL}/inventory/categories/${editingCategory.id}/` 
        : `${API_BASE_URL}/inventory/categories/`;
      
      const payload = {
        ...newCategory,
        parent_category: newCategory.parent_category === 'null' ? null : newCategory.parent_category,
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.name || 'Failed to save category');
      }

      toast({
        title: "Success",
        description: `Category ${editingCategory ? 'updated' : 'created'} successfully.`, 
      });
      setIsModalOpen(false);
      setNewCategory({
        name: '',
        main_category: '',
        parent_category: null,
        description: '',
        is_active: true,
      });
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setNewCategory({
      name: category.name,
      main_category: category.main_category,
      parent_category: category.parent_category ? category.parent_category.id : 'null',
      description: category.description,
      is_active: category.is_active,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory/categories/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to delete category');
      }
      toast({
        title: "Success",
        description: "Category deleted successfully.",
      });
      fetchCategories();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleExpand = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const renderCategoryRow = (category, level = 0) => {
    const subcategories = categories.filter(cat => cat.parent_category && cat.parent_category.id === category.id);
    const isExpanded = expandedCategories[category.id];

    return (
      <React.Fragment key={category.id}>
        <TableRow className={level === 0 ? 'bg-gray-50' : ''}>
          <TableCell className="font-medium">
            <div style={{ paddingLeft: `${level * 20}px` }} className="flex items-center">
              {subcategories.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => toggleExpand(category.id)} className="mr-2">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </Button>
              )}
              {category.name}
            </div>
          </TableCell>
          <TableCell>{category.main_category}</TableCell>
          <TableCell>{category.parent_category ? category.parent_category.name : '-'}</TableCell>
          <TableCell>{category.is_active ? 'Yes' : 'No'}</TableCell>
          <TableCell className="text-right">
            <Button variant="ghost" size="sm" onClick={() => handleEdit(category)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(category.id)} className="text-red-500">
              <Trash2 className="h-4 w-4" />
            </Button>
          </TableCell>
        </TableRow>
        {isExpanded && subcategories.map(subCat => renderCategoryRow(subCat, level + 1))}
      </React.Fragment>
    );
  };

  const topLevelCategories = categories.filter(cat => !cat.parent_category);

  return (
    <div className="container mx-auto py-10">
      <h2 className="text-3xl font-bold tracking-tight mb-8">Category Management</h2>

      <div className="flex justify-end mb-4">
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingCategory(null);
              setNewCategory({
                name: '',
                main_category: '',
                parent_category: 'null',
                description: '',
                is_active: true,
              });
            }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" name="name" value={newCategory.name} onChange={handleInputChange} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="main_category" className="text-right">Main Category</Label>
                <Select name="main_category" value={newCategory.main_category} onValueChange={(value) => handleSelectChange('main_category', value)} className="col-span-3">
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a main category" />
                  </SelectTrigger>
                  <SelectContent>
                    {mainCategories.map(mc => (
                      <SelectItem key={mc} value={mc}>{mc}</SelectItem>
                    ))}
                    {/* Add option to create new main category if needed */}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="parent_category" className="text-right">Parent Category</Label>
                <Select name="parent_category" value={newCategory.parent_category} onValueChange={(value) => handleSelectChange('parent_category', value)} className="col-span-3">
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select parent category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">-- No Parent --</SelectItem>
                    {categories.filter(cat => cat.main_category === newCategory.main_category && cat.id !== editingCategory?.id).map(cat => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Description</Label>
                <Input id="description" name="description" value={newCategory.description} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="is_active" className="text-right">Active</Label>
                <input type="checkbox" id="is_active" name="is_active" checked={newCategory.is_active} onChange={handleInputChange} className="col-span-3 w-4 h-4" />
              </div>
              <DialogFooter>
                <Button type="submit">Save Category</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Main Category</TableHead>
              <TableHead>Parent Category</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topLevelCategories.length > 0 ? (
              topLevelCategories.map(category => renderCategoryRow(category))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No categories found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CategoryManagement;

