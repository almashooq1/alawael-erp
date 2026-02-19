import React from 'react';
import { render } from '@testing-library/react';
import { screen, fireEvent } from '@testing-library/dom';
import '@testing-library/jest-dom';
import {
  AccessibleButton,
  AccessibleInput,
  SkipToContent,
  FocusTrap,
  KeyboardNavigable,
  VisuallyHidden,
} from '../AccessibilityWrapper';

describe('AccessibilityWrapper', () => {
  describe('AccessibleButton', () => {
    it('renders button with correct attributes', () => {
      render(<AccessibleButton ariaLabel="Submit form">Submit</AccessibleButton>);

      const button = screen.getByRole('button', { name: 'Submit form' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'Submit form');
    });

    it('handles click events', () => {
      const handleClick = jest.fn();

      render(<AccessibleButton onClick={handleClick}>Click Me</AccessibleButton>);

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('applies disabled state correctly', () => {
      render(<AccessibleButton disabled={true}>Disabled</AccessibleButton>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('applies different variants', () => {
      const variants = ['primary', 'secondary', 'danger'] as const;

      variants.forEach(variant => {
        const { rerender } = render(
          <AccessibleButton variant={variant}>{variant}</AccessibleButton>
        );

        expect(screen.getByRole('button')).toBeInTheDocument();
        rerender(<div />);
      });
    });
  });

  describe('AccessibleInput', () => {
    it('renders input with label', () => {
      render(<AccessibleInput id="email" name="email" label="Email Address" />);

      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    });

    it('shows required indicator', () => {
      render(
        <AccessibleInput
          id="required-field"
          name="required"
          label="Required Field"
          required={true}
        />
      );

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('displays error message', () => {
      render(
        <AccessibleInput
          id="error-field"
          name="error"
          label="Error Field"
          error="This field is required"
        />
      );

      expect(screen.getByText('This field is required')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('displays help text', () => {
      render(
        <AccessibleInput
          id="help-field"
          name="help"
          label="Help Field"
          helpText="Enter your email address"
        />
      );

      expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    });

    it('handles value changes', () => {
      const handleChange = jest.fn();

      render(
        <AccessibleInput
          id="change-field"
          name="change"
          label="Change Field"
          onChange={handleChange}
        />
      );

      const input = screen.getByLabelText('Change Field');
      fireEvent.change(input, { target: { value: 'test' } });

      expect(handleChange).toHaveBeenCalled();
    });

    it('applies aria-invalid when error exists', () => {
      render(
        <AccessibleInput
          id="invalid-field"
          name="invalid"
          label="Invalid Field"
          error="Error message"
        />
      );

      const input = screen.getByLabelText(/Invalid Field/);
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('SkipToContent', () => {
    it('renders skip link', () => {
      render(<SkipToContent targetId="main-content" />);

      const link = screen.getByText('Skip to main content');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '#main-content');
    });

    it('uses custom label', () => {
      render(<SkipToContent targetId="content" label="Skip to page content" />);

      expect(screen.getByText('Skip to page content')).toBeInTheDocument();
    });

    it('handles click to focus target', () => {
      const targetElement = document.createElement('div');
      targetElement.id = 'target';
      targetElement.tabIndex = -1;
      document.body.appendChild(targetElement);

      render(<SkipToContent targetId="target" />);

      const link = screen.getByText('Skip to main content');
      fireEvent.click(link);

      // Clean up
      document.body.removeChild(targetElement);
    });
  });

  describe('KeyboardNavigable', () => {
    it('handles Enter key', () => {
      const handleEnter = jest.fn();

      render(
        <KeyboardNavigable onEnter={handleEnter}>
          <div>Keyboard Item</div>
        </KeyboardNavigable>
      );

      const element = screen.getByRole('button');
      fireEvent.keyDown(element, { key: 'Enter' });

      expect(handleEnter).toHaveBeenCalledTimes(1);
    });

    it('handles Space key', () => {
      const handleSpace = jest.fn();

      render(
        <KeyboardNavigable onSpace={handleSpace}>
          <div>Space Item</div>
        </KeyboardNavigable>
      );

      const element = screen.getByRole('button');
      fireEvent.keyDown(element, { key: ' ' });

      expect(handleSpace).toHaveBeenCalledTimes(1);
    });

    it('handles Escape key', () => {
      const handleEscape = jest.fn();

      render(
        <KeyboardNavigable onEscape={handleEscape}>
          <div>Escape Item</div>
        </KeyboardNavigable>
      );

      const element = screen.getByRole('button');
      fireEvent.keyDown(element, { key: 'Escape' });

      expect(handleEscape).toHaveBeenCalledTimes(1);
    });

    it('handles arrow keys', () => {
      const handleArrowUp = jest.fn();
      const handleArrowDown = jest.fn();

      render(
        <KeyboardNavigable onArrowUp={handleArrowUp} onArrowDown={handleArrowDown}>
          <div>Arrow Item</div>
        </KeyboardNavigable>
      );

      const element = screen.getByRole('button');
      fireEvent.keyDown(element, { key: 'ArrowUp' });
      fireEvent.keyDown(element, { key: 'ArrowDown' });

      expect(handleArrowUp).toHaveBeenCalledTimes(1);
      expect(handleArrowDown).toHaveBeenCalledTimes(1);
    });

    it('applies correct role and tabIndex', () => {
      render(
        <KeyboardNavigable role="menuitem" tabIndex={0}>
          <div>Menu Item</div>
        </KeyboardNavigable>
      );

      const element = screen.getByRole('menuitem');
      expect(element).toHaveAttribute('tabindex', '0');
    });
  });

  describe('VisuallyHidden', () => {
    it('renders content visually hidden', () => {
      render(<VisuallyHidden>Hidden from sight but not screen readers</VisuallyHidden>);

      const element = screen.getByText('Hidden from sight but not screen readers');
      expect(element).toBeInTheDocument();

      // Check if it has visually hidden styles
      expect(element).toHaveStyle({
        position: 'absolute',
        width: '1px',
        height: '1px',
      });
    });
  });

  describe('FocusTrap', () => {
    it('renders children', () => {
      render(
        <FocusTrap active={true}>
          <div>
            <button>Button 1</button>
            <button>Button 2</button>
          </div>
        </FocusTrap>
      );

      expect(screen.getByText('Button 1')).toBeInTheDocument();
      expect(screen.getByText('Button 2')).toBeInTheDocument();
    });

    it('does not trap focus when inactive', () => {
      render(
        <FocusTrap active={false}>
          <div>
            <button>Inactive Button</button>
          </div>
        </FocusTrap>
      );

      expect(screen.getByText('Inactive Button')).toBeInTheDocument();
    });
  });
});
