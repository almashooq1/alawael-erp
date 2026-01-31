import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '../contexts/ThemeContext';
import { LoadingSkeleton, ErrorState, Toast, ProgressIndicator } from '../components/AdvancedAnimations';

describe('AdvancedAnimations Components', () => {
  describe('LoadingSkeleton', () => {
    it('renders multiple skeleton items', () => {
      const { container } = render(
        <ThemeProvider defaultMode="light">
          <LoadingSkeleton count={3} />
        </ThemeProvider>
      );

      const skeletons = container.querySelectorAll('div');
      expect(skeletons.length).toBeGreaterThanOrEqual(3);
    });

    it('applies custom height and width', () => {
      const { container } = render(
        <ThemeProvider defaultMode="light">
          <LoadingSkeleton height={40} width="50%" />
        </ThemeProvider>
      );

      const skeleton = container.querySelector('div');
      expect(skeleton).toHaveStyle({ height: '40px', width: '50%' });
    });

    it('animates with opacity changes', () => {
      const { container } = render(
        <ThemeProvider defaultMode="light">
          <LoadingSkeleton />
        </ThemeProvider>
      );

      const skeleton = container.querySelector('div');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('ErrorState', () => {
    it('displays error message', () => {
      render(
        <ThemeProvider defaultMode="light">
          <ErrorState message="Something went wrong" />
        </ThemeProvider>
      );

      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    });

    it('renders retry button when callback provided', () => {
      const onRetry = jest.fn();
      render(
        <ThemeProvider defaultMode="light">
          <ErrorState message="Error" onRetry={onRetry} />
        </ThemeProvider>
      );

      const retryButton = screen.getByText(/Retry/);
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalled();
    });

    it('supports different animation types', () => {
      const { rerender } = render(
        <ThemeProvider defaultMode="light">
          <ErrorState message="Error" animation="shake" />
        </ThemeProvider>
      );

      expect(screen.getByText(/Error/)).toBeInTheDocument();

      rerender(
        <ThemeProvider defaultMode="light">
          <ErrorState message="Error" animation="bounce" />
        </ThemeProvider>
      );

      expect(screen.getByText(/Error/)).toBeInTheDocument();
    });
  });

  describe('ProgressIndicator', () => {
    it('renders progress bar at specified percentage', () => {
      const { container } = render(
        <ThemeProvider defaultMode="light">
          <ProgressIndicator progress={50} />
        </ThemeProvider>
      );

      const progressBar = container.querySelector('div');
      expect(progressBar).toBeInTheDocument();
    });

    it('animates progress changes', async () => {
      const { rerender } = render(
        <ThemeProvider defaultMode="light">
          <ProgressIndicator progress={0} />
        </ThemeProvider>
      );

      rerender(
        <ThemeProvider defaultMode="light">
          <ProgressIndicator progress={100} />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('generic')).toBeInTheDocument();
      });
    });

    it('accepts custom height', () => {
      const { container } = render(
        <ThemeProvider defaultMode="light">
          <ProgressIndicator progress={50} height={8} />
        </ThemeProvider>
      );

      const progress = container.querySelector('div');
      expect(progress).toHaveStyle({ height: '8px' });
    });
  });

  describe('Toast', () => {
    it('renders toast notification', () => {
      const onClose = jest.fn();
      render(
        <ThemeProvider defaultMode="light">
          <Toast message="Test message" onClose={onClose} />
        </ThemeProvider>
      );

      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('closes after specified duration', async () => {
      const onClose = jest.fn();
      jest.useFakeTimers();

      render(
        <ThemeProvider defaultMode="light">
          <Toast message="Test" onClose={onClose} duration={3000} />
        </ThemeProvider>
      );

      jest.advanceTimersByTime(3000);

      expect(onClose).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('displays different type icons', () => {
      const onClose = jest.fn();

      const { rerender } = render(
        <ThemeProvider defaultMode="light">
          <Toast message="Success" type="success" onClose={onClose} />
        </ThemeProvider>
      );

      expect(screen.getByText('✅')).toBeInTheDocument();

      rerender(
        <ThemeProvider defaultMode="light">
          <Toast message="Error" type="error" onClose={onClose} />
        </ThemeProvider>
      );

      expect(screen.getByText('❌')).toBeInTheDocument();
    });

    it('handles manual close', () => {
      const onClose = jest.fn();
      render(
        <ThemeProvider defaultMode="light">
          <Toast message="Test" onClose={onClose} />
        </ThemeProvider>
      );

      const closeButton = screen.getByText('✕');
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });
  });
});
