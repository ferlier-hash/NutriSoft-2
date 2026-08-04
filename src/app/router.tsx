import React, { useState, useEffect } from 'react';
import { useMock } from './provider';
import { Sidebar } from '../components/shared/Sidebar';
import { Header } from '../components/shared/Header';
import { MobileBottomNav } from '../components/shared/MobileBottomNav';
import { DevRoleSwitcher } from '../components/shared/DevRoleSwitcher';

// Rutas
import { AdminDashboard } from './routes/admin/AdminDashboard';
import { ProfessionalDashboard } from './routes/professional/ProfessionalDashboard';
import { InboxPage } from './routes/professional/InboxPage';
import { PatientsPage } from './routes/professional/PatientsPage';
import { PatientDetailPage } from './routes/professional/PatientDetailPage';
import { PatientDashboard } from './routes/patient/PatientDashboard';
import { CheckInPage } from './routes/patient/CheckInPage';
import { DesignSystemPage } from './routes/design-system/DesignSystemPage';

export const AppRouter: React.FC = () => {
  const { currentRole, setCurrentRole } = useMock();
  const [currentHash, setCurrentHash] = useState(window.location.hash || '#/professional');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '#/professional';
      setCurrentHash(hash);

      // Sincronizar rol automáticamente según la ruta
      if (hash.startsWith('#/admin') && currentRole !== 'admin') {
        setCurrentRole('admin');
      } else if (hash.startsWith('#/professional') && currentRole !== 'nutritionist') {
        setCurrentRole('nutritionist');
      } else if (hash.startsWith('#/patient') && currentRole !== 'patient') {
        setCurrentRole('patient');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentRole, setCurrentRole]);

  // Renderizador de componentes de ruta
  const renderRouteContent = () => {
    if (currentHash === '#/design-system') {
      return <DesignSystemPage />;
    }

    if (currentHash.startsWith('#/admin')) {
      return <AdminDashboard />;
    }

    if (currentHash === '#/professional/inbox') {
      return <InboxPage />;
    }

    if (currentHash === '#/professional/patients') {
      return <PatientsPage />;
    }

    if (currentHash.startsWith('#/professional/patients/')) {
      return <PatientDetailPage />;
    }

    if (currentHash.startsWith('#/professional')) {
      return <ProfessionalDashboard />;
    }

    if (currentHash.startsWith('#/patient/check-in/')) {
      return <CheckInPage />;
    }

    if (currentHash.startsWith('#/patient')) {
      return <PatientDashboard />;
    }

    // Ruta por defecto
    return <ProfessionalDashboard />;
  };

  return (
    <div className="min-h-screen bg-[#F7F9FA] flex flex-col md:flex-row">
      <DevRoleSwitcher />

      {/* Sidebar para Admin y Nutricionista */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Cabecera para Admin y Nutricionista */}
        <Header />

        {/* Área de contenido principal */}
        <main className="flex-1 overflow-y-auto">
          {renderRouteContent()}
        </main>
      </div>

      {/* Navegación inferior móvil para Pacientes */}
      <MobileBottomNav />
    </div>
  );
};
