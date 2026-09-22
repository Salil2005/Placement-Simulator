import { BarChart as RBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = ["#6366f1", "#818cf8", "#4f46e5", "#a5b4fc", "#4338ca", "#312e81"];

export default function BarChart({ scores }) {
  const data = Object.entries(scores)
    .filter(([key]) => key !== "_id")
    .map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      score: value,
    }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RBarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="score" radius={[8, 8, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </RBarChart>
    </ResponsiveContainer>
  );
}
