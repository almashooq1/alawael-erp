import { Box } from '@mui/material';

/**
 * TabPanel — Accessible tab content panel.
 *
 * @param {number} value    — Current active tab index
 * @param {number} index    — This panel's tab index
 * @param {node}   children — Content
 * @param {object} [sx]     — Extra styles
 * @param {boolean}[keepMounted] — Keep content in DOM when hidden
 */
const TabPanel = ({ value, index, children, sx, keepMounted = false, ...rest }) => {
  const isActive = value === index;
  if (!keepMounted && !isActive) return null;

  return (
    <Box
      role="tabpanel"
      hidden={!isActive}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      sx={{ ...(isActive ? {} : { display: 'none' }), ...sx }}
      {...rest}
    >
      {children}
    </Box>
  );
};

/**
 * a11yProps — Returns accessibility props for a Tab element.
 * @param {number} index — Tab index
 */
export const a11yProps = (index) => ({
  id: `tab-${index}`,
  'aria-controls': `tabpanel-${index}`,
});

export default TabPanel;
