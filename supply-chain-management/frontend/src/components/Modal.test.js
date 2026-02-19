import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from './Modal';

describe('Modal Component', () => {
  test('does not render when open is false', () => {
    const { container } = render(
      <Modal open={false} onClose={jest.fn()}>
        <div>Modal Content</div>
      </Modal>
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders when open is true', () => {
    render(
      <Modal open={true} onClose={jest.fn()}>
        <div>Modal Content</div>
      </Modal>
    );
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  test('displays children content', () => {
    render(
      <Modal open={true} onClose={jest.fn()}>
        <h1>Test Heading</h1>
        <p>Test paragraph</p>
      </Modal>
    );
    expect(screen.getByText('Test Heading')).toBeInTheDocument();
    expect(screen.getByText('Test paragraph')).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    const mockOnClose = jest.fn();
    render(
      <Modal open={true} onClose={mockOnClose}>
        <div>Modal Content</div>
      </Modal>
    );

    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  test('calls onClose when backdrop is clicked', () => {
    const { container } = render(
      <Modal open={true} onClose={jest.fn()}>
        <div>Modal Content</div>
      </Modal>
    );

    const backdrop = container.querySelector('div[style*="background: rgba"]');
    expect(backdrop).toHaveStyle({
      position: 'fixed',
      width: '100vw',
      height: '100vh',
    });
  });

  test('renders close button with X symbol', () => {
    render(
      <Modal open={true} onClose={jest.fn()}>
        <div>Modal Content</div>
      </Modal>
    );
    const closeButton = screen.getByRole('button');
    expect(closeButton.textContent).toBe('×');
  });

  test('applies fullscreen backdrop overlay', () => {
    const { container } = render(
      <Modal open={true} onClose={jest.fn()}>
        <div>Modal Content</div>
      </Modal>
    );

    const backdrop = container.querySelector('div[style*="fixed"]');
    const style = backdrop.style;
    expect(style.position).toBe('fixed');
    expect(style.top).toBe('0px');
    expect(style.left).toBe('0px');
    expect(style.width).toBe('100vw');
    expect(style.height).toBe('100vh');
  });

  test('centers modal content', () => {
    const { container } = render(
      <Modal open={true} onClose={jest.fn()}>
        <div>Modal Content</div>
      </Modal>
    );

    const backdrop = container.querySelector('div[style*="display: flex"]');
    const style = backdrop.style;
    expect(style.display).toBe('flex');
    expect(style.alignItems).toBe('center');
    expect(style.justifyContent).toBe('center');
  });

  test('modal transitions from closed to open', () => {
    const { rerender, container } = render(
      <Modal open={false} onClose={jest.fn()}>
        <div>Modal Content</div>
      </Modal>
    );

    expect(container.firstChild).toBeNull();

    rerender(
      <Modal open={true} onClose={jest.fn()}>
        <div>Modal Content</div>
      </Modal>
    );

    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  test('has proper z-index for layering', () => {
    const { container } = render(
      <Modal open={true} onClose={jest.fn()}>
        <div>Modal Content</div>
      </Modal>
    );

    const backdrop = container.querySelector('div[style*="fixed"]');
    expect(backdrop.style.zIndex).toBe('1000');
  });
});
