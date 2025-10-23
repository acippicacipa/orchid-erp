import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, UserCheck, UserX } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from "../../hooks/use-toast";
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const UserManagement = ( ) => {
  const { apiCall } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false); // Ganti showForm
  const [editingUser, setEditingUser] = useState(null);
  const { toast } = useToast();
  
  const initialFormData = {
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    confirm_password: '',
    is_active: true,
    profile: {
      role_id: '',
      department: '',
      position: '',
      employee_id: ''
    }
  };

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/accounts/users/?search=${searchTerm}`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Error fetching users: ' + err.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/accounts/roles/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch roles');
      const data = await response.json();
      setRoles(Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching roles:', err);
      setRoles([]);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const finalValue = type === 'checkbox' ? checked : value;

    if (['role_id', 'department', 'position', 'employee_id'].includes(name)) {
      setFormData(prev => ({ ...prev, profile: { ...prev.profile, [name]: finalValue } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: finalValue }));
    }
  };

  const handleSelectChange = (name, value) => {
    if (name === 'role_id') {
      setFormData(prev => ({ ...prev, profile: { ...prev.profile, role_id: value } }));
    }
  };

  const handleCheckboxChange = (name, checked) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser && formData.password !== formData.confirm_password) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const method = editingUser ? 'PUT' : 'POST';
      const url = editingUser 
        ? `${API_BASE_URL}/accounts/users/${editingUser.id}/` 
        : `${API_BASE_URL}/accounts/users/`;
      
      const payload = { ...formData };
      delete payload.confirm_password;
      
      if (editingUser && !payload.password) {
        delete payload.password;
      }
      
      if (payload.profile.role_id === '' || payload.profile.role_id === 'null') {
        payload.profile.role_id = null;
      } else {
        payload.profile.role_id = parseInt(payload.profile.role_id);
      }

      const response = await fetch(url, {
        method,
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = Object.values(errorData).flat().join(' ');
        throw new Error(errorMessage || 'Failed to save user.');
      }

      toast({ title: "Success", description: `User ${editingUser ? 'updated' : 'created'} successfully.` });
      setIsDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username || '',
      email: user.email || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      password: '',
      confirm_password: '',
      is_active: user.is_active,
      profile: {
        role_id: user.profile?.role?.id?.toString() || '',
        department: user.profile?.department || '',
        position: user.profile?.position || '',
        employee_id: user.profile?.employee_id || ''
      }
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/accounts/users/${userId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to delete user.');
      }
      toast({ title: "Success", description: "User deleted successfully." });
      fetchUsers();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      const payload = { is_active: !currentStatus };
      const response = await fetch(`${API_BASE_URL}/accounts/users/${userId}/`, {
        method: 'PATCH',
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to update user status.');
      }
      toast({ title: "Success", description: `User status updated.` });
      fetchUsers();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingUser(null);
    setError(null);
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        
        {/* --- DIALOG TRIGGER --- */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              resetForm();
              setEditingUser(null); // Pastikan editingUser null saat menambah baru
            }}>
              <Plus className="mr-2 h-4 w-4" /> Add New User
            </Button>
          </DialogTrigger>
          
          {/* --- DIALOG CONTENT (FORM) --- */}
          <DialogContent className="sm:max-w-3xl grid grid-rows-[auto_1fr_auto] h-[90vh] p-0">
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
            </DialogHeader>
            
            <div className="overflow-y-auto px-6">
              <form id="user-form" onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username *</Label>
                    <Input id="username" name="username" value={formData.username} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input id="first_name" name="first_name" value={formData.first_name} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input id="last_name" name="last_name" value={formData.last_name} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password {!editingUser && '*'}</Label>
                    <Input id="password" name="password" type="password" required={!editingUser} value={formData.password} onChange={handleInputChange} placeholder={editingUser ? "Leave blank to keep current" : ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Confirm Password {!editingUser && '*'}</Label>
                    <Input id="confirm_password" name="confirm_password" type="password" required={!editingUser} value={formData.confirm_password} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role_id">Role</Label>
                    <Select name="role_id" value={formData.profile.role_id} onValueChange={(value) => handleSelectChange('role_id', value)}>
                      <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No Role</SelectItem>
                        {roles.map(role => <SelectItem key={role.id} value={role.id.toString()}>{role.display_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employee_id">Employee ID</Label>
                    <Input id="employee_id" name="employee_id" value={formData.profile.employee_id} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input id="department" name="department" value={formData.profile.department} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    <Input id="position" name="position" value={formData.profile.position} onChange={handleInputChange} />
                  </div>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox id="is_active" name="is_active" checked={formData.is_active} onCheckedChange={(checked) => handleCheckboxChange('is_active', checked)} />
                  <Label htmlFor="is_active">Active User</Label>
                </div>
              </form>
            </div>
            
            <DialogFooter className="p-6 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" form="user-form">{editingUser ? 'Update User' : 'Create User'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input type="text" placeholder="Search users by name, username, or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell></TableRow>
            ) : users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{user.first_name} {user.last_name}</div>
                    <div className="text-sm text-muted-foreground">@{user.username}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role_display || 'No Role'}</Badge>
                  </TableCell>
                  <TableCell>{user.profile?.department || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'default' : 'secondary'}>{user.is_active ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(user)} title="Edit User">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleUserStatus(user.id, user.is_active)} title={user.is_active ? 'Deactivate' : 'Activate'}>
                        {user.is_active ? <UserX className="h-4 w-4 text-orange-500" /> : <UserCheck className="h-4 w-4 text-green-500" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)} title="Delete User">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={5} className="h-24 text-center">No users found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default UserManagement;
