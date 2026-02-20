// ===================================
// FileUpload Component with Progress
// ===================================

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Typography,
  Alert
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  AttachFile,
  CheckCircle,
  Error as ErrorIcon
} from '@mui/icons-material';
import axios from 'axios';

const FileUpload = ({ onUploadComplete, multiple = false, maxFiles = 10 }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadStatus, setUploadStatus] = useState({});
  const [error, setError] = useState(null);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    
    if (multiple && files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate file sizes
    const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError('Some files exceed the 10MB limit');
      return;
    }

    setSelectedFiles(files);
    setError(null);
    
    // Initialize progress and status
    const progress = {};
    const status = {};
    files.forEach((file, index) => {
      progress[index] = 0;
      status[index] = 'pending';
    });
    setUploadProgress(progress);
    setUploadStatus(status);
  };

  const uploadFile = async (file, index) => {
    const formData = new FormData();
    formData.append(multiple ? 'files' : 'file', file);

    try {
      setUploadStatus(prev => ({ ...prev, [index]: 'uploading' }));

      const response = await axios.post(
        `http://localhost:3005/api/upload/${multiple ? 'multiple' : 'single'}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(prev => ({ ...prev, [index]: percentCompleted }));
          }
        }
      );

      setUploadStatus(prev => ({ ...prev, [index]: 'success' }));
      
      if (onUploadComplete) {
        onUploadComplete(response.data);
      }

      return response.data;
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus(prev => ({ ...prev, [index]: 'error' }));
      setError(error.response?.data?.error || 'Upload failed');
      throw error;
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select files first');
      return;
    }

    setError(null);

    try {
      if (multiple) {
        // Upload all files in parallel
        await Promise.all(
          selectedFiles.map((file, index) => uploadFile(file, index))
        );
      } else {
        // Upload single file
        await uploadFile(selectedFiles[0], 0);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[index];
      return newProgress;
    });
    setUploadStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[index];
      return newStatus;
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'uploading':
        return <CloudUpload color="primary" />;
      default:
        return <AttachFile />;
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Upload Files
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 2 }}>
          <input
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
            style={{ display: 'none' }}
            id="file-upload"
            type="file"
            multiple={multiple}
            onChange={handleFileSelect}
          />
          <label htmlFor="file-upload">
            <Button
              variant="outlined"
              component="span"
              startIcon={<AttachFile />}
              fullWidth
            >
              Select Files {multiple && `(Max ${maxFiles})`}
            </Button>
          </label>
        </Box>

        {selectedFiles.length > 0 && (
          <>
            <List>
              {selectedFiles.map((file, index) => (
                <ListItem key={index} divider>
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                    {getStatusIcon(uploadStatus[index])}
                  </Box>
                  <ListItemText
                    primary={file.name}
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          {formatFileSize(file.size)}
                        </Typography>
                        {uploadStatus[index] === 'uploading' && (
                          <LinearProgress
                            variant="determinate"
                            value={uploadProgress[index] || 0}
                            sx={{ mt: 1 }}
                          />
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    {uploadStatus[index] !== 'uploading' && (
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveFile(index)}
                        disabled={uploadStatus[index] === 'success'}
                      >
                        <Delete />
                      </IconButton>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>

            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={<CloudUpload />}
              onClick={handleUpload}
              disabled={Object.values(uploadStatus).some(s => s === 'uploading')}
              sx={{ mt: 2 }}
            >
              Upload {selectedFiles.length} File{selectedFiles.length > 1 ? 's' : ''}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default FileUpload;
