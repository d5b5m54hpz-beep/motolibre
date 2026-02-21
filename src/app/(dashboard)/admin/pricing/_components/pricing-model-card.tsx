"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Edit2, Check, X } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { TarifaAlquiler } from "@prisma/client";

const PLAN_ORDER = ["MESES_3", "MESES_6", "MESES_9", "MESES_12", "MESES_24"];
const PLAN_LABEL: Record<string, string> = {
  MESES_3: "3m",
  MESES_6: "6m",
  MESES_9: "9m",
  MESES_12: "12m",
  MESES_24: "24m",
};

interface PricingModelCardProps {
  marca: string;
  modelo: string;
  condicion: "NUEVA" | "USADA";
  tarifas: TarifaAlquiler[];
}

export function PricingModelCard({
  marca,
  modelo,
  condicion,
  tarifas,
}: PricingModelCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build editable prices map: plan+frecuencia → precio
  const initPrices = () => {
    const m: Record<string, string> = {};
    for (const t of tarifas) {
      m[`${t.plan}_${t.frecuencia}`] = String(Number(t.precio));
    }
    return m;
  };
  const [prices, setPrices] = useState<Record<string, string>>(initPrices);

  const plansWithData = PLAN_ORDER.filter((plan) =>
    tarifas.some((t) => t.plan === plan)
  );

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const tarifasPayload = Object.entries(prices)
        .filter(([, v]) => v && Number(v) > 0)
        .map(([key, precio]) => {
          const [plan, frecuencia] = key.split("_") as [string, string];
          return { plan, frecuencia, precio: Number(precio) };
        });

      const res = await fetch("/api/pricing/tarifas/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marca, modelo, condicion, tarifas: tarifasPayload }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Error al guardar");
        return;
      }
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {marca} {modelo}{" "}
            <span className={`text-xs font-normal px-1.5 py-0.5 rounded ${condicion === "NUEVA" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
              {condicion}
            </span>
          </CardTitle>
          {!editing ? (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Edit2 className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setPrices(initPrices()); }}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left pb-2 font-medium text-muted-foreground w-16">Plan</th>
                <th className="text-right pb-2 font-medium text-muted-foreground">Semanal</th>
                <th className="text-right pb-2 font-medium text-muted-foreground">Mensual</th>
              </tr>
            </thead>
            <tbody>
              {plansWithData.map((plan) => (
                <tr key={plan} className="border-b last:border-0">
                  <td className="py-1.5 font-medium">{PLAN_LABEL[plan]}</td>
                  {["SEMANAL", "MENSUAL"].map((freq) => {
                    const key = `${plan}_${freq}`;
                    const hasPrice = key in prices;
                    return (
                      <td key={freq} className="py-1.5 text-right">
                        {editing ? (
                          <Input
                            type="number"
                            value={prices[key] ?? ""}
                            onChange={(e) => setPrices((p) => ({ ...p, [key]: e.target.value }))}
                            className="h-7 w-28 text-right text-sm ml-auto"
                            placeholder="0"
                          />
                        ) : hasPrice ? (
                          <span className="tabular-nums">{formatMoney(Number(prices[key]))}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </CardContent>
    </Card>
  );
}
