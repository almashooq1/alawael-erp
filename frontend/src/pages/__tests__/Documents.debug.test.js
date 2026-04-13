/**
 * Debug test to find undefined JSX element in Documents.js
 */
import { render } from '@testing-library/react';

// Check MUI imports
import * as MUI from '@mui/material';
import * as Icons from '@mui/icons-material';

const muiComponents = [
  'Box',
  'Container',
  'Typography',
  'Button',
  'Card',
  'CardContent',
  'Grid',
  'TextField',
  'InputAdornment',
  'FormControl',
  'InputLabel',
  'Select',
  'MenuItem',
  'CircularProgress',
  'Paper',
  'Dialog',
  'DialogTitle',
  'DialogContent',
  'DialogActions',
  'Chip',
  'IconButton',
  'Tooltip',
  'Avatar',
  'Divider',
];

const iconNames = [
  'CloudUpload',
  'Search',
  'FolderOpen',
  'Description',
  'Storage',
  'PeopleAlt',
  'HourglassEmpty',
  'Refresh',
  'TrendingUp',
  'Folder',
  'Scanner',
];

test('All MUI components exist', () => {
  muiComponents.forEach(name => {
    expect(MUI[name]).toBeDefined();
  });
});

test('All MUI icons exist', () => {
  iconNames.forEach(name => {
    expect(Icons[name]).toBeDefined();
  });
});

test('DocumentUploader default export is defined', () => {
  const mod = require('components/documents/DocumentUploader');
  console.log('DocumentUploader module keys:', Object.keys(mod));
  console.log('DocumentUploader default:', typeof mod.default);
  expect(mod.default).toBeDefined();
});

test('DocumentScanner default export is defined', () => {
  const mod = require('components/documents/DocumentScanner');
  console.log('DocumentScanner module keys:', Object.keys(mod));
  console.log('DocumentScanner default:', typeof mod.default);
  expect(mod.default).toBeDefined();
});

test('DocumentList default export is defined', () => {
  const mod = require('components/documents/DocumentList');
  console.log('DocumentList module keys:', Object.keys(mod));
  console.log('DocumentList default:', typeof mod.default);
  expect(mod.default).toBeDefined();
});

test('documentService default export is defined', () => {
  const mod = require('services/documentService');
  console.log('documentService module keys:', Object.keys(mod));
  console.log('documentService default:', typeof mod.default);
  expect(mod.default).toBeDefined();
});

test('useSnackbar is exported', () => {
  const mod = require('../../contexts/SnackbarContext');
  console.log('SnackbarContext module keys:', Object.keys(mod));
  expect(mod.useSnackbar).toBeDefined();
});

test('theme palette exports exist', () => {
  const pal = require('theme/palette');
  expect(pal.gradients).toBeDefined();
  expect(pal.brandColors).toBeDefined();
});

test('Documents module default export is a function', () => {
  const mod = require('../documents/Documents');
  console.log('Documents module keys:', Object.keys(mod));
  console.log('Documents default type:', typeof mod.default);
  expect(typeof mod.default).toBe('function');
});

test('Documents RENDERS without "Element type is invalid" error', () => {
  const Documents = require('../documents/Documents').default;
  // Mock documentService to avoid network calls
  const ds = require('services/documentService').default;
  jest.spyOn(ds, 'getAllDocuments').mockResolvedValue({ documents: [] });
  jest.spyOn(ds, 'getStats').mockResolvedValue({});
  jest.spyOn(ds, 'getDashboard').mockResolvedValue({});
  jest.spyOn(ds, 'getFolders').mockResolvedValue([]);
  jest.spyOn(ds, 'formatFileSize').mockReturnValue('0 B');

  expect(() => {
    render(
      <MemoryRouter>
        <SnackbarProvider>
          <Documents />
        </SnackbarProvider>
      </MemoryRouter>
    );
  }).not.toThrow();
});
