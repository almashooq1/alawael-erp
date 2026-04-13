




const TYPE_META = {
  contract: { icon: <ContractIcon fontSize="large" />, label: 'عقد', color: '#1565c0' },
  certificate: { icon: <CertIcon fontSize="large" />, label: 'شهادة', color: '#2e7d32' },
  id: { icon: <IdIcon fontSize="large" />, label: 'هوية', color: '#ed6c02' },
};

const STATUS_MAP = {
  valid: { label: 'ساري', color: 'success' },
  expired: { label: 'منتهي', color: 'error' },
  pending: { label: 'قيد المراجعة', color: 'warning' },
};

/**
 * DocumentsTab – Grid of document cards with type icon, name, date, and status.
 */
export default function DocumentsTab({ documents = [] }) {
  if (documents.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <FileIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          لا توجد مستندات
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      {documents.map((doc) => {
        const meta = TYPE_META[doc.type] || {
          icon: <FileIcon fontSize="large" />,
          label: doc.type,
          color: '#757575',
        };
        const st = STATUS_MAP[doc.status] || {
          label: doc.status,
          color: 'default',
        };

        return (
          <Grid item xs={12} sm={6} md={4} key={doc._id}>
            <Card
              variant="outlined"
              sx={{
                borderColor: meta.color,
                borderWidth: 1.5,
                height: '100%',
                transition: 'box-shadow .2s',
                '&:hover': { boxShadow: 3 },
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    mb: 1.5,
                  }}
                >
                  <Box sx={{ color: meta.color }}>{meta.icon}</Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={700} noWrap>
                      {doc.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {meta.label}
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {doc.uploadDate
                      ? new Date(doc.uploadDate).toLocaleDateString('ar-SA')
                      : '—'}
                    {doc.size ? ` • ${doc.size}` : ''}
                  </Typography>
                  <Chip label={st.label} color={st.color} size="small" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}
