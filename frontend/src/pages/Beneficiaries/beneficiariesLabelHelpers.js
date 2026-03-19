/**
 * تسميات جدول المستفيدين
 * Beneficiaries Label Helpers
 */

export const getStatusLabel = status => {
  switch (status) {
    case 'active':
      return 'نشط';
    case 'pending':
      return 'قيد الانتظار';
    case 'inactive':
      return 'غير نشط';
    default:
      return status;
  }
};

export const getCategoryLabel = category => {
  switch (category) {
    case 'physical':
      return 'إعاقة حركية';
    case 'mental':
      return 'إعاقة ذهنية';
    case 'sensory':
      return 'إعاقة حسية';
    case 'multiple':
      return 'إعاقات متعددة';
    default:
      return category;
  }
};
