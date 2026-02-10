
const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function helper(n: number): string {
  if (n < 10) return units[n];
  if (n < 20) return teens[n - 10];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + units[n % 10] : '');
  if (n < 1000) return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + helper(n % 100) : '');
  if (n < 100000) return helper(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + helper(n % 1000) : '');
  if (n < 10000000) return helper(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + helper(n % 100000) : '');
  return n.toString();
}

export function convertToWords(num: number): string {
  if (num === 0) return 'Zero Only.';
  num = parseFloat(num.toFixed(2));
  const integerPart = Math.floor(num);
  const fractionPart = Math.round((num - integerPart) * 100);
  let n = integerPart;
  let str = '';
  if (n >= 10000000) { str += helper(Math.floor(n / 10000000)) + ' Crore '; n %= 10000000; }
  if (n >= 100000) { str += helper(Math.floor(n / 100000)) + ' Lakh '; n %= 100000; }
  if (n >= 1000) { str += helper(Math.floor(n / 1000)) + ' Thousand '; n %= 1000; }
  if (n > 0 || str.trim() === '') { str += helper(n).trim(); }
  let currencyUnit = 'Taka';
  str = str.trim();
  if (fractionPart > 0) {
    let paisaStr = '';
    if (fractionPart < 10) paisaStr = helper(fractionPart);
    else if (fractionPart < 20) paisaStr = teens[fractionPart - 10];
    else paisaStr = tens[Math.floor(fractionPart / 10)] + (fractionPart % 10 !== 0 ? ' ' + units[fractionPart % 10] : '');
    str += (str.trim() ? ' and ' : '') + paisaStr + ' Paisa';
  }
  return (str.trim() ? str.trim() + ' ' + currencyUnit : 'Zero') + ' Only.';
}

export function formatDisplayDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  try {
    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) return dateString;
    return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) {
    return dateString;
  }
}

export function formatLongDate(dateString?: string): string {
  if (!dateString) return '';
  try {
    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) return dateString;
    return dateObj.toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return '';
  }
}
