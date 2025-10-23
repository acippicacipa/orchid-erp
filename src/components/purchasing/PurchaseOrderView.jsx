import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

// Fungsi bantuan bisa diletakkan di sini atau diimpor dari file utilitas terpusat
const formatRupiah = (amount, withDecimal = false) => {
  if (amount === null || amount === undefined || amount === '') return withDecimal ? 'Rp 0,00' : 'Rp 0';
  const number = parseFloat(amount) || 0;
  const options = { style: 'currency', currency: 'IDR', minimumFractionDigits: withDecimal ? 2 : 0, maximumFractionDigits: withDecimal ? 2 : 0 };
  return new Intl.NumberFormat('id-ID', options).format(number);
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
};

// ==============================================================================
// INTI DARI PERUBAHAN: Gunakan React.forwardRef
// Ini memungkinkan komponen untuk menerima 'ref' dari komponen induknya.
// ==============================================================================
export const PurchaseOrderView = React.forwardRef(({ order }, ref) => {
  // Jika tidak ada data order, tampilkan pesan.
  if (!order) {
    return (
      <div className="p-8 text-center" ref={ref}>
        No order data provided.
      </div>
    );
  }

  // Kalkulasi total (tetap di sini untuk ditampilkan di UI)
  const subtotal = order.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const tax = parseFloat(order.tax_percentage) > 0 ? subtotal * (parseFloat(order.tax_percentage) / 100) : 0;
  const shipping = parseFloat(order.shipping_cost) || 0;
  const total = subtotal + tax + shipping;

  return (
    // Pasang 'ref' yang diterima dari parent ke div pembungkus utama ini.
    // Inilah elemen yang akan "difoto" oleh html2canvas.
    <div ref={ref}>
      <div className="bg-white p-8 max-w-4xl mx-auto font-sans">
        {/* 1. Header Dokumen */}
        <header className="flex justify-between items-start pb-6 border-b-2 border-gray-800">
          <div className="flex items-center">
            {/* Ganti dengan logo perusahaan Anda atau hapus jika tidak ada */}
            {/* <img src="/logo.png" alt="Company Logo" className="h-16 w-16 mr-4" /> */}
            <div>
              <h1 className="text-xl font-bold text-gray-800">PT. PUSPA PESONA KREASINDO</h1>
              <p className="text-sm text-gray-500">Jl. Pakal No. 21 Surabaya</p>
              <p className="text-sm text-gray-500">Telepon: (021) 123-4567 | Email: info@perusahaan.com</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold uppercase text-gray-800 tracking-wider">Purchase Order</h2>
            <p className="text-md text-gray-600 mt-1">
              <span className="font-semibold">PO #:</span> {order.order_number || 'N/A'}
            </p>
            <p className="text-md text-gray-600">
              <span className="font-semibold">Date:</span> {formatDate(order.order_date)}
            </p>
          </div>
        </header>

        {/* 2. Informasi Supplier & Pengiriman */}
        <section className="grid grid-cols-2 gap-8 mt-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-bold uppercase text-gray-500 mb-2">Supplier</h3>
            <p className="text-lg font-semibold text-gray-800">{order.supplier?.name || 'N/A'}</p>
            <p className="text-sm text-gray-600">{order.supplier?.address?.street || 'Alamat tidak tersedia'}</p>
            <p className="text-sm text-gray-600">{order.supplier?.email || ''}</p>
            <p className="text-sm text-gray-600">{order.supplier?.phone || ''}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-bold uppercase text-gray-500 mb-2">Ship To</h3>
            <p className="text-lg font-semibold text-gray-800">Gudang Utama</p>
            <p className="text-sm text-gray-600">Alamat Gudang Anda, Kota, Kode Pos</p>
            <p className="text-sm text-gray-600">Expected Delivery: {formatDate(order.expected_delivery_date)}</p>
          </div>
        </section>

        {/* 3. Tabel Item */}
        <section className="mt-8">
          <Table>
            <TableHeader className="bg-gray-800">
              <TableRow>
                <TableHead className="text-white w-[50px]">No.</TableHead>
                <TableHead className="text-white">Item Description</TableHead>
                <TableHead className="text-white text-right">Qty</TableHead>
                <TableHead className="text-white text-right">Unit Price</TableHead>
                <TableHead className="text-white text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items?.map((item, index) => (
                <TableRow key={item.id || index} className="border-b">
                  <TableCell className="text-center">{index + 1}</TableCell>
                  <TableCell>
                    <div className="font-medium">{item.product?.full_name || item.product?.name || 'N/A'}</div>
                    <div className="text-sm text-gray-500">SKU: {item.product?.sku || 'N/A'}</div>
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatRupiah(item.unit_price, true)}</TableCell>
                  <TableCell className="text-right font-medium">{formatRupiah(item.quantity * item.unit_price, true)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        {/* 4. Bagian Total */}
        <section className="flex justify-end mt-8">
          <div className="w-full max-w-xs space-y-2 text-gray-700">
            <div className="flex justify-between">
              <span className="font-semibold">Subtotal:</span>
              <span>{formatRupiah(subtotal, true)}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between">
                <span className="font-semibold">PPN ({order.tax_percentage}%):</span>
                <span>{formatRupiah(tax, true)}</span>
              </div>
            )}
            {shipping > 0 && (
              <div className="flex justify-between">
                <span className="font-semibold">Shipping Cost:</span>
                <span>{formatRupiah(shipping, true)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold text-gray-800 border-t-2 border-gray-800 pt-2 mt-2">
              <span>TOTAL:</span>
              <span>{formatRupiah(total, true)}</span>
            </div>
          </div>
        </section>

        {/* 5. Catatan */}
        {order.notes && (
          <section className="mt-8 border-t pt-4">
            <h3 className="font-bold text-gray-800 mb-2">Notes:</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{order.notes}</p>
          </section>
        )}

        {/* 6. Footer */}
        <footer className="mt-16 text-center text-sm text-gray-500">
          <p>Thank you for your business!</p>
          <p>If you have any questions concerning this purchase order, please contact us.</p>
        </footer>
      </div>
    </div>
  );
});
