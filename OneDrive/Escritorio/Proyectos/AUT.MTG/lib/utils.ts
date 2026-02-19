// ============================================================
// Utilidades generales del proyecto
// MTG Automotora
// ============================================================

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combina clases de tailwind de forma inteligente
 * Utilizado por componentes shadcn/ui
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Genera un slug URL-friendly
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^\w\s-]/g, '') // Remover caracteres especiales
    .replace(/\s+/g, '-') // Reemplazar espacios con guiones
    .replace(/--+/g, '-') // Evitar guiones múltiples
    .trim();
}

/**
 * Formatea un número como porcentaje
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Valida que un string no esté vacío
 */
export function isNotEmpty(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && value.trim().length > 0;
}

/**
 * Trunca un texto a una longitud máxima
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Formatea un número como precio en pesos chilenos (CLP)
 * Utiliza el formato: $X.XXX.XXX
 */
export function formatPrice(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formatea el kilometraje con separador de miles
 * Utiliza el formato: X.XXX km
 */
export function formatMileageDisplay(mileage: number | null | undefined): string {
  if (mileage === null || mileage === undefined) {
    return 'No especificado';
  }
  return new Intl.NumberFormat('es-CL').format(mileage) + ' km';
}

/**
 * Parsea un string con formato chileno de números (remueve separadores de miles)
 * Útil para convertir input del usuario a número
 */
export function parseChileanNumber(value: string): number {
  // Remover puntos (separador de miles en Chile) y espacios
  const cleaned = value.replace(/[.\s]/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Formatea un número para mostrar en input (con separador de miles)
 * Útil para mostrar el valor formateado cuando el input pierde el foco
 */
export function formatNumberInput(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) {
    return '';
  }
  return new Intl.NumberFormat('es-CL').format(value);
}
