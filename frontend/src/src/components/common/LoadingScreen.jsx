import React from 'react';
import { Box, CircularProgress, Typography, Skeleton, Card, CardContent, Grid } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    flexDirection: 'column',
  },
  fullScreenLoading: {
    minHeight: '100vh',
  },
  loadingText: {
    marginTop: theme.spacing(2),
    color: theme.palette.primary.main,
  },
  skeletonCard: {
    marginBottom: theme.spacing(2),
  },
}));

export const LoadingScreen = ({ fullScreen = false }) => {
  const classes = useStyles();

  return (
    <Box
      className={`${classes.loadingContainer} ${
        fullScreen ? classes.fullScreenLoading : ''
      }`}
    >
      <CircularProgress size={60} />
      <Typography variant="h6" className={classes.loadingText}>
        Loading...
      </Typography>
    </Box>
  );
};

export const LoadingSkeleton = ({ count = 3, variant = 'card' }) => {
  const classes = useStyles();

  if (variant === 'dashboard') {
    return (
      <Grid container spacing={3}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card className={classes.skeletonCard}>
              <CardContent>
                <Skeleton variant="text" width="80%" height={40} />
                <Skeleton variant="text" width="60%" height={30} />
                <Skeleton variant="rect" width="100%" height={100} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  if (variant === 'list') {
    return (
      <Box>
        {Array.from({ length: count }).map((_, index) => (
          <Box key={index} mb={2}>
            <Skeleton variant="text" width="100%" height={60} />
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className={classes.skeletonCard}>
          <CardContent>
            <Skeleton variant="text" width="100%" height={40} />
            <Skeleton variant="text" width="100%" height={20} />
            <Skeleton variant="rect" width="100%" height={200} />
          </CardContent>
        </Card>
      ))}
    </>
  );
};

export const SkeletonText = ({ lines = 3 }) => {
  return (
    <>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} variant="text" width="100%" height={20} />
      ))}
    </>
  );
};

export default LoadingScreen;
