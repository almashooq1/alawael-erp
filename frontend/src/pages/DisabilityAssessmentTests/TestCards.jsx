/**
 * TestCards – Tab 0: Available test cards grid
 */
import {
  Box, Grid, Card, CardContent, CardActions, Typography,
  Button, Chip, Divider, Avatar,
} from '@mui/material';
import {
  Quiz as QuizIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { TEST_ICONS } from './constants';

const TestCards = ({ tests, onOpenTest }) => (
  <Grid container spacing={3}>
    {tests.map((test) => {
      const totalItems = test.categories.reduce((s, c) => s + c.items.length, 0);
      return (
        <Grid item xs={12} md={4} key={test.id}>
          <Card
            elevation={3}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderTop: `4px solid ${test.color}`,
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' },
            }}
          >
            <CardContent sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: test.color, mr: 1.5, width: 48, height: 48 }}>
                  {TEST_ICONS[test.icon] || <QuizIcon />}
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight="bold">{test.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{test.nameEn}</Typography>
                </Box>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {test.description}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Chip label={`الأعمار: ${test.ageRange}`} size="small" variant="outlined" />
                <Chip label={`الإصدار: ${test.version}`} size="small" variant="outlined" />
                <Chip label={`${totalItems} عنصر`} size="small" variant="outlined" color="primary" />
              </Box>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="subtitle2" gutterBottom>
                الفئات ({test.categories.length}):
              </Typography>
              {test.categories.map((cat) => (
                <Box key={cat.key} sx={{ mb: 1 }}>
                  <Typography variant="body2" fontWeight="bold" color={test.color}>
                    {cat.name}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {cat.items.map((item) => (
                      <Chip key={item.key} label={item.name} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              ))}
            </CardContent>

            <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<AddIcon />}
                sx={{ bgcolor: test.color, '&:hover': { bgcolor: test.color, filter: 'brightness(0.9)' } }}
                onClick={() => onOpenTest(test)}
              >
                بدء الاختبار
              </Button>
            </CardActions>
          </Card>
        </Grid>
      );
    })}
  </Grid>
);

export default TestCards;
