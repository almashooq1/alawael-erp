const Supplier = require('../models/Supplier.model');
const PurchaseRequest = require('../models/PurchaseRequest.model');
const PurchaseOrder = require('../models/PurchaseOrder.model');
const Inventory = require('../models/Inventory.model');
const Contract = require('../models/Contract.model');

/**
 * Advanced Procurement Service
 * خدمة إدارة المشتريات المتقدمة والذكية
 */
class ProcurementService {
  
  // ===== إدارة طلبات الشراء =====

  /**
   * إنشاء طلب شراء جديد
   */
  async createPurchaseRequest(requestData) {
    try {
      // التحقق من الميزانية
      const budgetAvailable = await this.checkBudgetAvailability(
        requestData.department,
        requestData.summary.estimatedValue
      );

      if (!budgetAvailable) {
        return {
          success: false,
          message: 'Insufficient budget available',
          data: null,
        };
      }

      // توليد رقم الطلب
      const requestNumber = await this.generateRequestNumber();

      const purchaseRequest = new PurchaseRequest({
        ...requestData,
        requestNumber,
        budgetAvailable: true,
      });

      // حساب الإجمالي
      purchaseRequest.calculateTotals();

      await purchaseRequest.save();

      return {
        success: true,
        message: 'Purchase request created successfully',
        data: purchaseRequest,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  }

  /**
   * الحصول على طلبات الشراء المعلقة
   */
  async getPendingRequests(department = null, limit = 10) {
    try {
      let query = { status: 'PENDING_APPROVAL' };
      if (department) query.department = department;

      const requests = await PurchaseRequest.find(query)
        .sort({ createdAt: -1 })
        .limit(limit);

      return {
        success: true,
        data: requests,
        count: requests.length,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * الموافقة على طلب شراء
   */
  async approvePurchaseRequest(prId, approverId, comments = '') {
    try {
      const pr = await PurchaseRequest.findById(prId);
      if (!pr) {
        return { success: false, message: 'Purchase request not found' };
      }

      const approved = pr.approve(approverId, comments);
      if (!approved) {
        return { success: false, message: 'Approval failed' };
      }

      await pr.save();

      // إذا تم الموافقة على جميع المستويات، قم بتحويله لأمر شراء
      if (pr.isApproved && pr.canConvertPO()) {
        await this.convertToPurchaseOrder(pr);
      }

      return {
        success: true,
        message: 'Purchase request approved successfully',
        data: pr,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * رفض طلب شراء
   */
  async rejectPurchaseRequest(prId, approverId, reason) {
    try {
      const pr = await PurchaseRequest.findById(prId);
      if (!pr) {
        return { success: false, message: 'Purchase request not found' };
      }

      pr.reject(approverId, reason);
      await pr.save();

      return {
        success: true,
        message: 'Purchase request rejected',
        data: pr,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // ===== إدارة أوامر الشراء =====

  /**
   * تحويل طلب الشراء لأمر شراء
   */
  async convertToPurchaseOrder(purchaseRequest) {
    try {
      // اختيار أفضل موردين
      const bestSuppliers = await this.selectBestSuppliers(
        purchaseRequest.items,
        purchaseRequest.minimumSuppliers || 3
      );

      if (bestSuppliers.length === 0) {
        return { success: false, message: 'No suitable suppliers found' };
      }

      const purchaseOrders = [];

      // إنشاء أمر لكل مورد
      for (const supplier of bestSuppliers) {
        const poNumber = await this.generateOrderNumber();
        const po = new PurchaseOrder({
          orderNumber: poNumber,
          supplier: {
            supplierId: supplier._id,
            supplierCode: supplier.code,
            supplierName: supplier.name,
            supplierEmail: supplier.contact?.email,
            supplierPhone: supplier.contact?.phone,
          },
          items: purchaseRequest.items.map(item => ({
            itemCode: item.itemCode,
            itemName: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: supplier.getBestPrice(item.quantity) || item.estimatedUnitPrice,
          })),
          relatedPurchaseRequest: {
            prId: purchaseRequest._id,
            prNumber: purchaseRequest.requestNumber,
          },
          requiredDeliveryDate: purchaseRequest.requiredDate,
        });

        po.calculateTotals();
        await po.save();
        purchaseOrders.push(po);
      }

      // تحديث حالة الطلب
      purchaseRequest.status = 'CONVERTED_TO_PO';
      purchaseRequest.relatedPurchaseOrder = {
        poId: purchaseOrders[0]._id,
        poNumber: purchaseOrders[0].orderNumber,
      };
      await purchaseRequest.save();

      return {
        success: true,
        message: 'Purchase orders created successfully',
        data: purchaseOrders,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * إصدار أمر الشراء
   */
  async issuePurchaseOrder(poId, issuedBy) {
    try {
      const po = await PurchaseOrder.findById(poId);
      if (!po || po.status !== 'DRAFT') {
        return { success: false, message: 'Cannot issue this order' };
      }

      po.status = 'ISSUED';
      po.addHistoryEvent('ISSUED', issuedBy, 'Purchase order issued');

      // إرسال إشعار للمورد
      await this.notifySupplier(po);

      await po.save();

      return {
        success: true,
        message: 'Purchase order issued successfully',
        data: po,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * تسجيل استقبال البضاعة
   */
  async receiveGoods(poId, items, receivedBy) {
    try {
      const po = await PurchaseOrder.findById(poId);
      if (!po) {
        return { success: false, message: 'Purchase order not found' };
      }

      for (const item of items) {
        po.recordPartialReceipt(item.itemCode, item.receivedQuantity);

        // تحديث المخزون
        const inventoryItem = await Inventory.findOne({
          productCode: item.itemCode,
        });
        if (inventoryItem) {
          inventoryItem.addStock(
            item.receivedQuantity,
            po.orderNumber,
            'Goods received from PO',
            receivedBy
          );
          await inventoryItem.save();
        }
      }

      po.reception.actualReceiptDate = new Date();
      po.reception.receivedBy = receivedBy;
      po.addHistoryEvent('GOODS_RECEIVED', receivedBy, 'Goods received');

      await po.save();

      return {
        success: true,
        message: 'Goods received successfully',
        data: po,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * تسجيل الدفع
   */
  async recordPayment(poId, amount, paymentMethod, referenceNumber, paidBy) {
    try {
      const po = await PurchaseOrder.findById(poId);
      if (!po) {
        return { success: false, message: 'Purchase order not found' };
      }

      po.recordPayment(amount, paymentMethod, referenceNumber);
      po.addHistoryEvent('PAYMENT_RECORDED', paidBy, `Payment of ${amount} recorded`);

      await po.save();

      return {
        success: true,
        message: 'Payment recorded successfully',
        data: po,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // ===== اختيار الموردين والمقارنة =====

  /**
   * اختيار أفضل الموردين
   */
  async selectBestSuppliers(items, count = 3) {
    try {
      const suppliers = await Supplier.find({ status: 'ACTIVE' })
        .sort({ 'performance.overallRating': -1 })
        .limit(count);

      return suppliers;
    } catch (error) {
      return [];
    }
  }

  /**
   * مقارنة عروض الأسعار
   */
  async compareSupplierQuotes(itemCode, quantity) {
    try {
      const suppliers = await Supplier.find({
        'products.productCode': itemCode,
        status: 'ACTIVE',
      });

      const quotes = suppliers.map(supplier => {
        const product = supplier.products.find(p => p.productCode === itemCode);
        const discount = supplier.getBestPrice(quantity);
        const finalPrice = product.unitPrice - (product.unitPrice * discount / 100);

        return {
          supplierId: supplier._id,
          supplierName: supplier.name,
          supplierRating: supplier.performance.overallRating,
          unitPrice: product.unitPrice,
          discount: discount,
          finalPrice: finalPrice,
          leadTime: product.leadTime,
          minimumQuantity: product.minimumQuantity,
        };
      });

      // فرز حسب السعر
      return quotes.sort((a, b) => a.finalPrice - b.finalPrice);
    } catch (error) {
      return [];
    }
  }

  /**
   * طلب عروض أسعار تلقائية (RFQ)
   */
  async generateAutoRFQ(items) {
    try {
      const rfq = {
        rfqId: 'RFQ-' + Date.now(),
        createdDate: new Date(),
        items: [],
        suppliers: [],
      };

      // الحصول على البيانات المقترحة لكل صنف
      for (const item of items) {
        const quotes = await this.compareSupplierQuotes(item.itemCode, item.quantity);
        rfq.items.push({
          itemCode: item.itemCode,
          itemName: item.itemName,
          quantity: item.quantity,
          quotes: quotes.slice(0, 3), // أعلى 3 عروض
        });

        // إضافة الموردين الفريدة
        quotes.forEach(quote => {
          if (!rfq.suppliers.find(s => s.supplierId === quote.supplierId)) {
            rfq.suppliers.push({
              supplierId: quote.supplierId,
              supplierName: quote.supplierName,
            });
          }
        });
      }

      return {
        success: true,
        data: rfq,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // ===== توقع الطلب والتنبيهات =====

  /**
   * توقع عمليات النقص في المخزون
   */
  async predictShortages() {
    try {
      const lowStockItems = await Inventory.getLowStockItems();

      const alerts = lowStockItems.map(item => {
        const consumptionRate = item.statistics?.averageMonthlyConsumption || 0;
        const daysRemaining = consumptionRate > 0 
          ? Math.ceil((item.quantity / consumptionRate) * 30)
          : 0;

        return {
          itemCode: item.productCode,
          itemName: item.productName,
          currentStock: item.quantity,
          minimumLevel: item.minimumLevel,
          consumptionRate: consumptionRate,
          daysRemaining: daysRemaining,
          urgency: daysRemaining <= 3 ? 'CRITICAL' : daysRemaining <= 7 ? 'HIGH' : 'MEDIUM',
          reOrderQuantity: item.reorderQuantity,
          suggestedSupplier: item.preferredSupplier?.name || 'To be determined',
        };
      });

      return {
        success: true,
        data: alerts.sort((a, b) => a.daysRemaining - b.daysRemaining),
        timestamp: new Date(),
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * توصيات الشراء الذكية
   */
  async getSmartRecommendations() {
    try {
      const shortages = await this.predictShortages();
      if (!shortages.success) return shortages;

      const recommendations = [];

      for (const shortage of shortages.data) {
        const inventory = await Inventory.findOne({ productCode: shortage.itemCode });
        const bestSupplier = inventory?.getBestSupplier();

        if (bestSupplier) {
          recommendations.push({
            itemCode: shortage.itemCode,
            itemName: shortage.itemName,
            recommendedQuantity: shortage.reOrderQuantity,
            suggestedSupplier: bestSupplier.supplierName,
            estimatedCost: shortage.reOrderQuantity * bestSupplier.unitPrice,
            urgency: shortage.urgency,
            leadTime: bestSupplier.leadTime,
          });
        }
      }

      return {
        success: true,
        data: recommendations,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // ===== الأداة المساعدة =====

  /**
   * توليد رقم الطلب التسلسلي
   */
  async generateRequestNumber() {
    const count = await PurchaseRequest.countDocuments();
    const year = new Date().getFullYear();
    return `PR-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  /**
   * توليد رقم الأمر التسلسلي
   */
  async generateOrderNumber() {
    const count = await PurchaseOrder.countDocuments();
    const year = new Date().getFullYear();
    return `PO-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  /**
   * التحقق من الميزانية
   */
  async checkBudgetAvailability(department, amount) {
    // في المشروع الحقيقي، ستتحقق من نظام المالية
    // للآن، نفترض أن الميزانية متاحة
    return true;
  }

  /**
   * إرسال إشعار للمورد
   */
  async notifySupplier(purchaseOrder) {
    // سيتم دمج مع نظام البريد/الإشعارات
    console.log(`Notification sent to supplier: ${purchaseOrder.supplier.supplierEmail}`);
    return true;
  }

  /**
   * حساب ROI للشراء
   */
  async calculateProcurementROI(filters = {}) {
    try {
      // حساب إجمالي المصروفات والادخار
      const orders = await PurchaseOrder.find(filters);

      const total = {
        totalSpent: orders.reduce((sum, o) => sum + o.summary.grandTotal, 0),
        totalSavings: 0,
        averageOrderValue: 0,
        orderCount: orders.length,
      };

      if (orders.length > 0) {
        total.averageOrderValue = total.totalSpent / orders.length;
      }

      return {
        success: true,
        data: total,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = new ProcurementService();
