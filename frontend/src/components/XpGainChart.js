import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function XpGainChart({ topGainers }) {
  if (!topGainers || !topGainers.weekly || topGainers.weekly.length === 0) {
    return <p>No data available for chart</p>;
  }

  const top10 = topGainers.weekly.slice(0, 10);

  const data = {
    labels: top10.map(m => m.name),
    datasets: [
      {
        label: 'Weekly XP Gain',
        data: top10.map(m => m.xpGain),
        backgroundColor: 'rgba(30, 60, 114, 0.8)',
        borderColor: 'rgba(30, 60, 114, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      title: {
        display: true,
        text: 'Top 10 Weekly XP Gainers',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            const value = context.parsed.y;
            if (value >= 1000000) {
              label += `${(value / 1000000).toFixed(2)}M XP`;
            } else if (value >= 1000) {
              label += `${(value / 1000).toFixed(2)}K XP`;
            } else {
              label += `${value.toLocaleString()} XP`;
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
            return value;
          }
        }
      }
    }
  };

  return (
    <div style={{ height: '400px' }}>
      <Bar data={data} options={options} />
    </div>
  );
}

export default XpGainChart;


