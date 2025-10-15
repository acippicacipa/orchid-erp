import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Calendar, TrendingUp, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const FinancialReports = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [trialBalance, setTrialBalance] = useState(null);
  const [incomeStatement, setIncomeStatement] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [generalLedger, setGeneralLedger] = useState(null);
  const [accounts, setAccounts] = useState([]);
  
  // Filter states
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAccount, setSelectedAccount] = useState('');

  useEffect(() => {
    fetchAccounts();
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

  const fetchTrialBalance = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/accounting/financial-reports/trial_balance/?as_of_date=${asOfDate}`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTrialBalance(data);
      }
    } catch (error) {
      console.error('Error fetching trial balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIncomeStatement = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/accounting/financial-reports/income_statement/?start_date=${startDate}&end_date=${endDate}`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setIncomeStatement(data);
      }
    } catch (error) {
      console.error('Error fetching income statement:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalanceSheet = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/accounting/financial-reports/balance_sheet/?as_of_date=${asOfDate}`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setBalanceSheet(data);
      }
    } catch (error) {
      console.error('Error fetching balance sheet:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGeneralLedger = async () => {
    if (!selectedAccount) {
      alert('Please select an account for the general ledger report');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/accounting/financial-reports/general_ledger/?account_id=${selectedAccount}&start_date=${startDate}&end_date=${endDate}`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setGeneralLedger(data);
      }
    } catch (error) {
      console.error('Error fetching general ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  const exportToCSV = (data, filename) => {
    // Simple CSV export functionality
    console.log('Export to CSV:', filename, data);
    alert('Export functionality would be implemented here');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Financial Reports</h1>
      </div>

      <Tabs defaultValue="trial-balance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="general-ledger">General Ledger</TabsTrigger>
        </TabsList>

        {/* Trial Balance */}
        <TabsContent value="trial-balance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Trial Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end space-x-4 mb-4">
                <div>
                  <Label htmlFor="asOfDate">As of Date</Label>
                  <Input
                    id="asOfDate"
                    type="date"
                    value={asOfDate}
                    onChange={(e) => setAsOfDate(e.target.value)}
                  />
                </div>
                <Button onClick={fetchTrialBalance} disabled={loading}>
                  {loading ? 'Loading...' : 'Generate Report'}
                </Button>
                {trialBalance && (
                  <Button variant="outline" onClick={() => exportToCSV(trialBalance, 'trial-balance.csv')}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                )}
              </div>

              {trialBalance && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold">Trial Balance</h3>
                    <p className="text-gray-600">As of {formatDate(trialBalance.as_of_date)}</p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b-2">
                          <th className="text-left p-3">Account Code</th>
                          <th className="text-left p-3">Account Name</th>
                          <th className="text-left p-3">Type</th>
                          <th className="text-right p-3">Debit</th>
                          <th className="text-right p-3">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trialBalance.accounts.map((account, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-3 font-mono">{account.account_code}</td>
                            <td className="p-3">{account.account_name}</td>
                            <td className="p-3">
                              <Badge variant="outline">{account.account_type}</Badge>
                            </td>
                            <td className="p-3 text-right font-mono">{account.debit_formatted}</td>
                            <td className="p-3 text-right font-mono">{account.credit_formatted}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t-2 bg-gray-50">
                        <tr>
                          <td colSpan="3" className="p-3 font-bold">TOTAL</td>
                          <td className="p-3 text-right font-bold">{trialBalance.total_debits_formatted}</td>
                          <td className="p-3 text-right font-bold">{trialBalance.total_credits_formatted}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  
                  <div className="text-center">
                    {trialBalance.is_balanced ? (
                      <Badge className="bg-green-100 text-green-800">✓ Trial Balance is Balanced</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">⚠ Trial Balance is NOT Balanced</Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Income Statement */}
        <TabsContent value="income-statement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Income Statement (Profit & Loss)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end space-x-4 mb-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <Button onClick={fetchIncomeStatement} disabled={loading}>
                  {loading ? 'Loading...' : 'Generate Report'}
                </Button>
                {incomeStatement && (
                  <Button variant="outline" onClick={() => exportToCSV(incomeStatement, 'income-statement.csv')}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                )}
              </div>

              {incomeStatement && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold">Income Statement</h3>
                    <p className="text-gray-600">
                      For the period {formatDate(incomeStatement.period_start)} to {formatDate(incomeStatement.period_end)}
                    </p>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Revenue Section */}
                    <div>
                      <h4 className="text-md font-semibold mb-2 text-green-700">REVENUE</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <tbody>
                            {incomeStatement.revenue_accounts.map((account, index) => (
                              <tr key={index} className="border-b">
                                <td className="p-2">{account.account_code}</td>
                                <td className="p-2">{account.account_name}</td>
                                <td className="p-2 text-right font-mono">{account.amount_formatted}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t-2">
                            <tr>
                              <td colSpan="2" className="p-2 font-bold">Total Revenue</td>
                              <td className="p-2 text-right font-bold">{incomeStatement.total_revenue_formatted}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Expenses Section */}
                    <div>
                      <h4 className="text-md font-semibold mb-2 text-red-700">EXPENSES</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <tbody>
                            {incomeStatement.expense_accounts.map((account, index) => (
                              <tr key={index} className="border-b">
                                <td className="p-2">{account.account_code}</td>
                                <td className="p-2">{account.account_name}</td>
                                <td className="p-2 text-right font-mono">{account.amount_formatted}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t-2">
                            <tr>
                              <td colSpan="2" className="p-2 font-bold">Total Expenses</td>
                              <td className="p-2 text-right font-bold">{incomeStatement.total_expenses_formatted}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Net Income */}
                    <div className="border-t-2 pt-4">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>NET INCOME</span>
                        <span className={incomeStatement.net_income >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {incomeStatement.net_income_formatted}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balance Sheet */}
        <TabsContent value="balance-sheet" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Balance Sheet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end space-x-4 mb-4">
                <div>
                  <Label htmlFor="balanceAsOfDate">As of Date</Label>
                  <Input
                    id="balanceAsOfDate"
                    type="date"
                    value={asOfDate}
                    onChange={(e) => setAsOfDate(e.target.value)}
                  />
                </div>
                <Button onClick={fetchBalanceSheet} disabled={loading}>
                  {loading ? 'Loading...' : 'Generate Report'}
                </Button>
                {balanceSheet && (
                  <Button variant="outline" onClick={() => exportToCSV(balanceSheet, 'balance-sheet.csv')}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                )}
              </div>

              {balanceSheet && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold">Balance Sheet</h3>
                    <p className="text-gray-600">As of {formatDate(balanceSheet.as_of_date)}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Assets */}
                    <div>
                      <h4 className="text-md font-semibold mb-2 text-blue-700">ASSETS</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <tbody>
                            {balanceSheet.assets.map((account, index) => (
                              <tr key={index} className="border-b">
                                <td className="p-2">{account.account_code}</td>
                                <td className="p-2">{account.account_name}</td>
                                <td className="p-2 text-right font-mono">{account.amount_formatted}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t-2">
                            <tr>
                              <td colSpan="2" className="p-2 font-bold">Total Assets</td>
                              <td className="p-2 text-right font-bold">{balanceSheet.total_assets_formatted}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Liabilities & Equity */}
                    <div className="space-y-4">
                      {/* Liabilities */}
                      <div>
                        <h4 className="text-md font-semibold mb-2 text-red-700">LIABILITIES</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <tbody>
                              {balanceSheet.liabilities.map((account, index) => (
                                <tr key={index} className="border-b">
                                  <td className="p-2">{account.account_code}</td>
                                  <td className="p-2">{account.account_name}</td>
                                  <td className="p-2 text-right font-mono">{account.amount_formatted}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="border-t-2">
                              <tr>
                                <td colSpan="2" className="p-2 font-bold">Total Liabilities</td>
                                <td className="p-2 text-right font-bold">{balanceSheet.total_liabilities_formatted}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>

                      {/* Equity */}
                      <div>
                        <h4 className="text-md font-semibold mb-2 text-green-700">EQUITY</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <tbody>
                              {balanceSheet.equity.map((account, index) => (
                                <tr key={index} className="border-b">
                                  <td className="p-2">{account.account_code}</td>
                                  <td className="p-2">{account.account_name}</td>
                                  <td className="p-2 text-right font-mono">{account.amount_formatted}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="border-t-2">
                              <tr>
                                <td colSpan="2" className="p-2 font-bold">Total Equity</td>
                                <td className="p-2 text-right font-bold">{balanceSheet.total_equity_formatted}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>

                      {/* Total Liabilities & Equity */}
                      <div className="border-t-2 pt-2">
                        <div className="flex justify-between items-center font-bold">
                          <span>Total Liabilities & Equity</span>
                          <span>{balanceSheet.total_liabilities_equity_formatted}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    {balanceSheet.is_balanced ? (
                      <Badge className="bg-green-100 text-green-800">✓ Balance Sheet is Balanced</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">⚠ Balance Sheet is NOT Balanced</Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Ledger */}
        <TabsContent value="general-ledger" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                General Ledger
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end space-x-4 mb-4">
                <div>
                  <Label htmlFor="selectedAccount">Account</Label>
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger className="w-64">
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
                </div>
                <div>
                  <Label htmlFor="ledgerStartDate">Start Date</Label>
                  <Input
                    id="ledgerStartDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="ledgerEndDate">End Date</Label>
                  <Input
                    id="ledgerEndDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <Button onClick={fetchGeneralLedger} disabled={loading || !selectedAccount}>
                  {loading ? 'Loading...' : 'Generate Report'}
                </Button>
                {generalLedger && (
                  <Button variant="outline" onClick={() => exportToCSV(generalLedger, 'general-ledger.csv')}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                )}
              </div>

              {generalLedger && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold">General Ledger</h3>
                    <p className="text-gray-600">
                      Account: {generalLedger.account.code} - {generalLedger.account.name}
                    </p>
                    <p className="text-gray-600">
                      Period: {formatDate(generalLedger.period_start)} to {formatDate(generalLedger.period_end)}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-semibold">Opening Balance: </span>
                        <span className="font-mono">{generalLedger.opening_balance_formatted}</span>
                      </div>
                      <div>
                        <span className="font-semibold">Closing Balance: </span>
                        <span className="font-mono">{generalLedger.closing_balance_formatted}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b-2">
                          <th className="text-left p-3">Date</th>
                          <th className="text-left p-3">Entry #</th>
                          <th className="text-left p-3">Description</th>
                          <th className="text-left p-3">Reference</th>
                          <th className="text-right p-3">Debit</th>
                          <th className="text-right p-3">Credit</th>
                          <th className="text-right p-3">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generalLedger.entries.map((entry, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-3">{formatDate(entry.date)}</td>
                            <td className="p-3 font-mono">{entry.entry_number}</td>
                            <td className="p-3">{entry.description}</td>
                            <td className="p-3">{entry.reference}</td>
                            <td className="p-3 text-right font-mono">{entry.debit_formatted}</td>
                            <td className="p-3 text-right font-mono">{entry.credit_formatted}</td>
                            <td className="p-3 text-right font-mono">{entry.balance_formatted}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t-2 bg-gray-50">
                        <tr>
                          <td colSpan="4" className="p-3 font-bold">TOTALS</td>
                          <td className="p-3 text-right font-bold">{generalLedger.total_debits_formatted}</td>
                          <td className="p-3 text-right font-bold">{generalLedger.total_credits_formatted}</td>
                          <td className="p-3 text-right font-bold">{generalLedger.closing_balance_formatted}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialReports;
