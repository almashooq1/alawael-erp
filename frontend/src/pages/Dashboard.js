import React from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Button, 
  Divider, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  ListItemSecondaryAction,
  IconButton,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import { 
  Add as AddIcon, 
  ArrowForward as ArrowForwardIcon,
  Group as GroupIcon,
  Receipt as ReceiptIcon,
  AccountBalance as BalanceIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Mock data - in a real app, this would come from an API
  const recentActivity = [
    { id: 1, user: 'Alex Johnson', amount: 24.50, description: 'Dinner', date: '2 hours ago', type: 'owed' },
    { id: 2, user: 'Maria Garcia', amount: 15.00, description: 'Movie tickets', date: '1 day ago', type: 'owes' },
    { id: 3, user: 'Sam Wilson', amount: 45.00, description: 'Groceries', date: '3 days ago', type: 'owed' },
  ];

  const groups = [
    { id: 1, name: 'Roommates', members: 4, totalExpenses: 1250.75 },
    { id: 2, name: 'Trip to Paris', members: 6, totalExpenses: 3250.20 },
  ];

  const balances = {
    totalOwed: 125.50,
    totalOwe: 65.75,
  };

  const handleAddExpense = () => {
    navigate('/expenses/new');
  };

  const handleViewAllActivity = () => {
    navigate('/activity');
  };

  const handleViewGroup = (groupId) => {
    navigate(`/groups/${groupId}`);
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Welcome back, {currentUser?.name?.split(' ')[0] || 'there'}!
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddExpense}
          sx={{ textTransform: 'none', borderRadius: 2, px: 3, py: 1 }}
        >
          Add an expense
        </Button>
      </Box>

      {/* Balance Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6} lg={4}>
          <Card elevation={3} sx={{ height: '100%', borderRadius: 2, bgcolor: 'background.paper' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BalanceIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="h2">
                  Your Balance
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" component="div" color="success.main" sx={{ fontWeight: 'bold' }}>
                  ${(balances.totalOwed - balances.totalOwe).toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {balances.totalOwed > balances.totalOwe ? 'You are owed' : 'You owe'} ${Math.abs(balances.totalOwed - balances.totalOwe).toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    You owe
                  </Typography>
                  <Typography variant="h6" color="error">
                    ${balances.totalOwe.toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    You are owed
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    ${balances.totalOwed.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
            <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
              <Button 
                size="small" 
                color="primary"
                onClick={() => navigate('/balances')}
              >
                View all balances
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6} lg={8}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h2">
                Recent Activity
              </Typography>
              <Button 
                size="small" 
                endIcon={<ArrowForwardIcon />}
                onClick={handleViewAllActivity}
              >
                View All
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <List>
              {recentActivity.map((activity) => (
                <React.Fragment key={activity.id}>
                  <ListItem alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar>{activity.user.charAt(0)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={activity.description}
                      secondary={
                        <>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.primary"
                          >
                            {activity.user}
                          </Typography>
                          {` — ${activity.date}`}
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Typography 
                        variant="body1" 
                        color={activity.type === 'owed' ? 'success.main' : 'error'}
                        sx={{ fontWeight: 'medium' }}
                      >
                        {activity.type === 'owed' ? '+' : '-'}${activity.amount.toFixed(2)}
                      </Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider variant="inset" component="li" />
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Groups */}
      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">
            Your Groups
          </Typography>
          <Button 
            size="small" 
            startIcon={<AddIcon />}
            onClick={() => navigate('/groups/new')}
          >
            New Group
          </Button>
        </Box>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          {groups.map((group) => (
            <Grid item xs={12} sm={6} key={group.id}>
              <Card 
                elevation={0} 
                sx={{ 
                  p: 2, 
                  borderRadius: 2, 
                  border: '1px solid', 
                  borderColor: 'divider',
                  '&:hover': {
                    boxShadow: 1,
                    cursor: 'pointer',
                  },
                }}
                onClick={() => handleViewGroup(group.id)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <GroupIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                    {group.name}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {group.members} {group.members === 1 ? 'member' : 'members'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ${group.totalExpenses.toFixed(2)} total
                  </Typography>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Quick Actions */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
              Quick Actions
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Button 
                  fullWidth 
                  variant="outlined" 
                  startIcon={<ReceiptIcon />}
                  onClick={() => navigate('/expenses/new')}
                  sx={{ py: 2, borderRadius: 2 }}
                >
                  Add Expense
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button 
                  fullWidth 
                  variant="outlined" 
                  startIcon={<GroupIcon />}
                  onClick={() => navigate('/groups/new')}
                  sx={{ py: 2, borderRadius: 2 }}
                >
                  Create Group
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button 
                  fullWidth 
                  variant="outlined" 
                  startIcon={<BalanceIcon />}
                  onClick={() => navigate('/balances')}
                  sx={{ py: 2, borderRadius: 2 }}
                >
                  View Balances
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button 
                  fullWidth 
                  variant="outlined" 
                  startIcon={<ReceiptIcon />}
                  onClick={() => navigate('/activity')}
                  sx={{ py: 2, borderRadius: 2 }}
                >
                  View Activity
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
              Upcoming Settlements
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <ReceiptIcon color="action" sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
              <Typography variant="body1" color="text.secondary">
                No upcoming settlements
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                Settlements will appear here when you have expenses to settle.
              </Typography>
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => navigate('/balances')}
                sx={{ textTransform: 'none', borderRadius: 2, px: 3 }}
              >
                View All Balances
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
