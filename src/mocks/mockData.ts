import type { Organization, Nutritionist, Patient, Alert, CheckInAssignment, CheckInResponse, Recommendation, PlatformMonthlySnapshot, ProfessionalResource, ProfessionalRecipe, MealPlanTemplate, MealPlanAssignment, MotivationalPhrase, PatientNextStepList, MealAdherenceRecord, Appointment, AppointmentPaymentMovement, AppointmentNotification, AppointmentChangeRequest, ProfessionalPracticeSettings, AnthropometricMeasurement } from '../types';
import { daysAgo, hoursAgo, daysInFuture } from '../lib/dateUtils';

export interface InitialMockData {
  organizations: Organization[];
  nutritionists: Nutritionist[];
  patients: Patient[];
  checkInAssignments: CheckInAssignment[];
  checkInResponses: CheckInResponse[];
  alerts: Alert[];
  recommendations: Recommendation[];
  motivationalPhrases: MotivationalPhrase[];
  professionalResources: ProfessionalResource[];
  professionalRecipes: ProfessionalRecipe[];
  mealPlanTemplates: MealPlanTemplate[];
  mealPlanAssignments: MealPlanAssignment[];
  nextStepLists: PatientNextStepList[];
  mealAdherenceRecords: MealAdherenceRecord[];
  appointments: Appointment[];
  appointmentPaymentMovements: AppointmentPaymentMovement[];
  appointmentNotifications: AppointmentNotification[];
  appointmentChangeRequests: AppointmentChangeRequest[];
  professionalPracticeSettings: ProfessionalPracticeSettings[];
  anthropometricMeasurements: AnthropometricMeasurement[];
}

export function createInitialMockData(): InitialMockData {
  const organizations: Organization[] = [
    {
      id: 'org-1',
      name: 'Clínica Bienestar',
      location: 'Córdoba, Argentina',
      status: 'active',
      onboardingStatus: 'complete',
      nutritionistsCount: 2,
      patientsCount: 3,
      plan: 'CUSTOM',
      monthlyPrice: 200000,
      storageUsedMb: 2450,
      storageLimitMb: 5120,
      serviceStartedAt: daysAgo(180),
      nextBillingDate: daysInFuture(2),
      primaryContact: { name: 'Andrea Núñez', email: 'andrea@clinicabienestar.com', phone: '+54 351 555 0101' },
      responsibleMembers: [
        { id: 'resp-1-primary', name: 'Andrea Núñez', email: 'andrea@clinicabienestar.com', isPrimary: true, invitationStatus: 'accepted' },
        { id: 'resp-1-additional', name: 'Marcos Leiva', email: 'marcos@clinicabienestar.com', isPrimary: false, invitationStatus: 'accepted' },
      ],
      professionalInvitations: [],
      additionalManagers: 1,
      invitedNutritionists: 0,
      payments: [{ id: 'pay-1', amount: 200000, currency: 'ARS', paidAt: daysAgo(28), method: 'Transferencia', plan: 'CUSTOM' }],
      branding: { displayName: 'Clínica Bienestar', tagline: 'Nutrición cercana para una vida en equilibrio.', colorPreset: 'aqua', contactPhone: '+54 351 555 0101', contactEmail: 'hola@clinicabienestar.com', contactAddress: 'Córdoba · Atención presencial y online' },
      statusHistory: [{ id: 'event-1', status: 'active', occurredAt: daysAgo(180), note: 'Alta inicial del servicio' }],
      createdAt: daysAgo(180),
    },
    {
      id: 'org-2',
      name: 'NutriVida',
      location: 'Rosario, Argentina',
      status: 'payment_due',
      onboardingStatus: 'complete',
      nutritionistsCount: 1,
      patientsCount: 2,
      plan: 'BASIC',
      monthlyPrice: 30000,
      storageUsedMb: 870,
      storageLimitMb: 1024,
      serviceStartedAt: daysAgo(120),
      nextBillingDate: daysAgo(4),
      suspensionDate: daysInFuture(3),
      primaryContact: { name: 'Sofía Roldán', email: 'sofia@nutrivida.com', phone: '+54 341 555 0132' },
      responsibleMembers: [
        { id: 'resp-2-primary', name: 'Sofía Roldán', email: 'sofia@nutrivida.com', isPrimary: true, invitationStatus: 'accepted' },
      ],
      professionalInvitations: [],
      additionalManagers: 0,
      invitedNutritionists: 0,
      payments: [{ id: 'pay-2', amount: 30000, currency: 'ARS', paidAt: daysAgo(34), method: 'Mercado Pago', plan: 'BASIC' }],
      statusHistory: [
        { id: 'event-2a', status: 'active', occurredAt: daysAgo(120), note: 'Alta inicial del servicio' },
        { id: 'event-2b', status: 'payment_due', occurredAt: daysAgo(4), note: 'Vencimiento pendiente de confirmación' },
      ],
      createdAt: daysAgo(120),
    },
    {
      id: 'org-3',
      name: 'Centro Integral Salud',
      location: 'Mendoza, Argentina',
      status: 'suspended',
      onboardingStatus: 'complete',
      nutritionistsCount: 0,
      patientsCount: 0,
      plan: 'ULTRA',
      monthlyPrice: 100000,
      storageUsedMb: 14100,
      storageLimitMb: 15360,
      serviceStartedAt: daysAgo(90),
      nextBillingDate: daysAgo(10),
      primaryContact: { name: 'Martín Quiroga', email: 'martin@centrointegral.com' },
      responsibleMembers: [
        { id: 'resp-3-primary', name: 'Martín Quiroga', email: 'martin@centrointegral.com', isPrimary: true, invitationStatus: 'accepted' },
        { id: 'resp-3-additional-a', name: 'Paula Nieto', email: 'paula@centrointegral.com', isPrimary: false, invitationStatus: 'accepted' },
        { id: 'resp-3-additional-b', name: 'Juan Cruz Acosta', email: 'juan@centrointegral.com', isPrimary: false, invitationStatus: 'accepted' },
      ],
      professionalInvitations: [
        { id: 'prof-invite-3', name: 'Lic. Emilia Suárez', email: 'emilia@centrointegral.com', invitationStatus: 'pending', invitedAt: daysAgo(2) },
      ],
      additionalManagers: 2,
      invitedNutritionists: 1,
      payments: [{ id: 'pay-3', amount: 100000, currency: 'ARS', paidAt: daysAgo(41), method: 'Transferencia', plan: 'ULTRA' }],
      statusHistory: [
        { id: 'event-3a', status: 'active', occurredAt: daysAgo(90), note: 'Alta inicial del servicio' },
        { id: 'event-3b', status: 'suspended', occurredAt: daysAgo(3), note: 'Suspensión automática por mora' },
      ],
      createdAt: daysAgo(90),
    },
    {
      id: 'org-4',
      name: 'NutriSalud Express',
      location: 'Buenos Aires, Argentina',
      status: 'active',
      onboardingStatus: 'invited',
      nutritionistsCount: 0,
      patientsCount: 0,
      plan: 'CUSTOM',
      monthlyPrice: 200000,
      storageUsedMb: 0,
      storageLimitMb: 25600,
      serviceStartedAt: daysAgo(15),
      nextBillingDate: daysInFuture(15),
      primaryContact: { name: 'Carolina Méndez', email: 'carolina@nutrisaludexpress.com' },
      responsibleMembers: [
        { id: 'resp-4-primary', name: 'Carolina Méndez', email: 'carolina@nutrisaludexpress.com', isPrimary: true, invitationStatus: 'pending' },
      ],
      professionalInvitations: [
        { id: 'prof-invite-4a', name: 'Lic. Valentina Ocampo', email: 'valentina@nutrisaludexpress.com', invitationStatus: 'pending', invitedAt: daysAgo(1) },
        { id: 'prof-invite-4b', name: 'Lic. Tomás Luna', email: 'tomas@nutrisaludexpress.com', invitationStatus: 'pending', invitedAt: daysAgo(1) },
      ],
      additionalManagers: 0,
      invitedNutritionists: 2,
      payments: [],
      statusHistory: [{ id: 'event-4', status: 'active', occurredAt: daysAgo(15), note: 'Invitación inicial enviada' }],
      createdAt: daysAgo(15),
    },
    {
      id: 'org-5',
      name: 'Espacio Raíz',
      location: 'Santa Fe, Argentina',
      status: 'closed',
      onboardingStatus: 'complete',
      nutritionistsCount: 0,
      patientsCount: 0,
      plan: 'BASIC',
      monthlyPrice: 30000,
      storageUsedMb: 312,
      storageLimitMb: 1024,
      serviceStartedAt: daysAgo(260),
      nextBillingDate: daysAgo(32),
      primaryContact: { name: 'Julia Paz', email: 'julia@espacioraiz.com' },
      responsibleMembers: [
        { id: 'resp-5-primary', name: 'Julia Paz', email: 'julia@espacioraiz.com', isPrimary: true, invitationStatus: 'accepted' },
      ],
      professionalInvitations: [],
      additionalManagers: 0,
      invitedNutritionists: 0,
      payments: [{ id: 'pay-5', amount: 30000, currency: 'ARS', paidAt: daysAgo(62), method: 'Transferencia', plan: 'BASIC' }],
      statusHistory: [
        { id: 'event-5a', status: 'active', occurredAt: daysAgo(260), note: 'Alta inicial del servicio' },
        { id: 'event-5b', status: 'closed', occurredAt: daysAgo(24), note: 'Cierre solicitado por el responsable principal' },
      ],
      createdAt: daysAgo(260),
    },
  ];

  const nutritionists: Nutritionist[] = [
    {
      id: 'nutri-1',
      organizationId: 'org-1',
      organizationName: 'Clínica Bienestar',
      firstName: 'Andrea',
      lastName: 'Núñez',
      name: 'Lic. Andrea N.',
      email: 'andrea@clinicabienestar.com',
      phone: '+52 55 1111 2222',
      assignedPatientsCount: 3,
      status: 'active',
      joinedAt: daysAgo(150),
      lastActiveAt: hoursAgo(2),
      specialty: 'Nutrición clínica',
      registrationNumber: 'MP 18432',
      registrationProvince: 'Córdoba',
      registrationCountry: 'Argentina',
      timeZone: 'America/Argentina/Cordoba',
    },
    {
      id: 'nutri-2',
      organizationId: 'org-1',
      organizationName: 'Clínica Bienestar',
      firstName: 'Carlos',
      lastName: 'Méndez',
      name: 'Lic. Carlos M.',
      email: 'carlos@clinicabienestar.com',
      phone: '+52 55 3333 4444',
      assignedPatientsCount: 0,
      status: 'active',
      joinedAt: daysAgo(100),
      lastActiveAt: hoursAgo(5),
      specialty: 'Nutrición deportiva',
      timeZone: 'America/Argentina/Cordoba',
    },
    {
      id: 'nutri-3',
      organizationId: 'org-2',
      organizationName: 'NutriVida',
      firstName: 'Sofía',
      lastName: 'Roldán',
      name: 'Lic. Sofía R.',
      email: 'sofia@nutrivida.com',
      phone: '+52 33 4444 5555',
      assignedPatientsCount: 2,
      status: 'active',
      joinedAt: daysAgo(80),
      lastActiveAt: hoursAgo(1),
      specialty: 'Salud digestiva',
      timeZone: 'America/Argentina/Buenos_Aires',
    },
  ];

  const professionalResources: ProfessionalResource[] = [
    { id: 'resource-1', organizationId: 'org-1', ownerNutritionistId: 'nutri-1', title: 'Guía práctica para armar un plato equilibrado', kind: 'document', category: 'Guías', source: 'guia-plato-equilibrado.pdf', createdAt: daysAgo(12), updatedAt: daysAgo(12), status: 'published' },
    { id: 'resource-2', organizationId: 'org-1', ownerNutritionistId: 'nutri-1', title: 'Lista de compras semanal', kind: 'document', category: 'Plantillas', source: 'lista-compras-semanal.pdf', createdAt: daysAgo(8), updatedAt: daysAgo(8), status: 'published' },
    { id: 'resource-3', organizationId: 'org-1', ownerNutritionistId: 'nutri-1', title: 'Cómo interpretar las etiquetas nutricionales', kind: 'video', category: 'Educación', source: 'https://www.youtube.com/watch?v=demo-etiquetas', createdAt: daysAgo(4), updatedAt: daysAgo(4), status: 'published' },
    { id: 'resource-5', organizationId: 'org-1', ownerNutritionistId: 'nutri-1', title: 'Ideas simples para desayunos completos', kind: 'document', category: 'Guías', source: 'desayunos-completos.pdf', createdAt: daysAgo(16), updatedAt: daysAgo(16), status: 'published' },
    { id: 'resource-6', organizationId: 'org-1', ownerNutritionistId: 'nutri-1', title: 'Organización semanal de comidas', kind: 'video', category: 'Organización', source: 'https://www.youtube.com/watch?v=demo-organizacion', createdAt: daysAgo(11), updatedAt: daysAgo(11), status: 'published' },
    { id: 'resource-7', organizationId: 'org-1', ownerNutritionistId: 'nutri-1', title: 'Colaciones prácticas para llevar', kind: 'document', category: 'Plantillas', source: 'colaciones-practicas.pdf', createdAt: daysAgo(9), updatedAt: daysAgo(9), status: 'published' },
    { id: 'resource-8', organizationId: 'org-1', ownerNutritionistId: 'nutri-1', title: 'Porciones y señales de saciedad', kind: 'video', category: 'Educación', source: 'https://www.youtube.com/watch?v=demo-saciedad', createdAt: daysAgo(7), updatedAt: daysAgo(7), status: 'published' },
    { id: 'resource-9', organizationId: 'org-1', ownerNutritionistId: 'nutri-1', title: 'Borrador de guía para vacaciones', kind: 'document', category: 'Guías', source: 'guia-vacaciones.pdf', createdAt: daysAgo(2), updatedAt: daysAgo(2), status: 'draft' },
    { id: 'resource-4', organizationId: 'org-2', ownerNutritionistId: 'nutri-3', title: 'Hidratación para días de entrenamiento', kind: 'document', category: 'Deporte', source: 'hidratacion-entrenamiento.pdf', createdAt: daysAgo(6), updatedAt: daysAgo(6), status: 'published' },
  ];

  const professionalRecipes: ProfessionalRecipe[] = [
    {
      id: 'recipe-1', organizationId: 'org-1', ownerNutritionistId: 'nutri-1', title: 'Avena nocturna con frutos rojos', category: 'Desayunos', tags: ['Veggie', 'Alta en fibra'], prepMinutes: 10, servings: 1, calories: 360, proteinGrams: 16, carbGrams: 52, fatGrams: 10,
      ingredients: ['½ taza de avena', '¾ taza de yogur natural', '½ taza de frutos rojos', '1 cucharada de semillas de chía'],
      steps: ['Mezclar la avena, el yogur y la chía.', 'Refrigerar durante la noche.', 'Agregar los frutos rojos antes de servir.'],
      imageUrl: 'https://images.pexels.com/photos/5604832/pexels-photo-5604832.jpeg?auto=compress&cs=tinysrgb&w=900', status: 'published', createdAt: daysAgo(18), updatedAt: daysAgo(18),
    },
    {
      id: 'recipe-2', organizationId: 'org-1', ownerNutritionistId: 'nutri-1', title: 'Bowl tibio de quinoa y vegetales', category: 'Almuerzos', tags: ['Veggie', 'Sin gluten'], prepMinutes: 25, servings: 2, calories: 480, proteinGrams: 19, carbGrams: 66, fatGrams: 15,
      ingredients: ['1 taza de quinoa cocida', '1 zucchini', '1 zanahoria', '½ palta', 'Hojas verdes', 'Jugo de limón'],
      steps: ['Saltear el zucchini y la zanahoria.', 'Distribuir la quinoa y los vegetales en un bowl.', 'Terminar con palta, hojas verdes y limón.'],
      imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80', status: 'published', createdAt: daysAgo(14), updatedAt: daysAgo(14),
    },
    {
      id: 'recipe-3', organizationId: 'org-1', ownerNutritionistId: 'nutri-1', title: 'Pollo al limón con batatas', category: 'Cenas', tags: ['High Protein', 'Sin gluten'], prepMinutes: 40, servings: 2, calories: 540, proteinGrams: 44, carbGrams: 48, fatGrams: 18,
      ingredients: ['2 pechugas de pollo', '2 batatas medianas', '1 limón', 'Romero', '1 cucharada de aceite de oliva'],
      steps: ['Cortar y hornear las batatas con aceite y romero.', 'Dorar el pollo y terminar la cocción con jugo de limón.', 'Servir junto con las batatas.'],
      imageUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=900&q=80', status: 'published', createdAt: daysAgo(10), updatedAt: daysAgo(10),
    },
    {
      id: 'recipe-4', organizationId: 'org-1', ownerNutritionistId: 'nutri-1', title: 'Hummus cremoso con crudités', category: 'Snacks', tags: ['Veggie', 'Proteína vegetal'], prepMinutes: 15, servings: 4, calories: 220, proteinGrams: 9, carbGrams: 26, fatGrams: 9,
      ingredients: ['1 taza de garbanzos cocidos', '1 cucharada de tahini', 'Jugo de ½ limón', 'Zanahoria y pepino en bastones'],
      steps: ['Procesar garbanzos, tahini y limón hasta lograr una crema.', 'Ajustar la textura con agua fría.', 'Servir con los vegetales.'],
      imageUrl: 'https://images.pexels.com/photos/6089614/pexels-photo-6089614.jpeg?auto=compress&cs=tinysrgb&w=900', status: 'published', createdAt: daysAgo(7), updatedAt: daysAgo(7),
    },
    {
      id: 'recipe-5', organizationId: 'org-1', ownerNutritionistId: 'nutri-1', title: 'Tostadas de huevo y palta', category: 'Desayunos', tags: ['High Protein', 'Rápida'], prepMinutes: 12, servings: 1, calories: 410, proteinGrams: 22, carbGrams: 34, fatGrams: 21,
      ingredients: ['2 tostadas integrales', '2 huevos', '½ palta', 'Tomates cherry', 'Pimienta negra'],
      steps: ['Tostar el pan y pisar la palta.', 'Cocinar los huevos a gusto.', 'Montar las tostadas y terminar con tomates y pimienta.'],
      imageUrl: 'https://images.pexels.com/photos/11849970/pexels-photo-11849970.jpeg?auto=compress&cs=tinysrgb&w=900', status: 'published', createdAt: daysAgo(3), updatedAt: daysAgo(3),
    },
    {
      id: 'recipe-6', organizationId: 'org-2', ownerNutritionistId: 'nutri-3', title: 'Licuado de cacao y banana', category: 'Snacks', tags: ['Energía'], prepMinutes: 5, servings: 1, calories: 310, proteinGrams: 14, carbGrams: 48, fatGrams: 7,
      ingredients: ['1 banana', '1 taza de leche', '1 cucharada de cacao amargo'], steps: ['Licuar todos los ingredientes y servir.'],
      imageUrl: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=900&q=80', status: 'published', createdAt: daysAgo(5), updatedAt: daysAgo(5),
    },
  ];

  const patients: Patient[] = [
    {
      id: 'pat-1',
      organizationId: 'org-1',
      firstName: 'María',
      lastName: 'González',
      email: 'maria.gonzalez@example.com',
      phone: '+52 55 1234 5678',
      age: 28,
      city: 'Ciudad de México',
      status: 'active',
      assignedNutritionistId: 'nutri-1',
      objective: 'Mejorar energía y rutina diaria',
      initialWeightKg: 75,
      heightCm: 165,
      waistCm: 84,
      hipCm: 100,
      currentPlan: 'Plan balance 12 semanas',
      createdAt: daysAgo(60),
      lastActiveAt: hoursAgo(3),
      portalAccessStatus: 'active',
    },
    {
      id: 'pat-2',
      organizationId: 'org-1',
      firstName: 'Pablo',
      lastName: 'Acosta',
      email: 'pablo.acosta@example.com',
      phone: '+52 55 8765 4321',
      age: 34,
      city: 'Ciudad de México',
      status: 'active',
      assignedNutritionistId: 'nutri-1',
      objective: 'Rendimiento deportivo y masa muscular',
      currentPlan: 'Plan alto rendimiento',
      createdAt: daysAgo(45),
      lastActiveAt: hoursAgo(10),
      portalAccessStatus: 'active',
    },
    {
      id: 'pat-3',
      organizationId: 'org-1',
      firstName: 'Lucía',
      lastName: 'Torres',
      email: 'lucia.torres@example.com',
      phone: '+52 55 5555 1234',
      age: 29,
      city: 'Ciudad de México',
      status: 'active',
      assignedNutritionistId: 'nutri-1',
      objective: 'Reeducación alimentaria y bienestar digestivo',
      currentPlan: 'Plan antiinflamatorio',
      createdAt: daysAgo(30),
      lastActiveAt: daysAgo(2),
      portalAccessStatus: 'pending',
      invitedAt: daysAgo(2),
      invitationExpiresAt: daysInFuture(5),
    },
    {
      id: 'pat-4',
      organizationId: 'org-2',
      firstName: 'Diego',
      lastName: 'Ramírez',
      email: 'diego.ramirez@example.com',
      phone: '+52 33 4444 8888',
      age: 31,
      city: 'Guadalajara',
      status: 'active',
      assignedNutritionistId: 'nutri-3',
      objective: 'Mantenimiento y hábitos sostenibles',
      currentPlan: 'Plan mantenimiento 6 meses',
      createdAt: daysAgo(40),
      lastActiveAt: hoursAgo(4),
      portalAccessStatus: 'active',
    },
    {
      id: 'pat-5',
      organizationId: 'org-2',
      firstName: 'Sofía',
      lastName: 'Herrera',
      email: 'sofia.herrera@example.com',
      phone: '+52 33 9999 1111',
      age: 26,
      city: 'Guadalajara',
      status: 'active',
      assignedNutritionistId: 'nutri-3',
      objective: 'Nutrición consciente e hidratación',
      currentPlan: 'Plan inicio saludable',
      createdAt: daysAgo(25),
      lastActiveAt: daysAgo(5),
      portalAccessStatus: 'revoked',
    },
    {
      id: 'pat-archived',
      organizationId: 'org-1',
      firstName: 'Roberto',
      lastName: 'Sánchez',
      email: 'roberto.sanchez@example.com',
      phone: '+52 55 9999 0000',
      status: 'archived',
      assignedNutritionistId: 'nutri-1',
      objective: 'Tratamiento pausado',
      currentPlan: null,
      createdAt: daysAgo(100),
      lastActiveAt: daysAgo(60),
      portalAccessStatus: 'revoked',
    },
  ];

  const checkInAssignments: CheckInAssignment[] = [
    {
      id: 'assign-1',
      organizationId: 'org-1',
      patientId: 'pat-1',
      createdBy: 'nutri-1',
      dueDate: daysInFuture(7),
      status: 'pending',
      createdAt: daysAgo(1),
    },
    {
      id: 'assign-2',
      organizationId: 'org-1',
      patientId: 'pat-2',
      createdBy: 'nutri-1',
      dueDate: daysInFuture(5),
      status: 'completed',
      createdAt: daysAgo(3),
    },
    {
      id: 'assign-history-1',
      organizationId: 'org-1',
      patientId: 'pat-1',
      createdBy: 'nutri-1',
      dueDate: daysAgo(8),
      status: 'completed',
      createdAt: daysAgo(10),
    },
    {
      id: 'assign-history-2',
      organizationId: 'org-1',
      patientId: 'pat-3',
      createdBy: 'nutri-1',
      dueDate: daysAgo(18),
      status: 'completed',
      createdAt: daysAgo(20),
    },
    {
      id: 'assign-expired-1',
      organizationId: 'org-2',
      patientId: 'pat-5',
      createdBy: 'nutri-3',
      dueDate: daysAgo(2),
      status: 'expired',
      createdAt: daysAgo(9),
    },
  ];

  const checkInResponses: CheckInResponse[] = [
    {
      id: 'resp-1',
      assignmentId: 'assign-2',
      organizationId: 'org-1',
      patientId: 'pat-2',
      energyScore: 2,
      adherenceScore: 4,
      helpRequested: true,
      notes: 'Mucho cansancio esta semana',
      submittedAt: hoursAgo(5),
    },
    {
      id: 'resp-history-1',
      assignmentId: 'assign-history-1',
      organizationId: 'org-1',
      patientId: 'pat-1',
      energyScore: 3,
      adherenceScore: 4,
      helpRequested: false,
      notes: 'Me costó sostener los horarios durante el fin de semana.',
      submittedAt: daysAgo(8),
    },
    {
      id: 'resp-history-2',
      assignmentId: 'assign-history-2',
      organizationId: 'org-1',
      patientId: 'pat-3',
      energyScore: 5,
      adherenceScore: 4,
      helpRequested: false,
      notes: 'Semana tranquila y sin dificultades.',
      submittedAt: daysAgo(18),
    },
  ];

  const alerts: Alert[] = [
    {
      id: 'alert-init-1',
      organizationId: 'org-1',
      patientId: 'pat-2',
      responseId: 'resp-1',
      ruleCode: 'HELP_REQUESTED',
      priority: 'high',
      patientName: 'Pablo Acosta',
      reasonText: 'solicitó ayuda explícita en su check-in',
      recommendedAction: 'Contactar al paciente de manera prioritaria.',
      status: 'unresolved',
      createdAt: hoursAgo(5),
    },
  ];

  const phraseTexts = [
    'Constancia diaria: Pequeños hábitos, grandes cambios. Tú puedes.',
    'Aumentar la hidratación pre-entrenamiento a 500ml de agua.',
    'Alimentarte bien también es una forma de cuidarte.',
    'No busques perfección: buscá equilibrio y continuidad.',
    'Tu progreso se construye comida a comida.',
    'Escuchar a tu cuerpo también forma parte del plan.',
    'Una comida diferente no borra todo lo que avanzaste.',
    'Planificar hoy puede hacer más simples tus elecciones de mañana.',
    'Celebrá los hábitos que podés sostener, no sólo los resultados.',
    'Volver a empezar en la próxima comida siempre es una opción.',
  ];
  const motivationalPhrases: MotivationalPhrase[] = phraseTexts.map((text, index) => ({
    id: `phrase-${index + 1}`,
    organizationId: 'org-1',
    ownerNutritionistId: 'nutri-1',
    text,
    createdAt: daysAgo(10 - index),
  }));

  const recommendations: Recommendation[] = [
    {
      id: 'rec-1',
      organizationId: 'org-1',
      patientId: 'pat-1',
      createdBy: 'nutri-1',
      recommendationText: phraseTexts[0]!,
      phraseId: 'phrase-1',
      createdAt: daysAgo(2),
    },
    {
      id: 'rec-2',
      organizationId: 'org-1',
      patientId: 'pat-2',
      createdBy: 'nutri-1',
      recommendationText: phraseTexts[1]!,
      phraseId: 'phrase-2',
      createdAt: daysAgo(3),
    },
  ];

  const balanceMeals = [
    { name: 'Desayuno', items: [{ description: 'Avena con yogur natural', amount: '1 bowl', recipeId: 'recipe-1' }, { description: 'Fruta de estación', amount: '1 unidad' }] },
    { name: 'Almuerzo', items: [{ description: 'Bowl de quinoa y vegetales', amount: '1 plato', recipeId: 'recipe-2' }, { description: 'Hojas verdes', amount: '1 porción' }] },
    { name: 'Merienda', items: [{ description: 'Tostadas integrales', amount: '2 unidades' }, { description: 'Queso untable', amount: '2 cucharadas' }] },
    { name: 'Cena', items: [{ description: 'Pollo al limón con batatas', amount: '1 plato', recipeId: 'recipe-3' }, { description: 'Vegetales al vapor', amount: '1 porción' }] },
  ];
  const balanceDays = Array.from({ length: 7 }, (_, dayIndex) => ({
    id: `meal-plan-1-day-${dayIndex + 1}`,
    label: dayIndex === 0 ? 'Día 1 · Todo moderado' : dayIndex === 1 ? 'Día 2 · Día de permitido' : `Día ${dayIndex + 1}`,
    title: dayIndex === 0 ? 'Todo moderado' : dayIndex === 1 ? 'Día de permitido' : undefined,
    meals: balanceMeals.map((meal, mealIndex) => ({
      id: `meal-plan-1-day-${dayIndex + 1}-meal-${mealIndex + 1}`,
      name: meal.name,
      items: meal.items.map((item, itemIndex) => ({
        id: `meal-plan-1-day-${dayIndex + 1}-meal-${mealIndex + 1}-item-${itemIndex + 1}`,
        ...item,
      })),
    })),
  }));
  const hydrationDays = Array.from({ length: 7 }, (_, dayIndex) => ({
    id: `meal-plan-2-day-${dayIndex + 1}`,
    label: `Día ${dayIndex + 1}`,
    meals: [{
      id: `meal-plan-2-day-${dayIndex + 1}-hydration`,
      name: 'Desayuno',
      items: [{ id: `meal-plan-2-day-${dayIndex + 1}-item-1`, description: 'Agua al comenzar la jornada', amount: '2 vasos' }],
    }],
  }));

  const mealPlanTemplates: MealPlanTemplate[] = [
    {
      id: 'meal-plan-1',
      organizationId: 'org-1',
      ownerNutritionistId: 'nutri-1',
      name: 'Plan balance cotidiano',
      status: 'published',
      days: balanceDays,
      generalNotes: 'Priorizar agua durante el día y respetar señales de hambre y saciedad.',
      shoppingList: 'Avena, yogur, frutas, quinoa, vegetales, pan integral, pollo y batatas.',
      goals: 'Sostener una rutina de cuatro comidas principales.',
      createdAt: daysAgo(20),
      updatedAt: daysAgo(7),
    },
    {
      id: 'meal-plan-2',
      organizationId: 'org-1',
      ownerNutritionistId: 'nutri-1',
      name: 'Complemento de hidratación',
      status: 'published',
      days: hydrationDays,
      generalNotes: 'Ajustar según actividad física y temperatura.',
      createdAt: daysAgo(12),
      updatedAt: daysAgo(12),
    },
  ];

  const mealPlanAssignments: MealPlanAssignment[] = [
    {
      id: 'meal-assignment-1',
      organizationId: 'org-1',
      patientId: 'pat-1',
      templateId: 'meal-plan-1',
      templateName: 'Plan balance cotidiano',
      kind: 'primary',
      status: 'active',
      snapshotDays: structuredClone(mealPlanTemplates[0]!.days),
      snapshotGeneralNotes: mealPlanTemplates[0]!.generalNotes,
      snapshotShoppingList: mealPlanTemplates[0]!.shoppingList,
      snapshotGoals: mealPlanTemplates[0]!.goals,
      assignedBy: 'nutri-1',
      assignedAt: daysAgo(7),
    },
  ];

  const nextStepLists: PatientNextStepList[] = [
    {
      id: 'next-steps-1', organizationId: 'org-1', ownerNutritionistId: 'nutri-1', patientId: 'pat-1',
      title: 'Hábitos para esta semana', durationDays: 7, assignedAt: daysAgo(2), createdAt: daysAgo(5), updatedAt: daysAgo(1),
      items: [
        { id: 'next-step-1', text: 'Preparar una botella de agua al comenzar el día', completed: true, completedAt: daysAgo(1), patientComment: 'La dejé lista en el escritorio y me resultó útil.' },
        { id: 'next-step-2', text: 'Incluir una fruta en la merienda', completed: false, patientComment: '' },
        { id: 'next-step-3', text: 'Planificar las compras antes del fin de semana', completed: false, patientComment: '' },
      ],
    },
    {
      id: 'next-steps-2', organizationId: 'org-1', ownerNutritionistId: 'nutri-1',
      title: 'Organización de comidas', durationDays: 10, createdAt: daysAgo(3), updatedAt: daysAgo(3),
      items: [
        { id: 'next-step-4', text: 'Definir dos opciones simples de desayuno', completed: false },
        { id: 'next-step-5', text: 'Dejar vegetales lavados y listos para usar', completed: false },
      ],
    },
  ];

  const mealAdherenceRecords: MealAdherenceRecord[] = [
    { id: 'meal-adherence-1', organizationId: 'org-1', patientId: 'pat-1', assignmentId: 'meal-assignment-1', dayId: 'meal-plan-1-day-1', mealId: 'meal-plan-1-day-1-meal-1', completed: true, patientComment: 'Me resultó práctica, pero quisiera otra alternativa para los días con poco tiempo.', commentedAt: daysAgo(1), updatedAt: daysAgo(1) },
  ];

  const appointmentBase = new Date();
  appointmentBase.setHours(0, 0, 0, 0);
  const appointmentAt = (dayOffset: number, hour: number, minute = 0) => {
    const date = new Date(appointmentBase);
    date.setDate(date.getDate() + dayOffset);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
  };
  const appointments: Appointment[] = [
    { id: 'appointment-1', organizationId: 'org-1', patientId: 'pat-1', nutritionistId: 'nutri-1', startsAt: appointmentAt(0, 10), durationMinutes: 45, modality: 'virtual', status: 'confirmed', quotedAmount: 15000, currency: 'ARS', paymentStatus: 'pending', privateNote: 'Revisar cómo se sintió con los cambios de la última semana.', createdAt: daysAgo(2) },
    { id: 'appointment-2', organizationId: 'org-1', patientId: 'pat-2', nutritionistId: 'nutri-1', startsAt: appointmentAt(1, 16), durationMinutes: 60, modality: 'in_person', status: 'confirmed', quotedAmount: 18000, currency: 'ARS', paymentStatus: 'paid', createdAt: daysAgo(4) },
    { id: 'appointment-3', organizationId: 'org-1', patientId: 'pat-1', nutritionistId: 'nutri-1', startsAt: appointmentAt(-5, 11), durationMinutes: 45, modality: 'virtual', status: 'completed', quotedAmount: 15000, currency: 'ARS', paymentStatus: 'paid', createdAt: daysAgo(10) },
  ];
  const appointmentPaymentMovements: AppointmentPaymentMovement[] = [
    { id: 'appointment-payment-1', appointmentId: 'appointment-2', organizationId: 'org-1', amount: 18000, currency: 'ARS', method: 'transfer', occurredAt: daysAgo(1) },
    { id: 'appointment-payment-2', appointmentId: 'appointment-3', organizationId: 'org-1', amount: 15000, currency: 'ARS', method: 'cash', occurredAt: daysAgo(5) },
  ];
  const appointmentNotifications: AppointmentNotification[] = [
    {
      id: 'appointment-notification-1',
      appointmentId: 'appointment-1',
      organizationId: 'org-1',
      patientId: 'pat-1',
      kind: 'created',
      title: 'Nueva cita agendada',
      message: 'Tenés una cita virtual confirmada para hoy a las 10:00.',
      createdAt: daysAgo(1),
    },
  ];
  const professionalPracticeSettings: ProfessionalPracticeSettings[] = [
    {
      id: 'practice-settings-1',
      organizationId: 'org-1',
      nutritionistId: 'nutri-1',
      currency: 'ARS',
      defaultDurationMinutes: 45,
      defaultVirtualPrice: 15000,
      defaultInPersonPrice: 18000,
      priceSettings: [
        { id: 'price-virtual-45', label: 'Virtual 45 min', durationMinutes: 45, modality: 'virtual', amount: 15000 },
        { id: 'price-in-person-60', label: 'Presencial 60 min', durationMinutes: 60, modality: 'in_person', amount: 18000 },
      ],
      workingDays: [
        { day: 'monday', enabled: true, startTime: '09:00', endTime: '18:00', intervals: [{ id: 'mon-1', startTime: '09:00', endTime: '18:00' }] },
        { day: 'tuesday', enabled: true, startTime: '09:00', endTime: '18:00', intervals: [{ id: 'tue-1', startTime: '09:00', endTime: '18:00' }] },
        { day: 'wednesday', enabled: true, startTime: '09:00', endTime: '18:00', intervals: [{ id: 'wed-1', startTime: '09:00', endTime: '18:00' }] },
        { day: 'thursday', enabled: true, startTime: '09:00', endTime: '18:00', intervals: [{ id: 'thu-1', startTime: '09:00', endTime: '18:00' }] },
        { day: 'friday', enabled: true, startTime: '09:00', endTime: '18:00', intervals: [{ id: 'fri-1', startTime: '09:00', endTime: '18:00' }] },
        { day: 'saturday', enabled: false, startTime: '09:00', endTime: '13:00' },
        { day: 'sunday', enabled: false, startTime: '09:00', endTime: '13:00' },
      ],
      scheduleBlocks: [],
      appointmentPolicy: { gapMinutes: 10, cancellationNoticeHours: 24, rescheduleNoticeHours: 24, allowLateChangeRequests: true },
      notificationSettings: { appointmentRequested: true, appointmentCancelled: true, appointmentNoShow: true, mealPlanComment: true, nextStepComment: true },
      checkInSettings: { includeSleep: true, includeDigestion: true, includeSatiety: true, includeHelpRequested: true, includeNotes: true },
      anthropometricCustomFields: [],
      googleCalendar: {
        status: 'not_connected',
        syncDirection: 'nutrisoft_to_google',
        blocksExternalEvents: true,
        autoGenerateMeet: true,
      },
      updatedAt: daysAgo(1),
    },
  ];
  const appointmentChangeRequests: AppointmentChangeRequest[] = [];
  const anthropometricMeasurements: AnthropometricMeasurement[] = [
    { id: 'anthro-1', organizationId: 'org-1', patientId: 'pat-1', recordedBy: 'professional', recordedAt: daysAgo(28), weightKg: 74.2, heightCm: 168, waistCm: 86, bodyFatPercentage: 31.2, muscleMassPercentage: 31.8, hydrationPercentage: 49.1, skinfoldMm: 24, visceralFatPercentage: 9 },
    { id: 'anthro-2', organizationId: 'org-1', patientId: 'pat-1', recordedBy: 'patient', recordedAt: daysAgo(14), weightKg: 73.6 },
    { id: 'anthro-3', organizationId: 'org-1', patientId: 'pat-1', recordedBy: 'professional', recordedAt: daysAgo(2), weightKg: 72.9, heightCm: 168, waistCm: 83, bodyFatPercentage: 29.8, muscleMassPercentage: 32.6, hydrationPercentage: 50.4, skinfoldMm: 21, visceralFatPercentage: 8 },
  ];

  return {
    organizations,
    nutritionists,
    patients,
    checkInAssignments,
    checkInResponses,
    alerts,
    recommendations,
    motivationalPhrases,
    professionalResources,
    professionalRecipes,
    mealPlanTemplates,
    mealPlanAssignments,
    nextStepLists,
    mealAdherenceRecords,
    appointments,
    appointmentPaymentMovements,
    appointmentNotifications,
    appointmentChangeRequests,
    professionalPracticeSettings,
    anthropometricMeasurements,
  };
}

// Exportar const estáticas por compatibilidad si es requerido por algún import legacy
const defaultMockData = createInitialMockData();
export const initialOrganizations = defaultMockData.organizations;
export const initialNutritionists = defaultMockData.nutritionists;
export const initialPatients = defaultMockData.patients;
export const initialCheckInAssignments = defaultMockData.checkInAssignments;
export const initialCheckInResponses = defaultMockData.checkInResponses;
export const initialAlerts = defaultMockData.alerts;
export const initialRecommendations = defaultMockData.recommendations;

export const initialPlatformSnapshots: PlatformMonthlySnapshot[] = [
  { month: '2026-01', label: 'Ene', activeOrganizations: 12, activePatients: 380, collectedRevenue: 640000 },
  { month: '2026-02', label: 'Feb', activeOrganizations: 14, activePatients: 425, collectedRevenue: 780000 },
  { month: '2026-03', label: 'Mar', activeOrganizations: 15, activePatients: 470, collectedRevenue: 820000 },
  { month: '2026-04', label: 'Abr', activeOrganizations: 17, activePatients: 535, collectedRevenue: 940000 },
  { month: '2026-05', label: 'May', activeOrganizations: 18, activePatients: 590, collectedRevenue: 1080000 },
  { month: '2026-06', label: 'Jun', activeOrganizations: 20, activePatients: 655, collectedRevenue: 1210000 },
  { month: '2026-07', label: 'Jul', activeOrganizations: 23, activePatients: 740, collectedRevenue: 1390000 },
  { month: '2026-08', label: 'Ago', activeOrganizations: 25, activePatients: 810, collectedRevenue: 1520000 },
];
