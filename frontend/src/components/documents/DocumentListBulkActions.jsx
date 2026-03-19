/**
 * DocumentListBulkActions — SpeedDial bulk actions
 * إجراءات جماعية سريعة
 */

import { SpeedDial, SpeedDialAction, SpeedDialIcon } from '@mui/material';
import {
  GetApp as GetAppIcon,
  DeleteSweep as DeleteSweepIcon,
  FileDownload as FileDownloadIcon,
  DataObject as DataObjectIcon,
  Share as ShareIcon,
  LocalOffer as LocalOfferIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';

const DocumentListBulkActions = ({
  selectedCount,
  selection,
  actions,
  documents,
  filteredAndSortedDocs,
  onBulkShare,
  onBulkEdit,
}) => (
  <SpeedDial
    ariaLabel="الإجراءات الجماعية"
    sx={{ position: 'fixed', bottom: 24, left: 24 }}
    icon={<SpeedDialIcon />}
  >
    <SpeedDialAction
      icon={<GetAppIcon />}
      tooltipTitle={`تنزيل ${selectedCount}`}
      onClick={() => actions.handleBulkDownload(selection.selected, documents)}
    />
    <SpeedDialAction
      icon={<DeleteSweepIcon />}
      tooltipTitle={`حذف ${selectedCount}`}
      onClick={() => actions.handleBulkDelete(selection.selected, documents)}
    />
    <SpeedDialAction
      icon={<FileDownloadIcon />}
      tooltipTitle="تصدير القائمة"
      onClick={() =>
        actions.handleExportList('selected', selection.selected, filteredAndSortedDocs, documents)
      }
    />
    <SpeedDialAction
      icon={<DataObjectIcon />}
      tooltipTitle="تصدير JSON"
      onClick={() =>
        actions.handleExportJSON('selected', selection.selected, filteredAndSortedDocs, documents)
      }
    />
    <SpeedDialAction
      icon={<ShareIcon />}
      tooltipTitle={`مشاركة ${selectedCount}`}
      onClick={onBulkShare}
    />
    <SpeedDialAction
      icon={<LocalOfferIcon />}
      tooltipTitle="تحرير الوسوم"
      onClick={() => onBulkEdit('tags')}
    />
    <SpeedDialAction
      icon={<CategoryIcon />}
      tooltipTitle="تغيير الفئة"
      onClick={() => onBulkEdit('category')}
    />
  </SpeedDial>
);

export default DocumentListBulkActions;
