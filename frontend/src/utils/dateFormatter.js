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
 * Format a relative time string (e.g., "2h ago", "3d ago")
 * @param {string|Date} date - Date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTimeBST(date) {
  if (!date) return 'Never';
  
  // Handle BIGINT timestamps from PostgreSQL (might be string or number)
  const timestamp = typeof date === 'string' && !isNaN(date) ? parseInt(date) : date;
  const dateObj = new Date(timestamp);
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) return 'Invalid Date';
  
  const now = new Date();
  const diff = now - dateObj;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  // For older dates, show the actual date
  return formatDateBST(dateObj);
}

