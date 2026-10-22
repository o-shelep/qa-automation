import { describe, it, expect } from 'vitest';
import { isPalindrome } from '../src/palindrome';

describe('isPalindrome', () => {
  // 1. Коректні дані: валідний паліндром
  it('повертає true для валідного паліндрому незалежно від регістру та пробілів', () => {
    const input = 'А роза упала на лапу Азора';
    expect(isPalindrome(input)).toBe(true);
  });

  // 2. Коректні дані: не паліндром
  it('повертає false, якщо очищений рядок не збігається зі зворотним', () => {
    expect(isPalindrome('Привіт світ')).toBe(false);
  });

  // 3. Межове значення: один символ
  it('повертає true для одиночного символу як мінімально допустимого паліндрому', () => {
    expect(isPalindrome(' a ')).toBe(true);
  });

  // 4. Некоректні дані з винятком: порожній рядок
  it('викидає виняток EMPTY_STRING, якщо передано порожній рядок або лише пробіли', () => {
    expect(() => isPalindrome('')).toThrow('EMPTY_STRING');
    expect(() => isPalindrome('   ')).toThrow('EMPTY_STRING');
  });

  // 5. Некоректні дані з винятком: не рядок
  it('викидає виняток INVALID_INPUT, якщо передано нерядкове значення', () => {
    // @ts-expect-error перевіряємо захист у runtime від некоректного типу
    expect(() => isPalindrome(null)).toThrow('INVALID_INPUT');
  });
});
