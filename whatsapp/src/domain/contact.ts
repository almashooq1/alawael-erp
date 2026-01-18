export interface Contact {
  id: string;
  waId: string;
  locale?: string;
  tags: string[];
  optIn: boolean;
  optOutReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
