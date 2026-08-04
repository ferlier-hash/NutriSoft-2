import React from 'react';
import { Outlet } from 'react-router-dom';
import { MobileBottomNav } from '../../components/shared/MobileBottomNav';
import { DevRoleSwitcher } from '../../components/shared/DevRoleSwitcher';

export const PatientLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F7F9FA] relative pb-16">
      <DevRoleSwitcher />
      <main>
        <Outlet />
      </main>
      <MobileBottomNav />
    </div>
  );
};
