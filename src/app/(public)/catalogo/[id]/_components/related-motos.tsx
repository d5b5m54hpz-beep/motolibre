import { MotoCard } from "../../_components/moto-card";

interface RelatedMoto {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  cilindrada: number | null;
  tipo: string;
  km: number;
  foto: string | null;
  precioDesde: number | null;
  frecuenciaPrecio: string;
}

export function RelatedMotos({ motos }: { motos: RelatedMoto[] }) {
  const displayMotos = motos.filter((m) => m.precioDesde !== null);
  if (displayMotos.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-lg text-t-primary">
        Motos similares
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {displayMotos.map((moto) => (
          <MotoCard
            key={moto.id}
            moto={{
              ...moto,
              destacada: false,
              precioDesde: moto.precioDesde!,
            }}
          />
        ))}
      </div>
    </div>
  );
}
