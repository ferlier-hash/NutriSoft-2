import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { AlertCircle } from 'lucide-react';

interface NotFoundPageProps {
  title?: string;
  message?: string;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  title = 'Página no encontrada (404)',
  message = 'La página o recurso que intentas consultar no existe o no está disponible.',
}) => {
  const location = useLocation();

  const isPatient = location.pathname.startsWith('/patient');
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-bg-app flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#FCEBEA] border border-[#F8C4C1] text-[#902A24] flex items-center justify-center mb-4 shadow-xs">
        <AlertCircle className="w-8 h-8" />
      </div>

      <h1 className="text-2xl font-bold text-text-primary mb-2">{title}</h1>
      <p className="text-xs text-text-secondary max-w-md mb-6">{message}</p>

      <div className="flex flex-wrap justify-center gap-3">
        {isPatient ? (
          <Button asChild variant="primary">
            <Link to="/patient">Volver a mi portal de paciente</Link>
          </Button>
        ) : isAdmin ? (
          <Button asChild variant="primary">
            <Link to="/admin">Volver al panel administrador</Link>
          </Button>
        ) : (
          <Button asChild variant="primary">
            <Link to="/professional">Volver al consultorio profesional</Link>
          </Button>
        )}
      </div>
    </div>
  );
};
