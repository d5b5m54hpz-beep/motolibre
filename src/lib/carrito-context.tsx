"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface CartItem {
  repuestoId: string;
  nombre: string;
  codigo: string;
  precio: number;
  cantidad: number;
  stock: number;
}

interface CarritoContextType {
  items: CartItem[];
  agregarItem: (item: Omit<CartItem, "cantidad"> & { cantidad?: number }) => void;
  eliminarItem: (repuestoId: string) => void;
  actualizarCantidad: (repuestoId: string, cantidad: number) => void;
  vaciarCarrito: () => void;
  totalItems: number;
  totalPrecio: number;
}

const CarritoContext = createContext<CarritoContextType | null>(null);

const STORAGE_KEY = "motolibre-carrito";

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const agregarItem = useCallback(
    (item: Omit<CartItem, "cantidad"> & { cantidad?: number }) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.repuestoId === item.repuestoId);
        if (existing) {
          const newCantidad = Math.min(
            existing.cantidad + (item.cantidad ?? 1),
            item.stock
          );
          return prev.map((i) =>
            i.repuestoId === item.repuestoId ? { ...i, cantidad: newCantidad } : i
          );
        }
        return [...prev, { ...item, cantidad: item.cantidad ?? 1 }];
      });
    },
    []
  );

  const eliminarItem = useCallback((repuestoId: string) => {
    setItems((prev) => prev.filter((i) => i.repuestoId !== repuestoId));
  }, []);

  const actualizarCantidad = useCallback((repuestoId: string, cantidad: number) => {
    if (cantidad <= 0) {
      setItems((prev) => prev.filter((i) => i.repuestoId !== repuestoId));
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.repuestoId === repuestoId
          ? { ...i, cantidad: Math.min(cantidad, i.stock) }
          : i
      )
    );
  }, []);

  const vaciarCarrito = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.cantidad, 0);
  const totalPrecio = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0);

  return (
    <CarritoContext.Provider
      value={{
        items,
        agregarItem,
        eliminarItem,
        actualizarCantidad,
        vaciarCarrito,
        totalItems,
        totalPrecio,
      }}
    >
      {children}
    </CarritoContext.Provider>
  );
}

export function useCarrito() {
  const ctx = useContext(CarritoContext);
  if (!ctx) throw new Error("useCarrito debe usarse dentro de CarritoProvider");
  return ctx;
}
