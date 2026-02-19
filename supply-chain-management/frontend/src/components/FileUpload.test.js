import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import axios from 'axios';

jest.mock('axios');

import FileUpload from './FileUpload';

describe('FileUpload component', () => {
  beforeEach(() => {
    axios.post.mockResolvedValue({ data: { filePath: '/uploads/test.jpg' } });
  });

  it('renders label and input', () => {
    render(<FileUpload url="/api/upload" label="رفع ملف" />);
    expect(screen.getByText('رفع ملف')).toBeInTheDocument();
    expect(screen.getByText(/انقر أو اسحب الملفات هنا/)).toBeInTheDocument();
  });

  it('shows error for too many files', async () => {
    render(<FileUpload url="/api/upload" multiple maxFiles={1} />);
    const input = screen.getByLabelText(/اختر الملفات|رفع ملف/);
    const file1 = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
    const file2 = new File(['b'], 'b.jpg', { type: 'image/jpeg' });
    await waitFor(() => {
      fireEvent.change(input, { target: { files: [file1, file2] } });
    });
    await waitFor(() => {
      expect(screen.queryByText(/الحد الأقصى/i)).toBeInTheDocument();
    });
  });

  it('shows image preview for image files', async () => {
    render(<FileUpload url="/api/upload" accept="image/*" />);
    const input = screen.getByLabelText(/اختر الملفات|رفع ملف/);
    const file = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.queryByText(/a\.jpg/i)).toBeInTheDocument();
    });
  });

  it('calls onSuccess after upload', async () => {
    const onSuccess = jest.fn();
    render(<FileUpload url="/api/upload" onSuccess={onSuccess} />);
    const input = screen.getByLabelText(/اختر الملفات|رفع ملف/);
    const file = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.queryByText(/a\.jpg/i)).toBeInTheDocument();
    });
    const uploadButton = screen.getByText('رفع');
    fireEvent.click(uploadButton);
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('can remove file before upload', async () => {
    render(<FileUpload url="/api/upload" />);
    const input = screen.getByLabelText(/اختر الملفات|رفع ملف/);
    const file = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.queryByText(/a\.jpg/i)).toBeInTheDocument();
    });
    const deleteButton = screen.getByTitle('حذف الملف');
    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(screen.queryByText(/a\.jpg/i)).not.toBeInTheDocument();
    });
  });
});
