/**
 * Billing Integration Service
 * خدمة تكامل الفواتير
 *
 * Integrate therapy sessions with billing and invoicing system
 */

const mongoose = require('mongoose');

/**
 * Therapy Session Billing Service
 */
class BillingService {
  /**
   * Create invoice for completed session
   */
  async createSessionInvoice(session) {
    try {
      const Invoice = mongoose.model('Invoice');
      const BillingRate = mongoose.model('BillingRate');

      // Get billing rate for therapist and plan
      const billingRate = await BillingRate.findOne({
        therapist: session.therapist,
        plan: session.plan,
        active: true
      });

      if (!billingRate) {
        console.warn(`No billing rate found for therapist ${session.therapist} and plan ${session.plan}`);
        return null;
      }

      // Calculate billing amount based on session duration
      const sessionMinutes = this.calculateSessionDuration(
        session.startTime,
        session.endTime
      );
      const amount = (sessionMinutes / 60) * billingRate.hourlyRate;

      // Create invoice
      const invoice = await Invoice.create({
        beneficiary: session.beneficiary,
        therapist: session.therapist,
        session: session._id,
        plan: session.plan,
        amount: amount,
        billingRate: billingRate._id,
        description: `Therapy session - ${session.date} (${sessionMinutes} minutes)`,
        status: 'issued',
        issuedDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        items: [
          {
            description: `Therapy Session - ${this.formatTime(session.startTime)} to ${this.formatTime(session.endTime)}`,
            duration: sessionMinutes,
            rate: billingRate.hourlyRate,
            amount: amount
          }
        ]
      });

      // Check if insurance needs to be billed
      if (session.beneficiary.insurance) {
        await this.createInsuranceClaim(invoice, session);
      }

      return invoice;
    } catch (error) {
      console.error('Failed to create session invoice:', error);
      throw error;
    }
  }

  /**
   * Create insurance claim for session
   */
  async createInsuranceClaim(invoice, session) {
    try {
      const InsuranceClaim = mongoose.model('InsuranceClaim');

      const claim = await InsuranceClaim.create({
        invoice: invoice._id,
        beneficiary: session.beneficiary,
        provider: session.beneficiary.insurance.provider,
        claimAmount: invoice.amount,
        clinicalNotes: session.clinicalNotes,
        status: 'submitted',
        submittedDate: new Date(),
        serviceDate: session.date,
        providerCode: session.plan.insuranceCode
      });

      // Emit event for claim submission
      console.log(`Insurance claim created: ${claim._id}`);

      return claim;
    } catch (error) {
      console.error('Failed to create insurance claim:', error);
      // Don't throw - insurance billing is optional
    }
  }

  /**
   * Generate billing report for therapist
   */
  async generateTherapistBillingReport(therapistId, startDate, endDate) {
    try {
      const TherapySession = mongoose.model('TherapySession');
      const Invoice = mongoose.model('Invoice');

      // Get sessions
      const sessions = await TherapySession.find({
        therapist: therapistId,
        status: 'COMPLETED',
        completedAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      });

      // Get invoices
      const invoices = await Invoice.find({
        therapist: therapistId,
        issuedDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      });

      // Calculate totals
      const totalSessions = sessions.length;
      const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
      const paidAmount = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.amount, 0);
      const pendingAmount = totalAmount - paidAmount;

      return {
        therapistId,
        period: { startDate, endDate },
        metrics: {
          totalSessions,
          totalAmount,
          paidAmount,
          pendingAmount,
          averageSessionAmount: totalSessions > 0 ? totalAmount / totalSessions : 0
        },
        invoices: this.groupInvoicesByStatus(invoices),
        breakdown: this.breakdownByPlan(sessions, invoices)
      };
    } catch (error) {
      console.error('Failed to generate billing report:', error);
      throw error;
    }
  }

  /**
   * Generate billing report for clinic
   */
  async generateClinicBillingReport(startDate, endDate) {
    try {
      const Invoice = mongoose.model('Invoice');
      const TherapySession = mongoose.model('TherapySession');

      const sessions = await TherapySession.find({
        status: 'COMPLETED',
        completedAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      });

      const invoices = await Invoice.find({
        issuedDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      });

      const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
      const paidAmount = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.amount, 0);

      return {
        period: { startDate, endDate },
        summary: {
          totalSessions: sessions.length,
          totalAmount,
          paidAmount,
          pendingAmount: totalAmount - paidAmount,
          collectionRate: totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0
        },
        byTherapist: await this.aggregateByTherapist(invoices),
        byPlan: await this.aggregateByPlan(invoices),
        byStatus: this.groupInvoicesByStatus(invoices)
      };
    } catch (error) {
      console.error('Failed to generate clinic billing report:', error);
      throw error;
    }
  }

  /**
   * Process invoice payment
   */
  async processPayment(invoiceId, paymentMethod, amount) {
    try {
      const Invoice = mongoose.model('Invoice');
      const Payment = mongoose.model('Payment');

      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      const payment = await Payment.create({
        invoice: invoiceId,
        amount: amount || invoice.amount,
        paymentMethod,
        paidDate: new Date(),
        status: 'completed'
      });

      // Update invoice status
      const newStatus = amount >= invoice.amount ? 'paid' : 'partially_paid';
      await Invoice.findByIdAndUpdate(invoiceId, { status: newStatus });

      console.log(`Payment processed: ${payment._id}`);
      return payment;
    } catch (error) {
      console.error('Failed to process payment:', error);
      throw error;
    }
  }

  /**
   * Send invoice to patient
   */
  async sendInvoiceToPatient(invoiceId) {
    try {
      const Invoice = mongoose.model('Invoice');
      const notificationService = require('./notification.service');

      const invoice = await Invoice.findById(invoiceId)
        .populate('beneficiary')
        .populate('therapist');

      if (!invoice.beneficiary.email) {
        console.warn('No email for beneficiary');
        return;
      }

      // Send invoice email
      await notificationService.sendEmail({
        to: invoice.beneficiary.email,
        subject: `Invoice: Therapy Sessions - ${invoice.issuedDate.toLocaleString()}`,
        template: 'invoice',
        data: {
          patientName: invoice.beneficiary.name,
          invoiceNumber: invoice._id,
          issuedDate: invoice.issuedDate,
          dueDate: invoice.dueDate,
          amount: invoice.amount,
          items: invoice.items,
          therapist: invoice.therapist.name
        }
      });

      console.log(`Invoice sent to ${invoice.beneficiary.email}`);
    } catch (error) {
      console.error('Failed to send invoice:', error);
    }
  }

  /**
   * Helper: Calculate session duration
   */
  calculateSessionDuration(startTime, endTime) {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return endMinutes - startMinutes;
  }

  /**
   * Helper: Format time
   */
  formatTime(time) {
    return time; // Already in HH:MM format
  }

  /**
   * Helper: Group invoices by status
   */
  groupInvoicesByStatus(invoices) {
    return {
      issued: invoices.filter(inv => inv.status === 'issued').length,
      pending: invoices.filter(inv => inv.status === 'pending').length,
      paid: invoices.filter(inv => inv.status === 'paid').length,
      overdue: invoices.filter(inv => inv.status === 'overdue').length,
      cancelled: invoices.filter(inv => inv.status === 'cancelled').length
    };
  }

  /**
   * Helper: Breakdown by plan
   */
  breakdownByPlan(sessions, invoices) {
    const breakdown = {};

    sessions.forEach(session => {
      const planId = session.plan?.toString();
      if (!breakdown[planId]) {
        breakdown[planId] = {
          count: 0,
          amount: 0
        };
      }
      breakdown[planId].count++;
    });

    invoices.forEach(invoice => {
      const planId = invoice.plan?.toString();
      if (breakdown[planId]) {
        breakdown[planId].amount += invoice.amount;
      }
    });

    return breakdown;
  }

  /**
   * Helper: Aggregate by therapist
   */
  async aggregateByTherapist(invoices) {
    const byTherapist = {};

    for (const invoice of invoices) {
      const therapistId = invoice.therapist?.toString();
      if (!byTherapist[therapistId]) {
        byTherapist[therapistId] = {
          total: 0,
          count: 0
        };
      }
      byTherapist[therapistId].total += invoice.amount;
      byTherapist[therapistId].count++;
    }

    return byTherapist;
  }

  /**
   * Helper: Aggregate by plan
   */
  async aggregateByPlan(invoices) {
    const byPlan = {};

    for (const invoice of invoices) {
      const planId = invoice.plan?.toString();
      if (!byPlan[planId]) {
        byPlan[planId] = {
          total: 0,
          count: 0
        };
      }
      byPlan[planId].total += invoice.amount;
      byPlan[planId].count++;
    }

    return byPlan;
  }
}

module.exports = new BillingService();
