import React from 'react';
import { Link } from 'react-router-dom';
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
  return (
    <div className="min-h-screen bg-[#F7F9FA] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#FCEBEA] border border-[#F8C4C1] text-[#C95F59] flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8" />
      </div>

      <h1 className="text-2xl font-bold text-[#151B22] mb-2">{title}</h1>
      <p className="text-xs text-[#66727D] max-w-md mb-6">{message}</p>

      <div className="flex flex-wrap justify-center gap-3">
        <Link to="/professional">
          <Button variant="primary">Ir al panel profesional</Button>
        </Link>
        <Link to="/admin">
          <Button variant="secondary">Ir al panel administrador</Button>
        </Link>
      </div>
    </div>
  );
};
