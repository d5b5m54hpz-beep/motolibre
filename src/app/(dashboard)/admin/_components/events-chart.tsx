"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Activity } from "lucide-react";

interface EventsChartProps {
  data: Array<{ date: string; count: number }>;
}

export function EventsChart({ data }: EventsChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6">
        <h3 className="text-xs font-medium text-t-secondary uppercase tracking-wider mb-4">
          Actividad del Sistema (30 dias)
        </h3>
        <div className="flex h-[200px] items-center justify-center">
          <div className="text-center">
            <Activity className="mx-auto h-12 w-12 text-t-tertiary mb-4" />
            <p className="text-sm text-t-secondary">Los eventos apareceran aqui</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6">
      <h3 className="text-xs font-medium text-t-secondary uppercase tracking-wider mb-4">
        Actividad del Sistema (30 dias)
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorAccent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7B61FF" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#7B61FF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2A" opacity={0.5} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#44445A", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: string) => {
              const d = new Date(value);
              return `${d.getDate()}/${d.getMonth() + 1}`;
            }}
          />
          <YAxis tick={{ fill: "#44445A", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#13131A",
              border: "1px solid #1E1E2A",
              borderRadius: "12px",
              color: "#FFFFFF",
            }}
            labelFormatter={(value) => {
              const d = new Date(String(value));
              return d.toLocaleDateString("es-AR");
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#7B61FF"
            fill="url(#colorAccent)"
            strokeWidth={2}
            name="Eventos"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
