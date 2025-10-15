import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Edit, Plus, Search, CheckCircle, XCircle, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const JournalEntries = () => {
  const { token } = useAuth();
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    entry_type: 'MANUAL',
    reference_number: '',
    description: '',
    notes: '',
    lines: [
      { account: '', description: '', debit_amount: 0, credit_amount: 0 },
      { account: '', description: '', debit_amount: 0, credit_amount: 0 }
    ]
  });

  useEffect(() => {
    fetchAccounts();
    fetchEntries();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounting/accounts/?is_active=true', {
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
    }
  };

  const fetchEntries = async () => {
    try {
      setLoading(true);
      let url = '/api/accounting/journal-entries/';
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      
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
        setEntries(Array.isArray(data) ? data : data.results || []);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchEntries();
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, statusFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate that debits equal credits
    const totalDebits = formData.lines.reduce((sum, line) => sum + (parseFloat(line.debit_amount) || 0), 0);
    const totalCredits = formData.lines.reduce((sum, line) => sum + (parseFloat(line.credit_amount) || 0), 0);
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      alert('Total debits must equal total credits');
      return;
    }

    try {
      const url = editingEntry 
        ? `/api/accounting/journal-entries/${editingEntry.id}/`
        : '/api/accounting/journal-entries/';
      
      const method = editingEntry ? 'PUT' : 'POST';
      
      // Filter out empty lines
      const validLines = formData.lines.filter(line => 
        line.account && (parseFloat(line.debit_amount) > 0 || parseFloat(line.credit_amount) > 0)
      );

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          lines: validLines
        }),
      });

      if (response.ok) {
        fetchEntries();
        setIsDialogOpen(false);
        resetForm();
      } else {
        const errorData = await response.json();
        console.error('Error saving entry:', errorData);
        alert('Error saving journal entry. Please check your data.');
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Error saving journal entry. Please try again.');
    }
  };

  const handlePostEntry = async (entryId) => {
    if (window.confirm('Are you sure you want to post this journal entry? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/accounting/journal-entries/${entryId}/post_entry/`, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          fetchEntries();
        } else {
          const errorData = await response.json();
          alert(errorData.error || 'Error posting journal entry');
        }
      } catch (error) {
        console.error('Error posting entry:', error);
        alert('Error posting journal entry. Please try again.');
      }
    }
  };

  const handleCancelEntry = async (entryId) => {
    if (window.confirm('Are you sure you want to cancel this journal entry?')) {
      try {
        const response = await fetch(`/api/accounting/journal-entries/${entryId}/cancel_entry/`, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          fetchEntries();
        } else {
          const errorData = await response.json();
          alert(errorData.error || 'Error cancelling journal entry');
        }
      } catch (error) {
        console.error('Error cancelling entry:', error);
      }
    }
  };

  const handleEdit = (entry) => {
    if (entry.status !== 'DRAFT') {
      alert('Only draft entries can be edited');
      return;
    }
    
    setEditingEntry(entry);
    setFormData({
      entry_date: entry.entry_date,
      entry_type: entry.entry_type,
      reference_number: entry.reference_number || '',
      description: entry.description,
      notes: entry.notes || '',
      lines: entry.lines.length > 0 ? entry.lines.map(line => ({
        account: line.account.toString(),
        description: line.description || '',
        debit_amount: line.debit_amount,
        credit_amount: line.credit_amount
      })) : [
        { account: '', description: '', debit_amount: 0, credit_amount: 0 },
        { account: '', description: '', debit_amount: 0, credit_amount: 0 }
      ]
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this journal entry?')) {
      try {
        const response = await fetch(`/api/accounting/journal-entries/${id}/`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Token ${token}`,
          },
        });

        if (response.ok) {
          fetchEntries();
        }
      } catch (error) {
        console.error('Error deleting entry:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      entry_date: new Date().toISOString().split('T')[0],
      entry_type: 'MANUAL',
      reference_number: '',
      description: '',
      notes: '',
      lines: [
        { account: '', description: '', debit_amount: 0, credit_amount: 0 },
        { account: '', description: '', debit_amount: 0, credit_amount: 0 }
      ]
    });
    setEditingEntry(null);
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { account: '', description: '', debit_amount: 0, credit_amount: 0 }]
    });
  };

  const removeLine = (index) => {
    if (formData.lines.length > 2) {
      const newLines = formData.lines.filter((_, i) => i !== index);
      setFormData({ ...formData, lines: newLines });
    }
  };

  const updateLine = (index, field, value) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setFormData({ ...formData, lines: newLines });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status) => {
    const colors = {
      'DRAFT': 'bg-yellow-100 text-yellow-800',
      'POSTED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTotalDebits = () => {
    return formData.lines.reduce((sum, line) => sum + (parseFloat(line.debit_amount) || 0), 0);
  };

  const getTotalCredits = () => {
    return formData.lines.reduce((sum, line) => sum + (parseFloat(line.credit_amount) || 0), 0);
  };

  const isBalanced = () => {
    return Math.abs(getTotalDebits() - getTotalCredits()) < 0.01;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Journal Entries</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl grid grid-rows-[auto_1fr_auto] h-[90vh] p-0">
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle>
                {editingEntry ? 'Edit Journal Entry' : 'Add New Journal Entry'}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto px-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="entry_date">Entry Date</Label>
                    <Input
                      id="entry_date"
                      type="date"
                      value={formData.entry_date}
                      onChange={(e) => setFormData({...formData, entry_date: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="entry_type">Entry Type</Label>
                    <Select
                      value={formData.entry_type}
                      onValueChange={(value) => setFormData({...formData, entry_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MANUAL">Manual Entry</SelectItem>
                        <SelectItem value="SALES">Sales Transaction</SelectItem>
                        <SelectItem value="PURCHASE">Purchase Transaction</SelectItem>
                        <SelectItem value="INVENTORY">Inventory Adjustment</SelectItem>
                        <SelectItem value="PAYMENT">Payment</SelectItem>
                        <SelectItem value="RECEIPT">Receipt</SelectItem>
                        <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                        <SelectItem value="CLOSING">Closing Entry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="reference_number">Reference Number</Label>
                    <Input
                      id="reference_number"
                      value={formData.reference_number}
                      onChange={(e) => setFormData({...formData, reference_number: e.target.value})}
                      placeholder="Optional reference"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Entry description"
                    required
                  />
                </div>

                {/* Journal Lines */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <Label>Journal Lines</Label>
                    <Button type="button" onClick={addLine} variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Line
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3">Account</th>
                          <th className="text-left p-3">Description</th>
                          <th className="text-right p-3">Debit</th>
                          <th className="text-right p-3">Credit</th>
                          <th className="text-center p-3">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.lines.map((line, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-3">
                              <Select
                                value={line.account}
                                onValueChange={(value) => updateLine(index, 'account', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                                <SelectContent>
                                  {accounts.map((account) => (
                                    <SelectItem key={account.id} value={account.id.toString()}>
                                      {account.code} - {account.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3">
                              <Input
                                value={line.description}
                                onChange={(e) => updateLine(index, 'description', e.target.value)}
                                placeholder="Line description"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                step="0.01"
                                value={line.debit_amount}
                                onChange={(e) => updateLine(index, 'debit_amount', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                className="text-right"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                step="0.01"
                                value={line.credit_amount}
                                onChange={(e) => updateLine(index, 'credit_amount', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                className="text-right"
                              />
                            </td>
                            <td className="p-3 text-center">
                              {formData.lines.length > 2 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeLine(index)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t">
                        <tr>
                          <td colSpan="2" className="p-3 font-semibold">Totals:</td>
                          <td className="p-3 text-right font-semibold">
                            {formatCurrency(getTotalDebits())}
                          </td>
                          <td className="p-3 text-right font-semibold">
                            {formatCurrency(getTotalCredits())}
                          </td>
                          <td className="p-3 text-center">
                            {isBalanced() ? (
                              <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  
                  {!isBalanced() && (
                    <div className="text-red-600 text-sm mt-2">
                      Warning: Debits and credits must be equal
                    </div>
                  )}
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
                  <Button type="submit" disabled={!isBalanced()}>
                    {editingEntry ? 'Update' : 'Create'} Entry
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
                  placeholder="Search entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select 
              value={statusFilter || 'all'} // Gunakan 'all' jika statusFilter kosong
              onValueChange={(value) => {
                // Jika pengguna memilih 'all', set state menjadi string kosong
                setStatusFilter(value === 'all' ? '' : value);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem> {/* <-- PERUBAHAN DI SINI */}
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="POSTED">Posted</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

          </div>
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Journal Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading entries...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Entry Number</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-right p-2">Total Amount</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-center p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-mono">{entry.entry_number}</td>
                      <td className="p-2">{new Date(entry.entry_date).toLocaleDateString('id-ID')}</td>
                      <td className="p-2">{entry.entry_type}</td>
                      <td className="p-2">
                        <div>
                          <div className="font-medium">{entry.description}</div>
                          {entry.reference_number && (
                            <div className="text-sm text-gray-500">Ref: {entry.reference_number}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-right font-mono">
                        {formatCurrency(entry.total_debit)}
                      </td>
                      <td className="p-2">
                        <Badge className={getStatusColor(entry.status)}>
                          {entry.status}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="flex justify-center space-x-1">
                          {entry.status === 'DRAFT' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(entry)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePostEntry(entry.id)}
                                className="text-green-600 hover:text-green-800"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancelEntry(entry.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {entry.status === 'DRAFT' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(entry.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {entries.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No journal entries found
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JournalEntries;
