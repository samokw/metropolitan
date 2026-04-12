import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import App from '../App';

// Signature mirrors react-router NavLink; parameter name is only for typing the callback argument shape.
// eslint-disable-next-line no-unused-vars -- type-only callback parameter (base rule flags type param names)
type NavLinkClassNameFn = (state: { isActive: boolean }) => string;
type NavLinkClassNameProp = string | NavLinkClassNameFn;

// Mock react-router-dom (App uses NavLink + Link + BrowserRouter as Router)
vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Routes: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Route: ({ element }: { element: React.ReactNode }) => <div>{element}</div>,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  NavLink: ({
    children,
    to,
    className,
  }: {
    children: React.ReactNode;
    to: string;
    className?: NavLinkClassNameProp;
  }) => {
    const cls =
      typeof className === 'function' ? className({ isActive: false }) : (className ?? '');
    return (
      <a href={to} className={cls}>
        {children}
      </a>
    );
  },
}));

// Mock components used in App.tsx to avoid loading dependencies
vi.mock('../components/ProductPitch', () => ({
  default: () => <div data-testid="product-pitch">ProductPitch Mock</div>
}));

vi.mock('../components/DoubleBarChart', () => ({
  default: () => <div data-testid="double-bar-chart">DoubleBarChart Mock</div>
}));

vi.mock('../components/DoubleRadarChart', () => ({
  default: () => <div data-testid="double-radar-chart">DoubleRadarChart Mock</div>
}));

vi.mock('../components/LineChartEmployment', () => ({
  default: () => <div data-testid="line-chart">LineChart Mock</div>
}));

vi.mock('../components/LabourForceStats', () => ({
  default: () => <div data-testid="labour-stats">LabourForceStats Mock</div>
}));

vi.mock('../components/DateTime', () => ({
  default: () => <div data-testid="date-time">DateTime Mock</div>
}));

describe('App Component', () => {
  test('renders without errors', () => {
    // This should not throw an error
    render(<App />);
    expect(true).toBeTruthy();
  });
});
