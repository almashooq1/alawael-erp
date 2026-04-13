/**
 * KpiCardsGrid — Responsive grid of 8 StatCard components
 */

const KpiCardsGrid = ({ kpiCards, refreshing }) => (
  <Grid
    container
    spacing={2}
    sx={{ mb: 1, transition: 'opacity 0.3s ease', opacity: refreshing ? 0.6 : 1 }}
    aria-live="polite"
    aria-label="مؤشرات الأداء الرئيسية"
  >
    {kpiCards.map((card, i) => (
      <Grid item xs={6} sm={4} md={3} key={i}>
        <StatCard
          title={card.title}
          value={card.value}
          subtitle={card.subtitle}
          icon={card.icon}
          index={i}
          trend={card.trend}
        />
      </Grid>
    ))}
  </Grid>
);

export default KpiCardsGrid;
