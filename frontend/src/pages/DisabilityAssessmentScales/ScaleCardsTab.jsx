

import { SCALE_ICONS } from './constants';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Divider,
  Grid,
  Typography
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AddIcon from '@mui/icons-material/Add';

/**
 * Tab 0 — displays all assessment scale cards in a responsive grid.
 */
const ScaleCardsTab = ({ tabValue, scales, onOpenAssessment }) => (
  <TabPanel value={tabValue} index={0}>
    <Grid container spacing={3}>
      {scales.map((scale) => (
        <Grid item xs={12} sm={6} md={4} key={scale.id}>
          <Card
            elevation={3}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderTop: `4px solid ${scale.color}`,
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' },
            }}
          >
            <CardContent sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: scale.color, mr: 1.5, width: 48, height: 48 }}>
                  {SCALE_ICONS[scale.icon] || <AssessmentIcon />}
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {scale.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {scale.nameEn}
                  </Typography>
                </Box>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {scale.description}
              </Typography>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="subtitle2" gutterBottom>
                المجالات ({scale.domains.length}):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {scale.domains.map((d) => (
                  <Chip
                    key={d.key}
                    label={`${d.name} (${d.maxScore})`}
                    size="small"
                    variant="outlined"
                    sx={{ borderColor: scale.color, color: scale.color }}
                  />
                ))}
              </Box>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="subtitle2" gutterBottom>
                مستويات التفسير:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {scale.interpretation.map((interp) => (
                  <Chip
                    key={interp.level}
                    label={`${interp.label} (${interp.min}-${interp.max})`}
                    size="small"
                    sx={{
                      bgcolor: interp.color,
                      color: 'white',
                      fontSize: '0.7rem',
                    }}
                  />
                ))}
              </Box>
            </CardContent>

            <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<AddIcon />}
                sx={{ bgcolor: scale.color, '&:hover': { bgcolor: scale.color, filter: 'brightness(0.9)' } }}
                onClick={() => onOpenAssessment(scale)}
              >
                تطبيق المقياس
              </Button>
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  </TabPanel>
);

export default ScaleCardsTab;
