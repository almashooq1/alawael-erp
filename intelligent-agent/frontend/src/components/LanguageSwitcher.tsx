import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

interface LanguageSwitcherProps {
  compact?: boolean;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ compact = false }) => {
  const { i18n } = useTranslation();
  const { theme } = useTheme();
  const currentLanguage = i18n.language;

  const languages = [
    { code: 'en', name: '🇬🇧 English', label: 'EN' },
    { code: 'ar', name: '🇸🇦 العربية', label: 'AR' },
    { code: 'fr', name: '🇫🇷 Français', label: 'FR' },
  ];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    localStorage.setItem('preferredLanguage', languageCode);
    document.documentElement.dir = languageCode === 'ar' ? 'rtl' : 'ltr';
  };

  if (compact) {
    return (
      <select
        value={currentLanguage}
        onChange={e => handleLanguageChange(e.target.value)}
        style={{
          padding: '8px 12px',
          backgroundColor: theme.colors.surface.primary,
          color: theme.colors.text.primary,
          border: `1px solid ${theme.colors.border.main}`,
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          transition: 'all 0.3s ease',
        }}
      >
        {languages.map(lang => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        padding: '8px',
        backgroundColor: theme.colors.surface.secondary,
        borderRadius: '8px',
        alignItems: 'center',
      }}
    >
      {languages.map(lang => (
        <button
          key={lang.code}
          onClick={() => handleLanguageChange(lang.code)}
          title={lang.name}
          style={{
            padding: '8px 12px',
            backgroundColor:
              currentLanguage === lang.code ? theme.colors.primary[600] : 'transparent',
            color:
              currentLanguage === lang.code
                ? theme.colors.text.inverse
                : theme.colors.text.secondary,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: currentLanguage === lang.code ? '600' : '400',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={e => {
            if (currentLanguage !== lang.code) {
              (e.currentTarget as HTMLElement).style.backgroundColor = theme.colors.action.hover;
            }
          }}
          onMouseLeave={e => {
            if (currentLanguage !== lang.code) {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }
          }}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
