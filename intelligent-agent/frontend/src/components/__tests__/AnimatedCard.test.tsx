import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { ThemeProvider } from '../../contexts/ThemeContext';
import AnimatedCard from '../AnimatedCard';

describe('AnimatedCard Component', () => {
  it('renders children content', () => {
    render(
      <ThemeProvider defaultMode="light">
        <AnimatedCard>
          <div>Test Content</div>
        </AnimatedCard>
      </ThemeProvider>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('supports all animation variants', () => {
    const variants = ['fadeIn', 'slideUp', 'scaleIn'] as const;

    variants.forEach(variant => {
      const { unmount } = render(
        <ThemeProvider defaultMode="light">
          <AnimatedCard variant={variant}>
            <div>{variant} animation</div>
          </AnimatedCard>
        </ThemeProvider>
      );

      expect(screen.getByText(`${variant} animation`)).toBeInTheDocument();
      unmount();
    });
  });

  it('accepts custom styling', () => {
    const { container } = render(
      <ThemeProvider defaultMode="light">
        <AnimatedCard style={{ padding: '32px' }}>
          <div>Styled Content</div>
        </AnimatedCard>
      </ThemeProvider>
    );

    const card = container.querySelector('div[style*="padding"]');
    expect(card).toBeInTheDocument();
  });
});
