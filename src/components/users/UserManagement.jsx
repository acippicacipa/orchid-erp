import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, EyeOff, UserCheck, UserX } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from "../../hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const UserManagement = () => {
  const { apiCall } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
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
    profile: { // Data profil sekarang di-nest
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
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/accounts/users/?search=${searchTerm}`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      const usersData = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
      setUsers(usersData);
    } catch (err) {
      setError('Error fetching users: ' + err.message);
      setUsers([]);
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
      const rolesData = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
      setRoles(rolesData);
    } catch (err) {
      console.error('Error fetching roles:', err);
      setRoles([]);
    }
  };

  // Trigger pencarian saat searchTerm berubah
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const finalValue = type === 'checkbox' ? checked : value;

    // Cek apakah field ini milik 'profile'
    if (['role_id', 'department', 'position', 'employee_id'].includes(name)) {
      setFormData(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          [name]: finalValue
        }
      }));
    } else {
      // Jika bukan, update state level atas
      setFormData(prev => ({
        ...prev,
        [name]: finalValue
      }));
    }
  };


  // ==============================================================================
  // PERUBAHAN #3: Menyesuaikan handleSubmit agar cocok dengan serializer
  // ==============================================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!editingUser && formData.password !== formData.confirm_password) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem('token'); // Ambil token langsung
      const method = editingUser ? 'PUT' : 'POST';
      const url = editingUser 
        ? `${API_BASE_URL}/accounts/users/${editingUser.id}/` 
        : `${API_BASE_URL}/accounts/users/`;
      
      // Siapkan payload yang akan dikirim
      const payload = { ...formData };
      delete payload.confirm_password; // Hapus confirm_password
      
      // Jangan kirim password jika mengedit dan field password kosong
      if (editingUser && !payload.password) {
        delete payload.password;
      }
      
      // Pastikan role_id adalah integer atau null
      if (payload.profile.role_id === '' || payload.profile.role_id === 'null') {
        payload.profile.role_id = null;
      } else {
        payload.profile.role_id = parseInt(payload.profile.role_id);
      }

      // Lakukan pemanggilan API menggunakan fetch
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Cek jika respons tidak berhasil
      if (!response.ok) {
        const errorData = await response.json();
        // Coba ekstrak pesan error yang lebih spesifik dari backend
        const errorMessage = Object.values(errorData).flat().join(' ');
        throw new Error(errorMessage || 'Failed to save user. Please check your input.');
      }

      // Jika berhasil
      toast({
        title: "Success",
        description: `User ${editingUser ? 'updated' : 'created'} successfully.`,
      });
      
      setShowForm(false); // Tutup modal
      resetForm(); // Reset form
      fetchUsers(); // Ambil ulang daftar pengguna
      
    } catch (error) {
      // Tangani semua error (baik dari fetch maupun dari throw new Error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
    setShowForm(true);
  };

  const handleDelete = async (userId) => {
    // Konfirmasi pengguna
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token'); // Ambil token langsung
      const url = `${API_BASE_URL}/accounts/users/${userId}/`; // Buat URL lengkap

      // Lakukan pemanggilan API menggunakan fetch
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      // Cek jika respons tidak berhasil (misalnya, user tidak ditemukan atau tidak ada izin)
      if (!response.ok) {
        // Coba baca pesan error dari backend jika ada
        const errorData = await response.json().catch(() => ({})); // Tangani jika body bukan JSON
        throw new Error(errorData.detail || 'Failed to delete user.');
      }

      // Jika berhasil (respons.ok adalah true, atau status 204 No Content untuk DELETE)
      toast({
        title: "Success",
        description: "User deleted successfully.",
      });
      
      fetchUsers(); // Ambil ulang daftar pengguna untuk memperbarui UI

    } catch (error) {
      // Tangani semua error dan tampilkan notifikasi
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    // Tidak perlu konfirmasi window.confirm untuk aksi ini, bisa langsung dijalankan
    try {
      const token = localStorage.getItem('token'); // Ambil token langsung
      const url = `${API_BASE_URL}/accounts/users/${userId}/`; // Buat URL lengkap

      // Siapkan payload. Untuk PATCH, kita hanya mengirim field yang berubah.
      const payload = {
        is_active: !currentStatus 
      };

      // Lakukan pemanggilan API menggunakan fetch dengan metode PATCH
      const response = await fetch(url, {
        method: 'PATCH', // Gunakan PATCH untuk update parsial
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Cek jika respons tidak berhasil
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to update user status.');
      }

      // Jika berhasil
      toast({
        title: "Success",
        description: `User status updated successfully.`,
      });
      
      fetchUsers(); // Ambil ulang daftar pengguna untuk memperbarui UI

    } catch (error) {
      // Tangani semua error dan tampilkan notifikasi
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingUser(null);
    setError(null);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add New User
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full max-w-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* User Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {!editingUser && '*'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={editingUser ? "Leave blank to keep current password" : ""}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password {!editingUser && '*'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={formData.confirm_password}
                    onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    name="role_id" // Ganti nama menjadi role_id
                    value={formData.profile.role_id} // Ambil dari profile
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Role</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.display_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    name="employee_id" // Tambahkan name
                    value={formData.profile.employee_id} // Ambil dari profile
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    name="department" // Tambahkan name
                    value={formData.profile.department} // Ambil dari profile
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <input
                    type="text"
                    name="position" // Tambahkan name
                    value={formData.profile.position} // Ambil dari profile
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="mr-2"
                  />
                  Active User
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {user.first_name} {user.last_name} ({user.username})
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    {user.profile?.employee_id && (
                      <div className="text-xs text-gray-400">ID: {user.profile.employee_id}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {user.role_display || 'No Role'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.profile?.department || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Edit User"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleUserStatus(user.id, user.is_active)}
                      className={`${
                        user.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                      }`}
                      title={user.is_active ? 'Deactivate User' : 'Activate User'}
                    >
                      {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete User"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            No users found. Click "Add New User" to get started.
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
