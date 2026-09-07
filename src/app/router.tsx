import { createHashRouter, RouterProvider } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { RealAdminLayout } from './layouts/RealAdminLayout';
import { ProfessionalLayout } from './layouts/ProfessionalLayout';
import { RealPatientDetailPage } from './routes/professional/RealPatientDetailPage';
import { PatientLayout } from './layouts/PatientLayout';
import { RealClinicalLayout } from './layouts/RealClinicalLayout';

// Componentes de Ruta
import { AdminOverviewPage } from './routes/admin/AdminOverviewPage';
import { RealAdminOverviewPage } from './routes/admin/RealAdminOverviewPage';
import { RealOrganizationsPage } from './routes/admin/RealOrganizationsPage';
import { OrganizationsPage } from './routes/admin/OrganizationsPage';
import { OrganizationDetailPage } from './routes/admin/OrganizationDetailPage';
import { NutritionistsListPage } from './routes/admin/NutritionistsListPage';
import { NutritionistDetailPage } from './routes/admin/NutritionistDetailPage';
import { AdminPatientDetailPage } from './routes/admin/AdminPatientDetailPage';

import { ProfessionalDashboard } from './routes/professional/ProfessionalDashboard';
import { InboxPage } from './routes/professional/InboxPage';
import { RealInboxPage } from './routes/professional/RealInboxPage';
import { PatientsPage } from './routes/professional/PatientsPage';
import { PatientDetailPage } from './routes/professional/PatientDetailPage';
import { ResourcesPage } from './routes/professional/ResourcesPage';
import { RecipesPage } from './routes/professional/RecipesPage';
import { ProfessionalProfilePage } from './routes/professional/ProfessionalProfilePage';
import { RealProfessionalProfilePage } from './routes/professional/RealProfessionalProfilePage';
import { MealPlansPage } from './routes/professional/MealPlansPage';
import { MealPlanEditorPage } from './routes/professional/MealPlanEditorPage';
import { RealMealPlansPage } from './routes/professional/RealMealPlansPage';
import { RealMealPlanEditorPage } from './routes/professional/RealMealPlanEditorPage';
import { RecommendationsPage } from './routes/professional/RecommendationsPage';
import { NextStepsPage } from './routes/professional/NextStepsPage';
import { CheckInsPage } from './routes/professional/CheckInsPage';
import { AgendaPage } from './routes/professional/AgendaPage';
import { PatientAppointmentRequestPage } from './routes/patient/PatientAppointmentRequestPage';
import { PatientAppointmentsPage } from './routes/patient/PatientAppointmentsPage';
import { PatientMeasurementsPage } from './routes/patient/PatientMeasurementsPage';
import { AppointmentsPage } from './routes/professional/AppointmentsPage';
import { IncomePage } from './routes/professional/IncomePage';
import { ProfessionalSettingsPage } from './routes/professional/ProfessionalSettingsPage';
import { RealGoogleCalendarSettingsPage } from './routes/professional/RealGoogleCalendarSettingsPage';
import { RealAgendaPage } from './routes/professional/RealAgendaPage';
import { RealPatientsPage } from './routes/professional/RealPatientsPage';
import { RecipeDetailPage } from './routes/shared/RecipeDetailPage';

import { PatientDashboard } from './routes/patient/PatientDashboard';
import { CheckInPage } from './routes/patient/CheckInPage';
import { PatientResourcesPage } from './routes/patient/PatientResourcesPage';
import { PatientRecipesPage } from './routes/patient/PatientRecipesPage';
import { RealPatientMealPlansPage } from './routes/patient/RealPatientMealPlansPage';
import { RealPatientAppointmentsPage } from './routes/patient/RealPatientAppointmentsPage';

import { DesignSystemPage } from './routes/design-system/DesignSystemPage';
import { NotFoundPage } from './routes/NotFoundPage';
import { LoginPage } from './routes/auth/LoginPage';
import { ForgotPasswordPage } from './routes/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './routes/auth/ResetPasswordPage';
import { AccessPendingPage } from './routes/auth/AccessPendingPage';
import { AccountSuspendedPage } from './routes/auth/AccountSuspendedPage';
import { AuthLandingRedirect, DataIntegrationPendingPage, PortalGuard } from '../auth/PortalGuard';
import { publicEnvironment } from '../config/environment';

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
      { index: true, element: publicEnvironment.demoMode ? <ProfessionalDashboard /> : <RealMealPlansPage /> },
      { path: 'inbox', element: publicEnvironment.demoMode ? <InboxPage /> : <RealInboxPage /> },
      { path: 'patients', element: publicEnvironment.demoMode ? <PatientsPage /> : <RealPatientsPage /> },
      { path: 'patients/:patientId', element: publicEnvironment.demoMode ? <PatientDetailPage /> : <RealPatientDetailPage /> },
      { path: 'profile', element: publicEnvironment.demoMode ? <ProfessionalProfilePage /> : <RealProfessionalProfilePage /> },
      { path: 'meal-plans', element: publicEnvironment.demoMode ? <MealPlansPage /> : <RealMealPlansPage /> },
      { path: 'meal-plans/:planId', element: publicEnvironment.demoMode ? <MealPlanEditorPage /> : <RealMealPlanEditorPage /> },
      { path: 'resources', element: publicEnvironment.demoMode ? <ResourcesPage /> : <RealLibraryPage recipes={false} patient={false} /> },
      { path: 'recipes', element: publicEnvironment.demoMode ? <RecipesPage /> : <RealLibraryPage recipes={true} patient={false} /> },
      { path: 'recipes/:recipeId', element: publicEnvironment.demoMode ? <RecipeDetailPage portal="professional" /> : <RealLibraryPage recipes={true} patient={false} /> },
      { path: 'followup', element: <RealDailyFollowupPage /> },
      { path: 'patients/:patientId/followup', element: <RealDailyFollowupPage /> },
      { path: 'recommendations', element: publicEnvironment.demoMode ? <RecommendationsPage /> : <RealDailyFollowupPage section="phrases" /> },
      { path: 'next-steps', element: publicEnvironment.demoMode ? <NextStepsPage /> : <RealDailyFollowupPage section="steps" /> },
      { path: 'checkins', element: publicEnvironment.demoMode ? <CheckInsPage /> : <RealDailyFollowupPage section="checkins" /> },
      { path: 'agenda', element: publicEnvironment.demoMode ? <AgendaPage /> : <RealAgendaPage /> },
      { path: 'appointments', element: publicEnvironment.demoMode ? <AppointmentsPage /> : realDataPending },
      { path: 'income', element: publicEnvironment.demoMode ? <IncomePage /> : <RealIncomePage /> },
      { path: 'settings', element: publicEnvironment.demoMode ? <ProfessionalSettingsPage /> : <RealGoogleCalendarSettingsPage /> },
    ],
  },
  {
    path: '/patient',
    element: <PortalGuard portal="patient">{publicEnvironment.demoMode ? <PatientLayout /> : <RealClinicalLayout portal="patient" />}</PortalGuard>,
    children: [
      { index: true, element: publicEnvironment.demoMode ? <PatientDashboard /> : <RealPatientMealPlansPage /> },
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
  return <RouterProvider router={router} />;
}
import { RealLibraryPage } from './routes/shared/RealLibraryPage';
import { RealDailyFollowupPage } from './routes/shared/RealDailyFollowupPage';
import { RealIncomePage } from './routes/professional/RealIncomePage';
