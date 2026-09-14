/**
 * Utility functions for consistent data formatting across AgriSmart
 */

export function formatLitres(litres: number): string {
  if (litres >= 1000) {
    return `${(litres / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k L`;
  }
  return `${litres.toLocaleString()} L`;
}

export function formatFullLitres(litres: number): string {
  return `${litres.toLocaleString()} Litres`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatTemperature(celsius: number): string {
  return `${Math.round(celsius)}°C`;
}

export function formatMillimeters(mm: number): string {
  return `${mm.toFixed(1)} mm`;
}

export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
