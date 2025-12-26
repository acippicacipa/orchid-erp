import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { useToast } from "../../hooks/use-toast";
import { History, TrendingUp, TrendingDown, AlertTriangle, Search, Archive, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { useAuth } from '../../contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Format Rupiah tanpa desimal untuk Indonesia
const formatRupiah = (amount) => {
  if (amount === null || amount === undefined || amount === '') return 'Rp 0';
  const number = Math.round(parseFloat(amount) || 0); // Bulatkan ke integer
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number);
};

const formatDateToYMD = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const HistoryDialog = ({ isOpen, onClose, stockItem, token }) => {
  const [historyData, setHistoryData] = useState({
    opening_balance: 0,
    closing_balance: 0,
    movements: [],
  });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1); // Set ke satu bulan yang lalu

    return {
      start_date: formatDateToYMD(startDate),
      end_date: formatDateToYMD(endDate),
    };
  });

  const fetchHistory = useCallback(async (currentFilters) => {
    if (!stockItem) return;
    setLoading(true);
    
    // Buat URL dengan query parameter
    const params = new URLSearchParams();
    if (currentFilters.start_date) params.append('start_date', currentFilters.start_date);
    if (currentFilters.end_date) params.append('end_date', currentFilters.end_date);
    const queryString = params.toString();

    try {
      const response = await fetch(`${API_BASE_URL}/inventory/stock/${stockItem.id}/history/?${queryString}`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch history');
      const data = await response.json();
      // --- Simpan seluruh objek respons ---
      setHistoryData(data); 
    } catch (error) {
      console.error("History fetch error:", error);
      setHistoryData({ opening_balance: 0, closing_balance: 0, movements: [] });
    } finally {
      setLoading(false);
    }
  }, [stockItem, token]);

  useEffect(() => {
    // Ambil data awal saat dialog dibuka
    if (isOpen) {
      fetchHistory(filters);
    }
  }, [isOpen, fetchHistory]);
  
  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const applyFilters = () => {
    fetchHistory(filters);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Transaction History</DialogTitle>
          {stockItem && (
            <DialogDescription>
              For: {stockItem.product_name} ({stockItem.product_sku}) at {stockItem.location_name}
            </DialogDescription>
          )}
        </DialogHeader>
        
        {/* Area Filter */}
        <div className="flex gap-4 items-end p-4 border-b">
          <div className="grid gap-2">
            <Label htmlFor="start_date">Start Date</Label>
            <Input type="date" id="start_date" name="start_date" value={filters.start_date} onChange={handleFilterChange} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="end_date">End Date</Label>
            <Input type="date" id="end_date" name="end_date" value={filters.end_date} onChange={handleFilterChange} />
          </div>
          <Button onClick={applyFilters} disabled={loading}>
            {loading ? 'Filtering...' : 'Apply Filter'}
          </Button>
        </div>

        {/* Tabel History */}
        <div className="flex-grow overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800">
                <TableCell colSpan={2} className="font-bold">Opening Balance</TableCell>
                <TableCell className="text-right font-bold">{historyData.opening_balance}</TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading history...</TableCell></TableRow>
              ) : historyData.movements.length > 0 ? (
                historyData.movements.map(move => (
                  <TableRow key={move.id}>
                    <TableCell>{new Date(move.movement_date).toLocaleString()}</TableCell>
                    <TableCell>{move.movement_type}</TableCell>
                    <TableCell className={`text-right font-bold ${move.quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {move.quantity > 0 ? '+' : ''}{move.quantity}
                    </TableCell>
                    <TableCell>{move.reference_number || 'N/A'}</TableCell>
                    <TableCell>{move.user_name || 'System'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">No transactions found for this period.</TableCell></TableRow>
              )}
              {!loading && (
                <TableRow className="bg-gray-100 dark:bg-gray-900 border-t-2">
                  <TableCell colSpan={2} className="font-bold">Closing Balance</TableCell>
                  <TableCell className="text-right font-bold">{historyData.closing_balance}</TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const StockManagement = () => {
  const [stockRecords, setStockRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { token } = useAuth();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [initialLoad, setInitialLoad] = useState(true);

  const [locations, setLocations] = useState([]);
  const [exportLocation, setExportLocation] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // --- 3. TAMBAHKAN FUNGSI UNTUK MENGAMBIL DATA LOKASI ---
  const fetchLocations = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/locations/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch locations');
      const data = await response.json();
      setLocations(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  }, [token, toast]);

  // Panggil fetchLocations saat komponen dimuat
  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleViewHistory = (stockItem) => {
    setSelectedStock(stockItem);
    setIsHistoryOpen(true);
  };

  const fetchCriticalStock = useCallback(async () => {
    setLoading(true);
    setInitialLoad(false); // Setelah pemuatan awal, set ke false
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/stock/?low_stock=true`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch critical stock levels');
      const data = await response.json();
      setStockRecords(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setStockRecords([]);
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    fetchCriticalStock();
  }, [fetchCriticalStock]);

  // 2. Logika pencarian yang sudah ada, dibungkus dengan useCallback
  const fetchStockBySearch = useCallback(async (query) => {
    if (query.length < 3) {
      // Jika query pendek, kembali tampilkan data kritis atau kosongkan
      if (stockRecords.length > 0 && !initialLoad) fetchCriticalStock();
      else setStockRecords([]);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/stock/?search=${query}`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch stock records');
      const data = await response.json();
      setStockRecords(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setStockRecords([]);
    } finally {
      setLoading(false);
    }
  }, [token, toast, fetchCriticalStock, initialLoad]);

  // Debouncing untuk input pencarian (sudah bagus)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm.length === 0 && !initialLoad) {
        fetchCriticalStock(); // Kembali ke data kritis jika search dihapus
      } else if (searchTerm.length >= 3) {
        fetchStockBySearch(searchTerm);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, fetchStockBySearch, fetchCriticalStock, initialLoad]);

  // 3. Kalkulasi untuk kartu ringkasan
  const summaryData = useMemo(() => {
    const totalValue = stockRecords.reduce((acc, stock) => acc + (stock.quantity_on_hand || 0) * (stock.average_cost || 0), 0);
    const lowStockItems = stockRecords.filter(stock => (stock.quantity_on_hand || 0) <= (stock.product?.reorder_point || 0)).length;
    const totalItems = stockRecords.length;
    return { totalValue, lowStockItems, totalItems };
  }, [stockRecords]);

  const getStockStatus = (stock) => {
    const onHand = parseFloat(stock.quantity_on_hand || 0);
    const reorderPoint = parseFloat(stock.product?.reorder_point || 0); // Ambil dari relasi product
    
    if (onHand <= 0) return { status: 'Out of Stock', color: 'text-red-600', icon: Archive };
    if (onHand <= reorderPoint) return { status: 'Reorder', color: 'text-orange-600', icon: AlertTriangle };
    return { status: 'In Stock', color: 'text-green-600', icon: TrendingUp };
  };

  const handleExport = async () => {
    if (!exportLocation) {
      toast({ title: "Warning", description: "Please select a location to export.", variant: "destructive" });
      return;
    }
    setIsExporting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/inventory/stock/export-for-opname/?location_id=${exportLocation}`,
        { headers: { 'Authorization': `Token ${token}` } }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to export data.');
      }

      const disposition = response.headers.get('content-disposition');
      const filename = disposition ? disposition.split('filename=')[1].replace(/"/g, '') : 'stock_opname.xlsx';

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({ title: "Success", description: "Stock data has been exported." });

    } catch (error) {
      toast({ title: "Export Error", description: error.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container mx-auto">
      <h2 className="text-3xl font-bold tracking-tight mb-2">Stock Management</h2>

      {/* 4. Kartu Ringkasan (Summary Cards) */}
      {/* <div className="grid gap-4 md:grid-cols-3 mb-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRupiah(summaryData.totalValue)}</div>
            <p className="text-xs text-muted-foreground">Based on average cost of displayed items</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Below Reorder Point</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Items that need immediate attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Items Displayed</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.totalItems}</div>
            <p className="text-xs text-muted-foreground">Total unique stock records shown below</p>
          </CardContent>
        </Card>
      </div> */}

      <Card className="mb-6">
        {/* <CardHeader>
          <CardTitle>Tools</CardTitle>
          <CardDescription>Export stock data for operational needs like stock opname.</CardDescription>
        </CardHeader> */}
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="grid gap-2 w-full sm:w-auto">
              <Label htmlFor="export-location">Location to Export</Label>
              <Select value={exportLocation} onValueChange={setExportLocation}>
                <SelectTrigger id="export-location" className="w-full sm:w-[280px]">
                  <SelectValue placeholder="Select a location..." />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(loc => <SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleExport} disabled={!exportLocation || isExporting}>
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export for Opname'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Stock</CardTitle>
          <CardDescription>
            Initially showing items below reorder point. Type to search all products.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by product name or SKU (min. 3 chars)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">On Hand</TableHead>
              <TableHead className="text-right">Avg. Cost</TableHead>
              <TableHead className="text-right">Total Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center">Loading...</TableCell></TableRow>
            ) : stockRecords.length > 0 ? (
              stockRecords.map((stock) => {
                const statusInfo = getStockStatus(stock);
                const StatusIcon = statusInfo.icon;
                return (
                  <TableRow key={stock.id}>
                    <TableCell>
                      <div className="font-medium">{stock.product_name}</div>
                      <div className="text-sm text-muted-foreground">{stock.product_sku || 'N/A'}</div>
                    </TableCell>
                    <TableCell>{stock.location_name || 'N/A'}</TableCell>
                    <TableCell className="text-right font-bold">{stock.quantity_on_hand || 0}</TableCell>
                    <TableCell className="text-right">{formatRupiah(stock.average_cost)}</TableCell>
                    <TableCell className="text-right">{formatRupiah((stock.quantity_on_hand || 0) * (stock.average_cost || 0))}</TableCell>
                    <TableCell>
                      <div className={`flex items-center ${statusInfo.color}`}>
                        <StatusIcon className="mr-1 h-4 w-4" />
                        {statusInfo.status}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleViewHistory(stock)}>
                        <History className="mr-1 h-4 w-4" /> History
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                  {searchTerm ? 'No stock records found for your search.' : 'No items are currently below the reorder point.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <HistoryDialog 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        stockItem={selectedStock}
        token={token}
      />
    </div>
  );
};

export default StockManagement;