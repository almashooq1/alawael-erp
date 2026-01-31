import React, { useEffect, useRef } from 'react';

// ============================================================================
// ACCESSIBILITY WRAPPER & UTILITIES
// WCAG 2.1 AA compliance helpers and components
// ============================================================================

// ----------------------------------------------------------------------------
// AccessibleButton - Fully accessible button component
// ----------------------------------------------------------------------------
interface AccessibleButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  children,
  onClick,
  disabled = false,
  ariaLabel,
  ariaDescribedBy,
  type = 'button',
  variant = 'primary',
  className = '',
}) => {
  const variantStyles = {
    primary: { backgroundColor: '#3b82f6', color: 'white' },
    secondary: { backgroundColor: '#6b7280', color: 'white' },
    danger: { backgroundColor: '#ef4444', color: 'white' },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-disabled={disabled}
      className={className}
      style={{
        ...variantStyles[variant],
        padding: '0.5rem 1rem',
        border: 'none',
        borderRadius: '0.25rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        fontSize: '1rem',
        fontWeight: 500,
        transition: 'all 0.2s',
      }}
    >
      {children}
    </button>
  );
};

// ----------------------------------------------------------------------------
// SkipToContent - Skip navigation link for keyboard users
// ----------------------------------------------------------------------------
interface SkipToContentProps {
  targetId: string;
  label?: string;
}

export const SkipToContent: React.FC<SkipToContentProps> = ({
  targetId,
  label = 'Skip to main content',
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      style={{
        position: 'absolute',
        left: '-9999px',
        zIndex: 999,
        padding: '1rem',
        backgroundColor: '#3b82f6',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '0.25rem',
      }}
      onFocus={(e) => {
        e.currentTarget.style.left = '1rem';
        e.currentTarget.style.top = '1rem';
      }}
      onBlur={(e) => {
        e.currentTarget.style.left = '-9999px';
      }}
    >
      {label}
    </a>
  );
};

// ----------------------------------------------------------------------------
// AccessibleForm - Form with enhanced accessibility
// ----------------------------------------------------------------------------
interface AccessibleFormProps {
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  ariaLabel?: string;
  id?: string;
}

export const AccessibleForm: React.FC<AccessibleFormProps> = ({
  children,
  onSubmit,
  ariaLabel,
  id,
}) => {
  return (
    <form
      onSubmit={onSubmit}
      id={id}
      aria-label={ariaLabel}
      noValidate
    >
      {children}
    </form>
  );
};

// ----------------------------------------------------------------------------
// AccessibleInput - Input with proper ARIA labels
// ----------------------------------------------------------------------------
interface AccessibleInputProps {
  id: string;
  name: string;
  label: string;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helpText?: string;
  autoComplete?: string;
}

export const AccessibleInput: React.FC<AccessibleInputProps> = ({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  helpText,
  autoComplete,
}) => {
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          marginBottom: '0.5rem',
          fontWeight: 500,
          color: error ? '#ef4444' : '#374151',
        }}
      >
        {label}
        {required && <span aria-label="required"> *</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={`${error ? errorId : ''} ${helpText ? helpId : ''}`.trim() || undefined}
        style={{
          width: '100%',
          padding: '0.5rem',
          border: `2px solid ${error ? '#ef4444' : '#d1d5db'}`,
          borderRadius: '0.25rem',
          fontSize: '1rem',
          outline: 'none',
        }}
      />
      {error && (
        <div
          id={errorId}
          role="alert"
          aria-live="polite"
          style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}
        >
          {error}
        </div>
      )}
      {helpText && (
        <div
          id={helpId}
          style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}
        >
          {helpText}
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------------
// LiveRegion - Announce dynamic content to screen readers
// ----------------------------------------------------------------------------
interface LiveRegionProps {
  children: React.ReactNode;
  politeness?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  role?: 'status' | 'alert' | 'log';
}

export const LiveRegion: React.FC<LiveRegionProps> = ({
  children,
  politeness = 'polite',
  atomic = true,
  role = 'status',
}) => {
  return (
    <div
      role={role}
      aria-live={politeness}
      aria-atomic={atomic}
      style={{
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
};

// ----------------------------------------------------------------------------
// FocusTrap - Trap focus within modal/dialog
// ----------------------------------------------------------------------------
interface FocusTrapProps {
  children: React.ReactNode;
  active?: boolean;
}

export const FocusTrap: React.FC<FocusTrapProps> = ({ children, active = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    // Store previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Get all focusable elements
    const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement?.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);

    return () => {
      document.removeEventListener('keydown', handleTabKey);
      // Restore previous focus
      previousFocusRef.current?.focus();
    };
  }, [active]);

  return <div ref={containerRef}>{children}</div>;
};

// ----------------------------------------------------------------------------
// KeyboardNavigable - Enable keyboard navigation for custom components
// ----------------------------------------------------------------------------
interface KeyboardNavigableProps {
  children: React.ReactNode;
  onEnter?: () => void;
  onSpace?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  role?: string;
  tabIndex?: number;
}

export const KeyboardNavigable: React.FC<KeyboardNavigableProps> = ({
  children,
  onEnter,
  onSpace,
  onEscape,
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
  role = 'button',
  tabIndex = 0,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        onEnter?.();
        break;
      case ' ':
        e.preventDefault();
        onSpace?.();
        break;
      case 'Escape':
        onEscape?.();
        break;
      case 'ArrowUp':
        e.preventDefault();
        onArrowUp?.();
        break;
      case 'ArrowDown':
        e.preventDefault();
        onArrowDown?.();
        break;
      case 'ArrowLeft':
        onArrowLeft?.();
        break;
      case 'ArrowRight':
        onArrowRight?.();
        break;
    }
  };

  return (
    <div
      role={role}
      tabIndex={tabIndex}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
};

// ----------------------------------------------------------------------------
// VisuallyHidden - Hide content visually but keep for screen readers
// ----------------------------------------------------------------------------
interface VisuallyHiddenProps {
  children: React.ReactNode;
}

export const VisuallyHidden: React.FC<VisuallyHiddenProps> = ({ children }) => {
  return (
    <span
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {children}
    </span>
  );
};

// ----------------------------------------------------------------------------
// useFocusManagement - Hook for managing focus
// ----------------------------------------------------------------------------
export const useFocusManagement = () => {
  const setFocus = (element: HTMLElement | null) => {
    if (element) {
      element.focus();
    }
  };

  const moveFocusToNext = () => {
    const focusableElements = document.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const currentIndex = Array.from(focusableElements).indexOf(
      document.activeElement as HTMLElement
    );
    const nextElement = focusableElements[currentIndex + 1];
    if (nextElement) {
      nextElement.focus();
    }
  };

  const moveFocusToPrevious = () => {
    const focusableElements = document.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const currentIndex = Array.from(focusableElements).indexOf(
      document.activeElement as HTMLElement
    );
    const previousElement = focusableElements[currentIndex - 1];
    if (previousElement) {
      previousElement.focus();
    }
  };

  return { setFocus, moveFocusToNext, moveFocusToPrevious };
};

// ----------------------------------------------------------------------------
// useAnnouncement - Hook for screen reader announcements
// ----------------------------------------------------------------------------
export const useAnnouncement = () => {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', priority === 'assertive' ? 'alert' : 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  return { announce };
};
