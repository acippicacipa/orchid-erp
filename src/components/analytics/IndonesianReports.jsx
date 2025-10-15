import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, Download, Calendar, Building, Receipt, Calculator,
  TrendingUp, BarChart3, PieChart, FileSpreadsheet, Printer,
  CheckCircle, AlertTriangle, Clock, RefreshCw, Eye, Settings
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, PieChart as RechartsPieChart, Cell, ComposedChart, Area, AreaChart
} from 'recharts';
import DatePicker from 'react-datepicker';
import { useAuth } from '@/contexts/AuthContext';

const IndonesianReports = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState('');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState(null);
  const [companyInfo, setCompanyInfo] = useState({
    name: 'PT. Orchid Indonesia',
    npwp: '01.234.567.8-901.000',
    address: 'Jl. Sudirman No. 123, Jakarta Pusat',
    phone: '+62 21 1234 5678',
    email: 'info@orchid.co.id'
  });

  const indonesianReports = [
    {
      id: 'laporan_laba_rugi',
      name: 'Laporan Laba Rugi',
      description: 'Income Statement sesuai standar akuntansi Indonesia',
      category: 'FINANCIAL',
      icon: <TrendingUp className="h-5 w-5" />,
      required: true
    },
    {
      id: 'neraca',
      name: 'Neraca',
      description: 'Balance Sheet sesuai PSAK',
      category: 'FINANCIAL',
      icon: <BarChart3 className="h-5 w-5" />,
      required: true
    },
    {
      id: 'laporan_arus_kas',
      name: 'Laporan Arus Kas',
      description: 'Cash Flow Statement',
      category: 'FINANCIAL',
      icon: <Calculator className="h-5 w-5" />,
      required: true
    },
    {
      id: 'laporan_penjualan',
      name: 'Laporan Penjualan',
      description: 'Sales Report dengan rincian PPN',
      category: 'SALES',
      icon: <Receipt className="h-5 w-5" />,
      required: false
    },
    {
      id: 'laporan_pembelian',
      name: 'Laporan Pembelian',
      description: 'Purchase Report dengan rincian PPN Masukan',
      category: 'PURCHASING',
      icon: <FileSpreadsheet className="h-5 w-5" />,
      required: false
    },
    {
      id: 'laporan_persediaan',
      name: 'Laporan Persediaan',
      description: 'Inventory Report dengan metode penilaian',
      category: 'INVENTORY',
      icon: <Building className="h-5 w-5" />,
      required: false
    },
    {
      id: 'spt_masa_ppn',
      name: 'SPT Masa PPN',
      description: 'Laporan PPN Bulanan untuk pelaporan pajak',
      category: 'TAX',
      icon: <FileText className="h-5 w-5" />,
      required: true
    },
    {
      id: 'buku_besar',
      name: 'Buku Besar',
      description: 'General Ledger sesuai format Indonesia',
      category: 'ACCOUNTING',
      icon: <FileText className="h-5 w-5" />,
      required: true
    }
  ];

  useEffect(() => {
    if (selectedReport && dateRange.from && dateRange.to) {
      generateReport();
    }
  }, [selectedReport, dateRange]);

  const generateReport = async () => {
    if (!selectedReport || !dateRange.from || !dateRange.to) return;

    setLoading(true);
    try {
      // Simulate API call for Indonesian reports
      const response = await fetch('/api/analytics/indonesian-reports/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          report_type: selectedReport,
          start_date: dateRange.from.toISOString(),
          end_date: dateRange.to.toISOString(),
          company_info: companyInfo
        })
      });

      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      } else {
        // Generate mock data for demonstration
        setReportData(generateMockData(selectedReport));
      }
    } catch (error) {
      console.error('Error generating report:', error);
      // Generate mock data for demonstration
      setReportData(generateMockData(selectedReport));
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = (reportType) => {
    const baseData = {
      report_type: reportType,
      period: {
        start: dateRange.from.toISOString(),
        end: dateRange.to.toISOString()
      },
      company: companyInfo,
      generated_at: new Date().toISOString()
    };

    switch (reportType) {
      case 'laporan_laba_rugi':
        return {
          ...baseData,
          data: {
            pendapatan: {
              penjualan_bersih: 2500000000,
              pendapatan_lain: 150000000,
              total_pendapatan: 2650000000
            },
            beban: {
              harga_pokok_penjualan: 1800000000,
              beban_operasional: 450000000,
              beban_bunga: 25000000,
              total_beban: 2275000000
            },
            laba_rugi: {
              laba_kotor: 700000000,
              laba_operasional: 250000000,
              laba_sebelum_pajak: 375000000,
              pajak_penghasilan: 93750000,
              laba_bersih: 281250000
            }
          }
        };

      case 'neraca':
        return {
          ...baseData,
          data: {
            aktiva: {
              aktiva_lancar: {
                kas_dan_setara_kas: 500000000,
                piutang_usaha: 750000000,
                persediaan: 1200000000,
                total_aktiva_lancar: 2450000000
              },
              aktiva_tetap: {
                tanah: 800000000,
                bangunan: 1500000000,
                mesin_dan_peralatan: 2000000000,
                akumulasi_penyusutan: -600000000,
                total_aktiva_tetap: 3700000000
              },
              total_aktiva: 6150000000
            },
            kewajiban: {
              kewajiban_lancar: {
                hutang_usaha: 650000000,
                hutang_pajak: 125000000,
                total_kewajiban_lancar: 775000000
              },
              kewajiban_jangka_panjang: {
                hutang_bank: 2000000000,
                total_kewajiban_jangka_panjang: 2000000000
              },
              total_kewajiban: 2775000000
            },
            ekuitas: {
              modal_saham: 2000000000,
              laba_ditahan: 1375000000,
              total_ekuitas: 3375000000
            }
          }
        };

      case 'spt_masa_ppn':
        return {
          ...baseData,
          data: {
            ppn_keluaran: {
              penjualan_dalam_negeri: 275000000, // 11% dari 2.5M
              ekspor: 0,
              total_ppn_keluaran: 275000000
            },
            ppn_masukan: {
              pembelian_barang: 198000000, // 11% dari 1.8M
              pembelian_jasa: 22000000,
              total_ppn_masukan: 220000000
            },
            ppn_kurang_bayar: 55000000,
            denda: 0,
            total_setor: 55000000
          }
        };

      case 'laporan_penjualan':
        return {
          ...baseData,
          data: {
            summary: {
              total_penjualan: 2500000000,
              total_ppn: 275000000,
              total_termasuk_ppn: 2775000000,
              jumlah_transaksi: 1250
            },
            by_month: [
              { month: 'Jan', sales: 200000000, ppn: 22000000 },
              { month: 'Feb', sales: 180000000, ppn: 19800000 },
              { month: 'Mar', sales: 220000000, ppn: 24200000 },
              { month: 'Apr', sales: 210000000, ppn: 23100000 },
              { month: 'May', sales: 240000000, ppn: 26400000 },
              { month: 'Jun', sales: 250000000, ppn: 27500000 }
            ]
          }
        };

      default:
        return {
          ...baseData,
          data: {
            message: 'Report data not available'
          }
        };
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

  const formatNumber = (number) => {
    return new Intl.NumberFormat('id-ID').format(number);
  };

  const exportReport = (format) => {
    if (!reportData) return;

    const reportName = indonesianReports.find(r => r.id === selectedReport)?.name || 'Report';
    const filename = `${reportName}_${dateRange.from.toISOString().split('T')[0]}_${dateRange.to.toISOString().split('T')[0]}`;

    if (format === 'pdf') {
      // In a real implementation, this would generate a PDF
      alert('PDF export functionality would be implemented here');
    } else if (format === 'excel') {
      // In a real implementation, this would generate an Excel file
      alert('Excel export functionality would be implemented here');
    } else if (format === 'print') {
      window.print();
    }
  };

  const renderFinancialReport = () => {
    if (!reportData || !reportData.data) return null;

    switch (selectedReport) {
      case 'laporan_laba_rugi':
        const { pendapatan, beban, laba_rugi } = reportData.data;
        return (
          <div className="space-y-6">
            <div className="text-center border-b pb-4">
              <h2 className="text-2xl font-bold">{companyInfo.name}</h2>
              <h3 className="text-xl">LAPORAN LABA RUGI</h3>
              <p className="text-gray-600">
                Periode: {new Date(dateRange.from).toLocaleDateString('id-ID')} s/d {new Date(dateRange.to).toLocaleDateString('id-ID')}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-lg mb-2">PENDAPATAN</h4>
                <div className="ml-4 space-y-1">
                  <div className="flex justify-between">
                    <span>Penjualan Bersih</span>
                    <span>{formatCurrency(pendapatan.penjualan_bersih)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pendapatan Lain-lain</span>
                    <span>{formatCurrency(pendapatan.pendapatan_lain)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>Total Pendapatan</span>
                    <span>{formatCurrency(pendapatan.total_pendapatan)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-lg mb-2">BEBAN</h4>
                <div className="ml-4 space-y-1">
                  <div className="flex justify-between">
                    <span>Harga Pokok Penjualan</span>
                    <span>{formatCurrency(beban.harga_pokok_penjualan)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Beban Operasional</span>
                    <span>{formatCurrency(beban.beban_operasional)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Beban Bunga</span>
                    <span>{formatCurrency(beban.beban_bunga)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>Total Beban</span>
                    <span>{formatCurrency(beban.total_beban)}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-bold text-lg mb-2">LABA RUGI</h4>
                <div className="ml-4 space-y-1">
                  <div className="flex justify-between">
                    <span>Laba Kotor</span>
                    <span className="text-green-600 font-medium">{formatCurrency(laba_rugi.laba_kotor)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Laba Operasional</span>
                    <span className="text-green-600 font-medium">{formatCurrency(laba_rugi.laba_operasional)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Laba Sebelum Pajak</span>
                    <span className="text-green-600 font-medium">{formatCurrency(laba_rugi.laba_sebelum_pajak)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pajak Penghasilan</span>
                    <span className="text-red-600">{formatCurrency(laba_rugi.pajak_penghasilan)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>LABA BERSIH</span>
                    <span className="text-green-600">{formatCurrency(laba_rugi.laba_bersih)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'neraca':
        const { aktiva, kewajiban, ekuitas } = reportData.data;
        return (
          <div className="space-y-6">
            <div className="text-center border-b pb-4">
              <h2 className="text-2xl font-bold">{companyInfo.name}</h2>
              <h3 className="text-xl">NERACA</h3>
              <p className="text-gray-600">
                Per {new Date(dateRange.to).toLocaleDateString('id-ID')}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h4 className="font-bold text-lg mb-4">AKTIVA</h4>
                
                <div className="mb-4">
                  <h5 className="font-semibold mb-2">Aktiva Lancar</h5>
                  <div className="ml-4 space-y-1">
                    <div className="flex justify-between">
                      <span>Kas dan Setara Kas</span>
                      <span>{formatCurrency(aktiva.aktiva_lancar.kas_dan_setara_kas)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Piutang Usaha</span>
                      <span>{formatCurrency(aktiva.aktiva_lancar.piutang_usaha)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Persediaan</span>
                      <span>{formatCurrency(aktiva.aktiva_lancar.persediaan)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1">
                      <span>Total Aktiva Lancar</span>
                      <span>{formatCurrency(aktiva.aktiva_lancar.total_aktiva_lancar)}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h5 className="font-semibold mb-2">Aktiva Tetap</h5>
                  <div className="ml-4 space-y-1">
                    <div className="flex justify-between">
                      <span>Tanah</span>
                      <span>{formatCurrency(aktiva.aktiva_tetap.tanah)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bangunan</span>
                      <span>{formatCurrency(aktiva.aktiva_tetap.bangunan)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mesin dan Peralatan</span>
                      <span>{formatCurrency(aktiva.aktiva_tetap.mesin_dan_peralatan)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Akumulasi Penyusutan</span>
                      <span className="text-red-600">{formatCurrency(aktiva.aktiva_tetap.akumulasi_penyusutan)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1">
                      <span>Total Aktiva Tetap</span>
                      <span>{formatCurrency(aktiva.aktiva_tetap.total_aktiva_tetap)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>TOTAL AKTIVA</span>
                  <span>{formatCurrency(aktiva.total_aktiva)}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-lg mb-4">KEWAJIBAN & EKUITAS</h4>
                
                <div className="mb-4">
                  <h5 className="font-semibold mb-2">Kewajiban Lancar</h5>
                  <div className="ml-4 space-y-1">
                    <div className="flex justify-between">
                      <span>Hutang Usaha</span>
                      <span>{formatCurrency(kewajiban.kewajiban_lancar.hutang_usaha)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hutang Pajak</span>
                      <span>{formatCurrency(kewajiban.kewajiban_lancar.hutang_pajak)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1">
                      <span>Total Kewajiban Lancar</span>
                      <span>{formatCurrency(kewajiban.kewajiban_lancar.total_kewajiban_lancar)}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h5 className="font-semibold mb-2">Kewajiban Jangka Panjang</h5>
                  <div className="ml-4 space-y-1">
                    <div className="flex justify-between">
                      <span>Hutang Bank</span>
                      <span>{formatCurrency(kewajiban.kewajiban_jangka_panjang.hutang_bank)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1">
                      <span>Total Kewajiban Jangka Panjang</span>
                      <span>{formatCurrency(kewajiban.kewajiban_jangka_panjang.total_kewajiban_jangka_panjang)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between font-semibold border-t pt-2 mb-4">
                  <span>TOTAL KEWAJIBAN</span>
                  <span>{formatCurrency(kewajiban.total_kewajiban)}</span>
                </div>

                <div className="mb-4">
                  <h5 className="font-semibold mb-2">Ekuitas</h5>
                  <div className="ml-4 space-y-1">
                    <div className="flex justify-between">
                      <span>Modal Saham</span>
                      <span>{formatCurrency(ekuitas.modal_saham)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Laba Ditahan</span>
                      <span>{formatCurrency(ekuitas.laba_ditahan)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1">
                      <span>Total Ekuitas</span>
                      <span>{formatCurrency(ekuitas.total_ekuitas)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>TOTAL KEWAJIBAN & EKUITAS</span>
                  <span>{formatCurrency(kewajiban.total_kewajiban + ekuitas.total_ekuitas)}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'spt_masa_ppn':
        const { ppn_keluaran, ppn_masukan, ppn_kurang_bayar } = reportData.data;
        return (
          <div className="space-y-6">
            <div className="text-center border-b pb-4">
              <h2 className="text-2xl font-bold">{companyInfo.name}</h2>
              <h3 className="text-xl">SPT MASA PPN</h3>
              <p className="text-gray-600">NPWP: {companyInfo.npwp}</p>
              <p className="text-gray-600">
                Masa Pajak: {new Date(dateRange.from).toLocaleDateString('id-ID')} s/d {new Date(dateRange.to).toLocaleDateString('id-ID')}
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-lg mb-2">PPN KELUARAN</h4>
                <div className="ml-4 space-y-1">
                  <div className="flex justify-between">
                    <span>Penjualan Dalam Negeri (11%)</span>
                    <span>{formatCurrency(ppn_keluaran.penjualan_dalam_negeri)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ekspor (0%)</span>
                    <span>{formatCurrency(ppn_keluaran.ekspor)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>Total PPN Keluaran</span>
                    <span>{formatCurrency(ppn_keluaran.total_ppn_keluaran)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-lg mb-2">PPN MASUKAN</h4>
                <div className="ml-4 space-y-1">
                  <div className="flex justify-between">
                    <span>Pembelian Barang</span>
                    <span>{formatCurrency(ppn_masukan.pembelian_barang)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pembelian Jasa</span>
                    <span>{formatCurrency(ppn_masukan.pembelian_jasa)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>Total PPN Masukan</span>
                    <span>{formatCurrency(ppn_masukan.total_ppn_masukan)}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>PPN Kurang Bayar</span>
                    <span className="text-red-600">{formatCurrency(ppn_kurang_bayar)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Denda</span>
                    <span>{formatCurrency(reportData.data.denda)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-xl border-t pt-2">
                    <span>TOTAL YANG HARUS DISETOR</span>
                    <span className="text-red-600">{formatCurrency(reportData.data.total_setor)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'laporan_penjualan':
        const { summary, by_month } = reportData.data;
        return (
          <div className="space-y-6">
            <div className="text-center border-b pb-4">
              <h2 className="text-2xl font-bold">{companyInfo.name}</h2>
              <h3 className="text-xl">LAPORAN PENJUALAN</h3>
              <p className="text-gray-600">
                Periode: {new Date(dateRange.from).toLocaleDateString('id-ID')} s/d {new Date(dateRange.to).toLocaleDateString('id-ID')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-lg mb-4">RINGKASAN PENJUALAN</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Penjualan (Belum Termasuk PPN)</span>
                    <span className="font-medium">{formatCurrency(summary.total_penjualan)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total PPN (11%)</span>
                    <span className="font-medium">{formatCurrency(summary.total_ppn)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Total Termasuk PPN</span>
                    <span>{formatCurrency(summary.total_termasuk_ppn)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Jumlah Transaksi</span>
                    <span className="font-medium">{formatNumber(summary.jumlah_transaksi)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-lg mb-4">GRAFIK PENJUALAN BULANAN</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={by_month}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="sales" fill="#3B82F6" name="Penjualan" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-4">RINCIAN PENJUALAN BULANAN</h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-2 text-left">Bulan</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Penjualan</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">PPN</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {by_month.map((month, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-4 py-2">{month.month}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(month.sales)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(month.ppn)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right font-medium">{formatCurrency(month.sales + month.ppn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Report content will be displayed here</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Laporan Indonesia</h1>
          <p className="text-gray-600">Laporan keuangan dan pajak sesuai standar Indonesia</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Report Selection */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Pilih Laporan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="report-select">Jenis Laporan</Label>
                  <Select value={selectedReport} onValueChange={setSelectedReport}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih laporan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {indonesianReports.map((report) => (
                        <SelectItem key={report.id} value={report.id}>
                          <div className="flex items-center">
                            {report.icon}
                            <span className="ml-2">{report.name}</span>
                            {report.required && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Wajib
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* ============================================================================== */}
                {/* PERUBAHAN UTAMA DI SINI: Menggunakan react-datepicker */}
                {/* ============================================================================== */}
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="date-from">Dari Tanggal</Label>
                    <DatePicker
                      id="date-from"
                      selected={dateRange.from}
                      onChange={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                      selectsStart
                      startDate={dateRange.from}
                      endDate={dateRange.to}
                      dateFormat="dd/MM/yyyy"
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date-to">Sampai Tanggal</Label>
                    <DatePicker
                      id="date-to"
                      selected={dateRange.to}
                      onChange={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                      selectsEnd
                      startDate={dateRange.from}
                      endDate={dateRange.to}
                      minDate={dateRange.from}
                      dateFormat="dd/MM/yyyy"
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                </div>


                {selectedReport && (
                  <div className="pt-4 border-t">
                    <div className="space-y-2">
                      <Button 
                        onClick={generateReport} 
                        disabled={loading}
                        className="w-full"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            Generate Report
                          </>
                        )}
                      </Button>

                      {reportData && (
                        <div className="space-y-2">
                          <Button 
                            onClick={() => exportReport('pdf')} 
                            variant="outline"
                            className="w-full"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export PDF
                          </Button>
                          <Button 
                            onClick={() => exportReport('excel')} 
                            variant="outline"
                            className="w-full"
                          >
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            Export Excel
                          </Button>
                          <Button 
                            onClick={() => exportReport('print')} 
                            variant="outline"
                            className="w-full"
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Report Categories */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Kategori Laporan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {['FINANCIAL', 'SALES', 'PURCHASING', 'INVENTORY', 'TAX', 'ACCOUNTING'].map((category) => {
                  const count = indonesianReports.filter(r => r.category === category).length;
                  return (
                    <div key={category} className="flex justify-between items-center">
                      <span className="text-sm">{category}</span>
                      <Badge variant="outline" className="text-xs">
                        {count}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Display */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-6">
              {loading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Generating Indonesian report...</p>
                  </div>
                </div>
              ) : reportData ? (
                <div className="print:p-0">
                  {renderFinancialReport()}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Pilih Laporan</h3>
                  <p className="text-gray-600 mb-4">
                    Pilih jenis laporan dan periode untuk menampilkan laporan Indonesia.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    {indonesianReports.slice(0, 4).map((report) => (
                      <div
                        key={report.id}
                        className="p-4 border rounded-lg hover:border-blue-500 cursor-pointer transition-colors"
                        onClick={() => setSelectedReport(report.id)}
                      >
                        <div className="text-center">
                          {report.icon}
                          <p className="text-sm font-medium mt-2">{report.name}</p>
                          {report.required && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              Wajib
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default IndonesianReports;
