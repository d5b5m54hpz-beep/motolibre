"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Usuarios por Rol</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="role" stroke="#666" fontSize={12} />
            <YAxis stroke="#666" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1B2D45",
                border: "1px solid #333",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="count" fill="#23e0ff" radius={[4, 4, 0, 0]} name="Usuarios" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
