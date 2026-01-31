import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '../contexts/ThemeContext';
import MetricsChart from '../components/MetricsChart';

describe('MetricsChart Component', () => {
  const mockData = [
    { name: 'Jan', value: 400 },
    { name: 'Feb', value: 300 },
    { name: 'Mar', value: 200 },
  ];

  it('renders chart title', () => {
    render(
      <ThemeProvider defaultMode="light">
        <MetricsChart title="Test Chart" data={mockData} />
      </ThemeProvider>
    );

    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });

  it('renders all chart types', () => {
    const chartTypes = ['area', 'bar', 'line', 'pie'] as const;

    chartTypes.forEach((type) => {
      const { unmount } = render(
        <ThemeProvider defaultMode="light">
          <MetricsChart
            title={`${type} Chart`}
            data={mockData}
            type={type}
          />
        </ThemeProvider>
      );

      expect(screen.getByText(`${type} Chart`)).toBeInTheDocument();
      unmount();
    });
  });

  it('accepts custom height prop', () => {
    render(
      <ThemeProvider defaultMode="light">
        <MetricsChart title="Chart" data={mockData} height={500} />
      </ThemeProvider>
    );

    expect(screen.getByText('Chart')).toBeInTheDocument();
  });
});
