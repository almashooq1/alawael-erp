import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  IconButton,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Paper,
  Grid,
  Tooltip,
} from '@mui/material';
import {
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ICFGoalLinker - Component for linking ICF codes to therapy goals
 * مكون لربط أكواد ICF بالأهداف العلاجية
 */
const ICFGoalLinker = ({ 
  domain, 
  linkedGoals = {}, 
  onLink, 
  onUnlink,
  availableGoals = [],
}) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleOpenDialog = useCallback((code) => {
    setSelectedCode(code);
    setOpenDialog(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setSelectedCode(null);
    setSelectedGoal(null);
  }, []);

  const handleLinkGoal = useCallback(() => {
    if (selectedCode && selectedGoal) {
      onLink(selectedCode, selectedGoal.id);
      handleCloseDialog();
    }
  }, [selectedCode, selectedGoal, onLink, handleCloseDialog]);

  const handleUnlinkGoal = useCallback((code, goalId) => {
    onUnlink(code, goalId);
  }, [onUnlink]);

  const filteredGoals = availableGoals.filter(goal => 
    goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    goal.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLinkedGoalsForCode = (code) => {
    return linkedGoals[code] || [];
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
        الأهداف المرتبطة بالمجال: {domain}
      </Typography>
      
      <List>
        <AnimatePresence>
          {Object.entries(linkedGoals).map(([code, goalIds]) => (
            <motion.div
              key={code}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Paper 
                elevation={1} 
                sx={{ 
                  mb: 2, 
                  p: 2, 
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {code}
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog(code)}
                  >
                    إضافة هدف
                  </Button>
                </Box>
                
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {goalIds.map(goalId => {
                    const goal = availableGoals.find(g => g.id === goalId);
                    if (!goal) return null;
                    
                    return (
                      <Chip
                        key={goalId}
                        label={goal.title}
                        onDelete={() => handleUnlinkGoal(code, goalId)}
                        deleteIcon={<LinkOffIcon />}
                        color="primary"
                        size="small"
                        sx={{ 
                          '& .MuiChip-deleteIcon': {
                            color: 'inherit',
                            opacity: 0.7,
                            '&:hover': { opacity: 1 },
                          },
                        }}
                      />
                    );
                  })}
                  
                  {goalIds.length === 0 && (
                    <Typography variant="caption" color="text.secondary">
                      لا توجد أهداف مرتبطة
                    </Typography>
                  )}
                </Box>
              </Paper>
            </motion.div>
          ))}
        </AnimatePresence>
      </List>

      {/* Link Goal Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <LinkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          ربط هدف بكود {selectedCode}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="البحث عن الأهداف"
            placeholder="اكتب للبحث..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
          
          <List sx={{ maxHeight: 300, overflow: 'auto' }}>
            {filteredGoals.map(goal => (
              <ListItemButton
                key={goal.id}
                selected={selectedGoal?.id === goal.id}
                onClick={() => setSelectedGoal(goal)}
              >
                <ListItemText
                  primary={goal.title}
                  secondary={goal.description}
                />
                {selectedGoal?.id === goal.id && (
                  <LinkIcon color="primary" />
                )}
              </ListItemButton>
            ))}
            
            {filteredGoals.length === 0 && (
              <ListItem>
                <ListItemText
                  primary="لا توجد أهداف متاحة"
                  secondary="أضف أهدافاً جديدة أولاً"
                />
              </ListItem>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            إلغاء
          </Button>
          <Button 
            onClick={handleLinkGoal} 
            variant="contained" 
            disabled={!selectedGoal}
          >
            ربط
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ICFGoalLinker;
