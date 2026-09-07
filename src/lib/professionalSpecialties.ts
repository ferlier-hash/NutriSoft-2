import type { ProfessionalSpecialty } from '../types';

// Taxonomía de producto: orienta filtros y presentación, pero no certifica
// una especialidad ni reemplaza la denominación emitida por una institución.
export const PROFESSIONAL_SPECIALTIES: ProfessionalSpecialty[] = [
  'Nutrición general',
  'Nutrición clínica',
  'Nutrición pediátrica',
  'Nutrición deportiva',
  'Nutrición materno-infantil',
  'Nutrición en personas mayores',
  'Diabetes y metabolismo',
  'Salud digestiva',
  'Conducta alimentaria',
  'Nutrición vegetariana y vegana',
  'Nutrición oncológica',
  'Nutrición comunitaria y salud pública',
];

export const PROFESSIONAL_TIME_ZONES = [
  'America/Argentina/Buenos_Aires',
  'America/Argentina/Cordoba',
  'America/Argentina/Mendoza',
  'America/Montevideo',
  'America/Santiago',
  'America/Lima',
  'America/Bogota',
  'America/Mexico_City',
  'Europe/Madrid',
] as const;
