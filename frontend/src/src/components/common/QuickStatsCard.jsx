import React from 'react';
import { Card, CardContent, Box, Typography, LinearProgress } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  root: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    borderRadius: theme.spacing(2),
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 12px 24px rgba(102, 126, 234, 0.4)',
    },
  },
  primaryGradient: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  successGradient: {
    background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
  },
  warningGradient: {
    background: 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)',
  },
  infoGradient: {
    background: 'linear-gradient(135deg, #4299e1 0%, #2b6cb0 100%)',
  },
  dangerGradient: {
    background: 'linear-gradient(135deg, #f56565 0%, #c53030 100%)',
  },
  content: {
    padding: theme.spacing(3),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconSection: {
    fontSize: '2.5rem',
    marginRight: theme.spacing(2),
  },
  textSection: {
    flex: 1,
  },
  title: {
    fontSize: '0.875rem',
    fontWeight: 500,
    opacity: 0.9,
    marginBottom: theme.spacing(0.5),
  },
  value: {
    fontSize: '2rem',
    fontWeight: 700,
    marginBottom: theme.spacing(1),
  },
  percentage: {
    fontSize: '0.75rem',
    opacity: 0.8,
  },
  progressBar: {
    height: 6,
    borderRadius: '3px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    '& .MuiLinearProgress-bar': {
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
    },
  },
}));

const QuickStatsCard = ({
  title,
  value,
  icon = '📊',
  color = 'primary',
  trend = null,
  percentage = null,
  showProgress = false,
}) => {
  const classes = useStyles();

  const getGradientClass = () => {
    switch (color) {
      case 'success':
        return classes.successGradient;
      case 'warning':
        return classes.warningGradient;
      case 'info':
        return classes.infoGradient;
      case 'danger':
        return classes.dangerGradient;
      default:
        return classes.primaryGradient;
    }
  };

  return (
    <Card className={`${classes.root} ${getGradientClass()}`}>
      <CardContent className={classes.content}>
        <Box className={classes.iconSection}>{icon}</Box>
        <Box className={classes.textSection}>
          <Typography className={classes.title}>
            {title}
          </Typography>
          <Typography className={classes.value}>
            {typeof value === 'number' && !showProgress ? value.toLocaleString() : value}
          </Typography>
          {percentage && (
            <Typography className={classes.percentage}>
              {trend ? `${trend > 0 ? '↑' : '↓'} ` : ''}
              {percentage}%
            </Typography>
          )}
          {showProgress && (
            <LinearProgress
              variant="determinate"
              value={value}
              className={classes.progressBar}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default QuickStatsCard;
