"use client";
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, LineController } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, LineController);

export default function CashflowChart({ series }) {
  if (!series || series.length === 0) return <div>No data available</div>;

  const data = {
    labels: series.map(m => m.month),
    datasets: [
      { label: "Inflow",  data: series.map(m => m.inflow),  backgroundColor: "#1E9E5A", borderRadius: 6 },
      { label: "Outflow", data: series.map(m => m.outflow), backgroundColor: "#D6455B", borderRadius: 6 },
      { label: "Net",     data: series.map(m => m.net),     type: "line", borderColor: "#0083CA", tension: 0.4, fill: false }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' }
    }
  };

  return <div style={{ height: "300px" }}><Bar data={data} options={options} /></div>;
}
