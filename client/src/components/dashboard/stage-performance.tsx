import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

// Sample data for stage performance
const data = [
  { stage: "Raw Material", avgTime: 1.2, target: 1.0 },
  { stage: "Slug Cutting", avgTime: 2.5, target: 2.0 },
  { stage: "Deburring", avgTime: 1.8, target: 2.0 },
  { stage: "Forging", avgTime: 3.2, target: 3.0 },
  { stage: "Trimming", avgTime: 2.1, target: 2.0 },
  { stage: "Fettling", avgTime: 2.8, target: 3.0 },
  { stage: "Inspection", avgTime: 2.2, target: 2.5 },
  { stage: "Shot Blast", avgTime: 3.5, target: 3.0 },
  { stage: "Heat Treat", avgTime: 4.2, target: 4.0 },
  { stage: "Machining", avgTime: 4.5, target: 4.0 },
  { stage: "Nitrating", avgTime: 4.8, target: 5.0 },
  { stage: "Final QC", avgTime: 1.9, target: 2.0 },
];

export function StagePerformance() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 120, // Extra space for angled labels
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="stage" 
          angle={-45} 
          textAnchor="end" 
          height={100} 
          interval={0} 
          tick={{ fontSize: 12 }}
        />
        <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
        <Tooltip formatter={(value) => [`${value} hours`, ""]} />
        <Legend verticalAlign="top" />
        <Bar dataKey="avgTime" name="Actual Time" fill="#0ea5e9" />
        <Bar dataKey="target" name="Target Time" fill="#f43f5e" />
      </BarChart>
    </ResponsiveContainer>
  );
}