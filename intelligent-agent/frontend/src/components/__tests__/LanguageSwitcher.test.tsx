import { render } from '@testing-library/react';
import { screen, fireEvent } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { ThemeProvider } from '../../contexts/ThemeContext';
import LanguageSwitcher from '../LanguageSwitcher';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      language: 'en',
      changeLanguage: jest.fn(),
    },
  }),
}));

describe('LanguageSwitcher Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders language buttons', () => {
    render(
      <ThemeProvider defaultMode="light">
        <LanguageSwitcher />
      </ThemeProvider>
    );

    expect(screen.getByText('EN')).toBeInTheDocument();
    expect(screen.getByText('AR')).toBeInTheDocument();
    expect(screen.getByText('FR')).toBeInTheDocument();
  });

  it('renders in compact mode as select', () => {
    render(
      <ThemeProvider defaultMode="light">
        <LanguageSwitcher compact={true} />
      </ThemeProvider>
    );

    const select = screen.getByDisplayValue('EN') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
  });

  it('handles language change', () => {
    render(
      <ThemeProvider defaultMode="light">
        <LanguageSwitcher />
      </ThemeProvider>
    );

    const arButton = screen.getByText('AR');
    fireEvent.click(arButton);

    expect(localStorage.getItem('preferredLanguage')).toBe('ar');
  });
});
