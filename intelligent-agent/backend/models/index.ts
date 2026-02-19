import mongoose, { Document, Schema } from 'mongoose';

// Transaction Schema
export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  type: 'transfer' | 'income' | 'expense' | 'investment' | 'loan';
  amount: number;
  currency: string;
  senderIBAN: string;
  recipientIBAN: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string;
  category: string;
  fraudScore: number;
  fraudStatus: 'clean' | 'suspicious' | 'blocked';
  metadata: Record<string, any>;
  timestamp: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: ['transfer', 'income', 'expense', 'investment', 'loan'], required: true },
    amount: { type: Number, required: true, index: true },
    currency: { type: String, default: 'SAR' },
    senderIBAN: { type: String, required: true, index: true },
    recipientIBAN: { type: String, required: true, index: true },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'cancelled'], default: 'pending' },
    description: { type: String },
    category: { type: String, index: true },
    fraudScore: { type: Number, min: 0, max: 100, default: 0 },
    fraudStatus: { type: String, enum: ['clean', 'suspicious', 'blocked'], default: 'clean' },
    metadata: { type: Schema.Types.Mixed },
    notes: String,
  },
  { timestamps: true }
);

// Add indexes for performance
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ senderIBAN: 1, recipientIBAN: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ fraudStatus: 1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);

// Account Schema
export interface IAccount extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  iban: string;
  accountType: 'savings' | 'checking' | 'investment' | 'loan';
  balance: number;
  currency: string;
  status: 'active' | 'inactive' | 'frozen' | 'closed';
  accountHolder: string;
  bankCode: string;
  createdAt: Date;
  updatedAt: Date;
  lastActivity?: Date;
  limits: {
    dailyLimit: number;
    monthlyLimit: number;
    transactionLimit: number;
  };
  metadata: Record<string, any>;
}

const accountSchema = new Schema<IAccount>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    iban: { type: String, required: true, unique: true, index: true },
    accountType: { type: String, enum: ['savings', 'checking', 'investment', 'loan'], default: 'checking' },
    balance: { type: Number, required: true, default: 0 },
    currency: { type: String, default: 'SAR' },
    status: { type: String, enum: ['active', 'inactive', 'frozen', 'closed'], default: 'active' },
    accountHolder: { type: String, required: true },
    bankCode: String,
    lastActivity: Date,
    limits: {
      dailyLimit: { type: Number, default: 100000 },
      monthlyLimit: { type: Number, default: 500000 },
      transactionLimit: { type: Number, default: 50000 },
    },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Account = mongoose.model<IAccount>('Account', accountSchema);

// Audit Log Schema
export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure';
  errorMessage?: string;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: String, required: true, index: true },
    action: { type: String, required: true, index: true },
    resource: { type: String, required: true },
    resourceId: { type: String, required: true },
    changes: { type: Schema.Types.Mixed },
    ipAddress: String,
    userAgent: String,
    status: { type: String, enum: ['success', 'failure'], default: 'success' },
    errorMessage: String,
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

// Create TTL index for auto-deletion after 2 years
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

// Financial Profile Schema
export interface IFinancialProfile extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  assets: number;
  debts: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  debtToIncomeRatio: number;
  creditScore: number;
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  lastUpdated: Date;
  profiling: Record<string, any>;
}

const financialProfileSchema = new Schema<IFinancialProfile>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    assets: { type: Number, default: 0 },
    debts: { type: Number, default: 0 },
    monthlyIncome: { type: Number, default: 0 },
    monthlyExpenses: { type: Number, default: 0 },
    savingsRate: { type: Number, default: 0 },
    debtToIncomeRatio: { type: Number, default: 0 },
    creditScore: { type: Number, default: 0, min: 0, max: 1000 },
    riskProfile: { type: String, enum: ['conservative', 'moderate', 'aggressive'], default: 'moderate' },
    lastUpdated: { type: Date, default: Date.now },
    profiling: { type: Schema.Types.Mixed },
  },
  { timestamps: false }
);

export const FinancialProfile = mongoose.model<IFinancialProfile>('FinancialProfile', financialProfileSchema);

// Fraud Alert Schema
export interface IFraudAlert extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  transactionId?: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  message: string;
  details: Record<string, any>;
  status: 'active' | 'resolved' | 'false-positive';
  resolution?: string;
  createdAt: Date;
  resolvedAt?: Date;
  updatedAt: Date;
}

const fraudAlertSchema = new Schema<IFraudAlert>(
  {
    userId: { type: String, required: true, index: true },
    transactionId: String,
    type: { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    riskScore: { type: Number, min: 0, max: 100, default: 0 },
    message: { type: String, required: true },
    details: { type: Schema.Types.Mixed },
    status: { type: String, enum: ['active', 'resolved', 'false-positive'], default: 'active', index: true },
    resolution: String,
    resolvedAt: Date,
  },
  { timestamps: true }
);

fraudAlertSchema.index({ userId: 1, createdAt: -1 });
fraudAlertSchema.index({ status: 1, severity: 1 });

export const FraudAlert = mongoose.model<IFraudAlert>('FraudAlert', fraudAlertSchema);

// Scheduled Payment Schema
export interface IScheduledPayment extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  recipientIBAN: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  startDate: Date;
  nextDate: Date;
  endDate?: Date;
  isActive: boolean;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const scheduledPaymentSchema = new Schema<IScheduledPayment>(
  {
    userId: { type: String, required: true, index: true },
    recipientIBAN: { type: String, required: true },
    amount: { type: Number, required: true },
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual'], required: true },
    startDate: { type: Date, required: true },
    nextDate: { type: Date, required: true, index: true },
    endDate: Date,
    isActive: { type: Boolean, default: true, index: true },
    description: String,
  },
  { timestamps: true }
);

scheduledPaymentSchema.index({ userId: 1, isActive: 1 });
scheduledPaymentSchema.index({ nextDate: 1 });

export const ScheduledPayment = mongoose.model<IScheduledPayment>('ScheduledPayment', scheduledPaymentSchema);

// User Settings Schema
export interface IUserSettings extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  language: 'ar' | 'en';
  currency: string;
  theme: 'light' | 'dark';
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    fraudAlerts: boolean;
  };
  twoFactorEnabled: boolean;
  biometricEnabled: boolean;
  lastLogin: Date;
  updatedAt: Date;
}

const userSettingsSchema = new Schema<IUserSettings>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    language: { type: String, enum: ['ar', 'en'], default: 'ar' },
    currency: { type: String, default: 'SAR' },
    theme: { type: String, enum: ['light', 'dark'], default: 'dark' },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      fraudAlerts: { type: Boolean, default: true },
    },
    twoFactorEnabled: { type: Boolean, default: false },
    biometricEnabled: { type: Boolean, default: false },
    lastLogin: Date,
  },
  { timestamps: false }
);

export const UserSettings = mongoose.model<IUserSettings>('UserSettings', userSettingsSchema);

// Export all models
export default {
  Transaction,
  Account,
  AuditLog,
  FinancialProfile,
  FraudAlert,
  ScheduledPayment,
  UserSettings,
};
