import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material';
import { Shield, History, Lock } from '@mui/icons-material';
import axios from 'axios';

const SecuritySettings = () => {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [logs, setLogs] = useState([]);
  const [setupDialog, setSetupDialog] = useState(false);
  const [step, setStep] = useState(1); // 1: QR, 2: Verify
  const [secretData, setSecretData] = useState(null);
  const [token, setToken] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);

  useEffect(() => {
    // Check user profile for MFA status
    // For now assuming we have a user object in context or fetch it
    // setMfaEnabled(user.mfa?.enabled);

    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const res = await axios.get('/api/security/logs/me');
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const startMfaSetup = async () => {
    try {
      const res = await axios.post('/api/security/mfa/setup');
      setSecretData(res.data);
      setStep(1);
      setSetupDialog(true);
    } catch (err) {
      alert('Setup failed');
    }
  };

  const handleVerify = async () => {
    try {
      const res = await axios.post('/api/security/mfa/enable', {
        token,
        secret: secretData.secret,
      });
      setBackupCodes(res.data.backupCodes);
      setMfaEnabled(true);
      setStep(3); // Success step
    } catch (err) {
      alert('Verification failed: Invalid token');
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Security Settings
      </Typography>

      <Grid container spacing={3}>
        {/* MFA Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" mb={2}>
              <Shield color="primary" sx={{ mr: 1, fontSize: 30 }} />
              <Typography variant="h6">Multi-Factor Authentication (MFA)</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="subtitle1">Two-Step Verification</Typography>
                <Typography variant="body2" color="text.secondary">
                  Add an extra layer of security to your account by requiring a code from your
                  phone.
                </Typography>
              </Box>
              <Button
                variant={mfaEnabled ? 'outlined' : 'contained'}
                color={mfaEnabled ? 'error' : 'primary'}
                onClick={mfaEnabled ? () => {} : startMfaSetup}
              >
                {mfaEnabled ? 'Disable' : 'Enable'}
              </Button>
            </Box>

            {mfaEnabled && (
              <Box mt={2}>
                <Alert severity="success">MFA is currently enabled on your account.</Alert>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Activity Logs */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" mb={2}>
              <History color="action" sx={{ mr: 1 }} />
              <Typography variant="h6">Recent Security Activity</Typography>
            </Box>
            <List>
              {logs.length === 0 ? (
                <ListItem>
                  <ListItemText primary="No recent activity logged." />
                </ListItem>
              ) : (
                logs.map(log => (
                  <div key={log._id}>
                    <ListItem>
                      <ListItemIcon>
                        {log.status === 'FAILURE' ? (
                          <Lock color="error" />
                        ) : (
                          <Shield color="success" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={log.action}
                        secondary={`${new Date(log.timestamp).toLocaleString()} - ${log.description || ''}`}
                      />
                    </ListItem>
                    <Divider />
                  </div>
                ))
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Setup Dialog */}
      <Dialog open={setupDialog} onClose={() => setSetupDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Setup MFA</DialogTitle>
        <DialogContent>
          {step === 1 && (
            <Box textAlign="center" py={2}>
              <Typography gutterBottom>1. Scan this QR code with your authenticator app</Typography>
              <Box
                sx={{
                  height: 200,
                  bgcolor: '#eee',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  my: 2,
                }}
              >
                {/* Placeholder for QR Code */}
                <Typography variant="caption">[QR Code for {secretData?.secret}]</Typography>
              </Box>
              <Typography variant="caption" display="block">
                Secret: {secretData?.secret}
              </Typography>
            </Box>
          )}
          {step === 2 && (
            <Box py={2}>
              <Typography gutterBottom>2. Enter the 6-digit code from your app</Typography>
              <TextField
                fullWidth
                label="Enter Code"
                value={token}
                onChange={e => setToken(e.target.value)}
                sx={{ mt: 2 }}
              />
            </Box>
          )}
          {step === 3 && (
            <Box py={2}>
              <Alert severity="success" sx={{ mb: 2 }}>
                MFA Enabled Successfully!
              </Alert>
              <Typography gutterBottom variant="h6">
                Backup Codes
              </Typography>
              <Typography paragraph>
                Save these codes in a safe place. You can use them if you lose access to your phone.
              </Typography>
              <Grid container spacing={1}>
                {backupCodes.map((code, i) => (
                  <Grid item xs={6} key={i}>
                    <Chip label={code} sx={{ width: '100%' }} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {step === 1 && <Button onClick={() => setStep(2)}>Next</Button>}
          {step === 2 && (
            <Button onClick={handleVerify} variant="contained">
              Verify
            </Button>
          )}
          {step === 3 && <Button onClick={() => setSetupDialog(false)}>Finish</Button>}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SecuritySettings;
