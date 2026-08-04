import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { ProfessionalLayout } from './layouts/ProfessionalLayout';
import { PatientLayout } from './layouts/PatientLayout';

// Componentes de Ruta
import { AdminDashboard } from './routes/admin/AdminDashboard';
import { NutritionistsListPage } from './routes/admin/NutritionistsListPage';
import { NutritionistDetailPage } from './routes/admin/NutritionistDetailPage';
import { AdminPatientDetailPage } from './routes/admin/AdminPatientDetailPage';

import { ProfessionalDashboard } from './routes/professional/ProfessionalDashboard';
import { InboxPage } from './routes/professional/InboxPage';
import { PatientsPage } from './routes/professional/PatientsPage';
import { PatientDetailPage } from './routes/professional/PatientDetailPage';

import { PatientDashboard } from './routes/patient/PatientDashboard';
import { CheckInPage } from './routes/patient/CheckInPage';

import { DesignSystemPage } from './routes/design-system/DesignSystemPage';
import { NotFoundPage } from './routes/NotFoundPage';

export const router = createHashRouter([
  {
    path: '/',
    element: <Navigate to="/professional" replace />,
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'organizations', element: <AdminDashboard /> },
      { path: 'organizations/:organizationId', element: <AdminDashboard /> },
      { path: 'nutritionists', element: <NutritionistsListPage /> },
      { path: 'nutritionists/:nutritionistId', element: <NutritionistDetailPage /> },
      { path: 'nutritionists/:nutritionistId/patients/:patientId', element: <AdminPatientDetailPage /> },
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
    element: <ProfessionalLayout />,
    children: [
      { index: true, element: <ProfessionalDashboard /> },
      { path: 'inbox', element: <InboxPage /> },
      { path: 'patients', element: <PatientsPage /> },
      { path: 'patients/:patientId', element: <PatientDetailPage /> },
    ],
  },
  {
    path: '/patient',
    element: <PatientLayout />,
    children: [
      { index: true, element: <PatientDashboard /> },
      { path: 'check-in/:assignmentId', element: <CheckInPage /> },
    ],
  },
  {
    path: '/design-system',
    element: <DesignSystemPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
