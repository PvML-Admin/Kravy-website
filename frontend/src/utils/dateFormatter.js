/**
 * Format dates to British Standard Time (BST/GMT)
 * Automatically handles daylight saving time
 */

/**
 * Format a date to BST with date and time
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string in BST
 */
export function formatDateTimeBST(date) {
  if (!date) return 'Never';
  
  const dateObj = new Date(date);
  
  return dateObj.toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Format a date to BST (date only, no time)
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string in BST
 */
export function formatDateBST(date) {
  if (!date) return 'Never';
  
  const dateObj = new Date(date);
  
  return dateObj.toLocaleDateString('en-GB', {
    timeZone: 'Europe/London',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Format a date with full date and time (replaces relative time)
 * @param {string|Date} date - Date to format  
 * @returns {string} Formatted date and time string
 */
export function formatRelativeTimeBST(date) {
  if (!date) return 'Never';
  
  // Handle BIGINT timestamps from PostgreSQL (might be string or number)
  const timestamp = typeof date === 'string' && !isNaN(date) ? parseInt(date) : date;
  const dateObj = new Date(timestamp);
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) return 'Invalid Date';
  
  // Always return full date and time instead of relative
  return formatDateTimeBST(dateObj);
}

