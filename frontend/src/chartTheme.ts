import type { Chart, Plugin } from 'chart.js';

export const CHART_FONT_FAMILY =
  "'JetBrains Mono', 'Fira Code', 'Source Code Pro', monospace";

/** Readable sans for chart titles and axes (loaded in index.html). */
export const CHART_DISPLAY_SANS =
  "'DM Sans', ui-sans-serif, system-ui, sans-serif";

/**
 * Distinct strokes for education ladder (low → high attainment), dark-mode friendly.
 * Used by LineChartEmployment — line-only, no area fill.
 */
export const EDUCATION_LINE_SERIES_STROKES = [
  '#2dd4bf',
  '#38bdf8',
  '#818cf8',
  '#fbbf24',
  '#4ade80',
  '#e879f9',
  '#fb7185',
] as const;

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

/** Toronto vs Hamilton bar pairs — first two theme swatches. */
export const HOUSING_BAR_CITY_COLORS = {
  toronto: { fill: palette.cyan.fill, stroke: palette.cyan.solid },
  hamilton: { fill: palette.blue.fill, stroke: palette.blue.solid },
} as const;

/** Radar series — one distinct stroke per metro (fill uses same hue, low alpha). */
export const METRO_RADAR_SERIES_COLORS: Record<string, { fill: string; stroke: string }> = {
  Vancouver: { fill: palette.blue.fill, stroke: palette.blue.solid },
  Toronto: { fill: palette.pink.fill, stroke: palette.pink.solid },
  Montreal: { fill: palette.amber.fill, stroke: palette.amber.solid },
  Edmonton: { fill: palette.green.fill, stroke: palette.green.solid },
  'Ottawa-Gatineau': { fill: palette.purple.fill, stroke: palette.purple.solid },
};

/** Soft vertical wash behind the plot area (shared across chart components). */
export function drawChartPlotWash(chart: Chart, darkMode: boolean): void {
  const { ctx, chartArea } = chart;
  if (!chartArea) return;
  ctx.save();
  const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  if (darkMode) {
    g.addColorStop(0, 'rgba(148, 163, 184, 0.07)');
    g.addColorStop(0.55, 'rgba(148, 163, 184, 0.02)');
    g.addColorStop(1, 'rgba(148, 163, 184, 0)');
  } else {
    g.addColorStop(0, 'rgba(30, 58, 74, 0.06)');
    g.addColorStop(0.55, 'rgba(30, 58, 74, 0.02)');
    g.addColorStop(1, 'rgba(30, 58, 74, 0)');
  }
  ctx.fillStyle = g;
  ctx.fillRect(chartArea.left, chartArea.top, chartArea.width, chartArea.height);
  ctx.restore();
}

function createPlotWashPlugin(id: string): Plugin {
  return {
    id,
    beforeDatasetsDraw(chart, _args, pluginOpts) {
      const dark = (pluginOpts as { darkMode?: boolean } | undefined)?.darkMode ?? true;
      drawChartPlotWash(chart as Chart, dark);
    },
  };
}

export const employmentPlotWashPlugin = createPlotWashPlugin('employmentPlotWash');
export const housingBarPlotWashPlugin = createPlotWashPlugin('housingBarPlotWash');
export const housingRadarPlotWashPlugin = createPlotWashPlugin('housingRadarPlotWash');
export const labourHousingPlotWashPlugin = createPlotWashPlugin('labourHousingPlotWash');

/** Shared tooltip chrome (DM Sans) for chart.js `plugins.tooltip`. */
export function chartTooltipPluginOptions(darkMode: boolean) {
  return {
    backgroundColor: darkMode ? 'rgba(22, 24, 30, 0.94)' : 'rgba(255, 255, 255, 0.97)',
    titleColor: chartTitleColor(darkMode),
    bodyColor: chartTextColor(darkMode),
    borderColor: darkMode ? 'rgba(148, 163, 184, 0.25)' : 'rgba(30, 58, 74, 0.12)',
    borderWidth: 1,
    cornerRadius: 10,
    padding: 12,
    titleFont: { family: CHART_DISPLAY_SANS, size: 12, weight: '600' as const },
    bodyFont: { family: CHART_DISPLAY_SANS, size: 12 },
    displayColors: true,
    boxPadding: 6,
  };
}

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
