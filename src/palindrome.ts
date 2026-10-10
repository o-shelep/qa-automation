export function isPalindrome(input: string): boolean {
  if (typeof input !== 'string') {
    throw new Error('INVALID_INPUT');
  }

  const sanitized = input.replace(/\s+/g, '').toLowerCase();

  if (sanitized.length === 0) {
    throw new Error('EMPTY_STRING');
  }

  const reversed = sanitized.split('').reverse().join('');
  return sanitized === reversed;
}
