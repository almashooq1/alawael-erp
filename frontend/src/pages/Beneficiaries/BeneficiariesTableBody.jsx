/**
 * جسم جدول المستفيدين
 * BeneficiariesTableBody – table head, rows, and pagination
 */





import { visuallyHidden } from '@mui/utils';
import { getStatusColor } from 'utils/statusColors';
import { columns } from './beneficiariesTableConstants';
import { getStatusLabel, getCategoryLabel } from './beneficiariesLabelHelpers';

const BeneficiariesTableBody = ({
  sortedData,
  filteredData,
  loading,
  page,
  rowsPerPage,
  order,
  orderBy,
  selected,
  openRow,
  handleRequestSort,
  handleSelectAll,
  handleSelectOne,
  isSelected,
  setOpenRow,
  setRowActionMenu,
  setSelectedRowAction,
  handleChangePage,
  handleChangeRowsPerPage,
}) => (
  <Card elevation={3}>
    <TableContainer>
      {loading && <LinearProgress />}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={
                  selected.length > 0 && selected.length < filteredData.length
                }
                checked={
                  filteredData.length > 0 && selected.length === filteredData.length
                }
                onChange={handleSelectAll}
              />
            </TableCell>
            <TableCell />
            {columns.map((column) => (
              <TableCell key={column.id}>
                {column.sortable ? (
                  <TableSortLabel
                    active={orderBy === column.id}
                    direction={orderBy === column.id ? order : 'asc'}
                    onClick={() => handleRequestSort(column.id)}
                  >
                    {column.label}
                    {orderBy === column.id ? (
                      <Box component="span" sx={visuallyHidden}>
                        {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                      </Box>
                    ) : null}
                  </TableSortLabel>
                ) : (
                  column.label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {sortedData
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map((row) => {
              const isItemSelected = isSelected(row.id);
              const isOpen = openRow === row.id;

              return (
                <Fragment key={row.id}>
                  <TableRow
                    hover
                    role="checkbox"
                    aria-checked={isItemSelected}
                    selected={isItemSelected}
                    sx={{
                      '& > *': {
                        borderBottom: isOpen ? 'unset !important' : undefined,
                      },
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isItemSelected}
                        onChange={() => handleSelectOne(row.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        aria-label="تبديل التفاصيل"
                        onClick={() => setOpenRow(isOpen ? null : row.id)}
                      >
                        {isOpen ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {(row.name || '?').charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {row.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {row.nameEn}
                          </Typography>
                        </Box>
                        {row.favorite && (
                          <Star fontSize="small" sx={{ color: '#ffc107' }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{row.nationalId}</TableCell>
                    <TableCell>{row.age} سنة</TableCell>
                    <TableCell>
                      <Chip
                        label={getCategoryLabel(row.category)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(row.status)}
                        color={getStatusColor(row.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {row.completedSessions}/{row.totalSessions}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ flexGrow: 1, minWidth: 60 }}>
                          <LinearProgress
                            variant="determinate"
                            value={row.progress}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                        <Typography variant="body2" fontWeight="medium">
                          {row.progress}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {row.lastVisit || 'لا يوجد'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        aria-label="المزيد من الخيارات"
                        onClick={(e) => {
                          setRowActionMenu(e.currentTarget);
                          setSelectedRowAction(row.id);
                        }}
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>

                  {/* Expandable Row Detail */}
                  <TableRow>
                    <TableCell sx={{ paddingBottom: 0, paddingTop: 0 }} colSpan={11}>
                      <BeneficiariesRowDetail row={row} isOpen={isOpen} />
                    </TableCell>
                  </TableRow>
                </Fragment>
              );
            })}
        </TableBody>
      </Table>
    </TableContainer>

    <TablePagination
      rowsPerPageOptions={[5, 10, 25, 50]}
      component="div"
      count={filteredData.length}
      rowsPerPage={rowsPerPage}
      page={page}
      onPageChange={handleChangePage}
      onRowsPerPageChange={handleChangeRowsPerPage}
      labelRowsPerPage="عدد الصفوف:"
      labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
    />
  </Card>
);

export default BeneficiariesTableBody;
