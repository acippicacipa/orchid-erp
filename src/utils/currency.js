/**
 * Currency formatting utilities for Indonesian Rupiah
 * Standardized across all ERP modules
 */

/**
 * Format amount to Indonesian Rupiah without decimals
 * @param {number|string} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export const formatRupiah = (amount) => {
  if (amount === null || amount === undefined || amount === '') return 'Rp 0';
  const number = Math.round(parseFloat(amount) || 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number);
};

/**
 * Parse Rupiah string back to number
 * @param {string} rupiahString - The Rupiah string to parse
 * @returns {number} Parsed number
 */
export const parseRupiah = (rupiahString) => {
  if (!rupiahString) return 0;
  return parseInt(rupiahString.replace(/[^0-9]/g, '')) || 0;
};

/**
 * Format number as Rupiah input (for form inputs)
 * @param {number|string} amount - The amount to format
 * @returns {string} Formatted string for input fields
 */
export const formatRupiahInput = (amount) => {
  if (amount === null || amount === undefined || amount === '') return '';
  const number = Math.round(parseFloat(amount) || 0);
  return new Intl.NumberFormat('id-ID').format(number);
};

/**
 * Validate if a string is a valid Rupiah amount
 * @param {string} value - The value to validate
 * @returns {boolean} True if valid
 */
export const isValidRupiahAmount = (value) => {
  if (!value) return true; // Empty is valid (will be 0)
  const cleaned = value.replace(/[^0-9]/g, '');
  return !isNaN(cleaned) && cleaned !== '';
};

// Alias for backward compatibility
export const formatCurrency = formatRupiah;
