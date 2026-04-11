export const CHART_FONT_FAMILY =
  "'JetBrains Mono', 'Fira Code', 'Source Code Pro', monospace";

const palette = {
  cyan:    { solid: 'rgba(30, 209, 214, 1)',   fill: 'rgba(30, 209, 214, 0.18)' },
  blue:    { solid: 'rgba(43, 155, 218, 1)',    fill: 'rgba(43, 155, 218, 0.18)' },
  pink:    { solid: 'rgba(255, 99, 132, 1)',    fill: 'rgba(255, 99, 132, 0.18)' },
  amber:   { solid: 'rgba(255, 191, 36, 1)',    fill: 'rgba(255, 191, 36, 0.18)' },
  green:   { solid: 'rgba(52, 211, 153, 1)',    fill: 'rgba(52, 211, 153, 0.18)' },
  purple:  { solid: 'rgba(167, 139, 250, 1)',   fill: 'rgba(167, 139, 250, 0.18)' },
  orange:  { solid: 'rgba(251, 146, 60, 1)',    fill: 'rgba(251, 146, 60, 0.18)' },
} as const;

export const CHART_COLORS = Object.values(palette);

export function chartGridColor(dark: boolean) {
  return dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
}

export function chartTextColor(dark: boolean) {
  return dark ? 'rgba(255,255,255,0.7)' : 'rgba(30,58,74,0.8)';
}

export function chartTitleColor(dark: boolean) {
  return dark ? '#ffffff' : '#1e3a4a';
}

export function baseChartOptions(dark: boolean) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          font: { family: CHART_FONT_FAMILY, size: 12, weight: '500' as const },
          color: chartTextColor(dark),
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 10,
        },
      },
      title: {
        font: { family: CHART_FONT_FAMILY, size: 18, weight: 'bold' as const },
        color: chartTitleColor(dark),
        padding: { bottom: 20 },
      },
      tooltip: {
        backgroundColor: dark ? 'rgba(30,20,33,0.92)' : 'rgba(255,255,255,0.95)',
        titleColor: dark ? '#fff' : '#1e3a4a',
        bodyColor: dark ? 'rgba(255,255,255,0.8)' : 'rgba(30,58,74,0.75)',
        borderColor: dark ? 'rgba(96,205,255,0.2)' : 'rgba(30,209,214,0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        titleFont: { family: CHART_FONT_FAMILY, weight: '600' as const },
        bodyFont: { family: CHART_FONT_FAMILY },
      },
    },
    scales: {
      x: {
        grid: { color: chartGridColor(dark), drawBorder: false },
        ticks: { color: chartTextColor(dark), font: { family: CHART_FONT_FAMILY, size: 11 } },
        title: { font: { family: CHART_FONT_FAMILY, weight: 'bold' as const }, color: chartTextColor(dark) },
      },
      y: {
        grid: { color: chartGridColor(dark), drawBorder: false },
        ticks: { color: chartTextColor(dark), font: { family: CHART_FONT_FAMILY, size: 11 } },
        title: { font: { family: CHART_FONT_FAMILY, weight: 'bold' as const }, color: chartTextColor(dark) },
      },
    },
  };
}
