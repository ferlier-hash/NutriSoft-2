export const anthropometryMetrics = [
  { key: 'heightCm', label: 'Altura', unit: 'cm' },
  { key: 'weightKg', label: 'Peso', unit: 'kg' },
  { key: 'sizeCm', label: 'Talla', unit: 'cm' },
  { key: 'waistCm', label: 'Circunferencia de cintura', unit: 'cm' },
  { key: 'bodyFatPercentage', label: 'Grasa corporal', unit: '%' },
  { key: 'muscleMassPercentage', label: 'Masa muscular', unit: '%' },
  { key: 'hydrationPercentage', label: 'Hidratación', unit: '%' },
  { key: 'skinfoldMm', label: 'Pliegues', unit: 'mm' },
  { key: 'visceralFatPercentage', label: 'Grasa visceral', unit: '%' },
];
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const displayMeasurementDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('es-AR');
export function measurementRange(period: string, from: string, to: string) {
  const today = new Date();
  if (period === 'custom') return { from, to };
  if (period === 'previous') return { from: localDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)), to: localDate(new Date(today.getFullYear(), today.getMonth(), 0)) };
  const start = new Date(today); start.setDate(start.getDate() - Number(period) + 1);
  return { from: localDate(start), to: localDate(today) };
}
