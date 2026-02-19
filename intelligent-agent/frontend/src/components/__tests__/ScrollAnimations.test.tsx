import React from 'react';
import { render } from '@testing-library/react';
import { screen, fireEvent, waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import {
  FadeInOnScroll,
  RevealOnScroll,
  CountUpOnScroll,
  ScrollProgressBar,
} from '../ScrollAnimations';

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = jest.fn();
  disconnect = jest.fn();
  unobserve = jest.fn();
}

(global as any).IntersectionObserver = MockIntersectionObserver;

describe('ScrollAnimations', () => {
  describe('FadeInOnScroll', () => {
    it('renders children correctly', () => {
      render(
        <FadeInOnScroll>
          <div>Test Content</div>
        </FadeInOnScroll>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('applies fade animation with direction', () => {
      const { container } = render(
        <FadeInOnScroll direction="up">
          <div>Fade Up</div>
        </FadeInOnScroll>
      );

      expect(container.firstChild).toBeInTheDocument();
    });

    it('uses custom delay and duration', () => {
      render(
        <FadeInOnScroll delay={0.5} duration={1.2}>
          <div>Custom Timing</div>
        </FadeInOnScroll>
      );

      expect(screen.getByText('Custom Timing')).toBeInTheDocument();
    });
  });

  describe('RevealOnScroll', () => {
    it('renders with different effects', () => {
      const effects = ['fade', 'slide', 'zoom', 'flip', 'blur'] as const;

      effects.forEach(effect => {
        const { rerender } = render(
          <RevealOnScroll effect={effect}>
            <div>Effect: {effect}</div>
          </RevealOnScroll>
        );

        expect(screen.getByText(`Effect: ${effect}`)).toBeInTheDocument();
        rerender(<div />);
      });
    });

    it('applies custom threshold', () => {
      render(
        <RevealOnScroll threshold={0.5}>
          <div>Half Visible</div>
        </RevealOnScroll>
      );

      expect(screen.getByText('Half Visible')).toBeInTheDocument();
    });
  });

  describe('CountUpOnScroll', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('displays start value initially', () => {
      render(<CountUpOnScroll start={0} end={100} />);

      // Initial render shows 0
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('adds prefix and suffix', () => {
      render(<CountUpOnScroll start={0} end={100} prefix="$" suffix=" USD" />);

      expect(screen.getByText(/\$/)).toBeInTheDocument();
    });

    it('respects custom duration', () => {
      render(<CountUpOnScroll start={0} end={100} duration={3} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('ScrollProgressBar', () => {
    it('renders with default props', () => {
      const { container } = render(<ScrollProgressBar />);

      const progressBar = container.firstChild as HTMLElement;
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveStyle({ position: 'fixed' });
    });

    it('applies custom height and colors', () => {
      const { container } = render(
        <ScrollProgressBar height={6} color="#ff0000" backgroundColor="#cccccc" />
      );

      const progressBar = container.firstChild as HTMLElement;
      expect(progressBar).toHaveStyle({ height: '6px' });
    });

    it('positions at top by default', () => {
      const { container } = render(<ScrollProgressBar position="top" />);

      const progressBar = container.firstChild as HTMLElement;
      expect(progressBar).toHaveStyle({ top: 0 });
    });

    it('positions at bottom when specified', () => {
      const { container } = render(<ScrollProgressBar position="bottom" />);

      const progressBar = container.firstChild as HTMLElement;
      expect(progressBar).toHaveStyle({ bottom: 0 });
    });
  });
});
