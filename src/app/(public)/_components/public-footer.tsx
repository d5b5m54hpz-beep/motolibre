import Link from "next/link";
import { Bike } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-bg-card/50">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-[var(--ds-accent)] to-[var(--ds-info)] p-1.5 rounded-lg">
                <Bike className="h-4 w-4 text-white" />
              </div>
              <span className="font-display font-bold text-t-primary">MotoLibre</span>
            </div>
            <p className="text-xs text-t-tertiary leading-relaxed">
              Alquiler de motos con opción de compra. Seguro incluido, service programado, sin depósito.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-t-tertiary">
              Navegación
            </h4>
            <nav className="flex flex-col gap-2">
              <Link href="/catalogo" className="text-sm text-t-secondary hover:text-t-primary transition-colors">
                Catálogo
              </Link>
              <Link href="/registro" className="text-sm text-t-secondary hover:text-t-primary transition-colors">
                Registrarse
              </Link>
            </nav>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-t-tertiary">
              Legal
            </h4>
            <nav className="flex flex-col gap-2">
              <span className="text-sm text-t-tertiary">Términos y condiciones</span>
              <span className="text-sm text-t-tertiary">Política de privacidad</span>
            </nav>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-t-tertiary">
              Contacto
            </h4>
            <p className="text-sm text-t-secondary">Buenos Aires, Argentina</p>
            <p className="text-sm text-t-secondary">info@motolibre.com.ar</p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-xs text-t-tertiary">
            © {new Date().getFullYear()} MotoLibre S.A. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
