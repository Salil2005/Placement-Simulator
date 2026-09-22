import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#6366f1", "#8b5cf6", "#0ea5e9", "#14b8a6", "#f59e0b", "#ec4899"];

function MarksTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { question, marks } = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-xl shadow-slate-950/10 dark:border-slate-700 dark:bg-slate-800">
      <p className="font-semibold text-slate-900 dark:text-white">{question}</p>
      <p className="mt-0.5 text-slate-500 dark:text-slate-400">{marks}/10 marks</p>
    </div>
  );
}

export default function QuestionMarksPieChart({ questionMarks = [] }) {
  if (!questionMarks.length) {
    return <p className="flex h-[280px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">No question marks available.</p>;
  }

  const total = questionMarks.reduce((sum, item) => sum + item.marks, 0);
  const average = total / questionMarks.length;

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={questionMarks}
            dataKey="marks"
            nameKey="question"
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={94}
            paddingAngle={3}
            stroke="none"
            label={false}
          >
            {questionMarks.map((item, index) => (
              <Cell key={`${item.question}-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <text x="50%" y="47%" textAnchor="middle" className="fill-slate-900 text-2xl font-bold dark:fill-white">
            {average.toFixed(1)}
          </text>
          <text x="50%" y="57%" textAnchor="middle" className="fill-slate-500 text-xs dark:fill-slate-400">average / 10</text>
          <Tooltip content={<MarksTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-2">
        {questionMarks.map((item, index) => (
          <div key={item.question} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800/70">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            <span className="font-medium">{item.question}</span>
            <span className="text-slate-500 dark:text-slate-400">{item.marks}/10</span>
          </div>
        ))}
      </div>
    </div>
  );
}
