import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../../components/shared/Sidebar';
import { Header } from '../../components/shared/Header';
import { DevRoleSwitcher } from '../../components/shared/DevRoleSwitcher';

export const ProfessionalLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F7F9FA] flex flex-col md:flex-row">
      <DevRoleSwitcher />
      <Sidebar portal="professional" />
      <div className="flex-1 flex flex-col min-w-0">
        <Header portal="professional" />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
