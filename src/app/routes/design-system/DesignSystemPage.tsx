import React, { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { Modal } from '../../../components/ui/Modal';
import { RatingScale } from '../../../components/domain/RatingScale';

export const DesignSystemPage: React.FC = () => {
  // Proteger la ruta en producción
  if (!import.meta.env.DEV) {
    return (
      <div className="p-8 text-center text-xs text-[#66727D]">
        La guía del sistema de diseño solo está disponible en modo desarrollo.
      </div>
    );
  }

  const [ratingVal, setRatingVal] = useState<number>(3);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  return (
    <div className="p-8 space-y-10 max-w-6xl mx-auto bg-[#F7F9FA] text-[#151B22]">
      <div>
        <h1 className="text-3xl font-bold text-[#151B22]">Sistema de Diseño NutriSoft</h1>
        <p className="text-sm text-[#66727D] mt-1">
          Catálogo interactivo de tokens, componentes y patrones visuales (Concepto A).
        </p>
      </div>

      {/* 1. Paleta de Colores */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#E2E9EC] pb-2">1. Paleta de Colores & Tokens</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs font-semibold">
          <div className="p-4 rounded-xl bg-[#55AEB8] text-white">Brand Primary<br/>#55AEB8</div>
          <div className="p-4 rounded-xl bg-[#357984] text-white">Brand Strong<br/>#357984</div>
          <div className="p-4 rounded-xl bg-[#DDF3F2] text-[#357984] border border-[#BDE9EA]">Brand Soft<br/>#DDF3F2</div>
          <div className="p-4 rounded-xl bg-[#F5E8A9] text-[#151B22]">Butter Soft<br/>#F5E8A9</div>
          <div className="p-4 rounded-xl bg-[#E8F5EE] text-[#39835A] border border-[#BDE3CC]">Success<br/>#39835A</div>
          <div className="p-4 rounded-xl bg-[#FCEBEA] text-[#C95F59] border border-[#F8C4C1]">Critical<br/>#C95F59</div>
        </div>
      </section>

      {/* 2. Botones */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#E2E9EC] pb-2">2. Botones & Gradientes</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Botón Principal (Gradiente)</Button>
          <Button variant="brand">Botón Marca</Button>
          <Button variant="secondary">Botón Secundario</Button>
          <Button variant="outline">Botón Borde</Button>
          <Button variant="ghost">Botón Fantasma</Button>
          <Button variant="destructive">Botón Destructivo</Button>
        </div>
      </section>

      {/* 3. Badges & Estados Semánticos */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#E2E9EC] pb-2">3. Badges Semánticos</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="high">🚨 Alerta Alta</Badge>
          <Badge variant="medium">⚠️ Alerta Media</Badge>
          <Badge variant="normal">🟢 Alerta Normal</Badge>
          <Badge variant="active">Activo / Estable</Badge>
          <Badge variant="suspended">Suspendido</Badge>
          <Badge variant="info">Informativo</Badge>
        </div>
      </section>

      {/* 4. Escala 1 a 5 Accesible */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#E2E9EC] pb-2">4. Escala 1 a 5 (Radio Inputs HTML)</h2>
        <Card className="max-w-md">
          <RatingScale
            name="ds-scale"
            legend="¿Cómo evalúas el nivel de energía? (Navegable por teclado)"
            value={ratingVal}
            onChange={setRatingVal}
          />
          <p className="text-xs text-[#66727D] mt-2">Valor seleccionado: <strong>{ratingVal}</strong></p>
        </Card>
      </section>

      {/* 5. Modales & Tarjetas */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#E2E9EC] pb-2">5. Modales & Contenedores</h2>
        <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
          Abrir Modal Demostrativo
        </Button>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Ejemplo de Modal Accesible">
          <p className="text-xs text-[#66727D] mb-4">
            Este modal soporta la tecla Escape, trampa de foco y atributos aria-modal.
          </p>
          <Button variant="primary" onClick={() => setIsModalOpen(false)}>
            Cerrar Modal
          </Button>
        </Modal>
      </section>

      {/* 6. Skeletons & Estados Vacíos */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#E2E9EC] pb-2">6. Skeletons & Estados Vacíos</h2>
        <div className="grid grid-cols-2 gap-4">
          <Card className="animate-pulse space-y-3">
            <div className="h-4 bg-[#E2E9EC] rounded w-3/4"></div>
            <div className="h-3 bg-[#E2E9EC] rounded w-1/2"></div>
            <div className="h-8 bg-[#E2E9EC] rounded w-full"></div>
          </Card>
          <Card className="text-center py-6 text-xs text-[#66727D]">
            Estado vacío demostrativo
          </Card>
        </div>
      </section>
    </div>
  );
};
