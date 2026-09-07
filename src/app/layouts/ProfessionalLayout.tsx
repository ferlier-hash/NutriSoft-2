import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../../components/shared/Sidebar';
import { Header } from '../../components/shared/Header';
import { DevRoleSwitcher } from '../../components/shared/DevRoleSwitcher';
import { ProfessionalMobileNav } from '../../components/shared/ProfessionalMobileNav';
import { useMock } from '../provider';
import { organizationBrandingStyle } from '../../lib/organizationBranding';

export const ProfessionalLayout: React.FC = () => {
  const { currentDemoNutritionist, organizations } = useMock();
  const organization = currentDemoNutritionist ? organizations.find(item => item.id === currentDemoNutritionist.organizationId) : null;
  const branding = organization?.plan === 'CUSTOM' ? organization.branding : undefined;
  return (
    <div className="min-h-screen bg-[#F7F9FA] flex flex-col md:flex-row" style={organizationBrandingStyle(branding)}>
      <DevRoleSwitcher />
      <Sidebar portal="professional" />
      <div className="flex-1 flex flex-col min-w-0">
        <Header portal="professional" />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>
        <ProfessionalMobileNav />
      </div>
    </div>
  );
};
