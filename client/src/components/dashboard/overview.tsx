import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

// Sample data for the chart
const data = [
  { name: "Jan", completed: 65, target: 70 },
  { name: "Feb", completed: 59, target: 70 },
  { name: "Mar", completed: 80, target: 70 },
  { name: "Apr", completed: 81, target: 75 },
  { name: "May", completed: 56, target: 75 },
  { name: "Jun", completed: 55, target: 75 },
  { name: "Jul", completed: 72, target: 80 },
  { name: "Aug", completed: 75, target: 80 },
  { name: "Sep", completed: 82, target: 80 },
  { name: "Oct", completed: 78, target: 85 },
  { name: "Nov", completed: 71, target: 85 },
  { name: "Dec", completed: 80, target: 85 },
];

export function Overview() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="completed"
          stroke="#0ea5e9"
          activeDot={{ r: 8 }}
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="target"
          stroke="#f43f5e"
          strokeDasharray="5 5"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}