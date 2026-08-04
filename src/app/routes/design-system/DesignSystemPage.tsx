import React, { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { Dialog } from '../../../components/ui/Dialog';
import { Switch } from '../../../components/ui/Switch';
import { RatingScale } from '../../../components/domain/RatingScale';
import { useToast } from '../../../components/ui/Toast';

export const DesignSystemPage: React.FC = () => {
  const { showToast } = useToast();
  const [ratingVal, setRatingVal] = useState<number | null>(3);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [switchVal, setSwitchVal] = useState<boolean>(true);

  if (!import.meta.env.DEV) {
    return (
      <div className="p-8 text-center text-xs text-[#66727D]">
        La guía del sistema de diseño solo está disponible en modo desarrollo.
      </div>
    );
  }

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
          <div className="p-4 rounded-xl bg-[#55AEB8] text-[#151B22]">Brand Primary<br/>#55AEB8</div>
          <div className="p-4 rounded-xl bg-[#357984] text-white">Brand Strong<br/>#357984</div>
          <div className="p-4 rounded-xl bg-[#DDF3F2] text-[#357984] border border-[#BDE9EA]">Brand Soft<br/>#DDF3F2</div>
          <div className="p-4 rounded-xl bg-[#F5E8A9] text-[#151B22]">Butter Soft<br/>#F5E8A9</div>
          <div className="p-4 rounded-xl bg-[#E8F5EE] text-[#1E5235] border border-[#BDE3CC]">Success<br/>#1E5235</div>
          <div className="p-4 rounded-xl bg-[#FCEBEA] text-[#902A24] border border-[#F8C4C1]">Critical<br/>#902A24</div>
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

      {/* 3. Toasts Accesibles */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#E2E9EC] pb-2">3. Notificaciones Toast (aria-live)</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => showToast('Éxito', 'Operación completada con éxito', 'success')}>
            Probar Toast Éxito
          </Button>
          <Button variant="secondary" onClick={() => showToast('Error', 'Ha ocurrido un problema', 'error')}>
            Probar Toast Error
          </Button>
          <Button variant="secondary" onClick={() => showToast('Información', 'Mensaje del sistema', 'info')}>
            Probar Toast Info
          </Button>
        </div>
      </section>

      {/* 4. Badges & Estados Semánticos */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#E2E9EC] pb-2">4. Badges Semánticos</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="high">🚨 Alerta Alta</Badge>
          <Badge variant="medium">⚠️ Alerta Media</Badge>
          <Badge variant="normal">🟢 Alerta Normal</Badge>
          <Badge variant="active">Activo / Estable</Badge>
          <Badge variant="suspended">Suspendido</Badge>
          <Badge variant="info">Informativo</Badge>
        </div>
      </section>

      {/* 5. Escala 1 a 5 y Switch Radix */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#E2E9EC] pb-2">5. Escala 1-5 y Switch Radix UI</h2>
        <Card className="max-w-md space-y-4">
          <RatingScale
            name="ds-scale"
            legend="¿Cómo evalúas el nivel de energía? (Navegable por teclado)"
            value={ratingVal}
            onChange={setRatingVal}
          />

          <div className="pt-3 border-t border-[#E2E9EC]">
            <Switch
              id="ds-switch"
              checked={switchVal}
              onCheckedChange={setSwitchVal}
              label="Interruptor accesibles (Radix Switch)"
            />
          </div>
        </Card>
      </section>

      {/* 6. Modales Accesibles Radix UI */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#E2E9EC] pb-2">6. Radix Dialog</h2>
        <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
          Abrir Dialog Radix UI
        </Button>

        <Dialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Ejemplo de Dialog Accesible">
          <p className="text-xs text-[#66727D] mb-4">
            Este modal utiliza Radix UI Dialog con trampa de foco, autofocus inicial, restauración de foco y Escape.
          </p>
          <Button variant="primary" onClick={() => setIsModalOpen(false)}>
            Cerrar Dialog
          </Button>
        </Dialog>
      </section>
    </div>
  );
};
