# 3. Bilingual Support Strategy (Arabic & English)

Date: 2026-01-18

## Status

✅ Accepted

## Context

The AlAwael ERP system needs to support both Arabic and English languages:

- **Primary language**: Arabic (right-to-left)
- **Secondary language**: English (left-to-right)
- **Target users**: Primarily Arabic speakers with some English speakers
- **Content types**: UI text, documentation, error messages, reports
- **Compliance**: Arabic required for official documents

## Decision

We will implement a **comprehensive bilingual strategy** with Arabic as the
primary language:

### 1. Frontend Internationalization (i18n)

- Use **react-i18next** for React internationalization
- Store translations in JSON files: `ar.json`, `en.json`
- Default language: **Arabic**
- Language switcher in UI header
- Persist language preference in localStorage

### 2. RTL Support

- Use **Material-UI's RTL support** with `jss-rtl`
- Automatic direction switching based on language
- CSS logical properties for better RTL support
- Test all UI components in both directions

### 3. Database Content

- Store bilingual content in separate fields:
  ```javascript
  {
    name_ar: "الموارد البشرية",
    name_en: "Human Resources",
    description_ar: "...",
    description_en: "..."
  }
  ```
- Create helper functions to get localized content
- Index both language fields for search

### 4. API Responses

- Include both languages in API responses
- Frontend selects appropriate language
- Error messages localized server-side
- Accept `Accept-Language` header

### 5. Documentation

- **README.md**: Bilingual with Arabic/English sections
- **API Docs**: English (technical standard)
- **User Guides**: Arabic primary, English secondary
- **Code Comments**: English (international standard)
- **Git Commits**: English (standard practice)

### 6. PDF Reports & Documents

- Support both Arabic and English templates
- Use appropriate fonts (Cairo, Amiri for Arabic)
- RTL support in PDF generation
- Language selection per document

## Implementation Details

### Translation File Structure

```text
/frontend/admin-dashboard/src/locales/
├── ar/
│   ├── common.json
│   ├── hr.json
│   ├── finance.json
│   └── errors.json
└── en/
    ├── common.json
    ├── hr.json
    ├── finance.json
    └── errors.json
```

### Language Switching Example

```javascript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t, i18n } = useTranslation();

  return (
    <div dir={i18n.dir()}>
      <h1>{t('welcome')}</h1>
      <button onClick={() => i18n.changeLanguage('ar')}>العربية</button>
      <button onClick={() => i18n.changeLanguage('en')}>English</button>
    </div>
  );
}
```

### Database Localization Helper

```javascript
function getLocalizedField(object, field, language = 'ar') {
  return object[`${field}_${language}`] || object[`${field}_ar`];
}

// Usage
const departmentName = getLocalizedField(department, 'name', currentLanguage);
```

## Consequences

### Positive ✅

- **User experience**: Native language support for all users
- **Accessibility**: Reaches wider audience
- **Professional**: Shows attention to detail
- **Compliance**: Meets Arabic language requirements
- **Future-proof**: Easy to add more languages
- **SEO**: Better search engine visibility in both languages

### Negative ❌

- **Maintenance overhead**: Must maintain two language files
- **Translation effort**: All text must be translated
- **Testing complexity**: Must test both languages and RTL
- **Storage increase**: Database fields duplicated for languages
- **Development time**: Additional time for localization

### Mitigation Strategies 🛡️

1. **Translation management**: Use translation keys consistently
2. **Automated testing**: Test language switching automatically
3. **RTL testing**: Visual regression testing for RTL
4. **Translation tools**: Consider translation management platforms
5. **Default fallbacks**: Always have Arabic (primary) as fallback
6. **Code guidelines**: Document translation best practices

## Quality Standards

### Translation Quality

- ✅ Professional Arabic translations (formal, not colloquial)
- ✅ Consistent terminology across application
- ✅ Context-aware translations (not literal)
- ✅ Gender-neutral language where possible
- ✅ Cultural appropriateness

### RTL Quality

- ✅ Icons and images flip appropriately
- ✅ Margins and padding correct in RTL
- ✅ Text alignment correct
- ✅ Forms and inputs work in RTL
- ✅ Tables display correctly in RTL

## Future Considerations

- Consider adding French (common in North Africa)
- Implement automated translation workflows
- Add translation memory system
- Create translation style guide
- Hire professional translators for official content
- Implement language-specific date/number formatting

## Resources

- **i18next**: https://www.i18next.com/
- **react-i18next**: https://react.i18next.com/
- **RTL Styling Guide**: https://rtlstyling.com/
- **Arabic Typography**: https://www.arabictypography.com/

---

**Last Updated:** January 18, 2026
