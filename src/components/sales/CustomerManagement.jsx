import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Search, Plus, Edit, Trash2, User, Phone, Mail, MapPin, CreditCard } from 'lucide-react'; // Impor ikon baru
import { useToast } from '../ui/use-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const CustomerGroupDialog = ({ isOpen, onOpenChange, customerGroups, onGroupsUpdate }) => {
  const [groups, setGroups] = useState([]);
  const [editingGroup, setEditingGroup] = useState(null); // null | { id, name, description }
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupDiscount, setNewGroupDiscount] = useState('0');
  const { toast } = useToast();

  // Sinkronkan state internal dengan props dari parent
  useEffect(() => {
    setGroups(customerGroups);
  }, [customerGroups]);

  const handleSave = async (groupToSave) => {
    const isEditing = !!groupToSave.id;
    const url = isEditing
      ? `${API_BASE_URL}sales/customer-groups/${groupToSave.id}/`
      : `${API_BASE_URL}/sales/customer-groups/`;
    const method = isEditing ? 'PUT' : 'POST';
    const token = localStorage.getItem('token' );

    const body = { 
        name: groupToSave.name, 
        description: groupToSave.description,
        discount_percentage: groupToSave.discount_percentage || '0' // Kirim diskon
    };

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast({ title: "Success", description: `Group ${isEditing ? 'updated' : 'created'} successfully.` });
        onGroupsUpdate(); // Panggil fungsi dari parent untuk refresh data
        return true;
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.name?.[0] || errorData.detail || 'An error occurred.';
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
        return false;
      }
    } catch (error) {
      toast({ title: "Error", description: 'Failed to save group.', variant: "destructive" });
      return false;
    }
  };

  const handleAddNew = async () => {
    if (!newGroupName.trim()) {
      toast({ title: "Warning", description: "Group name cannot be empty.", variant: "destructive" });
      return;
    }
    const success = await handleSave({ 
        name: newGroupName, 
        description: newGroupDescription,
        discount_percentage: newGroupDiscount // Sertakan diskon saat menyimpan
    });
    if (success) {
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupDiscount('0'); // Reset state diskon
    }
  };

  const handleUpdate = async (group) => {
    const success = await handleSave(group);
    if (success) {
      setEditingGroup(null);
    }
  };
  
  const handleDelete = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this group? This cannot be undone.')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/sales/customer-groups/${groupId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` },
      } );

      if (response.ok) {
        toast({ title: "Success", description: "Group deleted successfully." });
        onGroupsUpdate();
      } else {
        toast({ title: "Error", description: "Failed to delete group. It might be in use.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete group.", variant: "destructive" });
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl grid grid-rows-[auto_1fr_auto] h-[90vh] p-2">
        <DialogHeader>
          <DialogTitle>Manage Customer Groups</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 flex-grow overflow-y-auto p-6">
          {/* Form untuk menambah grup baru */}
          <div className="p-4 border rounded-lg space-y-3">
            <h3 className="font-semibold text-lg">Add New Group</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <Input
                    placeholder="New group name..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                />
                <Input
                    placeholder="Optional description..."
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                />
                <div className="space-y-1">
                    <Label htmlFor="new_discount" className="text-xs">Discount (%)</Label>
                    <Input
                        id="new_discount"
                        type="text"
                        min="0" max="100"
                        placeholder="Discount %"
                        value={newGroupDiscount}
                        onChange={(e) => setNewGroupDiscount(e.target.value)}
                    />
                </div>
            </div>
            <Button onClick={handleAddNew} size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add Group
            </Button>
          </div>

          {/* Tabel untuk menampilkan dan mengedit grup yang ada */}
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.id}>
                    {editingGroup?.id === group.id ? (
                      // Mode Edit
                      <>
                        <TableCell>
                          <Input value={editingGroup.name} onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}/>
                        </TableCell>
                        <TableCell>
                           <Input value={editingGroup.description} onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}/>
                        </TableCell>
                        <TableCell>
                           <Input type="number" min="0" max="100" step="0.01" value={editingGroup.discount_percentage} onChange={(e) => setEditingGroup({ ...editingGroup, discount_percentage: e.target.value })}/>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" onClick={() => handleUpdate(editingGroup)}>Save</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingGroup(null)}>Cancel</Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      // Mode Tampilan
                      <>
                        <TableCell className="font-medium">{group.name}</TableCell>
                        <TableCell className="text-muted-foreground">{group.description || '-'}</TableCell>
                        <TableCell className="text-right font-semibold">{group.discount_percentage || 0}%</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" onClick={() => setEditingGroup({...group})}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(group.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [customerGroups, setCustomerGroups] = useState([]);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const initialCustomerState = {
    name: '',
    customer_group: 'null',
    payment_type: 'CREDIT',
    email: '',
    phone: '',
    mobile: '',
    company_name: '',
    contact_person: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Indonesia',
    tax_id: '',
    credit_limit: '0',
    payment_terms: 'Net 30 days',
    is_active: true,
    notes: ''
  };

  const [formData, setFormData] = useState(initialCustomerState);
  

  useEffect(() => {
    fetchCustomers();
    fetchCustomerGroups();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm]);

  // Ganti fungsi fetchCustomers yang lama dengan ini:

  const fetchCustomers = async () => {
    setLoading(true);
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
        
        setCustomers(customersData);

      } else {
        toast({
          title: "Error",
          description: "Failed to fetch customers",
          variant: "destructive",
        });
        setCustomers([]); // Pastikan reset ke array kosong jika fetch gagal
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive",
      });
      setCustomers([]); // Pastikan reset ke array kosong jika terjadi error
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/sales/customer-groups/`, {
        headers: { 'Authorization': `Token ${token}` },
      } );
      if (response.ok) {
        const data = await response.json();
        const groups = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
        setCustomerGroups(groups);
      } else {
        console.error("Failed to fetch customer groups");
      }
    } catch (error) {
      console.error('Error fetching customer groups:', error);
    }
  };

  const filterCustomers = () => {
    if (!searchTerm) {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.customer_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSelectChange = (name, value) => {
    const processedValue = value === 'null' ? null : parseInt(value, 10);

    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const dataToSend = { ...formData };
    if (dataToSend.customer_group === null || dataToSend.customer_group === 'null') {
      dataToSend.customer_group = null;
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingCustomer 
        ? `${API_BASE_URL}/sales/customers/${editingCustomer.id}/`
        : `${API_BASE_URL}/sales/customers/`;
      
      const method = editingCustomer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Customer ${editingCustomer ? 'updated' : 'created'} successfully`,
        });
        setIsDialogOpen(false);
        resetForm();
        fetchCustomers();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.detail || `Failed to ${editingCustomer ? 'update' : 'create'} customer`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      toast({
        title: "Error",
        description: `Failed to ${editingCustomer ? 'update' : 'create'} customer`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      customer_group: customer.customer_group || null,
      mobile: customer.mobile || '',
      company_name: customer.company_name || '',
      contact_person: customer.contact_person || '',
      address_line_1: customer.address_line_1 || '',
      address_line_2: customer.address_line_2 || '',
      city: customer.city || '',
      state: customer.state || '',
      postal_code: customer.postal_code || '',
      country: customer.country || 'Indonesia',
      tax_id: customer.tax_id || '',
      credit_limit: customer.credit_limit?.toString() || '0',
      payment_terms: customer.payment_terms || 'Net 30 days',
      is_active: customer.is_active !== undefined ? customer.is_active : true,
      notes: customer.notes || '',
      payment_type: customer.payment_type || 'CREDIT'
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (customerId) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/sales/customers/${customerId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Customer deleted successfully",
        });
        fetchCustomers();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete customer",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    const walkInGroup = customerGroups.find(g => g.name.toLowerCase() === 'walk in');
    const defaultGroupId = walkInGroup ? walkInGroup.id : null;

    setFormData({
      ...initialCustomerState,
      customer_group: defaultGroupId,
      // Jika defaultnya Walk In, set payment type ke CASH
      payment_type: walkInGroup ? 'CASH' : 'CREDIT',
    });
    setEditingCustomer(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleGroupsUpdate = () => {
    fetchCustomerGroups(); // Cukup panggil ulang fetchCustomerGroups
  };

  const getStatusBadge = (status) => {
      const statusColors = {
        'Grosir Besar': 'default',
        'Grosir Sedang': 'default',
        'Grosir Kecil': 'default',
        'Orchid Grup': 'secondary',
        'Walk In': 'destructive'
      };
      return <Badge variant={statusColors[status] || 'secondary'}>{status}</Badge>;
    };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Customer Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsGroupDialogOpen(true)}>
            Manage Groups
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingCustomer(null);
                setFormData(initialCustomerState);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl grid grid-rows-[auto_1fr_auto] h-[90vh] p-2">
              <DialogHeader className="p-6 pb-4 border-b">
                <DialogTitle>
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto px-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Customer Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer_group">Customer Group</Label>
                      <Select
                        name="customer_group" 
                        value={String(formData.customer_group)} // Selalu berikan string ke 'value'
                        onValueChange={(value) => handleSelectChange('customer_group', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a group" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="null">-- Pick One --</SelectItem>
                          {customerGroups.map(group => (
                            <SelectItem key={group.id} value={String(group.id)}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment_type">Default Payment Workflow</Label>
                      <Select
                        value={formData.payment_type}
                        onValueChange={(value) => handleSelectChange('payment_type', value)}
                      >
                        <SelectTrigger id="payment_type">
                          <SelectValue placeholder="Select payment workflow" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CREDIT">Credit (via Invoice)</SelectItem>
                          <SelectItem value="CASH">Cash (Direct Sale)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.payment_type === 'CREDIT' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="credit_limit">Credit Limit (IDR)</Label>
                          <Input
                            id="credit_limit"
                            name="credit_limit"
                            type="number"
                            min="0"
                            value={formData.credit_limit}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="payment_terms">Payment Terms</Label>
                          <Select value={formData.payment_terms} onValueChange={(value) => handleSelectChange('payment_terms', value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Net 15 days">Net 15 days</SelectItem>
                              <SelectItem value="Net 30 days">Net 30 days</SelectItem>
                              <SelectItem value="Net 45 days">Net 45 days</SelectItem>
                              <SelectItem value="Net 60 days">Net 60 days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="company_name">Company Name</Label>
                      <Input
                        id="company_name"
                        name="company_name"
                        value={formData.company_name}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_person">Contact Person</Label>
                      <Input
                        id="contact_person"
                        name="contact_person"
                        value={formData.contact_person}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mobile">Mobile</Label>
                      <Input
                        id="mobile"
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address_line_1">Address Line 1</Label>
                      <Input
                        id="address_line_1"
                        name="address_line_1"
                        value={formData.address_line_1}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address_line_2">Address Line 2</Label>
                      <Input
                        id="address_line_2"
                        name="address_line_2"
                        value={formData.address_line_2}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State/Province</Label>
                      <Input
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postal_code">Postal Code</Label>
                      <Input
                        id="postal_code"
                        name="postal_code"
                        value={formData.postal_code}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tax_id">Tax ID/NPWP</Label>
                      <Input
                        id="tax_id"
                        name="tax_id"
                        value={formData.tax_id}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className="rounded"
                    />
                    <Label htmlFor="is_active">Active Customer</Label>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Saving...' : (editingCustomer ? 'Update' : 'Create')}
                    </Button>
                  </div>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading customers...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Payment Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{customer.name}</span>
                          {customer.customer_group_name && (
                            getStatusBadge(customer.customer_group_name)
                        )}
                        </div>
                        
                        {/* {customer.customer_id && (
                          <div className="text-sm text-gray-500">ID: {customer.customer_id}</div>
                        )} */}
                        {/* {customer.company_name && (
                          <div className="text-sm text-gray-500">{customer.company_name}</div>
                        )} */}
                      </div>
                    </TableCell>
                    {/* <TableCell>
                      <div className="space-y-1">
                        
                        {customer.email && (
                          <div className="flex items-center space-x-2 text-sm">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span>{customer.email}</span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center space-x-2 text-sm">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell> */}
                    <TableCell>
                      {customer.city && (
                        <div className="flex items-center space-x-2 text-sm">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span>{customer.city}{customer.state && `, ${customer.state}`}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={customer.payment_type === 'CREDIT' ? 'default' : 'secondary'}>
                        <CreditCard className="mr-1 h-3 w-3" />
                        {customer.payment_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={customer.is_active ? "default" : "secondary"}>
                        {customer.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(customer)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(customer.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <CustomerGroupDialog 
        isOpen={isGroupDialogOpen}
        onOpenChange={setIsGroupDialogOpen}
        customerGroups={customerGroups}
        onGroupsUpdate={handleGroupsUpdate}
      />
    </div>
  );
};

export default CustomerManagement;
