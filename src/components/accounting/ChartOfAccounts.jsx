import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Trash2, Edit, Plus, Search, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const ChartOfAccounts = () => {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState({
    account_type: '',
    code: '',
    name: '',
    description: '',
    parent_account: '',
    is_active: true,
    is_header_account: false,
    allow_manual_entries: true,
    opening_balance: 0,
    tax_account: false,
    bank_account: false,
    cash_account: false,
    notes: ''
  });

  useEffect(() => {
    fetchAccountTypes();
    fetchAccounts();
  }, []);

  const fetchAccountTypes = async () => {
    try {
      const response = await fetch('/api/accounting/account-types/', {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAccountTypes(data);
      }
    } catch (error) {
      console.error('Error fetching account types:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      let url = '/api/accounting/accounts/';
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('account_type', selectedCategory);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAccounts(Array.isArray(data) ? data : data.results || []);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchAccounts();
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, selectedCategory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingAccount 
        ? `/api/accounting/accounts/${editingAccount.id}/`
        : '/api/accounting/accounts/';
      
      const method = editingAccount ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchAccounts();
        setIsDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error saving account:', error);
    }
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setFormData({
      account_type: account.account_type,
      code: account.code,
      name: account.name,
      description: account.description || '',
      parent_account: account.parent_account || '',
      is_active: account.is_active,
      is_header_account: account.is_header_account,
      allow_manual_entries: account.allow_manual_entries,
      opening_balance: account.opening_balance,
      tax_account: account.tax_account,
      bank_account: account.bank_account,
      cash_account: account.cash_account,
      notes: account.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      try {
        const response = await fetch(`/api/accounting/accounts/${id}/`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Token ${token}`,
          },
        });

        if (response.ok) {
          fetchAccounts();
        }
      } catch (error) {
        console.error('Error deleting account:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      account_type: '',
      code: '',
      name: '',
      description: '',
      parent_account: '',
      is_active: true,
      is_header_account: false,
      allow_manual_entries: true,
      opening_balance: 0,
      tax_account: false,
      bank_account: false,
      cash_account: false,
      notes: ''
    });
    setEditingAccount(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getAccountTypeColor = (category) => {
    const colors = {
      'ASSET': 'bg-blue-100 text-blue-800',
      'LIABILITY': 'bg-red-100 text-red-800',
      'EQUITY': 'bg-green-100 text-green-800',
      'REVENUE': 'bg-purple-100 text-purple-800',
      'EXPENSE': 'bg-orange-100 text-orange-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Chart of Accounts</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl grid grid-rows-[auto_1fr_auto] h-[90vh] p-0">
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle>
                {editingAccount ? 'Edit Account' : 'Add New Account'}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto px-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="account_type">Account Type</Label>
                    <Select
                      value={formData.account_type}
                      onValueChange={(value) => setFormData({...formData, account_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        {accountTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name} ({type.category})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="code">Account Code</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value})}
                      placeholder="e.g., 1001"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="name">Account Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Cash in Bank"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Account description"
                  />
                </div>

                <div>
                  <Label htmlFor="parent_account">Parent Account</Label>
                  <Select 
                    value={selectedCategory || 'all'} // Gunakan 'all' jika selectedCategory kosong
                    onValueChange={(value) => {
                      // Jika pengguna memilih 'all', set state menjadi string kosong
                      setSelectedCategory(value === 'all' ? '' : value);
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem> {/* <-- PERUBAHAN DI SINI */}
                      <SelectItem value="ASSET">Assets</SelectItem>
                      <SelectItem value="LIABILITY">Liabilities</SelectItem>
                      <SelectItem value="EQUITY">Equity</SelectItem>
                      <SelectItem value="REVENUE">Revenue</SelectItem>
                      <SelectItem value="EXPENSE">Expenses</SelectItem>
                    </SelectContent>
                  </Select>

                </div>

                <div>
                  <Label htmlFor="opening_balance">Opening Balance</Label>
                  <Input
                    id="opening_balance"
                    type="number"
                    step="0.01"
                    value={formData.opening_balance}
                    onChange={(e) => setFormData({...formData, opening_balance: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_header_account"
                      checked={formData.is_header_account}
                      onCheckedChange={(checked) => setFormData({...formData, is_header_account: checked})}
                    />
                    <Label htmlFor="is_header_account">Header Account</Label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="allow_manual_entries"
                      checked={formData.allow_manual_entries}
                      onCheckedChange={(checked) => setFormData({...formData, allow_manual_entries: checked})}
                    />
                    <Label htmlFor="allow_manual_entries">Allow Manual Entries</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="tax_account"
                      checked={formData.tax_account}
                      onCheckedChange={(checked) => setFormData({...formData, tax_account: checked})}
                    />
                    <Label htmlFor="tax_account">Tax Account</Label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="bank_account"
                      checked={formData.bank_account}
                      onCheckedChange={(checked) => setFormData({...formData, bank_account: checked})}
                    />
                    <Label htmlFor="bank_account">Bank Account</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="cash_account"
                      checked={formData.cash_account}
                      onCheckedChange={(checked) => setFormData({...formData, cash_account: checked})}
                    />
                    <Label htmlFor="cash_account">Cash Account</Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Additional notes"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingAccount ? 'Update' : 'Create'} Account
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={formData.parent_account || 'none'} // Gunakan 'none' jika parent_account kosong
              onValueChange={(value) => {
                // Jika pengguna memilih 'none', set state menjadi string kosong
                const finalValue = value === 'none' ? '' : value;
                setFormData({...formData, parent_account: finalValue});
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select parent account (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Parent</SelectItem> {/* <-- PERUBAHAN DI SINI */}
                {accounts.filter(acc => acc.is_header_account).map((account) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    {account.code} - {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading accounts...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Code</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-right p-2">Current Balance</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Properties</th>
                    <th className="text-center p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-mono">{account.code}</td>
                      <td className="p-2">
                        <div>
                          <div className="font-medium">{account.name}</div>
                          {account.description && (
                            <div className="text-sm text-gray-500">{account.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-2">{account.account_type_name}</td>
                      <td className="p-2">
                        <Badge className={getAccountTypeColor(account.account_category)}>
                          {account.account_category}
                        </Badge>
                      </td>
                      <td className="p-2 text-right font-mono">
                        {formatCurrency(account.current_balance)}
                      </td>
                      <td className="p-2">
                        <Badge variant={account.is_active ? "default" : "secondary"}>
                          {account.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {account.is_header_account && (
                            <Badge variant="outline" className="text-xs">Header</Badge>
                          )}
                          {account.tax_account && (
                            <Badge variant="outline" className="text-xs">Tax</Badge>
                          )}
                          {account.bank_account && (
                            <Badge variant="outline" className="text-xs">Bank</Badge>
                          )}
                          {account.cash_account && (
                            <Badge variant="outline" className="text-xs">Cash</Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex justify-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(account)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(account.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {accounts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No accounts found
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChartOfAccounts;
