import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// ============================================================================
// BigInt Formatting
// ============================================================================

export function formatBigInt(
  value: bigint | string | number,
  decimals: number = 18,
  displayDecimals: number = 4
): string {
  // Already human-readable ether string (contains '.')
  if (typeof value === 'string' && value.includes('.')) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(displayDecimals).replace(/\.?0+$/, '') : value;
  }
  const asBig =
    typeof value === 'bigint'
      ? value
      : BigInt(
          typeof value === 'string' && value.length > 0
            ? value.split('.')[0]
            : Math.trunc(Number(value) || 0)
        );
  const divisor = BigInt(10 ** decimals);
  const integerPart = asBig / divisor;
  const fractionalPart = asBig % divisor;

  const fractionalString = fractionalPart.toString().padStart(decimals, '0');
  const displayFractional = fractionalString.slice(0, displayDecimals);

  if (displayFractional === '0'.repeat(displayDecimals)) {
    return integerPart.toString();
  }

  return `${integerPart}.${displayFractional}`.replace(/\.?0+$/, '');
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatCurrency(
  value: number,
  currency: string = 'USD'
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(value);
}

// ============================================================================
// Address Formatting
// ============================================================================

export function formatAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// ============================================================================
// Time Formatting
// ============================================================================

export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  const intervals: Record<string, number> = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval !== 1 ? 's' : ''} ago`;
    }
  }

  return 'just now';
}

export function timeUntil(timestamp: number): string {
  const seconds = Math.floor((timestamp - Date.now()) / 1000);

  if (seconds < 0) return 'ended';

  const intervals: Record<string, number> = {
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval}${unit.charAt(0)}`;
    }
  }

  return '<1m';
}
