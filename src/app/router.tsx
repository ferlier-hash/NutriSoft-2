import { lazy, Suspense } from 'react';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { NotFoundPage } from './routes/NotFoundPage';
import { LoginPage } from './routes/auth/LoginPage';
import { ForgotPasswordPage } from './routes/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './routes/auth/ResetPasswordPage';
import { AccessPendingPage } from './routes/auth/AccessPendingPage';
import { AccountSuspendedPage } from './routes/auth/AccountSuspendedPage';
import { AuthLandingRedirect, DataIntegrationPendingPage, PortalGuard } from '../auth/PortalGuard';
import { publicEnvironment } from '../config/environment';

const AdminLayout = lazy(() => import('./layouts/AdminLayout').then(module => ({ default: module.AdminLayout })));
const RealAdminLayout = lazy(() => import('./layouts/RealAdminLayout').then(module => ({ default: module.RealAdminLayout })));
const ProfessionalLayout = lazy(() => import('./layouts/ProfessionalLayout').then(module => ({ default: module.ProfessionalLayout })));
const PatientLayout = lazy(() => import('./layouts/PatientLayout').then(module => ({ default: module.PatientLayout })));
const RealClinicalLayout = lazy(() => import('./layouts/RealClinicalLayout').then(module => ({ default: module.RealClinicalLayout })));
const AdminOverviewPage = lazy(() => import('./routes/admin/AdminOverviewPage').then(module => ({ default: module.AdminOverviewPage })));
const RealAdminOverviewPage = lazy(() => import('./routes/admin/RealAdminOverviewPage').then(module => ({ default: module.RealAdminOverviewPage })));
const RealOrganizationsPage = lazy(() => import('./routes/admin/RealOrganizationsPage').then(module => ({ default: module.RealOrganizationsPage })));
const OrganizationsPage = lazy(() => import('./routes/admin/OrganizationsPage').then(module => ({ default: module.OrganizationsPage })));
const OrganizationDetailPage = lazy(() => import('./routes/admin/OrganizationDetailPage').then(module => ({ default: module.OrganizationDetailPage })));
const NutritionistsListPage = lazy(() => import('./routes/admin/NutritionistsListPage').then(module => ({ default: module.NutritionistsListPage })));
const NutritionistDetailPage = lazy(() => import('./routes/admin/NutritionistDetailPage').then(module => ({ default: module.NutritionistDetailPage })));
const AdminPatientDetailPage = lazy(() => import('./routes/admin/AdminPatientDetailPage').then(module => ({ default: module.AdminPatientDetailPage })));
const ProfessionalDashboard = lazy(() => import('./routes/professional/ProfessionalDashboard').then(module => ({ default: module.ProfessionalDashboard })));
const InboxPage = lazy(() => import('./routes/professional/InboxPage').then(module => ({ default: module.InboxPage })));
const RealInboxPage = lazy(() => import('./routes/professional/RealInboxPage').then(module => ({ default: module.RealInboxPage })));
const PatientsPage = lazy(() => import('./routes/professional/PatientsPage').then(module => ({ default: module.PatientsPage })));
const RealPatientsPage = lazy(() => import('./routes/professional/RealPatientsPage').then(module => ({ default: module.RealPatientsPage })));
const PatientDetailPage = lazy(() => import('./routes/professional/PatientDetailPage').then(module => ({ default: module.PatientDetailPage })));
const RealPatientDetailPage = lazy(() => import('./routes/professional/RealPatientDetailPage').then(module => ({ default: module.RealPatientDetailPage })));
const ResourcesPage = lazy(() => import('./routes/professional/ResourcesPage').then(module => ({ default: module.ResourcesPage })));
const RealResourcesPage = lazy(() => import('./routes/professional/RealResourcesPage').then(module => ({ default: module.RealResourcesPage })));
const RecipesPage = lazy(() => import('./routes/professional/RecipesPage').then(module => ({ default: module.RecipesPage })));
const RealRecipesPage = lazy(() => import('./routes/professional/RealRecipesPage').then(module => ({ default: module.RealRecipesPage })));
const ProfessionalProfilePage = lazy(() => import('./routes/professional/ProfessionalProfilePage').then(module => ({ default: module.ProfessionalProfilePage })));
const RealProfessionalProfilePage = lazy(() => import('./routes/professional/RealProfessionalProfilePage').then(module => ({ default: module.RealProfessionalProfilePage })));
const MealPlansPage = lazy(() => import('./routes/professional/MealPlansPage').then(module => ({ default: module.MealPlansPage })));
const RealMealPlansPage = lazy(() => import('./routes/professional/RealMealPlansPage').then(module => ({ default: module.RealMealPlansPage })));
const MealPlanEditorPage = lazy(() => import('./routes/professional/MealPlanEditorPage').then(module => ({ default: module.MealPlanEditorPage })));
const RealMealPlanEditorPage = lazy(() => import('./routes/professional/RealMealPlanEditorPage').then(module => ({ default: module.RealMealPlanEditorPage })));
const RecommendationsPage = lazy(() => import('./routes/professional/RecommendationsPage').then(module => ({ default: module.RecommendationsPage })));
const RealRecommendationsPage = lazy(() => import('./routes/professional/RealRecommendationsPage').then(module => ({ default: module.RealRecommendationsPage })));
const NextStepsPage = lazy(() => import('./routes/professional/NextStepsPage').then(module => ({ default: module.NextStepsPage })));
const CheckInsPage = lazy(() => import('./routes/professional/CheckInsPage').then(module => ({ default: module.CheckInsPage })));
const AgendaPage = lazy(() => import('./routes/professional/AgendaPage').then(module => ({ default: module.AgendaPage })));
const RealAgendaPage = lazy(() => import('./routes/professional/RealAgendaPage').then(module => ({ default: module.RealAgendaPage })));
const AppointmentsPage = lazy(() => import('./routes/professional/AppointmentsPage').then(module => ({ default: module.AppointmentsPage })));
const IncomePage = lazy(() => import('./routes/professional/IncomePage').then(module => ({ default: module.IncomePage })));
const RealIncomePage = lazy(() => import('./routes/professional/RealIncomePage').then(module => ({ default: module.RealIncomePage })));
const ProfessionalSettingsPage = lazy(() => import('./routes/professional/ProfessionalSettingsPage').then(module => ({ default: module.ProfessionalSettingsPage })));
const RealGoogleCalendarSettingsPage = lazy(() => import('./routes/professional/RealGoogleCalendarSettingsPage').then(module => ({ default: module.RealGoogleCalendarSettingsPage })));
const RealProfessionalHomePage = lazy(() => import('./routes/professional/RealProfessionalHomePage').then(module => ({ default: module.RealProfessionalHomePage })));
const RealClinicalReportsPage = lazy(() => import('./routes/professional/RealClinicalReportsPage').then(module => ({ default: module.RealClinicalReportsPage })));
const RecipeDetailPage = lazy(() => import('./routes/shared/RecipeDetailPage').then(module => ({ default: module.RecipeDetailPage })));
const RealDailyFollowupPage = lazy(() => import('./routes/shared/RealDailyFollowupPage').then(module => ({ default: module.RealDailyFollowupPage })));
const RealLibraryPage = lazy(() => import('./routes/shared/RealLibraryPage').then(module => ({ default: module.RealLibraryPage })));
const PatientDashboard = lazy(() => import('./routes/patient/PatientDashboard').then(module => ({ default: module.PatientDashboard })));
const CheckInPage = lazy(() => import('./routes/patient/CheckInPage').then(module => ({ default: module.CheckInPage })));
const PatientAppointmentRequestPage = lazy(() => import('./routes/patient/PatientAppointmentRequestPage').then(module => ({ default: module.PatientAppointmentRequestPage })));
const PatientAppointmentsPage = lazy(() => import('./routes/patient/PatientAppointmentsPage').then(module => ({ default: module.PatientAppointmentsPage })));
const RealPatientAppointmentsPage = lazy(() => import('./routes/patient/RealPatientAppointmentsPage').then(module => ({ default: module.RealPatientAppointmentsPage })));
const PatientMeasurementsPage = lazy(() => import('./routes/patient/PatientMeasurementsPage').then(module => ({ default: module.PatientMeasurementsPage })));
const PatientResourcesPage = lazy(() => import('./routes/patient/PatientResourcesPage').then(module => ({ default: module.PatientResourcesPage })));
const PatientRecipesPage = lazy(() => import('./routes/patient/PatientRecipesPage').then(module => ({ default: module.PatientRecipesPage })));
const RealPatientHomePage = lazy(() => import('./routes/patient/RealPatientHomePage').then(module => ({ default: module.RealPatientHomePage })));
const DesignSystemPage = lazy(() => import('./routes/design-system/DesignSystemPage').then(module => ({ default: module.DesignSystemPage })));

const realDataPending = <DataIntegrationPendingPage />;

export const router = createHashRouter([
  {
    path: '/',
    element: <AuthLandingRedirect />,
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/access-pending', element: <AccessPendingPage /> },
  { path: '/account-suspended', element: <AccountSuspendedPage /> },
  {
    path: '/admin',
    element: <PortalGuard portal="admin">{publicEnvironment.demoMode ? <AdminLayout /> : <RealAdminLayout />}</PortalGuard>,
    children: [
      { index: true, element: publicEnvironment.demoMode ? <AdminOverviewPage /> : <RealAdminOverviewPage /> },
      { path: 'organizations', element: publicEnvironment.demoMode ? <OrganizationsPage /> : <RealOrganizationsPage /> },
      { path: 'organizations/:organizationId', element: publicEnvironment.demoMode ? <OrganizationDetailPage /> : realDataPending },
      { path: 'nutritionists', element: publicEnvironment.demoMode ? <NutritionistsListPage /> : realDataPending },
      { path: 'nutritionists/:nutritionistId', element: publicEnvironment.demoMode ? <NutritionistDetailPage /> : realDataPending },
      { path: 'nutritionists/:nutritionistId/patients/:patientId', element: publicEnvironment.demoMode ? <AdminPatientDetailPage /> : realDataPending },
      {
        path: 'patients',
        element: (
          <NotFoundPage
            title="Acceso directo no permitido"
            message="El acceso a pacientes en el portal Administrador se realiza exclusivamente desde el perfil del nutricionista responsable."
          />
        ),
      },
    ],
  },
  {
    path: '/professional',
    element: <PortalGuard portal="professional">{publicEnvironment.demoMode ? <ProfessionalLayout /> : <RealClinicalLayout portal="professional" />}</PortalGuard>,
    children: [
      { index: true, element: publicEnvironment.demoMode ? <ProfessionalDashboard /> : <RealProfessionalHomePage /> },
      { path: 'inbox', element: publicEnvironment.demoMode ? <InboxPage /> : <RealInboxPage /> },
      { path: 'patients', element: publicEnvironment.demoMode ? <PatientsPage /> : <RealPatientsPage /> },
      { path: 'patients/:patientId', element: publicEnvironment.demoMode ? <PatientDetailPage /> : <RealPatientDetailPage /> },
      { path: 'profile', element: publicEnvironment.demoMode ? <ProfessionalProfilePage /> : <RealProfessionalProfilePage /> },
      { path: 'meal-plans', element: publicEnvironment.demoMode ? <MealPlansPage /> : <RealMealPlansPage /> },
      { path: 'meal-plans/:planId', element: publicEnvironment.demoMode ? <MealPlanEditorPage /> : <RealMealPlanEditorPage /> },
      { path: 'resources', element: publicEnvironment.demoMode ? <ResourcesPage /> : <RealResourcesPage /> },
      { path: 'recipes', element: publicEnvironment.demoMode ? <RecipesPage /> : <RealRecipesPage /> },
      { path: 'recipes/:recipeId', element: publicEnvironment.demoMode ? <RecipeDetailPage portal="professional" /> : <RealRecipesPage /> },
      { path: 'followup', element: <RealDailyFollowupPage standalone /> },
      { path: 'patients/:patientId/followup', element: <RealDailyFollowupPage /> },
      { path: 'recommendations', element: publicEnvironment.demoMode ? <RecommendationsPage /> : <RealRecommendationsPage /> },
      { path: 'next-steps', element: publicEnvironment.demoMode ? <NextStepsPage /> : <RealDailyFollowupPage section="steps" standalone /> },
      { path: 'checkins', element: publicEnvironment.demoMode ? <CheckInsPage /> : <RealDailyFollowupPage section="checkins" standalone /> },
      { path: 'agenda', element: publicEnvironment.demoMode ? <AgendaPage /> : <RealAgendaPage /> },
      { path: 'appointments', element: publicEnvironment.demoMode ? <AppointmentsPage /> : realDataPending },
      { path: 'income', element: publicEnvironment.demoMode ? <IncomePage /> : <RealIncomePage /> },
      { path: 'reports', element: publicEnvironment.demoMode ? realDataPending : <RealClinicalReportsPage /> },
      { path: 'settings', element: publicEnvironment.demoMode ? <ProfessionalSettingsPage /> : <RealGoogleCalendarSettingsPage /> },
    ],
  },
  {
    path: '/patient',
    element: <PortalGuard portal="patient">{publicEnvironment.demoMode ? <PatientLayout /> : <RealClinicalLayout portal="patient" />}</PortalGuard>,
    children: [
      { index: true, element: publicEnvironment.demoMode ? <PatientDashboard /> : <RealPatientHomePage /> },
      { path: 'followup', element: <RealDailyFollowupPage patient /> },
      { path: 'check-in/:assignmentId', element: publicEnvironment.demoMode ? <CheckInPage /> : <RealDailyFollowupPage patient section="checkins" /> },
      { path: 'request-appointment', element: publicEnvironment.demoMode ? <PatientAppointmentRequestPage /> : realDataPending },
      { path: 'appointments', element: publicEnvironment.demoMode ? <PatientAppointmentsPage /> : <RealPatientAppointmentsPage /> },
      { path: 'measurements', element: publicEnvironment.demoMode ? <PatientMeasurementsPage /> : <RealDailyFollowupPage patient section="weight" /> },
      { path: 'recipes', element: publicEnvironment.demoMode ? <PatientRecipesPage /> : <RealLibraryPage recipes={true} patient={true} /> },
      { path: 'recipes/:recipeId', element: publicEnvironment.demoMode ? <RecipeDetailPage portal="patient" /> : <RealLibraryPage recipes={true} patient={true} /> },
      { path: 'resources', element: publicEnvironment.demoMode ? <PatientResourcesPage /> : <RealLibraryPage recipes={false} patient={true} /> },
    ],
  },
  {
    path: '/design-system',
    element: import.meta.env.DEV ? (
      <DesignSystemPage />
    ) : (
      <NotFoundPage title="Página no encontrada (404)" message="La ruta solicitada no existe o no está disponible." />
    ),
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export function AppRouter() {
  return <Suspense fallback={<p role="status" className="p-4 text-sm text-text-secondary">Cargando sección…</p>}><RouterProvider router={router} /></Suspense>;
}
