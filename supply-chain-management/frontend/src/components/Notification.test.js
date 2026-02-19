import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Notification from './Notification';

describe('Notification Component', () => {
  test('renders nothing when message is empty', () => {
    const { container } = render(<Notification message="" type="info" />);
    expect(container.firstChild).toBeNull();
  });

  test('renders notification with message', () => {
    const { container } = render(<Notification message="Test notification" type="info" />);
    expect(screen.getByText('Test notification')).toBeInTheDocument();
  });

  test('applies correct color for success type', () => {
    const { container } = render(<Notification message="Success message" type="success" />);
    const notificationDiv = container.querySelector('div[style*="background"]');
    expect(notificationDiv).toHaveStyle('background: #4caf50');
  });

  test('applies correct color for error type', () => {
    const { container } = render(<Notification message="Error message" type="error" />);
    const notificationDiv = container.querySelector('div[style*="background"]');
    expect(notificationDiv).toHaveStyle('background: #f44336');
  });

  test('applies correct color for warning type', () => {
    const { container } = render(<Notification message="Warning message" type="warning" />);
    const notificationDiv = container.querySelector('div[style*="background"]');
    expect(notificationDiv).toHaveStyle('background: #ff9800');
  });

  test('applies default blue color for info type', () => {
    const { container } = render(<Notification message="Info message" type="info" />);
    const notificationDiv = container.querySelector('div[style*="background"]');
    expect(notificationDiv).toHaveStyle('background: #2196f3');
  });

  test('calls onClose when close button is clicked', () => {
    const mockOnClose = jest.fn();
    render(<Notification message="Close me" type="info" onClose={mockOnClose} />);

    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  test('renders close button with X symbol', () => {
    render(<Notification message="Test" type="info" />);
    const closeButton = screen.getByRole('button');
    expect(closeButton.textContent).toBe('×');
  });

  test('positions notification at top right', () => {
    const { container } = render(<Notification message="Test" type="info" />);
    const notificationDiv = container.querySelector('div[style*="position"]');
    const style = notificationDiv.style;
    expect(style.position).toBe('fixed');
    expect(style.top).toBe('24px');
    expect(style.right).toBe('24px');
    expect(style.zIndex).toBe('9999');
  });

  test('handles missing onClose prop gracefully', () => {
    const { container } = render(<Notification message="Test notification" type="success" />);
    const closeButton = screen.getByRole('button');
    // Should not throw error when clicked
    expect(() => fireEvent.click(closeButton)).not.toThrow();
  });
});
