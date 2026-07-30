"use client";
import { Bar } from 'react-chartjs-2';

export default function PillarBarChart({ data }) {
  if (!data || !data.labels) return null;

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: "Score",
        data: data.scores,
        backgroundColor: "rgba(0, 131, 202, 0.6)",
        borderColor: "rgba(0, 131, 202, 1)",
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { max: Math.max(...(data.maxes || [100])) }
    },
    plugins: {
      legend: { display: false }
    }
  };

  return <div style={{ height: "200px" }}><Bar data={chartData} options={options} /></div>;
}
