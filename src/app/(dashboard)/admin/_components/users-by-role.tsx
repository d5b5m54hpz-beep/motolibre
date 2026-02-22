"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface UsersByRoleProps {
  data: Array<{ role: string; count: number }>;
}

export function UsersByRole({ data }: UsersByRoleProps) {
  if (data.length === 0) {
    return null;
  }

  return (
    <div className="bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6">
      <h3 className="text-xs font-medium text-t-secondary uppercase tracking-wider mb-4">
        Usuarios por Rol
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2A" opacity={0.5} />
          <XAxis dataKey="role" tick={{ fill: "#44445A", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#44445A", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#13131A",
              border: "1px solid #1E1E2A",
              borderRadius: "12px",
              color: "#FFFFFF",
            }}
          />
          <Bar dataKey="count" fill="#7B61FF" radius={[4, 4, 0, 0]} name="Usuarios" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
