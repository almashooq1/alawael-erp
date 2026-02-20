import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
} from '@mui/material';
import {
  SyncAlt as SyncIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { fetchIntegrations, testIntegration } from '../../store/slices/integrationsSlice';

const IntegrationsList = () => {
  const dispatch = useDispatch();
  const { integrations, testing, error } = useSelector((state) => state.integrations);

  useEffect(() => {
    dispatch(fetchIntegrations());
  }, [dispatch]);

  const handleTest = (integrationId) => {
    dispatch(testIntegration(integrationId));
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        التكاملات الخارجية
      </Typography>

      {error && <Typography color="error">{error}</Typography>}

      <Grid container spacing={3}>
        {integrations.map((integration) => (
          <Grid item xs={12} sm={6} md={4} key={integration.id}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">{integration.name}</Typography>
                  <Chip
                    label={integration.status === 'connected' ? 'متصل' : 'معطل'}
                    color={integration.status === 'connected' ? 'success' : 'error'}
                    size="small"
                    icon={integration.status === 'connected' ? <CheckIcon /> : <ErrorIcon />}
                  />
                </Box>
                <Typography variant="body2" color="textSecondary" paragraph>
                  {integration.description}
                </Typography>
                <Typography variant="caption">
                  آخر مزامنة: {new Date(integration.lastSync).toLocaleDateString('ar-SA')}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  startIcon={<SyncIcon />}
                  disabled={testing}
                  onClick={() => handleTest(integration.id)}
                >
                  اختبار
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default IntegrationsList;
