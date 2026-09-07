import React from 'react';
import { Outlet } from 'react-router-dom';
import { MobileBottomNav } from '../../components/shared/MobileBottomNav';
import { DevRoleSwitcher } from '../../components/shared/DevRoleSwitcher';
import { useMock } from '../provider';
import { organizationBrandingStyle } from '../../lib/organizationBranding';

export const PatientLayout: React.FC = () => {
  const { currentDemoPatient, organizations } = useMock();
  const organization = currentDemoPatient ? organizations.find(item => item.id === currentDemoPatient.organizationId) : null;
  const branding = organization?.plan === 'CUSTOM' ? organization.branding : undefined;
  return (
    <div className="min-h-screen bg-[#F7F9FA] relative pb-16" style={organizationBrandingStyle(branding)}>
      <DevRoleSwitcher />
      <main>
        <Outlet />
      </main>
      <MobileBottomNav />
    </div>
  );
};
