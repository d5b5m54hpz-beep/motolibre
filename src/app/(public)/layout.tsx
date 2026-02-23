import { PublicNavbar } from "./_components/public-navbar";
import { PublicFooter } from "./_components/public-footer";
import { CarritoProvider } from "@/lib/carrito-context";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CarritoProvider>
      <div className="min-h-screen flex flex-col bg-bg-primary">
        <PublicNavbar />
        <main className="flex-1">{children}</main>
        <PublicFooter />
      </div>
    </CarritoProvider>
  );
}
